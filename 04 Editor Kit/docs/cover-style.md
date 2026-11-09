# Reel covers: Deep Navy cover style

> **Every video ships with its cover.** When a video is exported, the editor also builds its cover from the same content, in this style, and lists it in the delivery report.
> Generator: `cover/cover.html` + `cover/make.py <cfg>.json`. Cutout: `cover/cut.mjs`.

## 1. The look
Top to bottom, every cover has the same layers:

| Layer | What it is |
|---|---|
| **Backdrop** | Deep Navy: vertical navy gradient, faint 60 px grid, a violet bloom behind the head and a cyan bloom bottom-right. Never flat black |
| **Eyebrow** | JetBrains Mono, tracked wide, lavender: the tools or topic ("CLAUDE CODE · FFMPEG · WHISPER") |
| **Title** | One huge Anton word or short phrase behind the head (hero gradient, violet glow). The head may rise into it from behind |
| **Two glass tiles** | Real logos (or a Lucide icon for the core idea) in 3D glass tiles, left and right, **below the title**, behind the person |
| **Person** | The creator's real photo, cut out, full bleed, with a soft violet rim. The expression matches the hook (shock, curiosity, smile, "shh") |
| **Headline** | Under the chin: line 1 in Inter Display Black, line 2 in Instrument Serif Italic with the hero gradient. Text in the video's language |

The bottom of the frame fades to the ink colour under the headline.

## 2. Canvas and safe zones
- **Size:** 1080×1920 JPG (q95). The generator also writes `<out> - grid 3x4.jpg`, the centre 3:4 crop (y 240–1680) that the profile grid shows.
- **Everything important inside the grid crop:** eyebrow, the whole title, both tiles, the face and the whole headline.
- **Faces:** the headline never touches the face (chin included). If it does, move the person or the headline, never shrink the face out of frame.

## 3. Rules
- **The title is never covered.** The tiles are placed automatically with their top edge `tileGap` (18 px) below the title baseline; only their x comes from the config.
- **Tiles are 3D glass, not flat cards:** the face refracts the backdrop (magnified, frosted), with an extruded glass wall underneath, a gloss band on top, a diagonal sheen, a Fresnel inner rim, a fine magenta/cyan edge split, and a floor glow in the brand's colour (`glowL` / `glowR`, e.g. violet for OpenAI, orange for Claude). Logos carry a soft glow of the same colour.
- **Real photo only:** cut out and lit, never AI-generated or face-altered. Downscale to ≤ 1600 px wide before the cutout. A small photo (≈ 512 px) still goes full bleed; set `fade` high enough that its bottom edge is fully dark.
- **Real logos only**, never repeated across the two tiles.
- **Headline** in the speaker's own words: ≤ 2 lines, line 1 sets up, line 2 (serif) is the payoff or the CTA keyword. No claims the video doesn't make.
- **Versioned:** `<Name> - Cover vN.jpg` next to the final video; never overwrite an approved cover.

## 4. Building it
1. Pick the photo by the hook's emotion and copy it into the workspace as `photo.jpg`.
2. Cut it out (local model, no API): `cd ~/.motion-studio/bgrm && node cut.mjs file:///…/photo.jpg /…/cut.png`.
3. Write the config and render: `python3 make.py cover.json`.
4. Check the full cover next to its grid crop and adjust `py`, `bigY` and `hY` until everything sits inside y 240–1680.

### Config keys
`cut`, `eb`, `ebY`, `bigT`, `big`, `bigY`, `logoL`, `logoR`, `tl[0]`, `tr[0]`, `ts`, `glowL`, `glowR`, `kL`, `kR`, `tileGap`, `pw`, `py`, `fade`, `hY`, `h1`, `h1s`, `h2`, `out`.

```json
{"cut": "cut.png", "ebY": 290, "eb": "TOOL · TOOL · TOOL", "bigT": "TITLE", "big": 300, "bigY": 600,
 "logoL": "openai", "logoR": "claude", "tl": [170, 0], "tr": [910, 0], "ts": 200, "glowL": "rgba(110,90,255,.85)", "glowR": "rgba(255,120,70,.8)",
 "pw": 1080, "py": 372, "fade": 1080, "hY": 1390, "h1": "your setup line", "h1s": 78, "h2": "the payoff", "out": "cover.jpg"}
```
