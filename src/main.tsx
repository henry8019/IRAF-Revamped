import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { Guide, Shell } from "./guide";
import { Observations } from "./observations";

type Frame = {
  id: string;
  width: number;
  height: number;
  bitpix: number;
  unit: string;
  object: string;
  name: string;
  pixels: Float64Array;
  sorted: number[];
};
type View = { scale: number; x: number; y: number };
const sessionFragment = /^#([A-Za-z0-9_-]{43})$/.exec(location.hash);
const token = sessionFragment?.[1] ?? sessionStorage.getItem("session") ?? "";
if (sessionFragment) {
  sessionStorage.setItem("session", token);
  history.replaceState(null, "", location.pathname + location.search);
}
const headers = { Authorization: "Bearer " + token };
const number = (n: number) =>
  Number.isFinite(n) ? String(Number(n.toPrecision(9))) : String(n);

function drawPixels(
  canvas: HTMLCanvasElement,
  frame: Frame,
  pixels: Float64Array,
  low: number,
  high: number,
) {
  const ctx = canvas.getContext("2d")!;
  const image = ctx.createImageData(frame.width, frame.height);
  for (let row = 0; row < frame.height; row++)
    for (let col = 0; col < frame.width; col++) {
      const value = pixels[(frame.height - row - 1) * frame.width + col];
      const i = 4 * (row * frame.width + col);
      const grey = Number.isFinite(value)
        ? (255 * (value - low)) / (high - low || 1)
        : 0;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = grey;
      image.data[i + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
}

function App() {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [settings,setSettings]=useState(false);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [exited, setExited] = useState(false),
    [drag, setDrag] = useState(false);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const [bounds, setBounds] = useState({ w: 1, h: 1 });
  const [range, setRange] = useState<[number, number]>([0, 1]);
  const [cursor, setCursor] = useState<{
    x: number;
    y: number;
    screenX: number;
  } | null>(null);
  const field = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  const file = useRef<HTMLInputElement>(null),
    seq = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [width, setWidth] = useState("3"),
    [height, setHeight] = useState("3");
  const [boundary, setBoundary] = useState("nearest"),
    [constant, setConstant] = useState("0");
  const [split, setSplit] = useState(50);
  const [result, setResult] = useState<{
    key: string;
    pixels: Float64Array;
  } | null>(null);
  const [taskError, setTaskError] = useState(""),
    [saving, setSaving] = useState(false);
  const resultCanvas = useRef<HTMLCanvasElement>(null);
  const valid =
    [width, height].every(
      (s) => Number.isInteger(Number(s)) && +s >= 1 && +s <= 8192,
    ) &&
    (boundary !== "constant" ||
      (constant.trim() !== "" && Number.isFinite(+constant)));
  const params = JSON.stringify({
    image_id: frame?.id,
    width: +width,
    height: +height,
    boundary,
    constant: boundary === "constant" ? +constant : 0,
  });
  const preview =
    enabled && valid && result?.key === params ? result.pixels : null;
  useEffect(() => {
    setTaskError("");
    if (!enabled || !frame || !valid || busy) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/boxcar/preview", {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: params,
          signal: controller.signal,
        });
        if (!res.ok) throw Error((await res.json()).detail || "预览失败");
        const pixels = new Float64Array(await res.arrayBuffer());
        if (!controller.signal.aborted) setResult({ key: params, pixels });
      } catch (e) {
        if (!controller.signal.aborted)
          setTaskError(String((e as Error).message));
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, params, valid, busy]);

  async function save() {
    if (!frame || !valid || busy || saving) return;
    setSaving(true);
    setTaskError("");
    try {
      const res = await fetch("/api/boxcar/export", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: params,
      });
      if (!res.ok) throw Error((await res.json()).detail || "导出失败");
      const url = URL.createObjectURL(await res.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download =
        frame.name.replace(/\.(fits?|fts)$/i, "") + "_boxcar.fits";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      setTaskError(String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  async function open(f?: File) {
    const id = ++seq.current;
    setBusy(true);
    setError("");
    try {
      const plate = window.irafTrial?.plate;
      const res = plate ? await fetch(plate.url) : await fetch(f ? "/api/open" : "/api/current", {
        method: f ? "POST" : "GET",
        headers: f
          ? { ...headers, "X-Filename": encodeURIComponent(f.name) }
          : headers,
        body: f,
      });
      if (!res.ok)
        throw Error(
          (await res.json().catch(() => ({}))).detail ||
            "无法连接本机会话，请重新启动工作台。",
        );
      const meta = JSON.parse(atob(plate?.meta ?? res.headers.get("X-Image")!));
      const pixels = new Float64Array(await res.arrayBuffer());
      const sorted: number[] = [];
      for (
        let i = 0, step = Math.max(1, Math.ceil(pixels.length / 65536));
        i < pixels.length;
        i += step
      )
        if (Number.isFinite(pixels[i])) sorted.push(pixels[i]);
      sorted.sort((a, b) => a - b);
      if (id !== seq.current) return;
      setFrame({
        ...meta,
        pixels,
        sorted,
        name: decodeURIComponent(
          res.headers.get("X-Filename") ?? "dev$pix.fits",
        ),
      });
      setRange([1, 99]);
      setResult(null);
      setEnabled(false);
      setCursor(null);
    } catch (e) {
      if (id === seq.current) setError(String((e as Error).message));
    } finally {
      if (id === seq.current) setBusy(false);
    }
  }
  useEffect(() => {
    void open();
  }, []);
  useEffect(() => {
    if (!field.current || exited) return;
    const observer = new ResizeObserver(([r]) =>
      setBounds({ w: r.contentRect.width, h: r.contentRect.height }),
    );
    observer.observe(field.current);
    return () => observer.disconnect();
  }, [exited]);
  function fit() {
    if (!frame) return;
    setCursor(null);
    const scale =
      Math.min(bounds.w / frame.width, bounds.h / frame.height) * 0.96;
    setView({
      scale,
      x: (bounds.w - frame.width * scale) / 2,
      y: (bounds.h - frame.height * scale) / 2,
    });
  }
  useEffect(fit, [frame, bounds]);
  const quantile = (p: number) =>
    frame?.sorted[Math.floor(((frame.sorted.length - 1) * p) / 100)] ?? 0;
  const low = quantile(range[0]),
    high = quantile(range[1]);
  useEffect(() => {
    if (!frame || !canvas.current) return;
    drawPixels(canvas.current, frame, frame.pixels, low, high);
  }, [frame, low, high]);
  useEffect(() => {
    if (frame && preview && resultCanvas.current)
      drawPixels(resultCanvas.current, frame, preview, low, high);
  }, [frame, preview, low, high]);
  function zoom(factor: number, x = bounds.w / 2, y = bounds.h / 2) {
    setCursor(null);
    setView((old) => {
      const fitScale = frame
        ? Math.min(bounds.w / frame.width, bounds.h / frame.height)
        : 1;
      const scale = Math.max(
        0.01,
        Math.min(Math.max(64, fitScale * 8), old.scale * factor),
      );
      return {
        scale,
        x: x - ((x - old.x) * scale) / old.scale,
        y: y - ((y - old.y) * scale) / old.scale,
      };
    });
  }
  useEffect(() => {
    const el = field.current;
    if (!el || exited) return;
    function wheel(e: WheelEvent) {
      e.preventDefault();
      const b = el!.getBoundingClientRect();
      zoom(
        Math.exp(-Math.sign(e.deltaY) * 0.17),
        e.clientX - b.left,
        e.clientY - b.top,
      );
    }
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [exited, frame, bounds]);
  async function quit() {
    try {
      const r = await fetch("/api/exit", { method: "POST", headers });
      if (!r.ok) throw Error();
      setExited(true);
      setFrame(null);
      sessionStorage.removeItem("session");
    } catch {
      setError("退出未完成，请检查本机服务。");
    }
  }
  if (exited)
    return (
      <main className="end">
        <h1>工作台已退出</h1>
        <p>可以关闭此标签页。</p>
      </main>
    );
  const onResult =
    preview && cursor && cursor.screenX >= (bounds.w * split) / 100;
  const px =
    frame && cursor
      ? (onResult ? preview : frame.pixels)[cursor.y * frame.width + cursor.x]
      : null;
  return (
    <main className="desk viewer">
      <header className="obshead"><div><div className="discipline" lang="en">Image explorer</div><h1>{frame?.name==="dev$pix.fits" && frame.object.toLowerCase().includes("m51") ? "M51 · 涡状星系" : frame?.object || "FITS 图像查看器"}</h1></div>
        <div className="actions">
          {!window.irafTrial&&<><button className="open" onClick={() => file.current?.click()}>
            打开 FITS
          </button>
          <button onClick={quit}>退出</button></>}
          <button aria-expanded={settings} aria-controls="display-tools" onClick={()=>setSettings(!settings)}>显示设置</button>
        </div>
      </header>
      <input
        type="file"
        hidden
        ref={file}
        accept=".fits,.fit,.fts"
        onChange={(e) => {
          if (e.target.files?.[0]) void open(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <section className={"work"+(settings?" settings-open":"")}>
        <article>
          <nav>
            <strong>{frame?.name ?? "图像"}</strong>
            <div>
              <button aria-label="缩小" onClick={() => zoom(1 / 1.25)}>
                −
              </button>
              <span>{Math.round(view.scale * 100)}%</span>
              <button aria-label="放大" onClick={() => zoom(1.25)}>
                ＋
              </button>
              <button onClick={fit}>适应窗口</button>
            </div>
          </nav>
          <div
            ref={field}
            className={"field" + (drag ? " drag" : "")}
            tabIndex={0}
            aria-label="星图，使用方向键移动，按加减键缩放"
            onKeyDown={(e) => {
              if (e.key === "+" || e.key === "=") zoom(1.25);
              else if (e.key === "-") zoom(0.8);
              else if (e.key.startsWith("Arrow")) {
                e.preventDefault();
                setView((v) => ({
                  ...v,
                  x:
                    v.x +
                    (e.key === "ArrowLeft"
                      ? 32
                      : e.key === "ArrowRight"
                        ? -32
                        : 0),
                  y:
                    v.y +
                    (e.key === "ArrowUp"
                      ? 32
                      : e.key === "ArrowDown"
                        ? -32
                        : 0),
                }));
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!window.irafTrial && e.dataTransfer.files[0]) void open(e.dataTransfer.files[0]);
            }}
            onPointerDown={(e) => {
              last.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={() => {
              last.current = null;
            }}
            onLostPointerCapture={() => {
              last.current = null;
            }}
            onPointerLeave={() => setCursor(null)}
            onPointerMove={(e) => {
              if (!frame) return;
              const r = e.currentTarget.getBoundingClientRect();
              const dx = last.current ? e.clientX - last.current.x : 0,
                dy = last.current ? e.clientY - last.current.y : 0;
              if (last.current) {
                last.current = { x: e.clientX, y: e.clientY };
                setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
              }
              const x = Math.floor(
                (e.clientX - r.left - view.x - dx) / view.scale,
              );
              const y =
                frame.height -
                1 -
                Math.floor((e.clientY - r.top - view.y - dy) / view.scale);
              setCursor(
                x >= 0 && x < frame.width && y >= 0 && y < frame.height
                  ? { x, y, screenX: e.clientX - r.left }
                  : null,
              );
            }}
          >
            {frame && (
              <canvas
                ref={canvas}
                width={frame.width}
                height={frame.height}
                style={{
                  transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
                }}
              />
            )}
            {preview && frame && (
              <>
                <div
                  className="result-layer"
                  style={{ clipPath: `inset(0 0 0 ${split}%)` }}
                >
                  <canvas
                    ref={resultCanvas}
                    width={frame.width}
                    height={frame.height}
                    style={{
                      transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
                    }}
                  />
                </div>
                <span className="layer-tag original">原图</span>
                <span className="layer-tag filtered">平滑结果</span>
                <div
                  className="wipe"
                  role="slider"
                  aria-label="原图与结果分界线"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(split)}
                  tabIndex={0}
                  style={{ left: split + "%" }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                      e.preventDefault();
                      e.stopPropagation();
                      setSplit((v) =>
                        Math.max(
                          0,
                          Math.min(100, v + (e.key === "ArrowLeft" ? -1 : 1)),
                        ),
                      );
                    }
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    e.stopPropagation();
                    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                      const rect = field.current!.getBoundingClientRect();
                      setSplit(
                        Math.max(
                          0,
                          Math.min(
                            100,
                            (100 * (e.clientX - rect.left)) / rect.width,
                          ),
                        ),
                      );
                      setCursor(null);
                    }
                  }}
                >
                  <b>‹ ›</b>
                </div>
              </>
            )}
            {busy && (
              <span className="notice" role="status">
                正在读取 FITS…
              </span>
            )}
            {error && (
              <div className="notice" role="alert">
                {error}
              </div>
            )}
          </div>
        </article>
        <aside hidden={!settings} id="display-tools">
          {!window.irafTrial&&<><h2>
            方框平滑 <small>boxcar</small>
          </h2>
          <div className="kernel">
            <label>
              窗口宽度
              <input
                type="number"
                min={1}
                max={8192}
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </label>
            <label>
              窗口高度
              <input
                type="number"
                min={1}
                max={8192}
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </label>
          </div>
          <label className="boundary">
            边界处理
            <select
              value={boundary}
              onChange={(e) => setBoundary(e.target.value)}
            >
              <option value="nearest">最近像素</option>
              <option value="constant">常数填充</option>
              <option value="reflect">反射</option>
              <option value="wrap">环绕</option>
            </select>
          </label>
          {boundary === "constant" && (
            <label>
              填充值
              <input
                type="number"
                step="any"
                value={constant}
                onChange={(e) => setConstant(e.target.value)}
              />
            </label>
          )}
          <label className="live">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            实时预览
          </label>
          {enabled && !valid && (
            <p role="alert">请填写有效的窗口宽高与边界参数。</p>
          )}
          {taskError && <p role="alert">{taskError}</p>}
          <button
            className="open export"
            onClick={save}
            disabled={!frame || !valid || saving || busy || (enabled && !preview)}
          >
            {saving
              ? "正在导出…"
              : enabled && valid && !preview && !taskError
                ? "正在计算…"
                : "应用并另存 FITS"}
          </button></>}
          <section>
            <h2>显示设置</h2>
            <div className="ramp" />
            <div className="range-label">
              <span>显示拉伸</span>
              <small>线性</small>
            </div>
            {(["黑点", "白点"] as const).map((label, i) => (
              <label key={label}>
                {label}
                <output>{number(i ? high : low)}</output>
                <input
                  aria-label={label}
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={range[i]}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setRange(
                      i
                        ? [range[0], Math.max(range[0] + 0.1, p)]
                        : [Math.min(range[1] - 0.1, p), range[1]],
                    );
                  }}
                />
              </label>
            ))}
            <button className="reset" onClick={() => setRange([1, 99])}>
              恢复自动范围
            </button>
          </section>
          <section>
            <h2>图像信息</h2>
            <dl>
              <dt>尺寸</dt>
              <dd>{frame ? frame.width + " × " + frame.height : "—"}</dd>
              <dt>BITPIX</dt>
              <dd>{frame?.bitpix ?? "—"}</dd>
              <dt>单位</dt>
              <dd>{frame?.unit || "未指定"}</dd>
              {frame?.object && (
                <>
                  <dt>天体</dt>
                  <dd>{frame.object}</dd>
                </>
              )}
            </dl>
          </section>
        </aside>
      </section>
      <footer>
        <span className="lamp" />
        {window.irafTrial?"IRAF 内置样图":"本机会话"}
        <span className="readout">
          X {cursor ? cursor.x + 1 : "—"}　 Y {cursor ? cursor.y + 1 : "—"}　
          {preview ? (onResult ? "结果值" : "原图值") : "像素值"}{" "}
          <b>
            {px !== null ? number(px) : "—"} {frame?.unit}
          </b>
        </span>
      </footer>
    </main>
  );
}
const view = new URLSearchParams(location.search).get("view") || "image";
const flow = ["ccd","phot","spec"].indexOf(view);
createRoot(document.getElementById("root")!).render(
  <Shell view={view}>{flow>=0 ? <Observations headers={headers} active={flow}/> :
    view==="image" ? <App/> : <Guide/>}</Shell>
);
