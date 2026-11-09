"""Deep Navy prep: words (with merges/fixes), auto caption groups, beats, faces -> src/data.js"""
import json, re, unicodedata, numpy as np
cfg = json.load(open("plan/config.json"))
FPS, NSRC = cfg["fps"], cfg["src_frames"]
N = NSRC
def cl(s): return "".join(c for c in unicodedata.normalize("NFD", s) if c.isalnum() and unicodedata.category(c) != "Mn").lower()
raw = [{"w": w["w"].strip(), "t": w["t"][0], "e": w["t"][1]} for s in json.load(open("cache/transcript.json"))["segments"] for w in s["words"]]
# merges: "e" + "-mail" -> "e-mail", "70" + "%" -> "70%", "chat" + "EPT" -> "ChatGPT"
words = []
for w in raw:
    if words and (w["w"].startswith("-") or w["w"] in ("%", "EPT")):
        p = words[-1]; p["w"] = "ChatGPT" if w["w"] == "EPT" else p["w"] + w["w"]; p["e"] = w["e"]; continue
    words.append(dict(w))
FIX = cfg.get("fixes", {})
for w in words:
    core = re.sub(r"[^\w'-]", "", w["w"])
    if core in FIX: w["w"] = w["w"].replace(core, FIX[core])
DROP = {i for i, w in enumerate(words) if round(w["t"], 2) in set(cfg.get("drop_caption_times", []))}  # hidden from captions, still timed
for w in words:
    for a, b in cfg.get("caption_replace", []):
        if round(w["t"], 2) == a: w["w"] = b
KEY = set(cl(k) for k in cfg["keywords"])
GLITCH = set(cl(k) for k in cfg.get("glitch", []))   # phrase-ending words that glitch in (a few per video)
beats = cfg["beats"]; LAST = list(beats)[-1]
def beat_of(t):
    for k, (a, b) in beats.items():
        if a - 1e-6 <= t < b: return k
    return LAST
PROPER = {"ChatGPT", "Claude", "Instagram", "PROMPT", "IA"} | set(cfg.get("proper", []))   # config "proper": capitalised words that must not start a new caption group
# auto groups: break on punctuation, gaps > .35 s, beat changes, max 4 words / 22 chars
groups, cur = [], []
for i, w in enumerate(words):
    if i in DROP: continue
    if cur:
        prev = cur[-1]; txt = " ".join(x["w"] for x in cur + [w])
        if (prev["w"][-1] in ".,?!:" or w["t"] - prev["e"] > .35 or len(cur) >= 4 or len(txt) > 22
                or beat_of(w["t"]) != beat_of(cur[0]["t"]) or (w["w"][:1].isupper() and w["w"] not in PROPER)):
            groups.append(cur); cur = []
    cur.append(w)
if cur: groups.append(cur)
END = N / FPS; caps = []
HIDE = cfg.get("hide_caps", [])
for gi, g in enumerate(groups):
    t0 = g[0]["t"]; t1 = groups[gi + 1][0]["t"] if gi + 1 < len(groups) else END
    if t1 - g[-1]["e"] > .4: t1 = g[-1]["e"] + .3
    bt = beat_of(t0)
    if any(a <= t0 < b for a, b in HIDE): continue
    caps.append({"t": [round(t0, 3), round(t1, 3)], "beat": bt,
                 "words": [{"w": c["w"], "t": round(c["t"], 3), "e": round(c["e"], 3), "k": 1 if cl(c["w"]) in KEY else 0, "g": 1 if cl(c["w"]) in GLITCH else 0} for c in g]})
faces = json.load(open("cache/faces.json"))
st = np.array([s["t"] for s in faces]) * FPS
bx = np.array([[s["boxes"][0][k] for k in "xywh"] for s in faces], float)
allf = np.arange(NSRC); it = np.stack([np.interp(allf, st, bx[:, i]) for i in range(4)], 1)
k = 9; pad = np.pad(it, ((k // 2, k // 2), (0, 0)), mode="edge"); sm = np.stack([np.convolve(pad[:, i], np.ones(k) / k, "valid") for i in range(4)], 1)
face = [[round(v) for v in (x, y, x + w, y + h)] for x, y, w, h in sm]
# crown = top of the speaker's hair from the matte, searched only inside the face's x-range (raised hands don't count); smoothed like the face
import os
from PIL import Image
crown = []
for k in range(NSRC):
    mp = f"cache/mattes/m{k + 1:04d}.png"; x0, y0, x1, y1 = face[k]
    if not os.path.exists(mp): crown.append(round(y0 - .2 * (y1 - y0))); continue
    a = np.asarray(Image.open(mp).getchannel("A"))[:, max(0, x0):min(1080, x1)] > 128; rows = a.any(1)
    crown.append(int(np.argmax(rows)) if rows.any() else round(y0 - .2 * (y1 - y0)))
cp = np.pad(np.array(crown, float), (4, 4), mode="edge"); crown = [round(v) for v in np.convolve(cp, np.ones(9) / 9, "valid")]
data = {"N": N, "fps": FPS, "beats": beats, "words": [{"w": w["w"], "t": round(w["t"], 3), "e": round(w["e"], 3)} for w in words], "caps": caps, "face": face, "crown": crown}
open("src/data.js", "w").write("window.DATA=" + json.dumps(data, ensure_ascii=False) + ";")
print("frames", N, "groups", len(groups), "caps", len(caps))
for c in caps: print(f'{c["t"][0]:7.2f} {c["beat"]:5s}', " ".join(w["w"] + ("*" if w["k"] else "") for w in c["words"]))
