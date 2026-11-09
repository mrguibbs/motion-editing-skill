# Deep Navy v4: the house style

**This is the single source of truth for how a Deep Navy video looks, moves and sounds.** Every rule here was tested on real edits. Follow it without re-asking the creator anything it settles.

- **Older docs:** where any older style note disagrees with this file, this file wins.
- **Start here:**
  - **Template build:** `reference/scene.template.js` (+ `config.template.json`, `audio.template.py`): every device below, wired to the speaker's words, runnable on any talking-head video.
- **Motion timing:** `docs/motion-rules.md` (motion-kit layered on §9; this file wins on conflicts).
- **Engine:** every function named here lives in `engine/navy.js`.

---

## 1. The look in one breath
The speaker talks in **their own room**, shown full bleed and cleanly graded in its real colours. Big layered type lives **behind their head**; glossy 3D tiles, notifications and captions live **in front of them**. When an idea needs room, they step into a **glass container and their head breaks out of its top edge**. Everything lands **on the exact spoken word** with crisp ease-outs and no bounce. Dark navy and violet appear only as *light and material*: blooms, glass and glows. They never tint the speaker or their room.

## 2. Non-negotiables
1. **Faces are sacred.** Nothing in front of the speaker ever touches the face box: not tiles, chips, captions or orbiting items. Type behind their head may be "kissed" by their hair, but never more than 40% of any letter is hidden.
2. **Their room, their colours.** No violet multiply, no blue wash, no tinted veil on their body or clothes, no halo.
3. **No blur bands.** FULL is full bleed. The plate is never pulled back with blurred edge-extension, and inside a card the plate must cover the card's width.
4. **Container rule.** Whenever the speaker is in a smaller container, their head sticks out of the top edge (`fitCard` / `popDy`), and the top border runs *behind* their head.
5. **No pills on captions.** Clean type only. The emphasised serif word takes the under-chin slot, and the bold phrase *softly overlaps* its lower third (§8).
6. **Smooth = crisp ease-outs, zero rubber-band.** No bouncing springs, no lingering blur haze. Overlaps are always *soft and designed* (contact shadow, glow, fade-in), never one text abruptly covering another.
7. **No cartoon props.** Everything is glass, 3D tile, real UI or real logo. A gift box read as "from the 1980s".
8. **Honesty.**
   - Real logos only.
   - Mock UI says ILLUSTRATION; demo values say EXAMPLE; the speaker's own numbers say PERSONAL RESULT (in the video's language: set `SCENE.lang`).
   - Quotes are the speaker's words verbatim.
9. **The speaker's vocabulary.** Keep tool names exact (ChatGPT, Claude, Claude Code) and add ASR fixes for any word the transcriber gets wrong (e.g. `"Cloud": "Claude"`), in `config.fixes`.
10. **Instagram safe zone.** Nothing in the right 180 px between y 1100 and 1700.
11. **Nothing empty > ~1 s.** Every beat has a headline or star device plus 2–4 side elements.
12. **The video ends on the speaker's last frame**, with no tail and no SFX or music ringing past it.

## 3. Lessons from real edits, and the rule each became
| Problem seen in review | Rule now |
|---|---|
| A blue/violet wash tinted the speaker | Subject grade is natural; wardrobe tame is opt-in (`SCENE.wardrobe`, default 0); rim light subtle (alpha .22, blur 18·k) |
| The room looked dull and blue | Room grade: brightness .8, saturation .95, contrast 1.18, no multiply (§4) |
| The container's top line crossed the head | `cardBorder` is drawn before the speaker; sides and bottom are redrawn on top |
| Blurred bands at the sides looked cheap | FULL = scale 1.03 full bleed; cards: k·1080 ≥ card width |
| A cartoon gift-box prop looked dated | Plant/payoff with premium objects (`lockedFile`), never cartoon props |
| Motion felt stiff | Curves measured from premium reference edits (§9) plus motion-kit timing (`docs/motion-rules.md`) |
| An icon got hidden behind the head | Never park a side element where the head covers it. Explanatory elements go above the speaker or in a container's free space |
| Captions in pills; top phrases overlapped | Caption spec §8; top-of-frame text is strictly sequenced |
| Logo icons looked static | `logoTile(..., { ry })` always turns |
| UI cards fought with the speaker for space | Container rule §5 |
| A key progress bar lacked emphasis | Data visuals go in open space, large (top band or a container's free area) |
| Narrow side columns felt squishy | No narrow side columns for multi-step content; use WIDE + full-width UI |
| Music drowned the voice | Music bed spec §13 |
| A headline covered its own eyebrow | An eyebrow belongs to its stack: `stackHead(..., { eyebrow: { t, t0 } })` measures the stack's real top and places the eyebrow clear of it (it pushes the stack down if there's no room). Never position an eyebrow independently above a crown-anchored stack |
| Overlapping words looked abrupt | Emphasis captions = serif word on top, bold phrase overlapping its lower third with a violet glow, a dark halo behind the serif; the same layered logic as `stackHead`. Use at every emphasis and phrase ending |
| Phrase endings needed punch | `glitchIn` on 3–5 phrase-ending words per video (config `"glitch"`), with a quiet stutter SFX |
| Mocked-up screens felt fake | `browserCard` with real screenshots (`engine/capture.py`), `chatSim` (ChatGPT / Claude), `neonTrace` on these containers (§10) |
| A black strip showed under the speaker inside a container | `fitCard` fills every container to its bottom edge (§5) |

## 4. World and grade (exact)
- **World** (`world()`, shows around containers): vertical navy gradient `#03050C → #0A1230 → #02030A`, violet bloom behind the speaker's head, cyan bloom bottom-right, 60 px grid at ~5%, seeded stars and slow drift. Final beats use `{ deep: true, bloomY: 600, bloomA: .48 }`.
- **Room** (`buildPlate`):
  - filter `brightness(.8) saturate(.95) contrast(1.18)`;
  - screen-blended practicals: magenta left ≤ .14, violet right ≤ .10, faint cyan bottom-right ≤ .08;
  - neutral vignette multiply (edge `rgb(70,68,100)`).
  - Override per video: `SCENE.roomGrade`.
- **Subject:** `brightness(1.02) contrast(1.08) saturate(.96)`, cool key .07 from top-left, cyan edge .08 from the right. Override: `SCENE.subjectGrade`.
- **Shadow and rim:** offset dark shadow (blur 60·k, offset 22·k / 30·k, alpha .9) onto whatever is behind the speaker, plus a violet rim (blur 18·k, alpha .22).
- **BW punch:** one beat per video, the strongest line, grayscale with a violet headline.

### Palette (light and material only)
| Token | Hex | Use |
|---|---|---|
| ink | `#04060E` | deepest world |
| navy | `#0A1230` | world mid tone |
| indigo | `#2B2378` | active rows |
| violet | `#7B61FF` | glows, icon tiles, bars |
| lavender | `#CDBFFF` | eyebrows, hairlines |
| cyan | `#5BE4F0` | data, counter-glow |
| mint | `#4FE3B5` | checks / "good" only |
| warn | `#FF8FA8` | mistakes, "worse", strike-throughs |
| white | `#F5F3FF` | text |

Gradients:
- `heroGrad` (`#FFF → #DCD2FF → #9A82FF`) for line 1 and keywords.
- `deepGrad` (`#EEE8FF → #B7A2FF → #7B5CF5`) for line 2.

## 5. Layouts (exact presets from the approved build)
| Name | Definition | Use |
|---|---|---|
| **FULL** | `L({ k: 1.03, dy: 260 })` | Default. Talking + type behind the head. dy 260 leaves a dark ceiling fade for type (tune per raw: the crown should land at y ≈ 450–520) |
| **BW** | `L({ k: 1.03, dy: 260, bw: 1 })` | One punch beat per video |
| **CARD** | `fitCard([270, 860, 540, 740, 44], .52)` | Explainers with UI above (composer, compare cards) |
| **LOW** | `fitCard([290, 1010, 500, 640, 44], .48)` | When the top needs the most room (3D stacks, big headline + data bar) |
| **WIDE** | `fitCard([210, 1050, 660, 660, 48], .62, 110)` | Multi-step content: full-width flow, prompt cards, chat rows, meters |
| **FIN** | `fitCard([300, 330, 480, 640, 40], .5)` | CTA (see `cta-endings-deep-navy.md`) |

- **No gap under the speaker:** always build containers with `fitCard(card, k, pop)`. It keeps the `popDy` head pop and raises k only as far as needed so the plate reaches the card's bottom edge (a short plate leaves a black strip at the bottom). Captions inside a container are scaled to fit its width (card width − 48) automatically.
- **Container rule:** `popDy(cardTop, k, pop)` uses the median of the speaker's matte-measured crown (`D.crown`), so their head always clears the top edge by `pop` px (110–120). Check k·1080 ≥ card width, or blurred edge-extension shows.
- **Rhythm:** don't hold one layout for more than ~15 s. Alternate container shapes (CARD → LOW → WIDE → CARD) so long explanations keep moving. Morph between layouts on beat changes, never mid-sentence.
- **Avoid:** narrow SIDE columns for real content ("squishy").

## 6. Depth system
Draw order every frame: world → graded room → **BACK layer** → the speaker's cutout (shadow, rim) → **FRONT layer** → captions → vignette.

| Back (behind the speaker) | Front (in front of the speaker) |
|---|---|
| headlines (`stackHead`), marquee, phone cards, 3D planes, panels, number rolls, orbit far side | 3D logo/icon tiles at x ≈ 135 / 945, chips, toast, cursor, locked file, ring meter, orbit near side, spotlight, light sweep, captions |

- **Behind-head type:** anchor with `behindY(t0, t1, Ly, size, fam)`. It takes the highest crown in the range and bites ≈16% of the cap height, so the head kisses the letters.
- **Face guard:** `window.FACE` is the face box each frame. Front elements must stay clear; `orbit` fades any near-side item before it touches the face.
- **Never park** a side element where the head will cover it. If it explains the beat, it goes above the speaker or into a container's free space.

## 7. Typography
| Role | Font | Spec |
|---|---|---|
| Eyebrow | JetBrains Mono Bold (`JBM`) 22–30 px | uppercase, tracking +8–12, lavender, y ≈ 140–222. One eyebrow at a time |
| Headline | Inter Display Black (`IDBlack`) 92–168 px | tracking −4.5%, `heroGrad` |
| Contrast line | Anton 200–300 px | condensed, `deepGrad` (EXAMPLE, REVERSE, +70%) |
| Emphasis | Instrument Serif Italic (`ISerif`) 150–210 px | `deepGrad`, `ls: 0`, one or two words |
| Edge-to-edge hook | `IDBlack`, `fitSize(str, "IDBlack", 1060–1120)` | bleeds the frame, behind the head |
| UI text | `IDBlack` 30–50 / `IDMed` 26–40 / `IDBold` 30–34 | panels, rows |
| Labels | `JBM` 16–22 px | "01 · TEXT", "ILLUSTRATION", "EXAMPLE" |

- **Stacks (`stackHead`, the "layered paper" look):**
  - each line overlaps the one above by 4.5%, spaced by real cap height;
  - every line draws twice, a quiet violet bloom (blur .2·size, alpha .32) then a dark contact shadow (blur .16·size, offset .055·size);
  - line 1 `heroGrad`, line 2 `deepGrad`, at most two families per stack;
  - use `bottom:` to pin the last baseline.
- **Highlight bar (`barTag`):** a violet bar wipes in, then serif text settles inside it. Use it for the beat's key phrase ("a little surprise", "direct commands", "with a reference").
- **Eyebrows belong to their stack.** Pass `eyebrow: { t, t0, size?, gap? }` to `stackHead`. It sits `gap` (40) px above the stack's real top, never below y 128, and the stack moves down if needed. Separate `eyebrow()` calls are only for screens with no stack under them.
- **Top-of-frame sequencing:** an eyebrow or headline must fully exit before the next one enters at the same y (exit ≈ .25 s, next enters ≥ .1 s after).

## 8. Captions (spec)
- **Font:** Inter Display ExtraBold 60 px, white, with a soft dark shadow (`capShadow`: blur 22, offset 3). **No plate, no pill, ever.**
- **Position:** the slot under the speaker's lowest chin in the group: +120 px in FULL, +100 px in containers, centred on the card (`capX = card centre`), clamped 1150–1700. The CTA uses y ≈ 1590.
- **Reveal:** word by word. Upcoming words wait at 32%; each spoken word rises 8 px with a quint ease-out over .25 s.
- **Emphasis (layered):** keyword(s) from `config.keywords` (k = 1).
  - The serif word (Instrument Serif 104 px, white → lavender, fading slightly at its foot) takes the under-chin slot, with a dark halo (blur 38) so it reads on any wardrobe. It rises softly out of a 5 px blur over .4 s on its word.
  - The bold phrase (62 px) sits **40 px lower**, overlapping the serif's lower third, with a violet glow (blur 28) that seats it on the serif. Same depth logic as stacked headlines.
  - It never lifts toward the face. Choose 15–25 keywords per 2 min: nouns that carry the idea, not filler.
- **Glitch-in:** list 3–5 phrase-ending words in `config.glitch` (prep marks them `g`). On their word they glitch in for .32 s (violet/cyan channel split + 6 jittering slices), then settle clean. Pair each with a `stutter` SFX.
- **Hide** the caption wherever a headline, highlight bar or number already says the line (`SCENE.hideCap`), plus the keyword-only group in the CTA.

## 9. Motion (measured from premium reference edits)
| Thing | Curve / timing |
|---|---|
| Text entrance (`reveal`) | quint ease-out, rise 36 px over .45 s, blur 8 → 0 in .25 s, opaque by .18 s; lines stagger .12 s; it lands **on** its syllable |
| Object pop (`popS`) | soft back-out ≈ `cubic-bezier(.2,1.25,.4,1)`, .42 s (`eOutBack`) |
| Springs (`spring`) | clamped near-critical (damping ≥ .82): settle, never wobble |
| Layout morph | .8 s `eInOutQuart` ≈ `cubic-bezier(.7,0,.25,1)`; the whole plate scales as one piece |
| Exit | .25 s ease-in, −18 px, 6 px blur, .25–.3 s before the next beat |
| Idle life | tiles bob 5–8 px (sin, ~2.4 s); logo tiles turn ±.6 rad; camera drift ≤ 14 px; marquee drift |
| Glitch-in | `glitchIn`, .32 s, on 3–5 phrase-ending words per video (config `glitch`); never on every caption |

## 10. Element library (all in `engine/navy.js`; proof: element board + approved build)
| Element | Use it when the speaker… | Layer · placement | Notes |
|---|---|---|---|
| `stackHead` + `behindY` | states the beat's idea | back, top band | 2 lines, hero + deep; `bottom` pinned to the crown bite |
| `fitSize` hook | opens with a number / short claim | back, edge to edge | "4 TIPS", "COPY THIS" |
| `barTag` | says the key phrase | back, top band | one per beat |
| `logoTile` (3D, `ry`) | names a tool | front, x 135 / 945 or top row | always turning; real logos only |
| `orbit` | lists tools / "works with everything" | back + front pass, halo at crown −20 | `tiltY ≈ .22`; never crosses the face |
| `iconTile` | a concept word lands | front, sides | Lucide icons, `02 References & Assets/icons/` (white, stroke 2.2) |
| `chip` | adds a qualifier ("+ ANY TOOL", "AT THE END") | front | mono, short |
| `flowPanel` | describes steps / a process | above a container | 3 steps, each on its word |
| `rowCard` | lists items with one active | above a container | active follows speech |
| `checklist` · `progressPanel` | shows work being done | panels | ticks on the word |
| `timelineUI` + `cursor` | talks about editing / process | above a WIDE container | label EXAMPLE / ILLUSTRATION |
| `planeQuad` stack | explains layers / a transformation | above a LOW container | 3 planes, labels "01 · …" |
| `beforeAfter` | contrasts wrong vs right, old vs new | above a CARD | wipe on the turning word |
| `numberRoll` (+ `brNum`) | says a number | back, behind the head | local number format; the speaker's own claim → PERSONAL RESULT |
| `ringMeter` | gives a percentage / progress | front, top corner | — |
| `toast` | "you receive / it notifies / it answers" | front, top | real app logo |
| `spotlight` | points at something | front finish | dims everything else |
| `lightSweep` | big reveal / beat change | front finish | ≤ 1 per 15 s |
| `marquee` | the beat's keyword as texture | back, behind the head | alpha ≈ .1–.12 |
| `phoneCard` | shows an app or result as a phone | back, beside the head (x 160 / 920) | turned toward the speaker (rotY ±.42) |
| `lockedFile` | promises a file / surprise | front, below the chin (hook) → CTA unlock | plant & payoff |
| `iconRow` | "works for X, Y, Z" | above a container | 3–4 labelled tiles |
| `text3D` | the CTA keyword | front | extruded slam |
| `browserCard` | mentions a site, a repo, docs, an article, a product page | above a container (WIDE/CARD) | **real** screenshot via `python3 engine/capture.py <url> <name>.png [w] [h]` → `assets/screens/`, list it in `SCENE.screens`; `scroll`, highlighter `marks` on the line the speaker reads; public pages only; cookie overlays are hidden in the capture, never "accepted" |
| `chatSim` | "you ask ChatGPT / Claude…", any prompt → answer | above a container | `"chatgpt"` or `"claude"` (real logos); the speaker's prompt types, the answer streams with a caret; labelled automatically (`SCENE.lang`) |
| `neonTrace` | any tech / modern container | on the container's frame | comet dot circling the edge; on by default in `browserCard` and `chatSim`; add it to cards and panels for "tech" beats |
| `glitchIn` | ends a phrase on a strong word | captions (config `glitch`), or wrap any text draw | 3–5 per video |
| `stackHead` `eyebrow` option | any headline with an eyebrow | back, top band | always use it instead of a free eyebrow |
| `liquidGlass` | anything that should feel premium / "glass": a lens, a sheet holding real text, a panel over the room | back or front | refracts what is painted behind it (magnified, frosted, per-channel RGB fringe at the edges, Fresnel rim, sliding softbox highlight, bevel). Options `mag`, `frost`, `disp`, `tint`, `ry`, `content(w, h)`. Inspired by originkit.dev, our own canvas build |
| `glassLogo` | names a tool and the logo should "lift off" a page or float as glass | front, side slots x ≈ 105 / 975 (y < 1100) | `liquidGlass` lens with a real logo + mono label; pair with `arcAt` to fly it out of a `browserCard` |
| `liquidGlass` magnifier | reads a line from a real page | over the `browserCard` line | `mag` ≈ 1.9, `frost: 0`, `disp` ≈ .025, on the highlighted words |
| `glassPlane` | explains layers / how something thinks (audio → transcript → plan) | above a LOW container | the `planeQuad` stack in liquid glass; put **real** data in the planes (the speaker's words + timestamps, this video's beats) |
| `terminal` | "drop it in your project", "paste this prompt", anything run in Claude Code | above a CARD | mock UI, always labelled; `o.title`, `o.label`; types the speaker's real prompt / repo file line |
| motion-kit port: `react(i)`, `dur(px, w)`, `arcAt`, `leaveP`, `KIT.land / heavy / whip / leave` | every beat with 2+ elements, anything that travels or exits | — | see `docs/motion-rules.md`: lead + uneven reactions, duration from distance, quicker accelerating exits |
| `giftBox` | **deprecated**, do not use | — | kept only for old builds |

## 11. Thinking outside the box (do this every video)
1. **One new device per video.** Every new edit uses at least one element or combination not used in the previous video, and the delivery report names it. Keep a running list in the report.
2. **No repeats in consecutive beats.** If beat N used a flow panel, beat N+1 uses a different star device.
3. **Plant and payoff.** Any tease ("at the end", "I'll show you", "secret") gets an object planted on the tease and resolved in the CTA, as with `lockedFile` unlocking on "file" or "guide".
4. **Map speech to device first, design second.** For each beat ask: *what would a motion designer draw for this exact sentence?* Use §10's "Use it when the speaker…" column.
5. **Depth in every beat:** something behind the head, something in front, and a cast shadow.
6. **Objects carry across beats** (continuity). A tile from the hook can orbit later; the locked file returns in the CTA; a chip becomes a row.
7. **Ideas bank** (pick what fits the script):
   - the speaker's own words typing into a real-looking terminal or chat;
   - a counter racing to the number they say;
   - a notification from the tool they name;
   - a before/after wipe on "instead of";
   - an editor timeline being "cut" as they say "cut";
   - an orbit of logos on "any tool";
   - a spotlight when they say "look at this";
   - a 3D stack splitting a concept into layers;
   - a marquee of the beat keyword behind the head;
   - the **real page** they mention in a browser with the sentence highlighted;
   - **ChatGPT / Claude typing** their exact prompt and streaming an answer;
   - a **neon dot** circling every tech container;
   - **glitch-in** on the word that lands a phrase;
   - a **liquid-glass magnifier** reading the exact line they quote from a real page;
   - **logos lifting off the page** as glass lenses on the words that name them;
   - their **own repo / file** shown for real (`browserCard` + `liquidGlass` sheet), when they talk about something they built.

## 12. Honesty labels
- **ILLUSTRATION:** any mock UI (composer, timeline, meters, phone screens, planes with fake code).
- **EXAMPLE:** demo values or sample content not from the video.
- **PERSONAL RESULT:** the speaker's own claims and metrics (e.g. +70%).
- Labels appear in the video's language (`SCENE.lang`: `"en"` or `"pt"`).
- **Logos:** real files from `02 References & Assets/logos/` only, or a flagged wordmark.
- **Quotes:** on-screen quotes are what the speaker says, verbatim.

## 13. Sound
- **SFX:** procedural tech palette (`engine/audio_tech.py`): air sweeps on layout changes, sub impacts on headlines, clean ticks on chips and rows, data grains on tokens and data, shimmer on reveals, typing for composers and chat sims, a quiet `stutter` on every glitch-in word.
  - Give every star device a matching cue on its word.
  - SFX peak −14 dBFS; a short room reverb (14% wet); fade the last .35 s.
- **Music:** only a track the creator supplies (and has the rights to), stored in `02 References & Assets/music/`.
  - Trim it to the video, with a .4 s fade-in and a 2.5 s fade-out ending on the speaker's last frame.
  - Bring it down about −15 dB, then sidechain-duck it under the voice (threshold .12, ratio 3, attack 20 ms, release 400 ms). That lands near −29.5 LUFS, about 15 dB under the VO.
  - Flag the licence in the report.
- **Master:**
  - mix VO + SFX + music;
  - `alimiter` (limit .8);
  - two-pass **linear** loudnorm, I −14 / TP −2.2;
  - re-measure after the AAC mux.
- **Exports:** Final, VO+SFX stem (no music), and the music bed on its own.

## 14. CTA
See `cta-endings-deep-navy.md` for the base plus the weekday twist. With v4:
- the FINC card uses `popDy`;
- captions are plain at y ≈ 1590;
- the eyebrow sits at y ≈ 132, above the popping head;
- the payoff object is the planted one (`lockedFile` unlock).

## 15. QA (before any full render)
1. **Stills.** Run `stills.py … qa` at every beat's middle, every transition, the first 0.5 s and the last frame. The red box is the face, the cyan box is the caption.
2. **Face box:** nothing in front touches it, including orbit near-side items and lifted caption keywords.
3. **Containers:** the head is out of every container's top edge, the border runs behind the hair, there's no blurred edge inside the card, and **no black strip at the card's bottom** (use `fitCard`).
4. **Captions:** no pills, under the chin, emphasis in the slot with the phrase below, hidden where a headline says it.
5. **Top band:** no two phrases overlap; one eyebrow at a time; every eyebrow is clear of its stack (use the `eyebrow` option). Check the frame where the crown is highest.
6. **Instagram zone:** the right 180 px between y 1100 and 1700 is empty.
7. **Gaps:** no empty stretch over ~1 s.
8. **Motion:** check a 10 fps contact sheet across the hook, every layout morph and the CTA payoff. No bounce, no blur haze, nothing popping. No even staggers (3+ elements land on uneven offsets), travelling exits faster than their entrance (`docs/motion-rules.md`).
9. **Words:** spelling, accents, tool names exact. After an ASR fix, update any `WT(...)` / audio cue that used the old spelling.
10. **Real pages:** the screenshot is the real public page, readable, with no cookie banner, and the URL in the bar matches it.
11. **Audio:** I −14.0 ±.3, TP ≤ −2.2 after the mux, SFX peak −14 dBFS, music ≈ 15 dB under the VO, silence after the last frame.

## 16. Versioning and delivery
- Export to `03 Exports/<Name>/<Name> - Final vN.mp4` (+ stems). **Never overwrite** an exported version: review notes create vN+1.
- When the creator approves a version:
  - mark the delivery report APPROVED;
  - if the build introduced new patterns, copy its scene/config/audio into `reference/` and update this doc.
