"""IRAF boxcar for lines and images, using its float32 accumulation order."""
import numpy as np


BOUNDARIES = {"nearest": "edge", "reflect": "reflect", "wrap": "wrap", "constant": "constant"}


def running_sum(lines, width):
    # Keep each add and subtract separate: regrouping changes IRAF floating-point results.
    count = lines.shape[0] - width + 1
    total = np.zeros(lines.shape[1], dtype=np.float32)
    for row in lines[:width - 1]:
        total += row
    result = np.empty((count, len(total)), dtype=np.float32)
    for i in range(count):
        total += lines[i + width - 1]
        result[i] = total
        total -= lines[i]
    return result


def boxcar(data, width, height, boundary="nearest", constant=0.0):
    if data.ndim == 1:
        return boxcar(data[None, :], width, 1, boundary, constant)[0]
    if data.ndim != 2 or not all(type(n) is int and 1 <= n <= 8192 for n in (width, height)):
        raise ValueError("窗口宽高须为 1 至 8192 的整数，输入须为二维图像。")
    if boundary not in BOUNDARIES or not np.isfinite(constant) or abs(constant) > np.finfo(np.float32).max:
        raise ValueError("边界方式或填充值无效。")
    if (data.shape[0] + height - 1) * (data.shape[1] + width - 1) > 32 * 1024**2:
        raise ValueError("该图像与窗口组合超出本机工作台的计算范围。")
    values = np.array(data, dtype=np.float32, copy=True)
    values[~np.isfinite(values)] = 0
    padding = [(n // 2, (n - 1) // 2) for n in (height, width)]
    options = {"constant_values": constant} if boundary == "constant" else {}
    padded = np.pad(values, padding, mode=BOUNDARIES[boundary], **options)
    columns = running_sum(padded, height)
    sums = running_sum(columns.T, width).T
    sums /= np.float32(width * height)
    # IRAF promotes unsigned bytes to short and unsigned 32-bit FITS to real.
    dtype = {("u", 1): np.int16, ("u", 4): np.float32}.get((data.dtype.kind, data.dtype.itemsize), data.dtype)
    return sums.astype(dtype)
