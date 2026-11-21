import {useEffect, useRef, useState, type FormEvent} from "react";
import {DocumentBar} from "./window";
import {workflows} from "./navigation";

type Preview = {width:number;height:number;step:number;rows:number;cols:number;pixels:string};
type Result = {id:string;summary:string;image?:Preview;signal?:(number|null)[]};

function PreviewPlot({result,pick}:{result:Result;pick?:(x:number,y:number)=>void}) {
  const [cursor,setCursor]=useState("");
  const canvas=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const node=canvas.current;
    if(!node) return;
    const ctx=node.getContext("2d");
    if(!ctx) return;
    if(result.image){
      const {width,height,pixels}=result.image;
      node.width=width; node.height=height;
      const bytes=atob(pixels), image=ctx.createImageData(width,height);
      for(let i=0;i<bytes.length;i++){
        const v=bytes.charCodeAt(i);
        image.data.set([v,v,v,255],i*4);
      }
      ctx.putImageData(image,0,0);
    } else if(result.signal){
      const values=result.signal, finite=values.filter((v):v is number=>v!==null);
      const low=Math.min(...finite), high=Math.max(...finite);
      node.width=800;node.height=250;
      ctx.strokeStyle="#81dcd0";ctx.lineWidth=1.5;ctx.beginPath();
      let start=true;
      values.forEach((v,i)=>{
        if(v===null){start=true;return;}
        const x=4+792*i/Math.max(1,values.length-1), y=245-240*(v-low)/(high-low||1);
        if(start) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        start=false;
      });
      ctx.stroke();
    }
  },[result]);
  return <figure><canvas ref={canvas} onPointerMove={e=>{
    const im=result.image;
    if(!im)return;
    const rect=e.currentTarget.getBoundingClientRect();
    const x=1+im.step*Math.min(im.width-1,Math.floor((e.clientX-rect.left)*im.width/rect.width));
    const y=im.rows-im.step*Math.min(im.height-1,Math.floor((e.clientY-rect.top)*im.height/rect.height));
    setCursor(x+", "+y);
  }} onPointerLeave={()=>setCursor("")} onClick={()=>{if(pick&&cursor){const [x,y]=cursor.split(", ").map(Number);pick(x,y);}}} aria-label={result.image?"观测图像预览":"提取光谱"}/><figcaption>{result.summary}{cursor && " · X, Y = "+cursor}</figcaption></figure>;
}

export function Observations({kind,active,imported,headers}:{kind:string;active:boolean;imported:File|null;headers:Record<string,string>}) {
  const [file,setFile]=useState<File|null>(null);
  const [result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const source=file??imported;
  const title=workflows[["ccd","phot","spec"].indexOf(kind)].name;
  useEffect(()=>{setResult(null);setError("");},[source]);
  const fields=useRef<HTMLFormElement>(null);
  const [input,setInput]=useState<{file:File;result:Result}|null>(null);
  const shown=input?.file===source ? input.result : null;
  useEffect(()=>{
    if(!active||!source||shown)return;
    const stop=new AbortController(), body=new FormData();
    body.set("science",source);
    async function inspect(){
      try{
        const r=await fetch("/api/inspect",{method:"POST",headers,body,signal:stop.signal});
        if(!r.ok) throw Error((await r.json()).detail);
        const image:Preview=await r.json();
        if(!stop.signal.aborted) setInput({file:source!,result:{id:"",image,summary:image.cols+" × "+image.rows+" px · 输入曝光"}});
      }catch(err){if(!stop.signal.aborted)setError(String(err));}
    }
    void inspect();
    return ()=>stop.abort();
  },[source,active,shown,headers]);
  const seq=useRef(0);
  useEffect(()=>{seq.current++;setBusy(false);},[source]);
  async function run(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!source) return;
    const form=new FormData(e.currentTarget);
    form.set("science",source);
    const ticket=++seq.current;
    setBusy(true);setResult(null);setError("");
    try{
      const res=await fetch("/api/reduce/"+kind,{method:"POST",headers,body:form});
      if(!res.ok) throw Error((await res.json()).detail);
      const data=await res.json();
      if(seq.current===ticket) setResult(data);
    }catch(err){if(seq.current===ticket) setError(String(err));}
    finally{if(seq.current===ticket) setBusy(false);}
  }
  async function download(){
    if(!result||!source)return;
    try{
      const r=await fetch("/api/output/"+kind+"/"+result.id,{headers});
      if(!r.ok) throw Error((await r.json()).detail);
      const a=document.createElement("a"); a.href=URL.createObjectURL(await r.blob());
      a.download=source.name.replace(/\.(fits?|fts)$/i,"")+"-"+kind+".fits"; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),30000);
    }catch(err){setError(String(err));}
  }
  function field(name:string,label:string,value?:number,step="1"){
    return <label>{label}<input name={name} type="number" required min={step==="1"?1:0.000001} step={step} defaultValue={value}/></label>;
  }
  return <main className="reduce-view" hidden={!active}>
    {active&&<DocumentBar title={title}>{result&&<button className="toolbar-button" onClick={download}>下载结果 FITS</button>}</DocumentBar>}
    <h2>{title}</h2>
    <form ref={fields} onSubmit={run} onChange={()=>{setResult(null);setError("");}}>
      <fieldset disabled={busy}><legend>输入观测</legend>
        <label>科学曝光（二维 FITS）<input type="file" accept=".fits,.fit,.fts,.fz" onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
        {source&&<p>当前输入 · {source.name} {file&&imported&&<button type="button" onClick={()=>setFile(null)}>使用查看器图像</button>}</p>}
        {shown&&<details open><summary>查看输入图像{kind==="phot"?" · 点击选择星源":""}</summary><PreviewPlot result={shown} pick={kind==="phot"?(x,y)=>{
          if(!fields.current||busy)return;
          (fields.current.elements.namedItem("x") as HTMLInputElement).value=String(x);
          (fields.current.elements.namedItem("y") as HTMLInputElement).value=String(y);
          setResult(null);
        }:undefined}/></details>}
        {kind==="ccd"&&<><p>选择与科学曝光匹配的主校准帧，至少一项。主暗场须已扣偏置，按 EXPTIME 缩放。主平场须已校正，以有效正像素中位数归一化。</p>
        {["主偏置帧","主暗场","主平场"].map((label,i)=><label key={label}>{label}<input type="file" name={["bias","dark","flat"][i]} accept=".fits,.fit,.fts,.fz"/></label>)}</>}
        {kind==="phot"&&<><p>点击输入图像选择近似中心，或输入准确的 FITS 坐标（从 1 开始）。以像素中心判定圆孔径，用天空环中位数扣除背景。</p><div className="params">
          {field("x","中心 X",undefined,"any")}{field("y","中心 Y",undefined,"any")}{field("radius","孔径半径 / px",5,"any")}{field("inner","天空环内半径 / px",8,"any")}{field("outer","天空环外半径 / px",12,"any")}
        </div></>}
        {kind==="spec"&&<><p>适用于已拉直的二维长缝曝光。沿色散方向逐点累加目标区，减去相邻天空区的中位背景。输出坐标为探测器像素。</p>
          <label>色散方向<select name="axis"><option>X</option><option>Y</option></select></label>
          <div className="params">{field("first","目标起点")}{field("last","目标终点")}{field("skyfirst","天空起点")}{field("skylast","天空终点")}</div><p>X 色散填行号，Y 色散填列号。从 1 开始，包含两端。</p></>}
        <button className="toolbar-button" disabled={!source||busy}>{busy?"正在计算…":"运行"+title}</button>
      </fieldset>
    </form>
    {error&&<p role="alert">{error}</p>}
    {result&&<section aria-label="处理结果"><h3>{source?.name} · 结果</h3><PreviewPlot result={result}/></section>}
  </main>;
}
