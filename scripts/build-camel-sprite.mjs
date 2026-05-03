import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  const args = {
    input: "public/assets/minigames/caravan-runner/raw/camel_rider_source.mp4",
    output: "public/assets/minigames/caravan-runner/camel_run.png",
    meta: "public/assets/minigames/caravan-runner/camel_run.json",
    frontendOutput: "frontend/shared/minigames/games/caravan-runner/assets/camel_run.png",
    frontendMeta: "frontend/shared/minigames/games/caravan-runner/assets/camel_run.json",
    frameCount: 8,
    frameHeight: 256,
    frameDurationMs: 80,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    index += 1;
    if (key === "--input") args.input = value;
    if (key === "--output") args.output = value;
    if (key === "--meta") args.meta = value;
    if (key === "--frontend-output") args.frontendOutput = value;
    if (key === "--frontend-meta") args.frontendMeta = value;
    if (key === "--frame-count") args.frameCount = Number(value);
    if (key === "--frame-height") args.frameHeight = Number(value);
    if (key === "--frame-duration-ms") args.frameDurationMs = Number(value);
  }

  return args;
}

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
  });
}

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(repoRoot, args.input);
const outputPath = resolve(repoRoot, args.output);
const metaPath = resolve(repoRoot, args.meta);
const frontendOutputPath = args.frontendOutput ? resolve(repoRoot, args.frontendOutput) : "";
const frontendMetaPath = args.frontendMeta ? resolve(repoRoot, args.frontendMeta) : "";
const tempDir = resolve(repoRoot, ".tmp-camel-sprite");
const pythonScriptPath = resolve(tempDir, "compose_sprite.py");

if (!existsSync(inputPath)) {
  throw new Error(`Input video not found: ${inputPath}`);
}

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });
mkdirSync(dirname(outputPath), { recursive: true });
mkdirSync(dirname(metaPath), { recursive: true });
if (frontendOutputPath) mkdirSync(dirname(frontendOutputPath), { recursive: true });
if (frontendMetaPath) mkdirSync(dirname(frontendMetaPath), { recursive: true });

const candidateStarts = [1.0, 0.5, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
for (const start of candidateStarts) {
  const dir = resolve(tempDir, `candidate_${String(start).replace(".", "_")}`);
  mkdirSync(dir, { recursive: true });
  run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    String(start),
    "-t",
    "1.125",
    "-i",
    inputPath,
    "-vf",
    "fps=8",
    resolve(dir, "frame_%02d.png"),
  ]);
}

const pythonScript = String.raw`
from PIL import Image
from pathlib import Path
import json, math, shutil, sys

temp_dir = Path(sys.argv[1])
output = Path(sys.argv[2])
meta_path = Path(sys.argv[3])
frame_count = int(sys.argv[4])
target_h = int(sys.argv[5])
frame_duration = int(sys.argv[6])

def luminance(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b

def key_alpha(image):
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            yy = luminance(r, g, b)
            if yy < 30:
                alpha = 0
            elif yy < 60:
                alpha = int(a * ((yy - 30) / 30))
            else:
                alpha = a
            if alpha < 255:
                keep = alpha / 255
                r = int(r * keep)
                g = int(g * keep)
                b = int(b * keep)
            pixels[x, y] = (r, g, b, alpha)
    return image

def union_bbox(frames, threshold=8):
    left = top = 10**9
    right = bottom = -1
    for frame in frames:
        alpha = frame.getchannel("A")
        bbox = alpha.point(lambda a: 255 if a > threshold else 0).getbbox()
        if not bbox:
            continue
        l, t, r, b = bbox
        left, top = min(left, l), min(top, t)
        right, bottom = max(right, r), max(bottom, b)
    if right < left:
        return (0, 0, frames[0].width, frames[0].height)
    return (left, top, right, bottom)

def crop_bbox(bbox, image_size, pad=8):
    l, t, r, b = bbox
    w, h = image_size
    return (max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad))

def ssd(a, b, bbox):
    a = a.convert("RGBA")
    b = b.convert("RGBA")
    l, t, r, bb = bbox
    total = 0
    count = 0
    for y in range(t, bb, 6):
        for x in range(l, r, 6):
            ar, ag, ab, aa = a.getpixel((x, y))
            br, bg, bbv, ba = b.getpixel((x, y))
            if aa < 20 and ba < 20:
                continue
            total += (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bbv) ** 2 + (aa - ba) ** 2
            count += 1
    return total / max(count, 1)

candidates = []
for folder in temp_dir.glob("candidate_*"):
    raw = sorted(folder.glob("frame_*.png"))
    if len(raw) < frame_count + 1:
        continue
    keyed = [key_alpha(Image.open(path)) for path in raw[:frame_count + 1]]
    bbox = crop_bbox(union_bbox(keyed), keyed[0].size, 8)
    candidates.append((ssd(keyed[0], keyed[frame_count], bbox), folder, bbox))

if not candidates:
    raise SystemExit("No candidate cycles were extracted")

score, folder, bbox = min(candidates, key=lambda item: item[0])
frames = [key_alpha(Image.open(path)) for path in sorted(folder.glob("frame_*.png"))[:frame_count]]
bbox = crop_bbox(union_bbox(frames), frames[0].size, 8)

resized_frames = []
frame_w = target_h
for frame in frames:
    cropped = frame.crop(bbox)
    scale = target_h / cropped.height
    target_w = max(1, round(cropped.width * scale))
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    resized_frames.append(resized)
    frame_w = max(frame_w, target_w)

processed = []
for resized in resized_frames:
    canvas = Image.new("RGBA", (frame_w, target_h), (0, 0, 0, 0))
    x = max(0, (frame_w - resized.width) // 2)
    canvas.alpha_composite(resized, (x, 0))
    processed.append(canvas)

sheet = Image.new("RGBA", (frame_w * frame_count, target_h), (0, 0, 0, 0))
for index, frame in enumerate(processed):
    sheet.alpha_composite(frame, (index * frame_w, 0))
sheet.save(output)

meta = {
    "frameWidth": frame_w,
    "frameHeight": target_h,
    "frameCount": frame_count,
    "frameDurationMs": frame_duration,
    "loopDurationMs": frame_count * frame_duration
}
meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({
    "selectedCycleStartSeconds": float(str(folder.name).replace("candidate_", "").replace("_", ".")),
    "cycleScore": score,
    **meta
}, ensure_ascii=False))
`;

writeFileSync(pythonScriptPath, pythonScript, "utf8");
run("python", [
  pythonScriptPath,
  tempDir,
  outputPath,
  metaPath,
  String(args.frameCount),
  String(args.frameHeight),
  String(args.frameDurationMs),
]);

if (frontendOutputPath) copyFileSync(outputPath, frontendOutputPath);
if (frontendMetaPath) copyFileSync(metaPath, frontendMetaPath);
rmSync(tempDir, { recursive: true, force: true });

console.log(`Sprite sheet written: ${outputPath}`);
console.log(`Metadata written: ${metaPath}`);
if (frontendOutputPath) console.log(`Frontend copy written: ${frontendOutputPath}`);
if (frontendMetaPath) console.log(`Frontend metadata copy written: ${frontendMetaPath}`);
