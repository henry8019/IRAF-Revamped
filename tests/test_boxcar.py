"""Reference values for the smoothing operation available in the desktop viewer."""
import unittest

import numpy as np

from boxcar import boxcar


class BoxcarTest(unittest.TestCase):
    def test_three_pixel_window_at_image_boundaries(self):
        image = np.array([[1, 4, 7]], dtype=np.float32)
        for mode, expected in [
            ("nearest", [2, 4, 6]),
            ("constant", [5/3, 4, 11/3]),
            ("reflect", [3, 4, 5]),
            ("wrap", [4, 4, 4]),
        ]:
            with self.subTest(boundary=mode):
                result = boxcar(image, 3, 1, mode)
                np.testing.assert_allclose(result, [expected], rtol=1e-6)
                self.assertEqual(result.dtype, image.dtype)
        np.testing.assert_array_equal(image, [[1, 4, 7]])
