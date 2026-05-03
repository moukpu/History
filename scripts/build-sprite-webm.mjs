import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

function parseArgs(argv) {
  const args = {
    input: "",
    output: "",
    frontendOutput: "",
    cycleFrames: 0,
    speed: 1,
    sourceFps: 24,
    canvasWidth: 1920,
    canvasHeight: 1080,
    scale: 0.8,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key.startsWith("--")) continue;
    index += 1;
    if (key === "--input") args.input = value;
    if (key === "--output") args.output = value;
    if (key === "--frontend-output") args.frontendOutput = value;
    if (key === "--cycle-frames") args.cycleFrames = Number(value);
    if (key === "--speed") args.speed = Number(value);
    if (key === "--source-fps") args.sourceFps = Number(value);
    if (key === "--scale") args.scale = Number(value);
  }

  if (!args.input) throw new Error("--input is required");
  if (!args.output) throw new Error("--output is required");
  if (!args.cycleFrames) throw new Error("--cycle-frames is required");
  return args;
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repoRoot,
    stdio: options.stdio ?? "inherit",
    windowsHide: true,
    encoding: options.encoding,
  });
}

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(repoRoot, args.input);
const outputPath = resolve(repoRoot, args.output);
const frontendOutputPath = args.frontendOutput
  ? resolve(repoRoot, args.frontendOutput)
  : "";
const tempDir = resolve(repoRoot, ".tmp-sprite-webm");
const sourceCopy = resolve(tempDir, "source.mp4");
const paddedPath = resolve(tempDir, "padded.mkv");
const framesDir = resolve(tempDir, "frames");
const trimmedPath = resolve(tempDir, "trimmed.mkv");
const finalSourcePath = resolve(tempDir, "final-source.mkv");
const finalPath = resolve(tempDir, "final.webm");
const seamScript = resolve(tempDir, "seam-search.py");

if (!existsSync(inputPath)) {
  throw new Error(`Input video not found: ${inputPath}`);
}

rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });
mkdirSync(framesDir, { recursive: true });
mkdirSync(dirname(outputPath), { recursive: true });
if (frontendOutputPath) mkdirSync(dirname(frontendOutputPath), { recursive: true });

copyFileSync(inputPath, sourceCopy);
console.log(`[A] Copied source: ${sourceCopy}`);

const innerWidth = Math.round(args.canvasWidth * args.scale);
const innerHeight = Math.round(args.canvasHeight * args.scale);
const padX = Math.floor((args.canvasWidth - innerWidth) / 2);
const padY = Math.floor((args.canvasHeight - innerHeight) / 2);
const padFilter = [
  `scale=${innerWidth}:${innerHeight}:flags=lanczos`,
  `pad=${args.canvasWidth}:${args.canvasHeight}:${padX}:${padY}:color=black`,
  "setsar=1",
].join(",");

run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  sourceCopy,
  "-vf",
  padFilter,
  "-c:v",
  "ffv1",
  "-pix_fmt",
  "yuv420p",
  "-an",
  paddedPath,
]);
console.log(
  `[B] Padded ${innerWidth}x${innerHeight} into ${args.canvasWidth}x${args.canvasHeight}`,
);

run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  paddedPath,
  resolve(framesDir, "frame_%04d.png"),
]);

const seamPython = String.raw`
from PIL import Image
from pathlib import Path
import json, sys

frames_dir = Path(sys.argv[1])
cycle_n = int(sys.argv[2])
frames = sorted(frames_dir.glob("frame_*.png"))
if len(frames) < cycle_n:
    raise SystemExit(f"Not enough frames: {len(frames)} < {cycle_n}")

def bbox(img):
    pix = img.load()
    left, top, right, bottom = img.width, img.height, -1, -1
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = pix[x, y]
            if r > 10 or g > 10 or b > 10:
                left = min(left, x)
                top = min(top, y)
                right = max(right, x)
                bottom = max(bottom, y)
    if right < left or bottom < top:
        return (0, 0, img.width, img.height)
    pad = 24
    return (max(0, left - pad), max(0, top - pad), min(img.width, right + pad), min(img.height, bottom + pad))

def load(index):
    return Image.open(frames[index]).convert("RGB")

def ssd(a, b):
    crop = bbox(a)
    a = a.crop(crop).resize((320, 180), Image.Resampling.BILINEAR)
    b = b.crop(crop).resize((320, 180), Image.Resampling.BILINEAR)
    pa, pb = a.load(), b.load()
    total = 0
    for y in range(0, a.height, 3):
        for x in range(0, a.width, 3):
            ar, ag, ab = pa[x, y]
            br, bg, bb = pb[x, y]
            total += (ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2
    return total

total = len(frames)
if total == cycle_n:
    best = (0, 0)
else:
    best = (10**30, 0)
    for start in range(0, total - cycle_n):
        score = ssd(load(start), load(start + cycle_n))
        if score < best[0]:
            best = (score, start)

print(json.dumps({"startFrame": best[1], "score": best[0], "totalFrames": total}))
`;
writeFileSync(seamScript, seamPython, "utf8");
const seamRaw = run("python", [seamScript, framesDir, String(args.cycleFrames)], {
  stdio: ["inherit", "pipe", "inherit"],
  encoding: "utf8",
});
const seam = JSON.parse(seamRaw.trim().split(/\r?\n/).pop());
console.log(
  `[C] Seam search: start=${seam.startFrame}, frames=${args.cycleFrames}, score=${seam.score}`,
);

const endFrame = seam.startFrame + args.cycleFrames - 1;
const trimFilter = `select=between(n\\,${seam.startFrame}\\,${endFrame}),setpts=N/FRAME_RATE/TB`;
run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  paddedPath,
  "-vf",
  trimFilter,
  "-fps_mode",
  "vfr",
  "-an",
  "-c:v",
  "ffv1",
  "-pix_fmt",
  "yuv420p",
  trimmedPath,
]);
console.log(`[D] Hard-trimmed frames ${seam.startFrame}..${endFrame}`);

if (Math.abs(args.speed - 1) > 1e-6) {
  run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-i",
    trimmedPath,
    "-vf",
    `setpts=PTS/${args.speed}`,
    "-r",
    String(args.sourceFps),
    "-an",
    "-c:v",
    "ffv1",
    "-pix_fmt",
    "yuv420p",
    finalSourcePath,
  ]);
  console.log(`[E] Speed adjusted: ${args.speed}x`);
} else {
  copyFileSync(trimmedPath, finalSourcePath);
  console.log("[E] Speed unchanged");
}

run("ffmpeg", [
  "-v",
  "error",
  "-y",
  "-i",
  finalSourcePath,
  "-vf",
  "format=rgba,colorkey=0x000000:0.05:0.10,format=yuva420p",
  "-c:v",
  "libvpx-vp9",
  "-pix_fmt",
  "yuva420p",
  "-auto-alt-ref",
  "0",
  "-b:v",
  "4M",
  "-crf",
  "30",
  "-row-mt",
  "1",
  "-an",
  finalPath,
]);
console.log("[F] Encoded VP9 WebM with alpha");

const probe = run(
  "ffprobe",
  [
    "-v",
    "error",
    "-show_streams",
    finalPath,
  ],
  { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" },
);
if (!/alpha_mode=1/i.test(probe)) {
  throw new Error(`Alpha verification failed. ffprobe output:\n${probe}`);
}
console.log("[G] Alpha verified: alpha_mode=1");

copyFileSync(finalPath, outputPath);
if (frontendOutputPath) copyFileSync(finalPath, frontendOutputPath);
console.log(`[H] Wrote ${outputPath}`);
if (frontendOutputPath) console.log(`[H] Wrote ${frontendOutputPath}`);

rmSync(tempDir, { recursive: true, force: true });
console.log("Done.");
