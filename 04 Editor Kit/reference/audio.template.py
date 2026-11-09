"""TEMPLATE AUDIO: the speaker's voice + a procedural *tech* SFX palette (no toy pops or bleeps) -> cache/mix.wav / cache/sfx_only.wav.
Palette: swept air whooshes (stereo pan), sub drops, filtered impacts with a short room tail, clean UI ticks, granular data
streams, filtered risers, soft high shimmers for reveals, quiet high-passed typing. Copy to work/<Name>/audio.py, then give
every star device a cue on its word (the cues below follow reference/scene.template.js beat by beat)."""
import json, subprocess, numpy as np, unicodedata
from scipy import signal
SR = 48000
rng = np.random.default_rng(23)
def load(path, ch=2):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", str(ch), "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, ch).copy()
vo = load("cache/src.mp4")
d = json.loads(open("src/data.js").read()[len("window.DATA="):-1]); N = int(d["N"] / 30 * SR)
vo = np.pad(vo, ((0, max(0, N - len(vo))), (0, 0)))[:N]
typing = load("assets/sfx/mechanical_typing.wav").mean(1); typing /= np.abs(typing).max() + 1e-9
typing = signal.sosfilt(signal.butter(2, 900, "hp", fs=SR, output="sos"), typing)

def T(n): return np.arange(n) / SR
def bp(x, lo, hi, o=2): return signal.sosfilt(signal.butter(o, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def hp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "hp", fs=SR, output="sos"), x)
def lp(x, f, o=2): return signal.sosfilt(signal.butter(o, f, "lp", fs=SR, output="sos"), x)
def st(m, p0=0., p1=None):  # mono -> stereo with (moving) equal-power pan, -1..1
    p1 = p0 if p1 is None else p1; p = np.linspace(p0, p1, len(m)); a = (p + 1) * np.pi / 4
    return np.stack([m * np.cos(a), m * np.sin(a)], 1)
def sweep(x, f0, f1, q=1.6, blk=256):  # time-varying band-pass (chunked biquad with carried state)
    y = np.zeros_like(x); zi = np.zeros((1, 2)); n = len(x)
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** (i / max(1, n - 1)); bw = f / q
        sos = signal.butter(1, [max(30, f - bw / 2), min(SR / 2.2, f + bw / 2)], "bandpass", fs=SR, output="sos")
        y[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return y
def norm(x): return x / (np.abs(x).max() + 1e-9)

def air(dur=.45, f0=500, f1=3200, g=.5, p0=-.6, p1=.6, peak=.6):
    n = int(dur * SR); tt = np.linspace(0, 1, n); e = np.where(tt < peak, (tt / peak) ** 2, ((1 - tt) / (1 - peak)) ** 1.6)
    return st(g * norm(sweep(rng.standard_normal(n), f0, f1)) * e, p0, p1)
def sub(g=.5, f0=62, f1=36, dur=.6):
    n = int(dur * SR); t = T(n); fr = f1 + (f0 - f1) * np.exp(-t / .09)
    return st(g * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.minimum(t / .006, 1) * np.exp(-t / .2))
def impact(g=.5, bright=1800):
    n = int(.6 * SR); t = T(n); body = lp(rng.standard_normal(n), bright) * np.exp(-t / .045)
    return sub(g * .9) + st(g * .5 * norm(body) * np.minimum(t / .002, 1))
def tick(g=.25, f=3800, pan=0.):
    n = int(.03 * SR); t = T(n); x = lp(hp(rng.standard_normal(n), 2500), 8500) * np.exp(-t / .0025) * .7 + np.sin(2 * np.pi * f * t) * np.exp(-t / .006) * .5
    return st(g * norm(x), pan)
def data(dur=.35, g=.18, dens=180, lo=2200, hi=9000, p=0.):  # granular data stream
    n = int(dur * SR); out = np.zeros((n, 2))
    for _ in range(int(dens * dur)):
        gl = int(rng.uniform(.002, .007) * SR); i = rng.integers(0, max(1, n - gl)); tt = T(gl)
        f = rng.uniform(lo, hi); grain = np.sin(2 * np.pi * f * tt) * np.hanning(gl) * rng.uniform(.3, 1)
        out[i:i + gl] += st(grain, np.clip(p + rng.uniform(-.7, .7), -1, 1))
    tt = np.linspace(0, 1, n); return g * out / (np.abs(out).max() + 1e-9) * (np.minimum(tt / .1, 1) * np.minimum((1 - tt) / .25, 1))[:, None]
def stutter(dur=.14, g=.14):  # digital stutter for glitch frames: gated band noise, high-passed
    n = int(dur * SR); t = T(n); gate = (np.sin(2 * np.pi * 38 * t) > 0).astype(float)
    x = bp(rng.standard_normal(n), 1800, 7000) * gate * np.exp(-t / (dur / 2.5)); return st(g * norm(x), rng.uniform(-.4, .4))
def riser(dur=.5, g=.2):
    n = int(dur * SR); tt = np.linspace(0, 1, n); x = norm(sweep(rng.standard_normal(n), 300, 7000, 2.2)) * tt ** 2.4
    tone = np.sin(2 * np.pi * np.cumsum(180 + 520 * tt ** 2) / SR) * tt ** 3 * .25
    return st(g * (x + lp(tone, 2000)), -.3, .3)
def shimmer(g=.12, base=1320, dur=.8):  # soft airy reveal, inharmonic partials, slow attack
    n = int(dur * SR); t = T(n); x = sum(np.sin(2 * np.pi * base * r * t + rng.uniform(0, 6)) * a for r, a in ((1, .5), (1.5, .35), (2.25, .25), (3.1, .15)))
    x = hp(x, 900) * np.minimum(t / .08, 1) * np.exp(-t / .28); return st(g * norm(x), -.25, .25)
def type_run(t0, dur, k=16, g=.07):
    for i in range(k): add(t0 + i * dur / k + rng.uniform(-.01, .01), st(typing * g * rng.uniform(.7, 1), rng.uniform(-.3, .3)))

W = d["words"]; B = d["beats"]
def cl(s): return "".join(c for c in unicodedata.normalize("NFD", s) if c.isalnum() and unicodedata.category(c) != "Mn").lower()
def wt(word, n=0):
    k = 0
    for w in W:
        if cl(w["w"]) == word:
            if k == n: return w["t"]
            k += 1
    raise KeyError(word)
c = []
def add(t, s): c.append((t, s))
def trans(t, g=.35, d=.42, p=(-.6, .6)): add(t - d * .6, air(d, 400, 3600, g, *p))   # beat change: air sweep peaking on the cut

# ---- template cues: one per device, timed like scene.template.js (at = first word after a fraction of the beat)
def in_beat(k): return [w for w in W if B[k][0] <= w["t"] < B[k][1]]
def wk(k, i): ws = in_beat(k); return ws[max(0, min(len(ws) - 1, i))]["t"] if ws else B[k][0]
def at(k, f):
    t0 = B[k][0] + f * (B[k][1] - B[k][0]); ws = [w for w in W if t0 <= w["t"] < B[k][1]]; return ws[0]["t"] if ws else t0
add(.0, air(.6, 250, 2600, .26, -.4, .4, .7)); add(.03, tick(.1, 3000))                                  # world opens, eyebrow
add(wk("b1", 1), tick(.14, 3000, -.6)); add(wk("b1", 1) + 4 / 30, tick(.12, 3500, .6))                       # logo tile, icon tile reacts
hit = wk("b1", len(in_beat("b1")) - 1); add(hit - .4, riser(.4, .1)); add(hit - .04, impact(.36, 1300)); add(hit - .04, stutter(.16, .09))   # title glitch-slam
trans(B["b2"][0]); add(B["b2"][0] + .08, sub(.16, 70, 45, .35)); add(at("b2", .25), tick(.14, 2200, -.5)); add(at("b2", .37), tick(.14, 2000, -.2))
add(at("b2", .6) - .05, air(.7, 700, 4200, .12, -.6, .6, .5))                                              # before/after wipe
add(B["b3"][0] - .45, air(.6, 300, 5200, .3, -.7, .7, .55)); add(B["b3"][0], sub(.24, 60, 34, .6))          # signature push into the real page
for i in range(2): add(at("b3", .4 + i * .25), shimmer(.09, 1760 + i * 440, .9))                           # glass lenses lift off the page
trans(B["b4"][0]); [add(at("b4", f), sub(.12, 80, 50, .3)) or add(at("b4", f), data(.5, .07)) for f in (.15, .4, .65)]   # three glass planes
trans(B["b5"][0]); add(at("b5", .2) + .3, sub(.16, 75, 45, .35)); type_run(at("b5", .45), 1.4, 30, .045)   # file drop, prompt typing
add(at("b5", .8) - .1, tick(.14, 2400, -.6))                                                                # locked file planted
trans(B["b6"][0]); [add(w["t"], tick(.12, 3600, -.6)) for w in in_beat("b6")[:4]]                           # checklist ticks
add(B["fin"][0] - .3, air(.6, 200, 3000, .26, .5, -.5)); add(B["fin"][0] + .02, sub(.26, 55, 32, .8))       # CTA flip
tk = at("fin", .15); add(tk - .38, riser(.38, .13)); add(tk - .03, impact(.42, 1400)); add(tk, shimmer(.07, 990, 1.0))   # keyword slam
add(at("fin", .7) - .1, impact(.22, 1600)); add(at("fin", .7), shimmer(.09, 1760, 1.0))                    # file unlocks

sfx = np.zeros((N, 2))
for t, s in c:
    i = int(t * SR); m = min(len(s), N - i)
    if m > 0 and i >= 0: sfx[i:i + m] += s[:m]
# small room: short decaying, low-passed noise IR, ~14% wet -> sounds placed, not pasted
ir_n = int(.35 * SR); irt = T(ir_n); ir = lp(rng.standard_normal((ir_n, 2)).T, 5000).T * np.exp(-irt / .07)[:, None]; ir /= np.abs(ir).sum(0)
wet = np.stack([signal.fftconvolve(sfx[:, k], ir[:, k])[:N] for k in range(2)], 1)
sfx = sfx + .14 * wet / (np.abs(wet).max() + 1e-9) * np.abs(sfx).max()
pk = np.abs(sfx).max(); sfx *= .2 / pk      # ~ -14 dBFS peak: clearly under the voice (v2 was .3)
fo = int(.35 * SR); sfx[-fo:] *= np.linspace(1, 0, fo)[:, None]   # nothing rings past the last frame
mix = np.clip(vo + sfx, -1, 1).astype(np.float32)
for name, b in (("cache/mix.wav", mix), ("cache/sfx_only.wav", sfx.astype(np.float32))):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "pcm_s24le", name], input=b.tobytes())
print("cues", len(c), "raw peak", round(pk, 3))
