---
name: motion-editing
description: Edit a raw talking-head video from "01 Raw Footage" into a finished, graphics-rich vertical Reel in the Deep Navy style, with a cover, a VO+SFX stem and a delivery report. Use whenever a new video arrives or the creator asks to edit or re-edit one.
---

# Motion editing (Deep Navy v4 + motion-kit)

The look is fully specified in `04 Editor Kit/docs/deep-navy-style.md`. Motion follows `04 Editor Kit/docs/motion-rules.md`. **Don't re-ask anything those docs settle.** Ask only what changes the build: publish weekday (CTA twist), music track, anything ambiguous in the script.

1. **Intake.**
   - `cd "04 Editor Kit" && ./new_video.sh "<Name>" "../01 Raw Footage/<file>"`
   - In `work/<Name>`, with the venv at `~/.motion-studio/venv`: `python3 engine/transcribe.py`, `python3 engine/faces.py cache/src.mp4`, `python3 engine/matte.py cache/frames cache/mattes` (mattes take ~13 min per 2 min of video; run them in the background).
2. **Read, in order:** `docs/deep-navy-style.md` (all of it: §2 non-negotiables, §3 lessons, §10 element library, §11 outside-the-box), `docs/motion-rules.md`, `docs/cta-endings-deep-navy.md`, `reference/scene.template.js` (start every scene from it: fill its `COPY` block, set `lang`, re-order recipes to fit the script), then `docs/motion-library.md` for curve vocabulary.
3. **Content map.** Every tool, app, number, claim, tease and quote, with word timestamps. Add ASR fixes for tool names (e.g. "Cloud Code" → "Claude Code"). Real logos only (`02 References & Assets/logos`); Lucide icons (white, stroke 2.2). For every site, repo or doc mentioned, capture the **real public page** with `python3 engine/capture.py <url> <name>.png [w] [h]` and show it in a `browserCard`. For every prompt quoted, plan a `chatSim` with the exact words.
4. **Edit Plan.** A beat table: time, layout (FULL / BW / CARD / LOW / WIDE / FIN), headline, star device (§10, by "use it when the speaker…"), 2–4 side elements with back/front layer and their lead → reaction order, captions + keywords + hides, SFX, plant/payoff. Name the **new device** this video introduces. No star device repeats in consecutive beats. Show it for approval unless told "just build it".
5. **Build.** `plan/config.json` from `reference/config.template.json` (fps, src_frames, beats, proper nouns, keywords, fixes, hides, `glitch`) → `python3 engine/prep_v4.py` → `src/scene.js`. Trigger on `WT(word, nth)`. Containers use `fitCard(card, k, pop)` (head pops out, plate reaches the card bottom); behind-head type uses `behindY`; eyebrows use the `stackHead` `eyebrow` option. Followers use `react(i)` offsets; travel uses `dur(px, w)` / `arcAt`; travelling exits use `leaveP`; curves come from `KIT.land / heavy / whip / leave` (all in `engine/navy.js`).
6. **QA stills** (`python3 engine/stills.py cache/qa.jpg qa t1 t2 …`) at every beat, transition, the first .5 s and the last frame. Run the §15 checklist plus the motion-rules check. Then a 10 fps motion sheet over the hook, each morph and the CTA.
7. **Render** in 2–3 parallel ranges (`K0=… K1=… python3 engine/render.py video renders/pN.mp4`), concat, confirm the frame count.
8. **Audio.** Copy `reference/audio.template.py`, rewrite the cues (every star device gets one on its word), SFX peak −14 dBFS, music only if supplied (ducked ~15 dB under the voice), limiter + two-pass loudnorm I −14 / TP −2.2, re-measure after the mux.
9. **Cover.** `cover/` + a real photo cut with `cut.mjs` (see `docs/cover-style.md`).
10. **Export and report** to `03 Exports/<Name>/`: Final vN, VO+SFX stem vN (+ music bed). Never overwrite a version. The report covers specs, loudness, layouts, face/caption checks, logos, honesty labels, the new device, credits spent and a needs-review list.
