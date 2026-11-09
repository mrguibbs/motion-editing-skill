import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";
import fs from "fs";
const [src, dst] = process.argv.slice(2);
// raw RGBA out, then lossless PNG via sharp: imgly's own PNG path passes `quality` to sharp, which forces a 256-colour palette (skin banding)
const blob = await removeBackground(src, { model: process.argv[4] || "medium", output: { format: "image/x-rgba8" } });
const [, w, h] = blob.type.match(/width=(\d+).*height=(\d+)/);
await sharp(Buffer.from(await blob.arrayBuffer()), { raw: { width: +w, height: +h, channels: 4 } }).png({ compressionLevel: 6 }).toFile(dst);
console.log("ok", dst);
