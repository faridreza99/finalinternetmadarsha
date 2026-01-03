"""
Professional Madrasah ID Card Generator - Matching Exact Sample Design
Features:
- Tech circuit pattern background with decorative dots
- Front: Logo, institution names, EIIN, photo with red border, detailed info table, signature, red footer
- Back: Institution seal, message, QR code, contact info
Uses PIL for proper Bengali text rendering.
"""

import logging
import tempfile
import os
import base64
from io import BytesIO
from pathlib import Path
from datetime import datetime
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import qrcode
import requests as http_requests
from PIL import Image, ImageDraw, ImageFont

CARD_WIDTH = 54 * mm
CARD_HEIGHT = 86 * mm

LIGHT_GRAY_BG = colors.HexColor("#F8F8F8")
DARK_RED = colors.HexColor("#C41E3A")
RED_FOOTER = colors.HexColor("#DC143C")
DARK_GREEN = colors.HexColor("#006400")
GRAY_LINE = colors.HexColor("#CCCCCC")


def register_fonts():
    """Register Bengali fonts"""
    font_dir = Path(__file__).parent / "fonts"
    bengali_regular = font_dir / "NotoSansBengali-Regular.ttf"
    bengali_bold = font_dir / "NotoSansBengali-Bold.ttf"
    
    try:
        if bengali_regular.exists() and "NotoSansBengali" not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont("NotoSansBengali", str(bengali_regular)))
        if bengali_bold.exists() and "NotoSansBengali-Bold" not in pdfmetrics.getRegisteredFontNames():
            pdfmetrics.registerFont(TTFont("NotoSansBengali-Bold", str(bengali_bold)))
        return True
    except Exception as e:
        logging.warning(f"Could not register Bengali fonts: {e}")
        return False


def get_pil_font(size, bold=False):
    """Get PIL font for Bengali text rendering"""
    font_dir = Path(__file__).parent / "fonts"
    
    if bold:
        bold_path = font_dir / "NotoSansBengali-Bold.ttf"
        try:
            if bold_path.exists():
                return ImageFont.truetype(str(bold_path), size)
        except:
            pass
    
    regular_path = font_dir / "NotoSansBengali-Regular.ttf"
    try:
        if regular_path.exists():
            return ImageFont.truetype(str(regular_path), size)
    except:
        pass
    
    return ImageFont.load_default()


def draw_bengali_text(c, x, y, text, font_size, color=(0, 0, 0), bold=False, centered=False, width=None):
    """Render Bengali text using PIL then embed as image in PDF"""
    if not text or not text.strip():
        return 0
    
    try:
        dpi_scale = 4
        pil_font_size = int(font_size * dpi_scale)
        font = get_pil_font(pil_font_size, bold)
        
        try:
            bbox = font.getbbox(text)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            x_offset = bbox[0]
            y_offset = bbox[1]
        except:
            text_width = int(len(text) * pil_font_size * 0.6)
            text_height = int(pil_font_size * 1.5)
            x_offset = 0
            y_offset = 0
        
        text_width = max(text_width, pil_font_size)
        text_height = max(text_height, pil_font_size)
        
        padding = 4 * dpi_scale
        img_width = int(text_width + padding * 2)
        img_height = int(text_height + padding * 2)
        
        img = Image.new('RGBA', (img_width, img_height), (255, 255, 255, 0))
        draw = ImageDraw.Draw(img)
        fill_color = color + (255,) if len(color) == 3 else color
        draw.text((padding - x_offset, padding - y_offset), text, font=font, fill=fill_color)
        
        final_width = img_width / dpi_scale
        final_height = img_height / dpi_scale
        
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        img.save(temp_file.name, 'PNG')
        temp_file.close()
        
        if centered and width:
            x = x + (width - final_width) / 2
        
        c.drawImage(temp_file.name, x, y - final_height + font_size * 0.3, 
                    final_width, final_height, mask='auto')
        
        os.unlink(temp_file.name)
        return final_width
        
    except Exception as e:
        logging.error(f"Bengali text render failed: {e}")
        return 0


def draw_circuit_pattern(c, width, height):
    """Draw tech circuit pattern background with decorative dots on edges"""
    c.setFillColor(LIGHT_GRAY_BG)
    c.rect(0, 0, width, height, fill=True, stroke=False)
    
    c.setStrokeColor(colors.HexColor("#E8E8E8"))
    c.setLineWidth(0.2)
    
    for i in range(0, int(width) + 1, int(6*mm)):
        c.line(i, 0, i, height)
    for i in range(0, int(height) + 1, int(6*mm)):
        c.line(0, i, width, i)
    
    c.setFillColor(colors.HexColor("#D0D0D0"))
    dot_size = 1.5 * mm
    
    for i in range(0, int(height), int(12*mm)):
        c.circle(2*mm, i + 6*mm, dot_size, fill=True, stroke=False)
        c.circle(width - 2*mm, i + 6*mm, dot_size, fill=True, stroke=False)
    
    c.circle(width - 8*mm, height - 8*mm, 2*mm, fill=True, stroke=False)
    c.circle(width - 8*mm, 8*mm, 2*mm, fill=True, stroke=False)


def draw_photo_with_red_border(c, x, y, photo_width, photo_height, photo_url=None):
    """Draw rectangular photo with red border"""
    border_width = 1.5*mm
    
    c.setFillColor(DARK_RED)
    c.rect(x - border_width, y - border_width, 
           photo_width + 2*border_width, photo_height + 2*border_width, 
           fill=True, stroke=False)
    
    c.setFillColor(colors.white)
    c.rect(x, y, photo_width, photo_height, fill=True, stroke=False)
    
    if photo_url:
        try:
            temp_file = None
            image_path = None
            
            if photo_url.startswith("data:image"):
                header_data, encoded = photo_url.split(",", 1)
                photo_data = base64.b64decode(encoded)
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                temp_file.write(photo_data)
                temp_file.close()
                image_path = temp_file.name
            elif photo_url.startswith("http"):
                response = http_requests.get(photo_url, timeout=5)
                if response.status_code == 200:
                    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                    temp_file.write(response.content)
                    temp_file.close()
                    image_path = temp_file.name
            elif photo_url.startswith("/uploads"):
                local_path = Path(__file__).parent.parent / photo_url.lstrip("/")
                if not local_path.exists():
                    local_path = Path(__file__).parent / photo_url.lstrip("/")
                if local_path.exists():
                    image_path = str(local_path)
            
            if image_path:
                c.drawImage(image_path, x, y, photo_width, photo_height, 
                           preserveAspectRatio=True, mask='auto')
            
            if temp_file and os.path.exists(temp_file.name):
                os.unlink(temp_file.name)
                
        except Exception as e:
            logging.warning(f"Could not add photo: {e}")
    else:
        c.setFillColor(colors.HexColor("#CCCCCC"))
        c.rect(x + 2, y + 2, photo_width - 4, photo_height - 4, fill=True, stroke=False)


def draw_logo(c, x, y, size, logo_url=None):
    """Draw institution logo"""
    if not logo_url:
        c.setStrokeColor(colors.HexColor("#666666"))
        c.setLineWidth(0.5)
        c.circle(x + size/2, y + size/2, size/2, fill=False, stroke=True)
        return False
    
    try:
        temp_file = None
        if logo_url.startswith("data:image"):
            header_data, encoded = logo_url.split(",", 1)
            logo_data = base64.b64decode(encoded)
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
            temp_file.write(logo_data)
            temp_file.close()
            c.drawImage(temp_file.name, x, y, size, size, preserveAspectRatio=True, mask='auto')
        elif logo_url.startswith("http"):
            response = http_requests.get(logo_url, timeout=5)
            if response.status_code == 200:
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
                temp_file.write(response.content)
                temp_file.close()
                c.drawImage(temp_file.name, x, y, size, size, preserveAspectRatio=True, mask='auto')
        elif logo_url.startswith("/uploads"):
            local_path = Path(__file__).parent.parent / logo_url.lstrip("/")
            if not local_path.exists():
                local_path = Path(__file__).parent / logo_url.lstrip("/")
            if local_path.exists():
                c.drawImage(str(local_path), x, y, size, size, preserveAspectRatio=True, mask='auto')
        
        if temp_file and os.path.exists(temp_file.name):
            os.unlink(temp_file.name)
        return True
    except Exception as e:
        logging.warning(f"Could not add logo: {e}")
        return False


def get_logo_url(institution):
    """Get logo URL from institution data"""
    if not institution:
        return None
    return institution.get("logo") or institution.get("logo_url") or institution.get("institution_logo") or None


def get_institution_name(institution, lang="bn"):
    """Get institution name dynamically from settings"""
    if not institution:
        return ""
    
    if lang == "bn":
        return (institution.get("name_bn") or institution.get("name") or 
                institution.get("institution_name") or institution.get("school_name") or "")
    elif lang == "en":
        name = (institution.get("name_en") or institution.get("english_name") or 
                institution.get("institution_name_en") or institution.get("school_name") or 
                institution.get("name") or "")
        return name.upper() if name else ""
    return institution.get("name", "") or institution.get("school_name", "")


def draw_red_curved_footer(c, width, footer_height):
    """Draw red curved footer at bottom"""
    c.setFillColor(RED_FOOTER)
    p = c.beginPath()
    p.moveTo(0, 0)
    p.lineTo(width, 0)
    p.lineTo(width, footer_height)
    p.curveTo(width * 0.7, footer_height + 3*mm, width * 0.3, footer_height - 1*mm, 0, footer_height + 2*mm)
    p.lineTo(0, 0)
    p.close()
    c.drawPath(p, fill=True, stroke=False)


def generate_front_side(c, student, institution, class_name=""):
    """Generate front side of ID card - CENTERED layout"""
    margin = 3 * mm
    
    draw_circuit_pattern(c, CARD_WIDTH, CARD_HEIGHT)
    
    name_bn = get_institution_name(institution, "bn")
    name_en = get_institution_name(institution, "en")
    eiin = institution.get("eiin_code") or institution.get("eiin") or ""
    established = institution.get("established") or institution.get("established_year") or ""
    address = institution.get("address") or institution.get("full_address") or ""
    
    logo_size = 11 * mm
    logo_url = get_logo_url(institution)
    logo_x = (CARD_WIDTH - logo_size) / 2
    draw_logo(c, logo_x, CARD_HEIGHT - margin - logo_size, logo_size, logo_url)
    
    y_pos = CARD_HEIGHT - margin - logo_size - 3*mm
    
    if name_bn:
        draw_bengali_text(c, 0, y_pos, name_bn, 5.5, color=(0, 100, 0), bold=True, centered=True, width=CARD_WIDTH)
        y_pos -= 4.5*mm
    
    if established:
        draw_bengali_text(c, 0, y_pos, f"স্থাপিত: {established} ইং", 3.5, color=(0, 0, 0), centered=True, width=CARD_WIDTH)
        y_pos -= 3.5*mm
    
    if address:
        addr_short = address[:40] + "।" if len(address) > 40 else address
        draw_bengali_text(c, 0, y_pos, addr_short, 3.5, color=(51, 51, 51), centered=True, width=CARD_WIDTH)
        y_pos -= 5*mm
    
    photo_width = 18 * mm
    photo_height = 22 * mm
    photo_x = (CARD_WIDTH - photo_width) / 2
    photo_y = y_pos - photo_height - 1*mm
    photo_url = student.get("photo") or student.get("photo_url") or student.get("profile_image") or None
    draw_photo_with_red_border(c, photo_x, photo_y, photo_width, photo_height, photo_url)
    
    name = student.get("name") or student.get("full_name") or ""
    position = student.get("designation") or student.get("position") or class_name or ""
    father = student.get("father_name") or student.get("father") or ""
    student_address = student.get("address") or student.get("permanent_address") or ""
    joining_date = student.get("joining_date") or student.get("admission_date") or ""
    dob = student.get("date_of_birth") or student.get("dob") or ""
    blood_group = student.get("blood_group") or ""
    mobile = student.get("phone") or student.get("mobile") or student.get("contact") or ""
    
    name_y = photo_y - 4*mm
    draw_bengali_text(c, 0, name_y, f"নাম: {name}", 7, color=(0, 0, 0), bold=True, centered=True, width=CARD_WIDTH)
    
    is_student = student.get("roll_no") or student.get("admission_no") or student.get("class_id")
    
    position_y = name_y - 5*mm
    if position:
        label = "শ্রেণী" if is_student else "পদের নাম"
        draw_bengali_text(c, 0, position_y, f"{label}: {position}", 4.5, color=(139, 0, 0), bold=True, centered=True, width=CARD_WIDTH)
    
    details_start_y = position_y - 5*mm
    line_height = 3.8*mm
    
    guardian_mobile = student.get("guardian_phone") or student.get("guardian_mobile") or student.get("parent_phone") or ""
    
    if is_student:
        details = [
            ("ঠিকানা", student_address[:25] if student_address else ""),
            ("জন্ম তারিখ", dob),
            ("মোবাইল", guardian_mobile or mobile),
        ]
    else:
        details = [
            ("যোগদানের তারিখ", joining_date),
            ("ঠিকানা", student_address[:25] if student_address else ""),
            ("মোবাইল", mobile),
        ]
    
    current_y = details_start_y
    for label, value in details:
        if value:
            detail_text = f"{label}: {value}"
            draw_bengali_text(c, 0, current_y, detail_text, 4, color=(51, 51, 51), centered=True, width=CARD_WIDTH)
            current_y -= line_height
    
    sig_y = 10*mm
    c.setStrokeColor(GRAY_LINE)
    c.setDash([1, 1])
    c.line(margin + 12*mm, sig_y, CARD_WIDTH - margin - 12*mm, sig_y)
    c.setDash([])
    
    draw_bengali_text(c, 0, sig_y - 4*mm, "প্রধান শিক্ষক", 4.5, color=(0, 0, 0), bold=True, 
                      centered=True, width=CARD_WIDTH)
    
    draw_red_curved_footer(c, CARD_WIDTH, 4*mm)


def generate_back_side(c, student, institution):
    """Generate back side of ID card matching exact sample design"""
    margin = 3 * mm
    
    draw_circuit_pattern(c, CARD_WIDTH, CARD_HEIGHT)
    
    name_bn = get_institution_name(institution, "bn")
    name_en = get_institution_name(institution, "en")
    address = institution.get("address") or institution.get("full_address") or ""
    phone = institution.get("phone") or institution.get("mobile") or institution.get("contact") or ""
    
    y_pos = CARD_HEIGHT - margin - 3*mm
    
    if name_bn:
        draw_bengali_text(c, 0, y_pos, name_bn, 5.5, color=(0, 100, 0), bold=True, 
                         centered=True, width=CARD_WIDTH)
        y_pos -= 5*mm
    
    if name_en and name_en.strip():
        draw_bengali_text(c, 0, y_pos, name_en[:42], 4, color=(0, 100, 0), bold=True, 
                         centered=True, width=CARD_WIDTH)
        y_pos -= 5*mm
    
    seal_size = 16 * mm
    seal_x = (CARD_WIDTH - seal_size) / 2
    seal_y = y_pos - seal_size - 1*mm
    
    logo_url = get_logo_url(institution)
    if logo_url:
        draw_logo(c, seal_x, seal_y, seal_size, logo_url)
    else:
        c.setStrokeColor(DARK_GREEN)
        c.setLineWidth(1)
        c.circle(seal_x + seal_size/2, seal_y + seal_size/2, seal_size/2, fill=False, stroke=True)
    
    y_pos = seal_y - 3*mm
    
    message_lines = [
        "এই কার্ডটি প্রতিষ্ঠানের নিজস্ব পরিচিতি।",
        "ব্যবহারকারী ব্যতিত অন্য কোথাও পাওয়া",
        "গেলে অনুগ্রহ করে বিদ্যালয়ের ঠিকানায়",
        "পৌঁছে দেওয়ার জন্য অনুরোধ করা হলো।"
    ]
    
    for line in message_lines:
        draw_bengali_text(c, 0, y_pos, line, 4, color=(51, 51, 51), centered=True, width=CARD_WIDTH)
        y_pos -= 3.5*mm
    
    y_pos -= 1*mm
    
    qr_size = 18 * mm
    qr_x = (CARD_WIDTH - qr_size) / 2
    qr_y = y_pos - qr_size - 1*mm
    
    student_id = student.get("id") or student.get("student_id") or student.get("admission_no") or ""
    name = student.get("name") or student.get("full_name") or ""
    qr_data = f"ID:{student_id}|Name:{name}|Inst:{name_en}"
    
    try:
        qr = qrcode.QRCode(version=1, box_size=10, border=1)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        qr_temp = tempfile.NamedTemporaryFile(delete=False, suffix=".png")
        qr_img.save(qr_temp.name)
        qr_temp.close()
        
        c.drawImage(qr_temp.name, qr_x, qr_y, qr_size, qr_size)
        os.unlink(qr_temp.name)
    except Exception as e:
        logging.warning(f"QR generation failed: {e}")
        c.setStrokeColor(colors.black)
        c.rect(qr_x, qr_y, qr_size, qr_size, fill=False, stroke=True)
    
    y_pos = qr_y - 4*mm
    
    if address:
        addr_short = address[:40] + "।" if len(address) > 40 else address + "।"
        draw_bengali_text(c, 0, y_pos, addr_short, 3.5, color=(51, 51, 51), 
                         centered=True, width=CARD_WIDTH)
        y_pos -= 4*mm
    
    if phone:
        draw_bengali_text(c, 0, y_pos, f"মোবাইল: {phone}", 4, color=(0, 0, 0), bold=True, 
                         centered=True, width=CARD_WIDTH)


def generate_student_id_card_pdf(student: dict, institution: dict, class_name: str = "") -> bytes:
    """Generate complete student ID card PDF with front and back sides"""
    register_fonts()
    
    buffer = BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
    
    generate_front_side(c, student, institution, class_name)
    c.showPage()
    
    generate_back_side(c, student, institution)
    c.showPage()
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()


def generate_staff_id_card_pdf(staff: dict, institution: dict) -> bytes:
    """Generate complete staff ID card PDF with front and back sides"""
    register_fonts()
    
    buffer = BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
    
    position = staff.get("designation") or staff.get("position") or staff.get("role") or ""
    generate_front_side(c, staff, institution, position)
    c.showPage()
    
    generate_back_side(c, staff, institution)
    c.showPage()
    
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
