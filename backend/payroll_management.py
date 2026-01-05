"""
Enterprise Payroll Management System
Complete payroll processing with attendance & leave integration

Features:
- Salary Structure Management (earnings/deductions)
- Attendance → Payroll Integration
- Leave Management Integration  
- Bonus & Extra Payments
- Payroll Processing Workflow (Draft → Approved → Paid)
- Payslip Generation (PDF)
- Payment Tracking
- Reports & Analytics
- Role-based Access Control
"""

import logging
import uuid
import io
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from weasyprint import HTML
import os
import base64
import calendar

logger = logging.getLogger(__name__)

# ================================
# PYDANTIC MODELS
# ================================

class SalaryComponentCreate(BaseModel):
    """Salary component (earning or deduction)"""
    component_name: str
    component_type: str  # "earning" or "deduction"
    component_category: str  # "basic", "allowance", "bonus", "deduction", "penalty"
    calculation_type: str = "fixed"  # "fixed" or "percentage"
    amount: float = 0.0
    percentage: float = 0.0  # If calculation_type is percentage
    is_taxable: bool = True
    is_active: bool = True
    description: Optional[str] = None

class SalaryStructureCreate(BaseModel):
    """Salary structure for an employee"""
    employee_id: str
    basic_salary: float
    house_rent_allowance: float = 0.0
    food_allowance: float = 0.0
    transport_allowance: float = 0.0
    medical_allowance: float = 0.0
    other_allowance: float = 0.0
    other_allowance_name: Optional[str] = None
    is_active: bool = True

class PayrollSettings(BaseModel):
    """Payroll configuration settings"""
    late_deduction_enabled: bool = False
    late_deduction_amount: float = 0.0
    late_days_threshold: int = 3  # Deduct after this many late days
    absent_deduction_per_day: float = 0.0  # 0 means calculate from daily salary
    half_day_deduction_rate: float = 0.5  # 50% of daily salary
    working_days_per_month: int = 26
    overtime_enabled: bool = False
    overtime_rate_per_hour: float = 0.0

class PayrollProcessRequest(BaseModel):
    """Request to process payroll for a month"""
    year: int
    month: int
    department: Optional[str] = None
    employee_ids: Optional[List[str]] = None  # Specific employees or all

class PayrollItemUpdate(BaseModel):
    """Update individual payroll item"""
    bonus_amount: float = 0.0
    bonus_type: Optional[str] = None
    extra_deduction: float = 0.0
    extra_deduction_reason: Optional[str] = None
    advance_deduction: float = 0.0
    remarks: Optional[str] = None

class PayrollApprovalRequest(BaseModel):
    """Request to approve/reject payroll"""
    action: str  # "approve", "reject"
    remarks: Optional[str] = None

class BonusCreate(BaseModel):
    """Create bonus for employee(s)"""
    bonus_name: str  # "Eid Bonus", "Special Hadiya", "Performance Bonus"
    bonus_type: str = "fixed"  # "fixed" or "percentage"
    amount: float = 0.0
    percentage: float = 0.0  # If percentage type, % of basic salary
    applicable_to: str = "all"  # "all", "department", "individual"
    department: Optional[str] = None
    employee_ids: Optional[List[str]] = None
    effective_month: int
    effective_year: int
    description: Optional[str] = None

class PaymentRecordCreate(BaseModel):
    """Record payment for a payroll item"""
    payment_method: str  # "Bank", "bKash", "Nagad", "Rocket", "Cash"
    payment_reference: Optional[str] = None
    payment_date: str
    remarks: Optional[str] = None

class AdvanceCreate(BaseModel):
    """Create advance/loan for an employee"""
    employee_id: str
    amount: float
    reason: str
    repayment_months: int = 1  # Number of months to deduct
    start_month: int
    start_year: int

# ================================
# PAYROLL ROUTER
# ================================

payroll_router = APIRouter(prefix="/payroll", tags=["Payroll Management"])

# ================================
# HELPER FUNCTIONS
# ================================

async def get_school_branding_for_reports(db, tenant_id: str) -> dict:
    """Get school branding for PDF reports"""
    branding = await db.school_branding.find_one({"tenant_id": tenant_id})
    if branding:
        return {
            "school_name": branding.get("school_name", "School ERP"),
            "address": branding.get("address", ""),
            "phone": branding.get("phone", ""),
            "email": branding.get("email", ""),
            "logo_path": branding.get("logo_url", None),
            "primary_color": branding.get("primary_color", "#1e40af"),
            "secondary_color": branding.get("secondary_color", "#3b82f6")
        }
    
    institution = await db.institution.find_one({"tenant_id": tenant_id})
    if institution:
        return {
            "school_name": institution.get("name", "School ERP"),
            "address": institution.get("address", ""),
            "phone": institution.get("phone", ""),
            "email": institution.get("email", ""),
            "logo_path": institution.get("logo_url", None),
            "primary_color": "#1e40af",
            "secondary_color": "#3b82f6"
        }
    
    return {
        "school_name": "School ERP",
        "address": "",
        "phone": "",
        "email": "",
        "logo_path": None,
        "primary_color": "#1e40af",
        "secondary_color": "#3b82f6"
    }

async def get_currency_symbol(db, tenant_id: str) -> str:
    """Get currency symbol from institution settings - PDF-safe text format"""
    institution = await db.institution.find_one({"tenant_id": tenant_id})
    currency = institution.get("currency", "BDT") if institution else "BDT"
    
    # Use PDF-safe text representations to avoid font encoding issues
    symbols = {
        'BDT': 'Tk ', 'USD': '$', 'EUR': 'EUR ', 'GBP': 'GBP ',
        'INR': 'Rs ', 'JPY': 'JPY ', 'CNY': 'CNY ', 'AUD': 'A$', 'CAD': 'C$'
    }
    return symbols.get(currency, currency + ' ')

async def get_payroll_settings(db, tenant_id: str) -> dict:
    """Get payroll settings for tenant"""
    settings = await db.payroll_settings.find_one({"tenant_id": tenant_id})
    if settings:
        return settings
    
    # Default settings
    return {
        "late_deduction_enabled": False,
        "late_deduction_amount": 0.0,
        "late_days_threshold": 3,
        "absent_deduction_per_day": 0.0,
        "half_day_deduction_rate": 0.5,
        "working_days_per_month": 26,
        "overtime_enabled": False,
        "overtime_rate_per_hour": 0.0
    }

async def calculate_attendance_summary(db, tenant_id: str, employee_id: str, year: int, month: int) -> dict:
    """Calculate attendance summary for an employee for a month"""
    start_date = f"{year}-{month:02d}-01"
    _, last_day = calendar.monthrange(year, month)
    end_date = f"{year}-{month:02d}-{last_day:02d}"
    
    # Query staff attendance records
    attendance_records = await db.staff_attendance.find({
        "tenant_id": tenant_id,
        "staff_id": employee_id,
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(100)
    
    summary = {
        "total_working_days": 0,
        "present_days": 0,
        "absent_days": 0,
        "late_days": 0,
        "half_day_count": 0,
        "early_leave_days": 0,
        "holidays": 0
    }
    
    settings = await get_payroll_settings(db, tenant_id)
    working_days = settings.get("working_days_per_month", 26)
    
    for record in attendance_records:
        status = record.get("status", "").lower()
        if status in ["present", "on_time"]:
            summary["present_days"] += 1
        elif status == "absent":
            summary["absent_days"] += 1
        elif status == "late":
            summary["late_days"] += 1
            summary["present_days"] += 1  # Late is still present
        elif status == "half_day":
            summary["half_day_count"] += 1
        elif status == "holiday":
            summary["holidays"] += 1
    
    summary["total_working_days"] = working_days - summary["holidays"]
    
    # Calculate absent days if not recorded
    recorded_days = summary["present_days"] + summary["absent_days"] + summary["half_day_count"]
    if recorded_days < summary["total_working_days"]:
        summary["absent_days"] += (summary["total_working_days"] - recorded_days)
    
    return summary

async def get_approved_leaves(db, tenant_id: str, employee_id: str, year: int, month: int) -> dict:
    """Get approved leaves for an employee for a month"""
    start_date = f"{year}-{month:02d}-01"
    _, last_day = calendar.monthrange(year, month)
    end_date = f"{year}-{month:02d}-{last_day:02d}"
    
    leaves = await db.leave_requests.find({
        "tenant_id": tenant_id,
        "staff_id": employee_id,
        "status": "approved",
        "$or": [
            {"start_date": {"$gte": start_date, "$lte": end_date}},
            {"end_date": {"$gte": start_date, "$lte": end_date}}
        ]
    }).to_list(100)
    
    paid_leave_days = 0
    unpaid_leave_days = 0
    
    paid_leave_types = ["sick", "casual", "annual", "maternity", "paternity"]
    unpaid_leave_types = ["unpaid", "leave_without_pay", "lwp"]
    
    for leave in leaves:
        leave_type = leave.get("leave_type", "").lower()
        days = leave.get("total_days", 0)
        
        if leave_type in paid_leave_types or "paid" in leave_type:
            paid_leave_days += days
        elif leave_type in unpaid_leave_types or "unpaid" in leave_type:
            unpaid_leave_days += days
        else:
            # Default to paid leave
            paid_leave_days += days
    
    return {
        "paid_leave_days": paid_leave_days,
        "unpaid_leave_days": unpaid_leave_days,
        "total_leave_days": paid_leave_days + unpaid_leave_days
    }

async def calculate_salary(
    db, 
    tenant_id: str, 
    employee: dict, 
    year: int, 
    month: int,
    attendance: dict,
    leaves: dict,
    settings: dict
) -> dict:
    """Calculate salary for an employee"""
    
    # Get salary structure
    salary_structure = await db.salary_structures.find_one({
        "tenant_id": tenant_id,
        "employee_id": employee["id"],
        "is_active": True
    })
    
    if not salary_structure:
        # Use basic salary from employee record
        salary_structure = {
            "basic_salary": employee.get("salary", 0),
            "house_rent_allowance": 0,
            "food_allowance": 0,
            "transport_allowance": 0,
            "medical_allowance": 0,
            "other_allowance": 0
        }
    
    basic_salary = salary_structure.get("basic_salary", 0)
    
    # Calculate gross earnings
    earnings = {
        "basic_salary": basic_salary,
        "house_rent_allowance": salary_structure.get("house_rent_allowance", 0),
        "food_allowance": salary_structure.get("food_allowance", 0),
        "transport_allowance": salary_structure.get("transport_allowance", 0),
        "medical_allowance": salary_structure.get("medical_allowance", 0),
        "other_allowance": salary_structure.get("other_allowance", 0)
    }
    gross_salary = sum(earnings.values())
    
    # Calculate daily rate
    working_days = settings.get("working_days_per_month", 26)
    daily_rate = gross_salary / working_days if working_days > 0 else 0
    
    # Calculate deductions
    deductions = {}
    
    # Absent deduction
    absent_days = attendance.get("absent_days", 0) + leaves.get("unpaid_leave_days", 0)
    if absent_days > 0:
        absent_deduction_per_day = settings.get("absent_deduction_per_day", 0)
        if absent_deduction_per_day == 0:
            absent_deduction_per_day = daily_rate
        deductions["absent_deduction"] = absent_days * absent_deduction_per_day
    
    # Half-day deduction
    half_days = attendance.get("half_day_count", 0)
    if half_days > 0:
        half_day_rate = settings.get("half_day_deduction_rate", 0.5)
        deductions["half_day_deduction"] = half_days * daily_rate * half_day_rate
    
    # Late penalty
    late_days = attendance.get("late_days", 0)
    if settings.get("late_deduction_enabled") and late_days > settings.get("late_days_threshold", 3):
        excess_late = late_days - settings.get("late_days_threshold", 3)
        deductions["late_penalty"] = excess_late * settings.get("late_deduction_amount", 0)
    
    # Get any advance/loan deductions for this month
    advances = await db.employee_advances.find({
        "tenant_id": tenant_id,
        "employee_id": employee["id"],
        "is_active": True,
        "remaining_amount": {"$gt": 0}
    }).to_list(10)
    
    advance_deduction = 0
    for advance in advances:
        monthly_deduction = advance.get("monthly_deduction", 0)
        advance_deduction += monthly_deduction
    
    if advance_deduction > 0:
        deductions["advance_deduction"] = advance_deduction
    
    total_deductions = sum(deductions.values())
    net_salary = gross_salary - total_deductions
    
    return {
        "gross_salary": gross_salary,
        "net_salary": max(0, net_salary),
        "daily_rate": daily_rate,
        "earnings": earnings,
        "deductions": deductions,
        "total_deductions": total_deductions,
        "attendance_summary": attendance,
        "leave_summary": leaves
    }

# ================================
# SALARY STRUCTURE ENDPOINTS
# ================================

@payroll_router.get("/salary-structures")
async def get_salary_structures(
    db=Depends(lambda: None),  # Will be replaced with actual dependency
    current_user=Depends(lambda: None)
):
    """Get all salary structures"""
    pass  # Implemented in server.py integration

@payroll_router.post("/salary-structures")
async def create_salary_structure(data: SalaryStructureCreate):
    """Create salary structure for an employee"""
    pass

@payroll_router.put("/salary-structures/{structure_id}")
async def update_salary_structure(structure_id: str, data: SalaryStructureCreate):
    """Update salary structure"""
    pass

# ================================
# PAYROLL SETTINGS ENDPOINTS
# ================================

@payroll_router.get("/settings")
async def get_settings():
    """Get payroll settings"""
    pass

@payroll_router.put("/settings")
async def update_settings(data: PayrollSettings):
    """Update payroll settings"""
    pass

# ================================
# PAYROLL PROCESSING ENDPOINTS
# ================================

@payroll_router.post("/process")
async def process_payroll(data: PayrollProcessRequest):
    """Process payroll for a month - creates draft payroll"""
    pass

@payroll_router.get("/list")
async def list_payrolls(
    year: int = Query(None),
    month: int = Query(None),
    status: str = Query(None),
    department: str = Query(None)
):
    """List all payrolls with filters"""
    pass

@payroll_router.get("/{payroll_id}")
async def get_payroll(payroll_id: str):
    """Get payroll details"""
    pass

@payroll_router.put("/{payroll_id}/item/{item_id}")
async def update_payroll_item(payroll_id: str, item_id: str, data: PayrollItemUpdate):
    """Update individual payroll item (add bonus, deductions, etc.)"""
    pass

@payroll_router.post("/{payroll_id}/approve")
async def approve_payroll(payroll_id: str, data: PayrollApprovalRequest):
    """Approve or reject payroll"""
    pass

@payroll_router.post("/{payroll_id}/lock")
async def lock_payroll(payroll_id: str):
    """Lock approved payroll - no further edits allowed"""
    pass

# ================================
# BONUS ENDPOINTS
# ================================

@payroll_router.get("/bonuses")
async def list_bonuses():
    """List all bonuses"""
    pass

@payroll_router.post("/bonuses")
async def create_bonus(data: BonusCreate):
    """Create bonus"""
    pass

@payroll_router.delete("/bonuses/{bonus_id}")
async def delete_bonus(bonus_id: str):
    """Delete bonus"""
    pass

# ================================
# ADVANCE/LOAN ENDPOINTS
# ================================

@payroll_router.get("/advances")
async def list_advances(employee_id: str = Query(None)):
    """List advances/loans"""
    pass

@payroll_router.post("/advances")
async def create_advance(data: AdvanceCreate):
    """Create advance/loan"""
    pass

@payroll_router.put("/advances/{advance_id}")
async def update_advance(advance_id: str):
    """Update advance"""
    pass

# ================================
# PAYMENT ENDPOINTS
# ================================

@payroll_router.post("/{payroll_id}/items/{item_id}/payment")
async def record_payment(payroll_id: str, item_id: str, data: PaymentRecordCreate):
    """Record payment for a payroll item"""
    pass

@payroll_router.get("/payments")
async def list_payments(
    year: int = Query(None),
    month: int = Query(None),
    status: str = Query(None)
):
    """List all payments"""
    pass

# ================================
# PAYSLIP ENDPOINTS
# ================================

@payroll_router.get("/{payroll_id}/items/{item_id}/payslip")
async def get_payslip(payroll_id: str, item_id: str):
    """Get payslip data for an employee"""
    pass

@payroll_router.get("/{payroll_id}/items/{item_id}/payslip/pdf")
async def download_payslip_pdf(payroll_id: str, item_id: str):
    """Download payslip as PDF"""
    pass

@payroll_router.get("/my-payslips")
async def get_my_payslips():
    """Get payslips for current logged-in employee"""
    pass

# ================================
# REPORTS ENDPOINTS
# ================================

@payroll_router.get("/reports/monthly")
async def monthly_payroll_report(year: int, month: int):
    """Monthly payroll report"""
    pass

@payroll_router.get("/reports/department")
async def department_payroll_report(year: int, month: int, department: str = Query(None)):
    """Department-wise payroll report"""
    pass

@payroll_router.get("/reports/employee/{employee_id}")
async def employee_salary_report(employee_id: str, year: int):
    """Employee-wise yearly salary report"""
    pass

@payroll_router.get("/reports/deductions")
async def deduction_summary_report(year: int, month: int):
    """Deduction summary report"""
    pass

@payroll_router.get("/reports/bonuses")
async def bonus_report(year: int):
    """Yearly bonus report"""
    pass

@payroll_router.get("/reports/yearly-summary")
async def yearly_payroll_summary(year: int):
    """Yearly payroll summary"""
    pass


# ================================
# PAYSLIP PDF GENERATION
# ================================

async def generate_payslip_pdf(
    db,
    tenant_id: str,
    payroll_item: dict,
    employee: dict,
    payroll: dict
) -> bytes:
    """Generate payslip PDF with school branding using WeasyPrint for Bengali support"""
    
    branding = await get_school_branding_for_reports(db, tenant_id)
    currency_data = await db.currency_settings.find_one({"tenant_id": tenant_id})
    currency = currency_data.get("symbol", "৳") if currency_data else "৳"
    
    FONT_PATH = os.path.join(os.path.dirname(__file__), 'fonts')
    
    # Get logo as base64
    logo_base64 = None
    if branding.get("logo_path") and os.path.exists(branding.get("logo_path")):
        try:
            with open(branding.get("logo_path"), 'rb') as f:
                logo_base64 = base64.b64encode(f.read()).decode('utf-8')
        except:
            pass
    
    logo_html = f'<img src="data:image/png;base64,{logo_base64}" class="logo">' if logo_base64 else ""
    
    month_name = calendar.month_name[payroll.get("month", 1)]
    year = payroll.get("year", datetime.now().year)
    
    # Build earnings rows
    earnings = payroll_item.get("earnings", {})
    earnings_rows = ""
    for key, value in earnings.items():
        if value > 0:
            label = key.replace("_", " ").title()
            earnings_rows += f"<tr><td>{label}</td><td class='amount'>{currency}{value:,.2f}</td></tr>"
    
    bonus = payroll_item.get("bonus_amount", 0)
    if bonus > 0:
        earnings_rows += f"<tr><td>Bonus ({payroll_item.get('bonus_type', 'Other')})</td><td class='amount'>{currency}{bonus:,.2f}</td></tr>"
    
    gross_salary = payroll_item.get("gross_salary", 0)
    earnings_rows += f"<tr class='total-row'><td><strong>Gross Salary / মোট বেতন</strong></td><td class='amount'><strong>{currency}{gross_salary:,.2f}</strong></td></tr>"
    
    # Build deductions rows
    deductions = payroll_item.get("deductions", {})
    deductions_rows = ""
    for key, value in deductions.items():
        if value > 0:
            label = key.replace("_", " ").title()
            deductions_rows += f"<tr><td>{label}</td><td class='amount'>{currency}{value:,.2f}</td></tr>"
    
    extra_ded = payroll_item.get("extra_deduction", 0)
    if extra_ded > 0:
        deductions_rows += f"<tr><td>{payroll_item.get('extra_deduction_reason', 'Other Deduction')}</td><td class='amount'>{currency}{extra_ded:,.2f}</td></tr>"
    
    total_deductions = payroll_item.get("total_deductions", 0)
    deductions_rows += f"<tr class='total-row'><td><strong>Total Deductions / মোট কর্তন</strong></td><td class='amount'><strong>{currency}{total_deductions:,.2f}</strong></td></tr>"
    
    # Attendance summary
    att = payroll_item.get("attendance_summary", {})
    net_salary = payroll_item.get("net_salary", 0)
    
    # Payment info
    payment = payroll_item.get("payment", {})
    payment_info = ""
    if payment.get("status") == "paid":
        payment_info = f"Paid via {payment.get('method', 'N/A')} on {payment.get('date', 'N/A')}"
        if payment.get("reference"):
            payment_info += f" (Ref: {payment.get('reference')})"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @font-face {{
                font-family: 'NotoSans';
                src: url('file://{FONT_PATH}/NotoSans-Regular.ttf') format('truetype');
            }}
            @font-face {{
                font-family: 'NotoSansBengali';
                src: url('file://{FONT_PATH}/NotoSansBengali-Regular.ttf') format('truetype');
            }}
            @font-face {{
                font-family: 'NotoSansBengali';
                src: url('file://{FONT_PATH}/NotoSansBengali-Bold.ttf') format('truetype');
                font-weight: bold;
            }}
            * {{ font-family: 'NotoSans', 'NotoSansBengali', Arial, sans-serif; }}
            @page {{ size: A4; margin: 1.5cm; }}
            body {{ font-size: 10pt; line-height: 1.4; color: #333; }}
            .header {{ background: linear-gradient(135deg, #1e3a8a, #059669); color: white; padding: 15px; margin: -1.5cm -1.5cm 20px -1.5cm; text-align: center; }}
            .logo {{ width: 60px; height: 60px; margin-bottom: 10px; }}
            .school-name {{ font-size: 18pt; font-weight: bold; }}
            .payslip-title {{ font-size: 14pt; font-weight: bold; color: #1e3a8a; text-align: center; margin: 15px 0; }}
            .emp-table {{ width: 100%; margin-bottom: 15px; }}
            .emp-table td {{ padding: 5px 10px; }}
            .emp-table .label {{ font-weight: bold; width: 25%; }}
            .section {{ margin-bottom: 15px; }}
            .section-title {{ background: #1e3a8a; color: white; padding: 8px 10px; font-weight: bold; }}
            .section-title.deductions {{ background: #dc2626; }}
            .data-table {{ width: 100%; border-collapse: collapse; }}
            .data-table td {{ padding: 6px 10px; border-bottom: 1px solid #eee; }}
            .amount {{ text-align: right; }}
            .total-row {{ background: #f0f0f0; }}
            .net-salary {{ background: #059669; color: white; padding: 15px; font-size: 14pt; margin-top: 15px; }}
            .net-salary td {{ padding: 10px; }}
            .net-label {{ font-weight: bold; }}
            .net-amount {{ text-align: right; font-weight: bold; font-size: 16pt; }}
            .attendance-box {{ background: #374151; color: white; padding: 10px; margin-top: 15px; text-align: center; }}
            .footer {{ text-align: center; font-size: 8pt; color: #666; margin-top: 20px; }}
            .two-col {{ display: table; width: 100%; }}
            .col {{ display: table-cell; width: 50%; vertical-align: top; padding-right: 10px; }}
            .col:last-child {{ padding-right: 0; padding-left: 10px; }}
        </style>
    </head>
    <body>
        <div class="header">
            {logo_html}
            <div class="school-name">{branding["school_name"]}</div>
            <div>{branding.get("address", "")}</div>
        </div>
        
        <div class="payslip-title">PAYSLIP / বেতন স্লিপ - {month_name} {year}</div>
        
        <table class="emp-table">
            <tr><td class="label">Employee ID / কর্মচারী আইডি:</td><td>{employee.get("employee_id", "N/A")}</td><td class="label">Department / বিভাগ:</td><td>{employee.get("department", "N/A")}</td></tr>
            <tr><td class="label">Name / নাম:</td><td>{employee.get("name", "N/A")}</td><td class="label">Designation / পদবী:</td><td>{employee.get("designation", "N/A")}</td></tr>
            <tr><td class="label">Bank / ব্যাংক:</td><td>{employee.get("bank_name", "N/A")}</td><td class="label">Account / হিসাব:</td><td>{employee.get("bank_account", "N/A")}</td></tr>
        </table>
        
        <div class="two-col">
            <div class="col">
                <div class="section">
                    <div class="section-title">EARNINGS / আয়</div>
                    <table class="data-table">
                        {earnings_rows}
                    </table>
                </div>
            </div>
            <div class="col">
                <div class="section">
                    <div class="section-title deductions">DEDUCTIONS / কর্তন</div>
                    <table class="data-table">
                        {deductions_rows}
                    </table>
                </div>
            </div>
        </div>
        
        <div class="attendance-box">
            <strong>ATTENDANCE SUMMARY / উপস্থিতি সারসংক্ষেপ</strong><br>
            Working Days / কর্মদিবস: {att.get('total_working_days', 0)} | Present / উপস্থিত: {att.get('present_days', 0)} | Absent / অনুপস্থিত: {att.get('absent_days', 0)} | Late / দেরি: {att.get('late_days', 0)}
        </div>
        
        <table class="net-salary">
            <tr>
                <td class="net-label">NET PAYABLE SALARY / নীট প্রদেয় বেতন</td>
                <td class="net-amount">{currency}{net_salary:,.2f}</td>
            </tr>
        </table>
        
        {"<p style='margin-top:10px;'>" + payment_info + "</p>" if payment_info else ""}
        
        <div class="footer">
            This is a computer-generated payslip. No signature required.<br>
            এটি একটি কম্পিউটার-জেনারেটেড বেতন স্লিপ। স্বাক্ষরের প্রয়োজন নেই।
        </div>
    </body>
    </html>
    """
    
    output = io.BytesIO()
    HTML(string=html_content).write_pdf(output)
    output.seek(0)
    return output.getvalue()


# ================================
# EXPORT FOR SERVER INTEGRATION
# ================================

__all__ = [
    'payroll_router',
    'SalaryComponentCreate',
    'SalaryStructureCreate',
    'PayrollSettings',
    'PayrollProcessRequest',
    'PayrollItemUpdate',
    'PayrollApprovalRequest',
    'BonusCreate',
    'PaymentRecordCreate',
    'AdvanceCreate',
    'get_school_branding_for_reports',
    'get_currency_symbol',
    'get_payroll_settings',
    'calculate_attendance_summary',
    'get_approved_leaves',
    'calculate_salary',
    'generate_payslip_pdf'
]
