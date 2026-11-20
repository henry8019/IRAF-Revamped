"""Exercise the desktop document window using Playwright and Chromium."""
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
            browser = p.chromium.launch(channel=os.environ.get("IRAF_BROWSER_CHANNEL"))
            page = browser.new_page(viewport={"width":1440,"height":900})
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            requests = []
            page.on("request", lambda req: requests.append((req.resource_type,req.url.split("?",1)[0])))
            page.goto(url,wait_until="networkidle")
            expect(page.get_by_role("heading",name="dev$pix.fits")).to_be_visible()
            expect(page.get_by_role("heading",name="检查器")).to_be_visible()
            expect(page.locator(".obs")).to_have_css("color-scheme", "dark")
            page.emulate_media(reduced_motion="reduce")
            expect(page.locator("#display-tools details[open] dl")).to_have_css("animation-name", "none")
            expect(page.locator(".source-list a").first).to_have_css("transition-duration", "0s")
            page.emulate_media(reduced_motion="no-preference")
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
            def drag(locator, dx, dy):
                box = locator.bounding_box()
                x, y = box["x"] + box["width"]/2, box["y"] + box["height"]/2
                page.mouse.move(x,y)
                page.mouse.down()
                page.mouse.move(x+dx,y+dy,steps=5)
                page.mouse.up()

            window = page.locator(".obs")
            original_window = window.bounding_box()
            zoom = page.get_by_role("button",name="适应窗口")
            manual_zoom = zoom.inner_text()
            drag(page.locator('[data-edge="se"]'), -150, -110)
            resized = window.bounding_box()
            assert abs(original_window["width"] - resized["width"] - 150) <= 1
            assert abs(original_window["height"] - resized["height"] - 110) <= 1
            expect(zoom).to_have_text(manual_zoom)
            drag(page.get_by_role("heading",name="dev$pix.fits"), 85, 65)
            moved = window.bounding_box()
            assert abs(moved["x"] - resized["x"] - 85) <= 1, (moved,resized)
            assert abs(moved["y"] - resized["y"] - 65) <= 1
            drag(page.locator(".field"),12,10)
            assert window.bounding_box() == moved
            drag(page.locator('[data-edge="nw"]'),10,15)
            positioned = window.bounding_box()
            assert abs(positioned["width"] + 10 - moved["width"]) <= 1
            assert abs(positioned["x"] - moved["x"] - 10) <= 1
            titlebar = page.locator(".windowbar")
            titlebar.focus()
            titlebar.press("ArrowRight")
            assert abs(window.bounding_box()["x"] - positioned["x"] - 12) <= 1
            titlebar.press("Shift+ArrowLeft")
            assert abs(positioned["width"] - window.bounding_box()["width"] - 12) <= 1
            positioned = window.bounding_box()
            page.locator(".document-name").dblclick()
            assert window.bounding_box()["x"] == 0
            page.locator(".document-name").dblclick()
            assert window.bounding_box() == positioned
            page.get_by_role("link",name="CCD 预处理").click()
            assert window.bounding_box() == positioned
            page.get_by_role("link",name="FITS 查看器").click()
            expect(page.get_by_role("heading",name="dev$pix.fits")).to_be_visible()
            assert sum(kind=="document" for kind,_ in requests) == 1, "Switching views reloaded the desktop"
            expect(zoom).to_have_text(manual_zoom)
            page.get_by_role("button",name="适应窗口").click()
            page.get_by_role("slider",name="黑点").fill("3")
            page.get_by_role("button",name="恢复自动范围").click()
            page.get_by_role("button",name="侧栏").click()
            expect(page.get_by_role("navigation")).to_be_hidden()
            page.get_by_role("button",name="侧栏").click()
            page.get_by_role("button",name="切换窗口大小").click()
            assert page.locator(".obs").bounding_box()["x"] == 0
            page.get_by_role("button",name="切换窗口大小").click()
            assert window.bounding_box() == positioned
            page.get_by_role("button",name="收起窗口").click()
            expect(page.locator("#workspace")).to_be_hidden()
            page.get_by_role("button",name="还原窗口",exact=True).last.click()
            expect(page.locator("#workspace")).to_be_visible()
            page.set_viewport_size({"width":1280,"height":720})
            page.wait_for_function("document.querySelector('.obs').getBoundingClientRect().right <= innerWidth + 1")
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
            page.get_by_role("link",name="打开 CCD 工作区").click()
            expect(page.get_by_role("slider",name="原图与校正图分界线")).to_have_value("51")
            page.go_back()
            expect(page.get_by_role("heading",name="试用与安装")).to_be_visible()
            page.go_forward()
            expect(page.get_by_role("link",name="CCD 预处理")).to_have_attribute("aria-current","page")
            for link in ["长缝光谱","孔径测光","CCD 预处理","FITS 查看器"]:
                page.get_by_role("link",name=link,exact=True).click()
            expect(page.get_by_role("heading",name="calibrated-field.fits")).to_be_visible()
            expect(page.get_by_label("实时预览")).to_be_checked()
            assert sum(kind=="document" for kind,_ in requests) == 1
            for endpoint in ("/api/current","/api/observations"):
                assert sum(path.endswith(endpoint) for _,path in requests) == 1, endpoint
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
