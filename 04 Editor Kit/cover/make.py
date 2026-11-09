import json, sys, base64
from pathlib import Path
from PIL import Image
from playwright.sync_api import sync_playwright
cfg = json.load(open(sys.argv[1])); out = cfg["out"]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"]); pg = b.new_page(viewport={"width": 1080, "height": 1920})
    pg.on("pageerror", lambda e: print("ERR", e)); pg.goto(Path("cover.html").resolve().as_uri())
    d = pg.evaluate(f"make({json.dumps(cfg)})"); Path(out).write_bytes(base64.b64decode(d.split(",")[1])); b.close()
Image.open(out).crop((0, 240, 1080, 1680)).save(out.replace(".jpg", " - grid 3x4.jpg"), quality=92); print("ok", out)
