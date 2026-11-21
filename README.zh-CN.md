# 🔭 IRAF-Revamped

**简体中文** · [English](README.md)

IRAF-Revamped 是我们对 **IRAF（Image Reduction and Analysis Facility，图像归算与分析系统）** 中三条经典流程的独立重写：CCD 预处理、孔径测光和长缝光谱。感谢 IRAF 的原开发者，以及今天仍在维护它的社区。我们用 [IRAF 社区版 v2.18.2](https://github.com/iraf-community/iraf/releases/tag/v2.18.2) 作数值对照。

工作台在本机运行。导入观测曝光，设置参数，检查计算结果，再另存为新的 FITS 文件。

## 🚀 从 GitHub 一键启动

想直接试用发行版，可以[下载 v0.3.0 工作台 ZIP](https://github.com/henry8019/IRAF-Revamped/archive/refs/tags/v0.3.0.zip)，完整解压后运行下表中的启动文件。包内已含编译好的网页。也可以用下面的命令克隆仓库。[版本更新记录](CHANGELOG.md)

```sh
git clone https://github.com/henry8019/IRAF-Revamped.git
cd IRAF-Revamped
```

| 桌面系统 | 在克隆目录中启动 |
| --- | --- |
| Windows | 双击 `Start.cmd` |
| macOS | 双击 `Start.command` |
| Linux（glibc） | 运行 `./Start.command` |

首次启动需联网准备 Python 3.12 和锁定版本的依赖。仓库已包含编译好的网页。以后运行同一启动文件即可离线使用。默认浏览器会打开本机工作台，首屏可导入自己的 FITS 图像。观测文件在本机处理。点击窗口左上角红色按钮，再确认「退出工作台」，即可关闭本机服务。

## 从原版 IRAF 到本机工作台

原版用户在 CL 命令行加载任务包，用 `eparam` 调参数，再运行任务。例如在 `images → imfilter` 中输入 `boxcar dev$pix m51_smooth.fits 3 3`，就会将样图按 3 × 3 像素平滑并输出一个新文件。新版对应的操作是「FITS 查看器 → 方框平滑 → 实时预览 → 应用并另存 FITS」。[IRAF 命令语言](https://iraf.readthedocs.io/en/latest/tasks/language/intro.html) · [boxcar 手册](https://iraf.readthedocs.io/en/latest/tasks/images/imfilter/boxcar.html)

拖标题栏移动工作台，拖四边或四角调整窗口大小。拖星图可平移视野，滚轮可缩放图像，点击工具栏的倍率可恢复适应窗口。用 Tab 聚焦标题栏后，也可以用方向键移动窗口，用 Shift 加方向键调整大小。

## 处理自己的观测文件

从查看器导入二维 FITS，或在流程页直接选曝光。支持二维主 HDU，以及主 HDU 为空且只有一个压缩图像扩展的 FITS。

- **CCD 预处理**：提供尺寸匹配的主校准帧，至少一项。主偏置直接扣除，已扣偏置的主暗场按曝光时间缩放，已校正的主平场按正有效像素中位数归一化。无效平场像素输出 NaN。
- **孔径测光**：点击输入预览或填入 FITS 坐标，设置孔径和天空环半径。按像素中心选取圆孔径，扣除天空环中位背景，导出指定源的净通量表。单位沿用输入文件。
- **长缝光谱**：选择已拉直的二维曝光，指定色散轴、目标区和天空区。逐点扣背景、沿空间方向求和，导出以探测器像素为横轴的一维 FITS。弯曲谱迹追踪和波长拟合尚未接入。

## 打开你自己的 FITS 图像

在左侧导航打开「FITS 查看器」，点击「打开 FITS」，选择一个主 HDU（主数据单元）中存有二维图像的文件。想试试方框平滑，可以在右侧检查器中展开「方框平滑」，把窗口宽、高都设为 3 像素，勾选「实时预览」，再拖动分界线看看星像边缘的变化。满意后点击「应用并另存 FITS」，结果会写入新文件。

## 我们验证到了哪一步

已通过浏览器导入 M13 图像做孔径测光，并用 PKSJ0049-5738 的狭缝曝光做扣偏置和像素域提取。导出结果已用独立求和及中位数计算复核。CI 检查 Windows、macOS 和 Linux 启动。

## 参与开发

开发环境、测试命令和提交方式见[中文贡献指南](CONTRIBUTING.zh-CN.md)。复现了故障或有改进想法，可以[创建 Issue](https://github.com/henry8019/IRAF-Revamped/issues/new/choose)。[社区行为准则](CODE_OF_CONDUCT.md) · [私下报告安全问题](SECURITY.md) · [自动检查记录](https://github.com/henry8019/IRAF-Revamped/actions/workflows/ci.yml)

[BSD 3-Clause 开源许可证](LICENSE)

dev$pix 样图来自 IRAF。[IRAF 版权声明](licenses/iraf/COPYRIGHT) · [React、React DOM 和 Scheduler 许可证](licenses/React-MIT.txt)
