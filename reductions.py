"""Numerical operations on uploaded 2-D primary images. FITS coordinates start at 1."""
from io import BytesIO
import base64
import numpy as np
from astropy.io import fits


def thumbnail(data):
    step = max(1, int(np.ceil(max(data.shape) / 480)))
    sample = data[::-step, ::step]
    valid = sample[np.isfinite(sample)]
    if not valid.size:
        raise ValueError("图像没有有效像素。")
    low, high = np.percentile(valid, [1, 99.5])
    pixels = np.nan_to_num(np.clip((sample-low) / max(high-low, 1e-12), 0, 1))
    return dict(width=sample.shape[1], height=sample.shape[0], step=step, rows=data.shape[0], cols=data.shape[1],
                pixels=base64.b64encode((pixels*255).astype("u1").tobytes()).decode())


def number(form, key):
    try:
        value = float(form[key])
    except (TypeError, ValueError, KeyError):
        raise ValueError(f"参数 {key} 缺失或无效。") from None
    if not np.isfinite(value):
        raise ValueError(f"参数 {key} 必须为有限数值。")
    return value


def calibrate(image, masters):
    if not masters:
        raise ValueError("至少选择一种主校准帧。")
    data = image.data.astype("f8")
    header = image.header.copy()
    for key in ("BSCALE","BZERO","BLANK","DATAMIN","DATAMAX","CHECKSUM","DATASUM"):
        header.remove(key, ignore_missing=True, remove_all=True)
    for role, frame in masters.items():
        if data.shape != frame.data.shape:
            raise ValueError("校准帧与科学帧的尺寸必须一致。")
        for key in ("INSTRUME","CCDSUM","XBINNING","YBINNING") + (("FILTER",) if role=="flat" else ()):
            if key in header and key in frame.header and str(header[key]).strip().casefold() != str(frame.header[key]).strip().casefold():
                raise ValueError(f"校准帧与科学帧的 {key} 不匹配。")
        if role == "bias":
            data -= frame.data
        elif role == "dark":
            seconds = [number(h, "EXPTIME") for h in (header, frame.header)]
            if min(seconds) <= 0:
                raise ValueError("科学帧和主暗场需要正的 EXPTIME。")
            data -= frame.data * (seconds[0]/seconds[1])
        elif role == "flat":
            valid = np.isfinite(frame.data) & (frame.data > 0)
            if not valid.any():
                raise ValueError("平场中没有正的有效像素。")
            data /= np.where(valid, frame.data / np.median(frame.data[valid]), np.nan)
        header.add_history(f"{role}: {frame.filename}")
    hdu = fits.PrimaryHDU(data, header)
    return hdu, dict(image=thumbnail(data), summary=f"{data.shape[1]} × {data.shape[0]} px · 有效像素 {np.isfinite(data).sum()}")


def aperture(image, form):
    x,y,r,inner,outer = [number(form,k) for k in ("x","y","radius","inner","outer")]
    h,w = image.data.shape
    if not (0 < r < inner < outer and 1+outer <= x <= w-outer and 1+outer <= y <= h-outer):
        raise ValueError("孔径与天空环须完整位于图内，并符合 0 < 孔径 < 天空环内半径 < 天空环外半径。")
    x0,x1 = int(x-outer)-1, int(x+outer)
    y0,y1 = int(y-outer)-1, int(y+outer)
    yy,xx = np.ogrid[y0+1:y1+1,x0+1:x1+1]
    distance = (xx-x)**2+(yy-y)**2
    patch = image.data[y0:y1,x0:x1]
    source = patch[distance<=r*r]
    sky = patch[(distance>=inner**2)&(distance<=outer**2)&np.isfinite(patch)]
    if not source.size or not sky.size or not np.isfinite(source).all():
        raise ValueError("源孔径含无效像素，或天空环没有可用像素。")
    background = float(np.median(sky))
    flux = float(source.sum(dtype="f8") - source.size*background)
    fields = dict(XCENTER=x,YCENTER=y,RADIUS=r,SKYINNER=inner,SKYOUTER=outer,NPIX=source.size,MSKY=background,FLUX=flux)
    unit = image.header.get("BUNIT")
    table = fits.BinTableHDU.from_columns([fits.Column(name=k,format="D",array=[v],
                 unit=unit if k in ("MSKY","FLUX") else None) for k,v in fields.items()],name="PHOTOMETRY")
    table.header.add_history("Pixel-center aperture; median annular sky subtracted.")
    return table, dict(image=thumbnail(image.data),aperture=[x,y,r,inner,outer],summary=f"({x:g}, {y:g}) · 孔径 {source.size} px · 天空 {background:.6g} · 净通量 {flux:.8g} {unit or '（原图计数）'}")


def extract(image, form):
    axis = form.get("axis")
    if axis not in ("X","Y"):
        raise ValueError("请指定色散方向。")
    data = image.data if axis=="X" else image.data.T
    bands=[]
    for a,b in (("first","last"),("skyfirst","skylast")):
        lo,hi=number(form,a),number(form,b)
        if not (lo.is_integer() and hi.is_integer() and 1<=lo<=hi<=data.shape[0]):
            raise ValueError("提取区和背景区须为图内的整数行或列。")
        bands.append((int(lo),int(hi)))
    (lo,hi),(sl,sh)=bands
    if lo<=sh and sl<=hi:
        raise ValueError("提取区和背景区重叠。")
    sky = np.nanmedian(np.where(np.isfinite(data[sl-1:sh]),data[sl-1:sh],np.nan),axis=0)
    flux=data[lo-1:hi].sum(axis=0,dtype="f8")-(hi-lo+1)*sky
    flux[~np.isfinite(flux)]=np.nan
    if not np.isfinite(flux).any():
        raise ValueError("没有有效谱点。")
    hdu=fits.PrimaryHDU(flux)
    hdu.header.update(CTYPE1="PIXEL",CUNIT1="pix",CRPIX1=1.,CRVAL1=1.,CDELT1=1.)
    for key in ("OBJECT","BUNIT","EXPTIME","DATE-OBS","INSTRUME"):
        if key in image.header:
            hdu.header[key]=image.header[key]
    hdu.header.add_history(f"Dispersion {axis}; sum [{lo}:{hi}]; median sky [{sl}:{sh}]")
    return hdu, dict(unit=str(image.header.get("BUNIT","原图计数")), signal=[float(v) if np.isfinite(v) else None for v in flux],
                     summary=f"{flux.size} 谱点 · 色散轴 {axis} · 孔径 {lo}–{hi} · 背景 {sl}–{sh} · 横轴为像素")


def reduce_uploaded(kind, form, decode):
    from urllib.parse import quote
    def read(key):
        field=form.get(key)
        if not getattr(field,"filename",None):
            raise ValueError("缺少输入 FITS 文件。")
        return decode(field.file,quote(field.filename,safe=""))
    image=read("science")
    if kind=="ccd":
        masters={k:read(k) for k in ("bias","dark","flat") if getattr(form.get(k),"filename",None)}
        hdu, result=calibrate(image,masters)
    elif kind=="phot":
        hdu,result=aperture(image,form)
    else:
        hdu,result=extract(image,form)
    hdu.header.add_history("Source: "+image.filename)
    stream=BytesIO()
    hdu.writeto(stream,checksum=True)
    return stream.getvalue(), result
