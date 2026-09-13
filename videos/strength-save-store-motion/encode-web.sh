#!/bin/zsh
set -euo pipefail
MOTION_PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
for locale in pl en; do
  ffmpeg -hide_banner -loglevel error -y \
    -i "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-1080.mp4" \
    -vf 'scale=720:1280:flags=lanczos' -r 30 -an \
    -c:v libx264 -preset slow -crf 25 -profile:v high -pix_fmt yuv420p \
    -movflags +faststart "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-web.mp4"
  ffmpeg -hide_banner -loglevel error -y \
    -ss 1.5 -i "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-1080.mp4" \
    -frames:v 1 -update 1 "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-poster.png"
  cwebp -quiet -q 85 -resize 720 1280 \
    "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-poster.png" \
    -o "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-poster.webp"
  ffmpeg -hide_banner -loglevel error -y \
    -i "$MOTION_PROJECT_DIR/renders/strength-save-${locale}-1080.mp4" \
    -vf 'fps=1,scale=270:480,tile=4x2' -frames:v 1 -update 1 \
    "$MOTION_PROJECT_DIR/qa/${locale}-contact-sheet.jpg"
done
