"""Start a cloned workbench through the user entry point and check its HTTP session."""
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
import re
import subprocess
import time
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1]
launcher = ["cmd", "/c", "Start.cmd"] if os.name == "nt" else ["./Start.command"]
with TemporaryDirectory() as tmp:
    ready = Path(tmp) / "ready"
    proc = subprocess.Popen([*launcher, "--no-browser", "--ready-file", str(ready)], cwd=root)
    try:
        for _ in range(6000):
            if ready.exists() and ready.stat().st_size:
                break
            if proc.poll() is not None:
                raise RuntimeError(f"Launcher exited with {proc.returncode}")
            time.sleep(0.1)
        origin, token = ready.read_text().split("/#")
        def request(path, method="GET"):
            req = Request(origin + path, method=method, headers={"Authorization": "Bearer " + token})
            with urlopen(req, timeout=15) as response:
                return response.read()
        html = request("/").decode()
        assets = re.findall(r'(?:src|href)="(/assets/[^"]+)"', html)
        assert any(asset.endswith(".js") for asset in assets)
        assert any(asset.endswith(".css") for asset in assets)
        for asset in assets:
            assert len(request(asset)) > 100
        assert len(request("/api/current")) == 512 * 512 * 8
        assert len(json.loads(request("/api/observations"))["stars"]) == 2
        assert request("/api/observations/calibrated-spectrum.fits").startswith(b"SIMPLE")
    finally:
        if ready.exists() and ready.stat().st_size:
            request("/api/exit", "POST")
        if proc.poll() is None:
            proc.wait(timeout=20)
    assert proc.returncode == 0
print("PASS: launcher, local browser assets, M51 image, star catalog, FITS export and exit")
