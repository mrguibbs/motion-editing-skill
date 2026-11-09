"""VO + procedural *tech* SFX palette (no toy pops/bleeps) -> cache/mix.wav / cache/sfx_only.wav
Palette: swept air whooshes (stereo pan), sub drops, filtered impacts with a short room tail, clean UI ticks,
granular data streams for scans/glitch, filtered risers, soft high shimmers for reveals, quiet HP'd typing."""
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

# hook: laptop rises, logos orbit in, glitch captions
add(.05, air(.5, 250, 2600, .3, -.4, .4, .7)); add(.3, sub(.32))
for gp in d["caps"]:
    if gp["beat"] == "b01": add(max(gp["t"][0], .45), stutter(.11, .12))
add(wt("copiar"), data(.4, .12))
for i in range(8): add(wt("qualquer") - .1 + i * .06, tick(.1, 3200 + i * 140, -.6 + i * .17))
add(wt("aplicativo") + .3, data(1.2, .09, 90))
add(wt("computador"), shimmer(.1)); add(wt("computador"), sub(.22))
# reverse engineering slabs + scan
trans(B["b02"][0]); add(wt("engenharia"), data(.5, .12)); add(wt("reversa"), stutter(.14, .12))
add(wt("analisa"), air(.7, 2000, 7000, .1, -.8, .8, .5)); add(wt("analisa"), data(.6, .08))
for i in range(4): add(wt("funcionalidades") - .12 + i * .15, tick(.14, 2600, -.5 + i * .33))
add(wt("graca") - .5, riser(.45, .14)); add(wt("graca") - .06, impact(.32)); add(wt("graca") - .02, shimmer(.08, 1760))
# REA 3D type
trans(B["b03"][0]); add(wt("rea") - .02, impact(.36)); add(wt("rea"), air(.6, 4000, 900, .1, .3, -.3, .15))
for w in ["reverse", "engineer", "anything"]: add(wt(w), tick(.12, 2400))
# repo proof: window, focus Public, star click
trans(B["b04"][0], .3); type_run(B["b04"][0] + .25, .55, 14, .05)
add(wt("open") - .25, air(.3, 900, 2800, .1, -.3, .3)); add(wt("open") + .4, tick(.16, 4200))
add(wt("mil") - .2, air(.3, 900, 2800, .1, .3, -.3)); add(wt("estrelas") - .02, tick(.2, 3600)); add(wt("estrelas"), sub(.18, 70, 45, .4))
add(wt("estrelas") + .3, shimmer(.07)); add(wt("github") - .05, tick(.14, 3000))
# install terminal
trans(B["b05"][0], .3); type_run(wt("instalar"), .75, 18, .08); add(wt("ferramenta", 1), shimmer(.08, 1100)); add(wt("ferramenta", 1), tick(.14, 3400))
# targets: laptop / browser / phone + reticle
add(B["b05b"][0], data(.3, .1))
for (w, n), p in zip([("computador", 1), ("site", 0), ("celular", 0)], (-.5, 0, .5)): add(wt(w, n) - .3, air(.32, 700, 3000, .14, p - .3, p + .3)); add(wt(w, n) - .02, sub(.16, 75, 45, .35)); add(wt(w, n), tick(.12, 3800, p))
# decompile: binary rain + code card
trans(B["b06"][0], .3); add(wt("descompilar"), stutter(.16, .12)); add(wt("descompilar"), data(.9, .12, 220))
add(wt("extrair") - .1, air(.4, 3000, 800, .12)); type_run(wt("extrair") + .15, .8, 8, .07)
# trace nodes
trans(B["b07"][0], .3); t0 = B["b07"][0]; rec = wt("recurso")
for i in range(5): add(t0 + .15 + i * ((rec - t0 - .15) / 4), tick(.12, 2800 + i * 200, -.6 + i * .3))
add(wt("clica") - .45, air(.3, 1200, 4000, .08)); add(wt("clica"), tick(.22, 3000)); add(wt("clica") + .05, data(.5, .08))
add(wt("final"), shimmer(.09, 1480)); add(wt("final"), sub(.18))
# checklist
trans(B["b07b"][0], .26)
for w, n in [("explicando", 0), ("todo", 1), ("processo", 0), ("passo", 1)]: add(wt(w, n), tick(.13, 3300))
# E tem MAIS!
add(wt("mais") - .32, riser(.3, .1)); add(wt("mais") - .04, impact(.3))
# rebuild + codebase
trans(B["b09"][0], .28); add(wt("recriar") - .3, riser(.3, .08)); add(wt("recriar"), sub(.22))
for i in range(3): add(wt("recriar") + i * .22, air(.4, 600, 4500, .1, -.7, .5)); add(wt("recriar") + i * .22 + .55, tick(.12, 3000))
add(wt("funcionalidades", 1), shimmer(.07)); add(wt("produto"), tick(.12, 2600))
trans(B["b09b"][0], .26)
for i in range(3): add(B["b09b"][0] + .1 + i * .18, tick(.11, 3600, -.5 + i * .5))
for w, n in [("base", 0), ("codigo", 1), ("utiliza", 0)]: add(wt(w, n) - .05, data(.25, .07))
# finale: world flip, ? tease, riser -> CÓDIGO slam, orbit ticks
fin = B["fin"][0]; tk = wt("codigo", 2)
add(fin - .3, air(.55, 200, 3000, .3, .5, -.5)); add(fin, sub(.3, 55, 32, .8))
add(wt("testar") - .02, tick(.13, 2400)); add(wt("comenta") - .05, tick(.12, 3200))
add(tk - .55, riser(.55, .16)); add(tk, impact(.42, 1400)); add(tk + .02, shimmer(.07, 990, 1.0))
for i in range(7): add(tk + .25 + i * .07, tick(.07, 3000 + i * 180, -.8 + i * .27))
add(wt("link") - .05, tick(.13, 3600))

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
