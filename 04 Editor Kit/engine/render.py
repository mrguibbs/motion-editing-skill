import sys, base64, subprocess, pathlib, os
from playwright.sync_api import sync_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
mode = sys.argv[1]
with sync_playwright() as pw:
    br = pw.chromium.launch(args=["--allow-file-access-from-files", "--disable-web-security"])
    pg = br.new_page(viewport={"width": 1080, "height": 1920})
    pg.on("console", lambda m: print("console:", m.text))
    pg.on("pageerror", lambda e: print("PAGEERROR:", e))
    pg.goto((ROOT / os.environ.get("PAGE", "src/index.html")).as_uri())
    pg.evaluate("window.ready")
    N = pg.evaluate("DATA.N")
    if mode == "sheet":
        fps = float(sys.argv[2]); qa = "qa" in sys.argv[3:]
        rest = [a for a in sys.argv[3:] if a != "qa"]
        t0, t1 = (float(rest[0]), float(rest[1])) if len(rest) == 2 else (0, N / 30)
        pg.evaluate(f"window.QA={'true' if qa else 'false'}")
        out = ROOT / os.environ.get("SHEETDIR", "cache/sheet"); out.mkdir(exist_ok=True, parents=True)
        for f in out.glob("*.jpg"): f.unlink()
        ks = sorted({min(N - 1, round(t0 * 30 + i * 30 / fps)) for i in range(int((t1 - t0) * fps) + 1)})
        for k in ks:
            d = pg.evaluate(f"renderFrame({k})")
            (out / f"k{k:04d}.jpg").write_bytes(base64.b64decode(d.split(",")[1]))
        print("frames", len(ks))
    else:
        ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-",
                               "-c:v", "libx264", "-crf", "15", "-preset", "medium", "-pix_fmt", "yuv420p", sys.argv[2]], stdin=subprocess.PIPE)
        K0, K1 = int(os.environ.get("K0", 0)), int(os.environ.get("K1", N))
        for k in range(K0, K1):
            d = pg.evaluate(f"renderFrame({k})")
            ff.stdin.write(base64.b64decode(d.split(",")[1]))
            if k % 150 == 0: print("frame", k, flush=True)
        ff.stdin.close(); ff.wait()
        print("done", K0, K1)
    br.close()
