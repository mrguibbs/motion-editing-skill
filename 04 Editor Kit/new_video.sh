#!/bin/bash
# Usage: "04 Editor Kit/new_video.sh" "<Video Name>" "<path to raw .mp4 in 01 Raw Footage>"
# Creates an isolated workspace: 04 Editor Kit/work/<Video Name>/{src,engine,cache,plan,assets->shared,renders}
set -e
KIT="$(cd "$(dirname "$0")" && pwd)"; STUDIO="$(dirname "$KIT")"; NAME="$1"; RAW="$2"
[ -z "$NAME" ] || [ -z "$RAW" ] && { echo "usage: new_video.sh \"<Name>\" \"<raw.mp4>\""; exit 1; }
W="$KIT/work/$NAME"; mkdir -p "$W"/{src,engine,cache/frames,cache/mattes,cache/models,plan,renders} "$STUDIO/03 Exports/$NAME"
cp "$KIT/engine/"*.py "$W/engine/"; cp "$KIT/engine/navy.js" "$KIT/engine/index.html" "$W/src/"
cp "$KIT/models/yunet.onnx" "$W/cache/models/"
ln -sfn "$STUDIO/02 References & Assets" "$W/assets"
cp "$RAW" "$W/cache/src.mp4"
cd "$W"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration -of compact cache/src.mp4
ffmpeg -v error -y -i cache/src.mp4 -vn -ac 1 -ar 16000 cache/audio.wav
ffmpeg -v error -y -i cache/src.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" -q:v 3 cache/frames/f%04d.jpg
echo "workspace ready: $W  (next: transcribe.py, faces.py, matte.py, then plan)"
