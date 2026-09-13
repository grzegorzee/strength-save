import { spawnSync } from 'node:child_process';
import { statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const project = dirname(fileURLToPath(import.meta.url));
const outputs = [];
for (const locale of ['pl', 'en']) {
  for (const [suffix, width, height] of [['1080', 1080, 1920], ['web', 720, 1280]]) {
    const relativePath = `renders/strength-save-${locale}-${suffix}.mp4`;
    const path = join(project, relativePath);
    const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' });
    if (probe.status !== 0) throw new Error(`ffprobe failed for ${relativePath}: ${probe.stderr}`);
    const data = JSON.parse(probe.stdout);
    const video = data.streams.find((stream) => stream.codec_type === 'video');
    const duration = Number(data.format.duration);
    if (!video || video.width !== width || video.height !== height) throw new Error(`Wrong dimensions: ${relativePath}`);
    if (video.codec_name !== 'h264' || video.pix_fmt !== 'yuv420p') throw new Error(`Wrong browser codec: ${relativePath}`);
    if (video.avg_frame_rate !== '30/1' || Math.abs(duration - 8) > 0.04) throw new Error(`Wrong timing: ${relativePath}`);
    if (data.streams.some((stream) => stream.codec_type === 'audio')) throw new Error(`Unexpected audio: ${relativePath}`);
    outputs.push({ locale, file: relativePath, width, height, fps: 30, duration_seconds: duration, codec: video.codec_name, pixel_format: video.pix_fmt, bytes: statSync(path).size, audio: false });
  }
}
writeFileSync(join(project, 'renders/manifest.json'), JSON.stringify({ outputs }, null, 2) + '\n');
console.log(JSON.stringify(outputs, null, 2));
