# 🔭 IRAF-Revamped

**English** · [简体中文](README.zh-CN.md)

IRAF-Revamped is our independent reimplementation of three workflows from **IRAF, the Image Reduction and Analysis Facility**. We build on the work of the IRAF developers and the community that maintains it today. Our reference for CCD reduction, photometry, and long-slit spectroscopy is the [IRAF Community Edition, v2.18.2](https://github.com/iraf-community/iraf/releases/tag/v2.18.2).

Our contribution is a workbench that runs the calculations on your computer and opens the results in your browser. We use the original IRAF to check our results. One of our favorite checks is to hide two stars in a simulated exposure and see how much of their light we get back.

## 🚀 Clone and launch

For the current release, [download the workbench ZIP](https://github.com/henry8019/IRAF-Revamped/archive/refs/tags/v0.2.0.zip) and extract it before running the launcher below. The archive includes the built interface. [v0.2.0 release notes](CHANGELOG.md)

```sh
git clone https://github.com/henry8019/IRAF-Revamped.git
cd IRAF-Revamped
```

| Desktop | Start from the cloned folder |
| --- | --- |
| Windows | Double-click `Start.cmd` |
| macOS | Double-click `Start.command` |
| Linux (glibc) | Run `./Start.command` |

The first launch needs internet access to prepare Python 3.12 and the locked dependencies. The built web interface ships in the repository. Run the same launcher again for offline use. Your default browser opens the local workbench on IRAF’s M51 image. Observation files are processed on your computer. Use the red window control and confirm **退出工作台** (Quit workbench) to stop the local service.

## Moving from IRAF CL to the workbench

In the original IRAF command language, you load a task package, edit parameters with `eparam`, and run the task. In `images → imfilter`, for example, `boxcar dev$pix m51_smooth.fits 3 3` smooths the sample image into a new file. In the workbench, open **方框平滑** (Boxcar) in the FITS viewer, choose a 3 × 3 window, enable live preview, and save a new FITS file. [IRAF command language](https://iraf.readthedocs.io/en/latest/tasks/language/intro.html) · [boxcar reference](https://iraf.readthedocs.io/en/latest/tasks/images/imfilter/boxcar.html)

Drag the title bar to move the window, or drag any edge or corner to resize it. Dragging the image pans the view and the wheel zooms it. Click the zoom percentage to fit the image again. With the title bar focused, arrow keys move the window and Shift + arrow keys resize it.

## 🧭 A first observing night

Choose a workflow in the left sidebar to inspect the outputs of the bundled simulated night.

1. **Compare the CCD frames.** Choose **CCD 预处理** (Start with CCD reduction). Drag the divider across the 30-second exposure to see what changed after calibration with three bias frames, three darks, and three flats. Both halves use the same grayscale stretch.
2. **Find our two stars.** Open **孔径测光** (Aperture photometry) and select a source in the catalog. Its circle lights up on the image. Read its centroid and sky background alongside the measured flux and magnitude error.
3. **Follow a spectral line.** Open **长缝光谱** (Long-slit spectroscopy). The curved stripe in the two-dimensional exposure is the trace we extracted. Seven lamp lines set the wavelength scale. Move the pointer along the one-dimensional spectrum, or focus the plot and use the arrow keys. The line we put at 5030 Å comes back at **5030.004 Å**.

Choose **下载 FITS** (Download FITS) on any of those pages to save the corresponding calibrated image, star catalog, or spectrum.

### ✨ Did we get our stars back?

| Star | Counts we put in | Counts we measured |
| --- | ---: | ---: |
| Brighter star | 18,000 | 17,998.90 |
| Fainter neighbor | 7,000 | 6,999.58 |

## Open a FITS image of your own

In the workbench, choose **FITS 查看器** (FITS viewer) → **打开 FITS** (Open FITS). Select a file whose primary HDU contains a two-dimensional image. To try boxcar smoothing, expand **方框平滑** (Boxcar) in the inspector, set the window width and height to 3 pixels and tick **实时预览** (Live preview). Drag the divider to inspect the effect on a star, then choose **应用并另存 FITS** (Apply and save as FITS) to write a new file.

The viewer opens and smooths your own two-dimensional FITS images. The CCD, photometry and spectroscopy pages display precomputed products from the bundled simulated night.

## What we’ve checked

We’ve run the simulated night end to end on Windows and on Ubuntu 24.04 under WSL, reopening the FITS products to check their values. CI exercises first launch and offline relaunch on Windows, macOS and Linux. It also tests the desktop interface in Chromium on Linux. Validation with real observing-night data and a manual macOS desktop session are still ahead.

## Contributing

See the [contributor guide](CONTRIBUTING.md) for setup, tests and pull requests. Use [Issues](https://github.com/henry8019/IRAF-Revamped/issues/new/choose) for reproducible bugs and ideas. [Community conduct](CODE_OF_CONDUCT.md) · [Private security reports](SECURITY.md) · [CI results](https://github.com/henry8019/IRAF-Revamped/actions/workflows/ci.yml)

[BSD 3-Clause license](LICENSE)

The dev$pix sample comes from IRAF. [IRAF copyright](licenses/iraf/COPYRIGHT) · [React, React DOM and Scheduler license](licenses/React-MIT.txt)
