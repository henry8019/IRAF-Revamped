# IRAF-Revamped

How close can you get to 18,000 counts? We put a star that bright into a simulated exposure, gave the image a bias, a dark current, and an uneven detector response, then handed the raw frames to the workbench. Aperture photometry measured **17,998.90 counts**.

IRAF-Revamped is an independent reimplementation of three classic IRAF workflows. It runs on your computer and opens in your browser. We use IRAF v2.18.2 as a reference when checking results.

## A night at the detector

- **CCD reduction.** Three bias frames, three darks, and three flats go into calibrating one 30-second exposure. The image viewer lets you slide between the raw and corrected frames using the same grayscale stretch.
- **Photometry.** Follow the brighter star from the corrected image into the catalog. Selecting its row shows where the centroid landed and how much sky was subtracted. Its fainter neighbor comes in at 6,999.58 counts against an injected 7,000.
- **Long-slit spectroscopy.** Start with a curved trace on a two-dimensional exposure. Extract the spectrum, then use seven lamp lines to calibrate its wavelength axis. A line placed at 5030 Å turns up at **5030.004 Å** in the output FITS file.

## Project status

These examples run end to end in the local development build on Windows and Ubuntu 24.04 under WSL. The public repository currently contains this overview and the [BSD 3-Clause license](LICENSE). Source code and installers are pending publication. Validation on real observing-night data and macOS is still ahead.
