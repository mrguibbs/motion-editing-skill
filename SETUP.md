# Setup: step by step

For macOS on Apple Silicon. Takes about 20 minutes, mostly downloads. Nothing here calls a paid API.

## 1. System tools
Install [Homebrew](https://brew.sh) if you don't have it, then:

```bash
brew install ffmpeg node@22 python@3.12 git
```

Check that `node -v` is 22+ and `ffmpeg -version` runs.

## 2. Clone the studio

```bash
git clone https://github.com/mrguibbs/motion-editing-skill.git
```

```bash
cd motion-editing-skill
```

## 3. Python environment

```bash
python3.12 -m venv ~/.motion-studio/venv
```

```bash
source ~/.motion-studio/venv/bin/activate
```

```bash
pip install -U pip && pip install -r "04 Editor Kit/requirements.txt" && python -m playwright install chromium
```

Verify, and pre-download the Whisper model:

```bash
python -c "import whisper, torch, cv2, scipy, PIL, playwright; print('ok', torch.backends.mps.is_available())"
```

```bash
python -c "import whisper; whisper.load_model('large-v3-turbo')"
```

## 4. Robust Video Matting (cuts you out of every frame, for depth)

```bash
mkdir -p ~/.motion-studio/rvm && cd ~/.motion-studio/rvm && git clone --depth 1 https://github.com/PeterL1n/RobustVideoMatting.git repo && curl -L -o rvm_mobilenetv3.pth https://github.com/PeterL1n/RobustVideoMatting/releases/download/v1.0.0/rvm_mobilenetv3.pth
```

RVM is GPL-3.0; it runs locally as a separate tool.

## 5. Background removal for covers

```bash
mkdir -p ~/.motion-studio/bgrm && cd ~/.motion-studio/bgrm && npm init -y && npm i @imgly/background-removal-node
```

Then copy `04 Editor Kit/cover/cut.mjs` into `~/.motion-studio/bgrm/`.

## 6. Fonts and logos
- Fonts: download the four families listed in `02 References & Assets/fonts/README.md` and save them with those exact names.
- Logos: add the real logos of the tools you talk about to `02 References & Assets/logos/` (see its README).

## 7. Optional: the motion-designer skill on its own

```bash
git clone https://github.com/hughminhphan/motion-kit.git ~/motion-kit && mkdir -p ~/.claude/skills && ln -s ~/motion-kit/skills/motion-designer ~/.claude/skills/
```

The studio already vendors `motion-kit.js` and its library, so this is only needed if you want it in other projects too.

## 8. Edit your first video
1. Open the `motion-editing-skill` folder in [Claude Code](https://claude.com/claude-code). The `motion-editing` skill loads from `.claude/skills/`.
2. Drop a raw vertical video into `01 Raw Footage/`.
3. Paste the prompt from [`PROMPT.md`](./PROMPT.md).
4. Approve the Edit Plan. Claude Code builds, renders, mixes and exports to `03 Exports/`.
