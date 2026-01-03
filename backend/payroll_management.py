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
    """Generate payslip PDF with school branding"""
    
    branding = await get_school_branding_for_reports(db, tenant_id)
    currency = await get_currency_symbol(db, tenant_id)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                            topMargin=30*mm, bottomMargin=20*mm,
                            leftMargin=15*mm, rightMargin=15*mm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title style
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=16,
        alignment=1,
        spaceAfter=12
    )
    
    # Header
    elements.append(Paragraph(branding["school_name"], title_style))
    if branding["address"]:
        elements.append(Paragraph(branding["address"], styles['Normal']))
    elements.append(Spacer(1, 10*mm))
    
    # Payslip title
    month_name = calendar.month_name[payroll.get("month", 1)]
    year = payroll.get("year", datetime.now().year)
    elements.append(Paragraph(f"PAYSLIP - {month_name} {year}", title_style))
    elements.append(Spacer(1, 5*mm))
    
    # Employee details table
    emp_data = [
        ["Employee ID:", employee.get("employee_id", "N/A"), "Department:", employee.get("department", "N/A")],
        ["Name:", employee.get("name", "N/A"), "Designation:", employee.get("designation", "N/A")],
        ["Bank:", employee.get("bank_name", "N/A"), "Account:", employee.get("bank_account", "N/A")]
    ]
    
    emp_table = Table(emp_data, colWidths=[80, 120, 80, 120])
    emp_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
    ]))
    elements.append(emp_table)
    elements.append(Spacer(1, 5*mm))
    
    # Earnings and Deductions
    earnings = payroll_item.get("earnings", {})
    deductions = payroll_item.get("deductions", {})
    
    # Create two-column layout
    earnings_data = [["EARNINGS", "Amount"]]
    for key, value in earnings.items():
        if value > 0:
            label = key.replace("_", " ").title()
            earnings_data.append([label, f"{currency}{value:,.2f}"])
    
    # Add bonus if any
    bonus = payroll_item.get("bonus_amount", 0)
    if bonus > 0:
        earnings_data.append([f"Bonus ({payroll_item.get('bonus_type', 'Other')})", f"{currency}{bonus:,.2f}"])
    
    earnings_data.append(["Gross Salary", f"{currency}{payroll_item.get('gross_salary', 0):,.2f}"])
    
    deductions_data = [["DEDUCTIONS", "Amount"]]
    for key, value in deductions.items():
        if value > 0:
            label = key.replace("_", " ").title()
            deductions_data.append([label, f"{currency}{value:,.2f}"])
    
    # Add extra deductions if any
    extra_ded = payroll_item.get("extra_deduction", 0)
    if extra_ded > 0:
        deductions_data.append([payroll_item.get("extra_deduction_reason", "Other Deduction"), f"{currency}{extra_ded:,.2f}"])
    
    deductions_data.append(["Total Deductions", f"{currency}{payroll_item.get('total_deductions', 0):,.2f}"])
    
    # Build tables
    earn_table = Table(earnings_data, colWidths=[150, 80])
    earn_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e0e7ff')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    ded_table = Table(deductions_data, colWidths=[150, 80])
    ded_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dc2626')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fee2e2')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    # Side by side tables
    combined = Table([[earn_table, ded_table]], colWidths=[240, 240])
    elements.append(combined)
    elements.append(Spacer(1, 5*mm))
    
    # Attendance summary
    att = payroll_item.get("attendance_summary", {})
    att_data = [
        ["ATTENDANCE SUMMARY"],
        [f"Working Days: {att.get('total_working_days', 0)} | Present: {att.get('present_days', 0)} | Absent: {att.get('absent_days', 0)} | Late: {att.get('late_days', 0)} | Half-day: {att.get('half_day_count', 0)}"]
    ]
    att_table = Table(att_data, colWidths=[460])
    att_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#374151')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(att_table)
    elements.append(Spacer(1, 5*mm))
    
    # Net salary box
    net_salary = payroll_item.get("net_salary", 0)
    net_data = [
        ["NET PAYABLE SALARY", f"{currency}{net_salary:,.2f}"]
    ]
    net_table = Table(net_data, colWidths=[300, 160])
    net_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#059669')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 14),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    elements.append(net_table)
    elements.append(Spacer(1, 10*mm))
    
    # Payment info
    payment = payroll_item.get("payment", {})
    if payment.get("status") == "paid":
        pay_info = f"Paid via {payment.get('method', 'N/A')} on {payment.get('date', 'N/A')}"
        if payment.get("reference"):
            pay_info += f" (Ref: {payment.get('reference')})"
        elements.append(Paragraph(pay_info, styles['Normal']))
    
    elements.append(Spacer(1, 10*mm))
    
    # Footer
    elements.append(Paragraph("This is a computer-generated payslip. No signature required.", 
                              ParagraphStyle('Footer', fontSize=8, alignment=1, textColor=colors.grey)))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()


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
