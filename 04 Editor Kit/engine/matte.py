# RVM mattes: python3 matte.py <frames_dir> <out_dir> [k0 k1]  -> m%04d.png (LA: alpha = matte), sequential for temporal state
import sys, os, glob, torch, numpy as np
from PIL import Image
RVM = os.environ.get("RVM_DIR", os.path.expanduser("~/.motion-studio/rvm")); sys.path.insert(0, os.path.join(RVM, "repo"))
from model import MattingNetwork
torch.set_num_threads(os.cpu_count())
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
files = sorted(glob.glob(os.path.join(src, "f*.jpg")))
k0 = int(sys.argv[3]) if len(sys.argv) > 3 else 0; k1 = int(sys.argv[4]) if len(sys.argv) > 4 else len(files)
m = MattingNetwork("mobilenetv3").eval(); m.load_state_dict(torch.load(os.path.join(RVM, "rvm_mobilenetv3.pth"), map_location="cpu"))
rec = [None] * 4; warm = max(0, k0 - 15)   # warm the recurrent state on 15 frames before the range
with torch.no_grad():
    for i in range(warm, k1):
        im = torch.from_numpy(np.asarray(Image.open(files[i]).convert("RGB"))).permute(2, 0, 1)[None].float() / 255
        fgr, pha, *rec = m(im, *rec, downsample_ratio=0.25)
        if i < k0: continue
        a = (pha[0, 0].clamp(0, 1).numpy() * 255).astype(np.uint8)
        Image.fromarray(np.stack([np.full_like(a, 255), a], -1), "LA").save(os.path.join(dst, "m" + os.path.basename(files[i])[1:-4] + ".png"), compress_level=3)
        if i % 200 == 0: print("m", i, flush=True)
print("done", k0, k1)
