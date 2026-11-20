# Changelog · 更新记录

## v0.2.0 · 2026-11-21

First public release of IRAF-Revamped, an independent workbench inspired by IRAF Community Edition 2.18.2.

- Open your own two-dimensional primary-HDU FITS image, inspect its pixels, preview boxcar smoothing and export a new FITS file.
- Explore precomputed CCD reduction, aperture photometry and long-slit spectroscopy from the bundled simulated night. These three pages accept the bundled observations only.
- Move and resize the dark desktop window. Switch workflows while keeping the viewer state. Controls respect the system’s reduced-motion setting.
- Download and extract the release archive. Run `Start.cmd` on Windows or `./Start.command` on macOS and glibc Linux. The first launch needs internet access to prepare Python and its dependencies. Subsequent launches can run offline.

这是 IRAF-Revamped 的首个公开发行版。工作台独立运行，以 IRAF 社区版 2.18.2 为对照。

- FITS 查看器支持打开主 HDU 为二维图像的自有文件，可查看像素、预览方框平滑并另存 FITS。
- CCD 预处理、孔径测光、长缝光谱三个页面供浏览内置模拟观测夜的预计算结果。自有观测夜的三流程处理仍待接入。
- 暗色桌面窗口支持拖动和缩放，切换流程时保留查看器状态，控件动效遵循系统的“减少动态效果”设置。
- 下载并完整解压发行包后，Windows 运行 `Start.cmd`，macOS 和使用 glibc 的 Linux 运行 `./Start.command`。首次启动需联网准备 Python 和依赖，之后可离线启动。
