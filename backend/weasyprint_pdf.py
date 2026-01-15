"""
WeasyPrint PDF Generator for Bengali/Unicode Support
Generates professional PDFs with proper Bengali text rendering
"""
import io
import base64
import os
from datetime import datetime

# Try to import WeasyPrint - optional for Windows compatibility
try:
    from weasyprint import HTML, CSS
    WEASYPRINT_AVAILABLE = True
except Exception as e:
    WEASYPRINT_AVAILABLE = False
    HTML = None
    CSS = None
    print(f"Warning: WeasyPrint not available - PDF generation will be disabled. Error: {e}")

FONT_PATH = os.path.join(os.path.dirname(__file__), 'fonts')

def get_base64_logo(logo_path):
    """Convert logo to base64 for embedding in HTML"""
    try:
        if logo_path and os.path.exists(logo_path):
            with open(logo_path, 'rb') as f:
                return base64.b64encode(f.read()).decode('utf-8')
    except Exception:
        pass
    return None

def get_common_css(primary_color: str = "#1e3a8a", secondary_color: str = "#059669"):
    """Get common CSS styles for all PDFs"""
    return f"""
        @font-face {{
            font-family: 'NotoSans';
            src: url('file://{FONT_PATH}/NotoSans-Regular.ttf') format('truetype');
            font-weight: normal;
        }}
        @font-face {{
            font-family: 'NotoSansBengali';
            src: url('file://{FONT_PATH}/NotoSansBengali-Regular.ttf') format('truetype');
            font-weight: normal;
        }}
        @font-face {{
            font-family: 'NotoSansBengali';
            src: url('file://{FONT_PATH}/NotoSansBengali-Bold.ttf') format('truetype');
            font-weight: bold;
        }}
        
        * {{
            font-family: 'NotoSans', 'NotoSansBengali', 'Noto Sans Bengali', Arial, sans-serif;
        }}
        
        @page {{
            size: A4;
            margin: 1.5cm 1cm 1.5cm 1cm;
        }}
        
        body {{
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
        }}
        
        .header {{
            background: linear-gradient(135deg, {primary_color}, {secondary_color});
            color: white;
            padding: 15px 20px;
            margin: -1.5cm -1cm 20px -1cm;
            display: flex;
            align-items: center;
        }}
        
        .logo {{
            width: 70px;
            height: 70px;
            margin-right: 15px;
            border-radius: 8px;
            background: white;
            padding: 5px;
        }}
        
        .school-info {{
            flex: 1;
        }}
        
        .school-name {{
            font-size: 20pt;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        
        .school-address {{
            font-size: 10pt;
            opacity: 0.9;
        }}
        
        .report-title {{
            text-align: center;
            color: {primary_color};
            font-size: 16pt;
            font-weight: bold;
            margin: 20px 0 15px 0;
        }}
        
        .filter-info {{
            background: #f0f0f0;
            padding: 8px 12px;
            border-radius: 5px;
            margin-bottom: 15px;
            font-size: 10pt;
        }}
        
        .section-title {{
            color: {secondary_color};
            font-size: 12pt;
            font-weight: bold;
            margin: 20px 0 10px 0;
            border-bottom: 2px solid {secondary_color};
            padding-bottom: 5px;
        }}
        
        .summary-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }}
        
        .summary-table th {{
            background: {primary_color};
            color: white;
            padding: 10px;
            text-align: left;
            font-weight: bold;
        }}
        
        .summary-table td {{
            padding: 10px;
            border: 1px solid #ddd;
        }}
        
        .summary-table tr:nth-child(even) td {{
            background: #f9f9f9;
        }}
        
        .data-table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }}
        
        .data-table th {{
            background: {secondary_color};
            color: white;
            padding: 8px 6px;
            text-align: left;
            font-weight: bold;
        }}
        
        .data-table td {{
            padding: 6px;
            border: 1px solid #ddd;
        }}
        
        .data-table tr:nth-child(even) td {{
            background: #f9f9f9;
        }}
        
        .footer {{
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            text-align: center;
            font-size: 9pt;
            color: #666;
            padding: 10px;
            border-top: 1px solid #ddd;
        }}
        
        .meta-info {{
            text-align: right;
            font-size: 9pt;
            color: #666;
            margin-bottom: 15px;
        }}
        
        .amount {{
            text-align: right;
            font-weight: bold;
        }}
        
        .total-row {{
            background: #e8e8e8 !important;
            font-weight: bold;
        }}
        
        .total-row td {{
            background: #e8e8e8 !important;
        }}
    """


def generate_pdf_report(
    title: str,
    headers: list,
    data_rows: list,
    summary_data: dict = None,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator",
    filter_text: str = "",
    footer_text: str = None,
    details_title: str = "DETAILS"
):
    """
    Universal PDF report generator with Bengali support.
    
    Args:
        title: Report title
        headers: List of column headers
        data_rows: List of rows, each row is a list of cell values
        summary_data: Dict of summary key-value pairs
        school_name: Institution name
        school_address: Address text
        school_contact: Contact info
        logo_path: Path to logo file
        primary_color: Primary theme color
        secondary_color: Secondary theme color
        generated_by: User who generated report
        filter_text: Filter description
        footer_text: Custom footer text
        details_title: Title for details section
    """
    
    logo_base64 = get_base64_logo(logo_path)
    logo_html = ""
    if logo_base64:
        logo_html = f'<img src="data:image/png;base64,{logo_base64}" class="logo" alt="Logo">'
    
    header_html = "".join([f"<th>{h}</th>" for h in headers])
    
    rows_html = ""
    for row in data_rows:
        is_total = any("মোট" in str(cell) or "Total" in str(cell) or "TOTAL" in str(cell) for cell in row)
        row_class = "total-row" if is_total else ""
        cells = "".join([f"<td>{cell}</td>" for cell in row])
        rows_html += f"<tr class='{row_class}'>{cells}</tr>"
    
    summary_html = ""
    if summary_data:
        summary_rows = ""
        items = list(summary_data.items())
        for i in range(0, len(items), 2):
            row = "<tr>"
            row += f"<th>{items[i][0]}</th><td>{items[i][1]}</td>"
            if i + 1 < len(items):
                row += f"<th>{items[i+1][0]}</th><td>{items[i+1][1]}</td>"
            else:
                row += "<th></th><td></td>"
            row += "</tr>"
            summary_rows += row
        
        summary_html = f"""
        <div class="section-title">SUMMARY STATISTICS</div>
        <table class="summary-table">
            {summary_rows}
        </table>
        """
    
    filter_html = ""
    if filter_text:
        filter_html = f"<div class='filter-info'><strong>Filters:</strong> {filter_text}</div>"
    
    footer = footer_text or f"Powered by School ERP System | {school_name}"
    
    if not WEASYPRINT_AVAILABLE:
        raise RuntimeError(
            "WeasyPrint is not available. PDF generation requires WeasyPrint with GTK libraries. "
            "On Windows, please install GTK runtime or use a different PDF generation method."
        )
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            {get_common_css(primary_color, secondary_color)}
        </style>
    </head>
    <body>
        <div class="header">
            {logo_html}
            <div class="school-info">
                <div class="school-name">{school_name}</div>
                <div class="school-address">{school_address}</div>
                <div class="school-address">{school_contact}</div>
            </div>
        </div>
        
        <div class="report-title">{title}</div>
        
        <div class="meta-info">
            Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")} | By: {generated_by}
        </div>
        
        {filter_html}
        
        {summary_html}
        
        <div class="section-title">{details_title}</div>
        <table class="data-table">
            <thead>
                <tr>
                    {header_html}
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        
        <div class="footer">
            {footer}
        </div>
    </body>
    </html>
    """
    
    output = io.BytesIO()
    HTML(string=html_content).write_pdf(output)
    output.seek(0)
    return output


def generate_student_list_pdf(
    students: list,
    class_map: dict,
    section_map: dict,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    report_title: str = "Student List Report",
    generated_by: str = "Administrator",
    filter_text: str = ""
):
    """Generate student list PDF with Bengali support using WeasyPrint"""
    
    total_students = len(students)
    total_male = len([s for s in students if s.get("gender") == "Male"])
    total_female = len([s for s in students if s.get("gender") == "Female"])
    
    summary_data = {
        "Total Students": str(total_students),
        "Male": str(total_male),
        "Female": str(total_female),
        "": ""
    }
    
    headers = ["Admission No", "Name", "Class", "Section", "Guardian", "Phone"]
    data_rows = []
    
    for student in students[:200]:
        data_rows.append([
            student.get("admission_no", ""),
            student.get("name", ""),
            class_map.get(student.get("class_id"), ""),
            section_map.get(student.get("section_id"), ""),
            student.get("guardian_name", ""),
            student.get("guardian_phone", "")
        ])
    
    return generate_pdf_report(
        title=report_title,
        headers=headers,
        data_rows=data_rows,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by,
        filter_text=filter_text,
        details_title="STUDENT DETAILS"
    )


def generate_staff_list_pdf(
    staff_list: list,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator",
    filter_text: str = ""
):
    """Generate staff directory PDF with Bengali support"""
    
    total_staff = len(staff_list)
    departments = set(s.get("department", "") for s in staff_list if s.get("department"))
    
    summary_data = {
        "Total Staff": str(total_staff),
        "Departments": str(len(departments))
    }
    
    headers = ["Employee ID", "Name", "Designation", "Department", "Phone", "Email"]
    data_rows = []
    
    for staff in staff_list[:100]:
        data_rows.append([
            staff.get("employee_id", "")[:12],
            staff.get("name", "")[:25],
            staff.get("designation", "")[:18],
            staff.get("department", "")[:15],
            staff.get("phone", "")[:15],
            staff.get("email", "")[:25]
        ])
    
    return generate_pdf_report(
        title="Staff Directory Report",
        headers=headers,
        data_rows=data_rows,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by,
        filter_text=filter_text,
        details_title="STAFF DETAILS"
    )


def generate_financial_report_pdf(
    report_title: str,
    transactions: list,
    summary_data: dict,
    headers: list,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator",
    filter_text: str = "",
    currency_symbol: str = "৳"
):
    """Generate financial report PDF with Bengali support"""
    
    return generate_pdf_report(
        title=report_title,
        headers=headers,
        data_rows=transactions,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by,
        filter_text=filter_text,
        details_title="TRANSACTION DETAILS"
    )


def generate_attendance_report_pdf(
    report_title: str,
    attendance_data: list,
    summary_data: dict,
    headers: list,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a", 
    secondary_color: str = "#059669",
    generated_by: str = "Administrator",
    filter_text: str = ""
):
    """Generate attendance report PDF with Bengali support"""
    
    return generate_pdf_report(
        title=report_title,
        headers=headers,
        data_rows=attendance_data,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by,
        filter_text=filter_text,
        details_title="ATTENDANCE DETAILS"
    )


def generate_result_report_pdf(
    report_title: str,
    result_data: list,
    summary_data: dict,
    headers: list,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator",
    filter_text: str = ""
):
    """Generate result/exam report PDF with Bengali support"""
    
    return generate_pdf_report(
        title=report_title,
        headers=headers,
        data_rows=result_data,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by,
        filter_text=filter_text,
        details_title="RESULT DETAILS"
    )


def generate_payroll_report_pdf(
    report_title: str,
    payroll_data: list,
    summary_data: dict,
    headers: list,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator",
    filter_text: str = ""
):
    """Generate payroll report PDF with Bengali support"""
    
    return generate_pdf_report(
        title=report_title,
        headers=headers,
        data_rows=payroll_data,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by,
        filter_text=filter_text,
        details_title="PAYROLL DETAILS"
    )


def generate_generic_report_pdf(
    title: str,
    headers: list,
    data_rows: list,
    summary_data = None,
    school_name: str = "ইন্টারনেট মাদ্রাসা",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator"
):
    """Generate a generic report PDF with Bengali support - kept for backward compatibility"""
    
    return generate_pdf_report(
        title=title,
        headers=headers,
        data_rows=data_rows,
        summary_data=summary_data,
        school_name=school_name,
        school_address=school_address,
        school_contact=school_contact,
        logo_path=logo_path,
        primary_color=primary_color,
        secondary_color=secondary_color,
        generated_by=generated_by
    )
