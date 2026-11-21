import unittest
from types import SimpleNamespace

import numpy as np
from astropy.io import fits

from reductions import aperture, calibrate, extract


def image(data, **header):
    return SimpleNamespace(data=np.array(data), header=fits.Header(header), filename="test.fits")


class ReductionTests(unittest.TestCase):
    def test_bias_dark_flat_and_bad_flat_pixel(self):
        science = image([[30,50,70]], EXPTIME=20.)
        masters = dict(bias=image([[2,2,2]]), dark=image([[4,4,4]], EXPTIME=10.),
                       flat=image([[2,4,0]]))
        result, _ = calibrate(science, masters)
        np.testing.assert_allclose(result.data, [[30,30,np.nan]])
        np.testing.assert_array_equal(science.data, [[30,50,70]])
        with self.assertRaises(ValueError):
            calibrate(science, {"bias": image([[1]])})

    def test_aperture_subtracts_constant_sky(self):
        data = np.full((31,31), 42.)
        data[15,15] += 1234
        params = dict(x=16,y=16,radius=3,inner=5,outer=7)
        table, _ = aperture(image(data), params)
        self.assertEqual(table.data["FLUX"][0], 1234)
        self.assertEqual(table.data["MSKY"][0], 42)
        with self.assertRaises(ValueError):
            aperture(image(data), {**params,"x":2})

    def test_spectrum_both_orientations(self):
        data=np.array([[5,6,7],[7,10,13],[8,12,16],[5,6,7]])
        for axis,values in (("X",data),("Y",data.T)):
            params=dict(axis=axis,first=2,last=3,skyfirst=1,skylast=1)
            spectrum,_=extract(image(values),params)
            np.testing.assert_array_equal(spectrum.data,[5,10,15])
            self.assertEqual(spectrum.header["CUNIT1"], "pix")
            with self.assertRaises(ValueError):
                extract(image(values),{**params,"skyfirst":2,"skylast":2})
