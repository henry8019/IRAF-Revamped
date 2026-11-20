import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, workflows } from "./navigation";

const ToolbarHost = createContext<HTMLDivElement|null>(null);

export function DocumentBar({title, children}:{title:string;children?:ReactNode}) {
  const host=useContext(ToolbarHost);
  return host && createPortal(<>
    <div className="document-name"><Icon name="document"/><div><h1 title={title}>{title}</h1><small>IRAF Revamped</small></div></div>
    <div className="document-actions">{children}</div>
  </>,host);
}

export function Shell({view,headers,children}:{view:string;headers:Record<string,string>;children:ReactNode}) {
  const [host,setHost]=useState<HTMLDivElement|null>(null);
  const [sidebar,setSidebar]=useState(true);
  const [minimized,setMinimized]=useState(false);
  const [maximized,setMaximized]=useState(false);
  const [closed,setClosed]=useState(false);
  const [message,setMessage]=useState("");
  const confirm=useRef<HTMLDialogElement>(null);
  async function quit() {
    try {
      if(!window.irafTrial) {
        const response=await fetch("/api/exit",{method:"POST",headers});
        if(!response.ok) throw Error();
        sessionStorage.removeItem("session");
      }
      setClosed(true);
    } catch {setMessage("退出未完成，请检查本机服务。");}
  }
  function link(id:string,label:string,icon:string) {
    return <a key={id} href={"?view="+id} aria-current={view===id?"page":undefined}><Icon name={icon}/>{label}</a>;
  }
  if(closed) return <main className="closed-window"><h1>工作台已退出</h1><p>可以关闭此标签页。</p></main>;
  return <div className={["obs",maximized?"maximized":"",minimized?"minimized":"",sidebar?"":"without-sidebar"].join(" ")}>
    <a className="skip" href="#workspace">跳到工作区</a>
    <header className="windowbar" onDoubleClick={e=>{if(!(e.target as Element).closest("button"))setMaximized(!maximized);}}>
      <div className="window-tools"><div className="lights">
        <button className="close-light" title="退出工作台" aria-label="退出" onClick={()=>confirm.current?.showModal()}><span>×</span></button>
        <button className="mini-light" title={minimized?"还原窗口":"收起窗口"} aria-label={minimized?"还原窗口":"收起窗口"} onClick={()=>setMinimized(!minimized)}><span>−</span></button>
        <button className="zoom-light" title="切换窗口大小" aria-label="切换窗口大小" aria-pressed={maximized} onClick={()=>{setMinimized(false);setMaximized(!maximized);}}><span>↗</span></button>
      </div><button className="toolbar-button" aria-label="侧栏" title="显示或隐藏侧栏" aria-expanded={sidebar} disabled={minimized} onClick={()=>setSidebar(!sidebar)}><Icon name="sidebar"/></button></div>
      <div className="title-slot" ref={setHost}/>
      {minimized&&<button className="restore" onClick={()=>setMinimized(false)}>还原窗口</button>}
    </header>
    <div className="source-list" hidden={!sidebar||minimized}>
      <nav aria-label="工作台导航"><p>工作区</p>{link("image","FITS 查看器","image")}<p>模拟观测夜</p>
      {workflows.map((f,i)=>link(["ccd","phot","spec"][i],f.name,f.icon))}</nav>
      <div className="source-bottom">{link("start","试用与安装","download")}</div>
    </div>
    <div id="workspace" hidden={minimized} tabIndex={-1}><ToolbarHost.Provider value={host}>{children}</ToolbarHost.Provider></div>
    <dialog ref={confirm}><h2>退出工作台？</h2><p>退出将结束当前会话，已保存的 FITS 文件仍在电脑上。</p>
      {message&&<p role="alert">{message}</p>}<div><button autoFocus onClick={()=>confirm.current?.close()}>取消</button><button onClick={quit}>退出工作台</button></div></dialog>
  </div>;
}
