import cv2, json, sys
src = sys.argv[1]
cap = cv2.VideoCapture(src); W = int(cap.get(3)); H = int(cap.get(4)); fps = cap.get(5) or 30
s = 540 / W
det = cv2.FaceDetectorYN.create("cache/models/yunet.onnx", "", (int(W * s), int(H * s)), 0.7)
out, i = [], 0
while True:
    ok, f = cap.read()
    if not ok: break
    if i % 5 == 0:
        _, fc = det.detect(cv2.resize(f, (int(W * s), int(H * s))))
        boxes = [] if fc is None else [{"x": round(b[0] / s * 1080 / W), "y": round(b[1] / s * 1080 / W), "w": round(b[2] / s * 1080 / W),
                                         "h": round(b[3] / s * 1080 / W), "conf": round(float(b[-1]), 3)} for b in fc]
        out.append({"t": round(i / fps, 3), "boxes": boxes})
    i += 1
json.dump(out, open("cache/faces.json", "w"))
n = [len(o["boxes"]) for o in out]; print("samples", len(out), "faces/sample", {k: n.count(k) for k in set(n)}, "src_frames", i)
