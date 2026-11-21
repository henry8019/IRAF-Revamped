"""IRAF offline FITS viewer. Run after npm run build, or launch the packaged app."""
import argparse
import asyncio
import base64
from dataclasses import dataclass
from io import BytesIO
import json
import secrets
import socket
import tempfile
import webbrowser
from pathlib import Path
from typing import Literal

import numpy as np
import uvicorn
from astropy.io import fits
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from boxcar import boxcar
from reductions import reduce_uploaded, thumbnail


ROOT = Path(__file__).resolve().parent
MAX_BYTES = 192 * 1024 * 1024
MAX_PIXELS = 4096 * 4096


@dataclass
class Image:
    data: np.ndarray
    header: fits.Header
    filename: str
    id: str
    bitpix: int

    def smooth(self, params):
        values = self.data
        blank = self.header.get("BLANK")
        if blank is not None and self.bitpix > 0:
            scale = self.header.get("BSCALE", 1)
            zero = self.header.get("BZERO", 0)
            values = np.where(np.isnan(values), blank * scale + zero, values)
            if scale == 1 and zero == 0:
                values = values.astype({8: "u1", 16: "i2", 32: "i4"}[self.bitpix])
        return boxcar(values, params.width, params.height, params.boundary, params.constant)

    def response(self, pixels=None):
        meta = {"width": self.data.shape[1], "height": self.data.shape[0], "bitpix": self.bitpix,
                "unit": str(self.header.get("BUNIT", "")), "object": str(self.header.get("OBJECT", "")),
                "filter": str(self.header.get("FILTER", "")),
                "exposure": str(self.header.get("EXPTIME", self.header.get("ITIME", ""))),
                "id": self.id}
        encoded = base64.b64encode(json.dumps(meta).encode()).decode()
        display = np.asarray(self.data if pixels is None else pixels, dtype="<f8")
        if pixels is not None and pixels.dtype.kind in "iu" and "BLANK" in self.header:
            blank = self.header["BLANK"] * self.header.get("BSCALE", 1) + self.header.get("BZERO", 0)
            display = np.where(pixels == blank, np.nan, display)
        body = display.tobytes()
        return Response(body, media_type="application/octet-stream",
                        headers={"X-Image": encoded, "X-Filename": self.filename})


class Parameters(BaseModel):
    image_id: str
    width: int = Field(ge=1, le=8192, strict=True)
    height: int = Field(ge=1, le=8192, strict=True)
    boundary: Literal["nearest", "constant", "reflect", "wrap"]
    constant: float = Field(default=0, allow_inf_nan=False)


def decode_image(stream, filename):
    try:
        with fits.open(stream, memmap=False) as hdus:
            hdu = hdus[0]
            if hdu.header.get("NAXIS")==0 and len(hdus)==2 and isinstance(hdus[1], fits.CompImageHDU):
                hdu = hdus[1]
            header = hdu.header.copy()
            if hdu is not hdus[0]:
                header.extend(hdus[0].header, strip=True, unique=True)
            if header.get("NAXIS") != 2:
                raise ValueError("请选择主 HDU 包含二维图像的 FITS 文件。")
            width, height = header["NAXIS1"], header["NAXIS2"]
            if min(width, height) < 1 or max(width, height) > 8192 or width * height > MAX_PIXELS:
                raise ValueError("图像超出当前范围：最多 16777216 像素，单边最长 8192 像素。")
            if header.get("BITPIX") == 64:
                raise ValueError("当前查看器暂不支持 64 位整数 FITS。")
            bitpix = int(header["BITPIX"])
            data = hdu.data
            return Image(data, header, filename, secrets.token_hex(12), bitpix)
    except (OSError, ValueError, KeyError, TypeError, OverflowError) as exc:
        raise HTTPException(422, str(exc) if isinstance(exc, ValueError) else "文件不完整或不是有效的 FITS 图像。") from exc


def export_fits(image, pixels, params):
    header = image.header.copy()
    for key in ("BSCALE", "BZERO", "DATAMIN", "DATAMAX", "CHECKSUM", "DATASUM"):
        header.remove(key, ignore_missing=True, remove_all=True)
    if pixels.dtype.kind not in "iu":
        header.remove("BLANK", ignore_missing=True, remove_all=True)
    header.add_history(f"boxcar {params.width}x{params.height} boundary={params.boundary} constant={params.constant}")
    output = BytesIO()
    fits.PrimaryHDU(pixels, header=header).writeto(output, checksum=True)
    return Response(output.getvalue(), media_type="application/fits")


RELEASE_FILES = ("IRAF-Workbench-Windows-x64.exe","IRAF-Workbench-Ubuntu-amd64.deb","IRAF-Workbench-macOS.zip")


def serve(open_browser=True, ready_file=None):
    if not (ROOT / "dist/index.html").exists():
        raise SystemExit("缺少网页资源，请先运行 npm ci 和 npm run build。")
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    port = listener.getsockname()[1]
    origin = f"http://127.0.0.1:{port}"
    token = secrets.token_urlsafe(32)
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    server = uvicorn.Server(uvicorn.Config(app, log_config=None, access_log=False, ws="none", timeout_graceful_shutdown=4))
    slot = asyncio.Semaphore(1)
    current = None
    outputs = {}
    cached = None

    @app.middleware("http")
    async def local_session(request, call_next):
        if request.headers.get("host") != f"127.0.0.1:{port}":
            return Response(status_code=403)
        if request.url.path.startswith("/api/"):
            bearer = request.headers.get("authorization", "")
            if request.headers.get("origin", origin) != origin or not secrets.compare_digest(bearer.encode(), f"Bearer {token}".encode()):
                return Response(status_code=403)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    @app.post("/api/open")
    async def open_image(request: Request):
        nonlocal current, cached
        async with slot:
            with tempfile.TemporaryDirectory() as staging:
                path = Path(staging) / "input.fits"
                with path.open("wb") as stream:
                    async for chunk in request.stream():
                        if stream.tell() + len(chunk) > MAX_BYTES:
                            raise HTTPException(413, "单个文件最大 192 MiB。")
                        stream.write(chunk)
                with path.open("rb") as stream:
                    current = await run_in_threadpool(decode_image, stream, request.headers.get("X-Filename", "image.fits")[:2048])
                cached = None
                return await run_in_threadpool(current.response)

    @app.get("/api/current")
    def current_image():
        return current.response() if current else Response(status_code=204)

    release_dir = ROOT / "build" / "downloads"

    @app.get("/api/downloads")
    def release_list():
        return [name for name in RELEASE_FILES if (release_dir / name).is_file()]

    @app.get("/downloads/{name}")
    def release_file(name: str):
        if name not in RELEASE_FILES or not (release_dir / name).is_file():
            raise HTTPException(404)
        return FileResponse(release_dir / name, filename=name)

    @app.post("/api/inspect")
    async def inspect_input(request: Request):
        size = request.headers.get("content-length", "")
        if not size.isdecimal() or int(size) > MAX_BYTES:
            raise HTTPException(413, "图像须小于 192 MiB。")
        async with slot:
            async with request.form(max_files=1, max_fields=0) as form:
                field = form.get("science")
                if not getattr(field, "filename", None):
                    raise HTTPException(422, "请选择 FITS 文件。")
                image = await run_in_threadpool(decode_image, field.file, "input.fits")
                try:
                    return await run_in_threadpool(thumbnail, image.data)
                except ValueError as exc:
                    raise HTTPException(422, str(exc)) from exc

    @app.post("/api/reduce/{kind}")
    async def reduce(kind: Literal["ccd","phot","spec"], request: Request):
        size = request.headers.get("content-length", "")
        if not size.isdecimal() or int(size) > MAX_BYTES:
            raise HTTPException(413, "上传总量须小于 192 MiB。")
        async with slot:
            async with request.form(max_files=4, max_fields=12) as form:
                try:
                    data, result = await run_in_threadpool(reduce_uploaded, kind, form, decode_image)
                except ValueError as exc:
                    raise HTTPException(422, str(exc)) from exc
            key = secrets.token_hex(12)
            outputs[kind] = (key, data)
            return {**result, "id": key}

    @app.get("/api/output/{kind}/{key}")
    def output(kind: Literal["ccd","phot","spec"], key: str):
        stored = outputs.get(kind)
        if not stored or stored[0] != key:
            raise HTTPException(409, "结果已更新，请重新运行。")
        return Response(stored[1], media_type="application/fits")

    @app.post("/api/boxcar/{action}")
    async def process(action: Literal["preview", "export"], params: Parameters):
        nonlocal cached
        async with slot:
            if current is None or params.image_id != current.id:
                raise HTTPException(409, "当前图像已更换，请重新打开后处理。")
            if cached is None or cached[0] != params:
                try:
                    result = await run_in_threadpool(current.smooth, params)
                except ValueError as exc:
                    raise HTTPException(422, str(exc)) from exc
                cached = (params, result)
            if action == "preview":
                return await run_in_threadpool(current.response, cached[1])
            return await run_in_threadpool(export_fits, current, cached[1], params)

    @app.post("/api/exit")
    def exit_session():
        server.should_exit = True
        return {"closed": True}

    app.mount("/", StaticFiles(directory=ROOT / "dist", html=True))
    listener.listen()
    url = f"{origin}/#{token}"
    if ready_file:
        ready_file.write_text(url, encoding="utf-8")
    if open_browser:
        webbrowser.open(url)
    try:
        server.run(sockets=[listener])
    finally:
        listener.close()
        if ready_file:
            ready_file.unlink(missing_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ready-file", type=Path, help=argparse.SUPPRESS)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    serve(not args.no_browser, args.ready_file)
