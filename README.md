# 🔭 IRAF-Revamped

**English** · [简体中文](README.zh-CN.md)

IRAF-Revamped is our independent reimplementation of three workflows from **IRAF, the Image Reduction and Analysis Facility**. We build on the work of the IRAF developers and the community that maintains it today. Our reference for CCD reduction, photometry, and long-slit spectroscopy is the [IRAF Community Edition, v2.18.2](https://github.com/iraf-community/iraf/releases/tag/v2.18.2).

Our contribution is a workbench that runs the calculations on your computer and opens the results in your browser. We use the original IRAF to check our results. One of our favorite checks is to hide two stars in a simulated exposure and see how much of their light we get back.

## 🧭 A first observing night

**Availability.** These instructions are for the current preview build. The source and installers are still pending their first public release. [GitHub Releases](https://github.com/henry8019/IRAF-Revamped/releases)

If you have the preview bundle, open `Start-IRAF.html` in your browser to explore the sample offline. If you have the installed app, launch **IRAF Workbench** and it will open a local browser session. Both start on **试用与安装** (Try & install). The sample contains the outputs of a completed reduction, so you can go straight to the data.

1. **Compare the CCD frames.** Choose **从 CCD 预处理开始** (Start with CCD reduction). Drag the divider across the 30-second exposure to see what changed after calibration with three bias frames, three darks, and three flats. Both halves use the same grayscale stretch.
2. **Find our two stars.** Open **孔径测光** (Aperture photometry) and select a source in the catalog. Its circle lights up on the image. Read its centroid and sky background alongside the measured flux and magnitude error.
3. **Follow a spectral line.** Open **长缝光谱** (Long-slit spectroscopy). The curved stripe in the two-dimensional exposure is the trace we extracted. Seven lamp lines set the wavelength scale. Move the pointer along the one-dimensional spectrum, or focus the plot and use the arrow keys. The line we put at 5030 Å comes back at **5030.004 Å**.

Choose **下载 FITS** (Download FITS) on any of those pages to save the corresponding calibrated image, star catalog, or spectrum.

### ✨ Did we get our stars back?

| Star | Counts we put in | Counts we measured |
| --- | ---: | ---: |
| Brighter star | 18,000 | 17,998.90 |
| Fainter neighbor | 7,000 | 6,999.58 |

## Open a FITS image of your own

In the installed workbench, choose **FITS 图像查看器** (FITS viewer) → **打开 FITS** (Open FITS). Select a file whose primary HDU contains a two-dimensional image. To try boxcar smoothing, set the window width and height to 3 pixels and tick **实时预览** (Live preview). Drag the divider to inspect the effect on a star, then choose **应用并另存 FITS** (Apply and save as FITS) to write a new file.

The viewer accepts your own images. The three workflow pages use the bundled observing night. In the development build we process custom observing nights through scripts.

## What we’ve checked

We’ve run the simulated night end to end on Windows and on Ubuntu 24.04 under WSL, reopening the FITS products to check their values. Testing with real observing-night data and running the workbench on macOS are still ahead.

[BSD 3-Clause license](LICENSE)
