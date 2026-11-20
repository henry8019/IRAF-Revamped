import { useEffect, useRef, useState, type PointerEvent } from "react";

type Frame = {left:number; top:number; width:number; height:number};
export const edges = ["n","e","s","w","ne","se","sw","nw"] as const;
type Edge = typeof edges[number] | "move";
const key = "iraf.windowFrame";
const minWidth = 790, minHeight = 475;
const clamp = (n:number, lo:number, hi:number) => Math.max(lo,Math.min(hi,n));

function fitViewport(rect:Frame):Frame {
  const width=clamp(rect.width,minWidth,window.innerWidth);
  const height=clamp(rect.height,minHeight,window.innerHeight);
  return {width,height,left:clamp(rect.left,0,window.innerWidth-width),top:clamp(rect.top,0,window.innerHeight-height)};
}
function restore():Frame|null {
  try {
    const r=JSON.parse(sessionStorage.getItem(key)??"null");
    return r && [r.left,r.top,r.width,r.height].every(Number.isFinite) ? fitViewport(r) : null;
  } catch {return null;}
}
function change(r:Frame,edge:Edge,dx:number,dy:number):Frame {
  if(edge==="move") return fitViewport({width:r.width,height:r.height,left:r.left+dx,top:r.top+dy});
  const right=r.left+r.width, bottom=r.top+r.height;
  const left=edge.includes("w")?clamp(r.left+dx,0,right-minWidth):r.left;
  const top=edge.includes("n")?clamp(r.top+dy,0,bottom-minHeight):r.top;
  const width=edge.includes("e")?clamp(r.width+dx,minWidth,window.innerWidth-left):right-left;
  const height=edge.includes("s")?clamp(r.height+dy,minHeight,window.innerHeight-top):bottom-top;
  return {left,top,width,height};
}
export function useWindowFrame() {
  const element=useRef<HTMLDivElement>(null);
  const [frame,setFrame]=useState(restore);
  const gesture=useRef<{id:number;edge:Edge;x:number;y:number;start:Frame;last:Frame}|null>(null);
  useEffect(()=>{
    const resize=()=>setFrame(r=>r && fitViewport(r));
    window.addEventListener("resize",resize);
    return ()=>window.removeEventListener("resize",resize);
  },[]);
  function save(r:Frame){
    setFrame(r);
    try {sessionStorage.setItem(key,JSON.stringify(r));} catch { /* Storage can be disabled. */ }
  }
  function start(e:PointerEvent<HTMLElement>,edge:Edge) {
    if(e.button!==0 || !e.isPrimary || gesture.current || !element.current) return;
    if(edge==="move" && (e.target as Element).closest("button,a,input")) return;
    const {left,top,width,height}=element.current.getBoundingClientRect();
    const rect={left,top,width,height};
    gesture.current={id:e.pointerId,edge,x:e.clientX,y:e.clientY,start:rect,last:rect};
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function move(e:PointerEvent<HTMLElement>) {
    const g=gesture.current;
    if(!g || g.id!==e.pointerId) return;
    g.last=change(g.start,g.edge,e.clientX-g.x,e.clientY-g.y);
    setFrame(g.last);
  }
  function end(e:PointerEvent<HTMLElement>) {
    const g=gesture.current;
    if(!g || g.id!==e.pointerId) return;
    gesture.current=null;
    if(g.last!==g.start) save(g.last);
  }
  function nudge(edge:Edge,dx:number,dy:number) {
    if(element.current) save(change(element.current.getBoundingClientRect(),edge,dx,dy));
  }
  return {element,frame,start,nudge,events:{onPointerMove:move,onLostPointerCapture:end,onPointerUp:end,onPointerCancel:end}};
}
