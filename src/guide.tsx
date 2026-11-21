import { version } from "../package.json";
import { DocumentBar } from "./window";

export function Guide() {
  return <main className="desk guide">
    <DocumentBar title="使用与安装"/>
    <section><h2>第一次使用</h2>
      <p>先点「打开 FITS」选择自己的二维曝光。展开检查器中的「方框平滑」，将宽和高设为 3，勾选「实时预览」。拖动图像分界线比较星像，再点「应用并另存 FITS」保存新文件。</p>
      <p>拖标题栏移动窗口，拖任一边缘或角调整大小。拖星图平移视野，滚轮缩放。点击工具栏的百分比可重新适应窗口。用 Tab 聚焦标题栏后，方向键移动窗口，Shift 加方向键调整大小。</p>
    </section>
    <section><h2>用过原版 IRAF？</h2>
      <p>原版在 CL 命令行加载任务包，用 <code>eparam</code> 调参数，再运行任务。例如在 <code>imfilter</code> 中执行 <code>boxcar dev$pix m51_smooth.fits 3 3</code>，对应上面的 3 × 3 方框平滑。</p>
      <p>原版的 <code>ccdproc</code> 校准 CCD 图像、<code>phot</code> 做孔径测光、<code>apall</code> 提取一维光谱。新版直接读取所选曝光。CCD 页应用主校准帧，测光页按指定坐标和天空环测量净通量，光谱页从指定目标区扣除天空并沿空间方向求和。</p>
    </section>
    <section className="guide-start"><h2>处理观测文件</h2><p>选择科学曝光和参数后运行；切换流程可继续使用从查看器导入的文件。每条流程都可下载 FITS。</p>
      <a className="download" href="?view=ccd">打开 CCD 工作区 →</a>
    </section>
    <section id="install"><h2 className="guide-heading">从 GitHub 启动</h2>
      <p>当前工作台版本 <code>v{version}</code>。</p>
      <p>克隆仓库，在项目目录运行启动文件。首次启动需联网准备 Python 和科学计算依赖，此后可离线使用。</p>
      <pre><code>git clone https://github.com/henry8019/IRAF-Revamped.git</code></pre>
      <ul><li>Windows：双击 <code>Start.cmd</code></li><li>macOS：双击 <code>Start.command</code></li><li>Linux：在仓库目录运行 <code>./Start.command</code></li></ul>
      <p>默认浏览器会打开本机工作台。用「打开 FITS」载入自己的二维图像，在检查器中展开「方框平滑」并调整参数，点击「应用并另存 FITS」保存结果。</p>
    </section>
  </main>;
}
