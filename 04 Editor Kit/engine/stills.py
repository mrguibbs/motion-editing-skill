# python3 engine/stills.py out.jpg [qa] t1 t2 ... -> contact sheet (4 per row, 360x640 tiles)
import sys, base64, io, pathlib, os
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
out = sys.argv[1]; qa = "qa" in sys.argv[2:]; ts = [float(a) for a in sys.argv[2:] if a != "qa"]
ims = []
with sync_playwright() as pw:
    br = pw.chromium.launch(args=["--allow-file-access-from-files"]); pg = br.new_page(viewport={"width": 1080, "height": 1920})
    pg.on("pageerror", lambda e: print("PAGEERROR:", e)); pg.on("console", lambda m: print("console:", m.text))
    pg.goto((ROOT / os.environ.get("PAGE", "src/index.html")).as_uri()); pg.evaluate("window.ready"); pg.evaluate(f"window.QA={'true' if qa else 'false'}")
    for t in ts:
        d = pg.evaluate(f"renderFrame({round(t * 30)})"); im = Image.open(io.BytesIO(base64.b64decode(d.split(",")[1])))
        if len(ts) == 1: im.save(out, quality=92)
        ims.append(im.resize((360, 640)))
    br.close()
if len(ts) > 1:
    cols = min(4, len(ims)); rows = (len(ims) + cols - 1) // cols; sh = Image.new("RGB", (cols * 360, rows * 640))
    for i, im in enumerate(ims): sh.paste(im, ((i % cols) * 360, (i // cols) * 640))
    sh.save(out, quality=88)
print("ok", len(ims))
