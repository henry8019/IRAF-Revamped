import { useEffect, useMemo, useRef, useState } from "react";
import "./observations.css";

type Star = {ID:number; XCENTER:number; YCENTER:number; MSKY:number; FLUX:number; MAG:number; MERR:number};
type Data = {wave:number[]; flux:number[]; unit:string; waveUnit:string; raw:number[][]; ccd:number[][]; slit:number[][]; stars:Star[]};
export const workflows = [
  {name:"CCD 预处理", subtitle:"CCD reduction", file:"calibrated-field.fits", icon:"layers"},
  {name:"孔径测光", subtitle:"Aperture photometry", file:"photometry.fits", icon:"target"},
  {name:"长缝光谱", subtitle:"Long-slit spectroscopy", file:"calibrated-spectrum.fits", icon:"wave"},
];
export function Icon({name}:{name:string}) {
  const paths:Record<string,string> = {scope:"M3 17 6 14l5 4-3 3zm3-5 4-6 8 6-4 6zM12 5l2-3 8 6-2 3M11 18l2 4",home:"M3 10l9-7 9 7v10h-6v-6H9v6H3Z",layers:"m3 8 9-5 9 5-9 5Zm0 5 9 5 9-5M3 18l9 5 9-5",target:"M12 2v5m0 10v5M2 12h5m10 0h5M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",wave:"M2 15h4l2-6 3 10 3-16 3 12h5",image:"M3 4h18v16H3Zm1 13 5-5 3 3 3-5 5 7",download:"M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",folder:"M3 6h7l2 2h9v12H3Z"};
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}

function Raster({pixels, label, stars=[], selected=0, onSelect, limits}:{pixels:number[][];label:string;stars?:Star[];selected?:number;onSelect?:(index:number)=>void;limits?:[number,number]}) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current!, ctx=canvas.getContext("2d")!;
    const width=pixels[0].length, height=pixels.length;
    canvas.width=width; canvas.height=height;
    const image=ctx.createImageData(width,height), values=pixels.flat();
    const [lo,hi]=limits??[Math.min(...values),Math.max(...values)];
    for(let y=0;y<height;y++) for(let x=0;x<width;x++){
      const i=4*(y*width+x);
      const t=Math.min(1, Math.max(0,Math.asinh(18*(pixels[height-1-y][x]-lo)/(hi-lo||1))/Math.asinh(18)));
      image.data.set([11+224*t,20+223*t,35+215*t,255],i);
    }
    ctx.putImageData(image,0,0);
  },[pixels,limits]);
  return <div className="raster"><canvas ref={ref} role="img" aria-label={label}/>
    {stars.map((s,index)=><button type="button" aria-label={"选择星源 "+s.ID} aria-pressed={s.ID===selected} onClick={()=>onSelect?.(index)} className={"source-pin "+(s.ID===selected?"chosen":"")} key={s.ID}
      style={{left:((s.XCENTER-.5)/pixels[0].length*100)+"%",top:((pixels.length+.5-s.YCENTER)/pixels.length*100)+"%"}}><b>{s.ID}</b></button>)}</div>;
}
function Histogram({pixels}:{pixels:number[][]}) {
  const {min,max,bins}=useMemo(()=>{
    const values=pixels.flat();
    const min=Math.min(...values), max=Math.max(...values);
    const bins=Array<number>(32).fill(0);
    for (const value of values) {
      const index=Math.floor((value-min)/(max-min||1)*bins.length);
      bins[Math.min(index,bins.length-1)]++;
    }
    return {min,max,bins};
  },[pixels]);
  const peak=Math.log1p(Math.max(...bins));
  return <figure className="distribution"><figcaption>校正图像素分布 <small>计数 · 对数刻度</small></figcaption>
    <svg viewBox="0 0 256 52" preserveAspectRatio="none" role="img" aria-label={"校正图灰度直方图，范围 "+min.toFixed(1)+" 至 "+max.toFixed(1)+" ADU"}>
      {bins.map((count,i)=>{const h=48*Math.log1p(count)/peak;return <rect key={i} x={8*i} y={51-h} width="6.5" height={h}/>;})}
    </svg><div><span>{min.toFixed(1)}</span><span>ADU</span><span>{max.toFixed(1)}</span></div>
  </figure>;
}

function Spectrum({d,index,onIndex,points,pinned,onPin}:{d:Data;index:number;onIndex:(i:number)=>void;points:boolean;pinned:boolean;onPin:(pinned:boolean)=>void}){
  const width=800,height=252,left=62,right=18,top=26,bottom=43;
  const start=d.wave[0],end=d.wave[d.wave.length-1];
  const floor=Math.floor(Math.min(...d.flux)/50)*50,ceil=Math.ceil(Math.max(...d.flux)/50)*50;
  const x=(n:number)=>left+(n-start)/(end-start)*(width-left-right);
  const y=(n:number)=>top+(ceil-n)/(ceil-floor)*(height-top-bottom);
  const line=d.flux.map((v,i)=>(i?"L":"M")+x(d.wave[i]).toFixed(2)+","+y(v).toFixed(2)).join(" ");
  function probe(e:React.PointerEvent<SVGSVGElement>) {
    const matrix=e.currentTarget.getScreenCTM();
    if (!matrix) return;
    const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
    const fraction=(p.x-left)/(width-left-right);
    onIndex(Math.max(0,Math.min(d.wave.length-1,Math.round(fraction*(d.wave.length-1)))));
  }
  return <svg className="spectrum" viewBox={`0 0 ${width} ${height}`} role="slider" tabIndex={0}
    aria-label="光谱采样点，使用左右方向键读取" aria-valuemin={1} aria-valuemax={d.wave.length} aria-valuenow={index+1}
    aria-valuetext={`${d.wave[index].toFixed(3)} Å，${d.flux[index].toFixed(2)} ADU`}
    onKeyDown={e=>{if(["ArrowRight","ArrowLeft","Home","End"].includes(e.key)){e.preventDefault();onIndex(e.key==="Home"?0:e.key==="End"?d.wave.length-1:Math.max(0,Math.min(d.wave.length-1,index+(e.key==="ArrowRight"?1:-1))));}}}
    onPointerMove={e=>{if(!pinned && e.pointerType==="mouse") probe(e);}}
    onPointerUp={e=>{probe(e);onPin(true);}}>
    {Array.from({length:1+(ceil-floor)/50},(_,i)=>floor+i*50).map(v=><g key={v}><path d={`M${left} ${y(v)}H${width-right}`} className="grid"/><text x={left-12} y={y(v)+4} textAnchor="end">{v}</text></g>)}
    {[4960,5000,5040,5080,5120].filter(v=>v>=start&&v<=end).map(v=><g key={v}><path d={`M${x(v)} ${top}V${height-bottom}`} className="grid"/><text x={x(v)} y={height-19} textAnchor="middle">{v}</text></g>)}
    <path d={line} className="signal"/>{points&&d.flux.map((v,i)=><circle key={i} cx={x(d.wave[i])} cy={y(v)} r="2" fill="#b1fff4"/>)}
    <path d={`M${x(d.wave[index])} ${top}V${height-bottom}`} className="probe"/><circle cx={x(d.wave[index])} cy={y(d.flux[index])} r="4" fill="#e0fffa" stroke="#479f98"/>
  </svg>;
}
declare global { interface Window { irafTrial?: {plate:{meta:string;url:string};data:Data; files:Record<string,string>; downloads:string[]} } }
export function Observations({headers,active}:{headers:Record<string,string>;active:number}) {
  const [d,setData]=useState<Data|null>(window.irafTrial?.data??null),[error,setError]=useState("");
  const [index,setIndex]=useState(40),[points,setPoints]=useState(false),[pinned,setPinned]=useState(false),[split,setSplit]=useState(50),[star,setStar]=useState(0);
  const [inspectOpen,setInspectOpen]=useState(false);
  const selectStar=(i:number)=>{setStar(i);setInspectOpen(true);};
  const [pixel,setPixel]=useState<[number,number]|null>(null);
  useEffect(()=>{if(window.irafTrial)return;fetch("/api/observations",{headers}).then(async r=>{if(!r.ok)throw Error("无法读取观测结果，请重新启动本机工作台。");return r.json();}).then(setData).catch(e=>setError(e.message));},[headers]);
  const current=workflows[active];
  async function download(){
    try{
      const r=await fetch(window.irafTrial?.files[current.file]??"/api/observations/"+current.file,{headers});if(!r.ok)throw Error("FITS 下载失败");
      const href=URL.createObjectURL(await r.blob()),a=document.createElement("a");a.href=href;a.download=current.file;a.click();setTimeout(()=>URL.revokeObjectURL(href),30000);
    }catch(e){setError((e as Error).message);}
  }
  const selected=d?.stars[star];
  const facts = !d?[]:active===2?[
    ["光谱范围",d.wave[0].toFixed(1)+" – "+d.wave.at(-1)!.toFixed(1)+" Å"],["采样间隔",(d.wave[1]-d.wave[0]).toFixed(3)+" Å"],["采样点数",String(d.wave.length)],["强度单位",d.unit.toUpperCase()]
  ]:active===1&&selected?[["源编号",String(selected.ID)],["质心 X",selected.XCENTER.toFixed(3)+" px"],["质心 Y",selected.YCENTER.toFixed(3)+" px"],["净通量",selected.FLUX.toFixed(2)+" ADU"],["星等 ± 误差",selected.MAG.toFixed(3)+" ± "+selected.MERR.toFixed(3)],["天空背景",selected.MSKY.toFixed(2)+" ADU/px"]]:[
    ["图像尺寸",d.ccd[0].length+" × "+d.ccd.length+" px"],["最小值",Math.min(...d.ccd.flat()).toFixed(2)+" ADU"],["最大值",Math.max(...d.ccd.flat()).toFixed(2)+" ADU"],["科学曝光","30 s"]
  ];
  const limits=useMemo<[number,number]|undefined>(()=>d&&active===0?
    [Math.min(...d.ccd.flat(),...d.raw.flat()),Math.max(...d.ccd.flat(),...d.raw.flat())]:undefined,[d,active]);
  function inspectKey(e:React.KeyboardEvent<HTMLDivElement>) {
    if (!d || e.target!==e.currentTarget) return;
    const moves:Record<string,[number,number]>={ArrowUp:[0,1],ArrowDown:[0,-1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
    const move=moves[e.key];
    if (!move) return;
    e.preventDefault();
    const [x,y]=pixel??[0,0];
    setPixel([Math.max(0,Math.min(d.ccd[0].length-1,x+move[0])),Math.max(0,Math.min(d.ccd.length-1,y+move[1]))]);
  }
  function inspect(e:React.PointerEvent<HTMLDivElement>){
    if (!d) return;
    const box=e.currentTarget.getBoundingClientRect();
    const x=Math.floor((e.clientX-box.left)*d.ccd[0].length/box.width);
    const y=d.ccd.length-1-Math.floor((e.clientY-box.top)*d.ccd.length/box.height);
    if(x>=0&&y>=0&&x<d.ccd[0].length&&y<d.ccd.length) setPixel([x,y]);
  }
  return <main className="desk science">
    <header className="obshead"><div><div className="discipline">模拟观测夜 <span>/</span> {current.subtitle}</div><h1>{current.name}</h1></div><div className="plate-actions"><button className="inspector-switch" aria-expanded={inspectOpen} aria-controls="product-inspector" onClick={()=>setInspectOpen(!inspectOpen)}>测量信息</button><button className="download" onClick={download} disabled={!d}><Icon name="download"/>下载 FITS</button></div></header>
    {error&&<p role="alert">{error}</p>}{!d&&!error&&<p role="status">正在读取 FITS 产物…</p>}
    {d&&<><div className={"dashboard"+(inspectOpen?" inspect-open":"")}><section className="primary-panel"><div className="panelhead"><div><h2>{["图像校正对比","星源定位","一维提取光谱"][active]}</h2><code>{current.file}</code></div>{active===2&&<label className="sample-toggle"><input type="checkbox" checked={points} onChange={e=>setPoints(e.target.checked)}/>采样点</label>}</div>
    {active===2?<div className="chartwell"><div className="chart-top">强度 / {d.unit.toUpperCase()} <span>━　目标谱</span></div><Spectrum d={d} index={index} onIndex={setIndex} points={points} pinned={pinned} onPin={setPinned}/><div className="axis-title">波长 / Å</div></div>:
    <div className="imagewell"><div className="detector" role="group" tabIndex={0} aria-label="图像像素，方向键移动并读取数值" onKeyDown={inspectKey} onPointerMove={inspect} onPointerDown={inspect}>
      <div aria-hidden="true" className="detector-x"><span>1</span><span>X / px</span><span>{d.ccd[0].length}</span></div>
      <div aria-hidden="true" className="detector-y"><span>{d.ccd.length}</span><span>Y / px</span><span>1</span></div>
      {active===0?<div className="comparison"><Raster pixels={d.ccd} limits={limits} label="校正后的图像"/><div className="raw-layer" style={{clipPath:`inset(0 ${100-split}% 0 0)`}}><Raster pixels={d.raw} limits={limits} label="原始曝光"/></div><i className="seam" style={{left:split+"%"}}><b>↔</b></i>
      <input className="ccd-wipe" type="range" min="0" max="100" aria-label="原图与校正图分界线" aria-valuetext={"原始曝光占 "+split+"%"} value={split} onChange={e=>setSplit(Number(e.target.value))}/>
      </div>:<Raster pixels={d.ccd} stars={d.stars} selected={selected?.ID} onSelect={selectStar} label="已定位星源的校正图像"/>}</div>
      {active===0&&<div className="compare-modes" role="group" aria-label="对比方式">{[[100,"原始曝光"],[50,"左右对比"],[0,"校正结果"]].map(([v,label])=><button key={v} aria-pressed={v===50?split>0&&split<100:split===v} onClick={()=>setSplit(Number(v))}>{label}</button>)}</div>}</div>}
    <div className="plot-foot">{active===2?<><button className="pin-readout" aria-pressed={pinned} onClick={()=>setPinned(!pinned)}>{pinned?"解除固定":"固定读数"}</button><code>λ {d.wave[index].toFixed(3)} Å　 ·　 {d.flux[index].toFixed(2)} ADU</code><small>点选固定 · ← → 逐点读取</small></>:active===1?"点选图中星源或下方星表编号":"原始曝光在左，校正结果在右 · 共用灰阶"}{active!==2&&<code className="pixel-read">{pixel?`X ${pixel[0]+1} · Y ${pixel[1]+1}　${active===0?"原始 "+d.raw[pixel[1]][pixel[0]].toFixed(2)+" / ":""}校正 ${d.ccd[pixel[1]][pixel[0]].toFixed(2)} ADU`:"X —　Y —　ADU —"}</code>}</div></section>
    <section id="product-inspector" className="inspector" hidden={!inspectOpen}><h2>{active===1?"选中星源":"产物信息"}</h2><dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>{active!==2&&<Histogram pixels={d.ccd}/>}<div className="process"><h3>处理步骤</h3>{[["偏置校正","暗场校正","平场校正"],["星源检测","背景估计","孔径积分"],["迹线追踪","背景扣除与提取","灯线波长标定"]][active].map(s=><div key={s}><i>✓</i>{s}</div>)}</div></section></div>
    <details className="extra" open={active===1}><summary className="panelhead"><div><h2>{["校准帧","测光星表","二维长缝曝光"][active]}</h2><code>{["3 组主校准数据","photometry.fits · HDU 1","target2d.fits"][active]}</code></div></summary>
    {active===2?<div className="strip"><Raster pixels={d.slit} label="原始二维目标曝光的空间与色散分布"/><span>色散方向 →</span></div>:active===1?<div className="tablescroll"><table><thead><tr>{["源编号","X / px","Y / px","通量 / ADU","星等 ± 误差"].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{d.stars.map((s,i)=><tr key={s.ID} className={star===i?"active-source":undefined}><td><button aria-pressed={star===i} onClick={()=>selectStar(i)}>源 {s.ID}</button></td><td>{s.XCENTER.toFixed(3)}</td><td>{s.YCENTER.toFixed(3)}</td><td>{s.FLUX.toFixed(2)}</td><td>{s.MAG.toFixed(3)} ± {s.MERR.toFixed(3)}</td></tr>)}</tbody></table></div>:<div className="masters">{["master-bias.fits","master-dark.fits","master-flat.fits"].map((f,i)=><div key={f}><Icon name="layers"/><span>{["主偏置帧","主暗场帧","主平场帧"][i]}<code>{f}</code></span><small>3 帧</small></div>)}</div>}</details></>}
    </main>;
}
