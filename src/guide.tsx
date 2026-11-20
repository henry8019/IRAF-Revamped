import { type ReactNode } from "react";
import { Icon, workflows } from "./observations";
import "./guide.css";

const views = ["ccd","phot","spec"];
export function Shell({view,children}:{view:string;children:ReactNode}) {
  const link = (id:string, label:string, icon:string) => (
    <a key={id} aria-current={view===id?"page":undefined} href={"?view="+id}>
      <Icon name={icon}/>{label}
    </a>
  );
  return <div className="obs">
    <a className="skip" href="#workspace">跳到工作区</a>
    <header className="atlas-menu">
      <a className="wordmark" href="?view=image" aria-label="IRAF Revamped"><Icon name="scope"/><span>IRAF <em>Revamped</em></span></a>
      <nav className="atlas-nav" aria-label="工作台导航">
        <div className="menu-title">观测工作区</div>
        {link("image","FITS 图像查看器","image")}
        <div className="menu-title">模拟观测夜</div>
        {workflows.map((f,i)=>link(views[i],f.name,f.icon))}
      </nav>
      <div className="atlas-foot">{link("start","试用与安装","download")}<div className="session"><i/>{window.irafTrial?"离线样例":"本机会话"}</div></div>
    </header>
    <div id="workspace" tabIndex={-1}>{children}</div>
  </div>;
}
export function Guide() {
  return <main className="desk guide">
    <div className="obshead"><div><span className="discipline">Local workbench</span><h1>试用与安装</h1></div></div>
    <section className="guide-start"><h2>模拟观测夜</h2><p>用内置曝光核对图像校正、恒星测光与光谱提取的结果。每条流程都可下载 FITS。</p>
      <a className="download" href="?view=ccd">打开 CCD 工作区 →</a>
    </section>
    <section id="install"><h2 className="guide-heading">从 GitHub 启动</h2>
      <p>克隆仓库，在项目目录运行启动文件。首次启动需联网准备 Python 和科学计算依赖，此后可离线使用。</p>
      <pre><code>git clone https://github.com/henry8019/IRAF-Revamped.git</code></pre>
      <ul><li>Windows：双击 <code>Start.cmd</code></li><li>macOS：双击 <code>Start.command</code></li><li>Linux：在仓库目录运行 <code>./Start.command</code></li></ul>
      <p>默认浏览器会打开本机工作台。用「打开 FITS」载入自己的二维图像，在「显示设置」中调整平滑参数，点击「应用并另存 FITS」保存结果。</p>
    </section>
  </main>;
}
