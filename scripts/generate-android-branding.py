#!/usr/bin/env python3
"""Regenerate Android artwork from the shipped iOS master, without changing iOS/web.

Run: uv run --with 'pillow==12.1.0' scripts/generate-android-branding.py
Only Android resources are written. Generic assets/icon-* belong to older branding.
"""

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
RES = ROOT / 'android/app/src/main/res'
DENSITIES = {'ldpi': .75, 'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
LANCZOS = Image.Resampling.LANCZOS


def isolated_artwork(master: Image.Image) -> Image.Image:
    """Separate this master’s dark/cyan dumbbell from lime and its outer frame.

    Keep the largest connected foreground component. This removes the baked-in
    rounded frame, so Android can apply its own OEM mask. The same alpha supplies
    themed icons; no second drawing or AI-generated artwork is introduced.
    """
    width, height = master.size
    channels = list(zip(*(iter(master.tobytes()),) * 3))
    raw = bytes(255 if ((red < 160 and green < 160) or blue > 100) else 0 for red, green, blue in channels)
    mask = Image.frombytes('L', master.size, raw).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    pending = bytearray(mask.tobytes())
    largest: list[int] = []
    for start in range(width * height):
        if not pending[start]:
            continue
        pending[start] = 0
        queue = deque([start])
        component: list[int] = []
        while queue:
            point = queue.popleft()
            component.append(point)
            x = point % width
            neighbors = (point - 1 if x else -1, point + 1 if x < width - 1 else -1, point - width, point + width)
            for neighbor in neighbors:
                if 0 <= neighbor < width * height and pending[neighbor]:
                    pending[neighbor] = 0
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component
    # Stop if someone changes the master to artwork this extraction cannot handle.
    if not width * height * .2 < len(largest) < width * height * .6:
        raise ValueError('Canonical artwork changed; inspect the foreground extraction before generating icons')
    alpha = bytearray(width * height)
    for index in largest:
        alpha[index] = 255
    output = master.convert('RGBA')
    output.putalpha(Image.frombytes('L', master.size, bytes(alpha)))
    return output


def generate() -> None:
    master = Image.open(MASTER).convert('RGB')
    artwork = isolated_artwork(master)
    background = master.getpixel((0, 0))
    color = '#%02X%02X%02X' % background
    (RES / 'values/ic_launcher_background.xml').write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{color}</color>\n</resources>\n'
    )
    for density, factor in DENSITIES.items():
        folder = RES / f'mipmap-{density}'
        folder.mkdir(exist_ok=True)
        legacy_size = round(48 * factor)
        master.resize((legacy_size, legacy_size), LANCZOS).save(folder / 'ic_launcher.png')

        # The legacy round fallback keeps the diagonal weights inside a circle.
        round_icon = Image.new('RGBA', (legacy_size, legacy_size), (*background, 255))
        round_art_size = round(40 * factor)
        round_art = artwork.resize((round_art_size, round_art_size), LANCZOS)
        margin = (legacy_size - round_art_size) // 2
        round_icon.alpha_composite(round_art, (margin, margin))
        circle = Image.new('L', (legacy_size * 4, legacy_size * 4))
        ImageDraw.Draw(circle).ellipse((0, 0, legacy_size * 4 - 1, legacy_size * 4 - 1), fill=255)
        round_icon.putalpha(circle.resize((legacy_size, legacy_size), LANCZOS))
        round_icon.save(folder / 'ic_launcher_round.png')

        layer_size = round(108 * factor)
        safe_size = round(66 * factor)
        layer = Image.new('RGBA', (layer_size, layer_size))
        margin = (layer_size - safe_size) // 2
        layer.alpha_composite(artwork.resize((safe_size, safe_size), LANCZOS), (margin, margin))
        layer.save(folder / 'ic_launcher_foreground.png')
        monochrome = Image.new('RGBA', layer.size, (255, 255, 255, 0))
        monochrome.putalpha(layer.getchannel('A'))
        monochrome.save(folder / 'ic_launcher_monochrome.png')

        # Adaptive background is now a single color resource, not six stale PNGs.
        (folder / 'ic_launcher_background.png').unlink(missing_ok=True)

    # One scalable drawable avoids old density/night artwork overriding the logo.
    for old_splash in RES.glob('drawable*/splash.png'):
        old_splash.unlink()
    print('Regenerated six Android launcher densities and monochrome masks from the shipped iOS master.')


if __name__ == '__main__':
    generate()
