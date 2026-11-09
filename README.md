# 🎬 Motion Editing Skill

A [Claude Code](https://claude.com/claude-code) skill and editing kit that turns a raw talking-head video into a finished, graphics-rich vertical Reel, using [FFmpeg](https://ffmpeg.org), [Whisper](https://github.com/openai/whisper) and a deterministic canvas motion engine.

Most AI edits look flat: everything fades up, everything moves the same. This kit gives Claude Code a full house style and the tools to apply it. It transcribes you word by word, finds your face, cuts you out of every frame, and then puts big type **behind your head**, glass tiles and real logos **in front of you**, and lands every graphic on the exact word you say.

## 🚀 Quick Start

**Prerequisites:** macOS on Apple Silicon, [Homebrew](https://brew.sh), Python 3.12, Node 22+, FFmpeg, Claude Code.

```bash
git clone https://github.com/mrguibbs/motion-editing-skill.git
cd motion-editing-skill
```

Then follow [SETUP.md](./SETUP.md) (about 20 minutes, mostly downloads), drop a video into `01 Raw Footage/`, open the folder in Claude Code and paste the prompt from [PROMPT.md](./PROMPT.md).

## 🧰 Tech Stack

- **Agent:** [Claude Code](https://claude.com/claude-code) with the `motion-editing` skill (`.claude/skills/`)
- **Transcription:** [Whisper](https://github.com/openai/whisper) large-v3-turbo, word timestamps
- **Face detection:** [YuNet](https://github.com/opencv/opencv_zoo/tree/main/models/face_detection_yunet) via [OpenCV](https://opencv.org)
- **Person matte:** [Robust Video Matting](https://github.com/PeterL1n/RobustVideoMatting) (installed separately, GPL-3.0)
- **Motion engine:** `navy.js`, a Canvas 2D engine where every frame is a pure function of time, rendered headless with [Playwright](https://playwright.dev) Chromium
- **Motion curves:** [motion-kit](https://github.com/hughminhphan/motion-kit) by Hugh Phan (vendored, MIT)
- **Encode and audio:** [FFmpeg](https://ffmpeg.org) (x264, loudnorm), procedural SFX in Python ([NumPy](https://numpy.org), [SciPy](https://scipy.org))
- **Covers:** [@imgly/background-removal-node](https://github.com/imgly/background-removal-js)
- **Package managers:** pip (venv) and npm

## 📁 Project Structure

```
motion-editing-skill/
├── .claude/skills/motion-editing/SKILL.md   # the skill Claude Code follows, step by step
├── CLAUDE.md                                # project instructions: rules, pipeline, non-negotiables
├── PROMPT.md                                # the prompt to paste
├── SETUP.md                                 # step-by-step install guide
├── 01 Raw Footage/                          # drop raw videos here (git-ignored)
├── 02 References & Assets/
│   ├── icons/                               # Lucide icons, white stroke
│   ├── sfx/                                 # CC0 samples
│   ├── fonts/                               # download list (OFL), not shipped
│   └── logos/ photos/ screens/ music/       # bring your own (git-ignored)
├── 03 Exports/                              # finished videos, stems and covers (git-ignored)
└── 04 Editor Kit/
    ├── new_video.sh                         # creates a per-video workspace in work/
    ├── requirements.txt                     # Python dependencies
    ├── engine/                              # navy.js + transcribe, faces, matte, prep, stills, render, audio, capture
    ├── docs/                                # style guide, motion rules + library, CTA endings, cover spec
    ├── reference/                           # the template build: scene, config and audio that run on any video
    ├── cover/                               # cover generator and cutout script
    ├── vendor/                              # motion-kit.js (MIT)
    └── models/                              # YuNet face model (MIT)
```

## 🎨 The Deep Navy style

The single source of truth is [`04 Editor Kit/docs/deep-navy-style.md`](<04 Editor Kit/docs/deep-navy-style.md>). The short version:

- **Depth every beat:** layered headlines behind your head, glossy 3D tiles and captions in front, every cutout casts a shadow.
- **Containers:** when UI needs room you move into a glass card, and your head always breaks out of its top edge.
- **Show the real internet:** real pages in a browser card, ChatGPT and Claude typing your exact prompt, a neon dot circling tech containers.
- **Liquid glass:** refractive glass lenses, sheets and layer stacks that bend whatever sits behind them (magnified, frosted, colour fringes at the edges), our own canvas build inspired by [originkit.dev](https://www.originkit.dev).
- **Faces are sacred** and **honesty labels** on anything illustrated.
- **Captions:** no pills; a serif emphasis word with the bold phrase overlapping it, and a glitch-in on phrase endings.

## 🌀 Motion

The house motion (quint ease-outs, soft pops, near-critical springs) is combined with [motion-kit](https://github.com/hughminhphan/motion-kit)'s animator rules: one element leads and the rest react at uneven offsets, durations come from distance and weight, exits are quicker than entrances, and holds stay alive. See [`docs/motion-rules.md`](<04 Editor Kit/docs/motion-rules.md>).

## 🔄 The pipeline

1. **Intake:** transcribe, detect faces, matte every frame.
2. **Plan:** a beat-by-beat Edit Plan you approve first.
3. **Build:** `config.json` + `scene.js` from the template, everything triggered on spoken words.
4. **QA:** still sheets with the face box and caption box drawn on.
5. **Render:** parallel ranges, concatenated.
6. **Audio:** tech SFX on every device, mastered to −14 LUFS, plus a VO+SFX stem.
7. **Cover and delivery report.**

## 📜 Available Scripts

```bash
# Development (run inside 04 Editor Kit/work/<Name>/ with the venv active)
./new_video.sh "<Name>" "../01 Raw Footage/<file>.mp4"   # create the workspace (run from 04 Editor Kit/)
python3 engine/transcribe.py                               # Whisper -> cache/transcript.json
python3 engine/faces.py cache/src.mp4                      # YuNet -> cache/faces.json
python3 engine/matte.py cache/frames cache/mattes          # RVM mattes for every frame
python3 engine/prep_v4.py                                  # config.json -> src/data.js
python3 engine/capture.py <url> <name>.png                 # screenshot a real public page (LOCALE=pt-BR for Portuguese)

# Code Quality
python3 engine/stills.py cache/qa.jpg qa <t1> <t2> ...     # QA still sheet (face + caption boxes)

# Production
K0=0 K1=<N> python3 engine/render.py video renders/a.mp4   # render a frame range
```

## 🚢 Deployment

Nothing deploys: videos are rendered locally and exported to `03 Exports/`. Publishing to social accounts is always manual.

## 📚 Documentation

- [SETUP.md](./SETUP.md): install guide
- [PROMPT.md](./PROMPT.md): the prompt to paste
- [deep-navy-style.md](<04 Editor Kit/docs/deep-navy-style.md>), [motion-rules.md](<04 Editor Kit/docs/motion-rules.md>), [motion-library.md](<04 Editor Kit/docs/motion-library.md>), [cta-endings-deep-navy.md](<04 Editor Kit/docs/cta-endings-deep-navy.md>), [cover-style.md](<04 Editor Kit/docs/cover-style.md>)

## ⚖️ License

[MIT](./LICENSE) © 2026 MrGuibbs. Vendored third-party pieces keep their own licences: motion-kit (MIT), YuNet (MIT), Lucide icons (ISC), SFX (CC0).
