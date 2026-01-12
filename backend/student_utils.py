"""
Shared Student Identity Resolution Utilities

This module provides consistent student identity resolution across all student-related APIs.
It handles the mapping between user_id, student_id, admission_no, and username patterns.
"""

import logging
from typing import Optional, Dict, Any
from bson import ObjectId
from cache import cache, CacheTTL

logger = logging.getLogger(__name__)


async def resolve_student_identity(db, current_user) -> Optional[Dict[str, Any]]:
    """
    Resolve student record from current_user using multiple strategies.
    
    Args:
        db: MongoDB database instance
        current_user: User object with id, username, email, tenant_id, role
        
    Returns:
        Student document dict if found, None otherwise
        
    Strategies (in order):
        1. Direct user_id link (primary method)
        2. Username pattern matching (tenant_username format)
        3. Email matching
        4. Admission number extraction from username
    """
    tenant_id = current_user.tenant_id
    user_id = current_user.id
    username = getattr(current_user, 'username', '') or ''
    email = getattr(current_user, 'email', '') or ''
    role = getattr(current_user, 'role', '') or ''
    
    logger.debug(f"Resolving student for: user_id={user_id}, username={username}, role={role}")
    
    # Check cache first
    cache_key = f"student_identity:{tenant_id}:{user_id}"
    cached_student = await cache.get(cache_key)
    if cached_student:
        return cached_student
        
    student = None
    
    # Strategy 1: Find student by user_id field (primary linking method)
    student = await db.students.find_one({
        "tenant_id": tenant_id,
        "user_id": user_id,
        "is_active": {"$ne": False}
    })
    
    if student:
        logger.debug(f"Student found via user_id link: {student.get('name')}")
    
    # Strategy 2: Username pattern matching (e.g., mham5678_mham5678260002)
    if not student and username and "_" in username:
        parts = username.split("_")
        if len(parts) >= 2:
            possible_student_id = parts[-1]
            student = await db.students.find_one({
                "tenant_id": tenant_id,
                "is_active": {"$ne": False},
                "$or": [
                    {"student_id": possible_student_id},
                    {"student_id": possible_student_id.upper()},
                    {"student_id": possible_student_id.lower()},
                    {"id": possible_student_id},
                    {"admission_no": possible_student_id},
                    {"admission_no": possible_student_id.upper()},
                    {"admission_no": possible_student_id.lower()}
                ]
            })
            
            if student:
                logger.debug(f"Student found via username pattern: {student.get('name')}")
    
    # Strategy 3: Try email matching
    if not student and email and email != f"{username}@student.local":
        student = await db.students.find_one({
            "tenant_id": tenant_id,
            "email": email,
            "is_active": {"$ne": False}
        })
        
        if student:
            logger.debug(f"Student found via email: {student.get('name')}")
    
    # Strategy 4: Look up user record and try their email
    if not student:
        user_doc = await db.users.find_one({"id": user_id, "tenant_id": tenant_id})
        if user_doc and user_doc.get("email"):
            student = await db.students.find_one({
                "tenant_id": tenant_id,
                "email": user_doc.get("email"),
                "is_active": {"$ne": False}
            })
            
            if student:
                logger.debug(f"Student found via user email lookup: {student.get('name')}")
    
    if student:
        normalized = _normalize_student(student)
        # Cache for subsequent requests
        await cache.set(cache_key, normalized, CacheTTL.USER_CONTEXT)
        return normalized
        
    logger.warning(f"No student found for user_id={user_id}, username={username}")
    return None


def _normalize_student(student: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Normalize student document to ensure consistent field names.
    
    Returns a student dict with:
        - student_id: The primary identifier (from id, student_id, or admission_no)
        - admission_no: Admission number
        - name: Student name
        - class_id: Normalized class identifier
        - section_id: Section identifier
        - gender: Lowercase gender
        - All other original fields preserved
    """
    if not student:
        return None
    
    # Create normalized copy
    normalized = dict(student)
    
    # Ensure student_id is set
    normalized['student_id'] = (
        student.get('student_id') or 
        student.get('id') or 
        student.get('admission_no') or 
        str(student.get('_id', ''))
    )
    
    # Ensure admission_no is set
    normalized['admission_no'] = (
        student.get('admission_no') or 
        student.get('student_id') or 
        student.get('id')
    )
    
    # Normalize class_id to string
    raw_class_id = student.get('class_id') or student.get('class_standard') or student.get('class_name')
    if raw_class_id:
        if isinstance(raw_class_id, dict):
            normalized['class_id'] = str(
                raw_class_id.get('$oid') or 
                raw_class_id.get('id') or 
                raw_class_id.get('_id') or ''
            )
        elif isinstance(raw_class_id, ObjectId):
            normalized['class_id'] = str(raw_class_id)
        else:
            normalized['class_id'] = str(raw_class_id).strip()
    
    # Normalize gender to lowercase
    gender = student.get('gender', '')
    normalized['gender'] = gender.lower().strip() if gender else ''
    
    # Convert ObjectId to string for JSON serialization
    if '_id' in normalized:
        normalized['_id'] = str(normalized['_id'])
    
    return normalized


async def get_student_class_info(db, tenant_id: str, class_id: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Get class information for a student's class.
    
    Args:
        db: MongoDB database instance
        tenant_id: Tenant identifier
        class_id: Class identifier (string or ObjectId format)
        
    Returns:
        Class document dict if found, None otherwise
    """
    if not class_id:
        return None
    
    # Try ObjectId first
    try:
        class_doc = await db.classes.find_one({
            "_id": ObjectId(class_id),
            "tenant_id": tenant_id
        })
        if class_doc:
            return class_doc
    except Exception:
        pass
    
    # Fallback to string id
    class_doc = await db.classes.find_one({
        "id": class_id,
        "tenant_id": tenant_id
    })
    
    if not class_doc:
        # Try by name
        class_doc = await db.classes.find_one({
            "name": class_id,
            "tenant_id": tenant_id
        })
    
    return class_doc


async def get_student_fee_structure(db, tenant_id: str, student: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get complete fee structure for a student based on their semester/class and fee types.
    
    Madrasha hierarchy: semester_id is primary, falls back to class_id for backward compatibility.
    
    Args:
        db: MongoDB database instance
        tenant_id: Tenant identifier
        student: Normalized student document
        
    Returns:
        Dict with:
            - fee_types: List of applicable fee types with amounts
            - monthly_total: Total monthly fee
            - admission_fee: One-time admission fee
            - total_annual: Total annual fees
    """
    semester_id = student.get('semester_id')
    marhala_id = student.get('marhala_id')
    department_id = student.get('department_id')
    class_id = student.get('class_id')
    
    # Build query for fee types - semester-centric with fallback
    fee_query = {
        "tenant_id": tenant_id,
        "is_active": {"$ne": False}
    }
    
    # If student has semester_id, try semester-specific fees first
    if semester_id:
        fee_query["$or"] = [
            {"semester_id": semester_id},
            {"department_id": department_id, "semester_id": {"$exists": False}},
            {"marhala_id": marhala_id, "department_id": {"$exists": False}, "semester_id": {"$exists": False}},
            {"marhala_id": {"$exists": False}, "department_id": {"$exists": False}, "semester_id": {"$exists": False}}
        ]
    
    # Get all active fee types for this tenant
    fee_types = await db.fee_types.find(fee_query).to_list(100)
    
    result = {
        "fee_types": [],
        "monthly_total": 0,
        "admission_fee": 0,
        "total_annual": 0
    }
    
    for ft in fee_types:
        fee_info = {
            "id": str(ft.get('_id', ft.get('id', ''))),
            "name": ft.get('name', ''),
            "name_bn": ft.get('name_bn', ft.get('name', '')),
            "amount": ft.get('amount', 0),
            "frequency": ft.get('frequency', 'monthly'),
            "category": ft.get('category', 'general')
        }
        result["fee_types"].append(fee_info)
        
        if fee_info['frequency'] == 'monthly':
            result["monthly_total"] += fee_info['amount']
            result["total_annual"] += fee_info['amount'] * 12
        elif fee_info['frequency'] == 'yearly':
            result["total_annual"] += fee_info['amount']
        elif fee_info['frequency'] == 'one-time' and 'admission' in fee_info['name'].lower():
            result["admission_fee"] += fee_info['amount']
    
    return result


async def get_student_payment_summary(db, tenant_id: str, student: Dict[str, Any], year: Optional[int] = None) -> Dict[str, Any]:
    """
    Get payment summary for a student.
    
    Args:
        db: MongoDB database instance
        tenant_id: Tenant identifier
        student: Normalized student document
        year: Year to check (defaults to current year)
        
    Returns:
        Dict with:
            - total_paid: Total amount paid
            - total_due: Total amount due
            - payments: List of payment records
            - paid_months: List of paid months
            - unpaid_months: List of unpaid months
    """
    from datetime import datetime
    
    if year is None:
        year = datetime.now().year
    
    student_id = student.get('student_id') or student.get('admission_no') or student.get('id')
    admission_no = student.get('admission_no') or student.get('student_id')
    
    # Get all payments for this student in the year
    # We query by student_id as primary link, but also consider admission_no for robustness
    payments_cursor = db.monthly_payments.find({
        "tenant_id": tenant_id,
        "year": year,
        "$or": [
            {"student_id": student_id},
            {"student_id": admission_no}
        ]
    })
    payments = await payments_cursor.to_list(100)
    
    # Get fee structure
    fee_structure = await get_student_fee_structure(db, tenant_id, student)
    monthly_total = fee_structure['monthly_total']
    
    # Status can be 'paid' or 'completed' depending on which module recorded it
    total_paid = sum(p.get('amount', 0) for p in payments if p.get('status') in ['paid', 'completed'])
    
    # Month mapping: Admin uses English, Student portal uses Bengali
    month_translation = {
        'January': 'জানুয়ারি', 'February': 'ফেব্রুয়ারি', 'March': 'মার্চ',
        'April': 'এপ্রিল', 'May': 'মে', 'June': 'জুন',
        'July': 'জুলাই', 'August': 'আগস্ট', 'September': 'সেপ্টেম্বর',
        'October': 'অক্টোবর', 'November': 'নভেম্বর', 'December': 'ডিসেম্বর'
    }
    
    # Collected paid months, normalized to Bengali for comparison
    paid_months = []
    for p in payments:
        if p.get('status') in ['paid', 'completed']:
            m = p.get('month', '')
            # Translate if it's English
            normalized_m = month_translation.get(m, m)
            paid_months.append(normalized_m)
    
    # Bengali month names
    all_months = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ]
    
    # Current month index (0-11)
    current_month = datetime.now().month - 1
    
    # Calculate due months (up to current month)
    months_due = all_months[:current_month + 1]
    unpaid_months = [m for m in months_due if m not in paid_months]
    
    total_due = len(unpaid_months) * monthly_total
    
    # Normalize payment records for JSON
    normalized_payments = []
    for p in payments:
        normalized_payments.append({
            "id": str(p.get('_id', '')),
            "month": p.get('month', ''),
            "year": p.get('year', year),
            "amount": p.get('amount', 0),
            "status": p.get('status', 'pending'),
            "payment_date": str(p.get('payment_date', p.get('created_at', ''))),
            "payment_method": p.get('payment_method', ''),
            "receipt_no": p.get('receipt_no', '')
        })
    
    return {
        "total_paid": total_paid,
        "total_due": total_due,
        "monthly_fee": monthly_total,
        "payments": normalized_payments,
        "paid_months": paid_months,
        "unpaid_months": unpaid_months
    }
