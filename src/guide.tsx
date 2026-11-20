import { DocumentBar } from "./window";

export function Guide() {
  return <main className="desk guide">
    <DocumentBar title="试用与安装"/>
    <section className="guide-start"><h2>模拟观测夜</h2><p>用内置曝光核对图像校正、恒星测光与光谱提取的结果。每条流程都可下载 FITS。</p>
      <a className="download" href="?view=ccd">打开 CCD 工作区 →</a>
    </section>
    <section id="install"><h2 className="guide-heading">从 GitHub 启动</h2>
      <p>克隆仓库，在项目目录运行启动文件。首次启动需联网准备 Python 和科学计算依赖，此后可离线使用。</p>
      <pre><code>git clone https://github.com/henry8019/IRAF-Revamped.git</code></pre>
      <ul><li>Windows：双击 <code>Start.cmd</code></li><li>macOS：双击 <code>Start.command</code></li><li>Linux：在仓库目录运行 <code>./Start.command</code></li></ul>
      <p>默认浏览器会打开本机工作台。用「打开 FITS」载入自己的二维图像，在检查器中展开「方框平滑」并调整参数，点击「应用并另存 FITS」保存结果。</p>
    </section>
  </main>;
}
