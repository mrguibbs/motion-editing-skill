// TEMPLATE SCENE: a complete Deep Navy edit that runs on ANY talking-head video. Start every new scene from this file.
// Copy it to work/<Name>/src/scene.js, fill COPY with the video's own words / tools, and set the beats in plan/config.json
// (keys b1..b6 + fin, see config.template.json). Every device fires on the speaker's words: at(beat, f) = the first word
// spoken after f (0..1) of that beat, wk(beat, i) = the i-th word of the beat. Swap or re-order recipes freely: the style
// guide's rules still apply (one star device per beat, no repeats in consecutive beats, faces never covered).
const COPY = {
  lang: "en",                                           // UI words ("pt" or "en"): ILLUSTRATION, BEFORE / AFTER, ...
  b1: { eyebrow: "TOOL · TOOL · TOOL", line1: "YOUR TOPIC", line2: "HACKED", logo: "claude", icon: "sparkles" },
  b2: { beforeTitle: "The usual way", beforeNote: "FADE UP · 0.6 S · SAME MOVE EVERY TIME", afterTitle: "THE BETTER WAY", afterSerif: "with depth", chips: ["FLAT", "BORING"] },
  b3: { url: "github.com/your-name/your-repo", img: null, lenses: [["openai", "TOOL ONE"], ["claude", "TOOL TWO"]] },   // img: a REAL capture in assets/screens/
  b4: { eyebrow: "HOW IT WORKS", planes: ["01 · AUDIO", "02 · TRANSCRIPT", "03 · EDIT PLAN"] },
  b5: { title: "claude — ~/your-project", prompt: "Paste the exact prompt the speaker quotes here." },
  b6: { line1: "THE PAYOFF", line2: "in one line", checks: ["TRANSCRIBE", "FACES", "MATTE", "RENDER"] },
  fin: { eyebrow: "STEP-BY-STEP GUIDE", keyword: "KEYWORD", file: ["YOUR FILE", "STEP BY STEP"], steps: ["01 · COMMENT KEYWORD", "02 · GET THE GUIDE"] },
};

// layouts: fitCard fills every container to its bottom edge and keeps the head popping out of the top
const LY = {
  FULL: L({ k: 1.03, dy: 260 }),   // tune dy per raw so the crown lands at y ≈ 450–520 (dy ≈ 480 − crown·1.03)
  CARD: fitCard([270, 860, 540, 740, 44], .52),
  LOW: fitCard([290, 1010, 500, 640, 44], .48),
  WIDE: fitCard([210, 1050, 660, 660, 48], .62, 110),
  FIN: fitCard([300, 330, 480, 640, 40], .5),
};
const TIMELINE = [[0, LY.FULL], [B.b2[0], LY.CARD], [B.b3[0], LY.WIDE, .6], [B.b4[0], LY.LOW], [B.b5[0], LY.CARD], [B.b6[0], LY.FULL], [B.fin[0], LY.FIN, .9]];

// ---------- word triggers ----------
const inBeat = k => D.words.filter(w => w.t >= B[k][0] && w.t < B[k][1]);
const wk = (k, i) => { const ws = inBeat(k); return ws.length ? ws[Math.max(0, Math.min(ws.length - 1, i < 0 ? ws.length + i : i))].t : B[k][0]; };
const at = (k, f) => { const t0 = lerp(B[k][0], B[k][1], f), w = D.words.find(w => w.t >= t0 && w.t < B[k][1]); return w ? w.t : t0; };
const ex = k => B[k][1] - .25;
const LBL = () => tx("illus");
function strike(x0, x1, y, p) { if (p <= 0) return; ctx.save(); ctx.strokeStyle = C.warn; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, eOutQuint(p)), y); ctx.stroke(); ctx.restore(); }

// ---------- BACK layer (behind the speaker) ----------
const BACK = {
  b1(t) {   // HOOK: layered title behind the head, the last line glitch-slams on its word
    const c = COPY.b1, hit = wk("b1", -1), bot = behindY(0, B.b1[1], LY.FULL, 280, "Anton", .3);
    stackHead([{ t: c.line1, size: Math.min(150, fitSize(c.line1, "IDBlack", 980)), fill: heroGrad }, { t: c.line2, fam: "Anton", size: Math.min(280, fitSize(c.line2, "Anton", 1000, .01)), fill: deepGrad, d: hit - .11 }],
      540, 0, t, .05, ex("b1"), { bottom: bot, eyebrow: { t: c.eyebrow, t0: .02, size: 24, ls: 9 } });
    if (t >= hit - .06) { font("Anton", 280, 2.8); const hw = ctx.measureText(c.line2).width;
      glitchIn((dx, col) => { if (!col) return; font("Anton", 280, 2.8); ctx.textAlign = "center"; ctx.fillText(c.line2, 540 + dx, bot); }, t, hit - .06, .32, [540 - hw / 2, bot - 210, hw, 220]); }
  },
  b2(t) {   // COMPARE: before/after wipe above a CARD, the "before" qualities struck through as the wipe passes
    const c = COPY.b2, wipe = at("b2", .6);
    beforeAfter(60, 150, 960, 500, t, B.b2[0] + .06, wipe, (X, Y, w, h) => {
      ctx.fillStyle = "#18191F"; ctx.fillRect(X, Y, w, h); const lp = (t % 1.3) / 1.3, q = eOutCubic(clamp(lp / .46));
      ctx.save(); ctx.globalAlpha *= q; font("IDBold", 72, -1); ctx.fillStyle = "#E9E9EE"; ctx.textAlign = "center"; ctx.fillText(c.beforeTitle, X + w / 2, Y + h * .5 + (1 - q) * 24); ctx.restore();
      eyebrow(c.beforeNote, X + 34, Y + h - 30, { align: "left", size: 16, ls: 3, alpha: .6 });
    }, (X, Y, w, h) => {
      const g = ctx.createLinearGradient(0, Y, 0, Y + h); g.addColorStop(0, "#0A1230"); g.addColorStop(1, "#04060E"); ctx.fillStyle = g; ctx.fillRect(X, Y, w, h);
      bloom(X + w * .6, Y + h * .45, 320, "rgba(123,97,255,.55)");
      font("IDBlack", 84, -3.5); ctx.textAlign = "center"; ctx.save(); ctx.shadowColor = "rgba(140,110,255,.6)"; ctx.shadowBlur = 40; ctx.fillStyle = heroGrad(Y + h * .3, Y + h * .48); ctx.fillText(c.afterTitle, X + w * .56, Y + h * .45); ctx.restore();
      font("ISerif", 112); ctx.fillStyle = deepGrad(Y + h * .45, Y + h * .7); ctx.fillText(c.afterSerif, X + w * .56, Y + h * .66);
      iconTile("sparkles", X + w * .14, Y + h * .5 + Math.sin(t * 2.2) * 6, 86, { tilt: -.1 }); neonTrace(X + 18, Y + 18, w - 36, h - 36, 22, t, { alpha: .8 });
    }, { exitT: ex("b2"), wipeD: .7 });
    eyebrow(LBL(), 994, 628, { align: "right", size: 15, ls: 4, alpha: .5 });
    let x = 70; c.chips.forEach((s, i) => { const w = chip(s, x, 712, t, at("b2", .25 + i * .12), ex("b2"), { align: "left", icon: "x", col: C.warn, edge: "rgba(255,143,168,.6)", size: 22 });
      if (w) strike(x + 14, x + w - 14, 712, P(t, wipe + .55 + i * .1, .3)); x += (w || 160) + 30; });
    lightSweep(t, wk("b2", -1) - .1, { a: .26 });
  },
  b3(t) {   // THE REAL PAGE: pushed in on a fast morph; a liquid-glass magnifier reads a line
    const c = COPY.b3, t0 = wk("b3", 0) - .05, push = KIT.land(P(t, t0, dur(600, 1.35)));
    ctx.save(); ctx.translate(540, 500); ctx.scale(lerp(1.22, 1, push), lerp(1.22, 1, push)); ctx.translate(-540, -500 + (1 - push) * 140);
    browserCard(60, 140, 960, 720, c.url, t, t0, ex("b3"), c.img ? { img: c.img, scroll: KIT.heavy(P(t, at("b3", .3), 1.1)) * .3, label: "REAL PAGE" }
      : { draw: (X, Y, w, h) => { ctx.fillStyle = "#F4F4F8"; ctx.fillRect(X, Y, w, h); font("JBM", 22, 3); ctx.fillStyle = "#8888A0"; ctx.textAlign = "center"; ctx.fillText("CAPTURE THE REAL PAGE: engine/capture.py", X + w / 2, Y + h / 2); } });
    ctx.restore();
    const ms = popS(t, at("b3", .45), at("b3", .85)); if (ms > .01) liquidGlass(420, 560, 380, 132, 66, t, { sc: ms, mag: 1.9, frost: 0, disp: .025, bright: 1, sat: 1, tint: "rgba(123,97,255,.06)", glow: "rgba(40,20,120,.35)" });
  },
  b4(t) {   // HOW IT WORKS: three liquid-glass planes; the transcript plane shows the speaker's REAL words and timestamps
    const c = COPY.b4, e = ex("b4"), r = reveal(t, B.b4[0] + .05, e);
    if (r) { ctx.save(); ctx.globalAlpha = r.a; eyebrow(c.eyebrow + " · " + LBL(), 540, 150 + r.dy * .4, { size: 24, ls: 9 + r.ls }); ctx.restore(); }
    const t1 = at("b4", .15), t2 = at("b4", .4), t3 = at("b4", .65), beats = Object.keys(B);
    glassPlane(600, 700, 760, 210, 2, c.planes[2], t, t3, e, (w, h) => beats.slice(0, 3).forEach((b, i) => { const a = clamp(P(t, t3 + react(i + 1), .2)); if (!a) return; ctx.save(); ctx.globalAlpha *= a;
      font("JBM", 22, 4); ctx.textAlign = "left"; ctx.fillStyle = C.lav; ctx.fillText(`${b.toUpperCase()} · ${B[b][0].toFixed(1)}–${B[b][1].toFixed(1)} S`, -w / 2 + 40, -h / 2 + 70 + i * 50); ctx.restore(); }));
    glassPlane(600, 700, 760, 210, 1, c.planes[1], t, t2, e, (w, h) => { let x = -w / 2 + 36, y = -h / 2 + 52;
      inBeat("b4").slice(0, 8).forEach((wd, i) => { const s = `${wd.w.replace(/[.,!?]/g, "")} ${wd.t.toFixed(2)}`, a = clamp(P(t, t2 + react(Math.min(i, 5)), .2)); font("JBM", 22, 1); const cw = ctx.measureText(s).width + 28;
        if (x + cw > w / 2 - 30) { x = -w / 2 + 36; y += 58; } if (a) { ctx.save(); ctx.globalAlpha *= a; rr(x, y, cw, 44, 11); ctx.fillStyle = "rgba(52,40,140,.7)"; ctx.fill(); ctx.strokeStyle = "rgba(190,170,255,.55)"; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.fillStyle = "#EDE8FF"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(s, x + 14, y + 23); ctx.textBaseline = "alphabetic"; ctx.restore(); } x += cw + 10; }); });
    glassPlane(600, 700, 760, 210, 0, c.planes[0], t, t1, e, (w, h) => { const n = 64; for (let i = 0; i < n; i++) { const tt = t - 2.4 + 2.4 * i / n, on = D.words.some(wd => tt >= wd.t && tt < wd.e) ? 1 : .12, amp = on * (.35 + .65 * hsh(i, Math.floor(tt * 12)));
      const bh = 16 + amp * (h - 90), x = -w / 2 + 40 + i * (w - 80) / n; rr(x, -bh / 2 + 10, (w - 80) / n - 4, bh, 4); ctx.fillStyle = i > n - 3 ? C.cyan : `rgba(170,150,255,${.45 + .5 * amp})`; ctx.fill(); } });
  },
  b5(t) {   // RUN IT: a Claude Code-style terminal types the speaker's exact prompt (mock UI, labelled)
    const c = COPY.b5, tp = at("b5", .45);
    terminal(60, 150, 960, 560, t, B.b5[0] + .05, ex("b5"), [{ t0: B.b5[0] + .2, text: "/help for commands", col: "rgba(244,239,230,.55)" },
      { t0: at("b5", .2), text: "your-video.mp4 added", prefix: "+ ", col: C.mint }, { t0: tp, t1: Math.min(B.b5[1] - .4, tp + c.prompt.length * .045), text: c.prompt, prefix: "> " }], { title: c.title, label: LBL() });
  },
  b6(t) {   // THE PAYOFF: statement behind the head
    const c = COPY.b6, bot = behindY(B.b6[0], B.b6[1], LY.FULL, 170, "ISerif", .3);
    stackHead([{ t: c.line1, size: Math.min(130, fitSize(c.line1, "IDBlack", 980)), fill: heroGrad }, { t: c.line2, fam: "ISerif", size: 170, ls: 0, fill: deepGrad, d: .3 }], 540, 0, t, wk("b6", 0), ex("b6"), { bottom: bot });
  },
  fin(t) {  // CTA (Monday slam): the keyword drops from 2.2x onto its word; the planted file unlocks
    const c = COPY.fin, kw = D.words.find(w => w.t >= B.fin[0] && clean(w.w) === clean(c.keyword)), tk = kw ? kw.t : at("fin", .15);
    { const r = reveal(t, B.fin[0] + .1, null); if (r) { ctx.save(); ctx.globalAlpha = r.a; eyebrow(c.eyebrow, 540, 132 + r.dy * .4, { size: 24, ls: 9 + r.ls }); ctx.restore(); } }
    { const s1 = popS(t, wk("fin", 0)); if (s1 > .01) iconTile("message-square", 920, 600 + Math.sin(t * 1.2) * 8, 130, { sc: s1, tilt: .1 }); }
    if (t >= tk - .05) { const s = spring(t, tk - .05, 2.6, .42);
      for (let i = 0; i < 2; i++) { const rp = P(t, tk + i * .1, .8); if (rp > 0 && rp < 1) { ctx.strokeStyle = `rgba(170,150,255,${.6 * (1 - rp)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(540, 1130, 200 + rp * 420, 70 + rp * 140, 0, 0, 7); ctx.stroke(); } }
      text3D(c.keyword, 540, 1130, Math.min(200, fitSize(c.keyword, "IDBlack", 900)), { fam: "IDBlack", scale: lerp(2.2, 1, clamp(s)), ry: Math.sin(t * 1.3) * .14, rx: .16, depth: 26, alpha: clamp(P(t, tk - .05, .08)) }); }
    c.steps.forEach((s, i) => chip(s, 640, 1300 + i * 72, t, at("fin", .35) + react(i * 2), null, { size: 21 }));
  },
};

// ---------- FRONT layer (in front of the speaker) ----------
const FRONT = {
  b1(t) { const c = COPY.b1, t0 = wk("b1", 1), s1 = popS(t, t0, ex("b1")), s2 = popS(t, t0 + react(1), ex("b1"));
    if (s1 > .01) logoTile(c.logo, 135, 780 + Math.sin(t * 1.3) * 8, 150, { sc: s1, tilt: -.06, k: .62, ry: Math.sin(t * 1.1) * .6 });
    if (s2 > .01) iconTile(c.icon, 945, 780 + Math.sin(t * 1.2 + 1) * 8, 130, { sc: s2, tilt: .08 }); },
  b3(t) {   // logos lift off the page as glass lenses, on the words that name them
    COPY.b3.lenses.forEach(([n, lab], i) => { const t0 = at("b3", .4 + i * .25); if (t < t0) return; const [x, y, p] = arcAt(t, t0, 330 + i * 190, 470, i ? 975 : 105, 960), out = leaveP(t, ex("b3"), .4);
      glassLogo(n, x, y, 150, t, { sc: lerp(.5, 1, KIT.land(P(t, t0, .35))) * (1 - out), alpha: clamp(P(t, t0, .12)) * (1 - out), ry: Math.sin(t * 1.2 + x) * .55, k: .5, label: p > .7 ? lab : null }); }); },
  b5(t) { const e = ex("b5"), s1 = popS(t, at("b5", .2), e), s2 = popS(t, at("b5", .45) + react(0), e);
    if (s1 > .01) iconTile("folder-down", 945, lerp(760, 960, KIT.land(P(t, at("b5", .2), dur(220)))) + Math.sin(t * 1.3) * 6, 130, { sc: s1, tilt: .08 });
    if (s2 > .01) iconTile("clipboard-paste", 135, 960 + Math.sin(t * 1.2) * 6, 130, { sc: s2, tilt: -.08 });
    lockedFile(160, 1420, 220, 280, t, { sc: popS(t, at("b5", .8) - .1, e), tilt: -.07, ry: Math.sin(t * .9) * .18, title: COPY.fin.file }); },   // plant: pays off in the CTA
  b6(t) { const c = COPY.b6, e = B.b6[1] - .2, a = vis(t, B.b6[0] + .02, e), ws = inBeat("b6"); if (!a) return;
    ctx.save(); ctx.globalAlpha = a; liquidGlass(130, 830, 228, 300, 30, t, { mag: 1.08, frost: 14, tint: "rgba(20,16,60,.5)" });
    checklist(34, 740, c.checks.map((text, i) => ({ text, t0: ws.length ? ws[Math.min(ws.length - 1, Math.round(i * (ws.length - 1) / Math.max(1, c.checks.length - 1)))].t : B.b6[0], show: B.b6[0] })), t, { size: 20, lh: 62 }); ctx.restore(); },
  fin(t) { const tg = at("fin", .7); lockedFile(170, 1440, 220, 280, t, { sc: popS(t, B.fin[0] + .1) * lerp(.9, 1, eOutQuint(P(t, tg, .6))), tilt: -.05, ry: Math.sin(t * .9) * .15, reveal: P(t, tg - .1, .8), sweep: P(t, tg + .3, 1.2), title: COPY.fin.file }); },
};

const beatAt = t => { const ks = Object.keys(B); for (const k of ks) if (t >= B[k][0] && t < B[k][1]) return k; return ks[ks.length - 1]; };
const prevBeat = k => { const ks = Object.keys(B), i = ks.indexOf(k); return i > 0 ? ks[i - 1] : null; };
window.SCENE = {
  lang: COPY.lang,
  timeline: TIMELINE,
  logos: [COPY.b1.logo, ...COPY.b3.lenses.map(l => l[0])].filter((v, i, a) => a.indexOf(v) === i),
  icons: [COPY.b1.icon, "folder-down", "clipboard-paste", "file-text", "lock", "lock-open", "message-square", "check", "x", "sparkles"],
  screens: COPY.b3.img ? [COPY.b3.img] : [],
  worldOpts: t => t >= B.fin[0] - .3 ? { deep: true, bloomY: 600, bloomA: .48 } : { bloomY: 640 },
  back(t) { const b = beatAt(t), p = prevBeat(b); if (p && BACK[p] && t < B[b][0] + .35) BACK[p](t); if (BACK[b]) BACK[b](t); },
  front(t) { const b = beatAt(t), p = prevBeat(b); if (p && FRONT[p] && t < B[b][0] + .35) FRONT[p](t); if (FRONT[b]) FRONT[b](t); },
  capY(t, Ly, fr) { if (t >= B.fin[0]) return 1590; const g = D.caps.find(c => t >= c.t[0] && t < c.t[1]); let m = 0; const k0 = Math.round((g ? g.t[0] : t) * FPS), k1 = Math.round((g ? g.t[1] : t) * FPS); for (let k = k0; k <= k1; k++) m = Math.max(m, D.face[Math.min(k, D.face.length - 1)][3]); return clamp(Ly.dy + m * Ly.k + (Ly.on > .5 ? 100 : 120), 1150, 1700); },
  capX: (t, Ly) => Ly.card[0] + Ly.card[2] / 2,
  hideCap(t) { const g = D.caps.find(c => c.beat === "fin");   // hidden where a headline already says the line, and under the CTA keyword slam
    return t < B.b1[1] || (t >= B.b6[0] && t < B.b6[1]) || (g && t >= g.t[0] - .2 && t < g.t[1]); },
};
