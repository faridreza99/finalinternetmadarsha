"""
WeasyPrint PDF Generator for Bengali/Unicode Support
Generates professional PDFs with proper Bengali text rendering
"""
import io
import base64
import os
from datetime import datetime
from weasyprint import HTML, CSS

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

def generate_student_list_pdf(
    students: list,
    class_map: dict,
    section_map: dict,
    school_name: str = "School ERP System",
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
    
    logo_base64 = get_base64_logo(logo_path)
    logo_html = ""
    if logo_base64:
        logo_html = f'<img src="data:image/png;base64,{logo_base64}" class="logo" alt="Logo">'
    
    total_students = len(students)
    total_male = len([s for s in students if s.get("gender") == "Male"])
    total_female = len([s for s in students if s.get("gender") == "Female"])
    
    student_rows = ""
    for student in students[:200]:
        student_rows += f"""
        <tr>
            <td>{student.get("admission_no", "")}</td>
            <td>{student.get("name", "")}</td>
            <td>{class_map.get(student.get("class_id"), "")}</td>
            <td>{section_map.get(student.get("section_id"), "")}</td>
            <td>{student.get("guardian_name", "")}</td>
            <td>{student.get("guardian_phone", "")}</td>
        </tr>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
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
                font-family: 'NotoSansBengali', 'Noto Sans Bengali', Arial, sans-serif;
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
        
        <div class="report-title">{report_title}</div>
        
        <div class="meta-info">
            Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")} | By: {generated_by}
        </div>
        
        {"<div class='filter-info'><strong>Filters:</strong> " + filter_text + "</div>" if filter_text else ""}
        
        <div class="section-title">SUMMARY STATISTICS</div>
        <table class="summary-table">
            <tr>
                <th>Total Students</th>
                <td>{total_students}</td>
                <th>Male</th>
                <td>{total_male}</td>
            </tr>
            <tr>
                <th>Female</th>
                <td>{total_female}</td>
                <th></th>
                <td></td>
            </tr>
        </table>
        
        <div class="section-title">STUDENT DETAILS</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Admission No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Section</th>
                    <th>Guardian</th>
                    <th>Phone</th>
                </tr>
            </thead>
            <tbody>
                {student_rows}
            </tbody>
        </table>
        
        <div class="footer">
            Powered by School ERP System | {school_name}
        </div>
    </body>
    </html>
    """
    
    output = io.BytesIO()
    HTML(string=html_content).write_pdf(output)
    output.seek(0)
    return output


def generate_generic_report_pdf(
    title: str,
    headers: list,
    data_rows: list,
    summary_data = None,
    school_name: str = "School ERP System",
    school_address: str = "",
    school_contact: str = "",
    logo_path = None,
    primary_color: str = "#1e3a8a",
    secondary_color: str = "#059669",
    generated_by: str = "Administrator"
):
    """Generate a generic report PDF with Bengali support"""
    
    logo_base64 = get_base64_logo(logo_path)
    logo_html = ""
    if logo_base64:
        logo_html = f'<img src="data:image/png;base64,{logo_base64}" class="logo" alt="Logo">'
    
    header_html = "".join([f"<th>{h}</th>" for h in headers])
    
    rows_html = ""
    for row in data_rows:
        cells = "".join([f"<td>{cell}</td>" for cell in row])
        rows_html += f"<tr>{cells}</tr>"
    
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
        <div class="section-title">SUMMARY</div>
        <table class="summary-table">
            {summary_rows}
        </table>
        """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
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
                font-family: 'NotoSansBengali', 'Noto Sans Bengali', Arial, sans-serif;
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
                width: 25%;
            }}
            
            .summary-table td {{
                padding: 10px;
                border: 1px solid #ddd;
                width: 25%;
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
            
            .meta-info {{
                text-align: right;
                font-size: 9pt;
                color: #666;
                margin-bottom: 15px;
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
        
        {summary_html}
        
        <div class="section-title">DETAILS</div>
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
            Powered by School ERP System | {school_name}
        </div>
    </body>
    </html>
    """
    
    output = io.BytesIO()
    HTML(string=html_content).write_pdf(output)
    output.seek(0)
    return output
