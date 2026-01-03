# id_card_pdf.py
# --------------------------------------------------
# Unified Student + Staff ID Card PDF Generator
# Bangla-safe | Print-safe | PVC-ready
# --------------------------------------------------

from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib import colors
from bengali_text_helper import (register_bengali_fonts, draw_bn_text,
                                 draw_bn_multiline)

CARD_WIDTH = 3.375 * inch  # 85.6mm
CARD_HEIGHT = 2.125 * inch  # 54mm

# --------------------------------------------------
# COMMON BACK SIDE
# --------------------------------------------------


def draw_card_back(c, institution):
    c.setFillColor(colors.white)
    c.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, fill=True, stroke=False)

    rules = ("এই কার্ডটি প্রতিষ্ঠানের সম্পত্তি। "
             "হারিয়ে গেলে অফিসে অবহিত করতে হবে। "
             "কার্ডটি অন্যত্র ব্যবহার করা দণ্ডনীয় অপরাধ।")

    draw_bn_multiline(c,
                      rules,
                      x=20,
                      y=CARD_HEIGHT - 40,
                      width=CARD_WIDTH - 40,
                      font_size=7,
                      align="center")

    draw_bn_text(c,
                 institution.get("name", ""),
                 x=20,
                 y=40,
                 width=CARD_WIDTH - 40,
                 font_size=8,
                 bold=True,
                 align="center")

    draw_bn_text(c,
                 f"যোগাযোগ: {institution.get('phone', '')}",
                 x=20,
                 y=28,
                 width=CARD_WIDTH - 40,
                 font_size=7,
                 align="center")


# --------------------------------------------------
# STUDENT CARD FRONT
# --------------------------------------------------


def draw_student_front(c, student, institution, class_name):
    # Header
    c.setFillColor(colors.HexColor("#0f7c3e"))
    c.rect(0, CARD_HEIGHT - 32, CARD_WIDTH, 32, fill=True, stroke=False)

    draw_bn_text(c,
                 institution.get("name", ""),
                 x=10,
                 y=CARD_HEIGHT - 22,
                 width=CARD_WIDTH - 20,
                 font_size=9,
                 bold=True,
                 align="center")

    # Photo placeholder
    c.setFillColor(colors.HexColor("#e5e7eb"))
    c.circle(CARD_WIDTH / 2, CARD_HEIGHT - 55, 22, fill=True, stroke=False)

    # Student Name
    draw_bn_text(c,
                 student.get("name", ""),
                 x=20,
                 y=CARD_HEIGHT - 90,
                 width=CARD_WIDTH - 40,
                 font_size=9,
                 bold=True,
                 align="center")

    y = CARD_HEIGHT - 105

    draw_bn_text(c, f"পিতা: {student.get('father_name', '')}", 20, y,
                 CARD_WIDTH - 40, 7)
    y -= 12
    draw_bn_text(c, f"শ্রেণী: {class_name}", 20, y, CARD_WIDTH - 40, 7)
    y -= 12
    draw_bn_text(c, f"রোল: {student.get('roll_number', '')}", 20, y,
                 CARD_WIDTH - 40, 7)
    y -= 12
    draw_bn_text(c, f"মোবাইল: {student.get('phone', '')}", 20, y,
                 CARD_WIDTH - 40, 7)

    # Footer
    c.setFillColor(colors.HexColor("#7c0f0f"))
    c.rect(0, 0, CARD_WIDTH, 18, fill=True, stroke=False)

    draw_bn_text(c,
                 "STUDENT CARD",
                 x=0,
                 y=5,
                 width=CARD_WIDTH,
                 font_size=8,
                 bold=True,
                 align="center")


# --------------------------------------------------
# STAFF CARD FRONT
# --------------------------------------------------


def draw_staff_front(c, staff, institution):
    c.setFillColor(colors.HexColor("#1f2937"))
    c.rect(0, CARD_HEIGHT - 32, CARD_WIDTH, 32, fill=True, stroke=False)

    draw_bn_text(c,
                 institution.get("name", ""),
                 x=10,
                 y=CARD_HEIGHT - 22,
                 width=CARD_WIDTH - 20,
                 font_size=9,
                 bold=True,
                 align="center")

    c.setFillColor(colors.HexColor("#e5e7eb"))
    c.rect(12, CARD_HEIGHT - 75, 40, 40, fill=True, stroke=False)

    x = 60
    y = CARD_HEIGHT - 50

    draw_bn_text(c, staff.get("name", ""), x, y, 140, 8, True)
    y -= 12
    draw_bn_text(c, f"পদবি: {staff.get('designation', '')}", x, y, 140, 7)
    y -= 12
    draw_bn_text(c, f"বিভাগ: {staff.get('department', '')}", x, y, 140, 7)
    y -= 12
    draw_bn_text(c, f"আইডি: {staff.get('employee_id', '')}", x, y, 140, 7)

    c.setFillColor(colors.HexColor("#111827"))
    c.rect(0, 0, CARD_WIDTH, 18, fill=True, stroke=False)

    draw_bn_text(c, "STAFF CARD", 0, 5, CARD_WIDTH, 8, True, "center")


# --------------------------------------------------
# PUBLIC FUNCTIONS (CALLED FROM ROUTES)
# --------------------------------------------------


def generate_student_id_card_pdf(student, institution, class_name):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
    register_bengali_fonts()

    draw_student_front(c, student, institution, class_name)
    c.showPage()

    draw_card_back(c, institution)
    c.showPage()

    c.save()
    buffer.seek(0)
    return buffer


def generate_staff_id_card_pdf(staff, institution):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
    register_bengali_fonts()

    draw_staff_front(c, staff, institution)
    c.showPage()

    draw_card_back(c, institution)
    c.showPage()

    c.save()
    buffer.seek(0)
    return buffer
