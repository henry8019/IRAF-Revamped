# 🔭 IRAF-Revamped

**English** · [简体中文](README.zh-CN.md)

IRAF-Revamped is our independent reimplementation of three workflows from **IRAF, the Image Reduction and Analysis Facility**. We build on the work of the IRAF developers and the community that maintains it today. Our reference for CCD reduction, photometry, and long-slit spectroscopy is the [IRAF Community Edition, v2.18.2](https://github.com/iraf-community/iraf/releases/tag/v2.18.2).

The workbench runs locally. Import an observation, set the parameters, inspect the result and export a new FITS file.

## 🚀 Clone and launch

For the current release, [download the workbench ZIP](https://github.com/henry8019/IRAF-Revamped/archive/refs/tags/v0.3.0.zip) and extract it before running the launcher below. The archive includes the built interface. [v0.3.0 release notes](CHANGELOG.md)

```sh
git clone https://github.com/henry8019/IRAF-Revamped.git
cd IRAF-Revamped
```

| Desktop | Start from the cloned folder |
| --- | --- |
| Windows | Double-click `Start.cmd` |
| macOS | Double-click `Start.command` |
| Linux (glibc) | Run `./Start.command` |

The first launch needs internet access to prepare Python 3.12 and the locked dependencies. The built web interface ships in the repository. Run the same launcher again for offline use. Your default browser opens the local workbench with an empty FITS viewer. Observation files are processed on your computer. Use the red window control and confirm **退出工作台** (Quit workbench) to stop the local service.

## Moving from IRAF CL to the workbench

In the original IRAF command language, you load a task package, edit parameters with `eparam`, and run the task. In `images → imfilter`, for example, `boxcar dev$pix m51_smooth.fits 3 3` smooths the sample image into a new file. In the workbench, open **方框平滑** (Boxcar) in the FITS viewer, choose a 3 × 3 window, enable live preview, and save a new FITS file. [IRAF command language](https://iraf.readthedocs.io/en/latest/tasks/language/intro.html) · [boxcar reference](https://iraf.readthedocs.io/en/latest/tasks/images/imfilter/boxcar.html)

Drag the title bar to move the window, or drag any edge or corner to resize it. Dragging the image pans the view and the wheel zooms it. Click the zoom percentage to fit the image again. With the title bar focused, arrow keys move the window and Shift + arrow keys resize it.

## Reduce an observation

Open a two-dimensional FITS image in the viewer or select an exposure directly on a workflow page. Use a primary image or a single tile-compressed image extension with an empty primary HDU.

- **CCD reduction** applies supplied master calibration frames of matching geometry. Bias is subtracted directly. A bias-corrected master dark is scaled by the science-to-dark exposure ratio. A corrected master flat is normalized by the median of its finite positive pixels. Invalid flat pixels produce NaN.
- **Aperture photometry** measures a single source at the FITS coordinates you enter or select in the preview. Set the circular radius and two sky-annulus radii. The exported table contains the pixel-center aperture sum after median sky subtraction, in input-image units.
- **Long-slit extraction** uses a straight aperture on a rectified 2-D exposure. Choose the dispersion axis and inclusive target and sky intervals. Download the resulting sky-subtracted 1-D FITS spectrum in detector pixels. Wavelength fitting and curved tracing are outside this version’s scope.

## Open a FITS image of your own

In the workbench, choose **FITS 查看器** (FITS viewer) → **打开 FITS** (Open FITS). Select a file whose primary HDU contains a two-dimensional image. To try boxcar smoothing, expand **方框平滑** (Boxcar) in the inspector, set the window width and height to 3 pixels and tick **实时预览** (Live preview). Drag the divider to inspect the effect on a star, then choose **应用并另存 FITS** (Apply and save as FITS) to write a new file.

## What we’ve checked

Browser tests exercised an imported M13 image for photometry and a Goodman PKSJ0049-5738 exposure for bias subtraction and pixel-space extraction. Numerical results were checked against independent sums and medians. CI checks startup on Windows, macOS and Linux.

## Contributing

See the [contributor guide](CONTRIBUTING.md) for setup, tests and pull requests. Use [Issues](https://github.com/henry8019/IRAF-Revamped/issues/new/choose) for reproducible bugs and ideas. [Community conduct](CODE_OF_CONDUCT.md) · [Private security reports](SECURITY.md) · [CI results](https://github.com/henry8019/IRAF-Revamped/actions/workflows/ci.yml)

[BSD 3-Clause license](LICENSE)

The dev$pix sample comes from IRAF. [IRAF copyright](licenses/iraf/COPYRIGHT) · [React, React DOM and Scheduler license](licenses/React-MIT.txt)
