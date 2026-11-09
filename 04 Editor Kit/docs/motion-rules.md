# Motion rules: Deep Navy × motion-kit

How the house motion (`deep-navy-style.md` §9) and Hugh Phan's [motion-kit](https://github.com/hughminhphan/motion-kit) (`docs/motion-library.md`, `vendor/motion-kit.js`, MIT) work together.

**In our engine** (`engine/navy.js`, pure functions of time, no GSAP): `react(i)`, `dur(px, weight)`, `arcAt(t, t0, x0, y0, x1, y1, w)`, `leaveP(t, t0, d)`, and the curves `KIT.land`, `KIT.heavy`, `KIT.whip`, `KIT.leave` (plus `bez(x1, y1, x2, y2)` for your own). The `MotionKit.*` names below refer to the vendored GSAP version.

**Precedence:** `deep-navy-style.md` wins on every conflict. motion-kit fills the gaps the style guide doesn't specify: how followers react to a lead, how long a move takes, how things leave, and how holds stay alive.

## What stays exactly as Deep Navy defines it
| Move | Spec |
|---|---|
| Text entrance (`reveal`) | quint ease-out, rise 36 px over .45 s, lands on its syllable |
| Object pop (`popS`) | soft back-out `cubic-bezier(.2,1.25,.4,1)`, .42 s |
| Springs | near-critical, damping ≥ .82, never wobble |
| Layout morph | .8 s `cubic-bezier(.7,0,.25,1)`, the plate scales as one piece |
| Glitch-in | 3–5 phrase-ending words, .32 s |
| Shadows | every cutout and tile casts one (motion-kit calls drop shadows "web UI"; here they are the depth system) |

## What motion-kit adds
1. **A lead and its reactions, never even staggers.** When 2–4 side elements land on one beat, the star device leads on the spoken word and the rest follow at `MotionKit.react(i)` offsets: 0, 4, 9, 15, 22, 30 frames. No `i * 0.08`.
2. **Duration from distance and weight.** Anything that travels (a tile flying in from off-frame, a card sliding up) takes `MotionKit.dur(px, weight)`: weight .7 for chips, 1 for tiles, 1.35 for containers and browser cards. Pops and text reveals keep their fixed Deep Navy timing.
3. **Exits are quicker and accelerate out.** About .65× the entrance on `kit.leave` (`cubic-bezier(.55,0,.9,.35)`). This replaces the generic ease-in exit whenever an object leaves by travelling; in-place exits keep the .25 s fade.
4. **Travel bends.** Objects thrown across the frame use `arc` (x and y on different curves), not a straight line.
5. **Holds stay alive.** On top of the tile bob and camera drift: a seeded `wiggle` on a wrapper (≤ 3 px, ≤ .4°) for any panel held longer than ~2 s. Never on the plate or the speaker's cutout.
6. **Written text types.** Prompts, terminal lines and chat input use `typeOn` (stepped, with typing SFX). Supporting labels and chips **cut on** on their word. Headlines keep `reveal`.
7. **Named curves, chosen per move.** No bare `power3.out` / CSS `ease`. Pick from `kit.land` (entrances from off-frame), `kit.heavy` (containers, big planes), `kit.whip` (state changes, toggles), `kit.reveal` (masked type) or the Deep Navy curves above.

## Restraint
- One signature transition per video (a speed-ramped layout morph, a camera push through a browser card, etc.).
- Max one `lightSweep` per 15 s (style guide), and no wiggle on more than one element at a time.

## Check (add to `deep-navy-style.md` §15)
- No even staggers: scrub any beat with 3+ elements landing and confirm uneven offsets.
- Every travelling exit is faster than its entrance.
- No named preset curve is used because it was the default.
