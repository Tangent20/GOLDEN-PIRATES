"""Génère l'image de partage (Open Graph) + les icônes GOLDEN PIRATES.
Base : illustration du site (feast-pirates.png). Polices : celles du site (OFL)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import math, random

F = "/app/scripts/og/fonts/"
PUB = "/app/frontend/public/"
GOLD_HI = (250, 226, 140)
GOLD = (212, 175, 55)
GOLD_LO = (128, 92, 24)
BONE = (236, 226, 204)
INK = (6, 9, 14)
WAX = (128, 20, 22)

def font(name, size, wght=None):
    f = ImageFont.truetype(F + name, size)
    if wght:
        try:
            f.set_variation_by_axes([wght])
        except Exception:
            pass
    return f

def gold_text(base, xy, text, fnt, tracking=0, shadow=True, grad=(GOLD_HI, GOLD, GOLD_LO)):
    """Texte rempli d'un dégradé or vertical + ombre portée + liseré sombre."""
    W, H = base.size
    mask = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(mask)
    x, y = xy
    if tracking:
        for ch in text:
            d.text((x, y), ch, font=fnt, fill=255)
            x += d.textlength(ch, font=fnt) + tracking
    else:
        d.text((x, y), text, font=fnt, fill=255)
    bbox = mask.getbbox()
    if not bbox:
        return
    if shadow:
        sh = mask.filter(ImageFilter.GaussianBlur(10))
        base.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), sh.point(lambda v: int(v * 0.95)))
        outline = mask.filter(ImageFilter.MaxFilter(5))
        base.paste(Image.new("RGB", (W, H), (30, 18, 4)), (0, 0), outline)
    top, bot = bbox[1], bbox[3]
    g = Image.new("RGB", (W, H))
    gd = ImageDraw.Draw(g)
    c1, c2, c3 = grad
    for yy in range(H):
        t = 0 if bot == top else min(max((yy - top) / (bot - top), 0), 1)
        if t < 0.45:
            k = t / 0.45
            col = tuple(int(c1[i] + (c2[i] - c1[i]) * k) for i in range(3))
        else:
            k = (t - 0.45) / 0.55
            col = tuple(int(c2[i] + (c3[i] - c2[i]) * k) for i in range(3))
        gd.line([(0, yy), (W, yy)], fill=col)
    base.paste(g, (0, 0), mask)
    # reflet fin en haut des lettres
    hl = Image.new("L", (W, H), 0)
    ImageDraw.Draw(hl).rectangle([0, top, W, top + (bot - top) * 0.18], fill=70)
    hl = Image.composite(hl, Image.new("L", (W, H), 0), mask)
    base.paste(Image.new("RGB", (W, H), (255, 248, 220)), (0, 0), hl)

def tracked(d, xy, text, fnt, fill, tracking):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill)
        x += d.textlength(ch, font=fnt) + tracking
    return x

def tracked_width(d, text, fnt, tracking):
    return sum(d.textlength(ch, font=fnt) + tracking for ch in text) - tracking

def diamond(d, cx, cy, r, fill):
    d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], fill=fill)

def wax_seal(size, text="GP"):
    """Sceau de cire original : bord irrégulier, relief, monogramme doré."""
    S = size * 4
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    random.seed(1023)
    cx = cy = S / 2
    R = S * 0.46
    pts = []
    for i in range(72):
        a = i / 72 * 2 * math.pi
        r = R * (0.93 + 0.07 * math.sin(i * 1.7) + random.uniform(-0.025, 0.025))
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    d.polygon(pts, fill=(96, 12, 14, 255))
    d.ellipse([cx - R * 0.80, cy - R * 0.80, cx + R * 0.80, cy + R * 0.80], fill=WAX + (255,))
    # anneau gravé
    for rr, w, col in ((0.74, 6, (70, 8, 10, 255)), (0.70, 3, (176, 42, 40, 255))):
        d.ellipse([cx - R * rr, cy - R * rr, cx + R * rr, cy + R * rr], outline=col, width=w * 4 // 2)
    # étoiles de boussole autour
    for k in range(8):
        a = k / 8 * 2 * math.pi - math.pi / 2
        x, y = cx + R * 0.62 * math.cos(a), cy + R * 0.62 * math.sin(a)
        diamond(d, x, y, S * 0.012, (212, 160, 60, 255))
    # brillance
    gl = Image.new("L", (S, S), 0)
    ImageDraw.Draw(gl).ellipse([cx - R * 0.65, cy - R * 0.78, cx + R * 0.1, cy - R * 0.1], fill=60)
    gl = gl.filter(ImageFilter.GaussianBlur(S * 0.05))
    im.paste(Image.new("RGBA", (S, S), (255, 200, 190, 255)), (0, 0), gl)
    im = im.resize((size, size), Image.LANCZOS)
    rgb = Image.new("RGB", (size, size), (0, 0, 0))
    base = Image.new("RGB", (size, size), (0, 0, 0))
    base.paste(im, (0, 0), im)
    fnt = font("PirataOne-Regular.ttf", int(size * 0.46))
    tmp = ImageDraw.Draw(base)
    tw = tmp.textlength(text, font=fnt)
    bb = tmp.textbbox((0, 0), text, font=fnt)
    gold_text(base, ((size - tw) / 2, (size - (bb[3] - bb[1])) / 2 - bb[1]), text, fnt, shadow=False)
    alpha = im.split()[3]
    out = base.convert("RGBA")
    out.putalpha(alpha)
    return out

# ---------------------------------------------------------------- OG 1200x630
W, H = 1200, 630
src = Image.open(PUB + "feast-pirates.png").convert("RGB")
scale = max(W / src.width, H / src.height) * 1.04
bg = src.resize((int(src.width * scale), int(src.height * scale)), Image.LANCZOS)
ox = bg.width - W - 10  # garde l'équipage qui trinque sur la droite
oy = (bg.height - H) // 2
bg = bg.crop((ox, oy, ox + W, oy + H))
bg = ImageEnhance.Contrast(bg).enhance(1.08)
bg = ImageEnhance.Color(bg).enhance(1.05)

# voile sombre à gauche pour la lisibilité + vignette
shade = Image.new("L", (W, H), 0)
sd = ImageDraw.Draw(shade)
for x in range(W):
    t = x / W
    a = 248 if t < 0.30 else int(248 - (t - 0.30) / 0.38 * 215) if t < 0.68 else 33
    sd.line([(x, 0), (x, H)], fill=max(a, 33))
bg.paste(Image.new("RGB", (W, H), INK), (0, 0), shade)
vig = Image.new("L", (W, H), 0)
ImageDraw.Draw(vig).rectangle([0, 0, W, H], fill=150)
ImageDraw.Draw(vig).ellipse([-200, -260, W + 200, H + 260], fill=0)
vig = vig.filter(ImageFilter.GaussianBlur(90))
bg.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), vig)
# chaleur de lanterne
warm = Image.new("L", (W, H), 0)
ImageDraw.Draw(warm).ellipse([700, 120, 1150, 560], fill=40)
warm = warm.filter(ImageFilter.GaussianBlur(120))
bg.paste(Image.new("RGB", (W, H), (255, 170, 60)), (0, 0), warm)

d = ImageDraw.Draw(bg)
# double cadre doré + coins
d.rectangle([16, 16, W - 17, H - 17], outline=GOLD, width=3)
d.rectangle([26, 26, W - 27, H - 27], outline=(150, 118, 40), width=1)
for (cx, cy) in ((21, 21), (W - 22, 21), (21, H - 22), (W - 22, H - 22)):
    diamond(d, cx, cy, 11, GOLD)
    diamond(d, cx, cy, 5, INK)

X = 78
f_kick = font("Cinzel.ttf", 21, 700)
tracked(d, (X, 70), "ROYAUME · KINGDOM 1023", f_kick, GOLD_HI, 6)

f_title = font("PirataOne-Regular.ttf", 156)
gold_text(bg, (X - 4, 88), "Golden", f_title)
gold_text(bg, (X - 4, 228), "Pirates", f_title)

d = ImageDraw.Draw(bg)
# séparateur
ly = 418
d.line([(X, ly), (X + 210, ly)], fill=GOLD, width=2)
diamond(d, X + 228, ly, 8, GOLD)
d.line([(X + 246, ly), (X + 456, ly)], fill=GOLD, width=2)

f_game = font("CinzelDecorative-Bold.ttf", 32)
d.text((X, 436), "Call of Dragons", font=f_game, fill=BONE)

f_tag = font("IMFeENit28P.ttf", 27)
d.text((X, 484), "« L'or de la victoire ne coule que", font=f_tag, fill=(214, 200, 170))
d.text((X, 516), "pour les équipages soudés. »", font=f_tag, fill=(214, 200, 170))

# bandeau recrutement (coin bas droit)
f_pl = font("Cinzel.ttf", 19, 800)
label = "RECRUTEMENT OUVERT · RECRUITING"
pw = tracked_width(d, label, f_pl, 3) + 56
px1, py1 = W - 60 - pw, H - 108
px2, py2 = W - 60, H - 58
plate = Image.new("L", (W, H), 0)
ImageDraw.Draw(plate).polygon([(px1 + 14, py1), (px2 - 14, py1), (px2, (py1 + py2) / 2), (px2 - 14, py2), (px1 + 14, py2), (px1, (py1 + py2) / 2)], fill=255)
bg.paste(Image.new("RGB", (W, H), (0, 0, 0)), (6, 8), plate.filter(ImageFilter.GaussianBlur(8)))
bg.paste(Image.new("RGB", (W, H), (110, 16, 18)), (0, 0), plate)
d = ImageDraw.Draw(bg)
d.polygon([(px1 + 14, py1), (px2 - 14, py1), (px2, (py1 + py2) / 2), (px2 - 14, py2), (px1 + 14, py2), (px1, (py1 + py2) / 2)], outline=GOLD, width=2)
tracked(d, (px1 + 28, py1 + 13), label, f_pl, GOLD_HI, 3)

# sceau de cire (coin haut droit)
seal = wax_seal(150)
sh = Image.new("L", (W, H), 0)
sh.paste(seal.split()[3], (W - 214 + 8, 50 + 10))
bg.paste(Image.new("RGB", (W, H), (0, 0, 0)), (0, 0), sh.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * 0.8)))
bg.paste(seal, (W - 214, 50), seal)

bg.save(PUB + "og-golden-pirates.jpg", "JPEG", quality=90, optimize=True, progressive=True)
print("og ok", bg.size)

# ---------------------------------------------------------------- ICÔNES
def icon(size):
    S = size * 4
    im = Image.new("RGB", (S, S), INK)
    d = ImageDraw.Draw(im)
    c = S / 2
    d.ellipse([S * 0.04, S * 0.04, S * 0.96, S * 0.96], outline=GOLD, width=int(S * 0.045))
    d.ellipse([S * 0.12, S * 0.12, S * 0.88, S * 0.88], outline=(150, 118, 40), width=max(int(S * 0.012), 2))
    for k in range(4):
        a = k * math.pi / 2 - math.pi / 2
        diamond(d, c + S * 0.42 * math.cos(a), c + S * 0.42 * math.sin(a), S * 0.04, GOLD_HI)
    im = im.resize((size, size), Image.LANCZOS)
    fnt = font("PirataOne-Regular.ttf", int(size * 0.50))
    dd = ImageDraw.Draw(im)
    tw = dd.textlength("GP", font=fnt)
    bb = dd.textbbox((0, 0), "GP", font=fnt)
    gold_text(im, ((size - tw) / 2, (size - (bb[3] - bb[1])) / 2 - bb[1]), "GP", fnt, shadow=False)
    return im

icon(180).save(PUB + "apple-touch-icon.png", optimize=True)
icon(192).save(PUB + "icon-192.png", optimize=True)
icon(512).save(PUB + "icon-512.png", optimize=True)
icon(48).save(PUB + "favicon-48.png", optimize=True)
icon(64).save(PUB + "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
print("icons ok")
