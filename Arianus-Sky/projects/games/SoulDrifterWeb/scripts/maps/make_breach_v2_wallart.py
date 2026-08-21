"""BREACH-V2 procedural wall art (Add-on A; local, original, zero-credit).

Generates the banner/relief/painting/scroll textures for the named wall-art
sockets on the flat map. CPU PIL only — real composed labels over generated
backgrounds (never model-rendered text). Saves WebP into the repo art dir and
records each in third-party-assets.json.

Run from scripts/maps/ or the workspace mirror:
  python make_breach_v2_wallart.py <game-root>
"""

import hashlib
import json
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT_NAME = "art"  # under public/assets/textures/environment/breach-v2/


def font(size, bold=True):
    for p in (r"C:\Windows\Fonts\georgiab.ttf" if bold else r"C:\Windows\Fonts\georgia.ttf",
              r"C:\Windows\Fonts\arialbd.ttf"):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def cloth(w, h, base, seed):
    """Dark cloth with vertical drape shading + grain."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h), base)
    d = ImageDraw.Draw(img, "RGBA")
    for x in range(0, w, 7):  # drape folds
        shade = rng.randint(-14, 10)
        d.line([x, 0, x + rng.randint(-3, 3), h], fill=(0, 0, 0, 40) if shade < 0 else (255, 240, 220, 14), width=3)
    for _ in range(w * h // 90):  # grain
        x, y = rng.randrange(w), rng.randrange(h)
        d.point((x, y), fill=(255, 255, 255, rng.randint(6, 18)) if rng.random() < 0.5 else (0, 0, 0, rng.randint(8, 22)))
    return img.filter(ImageFilter.GaussianBlur(0.6))


def stone(w, h, seed):
    """Carved stone slab: grain + block seams + chipped edges."""
    rng = random.Random(seed)
    img = Image.new("RGB", (w, h), (138, 128, 112))
    d = ImageDraw.Draw(img, "RGBA")
    for _ in range(w * h // 26):
        x, y = rng.randrange(w), rng.randrange(h)
        v = rng.randint(-22, 18)
        d.point((x, y), fill=(138 + v, 128 + v, 112 + v, 90))
    for y in range(60, h, 88):  # block seams
        d.line([0, y, w, y + rng.randint(-4, 4)], fill=(80, 72, 60, 130), width=2)
    d.rectangle([6, 6, w - 6, h - 6], outline=(70, 62, 52, 190), width=8)      # carved edge
    d.rectangle([16, 16, w - 16, h - 16], outline=(176, 166, 146, 110), width=2)  # highlight lip
    return img.filter(ImageFilter.GaussianBlur(0.8))


def carved_emblem(d, cx, cy, r, dark, light, draw_fn):
    """Carved look: dark stroke offset down-right + light offset up-left."""
    draw_fn(d, cx + 3, cy + 3, r, light)   # chisel highlight
    draw_fn(d, cx, cy, r, dark)            # recess


def emblem_ring(d, cx, cy, r, fill, width=10):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=fill, width=width)


def banner(art_id, base, accent, label, sigil):
    w, h = 512, 768
    img = cloth(w, h, base, hash(art_id) & 0xFFFF)
    d = ImageDraw.Draw(img, "RGBA")
    d.rectangle([22, 22, w - 22, h - 60], outline=accent, width=10)          # border
    d.rectangle([40, 40, w - 40, h - 78], outline=accent + (120,), width=3)
    cx, cy = w // 2, 300
    sigil(d, cx, cy, accent)
    for x in range(30, w - 30, 26):  # frayed hem
        d.polygon([(x, h - 58), (x + 13, h - 58), (x + 6, h - 22)], fill=base)
    f = font(46)
    tw = d.textlength(label, font=f)
    d.text(((w - tw) / 2, h - 150), label, font=f, fill=accent)
    return img


def relief(art_id, label, emblem_fn):
    w, h = 768, 512
    img = stone(w, h, hash(art_id) & 0xFFFF)
    d = ImageDraw.Draw(img, "RGBA")
    carved_emblem(d, w // 2, h // 2 - 40, 120, (58, 50, 40, 230), (196, 186, 164, 160), emblem_fn)
    f = font(44)
    tw = d.textlength(label, font=f)
    d.text(((w - tw) / 2 + 2, h - 92 + 2), label, font=f, fill=(60, 52, 42, 220))
    d.text(((w - tw) / 2, h - 92), label, font=f, fill=(208, 198, 176))
    return img


def painting(art_id):
    w, h = 768, 512
    img = Image.new("RGB", (w, h), (38, 30, 44))
    d = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(hash(art_id) & 0xFFFF)
    for _ in range(40):  # aged violet-gold brush fields
        x, y = rng.randrange(w), rng.randrange(h)
        r = rng.randint(18, 70)
        c = rng.choice([(90, 70, 130, 60), (150, 120, 70, 50), (60, 50, 84, 70)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=c)
    img = img.filter(ImageFilter.GaussianBlur(6))
    d = ImageDraw.Draw(img, "RGBA")
    # relic chalice silhouette on a plinth
    d.rectangle([w // 2 - 90, h - 150, w // 2 + 90, h - 110], fill=(26, 20, 30, 220))
    d.polygon([(w // 2 - 46, 190), (w // 2 + 46, 190), (w // 2 + 20, 300), (w // 2 - 20, 300)],
              fill=(190, 160, 90, 230))
    d.ellipse([w // 2 - 20, 300, w // 2 + 20, 330], fill=(190, 160, 90, 230))
    d.rectangle([w // 2 - 8, 330, w // 2 + 8, 380], fill=(170, 140, 80, 230))
    d.ellipse([w // 2 - 30, 380, w // 2 + 30, 396], fill=(170, 140, 80, 230))
    d.rectangle([0, 0, w - 1, h - 1], outline=(24, 18, 28), width=14)
    return img


def scroll_map(art_id, atlas_path):
    w, h = 768, 512
    img = Image.new("RGB", (w, h), (216, 196, 158))  # parchment
    d = ImageDraw.Draw(img, "RGBA")
    rng = random.Random(hash(art_id) & 0xFFFF)
    for _ in range(w * h // 40):
        x, y = rng.randrange(w), rng.randrange(h)
        d.point((x, y), fill=(150, 128, 90, rng.randint(20, 60)))
    d.rectangle([10, 10, w - 10, h - 10], outline=(120, 96, 60, 160), width=3)
    if Path(atlas_path).is_file():
        atlas = Image.open(atlas_path).convert("RGB").resize((w - 120, h - 160), Image.LANCZOS)
        img.paste(atlas, (60, 44))
        d.rectangle([60, 44, w - 60, h - 116], outline=(90, 70, 44), width=4)
    f = font(40)
    label = "THALENYR — THE VERDANT ECHO"
    tw = d.textlength(label, font=f)
    d.text(((w - tw) / 2, h - 64), label, font=f, fill=(88, 68, 40))
    return img


def sigil_wayfarer(d, cx, cy, accent):
    emblem_ring(d, cx, cy, 110, accent, 12)
    d.polygon([(cx, cy - 66), (cx + 40, cy + 30), (cx, cy + 66), (cx - 40, cy + 30)],
              outline=accent, width=10)
    d.line([cx, cy - 130, cx, cy + 130], fill=accent, width=6)


def sigil_oathbreaker(d, cx, cy, accent):
    for sgn in (-1, 1):  # broken chain links
        d.arc([cx - 130 if sgn < 0 else cx + 10, cy - 60, (cx - 130 if sgn < 0 else cx + 10) + 120, cy + 60],
              40 if sgn < 0 else 220, 320 if sgn < 0 else 140, fill=accent, width=16)
    d.line([cx - 26, cy - 60, cx + 26, cy + 60], fill=accent, width=12)
    d.line([cx - 26, cy + 60, cx + 26, cy - 60], fill=accent, width=12)


def sigil_ashen(d, cx, cy, accent):
    d.polygon([(cx, cy - 110), (cx + 96, cy + 80), (cx - 96, cy + 80)], outline=accent, width=12)
    emblem_ring(d, cx, cy + 18, 42, accent, 10)


def sigil_cinderbound(d, cx, cy, accent):
    emblem_ring(d, cx, cy, 116, accent, 12)
    emblem_ring(d, cx, cy, 72, accent, 8)
    for i in range(12):  # rune marks like the boss floor circle
        import math
        a = i / 12 * math.tau
        x, y = cx + math.cos(a) * 94, cy + math.sin(a) * 94
        d.line([x, y, x + math.cos(a + 0.5) * 18, y + math.sin(a + 0.5) * 18], fill=accent, width=6)
    d.polygon([(cx, cy - 44), (cx + 34, cy + 30), (cx - 34, cy + 30)], fill=accent)


def sigil_oathscar(d, cx, cy, accent):
    for i in (-1, 0, 1):  # claw scars
        d.line([cx - 70 + i * 46, cy - 110, cx - 30 + i * 46, cy + 110], fill=accent, width=14)


def emblem_warden(d, cx, cy, r, fill):
    d.polygon([(cx, cy - r), (cx + r * 0.8, cy - r * 0.2), (cx + r * 0.55, cy + r),
               (cx - r * 0.55, cy + r), (cx - r * 0.8, cy - r * 0.2)], outline=fill, width=12)
    emblem_ring(d, cx, cy - r * 0.25, r * 0.3, fill, 8)


def emblem_memory(d, cx, cy, r, fill):
    d.polygon([(cx, cy - r), (cx + r * 0.62, cy), (cx, cy + r), (cx - r * 0.62, cy)],
              outline=fill, width=12)
    d.ellipse([cx - r * 1.05, cy - r * 0.4, cx + r * 1.05, cy + r * 0.4], outline=fill, width=7)


def emblem_toll(d, cx, cy, r, fill):
    d.rectangle([cx - r * 0.8, cy - r * 0.5, cx + r * 0.8, cy + r * 0.5], outline=fill, width=12)
    for i in (-1, 0, 1):
        d.line([cx + i * r * 0.4, cy - r * 0.5, cx + i * r * 0.4, cy + r * 0.5], fill=fill, width=10)
    d.ellipse([cx - r * 0.24, cy + r * 0.62, cx + r * 0.24, cy + r * 1.05], outline=fill, width=9)


def emblem_lock(d, cx, cy, r, fill):
    emblem_ring(d, cx, cy, r, fill, 12)
    emblem_ring(d, cx, cy, r * 0.62, fill, 8)
    for i in range(8):
        import math
        a = i / 8 * math.tau
        d.line([cx + math.cos(a) * r * 0.62, cy + math.sin(a) * r * 0.62,
                cx + math.cos(a) * r * 1.0, cy + math.sin(a) * r * 1.0], fill=fill, width=8)


ART_BUILDERS = {
    "art-banner-wayfarer": lambda: banner("art-banner-wayfarer", (16, 42, 48), (90, 220, 235), "WAYFARER", sigil_wayfarer),
    "art-banner-oathbreaker": lambda: banner("art-banner-oathbreaker", (44, 24, 16), (235, 120, 60), "OATHBREAKER", sigil_oathbreaker),
    "art-banner-ashen": lambda: banner("art-banner-ashen", (34, 30, 30), (220, 120, 70), "THE ASHEN LOCK", sigil_ashen),
    "art-banner-cinderbound": lambda: banner("art-banner-cinderbound", (22, 16, 14), (255, 100, 44), "CINDERBOUND", sigil_cinderbound),
    "art-banner-oathscar": lambda: banner("art-banner-oathscar", (36, 20, 16), (200, 90, 60), "OATH SCAR", sigil_oathscar),
    "art-relief-warden": lambda: relief("art-relief-warden", "THE CINDERBOUND WARDEN", emblem_warden),
    "art-relief-first-memory": lambda: relief("art-relief-first-memory", "THE FIRST MEMORY", emblem_memory),
    "art-relief-toll": lambda: relief("art-relief-toll", "THE TOLL GATE", emblem_toll),
    "art-relief-lock-inscription": lambda: relief("art-relief-lock-inscription", "THE REALM-LOCK", emblem_lock),
    "art-painting-reliquary": lambda: painting("art-painting-reliquary"),
}


def main():
    game_root = Path(sys.argv[1]).resolve()
    out_dir = game_root / "public/assets/textures/environment/breach-v2/art"
    out_dir.mkdir(parents=True, exist_ok=True)
    atlas = Path("C:/Users/olawal/Documents/kimi/workspace/souldrifter-thalenyr/lore-atlas/assets/M-003_painted_atlas.png")

    written = []
    for art_id, build in ART_BUILDERS.items():
        img = build()
        out = out_dir / f"{art_id}.webp"
        img.save(out, quality=82, method=6)
        written.append((art_id, out))
        print(f"{art_id}: {img.size} {out.stat().st_size / 1024:.0f} KiB")
    # the archive scroll reuses the atlas master (parchment mount)
    scroll = scroll_map("art-map-thalenyr-scroll", atlas)
    out = out_dir / "art-map-thalenyr-scroll.webp"
    scroll.save(out, quality=82, method=6)
    written.append(("art-map-thalenyr-scroll", out))
    print(f"art-map-thalenyr-scroll: {scroll.size} {out.stat().st_size / 1024:.0f} KiB")

    registry = game_root / "third-party-assets.json"
    data = json.loads(registry.read_text(encoding="utf-8"))
    records = [{
        "id": f"breach-v2-wall-art-{art_id}",
        "name": f"BREACH-V2 procedural wall art — {art_id}",
        "url": "scripts/maps/make_breach_v2_wallart.py (local procedural PIL)",
        "license": "Project-original in-house art (SoulDrifter); no third-party content",
        "usage": "in-world framed wall art at named §5A sockets (banners/reliefs/painting/scroll)",
        "bundled": True,
        "sha256": hashlib.sha256(out.read_bytes()).hexdigest(),
        "notes": "Local CPU generation, zero paid credits; real composed labels over generated backgrounds.",
    } for art_id, out in written]
    ids = {r["id"] for r in records}
    data["shippingAssets"] = [a for a in data["shippingAssets"] if a.get("id") not in ids] + records
    registry.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"recorded {len(records)} procedural art assets")


if __name__ == "__main__":
    main()
