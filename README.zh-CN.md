# 🔭 IRAF-Revamped

**简体中文** · [English](README.md)

IRAF-Revamped 是我们对 **IRAF（Image Reduction and Analysis Facility，图像归算与分析系统）** 中三条经典流程的独立重写：CCD 预处理、孔径测光和长缝光谱。感谢 IRAF 的原开发者，以及今天仍在维护它的社区。我们用 [IRAF 社区版 v2.18.2](https://github.com/iraf-community/iraf/releases/tag/v2.18.2) 作数值对照。

我们做了一个在本机计算、用浏览器查看结果的工作台。为了检验测光到底准不准，我们在一张模拟曝光里藏了两颗星。真实的夜空很少给你标准答案，这两颗星的亮度却是我们亲手设的。

## 🚀 从 GitHub 一键启动

想直接试用发行版，可以[下载 v0.2.0 工作台 ZIP](https://github.com/henry8019/IRAF-Revamped/archive/refs/tags/v0.2.0.zip)，完整解压后运行下表中的启动文件。包内已含编译好的网页。也可以用下面的命令克隆仓库。[版本更新记录](CHANGELOG.md)

```sh
git clone https://github.com/henry8019/IRAF-Revamped.git
cd IRAF-Revamped
```

| 桌面系统 | 在克隆目录中启动 |
| --- | --- |
| Windows | 双击 `Start.cmd` |
| macOS | 双击 `Start.command` |
| Linux（glibc） | 运行 `./Start.command` |

首次启动需联网准备 Python 3.12 和锁定版本的依赖。仓库已包含编译好的网页。以后运行同一启动文件即可离线使用。默认浏览器会打开本机工作台，首屏是 IRAF 自带的 M51 星系图。观测文件在本机处理。点击窗口左上角红色按钮，再确认「退出工作台」，即可关闭本机服务。

## 从原版 IRAF 到本机工作台

原版用户在 CL 命令行加载任务包，用 `eparam` 调参数，再运行任务。例如在 `images → imfilter` 中输入 `boxcar dev$pix m51_smooth.fits 3 3`，就会将样图按 3 × 3 像素平滑并输出一个新文件。新版对应的操作是「FITS 查看器 → 方框平滑 → 实时预览 → 应用并另存 FITS」。[IRAF 命令语言](https://iraf.readthedocs.io/en/latest/tasks/language/intro.html) · [boxcar 手册](https://iraf.readthedocs.io/en/latest/tasks/images/imfilter/boxcar.html)

拖标题栏移动工作台，拖四边或四角调整窗口大小。拖星图可平移视野，滚轮可缩放图像，点击工具栏的倍率可恢复适应窗口。用 Tab 聚焦标题栏后，也可以用方向键移动窗口，用 Shift 加方向键调整大小。

## 🧭 跟着一次模拟观测试用

从左侧导航选择三条流程，查看模拟观测夜已生成的产物。

1. **看看校准改变了什么。** 点击「CCD 预处理」，拖动图像上的分界线。这张 30 秒曝光用了偏置、暗场和平场各 3 张做校准。两侧使用相同的灰阶拉伸，可以直接对照同一颗星和周围的背景。
2. **找回那两颗星。** 打开「孔径测光」，在星表里点选一个源编号。图上对应的恒星会被圈出来。你可以对着图读出它的质心坐标、周围的天空背景、测得的通量和星等误差。
3. **沿着一条谱线走。** 打开「长缝光谱」。二维曝光里那条略弯的亮带，就是我们追踪并提取的光谱。我们用 7 条灯谱线标定波长。在一维谱上移动鼠标，或聚焦图表后按左右方向键，就能逐点读数。我们把一条线放在 5030 Å，最终测得的线心是 **5030.004 Å**。

在任一流程页点击「下载 FITS」，就能保存该页对应的校正图像、测光星表或一维光谱。

### ✨ 两颗星找回来了吗？

| 恒星 | 放进去的计数（ADU） | 量回来的计数（ADU） |
| --- | ---: | ---: |
| 亮的那颗 | 18,000 | 17,998.90 |
| 暗的邻星 | 7,000 | 6,999.58 |

## 打开你自己的 FITS 图像

在左侧导航打开「FITS 查看器」，点击「打开 FITS」，选择一个主 HDU（主数据单元）中存有二维图像的文件。想试试方框平滑，可以在右侧检查器中展开「方框平滑」，把窗口宽、高都设为 3 像素，勾选「实时预览」，再拖动分界线看看星像边缘的变化。满意后点击「应用并另存 FITS」，结果会写入新文件。

查看器可以打开并平滑你自己的二维 FITS 图像。CCD 预处理、测光和光谱三个流程页展示的是内置模拟观测夜预先计算好的结果。

## 我们验证到了哪一步

我们已在 Windows 和 WSL 下的 Ubuntu 24.04 上跑通这次模拟观测，并重新打开输出的 FITS 文件核对数值。CI 在 Windows、macOS 和 Linux 上检查首次启动和离线重启，并在 Linux 的 Chromium 中测试界面交互。真实观测夜数据的科学验收和 macOS 桌面人工试用仍待完成。

## 参与开发

开发环境、测试命令和提交方式见[中文贡献指南](CONTRIBUTING.zh-CN.md)。复现了故障或有改进想法，可以[创建 Issue](https://github.com/henry8019/IRAF-Revamped/issues/new/choose)。[社区行为准则](CODE_OF_CONDUCT.md) · [私下报告安全问题](SECURITY.md) · [自动检查记录](https://github.com/henry8019/IRAF-Revamped/actions/workflows/ci.yml)

[BSD 3-Clause 开源许可证](LICENSE)

dev$pix 样图来自 IRAF。[IRAF 版权声明](licenses/iraf/COPYRIGHT) · [React、React DOM 和 Scheduler 许可证](licenses/React-MIT.txt)
