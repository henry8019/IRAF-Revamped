# 🔭 IRAF-Revamped

We hid two stars in a FITS image. We knew exactly how bright they were, which is a luxury the night sky rarely offers.

IRAF-Revamped is a local astronomy workbench for CCD reduction, photometry, and long-slit spectroscopy. The interface opens in your browser, and the calculations run on your computer. We use IRAF v2.18.2 to check our independent implementation.

## 🌓 A 30-second exposure needs nine calibration frames

At least, ours does. Our simulated observing night uses three bias frames, three darks, and three flats. Drag the divider across the science image to see what calibration changed. Both halves use the same grayscale stretch so your eye can make a fair comparison.

## ✨ Did we get our stars back?

| Star | Counts we put in | Counts we measured |
| --- | ---: | ---: |
| Brighter star | 18,000 | 17,998.90 |
| Fainter neighbor | 7,000 | 6,999.58 |

The workbench found both stars in the corrected image. Pick either row in the catalog to see where its centroid landed, how bright it was, and how much of the light in the aperture came from the sky.

## 🌈 Where did 5030 Å land?

A spectrum starts out looking like a slightly crooked stripe across the detector. The workbench follows the bend, subtracts the background on either side, and uses seven lines from a calibration lamp to put wavelengths on the horizontal axis. We planted a line at 5030 Å. Open the resulting FITS spectrum and its center comes back at **5030.004 Å**.

## Can I try it?

The local development build runs this simulated night end to end on Windows and on Ubuntu 24.04 under WSL. We're preparing the source and installers for their first public release. Real observing-night data and a run on macOS are still on the to-do list.

[BSD 3-Clause license](LICENSE)
