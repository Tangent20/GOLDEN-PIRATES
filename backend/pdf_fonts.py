"""Polices PDF embarquées — rendu identique sur tous les navigateurs/téléphones.

Pourquoi : Les PDF générés par ReportLab utilisent par défaut Helvetica/Times, qui sont
des polices "Standard 14" NON embarquées dans le fichier. Chaque viewer (Chrome, Firefox,
Opera, Xiaomi Mi Browser, Samsung Internet, iOS Safari…) substitue alors une police
système différente, ce qui produit un rendu visuellement différent selon l'appareil.

Solution : enregistrer et EMBARQUER les polices Liberation Sans / Liberation Serif
(libres, pré-installées sur le système, métriquement compatibles avec Arial/Times).
Ainsi tous les visiteurs voient EXACTEMENT le même rendu.
"""
from __future__ import annotations
import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Chemins Linux standards
_LIB_DIR = "/usr/share/fonts/truetype/liberation"

# Alias → chemin TTF
_FONT_MAP = {
    "GPSans": f"{_LIB_DIR}/LiberationSans-Regular.ttf",
    "GPSans-Bold": f"{_LIB_DIR}/LiberationSans-Bold.ttf",
    "GPSans-Italic": f"{_LIB_DIR}/LiberationSans-Italic.ttf",
    "GPSans-BoldItalic": f"{_LIB_DIR}/LiberationSans-BoldItalic.ttf",
    "GPSerif": f"{_LIB_DIR}/LiberationSerif-Regular.ttf",
    "GPSerif-Bold": f"{_LIB_DIR}/LiberationSerif-Bold.ttf",
    "GPSerif-Italic": f"{_LIB_DIR}/LiberationSerif-Italic.ttf",
}

_registered = False


def ensure_pdf_fonts() -> dict:
    """Enregistre les polices TTF (idempotent) et retourne le mapping des alias.
    Si une police est manquante, retombe gracieusement sur Helvetica standard."""
    global _registered
    aliases = {
        "regular": "Helvetica",
        "bold": "Helvetica-Bold",
        "italic": "Helvetica-Oblique",
        "bold_italic": "Helvetica-BoldOblique",
        "serif": "Times-Roman",
        "serif_bold": "Times-Bold",
        "serif_italic": "Times-Italic",
    }
    if _registered:
        # Déjà fait : retourne tout de suite les alias GP*
        return {
            "regular": "GPSans",
            "bold": "GPSans-Bold",
            "italic": "GPSans-Italic",
            "bold_italic": "GPSans-BoldItalic",
            "serif": "GPSerif",
            "serif_bold": "GPSerif-Bold",
            "serif_italic": "GPSerif-Italic",
        }

    ok_all = True
    for alias, path in _FONT_MAP.items():
        if not os.path.exists(path):
            ok_all = False
            continue
        try:
            pdfmetrics.registerFont(TTFont(alias, path))
        except Exception:
            ok_all = False

    if ok_all:
        aliases = {
            "regular": "GPSans",
            "bold": "GPSans-Bold",
            "italic": "GPSans-Italic",
            "bold_italic": "GPSans-BoldItalic",
            "serif": "GPSerif",
            "serif_bold": "GPSerif-Bold",
            "serif_italic": "GPSerif-Italic",
        }
        _registered = True
    return aliases
