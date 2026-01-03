# bengali_text_helper.py
# ---------------------------------------------
# Bangla-safe PDF text rendering helper
# Works with ReportLab (Unicode + conjunct safe)
# ---------------------------------------------

import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ------------------------------------------------
# FONT REGISTRATION
# ------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(BASE_DIR, "fonts")

REGULAR_FONT_PATH = os.path.join(FONT_DIR, "NotoSansBengali-Regular.ttf")
BOLD_FONT_PATH = os.path.join(FONT_DIR, "NotoSansBengali-Bold.ttf")

_FONTS_REGISTERED = False


def register_bengali_fonts():
    """
    Register Bangla Unicode fonts for ReportLab.
    Must be called BEFORE drawing any Bangla text.
    """
    global _FONTS_REGISTERED

    if _FONTS_REGISTERED:
        return

    if not os.path.exists(REGULAR_FONT_PATH):
        raise FileNotFoundError(f"Bangla font not found: {REGULAR_FONT_PATH}")

    if not os.path.exists(BOLD_FONT_PATH):
        raise FileNotFoundError(f"Bangla font not found: {BOLD_FONT_PATH}")

    pdfmetrics.registerFont(TTFont("BN", REGULAR_FONT_PATH))
    pdfmetrics.registerFont(TTFont("BN-Bold", BOLD_FONT_PATH))

    _FONTS_REGISTERED = True


# ------------------------------------------------
# INTERNAL STYLE FACTORY
# ------------------------------------------------


def _get_bn_style(font_size=9, bold=False, align="left"):
    alignment = TA_LEFT if align == "left" else TA_CENTER

    return ParagraphStyle(name="BanglaStyle",
                          fontName="BN-Bold" if bold else "BN",
                          fontSize=font_size,
                          leading=font_size + 2,
                          alignment=alignment,
                          wordWrap="LTR",
                          splitLongWords=False,
                          spaceBefore=0,
                          spaceAfter=0)


# ------------------------------------------------
# MAIN TEXT DRAW FUNCTION (USE THIS EVERYWHERE)
# ------------------------------------------------


def draw_bn_text(canvas,
                 text,
                 x,
                 y,
                 width=200,
                 font_size=9,
                 bold=False,
                 align="left"):
    """
    Draw Bangla text safely on ReportLab canvas.

    Args:
        canvas      : ReportLab canvas
        text        : Bangla text (string)
        x, y        : Position (bottom-left)
        width       : Max width (points)
        font_size   : Font size
        bold        : Boolean
        align       : "left" or "center"
    """

    if not text:
        return

    register_bengali_fonts()

    style = _get_bn_style(font_size=font_size, bold=bold, align=align)

    # Convert to string safely
    text = str(text)

    paragraph = Paragraph(text, style)
    paragraph.wrapOn(canvas, width, 100)
    paragraph.drawOn(canvas, x, y)


# ------------------------------------------------
# MULTI-LINE BANGLA BLOCK (RULES / NOTES)
# ------------------------------------------------


def draw_bn_multiline(canvas,
                      text,
                      x,
                      y,
                      width=200,
                      font_size=8,
                      align="left"):
    """
    Draw multi-line Bangla paragraph safely.
    Use ONLY when wrapping is required.
    """

    if not text:
        return

    register_bengali_fonts()

    style = ParagraphStyle(name="BanglaMultiline",
                           fontName="BN",
                           fontSize=font_size,
                           leading=font_size + 3,
                           alignment=TA_LEFT if align == "left" else TA_CENTER,
                           wordWrap="LTR")

    paragraph = Paragraph(text, style)
    w, h = paragraph.wrap(width, 500)
    paragraph.drawOn(canvas, x, y - h)


# ------------------------------------------------
# SAFE TRUNCATION (OPTIONAL)
# ------------------------------------------------


def truncate_text(text, max_length=30):
    """
    Truncate text safely (no Bangla break).
    """
    if not text:
        return ""

    text = str(text)
    return text if len(text) <= max_length else text[:max_length] + "…"
