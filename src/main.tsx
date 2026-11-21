import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import "./observations.css";
import "./guide.css";
import { Guide } from "./guide";
import { DocumentBar, Shell } from "./window";
import { Icon } from "./navigation";
import { Observations } from "./observations";

type Frame = {
  id: string;
  width: number;
  height: number;
  bitpix: number;
  unit: string;
  object: string;
  filter?: string;
  exposure?: string;
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

function App({visible,onImport}:{visible:boolean;onImport:(f:File)=>void}) {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [settings,setSettings]=useState(true);
  const [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const autoFit=useRef(true);
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
      const res = await fetch(f ? "/api/open" : "/api/current", {
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
      if (res.status === 204) return;
      const meta = JSON.parse(atob(res.headers.get("X-Image")!));
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
      if(f) onImport(f);
      autoFit.current=true;
      setFrame({
        ...meta,
        pixels,
        sorted,
        name: decodeURIComponent(
          res.headers.get("X-Filename") ?? "image.fits",
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
    if (!field.current) return;
    const observer = new ResizeObserver(([r]) =>
      setBounds({ w: r.contentRect.width, h: r.contentRect.height }),
    );
    observer.observe(field.current);
    return () => observer.disconnect();
  }, []);
  function fit() {
    if (!frame || !bounds.w || !bounds.h) return;
    autoFit.current=true;
    setCursor(null);
    const scale =
      Math.min(bounds.w / frame.width, bounds.h / frame.height) * 0.96;
    setView({
      scale,
      x: (bounds.w - frame.width * scale) / 2,
      y: (bounds.h - frame.height * scale) / 2,
    });
  }
  useEffect(()=>{ if(autoFit.current) fit(); else setCursor(null); }, [frame, bounds]);
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
    autoFit.current=false;
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
    if (!el) return;
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
  }, [frame, bounds]);
  const distribution = useMemo(()=>{
    const values=frame?.sorted;
    if(!values?.length) return "";
    const min=values[0], max=values[values.length-1];
    const bins=Array<number>(80).fill(0);
    for(const value of values) {
      const i=Math.floor((value-min)/(max-min||1)*bins.length);
      bins[Math.min(i,bins.length-1)]++;
    }
    const peak=Math.log1p(Math.max(...bins));
    return "0,60 "+bins.map((n,i)=>`${i+0.5},${60-58*Math.log1p(n)/peak}`).join(" ")+" 80,60";
  },[frame]);
  const onResult =
    preview && cursor && cursor.screenX >= (bounds.w * split) / 100;
  const px =
    frame && cursor
      ? (onResult ? preview : frame.pixels)[cursor.y * frame.width + cursor.x]
      : null;
  return (
    <main className="desk viewer" hidden={!visible}>
      {visible && <DocumentBar title={frame?.name??"FITS 查看器"}>
        <div className="zoom-group"><button aria-label="缩小" onClick={()=>zoom(.8)}>−</button>
          <button className="zoom-value" aria-label="适应窗口" title="适应窗口" onClick={fit}>{Math.round(view.scale*100)}%</button>
          <button aria-label="放大" onClick={()=>zoom(1.25)}>＋</button></div>
        <button className="toolbar-button" onClick={()=>file.current?.click()}><Icon name="folder"/>打开 FITS</button>
        <button className="toolbar-button inspector-toggle" title="显示或隐藏检查器" aria-label="显示设置" aria-expanded={settings} aria-controls="display-tools" onClick={()=>setSettings(!settings)}><Icon name="info"/></button>
      </DocumentBar>}
      <input
        type="file"
        hidden
        ref={file}
        accept=".fits,.fit,.fts,.fz"
        onChange={(e) => {
          if (e.target.files?.[0]) void open(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <section className={"work"+(settings?" settings-open":"")}>
        <article>
          <div
            ref={field}
            className={"field" + (drag ? " drag" : "")}
            tabIndex={0}
            aria-label="星图，使用方向键移动，按加减键缩放"
            onKeyDown={(e) => {
              if (e.key === "+" || e.key === "=") zoom(1.25);
              else if (e.key === "-") zoom(0.8);
              else if (e.key.startsWith("Arrow")) {
                autoFit.current=false;
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
              if (e.dataTransfer.files[0]) void open(e.dataTransfer.files[0]);
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
                if(dx || dy) autoFit.current=false;
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
            {!frame && !busy && !error && <button className="import-empty" onClick={()=>file.current?.click()}>选择二维 FITS 图像</button>}
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
          <footer className="image-status"><span>X {cursor?cursor.x+1:"—"}　Y {cursor?cursor.y+1:"—"}
            {px!==null&&<b>　{preview?(onResult?"结果":"原图"):"像素"} {number(px)} {frame?.unit}</b>}</span>
            <span>{frame?`${frame.width} × ${frame.height} px`:"—"}</span></footer>
        </article>
        <aside hidden={!settings} id="display-tools"><h2>检查器</h2>
          <details open><summary>图像信息</summary><dl>
            {frame?.object&&<><dt>目标</dt><dd>{frame.object}</dd></>}
            {frame?.filter&&<><dt>波段</dt><dd>{frame.filter}</dd></>}
            {frame?.exposure&&<><dt>曝光</dt><dd>{frame.exposure} s</dd></>}
            <dt>BITPIX</dt><dd>{frame?.bitpix??"—"}</dd>
            {frame?.unit&&<><dt>单位</dt><dd>{frame.unit}</dd></>}
          </dl></details>
          <details open><summary>显示拉伸</summary><div className="inspector-body">
            <svg className="luma" viewBox="0 0 80 60" preserveAspectRatio="none" role="img" aria-label="图像灰度分布，采样像素计数为对数刻度"><title>图像灰度分布 · 对数计数</title><polygon points={distribution}/></svg>
            {(["黑点", "白点"] as const).map((label, i) => (
              <label key={label} className="level-row">
                {label}

                <input
                  aria-label={label}
                  title={label+" · "+number(i?high:low)}
                  style={{background:`linear-gradient(to right,var(--accent) ${range[i]}%,#46515f ${range[i]}%)`}}
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
                <output>{number(i?high:low)}</output>
              </label>
            ))}
            <button className="reset" onClick={() => setRange([1, 99])}>
              恢复自动范围
            </button>
          </div></details>
          <details><summary>方框平滑</summary><div className="inspector-body">
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
          </button>
          </div></details>
        </aside>
      </section>
    </main>
  );
}
function currentView() {
  return new URLSearchParams(location.search).get("view") || "image";
}

function Workbench() {
  const [view,setView]=useState(currentView);
  const [imageOpened,setImageOpened]=useState(view==="image");
  const [imported,setImported]=useState<File|null>(null);
  const flow=["ccd","phot","spec"].indexOf(view);

  function show(next:string) {
    if(next==="image") setImageOpened(true);
    setView(next);
  }
  useEffect(()=>{
    const sync=()=>show(currentView());
    window.addEventListener("popstate",sync);
    return ()=>window.removeEventListener("popstate",sync);
  },[]);

  function navigate(link:HTMLAnchorElement) {
    const next=new URL(link.href).searchParams.get("view");
    if(!next) return false;
    if(next!==view) {
      try {history.pushState(null,"",link.href);}
      catch {return false;}
      show(next);
    }
    return true;
  }

  return <Shell view={view} headers={headers} navigate={navigate}>
    {imageOpened && <App visible={view==="image"} onImport={setImported}/>}
    {["ccd","phot","spec"].map((kind,i)=><Observations key={kind} kind={kind} active={flow===i} imported={imported} headers={headers}/>)}
    {flow<0 && view!=="image" && <Guide/>}
  </Shell>;
}

createRoot(document.getElementById("root")!).render(<Workbench/>);
