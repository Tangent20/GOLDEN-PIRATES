"""
Golden Pirates — Facture de don (parchemin pirate PDF + Excel, FR/EN).

Génère une facture 100% immersive à partir d'un donateur enrichi :
- `receipt_id` : identifiant unique "GPD-1023-XXXX"
- `pseudo`, `amount`, `currency`, `email`, `message`, `created_at`, `provider`

Style : parchemin, sceau cire rouge, filigrane GOLDEN PIRATES, numéro de bordereau.
"""
from __future__ import annotations

import io
from datetime import datetime
from typing import Optional
from xml.sax.saxutils import escape

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

# Enregistre les polices Liberation Sans/Serif et les embarque dans chaque PDF.
# Nécessaire pour que le rendu soit IDENTIQUE sur Chrome, Firefox, Opera,
# Xiaomi Mi, Samsung Internet, iOS Safari, etc.
from pdf_fonts import ensure_pdf_fonts  # noqa: E402
ensure_pdf_fonts()


# --------------------- i18n facture ---------------------
INVOICE_I18N = {
    "fr": {
        "title": "REÇU DE BUTIN",
        "subtitle": "GOLDEN PIRATES — ROYAUME 1023",
        "ribbon": "PARCHEMIN SCELLÉ PAR LE CONSEIL",
        "bordereau": "BORDEREAU N°",
        "date": "DATE DU SCELLÉ",
        "section_crew": "LE MARIN DONATEUR",
        "section_treasure": "LE BUTIN LARGUÉ",
        "section_message": "MOT DU MARIN",
        "pseudo": "PAVILLON",
        "email": "COURRIEL",
        "amount": "MONTANT",
        "currency": "DEVISE",
        "provider": "VOIE DE PAIEMENT",
        "received_on": "RECUE LE",
        "no_email": "— non renseigné —",
        "no_message": "— aucun mot gravé —",
        "thanks_title": "LE CONSEIL TE REMERCIE, MARIN",
        "thanks_body": (
            "Que les vents te soient toujours favorables. Ta contribution file droit à la cale "
            "de GOLDEN PIRATES et finance les voiles de nos prochaines batailles. Chaque pièce "
            "frappe le pont pour toi — l'équipage se souviendra de ton pavillon à chaque KvK."
        ),
        "legal_title": "MENTIONS DU PONT",
        "legal_body": (
            "Reçu de don non fiscal : ce parchemin atteste d'un don volontaire reçu via PayPal. Ce "
            "n'est pas une facture et il n'ouvre droit à aucune réduction d'impôt (art. 200 et "
            "238 bis du CGI non applicables). GOLDEN PIRATES est une alliance communautaire de fans "
            "de Call of Dragons, sans but lucratif ; aucun bien ni service n'a été fourni en contrepartie."
        ),
        "contact": "COURRIEL DU CONSEIL",
        "footer_note": "FABRIQUÉ AU CREUX DE LA HUNE — SITE COMMUNAUTAIRE NON AFFILIÉ À CALL OF DRAGONS",
        "watermark": "GOLDEN PIRATES",
        "seal_label": "SCEAU DU CONSEIL",
        "pending_banner": "EN ATTENTE DE CONFIRMATION DU CONSEIL",
        "pending_watermark": "EN ATTENTE",
        "pending_note": "Le Conseil vérifie encore l'arrivée de ton don sur PayPal — ce parchemin provisoire sera scellé définitivement dès confirmation.",
        "date_fmt": "%d/%m/%Y %H:%M",
        "amount_fmt": lambda a, c: f"{a:,.2f} {c}".replace(",", " ").replace(".", ","),
        "filename": lambda rid: f"GOLDEN-PIRATES-RECU-{rid}-FR",
    },
    "en": {
        "title": "TREASURE RECEIPT",
        "subtitle": "GOLDEN PIRATES — KINGDOM 1023",
        "ribbon": "PARCHMENT SEALED BY THE COUNCIL",
        "bordereau": "RECEIPT N°",
        "date": "SEAL DATE",
        "section_crew": "THE DONATING SAILOR",
        "section_treasure": "DROPPED TREASURE",
        "section_message": "SAILOR'S WORD",
        "pseudo": "COLORS",
        "email": "E-MAIL",
        "amount": "AMOUNT",
        "currency": "CURRENCY",
        "provider": "PAYMENT CHANNEL",
        "received_on": "RECEIVED ON",
        "no_email": "— not provided —",
        "no_message": "— no word carved —",
        "thanks_title": "THE COUNCIL THANKS YOU, SAILOR",
        "thanks_body": (
            "May fair winds forever fill your sails. Your contribution lands straight into the "
            "GOLDEN PIRATES hold and funds the sails of our next battles. Every coin strikes the "
            "deck for you — the crew will remember your colors at every KvK."
        ),
        "legal_title": "DECK NOTICES",
        "legal_body": (
            "This parchment certifies a voluntary donation received via PayPal. It is not a "
            "commercial invoice. GOLDEN PIRATES is a non-profit community alliance of Call of "
            "Dragons fans; no goods or services were provided in return."
        ),
        "contact": "COUNCIL E-MAIL",
        "footer_note": "CRAFTED IN THE CROW'S NEST — FAN-MADE COMMUNITY SITE, NOT AFFILIATED WITH CALL OF DRAGONS",
        "watermark": "GOLDEN PIRATES",
        "seal_label": "COUNCIL SEAL",
        "pending_banner": "AWAITING COUNCIL CONFIRMATION",
        "pending_watermark": "PENDING",
        "pending_note": "The Council is still checking your gift on PayPal — this provisional parchment will be finally sealed upon confirmation.",
        "date_fmt": "%Y-%m-%d %H:%M",
        "amount_fmt": lambda a, c: f"{c} {a:,.2f}",
        "filename": lambda rid: f"GOLDEN-PIRATES-RECEIPT-{rid}-EN",
    },
}

GOLD = colors.HexColor("#B8860B")
GOLD_LIGHT = colors.HexColor("#D4AF37")
INK = colors.HexColor("#1A1612")
PARCH = colors.HexColor("#F3E6C8")
PARCH_SHADE = colors.HexColor("#E6D3A1")
WAX_RED = colors.HexColor("#8B1E1E")
WAX_RED_LIGHT = colors.HexColor("#B91C1C")
COUNCIL_MAIL = "golden.pirates@outlook.fr"


from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Fuseau d'affichage par défaut des factures : Paris. Les appelants peuvent
# fournir n'importe quel fuseau IANA (`tz_name`) pour imprimer dans l'heure
# locale du destinataire — chaque reçu reflète alors l'heure de son pays.
DEFAULT_TZ = ZoneInfo("Europe/Paris")


def _resolve_tz(tz_name: Optional[str]):
    """Transforme un nom IANA en ZoneInfo. Retombe sur Paris si inconnu/invalide
    (évite tout crash côté PDF/Excel pour un fuseau mal saisi côté client)."""
    if not tz_name:
        return DEFAULT_TZ
    try:
        return ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, Exception):
        return DEFAULT_TZ


def _fmt_date(iso: Optional[str], fmt: str, tz=None) -> str:
    if not iso:
        return ""
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo("UTC"))
        target = tz or DEFAULT_TZ
        return dt.astimezone(target).strftime(fmt)
    except (TypeError, ValueError):
        return str(iso)


# --------------------- PDF (parchemin pirate) ---------------------
def generate_invoice_pdf(donator: dict, lang: str = "fr", pending: bool = False, tz_name: Optional[str] = None) -> bytes:
    """Génère la facture PDF 100% pirate pour un donateur enrichi.
    Si pending=True, ajoute un bandeau rouge "EN ATTENTE" et un filigrane rouge supplémentaire.
    tz_name : fuseau IANA pour imprimer la date (ex. "America/New_York"). Défaut : Europe/Paris."""
    L = INVOICE_I18N["fr" if lang not in ("fr", "en") else lang]
    _tz = _resolve_tz(tz_name)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    W, H = A4

    # ---- Fond parchemin + bordure or ----
    c.setFillColor(PARCH)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    # Grain d'ombre discret
    c.setFillColor(PARCH_SHADE)
    c.setFillAlpha(0.15)
    for y in range(0, int(H), 4):
        if y % 32 == 0:
            c.rect(0, y, W, 1, stroke=0, fill=1)
    c.setFillAlpha(1)
    # Double cadre or
    c.setStrokeColor(GOLD)
    c.setLineWidth(2.2)
    c.rect(14 * mm, 14 * mm, W - 28 * mm, H - 28 * mm, stroke=1, fill=0)
    c.setLineWidth(0.5)
    c.rect(17 * mm, 17 * mm, W - 34 * mm, H - 34 * mm, stroke=1, fill=0)

    # ---- Filigrane : crâne pirate + sabres croisés au centre du parchemin ----
    # Dessiné en vectoriel (ReportLab primitives), ambré translucide, discret mais iconique.
    c.saveState()
    c.translate(W / 2, H / 2 + 30)  # au-dessus du centre pour éviter la zone "mot du marin"
    c.setFillColor(GOLD)
    c.setStrokeColor(GOLD)
    # Opacité très faible : le filigrane doit rester lisible SANS gêner le texte posé dessus
    c.setFillAlpha(0.07)
    c.setStrokeAlpha(0.09)

    # --- Sabres croisés (derrière le crâne, plus longs pour la silhouette iconique) ---
    for angle in (45, -45):
        c.saveState()
        c.rotate(angle)
        c.setLineWidth(6)
        c.line(-150, 0, 115, 0)
        p = c.beginPath()
        p.moveTo(115, -4)
        p.lineTo(135, 0)
        p.lineTo(115, 4)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
        c.setLineWidth(0)
        c.rect(-135, -14, 5, 28, stroke=0, fill=1)
        c.rect(-148, -4, 14, 8, stroke=0, fill=1)
        c.circle(-150, 0, 6, stroke=0, fill=1)
        c.restoreState()

    # --- Crâne (face vue de face) ---
    c.setLineWidth(0)
    c.setFillAlpha(0.08)
    c.ellipse(-70, 0, 70, 90, stroke=0, fill=1)
    p = c.beginPath()
    p.moveTo(-45, 0)
    p.lineTo(45, 0)
    p.lineTo(32, -42)
    p.lineTo(-32, -42)
    p.close()
    c.drawPath(p, stroke=0, fill=1)

    # --- Orbites (yeux) : or légèrement plus intense (toujours dans la palette), SANS brun foncé ---
    # Ancien: #2A1F12 (brun foncé) à 0.22 → créait des taches sombres gênantes derrière le texte
    # Nouveau: or doux à 0.11 → silhouette visible, texte toujours parfaitement lisible
    c.setFillAlpha(0.11)
    c.ellipse(-38, 20, -10, 55, stroke=0, fill=1)
    c.ellipse(10, 20, 38, 55, stroke=0, fill=1)
    p = c.beginPath()
    p.moveTo(-7, 10)
    p.lineTo(7, 10)
    p.lineTo(0, -4)
    p.close()
    c.drawPath(p, stroke=0, fill=1)
    for x in (-18, -6, 6, 18):
        c.rect(x - 1.5, -36, 3, 10, stroke=0, fill=1)

    c.setFillAlpha(1)
    c.setStrokeAlpha(1)
    c.restoreState()

    # ---- Filigrane rouge PENDING (uniquement si don en attente) ----
    if pending:
        c.saveState()
        c.translate(W / 2, H / 2)
        c.rotate(-24)
        c.setFillColor(WAX_RED)
        # Opacité réduite : le texte PENDING ne doit pas étouffer le contenu
        c.setFillAlpha(0.09)
        c.setFont("GPSans-Bold", 72)
        c.drawCentredString(0, 10, L["pending_watermark"])
        c.setFillAlpha(1)
        c.restoreState()

    # ---- Bandeau titre ----
    c.setFillColor(INK)
    c.setFont("GPSans-Bold", 11)
    c.drawCentredString(W / 2, H - 25 * mm, L["ribbon"])
    c.setFont("GPSans-Bold", 28)
    c.setFillColor(GOLD)
    c.drawCentredString(W / 2, H - 36 * mm, L["title"])
    c.setFont("GPSans", 10)
    c.setFillColor(INK)
    c.drawCentredString(W / 2, H - 43 * mm, L["subtitle"])
    # Ligne décorative
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.line(55 * mm, H - 47 * mm, W - 55 * mm, H - 47 * mm)
    c.setLineWidth(0.3)
    c.line(60 * mm, H - 48 * mm, W - 60 * mm, H - 48 * mm)

    # ---- Bandeau rouge PENDING (visible, bien lisible) ----
    if pending:
        bx, by, bw, bh = 20 * mm, H - 56 * mm, W - 40 * mm, 7 * mm
        c.setFillColor(WAX_RED)
        c.setStrokeColor(WAX_RED_LIGHT)
        c.setLineWidth(0.8)
        c.rect(bx, by, bw, bh, stroke=1, fill=1)
        c.setFillColor(colors.white)
        c.setFont("GPSans-Bold", 10)
        c.drawCentredString(W / 2, by + 2 * mm, L["pending_banner"])

    # ---- Numéro bordereau + date, en haut à droite dans un cartouche ----
    rid = str(donator.get("receipt_id", "GPD-?"))
    created = _fmt_date(donator.get("created_at"), L["date_fmt"], _tz)
    # Décalage vertical si bandeau pending présent (évite le chevauchement)
    cart_offset = -8 * mm if pending else 0
    cart_x, cart_y, cart_w, cart_h = W - 90 * mm, H - 64 * mm + cart_offset, 70 * mm, 14 * mm
    c.setFillColor(INK)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.8)
    c.rect(cart_x, cart_y, cart_w, cart_h, stroke=1, fill=1)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("GPSans-Bold", 7)
    c.drawString(cart_x + 3 * mm, cart_y + cart_h - 4.5 * mm, L["bordereau"])
    c.setFont("GPSans-Bold", 12)
    c.drawString(cart_x + 3 * mm, cart_y + 3 * mm, rid)
    c.setFont("GPSans", 7)
    c.setFillColor(colors.HexColor("#F8E6B8"))
    c.drawRightString(cart_x + cart_w - 3 * mm, cart_y + cart_h - 4.5 * mm, L["date"])
    c.setFont("GPSans-Bold", 9)
    c.drawRightString(cart_x + cart_w - 3 * mm, cart_y + 3 * mm, created)

    # ---- Section "LE MARIN DONATEUR" ----
    # Décalage vertical si bandeau pending (évite tout chevauchement du contenu)
    y = H - 72 * mm + (-8 * mm if pending else 0)
    _draw_section(c, 20 * mm, y, W - 40 * mm, L["section_crew"])
    y -= 10 * mm
    pseudo = str(donator.get("pseudo", "—"))
    email = donator.get("email") or L["no_email"]
    _draw_kv(c, 22 * mm, y, L["pseudo"], pseudo, bold_val=True)
    _draw_kv(c, 110 * mm, y, L["email"], email)
    y -= 14 * mm

    # ---- Section "LE BUTIN LARGUÉ" ----
    _draw_section(c, 20 * mm, y, W - 40 * mm, L["section_treasure"])
    y -= 10 * mm
    amount = float(donator.get("amount", 0))
    currency = (donator.get("currency") or "EUR").upper()
    provider = str(donator.get("provider") or "PayPal").upper()
    amount_str = L["amount_fmt"](amount, currency)
    _draw_kv(c, 22 * mm, y, L["amount"], amount_str, bold_val=True, big=True)
    _draw_kv(c, 110 * mm, y, L["provider"], provider)
    y -= 10 * mm
    _draw_kv(c, 22 * mm, y, L["received_on"], created)
    _draw_kv(c, 110 * mm, y, L["currency"], currency)
    y -= 14 * mm

    # ---- Section "MOT DU MARIN" ----
    _draw_section(c, 20 * mm, y, W - 40 * mm, L["section_message"])
    y -= 10 * mm
    msg = (donator.get("message") or "").strip() or L["no_message"]
    c.setFont("GPSans-Italic", 10)
    c.setFillColor(INK)
    for line in _wrap_text(msg, 11, W - 48 * mm):
        c.drawString(22 * mm, y, line)
        y -= 5 * mm
    y -= 6 * mm

    # ---- Remerciement pirate ----
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.4)
    c.line(22 * mm, y, W - 22 * mm, y)
    y -= 8 * mm
    c.setFont("GPSans-Bold", 13)
    c.setFillColor(GOLD)
    c.drawString(22 * mm, y, L["thanks_title"])
    y -= 7 * mm
    c.setFont("GPSans-Italic", 10.5)
    c.setFillColor(INK)
    for line in _wrap_text(L["thanks_body"], 11, W - 48 * mm):
        c.drawString(22 * mm, y, line)
        y -= 5 * mm

    # ---- Sceau de cire rouge en bas à droite ----
    seal_cx, seal_cy, seal_r = W - 42 * mm, 55 * mm, 20 * mm
    c.saveState()
    # Dégoulinure
    c.setFillColor(WAX_RED)
    c.setStrokeColor(WAX_RED)
    c.circle(seal_cx, seal_cy, seal_r, stroke=1, fill=1)
    c.setFillColor(WAX_RED_LIGHT)
    c.setFillAlpha(0.4)
    c.circle(seal_cx - 4, seal_cy + 4, seal_r - 6, stroke=0, fill=1)
    c.setFillAlpha(1)
    # Étoile GP centrée
    c.setFillColor(GOLD_LIGHT)
    c.setFont("GPSans-Bold", 20)
    c.drawCentredString(seal_cx, seal_cy - 4, "GP")
    c.setFont("GPSans-Bold", 6)
    c.setFillColor(GOLD_LIGHT)
    _draw_curved_label(c, seal_cx, seal_cy, seal_r - 3.5, L["seal_label"])
    c.restoreState()

    # ---- Mentions légales + footer ----
    y_legal = 50 * mm
    c.setFont("GPSans-Bold", 8)
    c.setFillColor(GOLD)
    c.drawString(22 * mm, y_legal, L["legal_title"])
    c.setFont("GPSans", 8)
    c.setFillColor(INK)
    for line in _wrap_text(L["legal_body"], 8, W - 76 * mm):
        y_legal -= 4 * mm
        c.drawString(22 * mm, y_legal, line)
    y_legal -= 7 * mm
    c.setFont("GPSans-Bold", 7)
    c.setFillColor(GOLD)
    c.drawString(22 * mm, y_legal, f"{L['contact']} :")
    c.setFont("GPSans", 8)
    c.setFillColor(INK)
    c.drawString(22 * mm + 32 * mm, y_legal, COUNCIL_MAIL)

    # Footer central
    c.setFont("GPSans-Bold", 6.5)
    c.setFillColor(GOLD)
    c.drawCentredString(W / 2, 20 * mm, L["footer_note"])

    c.showPage()
    c.save()
    return buf.getvalue()


def _draw_section(c, x, y, w, label):
    c.setFillColor(INK)
    c.setStrokeColor(GOLD)
    c.setLineWidth(0.6)
    c.rect(x, y - 2 * mm, w, 7 * mm, stroke=1, fill=1)
    c.setFillColor(GOLD_LIGHT)
    c.setFont("GPSans-Bold", 9)
    c.drawString(x + 3 * mm, y + 0.5 * mm, label)


def _draw_kv(c, x, y, k, v, bold_val=False, big=False):
    c.setFillColor(colors.HexColor("#6B5A3E"))
    c.setFont("GPSans-Bold", 7)
    c.drawString(x, y + 4 * mm, k)
    c.setFillColor(INK)
    if big:
        c.setFont("GPSans-Bold", 16)
    elif bold_val:
        c.setFont("GPSans-Bold", 11)
    else:
        c.setFont("GPSans", 10)
    c.drawString(x, y - 1 * mm, str(v))


def _wrap_text(text: str, font_size: int, max_width_pts: float):
    """Simple word-wrap pour reportlab canvas (Helvetica)."""
    words = str(text).split()
    lines = []
    cur = ""
    for w in words:
        test = (cur + " " + w).strip()
        if stringWidth(test, "GPSans", font_size) <= max_width_pts:
            cur = test
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def _draw_curved_label(c, cx, cy, r, text):
    """Dessine `text` courbé en demi-cercle supérieur autour du sceau."""
    if not text:
        return
    text = text.strip()
    import math
    total_angle = min(math.pi * 0.9, len(text) * 0.14)
    start = math.pi / 2 + total_angle / 2
    step = total_angle / max(len(text) - 1, 1)
    for i, ch in enumerate(text):
        a = start - i * step
        x = cx + r * math.cos(a)
        y = cy + r * math.sin(a)
        c.saveState()
        c.translate(x, y)
        c.rotate(math.degrees(a) - 90)
        c.drawCentredString(0, 0, ch)
        c.restoreState()


# --------------------- Excel (feuille parchemin) ---------------------
def generate_invoice_xlsx(donator: dict, lang: str = "fr", pending: bool = False, tz_name: Optional[str] = None) -> bytes:
    """Génère la facture Excel pirate pour un donateur enrichi.
    Si pending=True, ajoute une ligne rouge "EN ATTENTE" sous le titre.
    tz_name : fuseau IANA (ex. "Asia/Tokyo"). Défaut : Europe/Paris."""
    L = INVOICE_I18N["fr" if lang not in ("fr", "en") else lang]
    _tz = _resolve_tz(tz_name)
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = L["title"][:31]
    # Masquer gridlines
    ws.sheet_view.showGridLines = False

    gold_fill = PatternFill("solid", fgColor="D4AF37")
    ink_fill = PatternFill("solid", fgColor="1A1612")
    parch_fill = PatternFill("solid", fgColor="F3E6C8")
    wax_fill = PatternFill("solid", fgColor="8B1E1E")
    thin = Side(border_style="thin", color="B8860B")
    thick = Side(border_style="medium", color="B8860B")

    # Colonnes
    widths = [4, 24, 36, 24, 24, 4]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # Ligne 1 — titre
    ws.row_dimensions[1].height = 10
    ws.row_dimensions[2].height = 34
    ws.merge_cells("B2:E2")
    ws["B2"] = L["title"]
    ws["B2"].font = Font(name="Arial", size=22, bold=True, color="D4AF37")
    ws["B2"].alignment = Alignment(horizontal="center", vertical="center")
    ws["B2"].fill = ink_fill
    for col in ("B", "C", "D", "E"):
        ws[f"{col}2"].fill = ink_fill

    ws.merge_cells("B3:E3")
    ws["B3"] = L["subtitle"]
    ws["B3"].font = Font(name="Arial", size=10, bold=True, color="1A1612")
    ws["B3"].alignment = Alignment(horizontal="center")
    ws["B3"].fill = gold_fill
    ws.row_dimensions[3].height = 18

    ws.merge_cells("B4:E4")
    ws["B4"] = L["ribbon"]
    ws["B4"].font = Font(size=9, italic=True, color="6B5A3E")
    ws["B4"].alignment = Alignment(horizontal="center")
    ws.row_dimensions[4].height = 16

    # Bandeau EN ATTENTE si pending
    if pending:
        ws.merge_cells("B5:E5")
        ws["B5"] = L["pending_banner"]
        ws["B5"].font = Font(bold=True, size=11, color="FFFFFF")
        ws["B5"].alignment = Alignment(horizontal="center", vertical="center")
        ws["B5"].fill = wax_fill
        ws.row_dimensions[5].height = 22

    # Bordereau + date
    rid = str(donator.get("receipt_id", "GPD-?"))
    created = _fmt_date(donator.get("created_at"), L["date_fmt"], _tz)
    ws["B6"] = L["bordereau"]
    ws["C6"] = rid
    ws["D6"] = L["date"]
    ws["E6"] = created
    for cell_key, is_label in (("B6", True), ("C6", False), ("D6", True), ("E6", False)):
        ws[cell_key].font = Font(bold=is_label, color="1A1612" if is_label else "B8860B", size=10 if is_label else 11)
        ws[cell_key].alignment = Alignment(horizontal="left", vertical="center")
        ws[cell_key].fill = parch_fill
        ws[cell_key].border = Border(top=thin, bottom=thin, left=thin, right=thin)
    ws.row_dimensions[6].height = 24

    # Section crew
    _xlsx_section(ws, "B8:E8", L["section_crew"], gold_fill)
    pseudo = str(donator.get("pseudo", "—"))
    email = donator.get("email") or L["no_email"]
    _xlsx_kv(ws, 9, 2, L["pseudo"], pseudo, bold=True)
    _xlsx_kv(ws, 9, 4, L["email"], email)

    # Section treasure
    _xlsx_section(ws, "B11:E11", L["section_treasure"], gold_fill)
    amount = float(donator.get("amount", 0))
    currency = (donator.get("currency") or "EUR").upper()
    provider = str(donator.get("provider") or "PayPal").upper()
    _xlsx_kv(ws, 12, 2, L["amount"], L["amount_fmt"](amount, currency), bold=True, size=14)
    _xlsx_kv(ws, 12, 4, L["provider"], provider)
    _xlsx_kv(ws, 13, 2, L["received_on"], created)
    _xlsx_kv(ws, 13, 4, L["currency"], currency)

    # Section message
    _xlsx_section(ws, "B15:E15", L["section_message"], gold_fill)
    msg = (donator.get("message") or "").strip() or L["no_message"]
    ws.merge_cells("B16:E18")
    ws["B16"] = msg
    ws["B16"].font = Font(italic=True, size=11, color="1A1612")
    ws["B16"].alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    for col in ("B", "C", "D", "E"):
        for r in (16, 17, 18):
            ws[f"{col}{r}"].fill = parch_fill
    ws["B16"].border = Border(top=thin, left=thin)
    ws["E16"].border = Border(top=thin, right=thin)
    ws["B18"].border = Border(bottom=thin, left=thin)
    ws["E18"].border = Border(bottom=thin, right=thin)

    # Remerciement
    ws.merge_cells("B20:E20")
    ws["B20"] = L["thanks_title"]
    ws["B20"].font = Font(name="Arial", bold=True, size=14, color="D4AF37")
    ws["B20"].alignment = Alignment(horizontal="center")
    ws["B20"].fill = ink_fill
    ws.row_dimensions[20].height = 24

    ws.merge_cells("B21:E23")
    ws["B21"] = L["thanks_body"]
    ws["B21"].font = Font(italic=True, size=11, color="1A1612")
    ws["B21"].alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws["B21"].fill = parch_fill
    for row in (21, 22, 23):
        for col in ("B", "C", "D", "E"):
            ws[f"{col}{row}"].fill = parch_fill

    # Sceau (en cellule) — bloc rouge symbolique
    ws["E25"] = "GP"
    ws["E25"].font = Font(bold=True, size=18, color="D4AF37")
    ws["E25"].fill = wax_fill
    ws["E25"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[25].height = 48
    ws["E26"] = L["seal_label"]
    ws["E26"].font = Font(size=7, bold=True, color="8B1E1E")
    ws["E26"].alignment = Alignment(horizontal="center")

    # Mentions légales
    ws.merge_cells("B25:D27")
    ws["B25"] = L["legal_body"]
    ws["B25"].font = Font(size=8, color="6B5A3E")
    ws["B25"].alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
    ws.row_dimensions[27].height = 32

    ws["B29"] = L["contact"]
    ws["C29"] = COUNCIL_MAIL
    ws["B29"].font = Font(bold=True, size=8, color="B8860B")
    ws["C29"].font = Font(size=9, color="1A1612")

    # Footer
    ws.merge_cells("B31:E31")
    ws["B31"] = L["footer_note"]
    ws["B31"].font = Font(size=7, bold=True, italic=True, color="B8860B")
    ws["B31"].alignment = Alignment(horizontal="center")

    # Cadre or sur toute la zone utile
    for row in range(2, 32):
        for col in ("B", "E"):
            cell = ws[f"{col}{row}"]
            left = thick if col == "B" else cell.border.left
            right = thick if col == "E" else cell.border.right
            top = thick if row == 2 else cell.border.top
            bottom = thick if row == 31 else cell.border.bottom
            cell.border = Border(top=top, bottom=bottom, left=left, right=right)

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _xlsx_section(ws, rng, label, fill):
    ws.merge_cells(rng)
    first = rng.split(":")[0]
    ws[first] = label
    ws[first].font = Font(bold=True, size=10, color="1A1612")
    ws[first].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    for col_row in rng.split(":"):
        ws[col_row].fill = fill


def _xlsx_kv(ws, row, col, k, v, bold=False, size=10):
    from openpyxl.utils import get_column_letter as _gcl
    label = ws.cell(row=row, column=col, value=k)
    label.font = Font(size=7, bold=True, color="6B5A3E")
    label.alignment = Alignment(horizontal="left", vertical="top", indent=1)
    val = ws.cell(row=row + 0, column=col + 1, value=v)
    val.font = Font(size=size, bold=bold, color="1A1612")
    val.alignment = Alignment(horizontal="left", vertical="center", indent=1)


# --------------------- Récapitulatif global des dons (XLSX) ---------------------
def generate_donations_summary_xlsx(donators: list, total: float, goal: float, lang: str = "fr", tz_name: Optional[str] = None) -> bytes:
    """Récapitulatif Excel pirate de l'ensemble des dons reçus.
    tz_name : fuseau IANA (ex. "Europe/London"). Défaut : Europe/Paris."""
    L = INVOICE_I18N["fr" if lang not in ("fr", "en") else lang]
    _tz = _resolve_tz(tz_name)
    FR = lang == "fr"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = ("Butin complet" if FR else "Full treasure")[:31]
    ws.sheet_view.showGridLines = False
    gold_fill = PatternFill("solid", fgColor="D4AF37")
    ink_fill = PatternFill("solid", fgColor="1A1612")
    parch_fill = PatternFill("solid", fgColor="F3E6C8")
    thin = Side(border_style="thin", color="B8860B")

    cols = [
        (L["bordereau"], "receipt_id", 22),
        (L["received_on"], "created_at", 20),
        (L["pseudo"], "pseudo", 24),
        (L["amount"], "amount", 16),
        (L["currency"], "currency", 10),
        (L["email"], "email", 32),
        (L["provider"], "provider", 14),
        (L["section_message"], "message", 48),
    ]
    for i, (_, _, w) in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(cols))
    ws.cell(row=1, column=1, value=("REGISTRE DU BUTIN — GOLDEN PIRATES" if FR else "FULL TREASURE REGISTER — GOLDEN PIRATES"))
    ws.cell(row=1, column=1).font = Font(name="Arial", bold=True, size=18, color="D4AF37")
    ws.cell(row=1, column=1).fill = ink_fill
    ws.cell(row=1, column=1).alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=len(cols))
    tot_lbl = f"{'Total scellé' if FR else 'Sealed total'} : {L['amount_fmt'](total, 'EUR')} / {'Objectif' if FR else 'Goal'} : {L['amount_fmt'](goal, 'EUR')}"
    ws.cell(row=2, column=1, value=tot_lbl)
    ws.cell(row=2, column=1).font = Font(bold=True, size=11, color="1A1612")
    ws.cell(row=2, column=1).alignment = Alignment(horizontal="center")
    ws.cell(row=2, column=1).fill = gold_fill
    ws.row_dimensions[2].height = 22

    # Header
    for i, (title, _, _) in enumerate(cols, 1):
        cell = ws.cell(row=4, column=i, value=title)
        cell.font = Font(bold=True, size=9, color="1A1612")
        cell.fill = gold_fill
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = Border(top=thin, bottom=thin, left=thin, right=thin)
    ws.row_dimensions[4].height = 20

    # Rows
    for ridx, d in enumerate(donators, 5):
        values = []
        for _, key, _ in cols:
            if key == "amount":
                values.append(float(d.get("amount", 0)))
            elif key == "created_at":
                values.append(_fmt_date(d.get(key), L["date_fmt"], _tz))
            else:
                values.append(d.get(key, "") or "")
        for i, v in enumerate(values, 1):
            cell = ws.cell(row=ridx, column=i, value=v)
            cell.font = Font(size=10, color="1A1612")
            cell.alignment = Alignment(horizontal="left" if cols[i - 1][1] != "amount" else "right", vertical="center", indent=1)
            cell.fill = parch_fill if ridx % 2 == 1 else PatternFill("solid", fgColor="FBF2DD")
            cell.border = Border(top=thin, bottom=thin, left=thin, right=thin)
            if cols[i - 1][1] == "amount":
                cell.number_format = "#,##0.00"
                cell.font = Font(size=11, bold=True, color="B8860B")

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def invoice_filenames(rid: str, fmt: str, lang: str) -> str:
    """Nom de fichier conseillé pour les headers Content-Disposition."""
    L = INVOICE_I18N["fr" if lang not in ("fr", "en") else lang]
    ext = "pdf" if fmt == "pdf" else "xlsx"
    return f"{L['filename'](rid)}.{ext}"
