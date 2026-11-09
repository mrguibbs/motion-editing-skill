// DEEP NAVY ENGINE: world -> back layer -> subject (matted, relit, rim) -> front layer -> captions -> finish.
// Every frame is a pure function of t. Needs DATA (prep_v4), cache/frames f%04d.jpg, cache/mattes m%04d.png.
const D = window.DATA, FPS = D.fps, W = 1080, H = 1920;
const cv = document.getElementById("c"), ctx = cv.getContext("2d");
const C = { ink: "#04060E", navy: "#0A1230", navy2: "#111A44", indigo: "#2B2378", violet: "#7B61FF", lav: "#CDBFFF", cyan: "#5BE4F0", mint: "#4FE3B5", white: "#F5F3FF", warn: "#FF8FA8" };
// UI words in the video's language: set SCENE.lang ("pt" default, "en"); any device option (o.label, o.before, ...) still overrides
const TXT = { pt: { illus: "ILUSTRAÇÃO", before: "ANTES", after: "DEPOIS", askClaude: "Responder ao Claude…", askGpt: "Pergunte alguma coisa", file: ["ARQUIVO"] },
  en: { illus: "ILLUSTRATION", before: "BEFORE", after: "AFTER", askClaude: "Reply to Claude…", askGpt: "Ask anything", file: ["YOUR FILE"] } };
const tx = k => (TXT[(window.SCENE && SCENE.lang) || "pt"] || TXT.pt)[k];

// ---------- math ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const P = (t, t0, d) => clamp((t - t0) / d);
const eOutExpo = p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
const eOutCubic = p => 1 - Math.pow(1 - p, 3);
const eInCubic = p => p * p * p;
const eInOut = p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eOutQuint = p => 1 - Math.pow(1 - clamp(p), 5);
const eInOutQuart = p => (p < .5 ? 8 * p * p * p * p : 1 - Math.pow(-2 * p + 2, 4) / 2);   // ≈ cubic-bezier(.7,0,.25,1), their layout curve
const eOutBack = (p, s = 1.15) => { p = clamp(p); const c = s + 1; return 1 + c * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2); };   // ≈ cubic-bezier(.2,1.25,.4,1)
function spring(t, t0, f = 2.2, z = .55) { if (t <= t0) return 0; z = Math.max(z, .82); f *= 1.15;   // near-critical: settles without wobble
  const x = t - t0, w = 2 * Math.PI * f, s = Math.sqrt(1 - z * z), wd = w * s; return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + (z / s) * Math.sin(wd * x)); }
function wob(t, t0, f = 3, z = .3) { if (t <= t0) return 0; const x = t - t0, w = 2 * Math.PI * f; return Math.exp(-z * w * x) * Math.sin(w * Math.sqrt(1 - z * z) * x); }
const clean = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w']/g, "").toLowerCase();
function WT(word, n = 0) { let k = 0; for (const w of D.words) if (clean(w.w) === clean(word)) { if (k === n) return w.t; k++; } throw new Error("word " + word + " " + n); }
function WE(word, n = 0) { let k = 0; for (const w of D.words) if (clean(w.w) === clean(word)) { if (k === n) return w.e; k++; } throw new Error("word " + word); }
const B = D.beats;
function hsh(a, b = 0) { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); }

// ---------- drawing utils ----------
function rr(x, y, w, h, r, c = ctx) { c.beginPath(); c.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
function font(f, s, ls = 0) { ctx.font = `${s}px ${f}`; ctx.letterSpacing = ls + "px"; }
function heroGrad(y0, y1, c = ctx) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#FFFFFF"); g.addColorStop(.55, "#DCD2FF"); g.addColorStop(1, "#9A82FF"); return g; }
function lavGrad(x0, x1, c = ctx) { const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "#E9E2FF"); g.addColorStop(.5, "#B9A6FF"); g.addColorStop(1, "#8C70FF"); return g; }
function noShadow() { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; ctx.shadowOffsetX = 0; }

// ---------- assets ----------
const LOGO = {}, ICON = {}, IMG = {};
const loadImg = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => { console.log("missing " + s); r(null); }; i.src = s; });
async function loadAssets(logos, icons) {
  for (const n of logos || []) LOGO[n] = await loadImg(`../assets/logos/${n}.svg`);
  for (const n of icons || []) ICON[n] = await loadImg(`../assets/icons/${n}.svg`);
}

// ---------- world ----------
const GRID = document.createElement("canvas"); GRID.width = W + 120; GRID.height = H + 120;
(() => { const g = GRID.getContext("2d"); g.strokeStyle = "rgba(160,150,255,.055)"; g.lineWidth = 1;
  for (let i = 0; i <= GRID.width; i += 60) { g.beginPath(); g.moveTo(i + .5, 0); g.lineTo(i + .5, GRID.height); g.stroke(); }
  for (let j = 0; j <= GRID.height; j += 60) { g.beginPath(); g.moveTo(0, j + .5); g.lineTo(GRID.width, j + .5); g.stroke(); } })();
function bloom(x, y, r, col) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, "0)")); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r); }
function world(t, o = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#03050C"); g.addColorStop(.5, o.deep ? "#070C22" : C.navy); g.addColorStop(1, "#02030A");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = camera(t);
  ctx.drawImage(GRID, -60 + cam.x * .4, -60 + cam.y * .4);
  bloom(540 + Math.sin(t * .23) * 90, (o.bloomY ?? 700) + Math.cos(t * .19) * 70, 820, `rgba(108,80,255,${o.bloomA ?? .40})`);
  bloom(980 + Math.cos(t * .17) * 60, 1560, 600, "rgba(40,170,230,.15)");
  bloom(80, 300 + Math.sin(t * .2) * 120, 520, "rgba(90,60,220,.14)");
  for (let i = 0; i < 80; i++) { const x = (hsh(i, 1) * W + t * (4 + hsh(i, 3) * 10) + cam.x * .6) % W, y = (hsh(i, 2) * H - t * (3 + hsh(i, 4) * 6)) % H;
    ctx.fillStyle = `rgba(215,210,255,${(.15 + hsh(i, 5) * .45) * (.6 + .4 * Math.sin(t * 2 + i))})`; ctx.beginPath(); ctx.arc(x, (y + H) % H, hsh(i, 6) * 1.7 + .4, 0, 7); ctx.fill(); }
}
const camera = t => ({ x: Math.sin(t * .31) * 14, y: Math.cos(t * .27) * 10 });

// ---------- plate: graded room (BG) + graded subject (SUB), split by the matte ----------
const BGC = document.createElement("canvas"); BGC.width = W; BGC.height = H; const bgx = BGC.getContext("2d");
const SUB = document.createElement("canvas"); SUB.width = W; SUB.height = H; const sctx = SUB.getContext("2d");
function rad(c, x, y, r, col) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, col.replace(/[\d.]+\)$/, "0)")); c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r); }
async function buildPlate(k, t) {
  const n = String(Math.min(k, D.N - 1) + 1).padStart(4, "0");
  const [fr, mt] = await Promise.all([loadImg(`../cache/frames/f${n}.jpg`), loadImg(`../cache/mattes/m${n}.png`)]);
  // ROOM GRADE (Oct 27 v2): the room keeps its own colours, cleaned up with contrast and a gentle darken; brand light comes only from soft practicals
  bgx.globalCompositeOperation = "source-over"; bgx.filter = SCENE.roomGrade ?? "brightness(.8) saturate(.95) contrast(1.18)"; bgx.drawImage(fr, 0, 0, W, H); bgx.filter = "none";
  bgx.globalCompositeOperation = "screen"; rad(bgx, 60, 640, 420, "rgba(190,80,255,.14)"); rad(bgx, 1020, 600, 380, "rgba(140,90,255,.10)"); rad(bgx, 1040, 1200, 480, "rgba(40,170,230,.08)");
  bgx.globalCompositeOperation = "multiply"; { const v = bgx.createRadialGradient(540, 820, 420, 540, 900, 1300); v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(1, "rgba(70,68,100,1)"); bgx.fillStyle = v; bgx.fillRect(0, 0, W, H); }
  bgx.globalCompositeOperation = "source-over";
  // SUBJECT GRADE: natural skin and clothes, filmic contrast, a faint cool key; nothing tints the speaker's body
  sctx.globalCompositeOperation = "source-over"; sctx.clearRect(0, 0, W, H); sctx.filter = SCENE.subjectGrade ?? "brightness(1.02) contrast(1.08) saturate(.96)"; sctx.drawImage(fr, 0, 0, W, H); sctx.filter = "none";
  sctx.globalCompositeOperation = "destination-in"; sctx.drawImage(mt, 0, 0, W, H);
  sctx.globalCompositeOperation = "source-atop";
  let g = sctx.createLinearGradient(0, 0, W, H * .6); g.addColorStop(0, "rgba(150,130,255,.07)"); g.addColorStop(.5, "rgba(150,130,255,0)"); sctx.fillStyle = g; sctx.fillRect(0, 0, W, H);
  g = sctx.createLinearGradient(W, 0, W * .7, 0); g.addColorStop(0, "rgba(90,200,255,.08)"); g.addColorStop(1, "rgba(90,200,255,0)"); sctx.fillStyle = g; sctx.fillRect(0, 0, W, H);
  // WARDROBE TAME: below the chin, pull loud clothes toward desaturated navy (refs wear dark); the face is never touched
  { const chin = D.face[Math.min(k, D.face.length - 1)][3], ws = SCENE.wardrobe ?? 0;   // opt-in only
    if (ws > 0) { sctx.globalCompositeOperation = "saturation"; g = sctx.createLinearGradient(0, chin, 0, chin + 80); g.addColorStop(0, "rgba(128,128,128,0)"); g.addColorStop(1, `rgba(128,128,128,${ws})`); sctx.fillStyle = g; sctx.fillRect(0, chin, W, H - chin);
      sctx.globalCompositeOperation = "multiply"; g = sctx.createLinearGradient(0, chin, 0, chin + 80); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(1, `rgba(${Math.round(lerp(255, 70, ws))},${Math.round(lerp(255, 66, ws))},${Math.round(lerp(255, 130, ws))},1)`); sctx.fillStyle = g; sctx.fillRect(0, chin, W, H - chin);
      sctx.globalCompositeOperation = "destination-in"; sctx.drawImage(mt, 0, 0, W, H); } }
  sctx.globalCompositeOperation = "source-over";
}
// layouts: card rect (full canvas = FULL room), plate scale k, centre x, top y; pop = head may break out of the card top
function L(o) { return { k: o.k, cx: o.cx ?? 540, dy: o.dy ?? 0, card: o.card ?? [0, 0, W, H, 0], on: o.card ? 1 : 0, bw: o.bw ?? 0, pop: o.pop ?? 1 }; }
function mixL(A, Bb, p) { return { k: lerp(A.k, Bb.k, p), cx: lerp(A.cx, Bb.cx, p), dy: lerp(A.dy, Bb.dy, p), card: A.card.map((v, i) => lerp(v, Bb.card[i], p)), on: lerp(A.on, Bb.on, p), bw: lerp(A.bw, Bb.bw, p), pop: lerp(A.pop, Bb.pop, p) }; }
function layoutAt(t) {
  const TL = SCENE.timeline; let cur = TL[0][1];
  for (let i = 1; i < TL.length; i++) { const [t0, Lb, d = .8] = TL[i]; if (t < t0) break; const p = eInOutQuart(P(t, t0, d)); cur = mixL(cur, Lb, p); }
  return cur;
}
function plateRect(Ly, t) { const cam = camera(t), drift = 1 - Ly.on; return [Ly.cx - W * Ly.k / 2 + cam.x * .3 * drift, Ly.dy + cam.y * .3 * drift, W * Ly.k, H * Ly.k]; }
const gradeF = (Ly, base) => Ly.bw > .01 ? `${base} grayscale(${Ly.bw.toFixed(2)}) contrast(${(1 + .12 * Ly.bw).toFixed(2)})` : base;
// feather mask for the plate when it is pulled back inside the full frame (room extends with a blurred copy)
const FEATH = document.createElement("canvas"); FEATH.width = W; FEATH.height = H;
(() => { const f = FEATH.getContext("2d"); f.fillStyle = "#000"; f.fillRect(0, 0, W, H); f.globalCompositeOperation = "destination-out";
  const e = (x0, y0, x1, y1, rx, ry, rw, rh) => { const g = f.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)"); f.fillStyle = g; f.fillRect(rx, ry, rw, rh); };
  e(0, 0, 110, 0, 0, 0, 110, H); e(W, 0, W - 110, 0, W - 110, 0, 110, H); e(0, 0, 0, 220, 0, 0, W, 220); })();
const TMP = document.createElement("canvas"); TMP.width = W; TMP.height = H; const tmx = TMP.getContext("2d");
function feathered(src) { tmx.globalCompositeOperation = "source-over"; tmx.clearRect(0, 0, W, H); tmx.drawImage(src, 0, 0); tmx.globalCompositeOperation = "destination-in"; tmx.drawImage(FEATH, 0, 0); tmx.globalCompositeOperation = "source-over"; return TMP; }
// 1) room (inside the card when there is one)
function drawRoom(t, Ly) {
  const [dx, dy, dw, dh] = plateRect(Ly, t), [cx, cy, cw, ch, cr] = Ly.card, on = Ly.on;
  if (on > .01) { ctx.save(); ctx.globalAlpha = on; ctx.shadowColor = "rgba(0,0,12,.8)"; ctx.shadowBlur = 80; ctx.shadowOffsetY = 40; rr(cx, cy, cw, ch, cr); ctx.fillStyle = "#06081A"; ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = on; ctx.shadowColor = "rgba(123,97,255,.5)"; ctx.shadowBlur = 70; rr(cx, cy, cw, ch, cr); ctx.fillStyle = "#06081A"; ctx.fill(); ctx.restore(); }
  ctx.save(); rr(cx, cy, cw, ch, cr); ctx.clip();
  ctx.fillStyle = "#05060F"; ctx.fillRect(cx, cy, cw, ch);
  const ext = Ly.k < .999;   // pulled back: extend the room with a blurred, larger copy anchored on the same point
  if (ext) {   // edge-extend: stretch the plate's own border pixels outward (clamp-to-edge), blurred, so the room continues seamlessly
    ctx.filter = gradeF(Ly, "blur(18px) brightness(.85)");
    for (const S of [BGC, SUB]) {
      ctx.drawImage(S, 0, 0, 16, H, cx - 40, dy, dx - cx + 60, dh);            // left
      ctx.drawImage(S, W - 16, 0, 16, H, dx + dw - 20, dy, cx + cw - dx - dw + 60, dh);   // right
      ctx.drawImage(S, 0, 0, W, 16, dx, cy - 40, dw, dy - cy + 60);            // top
    }
    ctx.filter = "none";
    for (const [x0, x1] of [[cx, cx + 170], [cx + cw, cx + cw - 170]]) { const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, "rgba(5,6,18,.7)"); g.addColorStop(1, "rgba(5,6,18,0)"); ctx.fillStyle = g; ctx.fillRect(Math.min(x0, x1), cy, 170, ch); } }
  ctx.filter = gradeF(Ly, "brightness(1)"); ctx.drawImage(ext && Ly.on < .5 ? feathered(BGC) : BGC, dx, dy, dw, dh); ctx.filter = "none";
  if (dy > cy) { const g = ctx.createLinearGradient(0, dy, 0, dy + 260); g.addColorStop(0, "rgba(5,6,15,1)"); g.addColorStop(1, "rgba(5,6,15,0)"); ctx.fillStyle = g; ctx.fillRect(cx, cy, cw, dy + 260 - cy); }
  ctx.restore();
}
// 2) subject with a cast shadow (lands on whatever back-layer graphics sit behind the speaker) + rim
function cardBorder(Ly) {
  const [cx, cy, cw, ch, cr] = Ly.card, on = Ly.on;
  ctx.save(); ctx.globalAlpha = on; rr(cx, cy, cw, ch, cr); ctx.strokeStyle = "rgba(205,190,255,.85)"; ctx.lineWidth = 3; ctx.stroke();
  const sh = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch); sh.addColorStop(0, "rgba(255,255,255,.35)"); sh.addColorStop(.3, "rgba(255,255,255,0)"); rr(cx + 1.5, cy + 1.5, cw - 3, ch - 3, cr); ctx.strokeStyle = sh; ctx.lineWidth = 2; ctx.stroke();
  brackets(cx + 22, cy + 22, cw - 44, ch - 44, 30, `rgba(225,215,255,${.75 * on})`); ctx.restore();
}
function drawSubject(t, Ly) {
  const [dx, dy, dw, dh] = plateRect(Ly, t), [cx, cy, cw, ch, cr] = Ly.card, on = Ly.on;
  ctx.save();
  const p = new Path2D(); p.roundRect(cx, cy, cw, ch, cr); if (on > .01 && Ly.pop > .01) p.rect(cx + 8, 0, cw - 16, cy + 2); ctx.clip(p);
  ctx.restore(); if (on > .01) cardBorder(Ly);   // full border first, so the speaker's head breaks out IN FRONT of the top edge
  ctx.save(); ctx.clip(p);
  const SRC = Ly.k < .999 && Ly.on < .5 ? feathered(SUB) : SUB;
  ctx.save(); ctx.shadowColor = "rgba(0,0,10,.7)"; ctx.shadowBlur = 60 * Ly.k; ctx.shadowOffsetX = 22 * Ly.k; ctx.shadowOffsetY = 30 * Ly.k; ctx.globalAlpha = .9; ctx.drawImage(SRC, dx, dy, dw, dh); ctx.restore();   // depth shadow
  ctx.save(); ctx.shadowColor = "rgba(150,125,255,.6)"; ctx.shadowBlur = 18 * Ly.k; ctx.globalAlpha = .22; ctx.drawImage(SRC, dx, dy, dw, dh); ctx.restore();                                                // subtle violet rim, no halo
  ctx.filter = gradeF(Ly, "brightness(1)"); ctx.drawImage(SRC, dx, dy, dw, dh); ctx.filter = "none";
  ctx.restore();
  if (on > .01) {   // sides + bottom go back on top of the speaker (crisp edges); the top edge stays behind the speaker's head
    ctx.save(); if (Ly.pop > .01) { ctx.beginPath(); ctx.rect(0, cy + cr * .6, W, H); ctx.clip(); } cardBorder(Ly); ctx.restore();
  }
  return { x: dx, y: dy, k: Ly.k };
}
// highest crown (canvas y) over [t0, t1] in layout Ly: matte-measured hair top from prep (D.crown), else ~.2 face-heights above the face box
function crownAt(t0, t1, Ly) { let m = 1e9; for (let k = Math.round(t0 * FPS); k <= Math.min(D.N - 1, Math.round(t1 * FPS)); k++) { const f = D.face[Math.min(k, D.face.length - 1)]; m = Math.min(m, D.crown ? D.crown[Math.min(k, D.crown.length - 1)] : f[1] - .2 * (f[3] - f[1])); } return Ly.dy + m * Ly.k; }
// baseline that lets the head bite `bite` of the cap height out of a headline drawn behind the speaker
function behindY(t0, t1, Ly, size, fam = "IDBlack", bite = .16) { font(fam, size); return crownAt(t0, t1, Ly) + ctx.measureText("H").actualBoundingBoxAscent * bite; }
// plate top (dy) for a card layout so the speaker's head sticks out of the card's top edge by `pop` px (median crown of the clip)
function popDy(cardTop, k, pop = 120) { const c = (D.crown || D.face.map(f => f[1] - .2 * (f[3] - f[1]))).slice().sort((a, b) => a - b); return cardTop - pop - c[c.length >> 1] * k; }
// CONTAINER LAYOUT (Nov 8, 2026): the plate always reaches the card's bottom edge (no black gap under the speaker) and the head still pops
// out of the top by `pop`. k is raised only as far as needed: cardTop - pop + (H - crown)·k >= cardBottom + 6, and k·W >= card width.
function fitCard(card, k, pop = 120) { const c = (D.crown || D.face.map(f => f[1] - .2 * (f[3] - f[1]))).slice().sort((a, b) => a - b), cr = c[c.length >> 1];
  const kk = Math.max(k, (card[3] + pop + 6) / (H - cr), (card[2] + 8) / W); return L({ k: kk, dy: popDy(card[1], kk, pop), card }); }
function faceRect(k, S) { const f = D.face[Math.min(k, D.face.length - 1)]; return [S.x + f[0] * S.k, S.y + f[1] * S.k, (f[2] - f[0]) * S.k, (f[3] - f[1]) * S.k]; }

// ---------- materials ----------
function brackets(X, Y, w, h, Lb = 30, col = "rgba(220,210,255,.8)") {
  ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.lineCap = "round";
  [[X, Y, 1, 1], [X + w, Y, -1, 1], [X, Y + h, 1, -1], [X + w, Y + h, -1, -1]].forEach(([a, b, sx, sy]) => { ctx.beginPath(); ctx.moveTo(a, b + sy * Lb); ctx.lineTo(a, b); ctx.lineTo(a + sx * Lb, b); ctx.stroke(); });
}
function glassPanel(X, Y, w, h, r = 28, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 18; rr(X, Y, w, h, r); ctx.fillStyle = o.fill ?? "rgba(16,19,50,.72)"; ctx.fill(); ctx.restore();
  if (o.glow) { ctx.save(); ctx.shadowColor = o.glow; ctx.shadowBlur = 40; rr(X, Y, w, h, r); ctx.strokeStyle = "rgba(0,0,0,0)"; ctx.fillStyle = "rgba(0,0,0,0.01)"; ctx.fill(); ctx.restore(); }
  const g = ctx.createLinearGradient(X, Y, X, Y + h); g.addColorStop(0, "rgba(255,255,255,.09)"); g.addColorStop(.4, "rgba(255,255,255,0)"); rr(X, Y, w, h, r); ctx.fillStyle = g; ctx.fill();
  rr(X + .75, Y + .75, w - 1.5, h - 1.5, r); ctx.strokeStyle = o.edge ?? "rgba(170,150,255,.30)"; ctx.lineWidth = 1.5; ctx.stroke();
  if (o.sweep != null) { ctx.save(); rr(X, Y, w, h, r); ctx.clip(); const sx = lerp(X - 300, X + w + 300, o.sweep); const sg = ctx.createLinearGradient(sx - 160, Y, sx + 160, Y + h); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(.5, "rgba(255,255,255,.12)"); sg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = sg; ctx.fillRect(X, Y, w, h); ctx.restore(); }
  ctx.restore();
}
function iconTile(name, cx, cy, s = 120, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, cy); ctx.rotate(o.tilt ?? 0); ctx.scale(o.sc ?? 1, o.sc ?? 1);
  ctx.shadowColor = o.glowCol ?? "rgba(123,97,255,.75)"; ctx.shadowBlur = s * .45; ctx.shadowOffsetY = s * .12;
  const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, o.top ?? "#9C86FF"); g.addColorStop(1, o.bot ?? "#5A3FE0");
  rr(-s / 2, -s / 2, s, s, s * .28); ctx.fillStyle = g; ctx.fill(); noShadow();
  const hl = ctx.createLinearGradient(0, -s / 2, 0, 0); hl.addColorStop(0, "rgba(255,255,255,.38)"); hl.addColorStop(1, "rgba(255,255,255,0)");
  rr(-s / 2 + 4, -s / 2 + 4, s - 8, s * .5, s * .25); ctx.fillStyle = hl; ctx.fill();
  rr(-s / 2, -s / 2, s, s, s * .28); ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.stroke();
  const ic = ICON[name] || LOGO[name]; if (ic) { const kk = s * (o.icK ?? .46); ctx.drawImage(ic, -kk / 2, -kk / 2, kk, kk); }
  else if (o.text) { font(o.fam ?? "Anton", s * .62); ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(o.text, 0, s * .04); ctx.textBaseline = "alphabetic"; }
  ctx.restore();
}
function logoTile(name, cx, cy, s, o = {}) {   // glossy 3D glass tile with a real logo; o.ry turns it in space (pass a slow sin of t)
  const ry = o.ry ?? 0, kx = Math.max(.08, Math.cos(ry)), side = -Math.sin(ry), dep = s * .11;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, cy); ctx.rotate(o.tilt ?? 0); ctx.scale(o.sc ?? 1, o.sc ?? 1);
  ctx.shadowColor = o.glow ?? "rgba(123,97,255,.6)"; ctx.shadowBlur = s * .4; ctx.shadowOffsetY = s * .12;
  for (let i = 8; i >= 1; i--) { const f = i / 8; ctx.save(); ctx.translate(side * dep * f, dep * .35 * f); ctx.scale(kx, 1); rr(-s / 2, -s / 2, s, s, s * .26); ctx.fillStyle = i > 4 ? "#06071A" : "#141640"; ctx.fill(); ctx.restore(); noShadow(); }   // extruded body
  ctx.scale(kx, 1);
  const g = ctx.createLinearGradient(0, -s / 2, 0, s / 2); g.addColorStop(0, o.top ?? "#2A2F5E"); g.addColorStop(1, o.bot ?? "#0D1030"); rr(-s / 2, -s / 2, s, s, s * .26); ctx.fillStyle = g; ctx.fill();
  ctx.save(); rr(-s / 2, -s / 2, s, s, s * .26); ctx.clip();   // specular band that slides as it turns
  const hx = Math.sin(ry) * s * .9, sg = ctx.createLinearGradient(hx - s * .5, -s / 2, hx + s * .5, s / 2); sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(.5, "rgba(255,255,255,.22)"); sg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = sg; ctx.fillRect(-s, -s, 2 * s, 2 * s);
  const hl = ctx.createLinearGradient(0, -s / 2, 0, 0); hl.addColorStop(0, "rgba(255,255,255,.2)"); hl.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = hl; ctx.fillRect(-s / 2, -s / 2, s, s / 2); ctx.restore();
  rr(-s / 2, -s / 2, s, s, s * .26); ctx.strokeStyle = "rgba(215,200,255,.55)"; ctx.lineWidth = 2 / kx; ctx.stroke();
  const Lg = LOGO[name]; if (Lg) { const kk = s * (o.k ?? .56); ctx.drawImage(Lg, -kk / 2, -kk / 2, kk, kk); }
  ctx.restore();
}
function eyebrow(t, cx, y, o = {}) {
  font("JBM", o.size ?? 28, o.ls ?? 10); ctx.textAlign = o.align ?? "center"; ctx.fillStyle = o.col ?? C.lav; ctx.globalAlpha = (o.alpha ?? 1) * .92;
  ctx.fillText((o.dot ? "•  " : "") + t, cx, y); ctx.globalAlpha = 1;
}
// soft reveal: rise + blur-to-sharp + tracking settle; returns false when not visible
function reveal(t, t0, exitT, d = .45) { if (t < t0) return null; const ex = exitT != null ? eInCubic(P(t, exitT, .25)) : 0; if (ex >= 1) return null;
  const q = eOutQuint(P(t, t0, d)), a = clamp(P(t, t0, .18)) * (1 - ex); return { a, dy: (1 - q) * 36 + ex * -18, blur: (1 - clamp(P(t, t0, .25))) * 8 + ex * 6, ls: (1 - eOutQuint(P(t, t0, .6))) * 6, s: q }; }
function headText(str, x, y, fam, size, fill, t, t0, exitT, o = {}) {
  const r = reveal(t, t0, exitT); if (!r) return 0;
  ctx.save(); ctx.globalAlpha = r.a; font(fam, size, (o.ls ?? (fam === "IDBlack" ? -size * .04 : fam === "Anton" ? 2 : 0)) + r.ls); ctx.textAlign = o.align ?? "center";
  const f = typeof fill === "function" ? fill(y - size, y) : fill;
  if (r.blur > .3) ctx.filter = `blur(${r.blur.toFixed(1)}px)`;
  ctx.shadowColor = o.glow ?? "rgba(140,110,255,.55)"; ctx.shadowBlur = 40; ctx.fillStyle = f; ctx.fillText(str, x, y + r.dy); noShadow(); ctx.fillText(str, x, y + r.dy);
  ctx.restore(); return ctx.measureText(str).width;
}
// mixed line (Inter Black + serif emphasis); segs [{t, serif, fill}]
function mixHead(segs, cx, y, size, t, t0, exitT, o = {}) {
  const ws = segs.map(s => { font(s.serif ? "ISerif" : s.anton ? "Anton" : "IDBlack", s.serif ? size * 1.2 : s.anton ? size * 1.15 : size, s.serif ? 0 : s.anton ? 2 : -size * .04); return ctx.measureText(s.t).width; });
  let x = o.align === "left" ? cx : cx - ws.reduce((a, b) => a + b, 0) / 2;
  segs.forEach((s, i) => { headText(s.t, x, y + (s.serif ? size * .03 : 0), s.serif ? "ISerif" : s.anton ? "Anton" : "IDBlack", s.serif ? size * 1.2 : s.anton ? size * 1.15 : size, s.fill ?? (s.serif ? heroGrad : C.white), t, t0 + (s.d ?? 0), exitT, { align: "left" }); x += ws[i]; });
}
// 3D extruded text (keyword slam)
const maskCache = new Map();
function glyphMask(str, fam, size, ls, fill) {
  const key = [str, fam, size, ls, fill].join("|"); if (maskCache.has(key)) return maskCache.get(key);
  ctx.save(); font(fam, size, ls); const w = Math.ceil(ctx.measureText(str).width) + 60; ctx.restore();
  const c = document.createElement("canvas"); c.width = w; c.height = Math.ceil(size * 1.5); const g = c.getContext("2d");
  g.font = `${size}px ${fam}`; g.letterSpacing = `${ls}px`; g.textBaseline = "middle"; g.textAlign = "center";
  g.fillStyle = fill === "hero" ? heroGrad(c.height * .15, c.height * .85, g) : fill; g.fillText(str, w / 2, c.height / 2);
  const res = { c, w, h: c.height }; maskCache.set(key, res); return res;
}
function text3D(str, cx, cy, size, o) {
  const fam = o.fam ?? "IDBlack", ls = o.ls ?? -size * .035;
  const face = glyphMask(str, fam, size, ls, o.face ?? "hero"), side = glyphMask(str, fam, size, ls, o.side ?? "#2A1C7A"), sideL = glyphMask(str, fam, size, ls, o.sideLight ?? "#4A35B8");
  const depth = o.depth ?? 24, ry = o.ry ?? 0, rx = o.rx ?? 0, s = o.scale ?? 1, kx = Math.cos(ry) * s, ky = Math.cos(rx) * s, dxs = -Math.sin(ry) * 1.15, dys = Math.sin(rx) * 1.15 + .55;
  ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.translate(cx, cy);
  ctx.save(); ctx.shadowColor = "rgba(123,97,255,.8)"; ctx.shadowBlur = 60; ctx.drawImage(side.c, -side.w / 2 * kx, -side.h / 2 * ky + depth, side.w * kx, side.h * ky); ctx.restore();
  for (let i = depth; i >= 1; i--) ctx.drawImage(i / depth > .5 ? side.c : sideL.c, -face.w / 2 * kx + i * dxs, -face.h / 2 * ky + i * dys, face.w * kx, face.h * ky);
  ctx.drawImage(face.c, -face.w / 2 * kx, -face.h / 2 * ky, face.w * kx, face.h * ky); ctx.restore();
}

function typedStr(str, t, t0, t1) { return str.slice(0, Math.round(str.length * clamp((t - t0) / (t1 - t0)))); }
// ---------- reference typography + structure (Oct 27 2026) ----------
function deepGrad(y0, y1, c = ctx) { const g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, "#EEE8FF"); g.addColorStop(.5, "#B7A2FF"); g.addColorStop(1, "#7B5CF5"); return g; }
// font size that makes str exactly maxW wide (edge-to-edge "20 MINUTOS" lines that bleed past the frame)
function fitSize(str, fam, maxW, ls = -.045, max = 420) { font(fam, 100, ls * 100); return Math.min(max, 100 * maxW / ctx.measureText(str).width); }
// stacked headline: lines overlap (lead < 1), each later line casts a soft contact shadow onto the one above it,
// so the stack reads as layered type. lines: [{t, fam, size, fill, d, ls}]; returns the bottom baseline
function stackHead(lines, cx, y0, t, t0, exitT, o = {}) {
  const align = o.align ?? "center", lsOf = ln => ln.ls ?? ((ln.fam ?? "IDBlack") === "Anton" ? ln.size * .01 : -ln.size * .045);
  const asc = ln => { font(ln.fam ?? "IDBlack", ln.size, lsOf(ln)); return ctx.measureText("H").actualBoundingBoxAscent; };
  const step = (ln, i) => asc(ln) - (o.overlap ?? .045) * lines[i - 1].size;
  let y = o.bottom != null ? o.bottom - lines.slice(1).reduce((s, ln, j) => s + step(ln, j + 1), 0) : y0;   // o.bottom pins the last baseline (e.g. to behindY)
  // o.eyebrow: {t, size, ls, col, gap, minY, t0} -> the eyebrow sits `gap` px above the stack's real top; if that would go above minY,
  // the whole stack moves DOWN instead (an eyebrow is never covered by its own headline)
  if (o.eyebrow) {
    const e = o.eyebrow, top = y - asc(lines[0]), ey = top - (e.gap ?? 40), minY = e.minY ?? 128;
    if (ey < minY) y += minY - ey;
    const r = reveal(t, e.t0 ?? t0 - .08, exitT); if (r) { ctx.save(); ctx.globalAlpha = r.a; eyebrow(e.t, align === "center" ? cx : cx + 4, Math.max(minY, ey) + r.dy * .4, { size: e.size ?? 28, ls: (e.ls ?? 10) + r.ls, col: e.col, align }); ctx.restore(); }
  }
  lines.forEach((ln, i) => {
    const size = ln.size, fam = ln.fam ?? "IDBlack", ls = lsOf(ln);
    if (i) y += step(ln, i);
    const r = reveal(t, t0 + (ln.d ?? i * .12), exitT, .5); if (!r) return;
    ctx.save(); ctx.globalAlpha = r.a; font(fam, size, ls + r.ls); ctx.textAlign = align;
    const yy = y + r.dy * (o.rise ?? .8), f = typeof ln.fill === "function" ? ln.fill(yy - size * .78, yy + size * .05) : (ln.fill ?? heroGrad(yy - size * .78, yy + size * .05));
    if (r.blur > .3) ctx.filter = `blur(${r.blur.toFixed(1)}px)`;
    ctx.shadowColor = o.glow ?? "rgba(140,110,255,.32)"; ctx.shadowBlur = size * .2; ctx.fillStyle = f; ctx.fillText(ln.t, cx, yy);   // quiet violet bloom
    ctx.shadowColor = o.shadow ?? "rgba(3,3,18,.7)"; ctx.shadowBlur = size * .16; ctx.shadowOffsetY = size * .055; ctx.fillText(ln.t, cx, yy);   // contact shadow onto the line above
    noShadow(); ctx.restore();
  });
  return y;
}
// highlight-bar tag line: a violet bar wipes in, then the serif-italic text settles inside it (ref: "Motion Graphics" bar)
function barTag(str, cx, y, size, t, t0, exitT, o = {}) {
  if (t < t0) return; const ex = exitT != null ? eInCubic(P(t, exitT, .25)) : 0; if (ex >= 1) return;
  font(o.fam ?? "ISerif", size); const tw = ctx.measureText(str).width, padX = size * .28, w = tw + padX * 2, h = size * 1.12, X = (o.align === "left" ? cx : cx - w / 2), Y = y - h * .78;
  const wp = eOutExpo(P(t, t0, .45)), tp = clamp(P(t, t0 + .18, .3));
  ctx.save(); ctx.globalAlpha = 1 - ex;
  ctx.shadowColor = "rgba(123,97,255,.65)"; ctx.shadowBlur = 30; rr(X, Y, w * wp, h, 10); const g = ctx.createLinearGradient(X, Y, X + w, Y + h); g.addColorStop(0, o.from ?? "#8C72FF"); g.addColorStop(1, o.to ?? "#5A3FE0"); ctx.fillStyle = g; ctx.fill(); noShadow();
  rr(X, Y, w * wp, h * .5, 10); ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill();
  ctx.save(); rr(X, Y, w * wp, h, 10); ctx.clip(); font(o.fam ?? "ISerif", size); ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.globalAlpha *= tp;
  if (tp < 1) ctx.filter = `blur(${((1 - tp) * 8).toFixed(1)}px)`; ctx.fillText(str, X + padX, y + (1 - eOutCubic(tp)) * 14); ctx.restore();
  ctx.restore();
}
// floating phone / screenshot card with a white bezel, turned in 3D (rotY ±) and parked behind the speaker's shoulder
function phoneCard(cx, cy, w, h, rotY, t, t0, exitT, draw, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return; const s = spring(t, t0, 1.7, .62), bob = Math.sin(t * 1.1 + cx) * 7;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx + (1 - s) * (rotY < 0 ? -90 : 90), cy + bob + (1 - s) * 40);
  const k = Math.cos(rotY), sk = Math.sin(rotY) * .28; ctx.transform(k, sk, 0, 1, 0, 0); ctx.rotate(o.tilt ?? 0);
  ctx.save(); ctx.shadowColor = "rgba(0,0,12,.65)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 34; rr(-w / 2, -h / 2, w, h, 34); ctx.fillStyle = "#EDEBFA"; ctx.fill(); ctx.restore();
  const bz = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); bz.addColorStop(0, "#FFFFFF"); bz.addColorStop(1, "#C9C3E8"); rr(-w / 2, -h / 2, w, h, 34); ctx.fillStyle = bz; ctx.fill();
  const b = o.bezel ?? 14; ctx.save(); rr(-w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, 24); ctx.clip(); ctx.fillStyle = "#0B0D26"; ctx.fillRect(-w / 2, -h / 2, w, h);
  draw(-w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b); ctx.restore();
  const gl = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, 0); gl.addColorStop(0, "rgba(255,255,255,.25)"); gl.addColorStop(.35, "rgba(255,255,255,0)"); rr(-w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, 24); ctx.fillStyle = gl; ctx.fill();
  ctx.restore();
}
// step flow inside a dark glass panel: [icon tile] -> [icon tile] -> [icon tile], each with title + subtitle (ref: "Abre espaço para explicar")
function flowPanel(X, Y, w, h, steps, t, t0, exitT) {
  const a = vis(t, t0, exitT); if (!a) return; ctx.save(); ctx.globalAlpha *= a;
  glassPanel(X, Y, w, h, 30, { fill: "rgba(20,18,58,.72)", edge: "rgba(190,170,255,.32)", sweep: P(t, t0 + .3, 1.1) });
  const n = steps.length, cw = w / n;
  steps.forEach((s, i) => {
    const ti = s.t0 ?? t0 + .15 + i * .35, sc = popS(t, ti, exitT); if (sc < .01) return; const cx = X + cw * i + cw / 2, ty = Y + h * .36;
    iconTile(s.icon, cx, ty, h * .34, { sc });
    ctx.save(); ctx.globalAlpha *= clamp(P(t, ti + .08, .25)); font("IDBlack", h * .12, -1); ctx.textAlign = "center"; ctx.fillStyle = C.white; ctx.fillText(s.title, cx, Y + h * .74);
    font("IDMed", h * .085); ctx.fillStyle = "rgba(220,214,255,.68)"; ctx.fillText(s.sub ?? "", cx, Y + h * .87); ctx.restore();
    if (i < n - 1) { const ap = clamp(P(t, ti + .2, .3)); ctx.save(); ctx.globalAlpha *= ap; ctx.strokeStyle = "rgba(205,190,255,.75)"; ctx.lineWidth = 3; ctx.lineCap = "round"; const x0 = X + cw * (i + 1) - 26, x1 = x0 + 52 * eOutCubic(ap);
      ctx.beginPath(); ctx.moveTo(x0, ty); ctx.lineTo(x1, ty); ctx.moveTo(x1 - 10, ty - 9); ctx.lineTo(x1, ty); ctx.lineTo(x1 - 10, ty + 9); ctx.stroke(); ctx.restore(); }
  });
  ctx.restore();
}
// row of glossy icon tiles with labels underneath (ref: Aula / Podcast / YouTube / Reels)
function iconRow(items, X0, X1, y, s, t, exitT) {
  items.forEach((it, i) => { const cx = lerp(X0, X1, items.length > 1 ? i / (items.length - 1) : .5), sc = popS(t, it.t0, exitT); if (sc < .01) return;
    iconTile(it.icon, cx, y + Math.sin(t * 1.6 + i) * 5, s, { sc, tilt: (i % 2 ? .05 : -.05) });
    ctx.save(); ctx.globalAlpha *= clamp(sc); font("IDBlack", s * .3, -1); ctx.textAlign = "center"; ctx.fillStyle = C.white; ctx.shadowColor = "rgba(0,0,10,.7)"; ctx.shadowBlur = 14; ctx.fillText(it.label, cx, y + s * .9); ctx.restore(); });
}
// checklist rows that tick on time (pending = spinner, done = mint check)
function checklist(X, Y, items, t, o = {}) {
  const lh = o.lh ?? 56; items.forEach((it, i) => { const a = clamp(P(t, it.show ?? it.t0 - .4, .25)); if (!a) return; const done = t >= it.t0, y = Y + i * lh, cp = spring(t, it.t0, 2.6, .5);
    ctx.save(); ctx.globalAlpha *= a; ctx.translate((1 - eOutCubic(a)) * -20, 0);
    ctx.lineWidth = 2.5; ctx.strokeStyle = done ? C.mint : "rgba(205,190,255,.6)"; ctx.beginPath(); ctx.arc(X + 16, y - 10, 15, 0, 7); ctx.stroke();
    if (done) { ctx.save(); ctx.translate(X + 16, y - 10); ctx.scale(cp, cp); ctx.strokeStyle = C.mint; ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-2, 6); ctx.lineTo(8, -6); ctx.stroke(); ctx.restore(); }
    else { ctx.strokeStyle = C.lav; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X + 16, y - 10, 8, t * 6, t * 6 + 4.2); ctx.stroke(); }
    font("IDBold", o.size ?? 32, -.5); ctx.textAlign = "left"; ctx.fillStyle = done ? C.white : "rgba(235,230,255,.7)"; ctx.fillText(it.text, X + 46, y); ctx.restore(); });
}
// labelled progress bar inside a glass panel (EXPORTANDO 72%)
function progressPanel(X, Y, w, label, pct, sub, t, t0, exitT) {
  const a = vis(t, t0, exitT); if (!a) return; ctx.save(); ctx.globalAlpha *= a;
  glassPanel(X, Y, w, 150, 26, { fill: "rgba(16,19,50,.8)" }); eyebrow(label, X + 30, Y + 46, { align: "left", size: 22, ls: 7 }); eyebrow(Math.round(pct * 100) + "%", X + w - 30, Y + 46, { align: "right", size: 22, ls: 3, col: C.white });
  rr(X + 30, Y + 66, w - 60, 16, 8); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fill(); const g = ctx.createLinearGradient(X + 30, 0, X + w - 30, 0); g.addColorStop(0, "#9C86FF"); g.addColorStop(1, C.violet);
  rr(X + 30, Y + 66, Math.max(16, (w - 60) * pct), 16, 8); ctx.fillStyle = g; ctx.fill();
  if (sub) { font("IDBold", 30, -.5); ctx.fillStyle = "rgba(235,230,255,.8)"; ctx.textAlign = "left"; ctx.fillText(sub, X + 30, Y + 126); }
  ctx.restore();
}
function vis(t, t0, exitT) { if (t < t0) return 0; return clamp(P(t, t0, .3)) * (exitT != null ? 1 - clamp(P(t, exitT, .3)) : 1); }
function popS(t, t0, exitT) { return (t <= t0 ? 0 : eOutBack(P(t, t0, .42))) * (exitT != null ? 1 - eInCubic(P(t, exitT, .28)) : 1); }

// ---------- layout helpers promoted from the first reference scene ----------
function wrap(str, maxW, fam, size, ls = 0) { font(fam, size, ls); const out = []; let cur = ""; for (const w of str.split(" ")) { const tr = cur ? cur + " " + w : w; if (ctx.measureText(tr).width > maxW && cur) { out.push(cur); cur = w; } else cur = tr; } if (cur) out.push(cur); return out; }
function chip(text, x, y, t, t0, exitT, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return 0; const s = spring(t, t0, 2.4, .55);
  font("JBM", o.size ?? 24, 6); const tw = ctx.measureText(text).width, ic = o.icon ? (o.size ?? 24) * 1.3 + 12 : 0, w = tw + ic + 44, h = (o.size ?? 24) * 2.1;
  const X = o.align === "left" ? x : x - w / 2;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(X + w / 2, y); ctx.scale(lerp(.8, 1, s), lerp(.8, 1, s)); ctx.translate(-w / 2, 0);
  glassPanel(0, -h / 2, w, h, h / 2, { fill: o.fill ?? "rgba(20,18,58,.8)", edge: o.edge ?? "rgba(190,170,255,.55)" });
  if (o.icon && ICON[o.icon]) { const s2 = (o.size ?? 24) * 1.3; ctx.drawImage(ICON[o.icon], 22, -s2 / 2, s2, s2); }
  font("JBM", o.size ?? 24, 6); ctx.fillStyle = o.col ?? C.lav; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, 22 + ic, 2); ctx.textBaseline = "alphabetic";
  ctx.restore(); return w;
}
function planeQuad(cx, cy, w, h, d, label, t, t0, exitT, draw) {
  const a = vis(t, t0, exitT); if (!a) return; const s = spring(t, t0, 1.8, .6);
  ctx.save(); ctx.globalAlpha = a * (1 - d * .12); ctx.translate(cx - d * 64 * s, cy - d * 118 * s + (1 - s) * 60); ctx.transform(1, -.12, .06, 1, 0, 0); ctx.scale(1 - d * .04, 1 - d * .04);
  rr(-w / 2, -h / 2, w, h, 26); ctx.fillStyle = "rgba(14,14,46,.82)"; ctx.fill();
  ctx.save(); rr(-w / 2, -h / 2, w, h, 26); ctx.clip(); draw(w, h); ctx.restore();
  ctx.save(); ctx.shadowColor = "rgba(150,120,255,.9)"; ctx.shadowBlur = 22; rr(-w / 2, -h / 2, w, h, 26); ctx.strokeStyle = "rgba(195,175,255,.85)"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  font("JBM", 20, 5); const lw = ctx.measureText(label).width + 36; rr(-w / 2 + 22, -h / 2 - 19, lw, 38, 10); ctx.fillStyle = "rgba(20,16,52,.95)"; ctx.fill(); ctx.strokeStyle = "rgba(190,170,255,.65)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = C.lav; ctx.textAlign = "left"; ctx.fillText(label, -w / 2 + 40, -h / 2 + 7); ctx.restore();
}
function rowCard(X, Y, w, h, icon, title, sub, t, t0, exitT, active) {
  const a = vis(t, t0, exitT); if (!a) return; const s = spring(t, t0, 2, .6);
  ctx.save(); ctx.globalAlpha = a; ctx.translate((1 - s) * -40, 0);
  glassPanel(X, Y, w, h, 24, { edge: active ? "rgba(200,182,255,.85)" : "rgba(170,150,255,.25)", fill: active ? "rgba(44,34,120,.82)" : "rgba(16,19,50,.72)" });
  iconTile(icon, X + 58, Y + h / 2, 72, { sc: lerp(.6, 1, spring(t, t0 + .05, 2.6, .5)) });
  font("IDBlack", 34, -1); ctx.textAlign = "left"; ctx.fillStyle = C.white; ctx.fillText(title, X + 112, Y + (sub ? h / 2 - 6 : h / 2 + 12));
  if (sub) { const ls = wrap(sub, w - 130, "IDMed", 23); font("IDMed", 23); ctx.fillStyle = "rgba(220,214,255,.72)"; ls.slice(0, 2).forEach((l, i) => ctx.fillText(l, X + 112, Y + h / 2 + 26 + i * 27)); }
  ctx.restore();
}

// glossy violet gift box. open 0..1 lifts and tips the lid; burst 0..1 throws light rays + sparkles out of it
function giftBox(cx, cy, s, t, o = {}) {
  const open = clamp(o.open ?? 0), burst = clamp(o.burst ?? 0), sc = o.sc ?? 1; if (sc < .01) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, cy); ctx.rotate(o.tilt ?? 0); ctx.scale(sc, sc);
  if (burst > 0) {   // rays fan out of the opening, sparkles drift up
    ctx.save(); ctx.globalCompositeOperation = "screen"; const ry = -s * .32;
    for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .2 + Math.sin(t * 1.3 + i) * .03, L = s * (1.1 + .5 * hsh(i, 7)) * (o.rays ?? 1) * eOutQuint(burst);
      const gr = ctx.createLinearGradient(0, ry, Math.cos(a) * L, ry + Math.sin(a) * L); gr.addColorStop(0, `rgba(220,205,255,${.5 * (1 - burst * .4)})`); gr.addColorStop(1, "rgba(160,130,255,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(Math.cos(a - .07) * L, ry + Math.sin(a - .07) * L); ctx.lineTo(Math.cos(a + .07) * L, ry + Math.sin(a + .07) * L); ctx.closePath(); ctx.fill(); }
    for (let i = 0; i < 16; i++) { const ph = (burst * 1.4 + hsh(i, 3)) % 1, x = (hsh(i, 1) - .5) * s * 1.2 * (.4 + ph), y = ry - ph * s * 1.3, r = (1.5 + hsh(i, 2) * 3.5) * (1 - ph);
      ctx.fillStyle = `rgba(240,232,255,${.9 * (1 - ph)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    ctx.restore(); }
  ctx.shadowColor = "rgba(123,97,255,.7)"; ctx.shadowBlur = s * .35; ctx.shadowOffsetY = s * .1;
  const bw = s, bh = s * .62, by = -s * .18;   // body
  let g = ctx.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, "#8E76FF"); g.addColorStop(1, "#4F35D2"); rr(-bw / 2, by, bw, bh, s * .1); ctx.fillStyle = g; ctx.fill(); noShadow();
  ctx.fillStyle = "rgba(255,255,255,.1)"; rr(-bw / 2 + 4, by + 4, bw - 8, bh * .35, s * .08); ctx.fill();
  ctx.fillStyle = "#E9E2FF"; ctx.fillRect(-s * .07, by, s * .14, bh);   // ribbon
  const fly = clamp(o.fly ?? 0);   // fly 0..1 throws the lid off-screen up-left and fades it
  ctx.save(); ctx.globalAlpha *= 1 - eInCubic(fly); ctx.translate(-s * .55 * open * .25 - s * 1.4 * eOutQuint(fly), by - open * s * .55 - s * 1.8 * eOutQuint(fly)); ctx.rotate(-open * .5 - fly * 1.2);   // lid
  const lw = s * 1.12, lh = s * .2; g = ctx.createLinearGradient(0, -lh, 0, 0); g.addColorStop(0, "#A994FF"); g.addColorStop(1, "#6448F0"); rr(-lw / 2, -lh, lw, lh, s * .06); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#E9E2FF"; ctx.fillRect(-s * .07, -lh, s * .14, lh);
  ctx.strokeStyle = "#E9E2FF"; ctx.lineWidth = s * .055; ctx.lineCap = "round";   // bow
  for (const d of [-1, 1]) { ctx.beginPath(); ctx.ellipse(d * s * .13, -lh - s * .07, s * .13, s * .07, d * -.5, 0, 7); ctx.stroke(); }
  ctx.restore(); ctx.restore();
}

// the promised file, locked: a light glass document under frosted blur with a lock badge. reveal 0..1 unblurs it and opens the lock
function lockedFile(cx, cy, w, h, t, o = {}) {
  const sc = o.sc ?? 1, rv = clamp(o.reveal ?? 0); if (sc < .01) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, cy + Math.sin(t * 1.2 + cx) * 6); ctx.rotate(o.tilt ?? 0); ctx.scale(sc * Math.cos(o.ry ?? 0), sc);
  glassPanel(-w / 2, -h / 2, w, h, 28, { fill: "rgba(236,232,255,.95)", edge: "rgba(255,255,255,.9)", sweep: o.sweep });
  ctx.fillStyle = "rgba(123,97,255,.22)"; ctx.beginPath(); ctx.moveTo(w / 2 - 56, -h / 2); ctx.lineTo(w / 2, -h / 2 + 56); ctx.lineTo(w / 2 - 56, -h / 2 + 56); ctx.closePath(); ctx.fill();
  ctx.save(); rr(-w / 2, -h / 2, w, h, 28); ctx.clip(); if (rv < 1) ctx.filter = `blur(${((1 - eOutQuint(rv)) * 9).toFixed(1)}px)`;
  iconTile("file-text", -w / 2 + 64, -h / 2 + 78, w * .24); font("JBM", w * .062, w * .015); ctx.fillStyle = "#3B2D9C"; ctx.textAlign = "left";
  (o.title ?? tx("file")).forEach((l, i) => ctx.fillText(l, -w / 2 + 34, -h / 2 + h * .45 + i * w * .09));
  ctx.fillStyle = "#D4CCFF"; [.72, .58, .66, .5, .64].forEach((f, i) => { rr(-w / 2 + 34, -h / 2 + h * .62 + i * h * .07, (w - 68) * f, h * .03, 4); ctx.fill(); });
  ctx.restore();
  if (rv < 1) {   // frost + lock badge
    ctx.save(); ctx.globalAlpha *= 1 - eOutQuint(rv); rr(-w / 2, -h / 2, w, h, 28); ctx.fillStyle = "rgba(235,230,255,.35)"; ctx.fill();
    const ls = w * .36 * (1 + .18 * eOutQuint(P(rv, 0, .4))); iconTile(rv > .15 ? "lock-open" : "lock", 0, 0, ls, { tilt: Math.sin(t * 1.4) * .04 }); ctx.restore(); }
  ctx.restore();
}

// ---------- element library v4 (Oct 27, 2026): depth-native devices beyond the reference set ----------
// ORBIT: tiles circle the speaker's head on a tilted ellipse, passing BEHIND them (call with layer "back" in SCENE.back)
// and IN FRONT of them (layer "front" in SCENE.front). items: [{ logo | icon, s, phase }]
function orbit(t, layer, cx, cy, rx, ry, items, o = {}) {
  const a0 = (o.speed ?? .55) * t, a = vis(t, o.t0 ?? -1, o.exitT); if (!a) return;
  items.forEach((it, i) => {
    const th = a0 + (it.phase ?? i * 2 * Math.PI / items.length), z = Math.sin(th);   // z > 0: in front of the speaker
    if ((layer === "front") !== (z > 0)) return;
    const x = cx + Math.cos(th) * rx, y = cy + z * ry * (o.tiltY ?? .35) + Math.cos(th) * (o.lean ?? 0), k = lerp(.72, 1.08, (z + 1) / 2), sc = popS(t, (o.t0 ?? -1) + i * .1, o.exitT) * k;
    let guard = 1;   // faces are sacred: a front-pass item fades out before it can touch the face box
    if (layer === "front" && window.FACE) { const [fx, fy, fw, fh] = window.FACE, hs = (it.s ?? 110) * k / 2, dx = Math.max(fx - (x + hs), x - hs - (fx + fw), 0), dy = Math.max(fy - (y + hs), y - hs - (fy + fh), 0); guard = clamp(Math.max(dx, dy) / 40); }
    if (guard <= 0) return;
    ctx.save(); ctx.globalAlpha *= a * lerp(.55, 1, (z + 1) / 2) * guard;
    if (it.logo) logoTile(it.logo, x, y, it.s ?? 110, { sc, ry: -Math.cos(th) * .7, k: it.k }); else iconTile(it.icon, x, y, it.s ?? 100, { sc, tilt: Math.cos(th) * .12 });
    ctx.restore();
  });
}
// pt-BR number format: 1250.5 -> "1.250,50" (dec = decimals)
function brNum(v, dec = 0) { const [i, d] = Math.abs(v).toFixed(dec).split("."); return (v < 0 ? "−" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (d ? "," + d : ""); }
// NUMBER ROLL: odometer digits, each column rolls to its value with motion blur; lands on t0 + d
function numberRoll(value, cx, cy, size, t, t0, d, o = {}) {
  if (t < t0 - .05) return; const str = (o.prefix ?? "") + brNum(value, o.dec ?? 0) + (o.suffix ?? ""), fam = o.fam ?? "Anton";
  ctx.save(); ctx.globalAlpha *= vis(t, t0 - .05, o.exitT); font(fam, size, size * .01); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const ws = [...str].map(ch => ctx.measureText(ch).width), W0 = ws.reduce((a, b) => a + b, 0); let x = cx - W0 / 2, di = 0;
  const nd = [...str].filter(ch => /\d/.test(ch)).length;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - W0 / 2 - 20, cy - size * .9, W0 + 40, size * .97); ctx.clip();
  [...str].forEach((ch, i) => {
    const fill = typeof o.fill === "function" ? o.fill(cy - size * .8, cy) : (o.fill ?? heroGrad(cy - size * .8, cy));
    if (/\d/.test(ch)) {   // digits further right settle later, and spin more
      const p = eOutQuint(P(t, t0 + (di / Math.max(1, nd)) * d * .35, d * .8)), target = +ch, spins = 1 + (nd - di), pos = (target + 10 * spins) * p, frac = pos % 1, cur = Math.floor(pos) % 10, vel = 1 - p;
      if (vel > .02) ctx.filter = `blur(${(vel * 6).toFixed(1)}px)`;
      for (const [dg, off] of frac > .002 ? [[cur, -frac], [(cur + 1) % 10, 1 - frac]] : [[cur, 0]]) { ctx.fillStyle = fill; ctx.shadowColor = "rgba(140,110,255,.45)"; ctx.shadowBlur = size * .15; ctx.fillText(String(dg), x, cy + off * size * .95); }
      ctx.filter = "none"; di++;
    } else { ctx.fillStyle = fill; ctx.fillText(ch, x, cy); }
    x += ws[i];
  });
  ctx.restore(); noShadow(); ctx.restore();
}
// TOAST: iOS-style notification glass slides down from the top; app = real logo name or icon name
function toast(cx, y, w, app, title, body, t, t0, exitT, o = {}) {
  if (t < t0) return; const pin = eOutQuint(P(t, t0, .5)), pout = exitT != null ? eInCubic(P(t, exitT, .3)) : 0; if (pout >= 1) return;
  const Y = lerp(-160, y, pin) - pout * 60, h = 128; ctx.save(); ctx.globalAlpha *= 1 - pout;
  glassPanel(cx - w / 2, Y, w, h, 34, { fill: "rgba(22,24,58,.9)", edge: "rgba(215,205,255,.45)" });
  if (LOGO[app]) logoTile(app, cx - w / 2 + 64, Y + h / 2, 74); else iconTile(app, cx - w / 2 + 64, Y + h / 2, 74);
  font("IDBlack", 30, -.5); ctx.textAlign = "left"; ctx.fillStyle = C.white; ctx.fillText(title, cx - w / 2 + 120, Y + 54);
  font("IDMed", 26); ctx.fillStyle = "rgba(225,218,255,.78)"; ctx.fillText(body, cx - w / 2 + 120, Y + 92);
  eyebrow(o.when ?? "AGORA", cx + w / 2 - 28, Y + 50, { align: "right", size: 18, ls: 4, alpha: .6 });
  ctx.restore();
}
// CURSOR: macOS pointer glides through pts [[x,y],...] between t0..t1 (eased), click ripple at clickT
function cursor(pts, t, t0, t1, clickT, o = {}) {
  const a = vis(t, t0 - .2, o.exitT); if (!a) return; const p = eInOutQuart(P(t, t0, t1 - t0)), n = pts.length - 1, f = p * n, i = Math.min(n - 1, Math.floor(f)), q = f - i;
  const x = lerp(pts[i][0], pts[Math.min(n, i + 1)][0], q), y = lerp(pts[i][1], pts[Math.min(n, i + 1)][1], q), press = clickT != null ? 1 - .14 * Math.sin(Math.PI * clamp(P(t, clickT - .06, .16))) : 1;
  if (clickT != null && t >= clickT) for (let r = 0; r < 2; r++) { const rp = P(t, clickT + r * .1, .6); if (rp > 0 && rp < 1) { ctx.save(); ctx.strokeStyle = `rgba(205,190,255,${.8 * (1 - rp)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14 + rp * 46, 0, 7); ctx.stroke(); ctx.restore(); } }
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(press * (o.s ?? 1.6), press * (o.s ?? 1.6));
  ctx.shadowColor = "rgba(0,0,10,.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(6.5, 20); ctx.lineTo(11, 30); ctx.lineTo(15, 28); ctx.lineTo(10.5, 18.5); ctx.lineTo(19, 18.5); ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.fill(); noShadow(); ctx.strokeStyle = "#111"; ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
}
// MARQUEE: giant outlined word strip drifting behind the speaker's head; texture for the beat's keyword (alpha ~.1)
function marquee(str, y, size, t, o = {}) {
  const a = vis(t, o.t0 ?? -1, o.exitT) * (o.alpha ?? .1); if (!a) return; ctx.save(); ctx.globalAlpha *= a; font(o.fam ?? "Anton", size, size * .02);
  const unit = str + "  ·  ", uw = ctx.measureText(unit).width, off = ((t * (o.speed ?? 40)) % uw + uw) % uw * (o.dir ?? 1);
  ctx.strokeStyle = o.col ?? C.lav; ctx.lineWidth = o.lw ?? 2.5; ctx.textAlign = "left";
  for (let x = -uw * 2 + off; x < W + uw; x += uw) ctx.strokeText(unit, x, y);
  ctx.restore();
}
// LIGHT SWEEP: a soft diagonal light pass across the whole frame (front finish) for beat changes / reveals
function lightSweep(t, t0, o = {}) {
  const p = P(t, t0, o.d ?? .7); if (p <= 0 || p >= 1) return; const x = lerp(-500, W + 500, eInOutQuart(p));
  ctx.save(); ctx.globalCompositeOperation = "screen"; const g = ctx.createLinearGradient(x - 260, 0, x + 260, 300);
  g.addColorStop(0, "rgba(160,140,255,0)"); g.addColorStop(.5, `rgba(200,185,255,${o.a ?? .22})`); g.addColorStop(1, "rgba(160,140,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
// BEFORE / AFTER: one card, a wiping divider with a handle; drawBefore / drawAfter(X, Y, w, h) paint each side
function beforeAfter(X, Y, w, h, t, t0, wipeT, drawBefore, drawAfter, o = {}) {
  const a = vis(t, t0, o.exitT); if (!a) return; const sp = popS(t, t0, o.exitT), wx = X + w * (1 - eInOutQuart(P(t, wipeT, o.wipeD ?? .9)));
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(X + w / 2, Y + h / 2); ctx.scale(lerp(.92, 1, sp), lerp(.92, 1, sp)); ctx.translate(-X - w / 2, -Y - h / 2);
  glassPanel(X, Y, w, h, 30, { fill: "rgba(14,17,48,.9)", edge: "rgba(205,190,255,.55)" });
  ctx.save(); rr(X, Y, w, h, 30); ctx.clip();
  ctx.save(); ctx.beginPath(); ctx.rect(X, Y, wx - X, h); ctx.clip(); drawBefore(X, Y, w, h); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(wx, Y, X + w - wx, h); ctx.clip(); drawAfter(X, Y, w, h); ctx.restore();
  ctx.restore();
  ctx.fillStyle = "#fff"; ctx.fillRect(wx - 2, Y + 10, 4, h - 20); ctx.beginPath(); ctx.arc(wx, Y + h / 2, 26, 0, 7); ctx.fillStyle = "#fff"; ctx.fill();
  ctx.strokeStyle = "#3B2D9C"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(wx - 8, Y + h / 2 - 8); ctx.lineTo(wx - 14, Y + h / 2); ctx.lineTo(wx - 8, Y + h / 2 + 8); ctx.moveTo(wx + 8, Y + h / 2 - 8); ctx.lineTo(wx + 14, Y + h / 2); ctx.lineTo(wx + 8, Y + h / 2 + 8); ctx.stroke();
  eyebrow(o.before ?? tx("before"), X + 26, Y + 44, { align: "left", size: 20, ls: 6, col: C.warn }); eyebrow(o.after ?? tx("after"), X + w - 26, Y + 44, { align: "right", size: 20, ls: 6, col: C.mint });
  ctx.restore();
}
// TIMELINE: editor tracks with clips and a playhead (ref: "IA editando"). tracks: [{ label, clips: [[t0frac, t1frac, text?, kind?], ...] }]
function timelineUI(X, Y, w, tracks, t, t0, exitT, head, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return; const lh = o.lh ?? 62, h = 70 + tracks.length * lh, lx = X + 150, lw = w - 180;
  ctx.save(); ctx.globalAlpha *= a; glassPanel(X, Y, w, h, 28, { fill: "rgba(14,16,46,.9)", edge: "rgba(190,170,255,.4)" });
  font("JBMr", 16, 1); ctx.fillStyle = "rgba(205,190,255,.55)"; ctx.textAlign = "center";
  for (let i = 0; i <= 6; i++) { const x = lx + lw * i / 6; ctx.fillText(`00:${String(i * 5).padStart(2, "0")}`, x, Y + 40); ctx.fillRect(x - .5, Y + 48, 1, 8); }
  tracks.forEach((tr, j) => { const ty = Y + 70 + j * lh; eyebrow(tr.label, X + 26, ty + lh * .55, { align: "left", size: 17, ls: 4 });
    tr.clips.forEach(([a0, a1, txt, kind], i) => { const grow = eOutQuint(P(t, t0 + .15 + j * .12 + i * .04, .45)); if (!grow) return; const cx0 = lx + lw * a0, cw = lw * (a1 - a0) * grow;
      rr(cx0, ty + 8, Math.max(4, cw - 4), lh - 18, 9); ctx.fillStyle = kind === "warn" ? "rgba(255,143,168,.75)" : kind === "dim" ? "rgba(120,110,200,.45)" : "rgba(140,115,255,.85)"; ctx.fill();
      if (txt && cw > 60) { font("JBM", 15, 2); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.fillText(txt, cx0 + 10, ty + lh * .58); } }); });
  const hx = lx + lw * clamp(head); ctx.fillStyle = "#fff"; ctx.fillRect(hx - 1.5, Y + 52, 3, h - 62); ctx.beginPath(); ctx.arc(hx, Y + 54, 8, 0, 7); ctx.fill();
  ctx.restore();
}
// RING METER: circular gauge filling to pct (0..1) with a counting number in the middle
function ringMeter(cx, cy, r, pct, label, t, t0, exitT, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return; const p = eOutQuint(P(t, t0 + .1, o.d ?? 1.1)) * pct;
  ctx.save(); ctx.globalAlpha *= a; ctx.lineCap = "round";
  ctx.lineWidth = r * .16; ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.stroke();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, o.from ?? C.violet); g.addColorStop(1, o.to ?? C.cyan);
  ctx.strokeStyle = g; ctx.shadowColor = "rgba(123,97,255,.7)"; ctx.shadowBlur = r * .25; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + p * 2 * Math.PI); ctx.stroke(); noShadow();
  font("Anton", r * .62, 2); ctx.textAlign = "center"; ctx.fillStyle = heroGrad(cy - r * .4, cy + r * .2); ctx.fillText((o.prefix ?? "") + brNum(p * (o.max ?? 100), 0) + (o.suffix ?? "%"), cx, cy + r * .2);
  eyebrow(label, cx, cy + r * .55, { size: Math.max(14, r * .13), ls: 4 }); ctx.restore();
}
// SPOTLIGHT: dims the frame except a soft circle (front finish) — focus on the thing the speaker points at
function spotlight(t, x, y, r, t0, exitT, o = {}) {
  const a = vis(t, t0, exitT) * (o.dim ?? .62); if (!a) return; const rr2 = r * lerp(1.6, 1, eOutQuint(P(t, t0, .5)));
  ctx.save(); const g = ctx.createRadialGradient(x, y, rr2 * .7, x, y, rr2 * 1.25); g.addColorStop(0, "rgba(2,3,12,0)"); g.addColorStop(1, `rgba(2,3,12,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}

// NEON TRACE: a glowing dot with a comet tail running around a rounded container's edge (modern / tech feel)
function neonTrace(X, Y, w, h, r, t, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0) return; const per = 2 * (w + h - 4 * r) + 2 * Math.PI * r;
  const pt = d => { d = ((d % per) + per) % per; const segs = [[w - 2 * r, (s) => [X + r + s, Y]], [Math.PI * r / 2, (s) => { const an = -Math.PI / 2 + s / r; return [X + w - r + Math.cos(an) * r, Y + r + Math.sin(an) * r]; }],
      [h - 2 * r, (s) => [X + w, Y + r + s]], [Math.PI * r / 2, (s) => { const an = s / r; return [X + w - r + Math.cos(an) * r, Y + h - r + Math.sin(an) * r]; }],
      [w - 2 * r, (s) => [X + w - r - s, Y + h]], [Math.PI * r / 2, (s) => { const an = Math.PI / 2 + s / r; return [X + r + Math.cos(an) * r, Y + h - r + Math.sin(an) * r]; }],
      [h - 2 * r, (s) => [X, Y + h - r - s]], [Math.PI * r / 2, (s) => { const an = Math.PI + s / r; return [X + r + Math.cos(an) * r, Y + r + Math.sin(an) * r]; }]];
    for (const [L, f] of segs) { if (d <= L) return f(d); d -= L; } return [X + r, Y]; };
  const head = (o.phase ?? 0) * per + t * (o.speed ?? .22) * per, col = o.col ?? "150,220,255";
  ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = "lighter";
  for (let i = 26; i >= 0; i--) { const [x, y] = pt(head - i * 9), f = 1 - i / 26; ctx.fillStyle = `rgba(${col},${.08 + .55 * f * f})`; ctx.shadowColor = `rgba(${col},${.9 * f})`; ctx.shadowBlur = 18 * f; ctx.beginPath(); ctx.arc(x, y, 2 + 6 * f * f, 0, 7); ctx.fill(); }
  const [hx, hy] = pt(head); ctx.fillStyle = "#fff"; ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 44; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, 7); ctx.fill(); ctx.fill();
  ctx.restore();
}
// BROWSER CARD: a real web page in a browser window (screenshot via engine/capture.py -> assets/screens/, listed in SCENE.screens).
// o.img = screens name, o.scroll 0..1 (page scroll), o.marks = [{x, y, w, h, t0}] highlighter sweeps in page-px of the screenshot,
// o.zoom page scale, o.neon true -> neonTrace on the frame. Or pass o.draw(X, Y, w, h) for custom content.
function browserCard(X, Y, w, h, url, t, t0, exitT, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return; const sp = popS(t, t0, exitT), bar = 64, r = 30;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(X + w / 2, Y + h / 2); ctx.scale(lerp(.9, 1, sp), lerp(.9, 1, sp)); ctx.translate(-X - w / 2, -Y - h / 2);
  ctx.save(); ctx.shadowColor = "rgba(0,0,12,.6)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26; rr(X, Y, w, h, r); ctx.fillStyle = "#FBFBFE"; ctx.fill(); ctx.restore();
  ctx.save(); rr(X, Y, w, h, r); ctx.clip();
  ctx.fillStyle = "#EEEEF4"; ctx.fillRect(X, Y, w, bar); ctx.fillStyle = "rgba(0,0,0,.08)"; ctx.fillRect(X, Y + bar - 1, w, 1);
  ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X + 34 + i * 26, Y + bar / 2, 8, 0, 7); ctx.fill(); });
  rr(X + 130, Y + 13, w - 230, bar - 26, 12); ctx.fillStyle = "#FFFFFF"; ctx.fill(); font("IDMed", 22); ctx.fillStyle = "#3A3A46"; ctx.textAlign = "left";
  ctx.fillText("🔒 " + url, X + 150, Y + bar / 2 + 8);
  const cx0 = X, cy0 = Y + bar, cw = w, ch = h - bar, img = o.img && IMG[o.img];
  if (img) { const k = (o.zoom ?? 1) * cw / img.width, ih = img.height * k, off = Math.max(0, ih - ch) * eInOutQuart(clamp(o.scroll ?? 0));
    ctx.drawImage(img, cx0, cy0 - off, cw, ih);
    (o.marks || []).forEach(m => { const p = eOutQuint(P(t, m.t0, .45)); if (!p) return; ctx.fillStyle = o.markCol ?? "rgba(123,97,255,.28)"; ctx.fillRect(cx0 + m.x * k, cy0 - off + m.y * k, m.w * k * p, m.h * k); }); }
  else if (o.draw) o.draw(cx0, cy0, cw, ch);
  ctx.restore();
  rr(X, Y, w, h, r); ctx.strokeStyle = "rgba(205,190,255,.85)"; ctx.lineWidth = 3; ctx.stroke();
  if (o.neon !== false) neonTrace(X, Y, w, h, r, t, { alpha: clamp(P(t, t0 + .3, .4)), phase: o.phase ?? 0 });
  if (o.label) eyebrow(o.label, X + w - 20, Y + h + 34, { align: "right", size: 16, ls: 4, alpha: .6 });
  ctx.restore();
}
// CHAT SIM: a ChatGPT- or Claude-style screen. The user prompt types (tp0..tp1), then the answer streams (ta0..ta1) with a caret.
// app: "chatgpt" | "claude" (uses the real logos). Always labelled (tx("illus")). answer = array of lines (the speaker's words / plausible output).
function chatSim(X, Y, w, h, app, prompt, answer, t, t0, exitT, tp0, tp1, ta0, ta1, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return; const sp = popS(t, t0, exitT), r = 34, cg = app === "claude";
  const bg = cg ? "#1F1E1C" : "#212121", fg = cg ? "#F4EFE6" : "#ECECEC", bub = cg ? "#3A3833" : "#303030", acc = cg ? "#D97757" : "#ECECEC";
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(X + w / 2, Y + h / 2); ctx.scale(lerp(.9, 1, sp), lerp(.9, 1, sp)); ctx.translate(-X - w / 2, -Y - h / 2);
  ctx.save(); ctx.shadowColor = "rgba(0,0,12,.65)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26; rr(X, Y, w, h, r); ctx.fillStyle = bg; ctx.fill(); ctx.restore();
  ctx.save(); rr(X, Y, w, h, r); ctx.clip();
  logoTile(cg ? "claude" : "openai", X + 52, Y + 50, 52, { k: cg ? .62 : .56, glow: "rgba(0,0,0,0)" });
  font("IDBlack", 30, -.5); ctx.fillStyle = fg; ctx.textAlign = "left"; ctx.fillText(cg ? "Claude" : "ChatGPT", X + 92, Y + 61);
  eyebrow(o.label ?? tx("illus"), X + w - 28, Y + 58, { align: "right", size: 15, ls: 4, alpha: .5, col: fg });
  ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fillRect(X, Y + 98, w, 1.5);
  // user bubble (right), typed
  const shown = typedStr(prompt, t, tp0, tp1), pl = wrap(prompt, w * .62, "IDMed", 30), lh = 40, bw = Math.min(w * .7, Math.max(...pl.map(l => { font("IDMed", 30); return ctx.measureText(l).width; })) + 56), bh = pl.length * lh + 34;
  if (shown) { rr(X + w - 28 - bw, Y + 128, bw, bh, 26); ctx.fillStyle = bub; ctx.fill(); let n = 0; font("IDMed", 30); ctx.fillStyle = fg; ctx.textAlign = "left";
    pl.forEach((l, i) => { const part = shown.slice(n, n + l.length + 1); if (part) ctx.fillText(part.trimEnd(), X + w - bw, Y + 128 + 46 + i * lh); n += l.length + 1; }); }
  // answer, streaming
  const ay = Y + 128 + bh + 46, al = answer.join(" "), sh = typedStr(al, t, ta0, ta1);
  if (t >= ta0 - .4) { logoTile(cg ? "claude" : "openai", X + 50, ay + 4, 44, { k: cg ? .62 : .56, glow: "rgba(0,0,0,0)" });
    if (!sh) { for (let i = 0; i < 3; i++) { ctx.fillStyle = `rgba(255,255,255,${.3 + .6 * Math.max(0, Math.sin(t * 7 - i * .8))})`; ctx.beginPath(); ctx.arc(X + 100 + i * 22, ay + 6, 6, 0, 7); ctx.fill(); } }
    else { const lines = wrap(al, w - 150, "IDMed", 30); let n = 0, yy = ay + 14; font("IDMed", 30); ctx.fillStyle = fg; ctx.textAlign = "left";
      for (const ln of lines) { const part = sh.slice(n, n + ln.length + 1); if (!part) break; ctx.fillText(part.trimEnd(), X + 92, yy); n += ln.length + 1;
        if (n >= sh.length && sh.length < al.length) { const cw = ctx.measureText(part.trimEnd()).width; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(X + 92 + cw + 14, yy - 10, 8, 0, 7); ctx.fill(); break; } yy += 42; } } }
  // input bar
  rr(X + 24, Y + h - 94, w - 48, 70, 35); ctx.fillStyle = cg ? "#2B2A27" : "#2F2F2F"; ctx.fill(); font("IDMed", 26); ctx.textAlign = "left"; ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.fillText(o.placeholder ?? (cg ? tx("askClaude") : tx("askGpt")), X + 56, Y + h - 50);
  ctx.restore();
  rr(X, Y, w, h, r); ctx.strokeStyle = "rgba(205,190,255,.6)"; ctx.lineWidth = 2.5; ctx.stroke();
  if (o.neon !== false) neonTrace(X, Y, w, h, r, t, { alpha: clamp(P(t, t0 + .3, .4)), col: cg ? "255,170,130" : "150,220,255" });
  ctx.restore();
}

// ---------- LIQUID GLASS (Nov 8, 2026; after originkit.dev's refractive glass, our own canvas build) ----------
// Refracts whatever is already painted behind it: the backdrop is magnified about the lens centre, frosted, and split per RGB
// channel (red bends a little more, blue a little less) so colour fringes appear only toward the edges, like real dispersion.
// Then a tint, a Fresnel inner rim, a softbox highlight that slides as it turns, and a bevel line. Works under any transform.
const LGC = document.createElement("canvas"); LGC.width = W; LGC.height = H; const lgx = LGC.getContext("2d");
(() => { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("width", "0"); s.setAttribute("height", "0"); s.style.position = "absolute";
  const m = (id, v) => `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${v}"/></filter>`;
  s.innerHTML = m("lgR", "1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0") + m("lgG", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0") + m("lgB", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0");
  document.body.appendChild(s); })();
// refract the snapshot inside the current clip. c = lens centre (screen px), box = screen bbox [x, y, w, h]
function glassRefract(c, box, o = {}) {
  const m = o.mag ?? 1.16, disp = o.disp ?? .045, fr = o.frost ?? 9, pad = fr * 3 + 4;
  const [bx, by, bw, bh] = [box[0] - pad, box[1] - pad, box[2] + 2 * pad, box[3] + 2 * pad];
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000"; ctx.fillRect(bx, by, bw, bh); ctx.globalCompositeOperation = "lighter";
  for (const [id, mm] of [["lgR", m * (1 + disp)], ["lgG", m], ["lgB", m * (1 - disp)]]) {
    ctx.filter = `url(#${id}) blur(${fr}px) saturate(${o.sat ?? 1.25}) brightness(${o.bright ?? 1.12})`;
    const sx = c.x + (bx - c.x) / mm, sy = c.y + (by - c.y) / mm; ctx.drawImage(LGC, sx, sy, bw / mm, bh / mm, bx, by, bw, bh); }
  ctx.restore();
}
// cx, cy centre; w, h size; r radius. o: sc, tilt, ry (turn, pass a slow sin), depth (extrusion when turning), mag, disp, frost,
// tint (rgba), edge, content(w, h) draws on top in local coords (logo, label). Draw it in BACK or FRONT like any element.
function liquidGlass(cx, cy, w, h, r, t, o = {}) {
  const sc = o.sc ?? 1; if (sc < .01) return; const ry = o.ry ?? 0, kx = Math.max(.12, Math.cos(ry)), side = -Math.sin(ry), dep = o.depth ?? Math.min(w, h) * .09;
  lgx.setTransform(1, 0, 0, 1, 0, 0); lgx.clearRect(0, 0, W, H); lgx.drawImage(cv, 0, 0);   // snapshot of everything behind the lens
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.translate(cx, cy); ctx.rotate(o.tilt ?? 0); ctx.scale(sc, sc);
  const shape = () => rr(-w / 2, -h / 2, w, h, r);
  // extruded glass wall when it turns
  ctx.save(); ctx.shadowColor = o.glow ?? "rgba(40,20,120,.55)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26;
  for (let i = 6; i >= 1; i--) { const f = i / 6; ctx.save(); ctx.translate(side * dep * f, dep * .3 * f); ctx.scale(kx, 1); shape(); ctx.fillStyle = `rgba(${i > 3 ? "30,24,80" : "90,76,190"},.55)`; ctx.fill(); ctx.restore(); noShadow(); }
  ctx.restore();
  ctx.scale(kx, 1);
  const M = ctx.getTransform(), c = M.transformPoint(new DOMPoint(0, 0)), pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]].map(([x, y]) => M.transformPoint(new DOMPoint(x, y)));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
  ctx.save(); shape(); ctx.clip();
  glassRefract(c, box, o);
  shape(); ctx.fillStyle = o.tint ?? "rgba(123,97,255,.14)"; ctx.fill();   // body colour
  const v = ctx.createLinearGradient(0, -h / 2, 0, h / 2); v.addColorStop(0, "rgba(255,255,255,.16)"); v.addColorStop(.45, "rgba(255,255,255,0)"); v.addColorStop(1, "rgba(10,6,40,.22)"); ctx.fillStyle = v; ctx.fillRect(-w / 2, -h / 2, w, h);
  // Fresnel: edges brighten (inner glow traced along the rim)
  ctx.save(); ctx.shadowColor = o.rim ?? "rgba(225,215,255,.85)"; ctx.shadowBlur = Math.min(w, h) * .12; shape(); ctx.lineWidth = Math.min(w, h) * .08; ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.stroke(); ctx.restore();
  // softbox highlight sliding with the turn
  const hx = Math.sin(ry) * w * .7 - w * .12, hg = ctx.createRadialGradient(hx, -h * .32, 0, hx, -h * .32, Math.max(w, h) * .55);
  hg.addColorStop(0, "rgba(255,255,255,.42)"); hg.addColorStop(.35, "rgba(255,255,255,.08)"); hg.addColorStop(1, "rgba(255,255,255,0)"); ctx.fillStyle = hg; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
  // bevel + crisp edge with a chromatic split (cyan one side, magenta the other)
  ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.lineWidth = 2.5;
  ctx.translate(-1.5, 0); shape(); ctx.strokeStyle = "rgba(255,90,200,.45)"; ctx.stroke(); ctx.translate(3, 0); shape(); ctx.strokeStyle = "rgba(90,230,255,.45)"; ctx.stroke(); ctx.restore();
  const eg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); eg.addColorStop(0, "rgba(255,255,255,.95)"); eg.addColorStop(.4, "rgba(255,255,255,.25)"); eg.addColorStop(1, "rgba(200,185,255,.7)");
  shape(); ctx.strokeStyle = o.edge ?? eg; ctx.lineWidth = 2 / kx; ctx.stroke();
  rr(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, Math.max(0, r - 6)); ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1.2; ctx.stroke();
  if (o.content) { ctx.save(); o.content(w, h); ctx.restore(); }
  ctx.restore();
}
// a glass lens carrying a real logo (FFmpeg, Whisper, Claude Code...). label = small mono caption under it
function glassLogo(name, cx, cy, s, t, o = {}) {
  liquidGlass(cx, cy, s, s, s * .3, t, { ...o, content: (w) => { const Lg = LOGO[name]; if (Lg) { const kk = w * (o.k ?? .5); ctx.save(); ctx.shadowColor = "rgba(0,0,20,.55)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6; ctx.drawImage(Lg, -kk / 2, -kk / 2, kk, kk); ctx.restore(); }
    if (o.label) { font("JBM", Math.max(14, w * .11), 4); ctx.fillStyle = C.white; ctx.textAlign = "center"; ctx.fillText(o.label, 0, w / 2 + w * .2); } } });
}


// ---------- motion-kit port + glass devices (promoted from "Editing with AI", approved Nov 8, 2026) ----------
// motion-kit (hughminhphan/motion-kit, MIT) as pure functions of time; see docs/motion-rules.md
function bez(x1, y1, x2, y2) { return p => { p = clamp(p); let u = p; for (let i = 0; i < 8; i++) { const x = 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u - p, dx = 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2); if (Math.abs(dx) < 1e-6) break; u = clamp(u - x / dx); } return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u; }; }
const KIT = { land: bez(.1, .75, .15, 1), heavy: bez(.75, 0, .18, 1), whip: bez(.85, 0, .15, 1), leave: bez(.55, 0, .9, .35) };
const react = i => [0, 4, 9, 15, 22, 30][Math.min(i, 5)] / 30;               // a lead and uneven reactions, never an even stagger
const dur = (px, w = 1) => (9 + 1.15 * Math.sqrt(px)) * w / 60;            // duration from distance and weight
// travel on a bent path: x on kit.land, y on kit.heavy; returns [x, y, p]
function arcAt(t, t0, x0, y0, x1, y1, w = 1) { const d = dur(Math.hypot(x1 - x0, y1 - y0), w), p = P(t, t0, d); return [lerp(x0, x1, KIT.land(p)), lerp(y0, y1, KIT.heavy(p)), p]; }
// a travelling exit: quicker than the entrance (.65x) and accelerating out
const leaveP = (t, t0, d) => KIT.leave(P(t, t0, d * .65));

// GLASS PLANE: planeQuad's skewed layer stack, made of liquid glass (d = depth index, 0 = front; draw back-most first)
function glassPlane(cx, cy, w, h, d, label, t, t0, exitT, draw) {
  const a = vis(t, t0, exitT); if (!a) return; const s = spring(t, t0, 1.8, .6);
  lgx.setTransform(1, 0, 0, 1, 0, 0); lgx.clearRect(0, 0, W, H); lgx.drawImage(cv, 0, 0);
  ctx.save(); ctx.globalAlpha = a * (1 - d * .1); ctx.translate(cx - d * 84 * s, cy - d * 158 * s + (1 - s) * 60); ctx.transform(1, -.12, .06, 1, 0, 0); ctx.scale(1 - d * .04, 1 - d * .04);
  ctx.save(); ctx.shadowColor = "rgba(10,4,40,.6)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 24; rr(-w / 2, -h / 2, w, h, 26); ctx.fillStyle = "rgba(20,16,60,.35)"; ctx.fill(); ctx.restore();
  const M = ctx.getTransform(), c = M.transformPoint(new DOMPoint(0, 0)), pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]].map(([x, y]) => M.transformPoint(new DOMPoint(x, y)));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  ctx.save(); rr(-w / 2, -h / 2, w, h, 26); ctx.clip();
  glassRefract(c, [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)], { mag: 1.12, frost: 12, bright: .9 });
  rr(-w / 2, -h / 2, w, h, 26); ctx.fillStyle = "rgba(18,14,56,.55)"; ctx.fill();
  const hg = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); hg.addColorStop(0, "rgba(255,255,255,.16)"); hg.addColorStop(.35, "rgba(255,255,255,0)"); ctx.fillStyle = hg; ctx.fillRect(-w / 2, -h / 2, w, h);
  draw(w, h); ctx.restore();
  ctx.save(); ctx.shadowColor = "rgba(150,120,255,.9)"; ctx.shadowBlur = 22; rr(-w / 2, -h / 2, w, h, 26); ctx.strokeStyle = "rgba(215,200,255,.9)"; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.translate(-2, 0); rr(-w / 2, -h / 2, w, h, 26); ctx.strokeStyle = "rgba(255,90,200,.35)"; ctx.lineWidth = 2; ctx.stroke(); ctx.translate(4, 0); rr(-w / 2, -h / 2, w, h, 26); ctx.strokeStyle = "rgba(90,230,255,.35)"; ctx.stroke(); ctx.restore();
  font("JBM", 20, 5); const lw = ctx.measureText(label).width + 36; rr(-w / 2 + 22, -h / 2 - 19, lw, 38, 10); ctx.fillStyle = "rgba(20,16,52,.95)"; ctx.fill(); ctx.strokeStyle = "rgba(190,170,255,.65)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = C.lav; ctx.textAlign = "left"; ctx.fillText(label, -w / 2 + 40, -h / 2 + 7); ctx.restore();
}
// TERMINAL: a Claude Code-style terminal (mock UI, always labelled; o.label for English, o.title for the window title). lines: [{ t0, t1?, text, col?, prefix? }] -> typed when t1 given, cut on otherwise
function terminal(X, Y, w, h, t, t0, exitT, lines, o = {}) {
  const a = vis(t, t0, exitT); if (!a) return; const sp = popS(t, t0, exitT), r = 30;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(X + w / 2, Y + h / 2); ctx.scale(lerp(.9, 1, sp), lerp(.9, 1, sp)); ctx.translate(-X - w / 2, -Y - h / 2);
  ctx.save(); ctx.shadowColor = "rgba(0,0,12,.65)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 26; rr(X, Y, w, h, r); ctx.fillStyle = "#16151A"; ctx.fill(); ctx.restore();
  ctx.save(); rr(X, Y, w, h, r); ctx.clip();
  ctx.fillStyle = "#222128"; ctx.fillRect(X, Y, w, 64); ["#FF5F57", "#FEBC2E", "#28C840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X + 34 + i * 26, Y + 32, 8, 0, 7); ctx.fill(); });
  font("JBM", 20, 2); ctx.fillStyle = "rgba(240,235,225,.7)"; ctx.textAlign = "center"; ctx.fillText(o.title ?? "claude — ~/project", X + w / 2, Y + 39);
  eyebrow(o.label ?? tx("illus"), X + w - 26, Y + 40, { align: "right", size: 15, ls: 4, alpha: .5, col: "#F4EFE6" });
  logoTile("claude", X + 56, Y + 112, 46, { k: .64, glow: "rgba(0,0,0,0)" }); font("IDBlack", 30, -.5); ctx.fillStyle = "#F4EFE6"; ctx.textAlign = "left"; ctx.fillText("Claude Code", X + 92, Y + 123);
  let y = Y + 190;
  for (const ln of lines) { if (t < ln.t0) break; const full = (ln.prefix ?? "") + ln.text, str = ln.t1 ? (ln.prefix ?? "") + typedStr(ln.text, t, ln.t0, ln.t1) : full;
    const ls = wrap(full, w - 90, "JBMr", 28, 1); let n = 0; font("JBMr", 28, 1); ctx.fillStyle = ln.col ?? "#F4EFE6"; ctx.textAlign = "left";
    for (const l of ls) { const part = str.slice(n, n + l.length + 1); if (part) ctx.fillText(part.trimEnd(), X + 44, y); n += l.length + 1; y += 40;
      if (ln.t1 && n >= str.length && str.length < full.length) { const cw = ctx.measureText(part.trimEnd()).width; ctx.fillStyle = "#D97757"; ctx.fillRect(X + 48 + cw, y - 70, 14, 32); break; } }
    y += 12; }
  ctx.restore();
  rr(X, Y, w, h, r); ctx.strokeStyle = "rgba(205,190,255,.6)"; ctx.lineWidth = 2.5; ctx.stroke();
  neonTrace(X, Y, w, h, r, t, { alpha: clamp(P(t, t0 + .3, .4)), col: "255,170,130" });
  ctx.restore();
}

// ---------- captions ----------
// GLITCH-IN: draw(dx) paints the word at an x offset; for `dur` s after t0 it splits into violet / cyan channels and
// jitters horizontal slices, then settles clean. Deterministic per frame. Use on a few phrase-ending words (config "glitch").
function glitchIn(draw, t, t0, dur, box) {
  const g = 1 - clamp(P(t, t0, dur)); if (g <= 0) { draw(0); return; }
  const fr = Math.floor(t * 30), amp = 16 * g;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const [col, sx] of [["rgba(255,60,190,.55)", -1], ["rgba(60,220,255,.55)", 1]]) { ctx.save(); ctx.globalAlpha *= .8; ctx.fillStyle = col; draw(sx * amp * (.6 + hsh(fr, sx) * .8), col); ctx.restore(); }
  ctx.restore();
  const [bx, by, bw, bh] = box, n = 6;
  for (let k = 0; k < n; k++) { const y0 = by + bh * k / n, jit = (hsh(fr, k + 3) - .5) * 2 * amp * (hsh(fr, k + 9) > .55 ? 1.6 : .3);
    ctx.save(); ctx.beginPath(); ctx.rect(bx - 60, y0, bw + 120, bh / n + 1); ctx.clip(); draw(jit); ctx.restore(); }
}
// captions (Oct 27 v4): no pills. Clean white type with a soft shadow, under the speaker's chin.
// Emphasis = the "the product / for your client" look: the serif keyword sits on top and the bold phrase OVERLAPS its lower
// part (~30%) with a soft violet glow, so the two lines read as one layered piece. Upcoming words wait at 32%.
function capShadow() { ctx.shadowColor = "rgba(0,0,8,.85)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3; }
// captions never spill past their container: the whole group scales down to maxW (card width - 48 inside a container)
function captions(t, y, cx = 540, maxW = 0) {
  const g = D.caps.find(c => t >= c.t[0] && t < c.t[1]); if (!g || !maxW) return captionsRaw(t, y, cx);
  const key = g.words.filter(w => w.k), lift = key.length && key.length < g.words.length, base = lift ? g.words.filter(w => !w.k) : g.words;
  font("IDXBold", 62, -1); const total = base.reduce((a, w) => a + ctx.measureText(w.w).width, 0) + 15 * (base.length - 1);
  font("ISerif", 104, 0); const kw = lift ? ctx.measureText(key.map(w => w.w.replace(/[.,!?;:]+$/, "")).join(" ")).width : 0;
  const f = Math.min(1, maxW / Math.max(total, kw)); if (f >= 1) return captionsRaw(t, y, cx);
  ctx.save(); ctx.translate(cx, y); ctx.scale(f, f); ctx.translate(-cx, -y); const b = captionsRaw(t, y, cx); ctx.restore();
  return b && [cx + (b[0] - cx) * f, y + (b[1] - y) * f, b[2] * f, b[3] * f];
}
function captionsRaw(t, y, cx = 540) {
  const g = D.caps.find(c => t >= c.t[0] && t < c.t[1]); if (!g) return null;
  const txt = g.words.map(w => w.w).join(" "); if (SCENE.hideCap && SCENE.hideCap(t, txt)) return null;
  const size = 62, ks = 104, sp = 15, inA = clamp(P(t, g.t[0], .14)), outA = 1 - clamp(P(t, g.t[1] - .14, .14));
  const key = g.words.filter(w => w.k), lift = key.length && key.length < g.words.length, base = lift ? g.words.filter(w => !w.k) : g.words;
  const ky0 = y; if (lift) y += 40;   // y is the slot under the speaker's chin: the serif word takes it, the phrase overlaps its lower part
  const wordA = w => { const q = eOutQuint(P(t, w.t, .25)); return { a: (t >= w.t ? lerp(.32, 1, q) : .32) * inA * outA, dy: (1 - q) * 8 }; };
  let top = y - size * .8, kbox = null;
  // 1) the emphasis word (behind): serif, white → lavender, fading toward its bottom, rises softly out of a blur
  if (lift) {
    const kt = key.map(w => w.w.replace(/[.,!?;:]+$/, "")).join(" "), k0 = key[0].t, q = eOutQuint(P(t, k0, .4)), ky = ky0 + 4 + (1 - q) * 18;
    font("ISerif", ks, 0); const kw = ctx.measureText(kt).width; kbox = [cx - kw / 2, ky - ks * .78, kw, ks];
    const paint = (dx, col) => { font("ISerif", ks, 0); ctx.textAlign = "center"; if (!col) { const gr = ctx.createLinearGradient(0, ky - ks * .8, 0, ky + ks * .1); gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(.6, "#D9CCFF"); gr.addColorStop(1, "rgba(170,150,255,.55)"); ctx.fillStyle = gr; } ctx.fillText(kt, cx + dx, ky); };
    ctx.save(); ctx.globalAlpha = (t >= k0 ? q : 0) * inA * outA; if (q < 1) ctx.filter = `blur(${((1 - q) * 5).toFixed(1)}px)`;
    ctx.save(); ctx.shadowColor = "rgba(4,4,20,.8)"; ctx.shadowBlur = 38; paint(0); ctx.restore();   // dark halo: readable on any wardrobe
    capShadow();
    if (key.some(w => w.g)) glitchIn(paint, t, k0, .32, kbox); else paint(0);
    ctx.restore(); top = ky - ks * .8;
  }
  // 2) the phrase (front): bold white with a soft violet glow, overlapping the serif's lower part
  font("IDXBold", size, -1); const ws = base.map(w => ctx.measureText(w.w).width), total = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1);
  let x = cx - total / 2; ctx.textAlign = "left";
  base.forEach((w, i) => { const { a, dy } = wordA(w); const paint = (dx, col) => { font("IDXBold", size, -1); ctx.textAlign = "left"; if (!col) ctx.fillStyle = C.white; ctx.fillText(w.w, x + dx, y + dy); };
    ctx.save(); ctx.globalAlpha = a;
    if (lift) { ctx.shadowColor = "rgba(150,120,255,.55)"; ctx.shadowBlur = 28; paint(0); }   // glow that seats the phrase on the serif
    capShadow();
    if (w.g && !lift) glitchIn(paint, t, w.t, .32, [x, y - size * .8, ws[i], size]); else paint(0);
    ctx.restore(); x += ws[i] + sp; });
  return [Math.min(cx - total / 2, kbox ? kbox[0] : 1e9), top, Math.max(total, kbox ? kbox[2] : 0), y + size * .3 - top];
}

// ---------- frame ----------
window.QA = false;
window.renderFrame = async function (k) {
  const t = k / FPS;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = "none"; noShadow(); ctx.textBaseline = "alphabetic";
  await buildPlate(k, t);
  const Ly = layoutAt(t);
  world(t, SCENE.worldOpts ? SCENE.worldOpts(t) : {});
  drawRoom(t, Ly);
  SCENE.back(t, Ly);
  const S = drawSubject(t, Ly);
  const fr = faceRect(k, S); window.FACE = fr;
  SCENE.front(t, Ly, fr);
  const cap = captions(t, SCENE.capY(t, Ly, fr), SCENE.capX ? SCENE.capX(t, Ly) : 540, SCENE.capMaxW ? SCENE.capMaxW(t, Ly) : (Ly.on > .5 ? Ly.card[2] - 48 : 1020));
  const v = ctx.createRadialGradient(540, 860, 520, 540, 960, 1250); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,8,.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  if (window.QA) { ctx.strokeStyle = "red"; ctx.lineWidth = 4; ctx.strokeRect(...fr); if (cap) { ctx.strokeStyle = "cyan"; ctx.strokeRect(...cap); } }
  return cv.toDataURL("image/jpeg", .93);
};
window.boot = async () => {
  await document.fonts.load("98px IDBlack"); for (const f of ["IDXBold", "IDBold", "IDMed", "ISerif", "Anton", "JBM", "JBMr"]) await document.fonts.load(`40px ${f}`);
  await loadAssets(SCENE.logos, SCENE.icons); for (const n of SCENE.screens || []) IMG[n] = await loadImg(`../assets/screens/${n}`); return true;
};
