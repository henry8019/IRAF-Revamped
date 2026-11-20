"""Exercise the desktop document window using the Python Playwright package and Edge."""
import os
from pathlib import Path
import subprocess
import tempfile
import time

from playwright.sync_api import expect, sync_playwright

root = Path(__file__).resolve().parents[1]
out = root / "build/previews"
out.mkdir(parents=True, exist_ok=True)
python = root / (".venv/Scripts/python.exe" if os.name == "nt" else ".venv/bin/python")
with tempfile.TemporaryDirectory() as tmp:
    ready = Path(tmp) / "ready"
    proc = subprocess.Popen([python, "workbench.py", "--no-browser", "--ready-file", ready], cwd=root)
    try:
        for _ in range(120):
            if ready.exists() and ready.stat().st_size:
                break
            time.sleep(.1)
        url = ready.read_text()
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge")
            page = browser.new_page(viewport={"width":1440,"height":900})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(url,wait_until="networkidle")
            expect(page.get_by_role("heading",name="dev$pix.fits")).to_be_visible()
            expect(page.get_by_role("heading",name="检查器")).to_be_visible()
            assert page.locator(".luma polygon").get_attribute("points").count(",") > 60
            sidebar = page.locator(".source-list").bounding_box()
            canvas = page.locator(".field").bounding_box()
            inspector = page.locator("#display-tools").bounding_box()
            assert sidebar["x"] + sidebar["width"] <= canvas["x"] + 1
            assert canvas["x"] + canvas["width"] <= inspector["x"] + 1
            assert abs(sidebar["y"] - inspector["y"]) < 2
            assert page.evaluate("document.documentElement.scrollHeight <= innerHeight + 1")
            page.screenshot(path=out/"mac-document.png")
            original = page.locator(".field canvas").bounding_box()
            page.get_by_role("button",name="放大",exact=True).click()
            assert page.locator(".field canvas").bounding_box()["width"] > original["width"]
            page.get_by_role("button",name="适应窗口").click()
            page.get_by_role("slider",name="黑点").fill("3")
            page.get_by_role("button",name="恢复自动范围").click()
            page.get_by_role("button",name="侧栏").click()
            expect(page.get_by_role("navigation")).to_be_hidden()
            page.get_by_role("button",name="侧栏").click()
            page.get_by_role("button",name="切换窗口大小").click()
            assert page.locator(".obs").bounding_box()["x"] == 0
            page.get_by_role("button",name="切换窗口大小").click()
            page.get_by_role("button",name="收起窗口").click()
            expect(page.locator("#workspace")).to_be_hidden()
            page.get_by_role("button",name="还原窗口",exact=True).last.click()
            expect(page.locator("#workspace")).to_be_visible()
            page.set_viewport_size({"width":1280,"height":720})
            page.locator("input[type=file]").set_input_files(root/"examples/observing-night/results/calibrated-field.fits")
            expect(page.get_by_role("heading",name="calibrated-field.fits")).to_be_visible()
            page.get_by_text("方框平滑",exact=True).click()
            page.get_by_label("实时预览").check()
            expect(page.get_by_role("slider",name="原图与结果分界线")).to_be_visible()
            with page.expect_download() as captured:
                page.get_by_role("button",name="应用并另存 FITS").click()
            assert captured.value.path().read_bytes().startswith(b"SIMPLE")
            page.get_by_role("link",name="CCD 预处理").click()
            split = page.get_by_role("slider",name="原图与校正图分界线")
            split.focus()
            split.press("ArrowRight")
            expect(split).to_have_value("51")
            page.get_by_role("link",name="孔径测光").click()
            page.get_by_role("button",name="选择星源 2").click()
            expect(page.get_by_role("button",name="源 2",exact=True)).to_have_attribute("aria-pressed","true")
            page.get_by_role("link",name="长缝光谱").click()
            page.get_by_role("slider").press("Home")
            expect(page.get_by_role("slider")).to_have_attribute("aria-valuenow","1")
            page.get_by_role("link",name="试用与安装").click()
            expect(page.get_by_role("heading",name="试用与安装")).to_be_visible()
            page.get_by_role("button",name="退出",exact=True).click()
            page.get_by_role("button",name="取消").click()
            expect(page.get_by_role("dialog")).to_be_hidden()
            page.get_by_role("button",name="退出",exact=True).click()
            page.get_by_role("button",name="退出工作台",exact=True).click()
            expect(page.get_by_role("heading",name="工作台已退出")).to_be_visible()
            proc.wait(timeout=15)
            assert not errors, errors
            browser.close()
    finally:
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=15)
print("PASS: desktop window, image inspector, stretch, smoothing, export and all three workflows")
