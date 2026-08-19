"""Procedural texture set for the Heartvale realistic world.

Run with the managed Python (PIL + numpy), NOT hython:

    python scripts/houdini/generate-heartvale-textures.py

Writes 512x512 seamless-ish PNGs to source-assets/textures/heartvale/.
Fully procedural, original work — no third-party or AI-generated content,
so no third-party-assets.json record is required.

Textures tile at the geometry UV scale (0.3/m -> one tile per ~3.3 m).
Hue is baked into each texture except `bark`, which stays near-grayscale
so the material point-color tint can drive oak-dark vs birch-pale bark.
"""

from pathlib import Path

import numpy as np
from PIL import Image

SEED = 318044611
SIZE = 512
OUT = Path(__file__).resolve().parent.parent.parent / "source-assets" / "textures" / "heartvale"

rng = np.random.default_rng(SEED)


def smooth_noise(freq: int) -> np.ndarray:
    """Tileable smooth value noise in [0, 1] at SIZE x SIZE."""
    small = rng.random((freq, freq))
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((SIZE, SIZE), Image.BICUBIC)
    big = np.asarray(img, dtype=np.float64) / 255.0
    # make it tileable by blending with a half-shifted copy
    shifted = np.roll(np.roll(big, SIZE // 2, axis=0), SIZE // 2, axis=1)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE] / SIZE
    wx = 0.5 - 0.5 * np.cos(xx * 2 * np.pi)
    wy = 0.5 - 0.5 * np.cos(yy * 2 * np.pi)
    w = np.minimum(wx, wy)
    return big * w + shifted * (1.0 - w)


def speckle(amount: float) -> np.ndarray:
    return rng.random((SIZE, SIZE)) * amount


def save(rgb: np.ndarray, name: str) -> None:
    img = Image.fromarray((np.clip(rgb, 0.0, 1.0) * 255).astype(np.uint8))
    img.save(OUT / f"{name}.png")
    print(f"{name}.png")


def tint(base: tuple[float, float, float], variation: np.ndarray) -> np.ndarray:
    rgb = np.zeros((SIZE, SIZE, 3))
    for channel in range(3):
        rgb[:, :, channel] = base[channel] * variation
    return rgb


def ashlar(base: tuple[float, float, float], rows: int, cols: int, mortar: float, name: str) -> None:
    """Coursed stone blocks with per-block tone jitter and mortar joints."""
    detail = 0.82 + 0.28 * smooth_noise(24) + 0.10 * smooth_noise(128)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    row = (yy * rows / SIZE).astype(int)
    block_shift = (row % 2) * 0.5
    col = ((xx / SIZE + block_shift) * cols).astype(int)
    block_id = row * 997 + col * 131
    block_tone = 0.82 + (np.sin(block_id * 12.9898) * 43758.5453 % 1.0) * 0.30
    mortar_mask = np.ones((SIZE, SIZE))
    row_frac = (yy * rows / SIZE) % 1.0
    col_frac = ((xx / SIZE + block_shift) * cols) % 1.0
    mortar_mask[(row_frac < mortar) | (col_frac < mortar * 0.8)] = 0.45
    save(tint(base, detail * block_tone * mortar_mask), name)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # Soul Well / marker stone: tight ashlar courses, cool gray.
    ashlar((0.62, 0.60, 0.55), rows=7, cols=5, mortar=0.06, name="wellstone")
    # Terrace: big weathered flagstones.
    ashlar((0.66, 0.63, 0.56), rows=3, cols=3, mortar=0.045, name="terrace-flagstone")
    # Plaster: warm daub with soft blotches and faint vertical drip streaks.
    blotch = 0.90 + 0.14 * smooth_noise(6) + 0.06 * smooth_noise(48)
    drip = 1.0 - 0.08 * np.abs(smooth_noise(96) - 0.5) * (np.mgrid[0:SIZE, 0:SIZE][1] / SIZE < 0.5)
    save(tint((0.86, 0.80, 0.68), blotch * drip), "plaster")
    # Timber frame: vertical wood grain.
    xx = np.mgrid[0:SIZE, 0:SIZE][1] / SIZE
    grain = 0.72 + 0.22 * np.sin(xx * 40 * np.pi + 6 * smooth_noise(8)) + 0.10 * smooth_noise(128)
    save(tint((0.48, 0.34, 0.20), grain), "timber")
    # Thatch: horizontal straw streaks.
    streak = 0.88 + 0.18 * smooth_noise(8)  # coarse tileable tone
    yy = np.mgrid[0:SIZE, 0:SIZE][0] / SIZE
    rows = 0.85 + 0.25 * np.sin(yy * 26 * np.pi + 4 * smooth_noise(12))
    fine = 0.90 + 0.20 * speckle(0.5)
    save(tint((0.72, 0.58, 0.32), streak * rows * fine), "thatch")
    # Slate: shingle courses, blue-gray.
    ashlar((0.42, 0.45, 0.50), rows=8, cols=6, mortar=0.10, name="slate")
    # Bark: near-grayscale fissures (tinted by point color — oak dark, birch pale).
    xx = np.mgrid[0:SIZE, 0:SIZE][1] / SIZE
    fissure = 0.62 + 0.30 * np.sin(xx * 60 * np.pi + 9 * smooth_noise(10)) + 0.16 * smooth_noise(180)
    gray = np.clip(fissure, 0.0, 1.0)
    save(np.stack([gray * 1.02, gray, gray * 0.94], axis=2), "bark")
    # Dock wood: horizontal planks with grain and gaps.
    yy = np.mgrid[0:SIZE, 0:SIZE][0] / SIZE
    plank = ((yy * 6) % 1.0 < 0.06) * 0.4 + 0.85
    wood_grain = 0.75 + 0.25 * smooth_noise(64)
    save(tint((0.52, 0.40, 0.24), plank * wood_grain), "dockwood")


if __name__ == "__main__":
    main()
