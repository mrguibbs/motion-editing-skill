import json, whisper, torch
m = whisper.load_model("large-v3-turbo", device="cpu")
r = m.transcribe("cache/audio.wav", word_timestamps=True, fp16=False, beam_size=5, condition_on_previous_text=False)
out = {"language": r["language"], "segments": []}
for s in r["segments"]:
    out["segments"].append({"t": [s["start"], s["end"]], "text": s["text"],
        "words": [{"w": w["word"], "t": [round(w["start"], 3), round(w["end"], 3)], "p": round(w["probability"], 3)} for w in s["words"]]})
    print(f'{s["start"]:6.2f}-{s["end"]:6.2f} {s["text"]}', flush=True)
json.dump(out, open("cache/transcript.json", "w"), ensure_ascii=False, indent=1)
print("LANG", r["language"])
