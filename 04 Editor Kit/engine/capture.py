# Real web pages for browserCard: python3 engine/capture.py <url> <out.png> [width=1000] [height=2400]
# Public pages only (no logins). Saves into assets/screens/ when given a bare name. Light theme, LOCALE (default en-US), 2x scale for crisp text.
import sys, pathlib, os
from playwright.sync_api import sync_playwright
url, out = sys.argv[1], sys.argv[2]; w = int(sys.argv[3]) if len(sys.argv) > 3 else 1000; h = int(sys.argv[4]) if len(sys.argv) > 4 else 2400
p = pathlib.Path(out); p = p if p.parent != pathlib.Path(".") else pathlib.Path("assets/screens") / p; p.parent.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={"width": w, "height": 900}, device_scale_factor=2, locale=os.environ.get("LOCALE", "en-US"), color_scheme="light")   # LOCALE=en-US for English videos
    pg.goto(url, wait_until="networkidle", timeout=45000); pg.wait_for_timeout(1200)
    # hide cookie / consent overlays for the screenshot (we never click "accept"): fixed or sticky boxes that mention cookies
    pg.evaluate("""() => { for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && /cookie|consent|privacidade/i.test(el.innerText || '')) el.style.setProperty('display', 'none', 'important'); } }""")
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(p), full_page=True, clip={"x": 0, "y": 0, "width": w, "height": min(h, pg.evaluate("document.documentElement.scrollHeight"))})
    br.close()
print("saved", p)
