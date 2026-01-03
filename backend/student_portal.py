"""
Student Portal APIs

Endpoints for student-facing features:
- /student/fees - Fee status and payment summary
- /student/payments - Payment history
- /student/contact-links - Contact information
- /student/exams - Available exams
- /student/admit-card/{exam_id} - Admit card generation
"""

import logging
from datetime import datetime
from typing import Optional
from fastapi import Depends, HTTPException
from bson import ObjectId

from student_utils import (
    resolve_student_identity,
    get_student_fee_structure,
    get_student_payment_summary,
    get_student_class_info
)

logger = logging.getLogger(__name__)


def setup_student_portal_routes(app, db, get_current_user):
    """Setup all student portal routes"""
    
    @app.get("/student/fees")
    async def get_student_fees(current_user = Depends(get_current_user)):
        """
        Get comprehensive fee information for current student.
        
        Returns:
            - ledger: total_fees, paid_amount, balance
            - payments: list of payment records
            - fee_structure: applicable fee types
            - student_name, admission_no
        """
        try:
            tenant_id = current_user.tenant_id
            
            # Resolve student identity
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                logger.warning(f"Student not found for user: {current_user.username}")
                return {
                    "ledger": {"total_fees": 0, "paid_amount": 0, "balance": 0},
                    "payments": [],
                    "fee_structure": [],
                    "student_name": current_user.username,
                    "admission_no": "",
                    "message": "Student record not found"
                }
            
            student_name = student.get('name') or student.get('student_name') or current_user.username
            admission_no = student.get('admission_no') or student.get('student_id') or ''
            
            # Get fee structure
            fee_structure = await get_student_fee_structure(db, tenant_id, student)
            
            # Get payment summary for current year
            current_year = datetime.now().year
            payment_summary = await get_student_payment_summary(db, tenant_id, student, current_year)
            
            # Calculate ledger
            monthly_fee = fee_structure.get('monthly_total', 0)
            current_month = datetime.now().month
            total_fees = monthly_fee * current_month  # Fees due till current month
            paid_amount = payment_summary.get('total_paid', 0)
            balance = max(0, total_fees - paid_amount)
            
            return {
                "ledger": {
                    "total_fees": total_fees,
                    "paid_amount": paid_amount,
                    "balance": balance
                },
                "payments": payment_summary.get('payments', []),
                "fee_structure": fee_structure.get('fee_types', []),
                "student_name": student_name,
                "admission_no": admission_no,
                "paid_months": payment_summary.get('paid_months', []),
                "unpaid_months": payment_summary.get('unpaid_months', []),
                "monthly_fee": monthly_fee
            }
            
        except Exception as e:
            logger.error(f"Error fetching student fees: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/payments")
    async def get_student_payment_history(
        year: Optional[int] = None,
        current_user = Depends(get_current_user)
    ):
        """
        Get payment history for current student.
        """
        try:
            tenant_id = current_user.tenant_id
            
            # Resolve student identity
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                return {
                    "payments": [],
                    "total_paid": 0,
                    "message": "Student record not found"
                }
            
            if year is None:
                year = datetime.now().year
            
            payment_summary = await get_student_payment_summary(db, tenant_id, student, year)
            
            return {
                "payments": payment_summary.get('payments', []),
                "total_paid": payment_summary.get('total_paid', 0),
                "paid_months": payment_summary.get('paid_months', []),
                "year": year,
                "student_name": student.get('name', ''),
                "admission_no": student.get('admission_no', '')
            }
            
        except Exception as e:
            logger.error(f"Error fetching payment history: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/contact-links")
    async def get_student_contact_links(current_user = Depends(get_current_user)):
        """
        Get configured contact links for student dashboard.
        """
        try:
            tenant_id = current_user.tenant_id
            
            # Get contact links from database
            links = await db.contact_links.find({
                "tenant_id": tenant_id,
                "is_active": {"$ne": False}
            }).to_list(20)
            
            if not links:
                # Return default links from institution settings
                institution = await db.institutions.find_one({"tenant_id": tenant_id})
                social_links = institution.get('social_links', {}) if institution else {}
                
                default_links = []
                if social_links.get('facebook'):
                    default_links.append({
                        "id": "fb",
                        "name": "ফেসবুক",
                        "name_en": "Facebook",
                        "url": social_links['facebook'],
                        "icon": "facebook",
                        "type": "social"
                    })
                if social_links.get('youtube'):
                    default_links.append({
                        "id": "yt",
                        "name": "ইউটিউব",
                        "name_en": "YouTube",
                        "url": social_links['youtube'],
                        "icon": "youtube",
                        "type": "social"
                    })
                if social_links.get('telegram'):
                    default_links.append({
                        "id": "tg",
                        "name": "টেলিগ্রাম",
                        "name_en": "Telegram",
                        "url": social_links['telegram'],
                        "icon": "telegram",
                        "type": "social"
                    })
                
                # Add phone and email from institution
                if institution:
                    if institution.get('phone'):
                        default_links.append({
                            "id": "phone",
                            "name": "ফোন",
                            "name_en": "Phone",
                            "url": f"tel:{institution['phone']}",
                            "value": institution['phone'],
                            "icon": "phone",
                            "type": "contact"
                        })
                    if institution.get('email'):
                        default_links.append({
                            "id": "email",
                            "name": "ইমেইল",
                            "name_en": "Email",
                            "url": f"mailto:{institution['email']}",
                            "value": institution['email'],
                            "icon": "mail",
                            "type": "contact"
                        })
                    if institution.get('address'):
                        default_links.append({
                            "id": "address",
                            "name": "ঠিকানা",
                            "name_en": "Address",
                            "value": institution['address'],
                            "icon": "map-pin",
                            "type": "address"
                        })
                
                return {"links": default_links}
            
            # Normalize links from database
            normalized_links = []
            for link in links:
                normalized_links.append({
                    "id": str(link.get('_id', link.get('id', ''))),
                    "name": link.get('name_bn', link.get('name', '')),
                    "name_en": link.get('name', ''),
                    "url": link.get('url', ''),
                    "value": link.get('value', link.get('url', '')),
                    "icon": link.get('icon', 'link'),
                    "type": link.get('type', 'social')
                })
            
            return {"links": normalized_links}
            
        except Exception as e:
            logger.error(f"Error fetching contact links: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/exams")
    async def get_student_exams(current_user = Depends(get_current_user)):
        """
        Get available exams for current student.
        """
        try:
            tenant_id = current_user.tenant_id
            
            # Resolve student identity
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                return {"exams": [], "message": "Student record not found"}
            
            class_id = student.get('class_id')
            section_id = student.get('section_id')
            
            # Build query for exams
            query = {
                "tenant_id": tenant_id,
                "is_active": {"$ne": False}
            }
            
            # Filter by class if available
            if class_id:
                query["$or"] = [
                    {"class_id": class_id},
                    {"class_ids": class_id},
                    {"classes": {"$elemMatch": {"id": class_id}}}
                ]
            
            exams = await db.exams.find(query).sort("start_date", -1).to_list(50)
            
            normalized_exams = []
            for exam in exams:
                normalized_exams.append({
                    "id": str(exam.get('_id', exam.get('id', ''))),
                    "name": exam.get('name', exam.get('exam_name', '')),
                    "name_bn": exam.get('name_bn', exam.get('name', '')),
                    "start_date": str(exam.get('start_date', '')),
                    "end_date": str(exam.get('end_date', '')),
                    "exam_type": exam.get('exam_type', ''),
                    "status": exam.get('status', 'upcoming'),
                    "admit_card_available": exam.get('admit_card_available', True)
                })
            
            return {
                "exams": normalized_exams,
                "student_name": student.get('name', ''),
                "class_name": student.get('class_name', '')
            }
            
        except Exception as e:
            logger.error(f"Error fetching student exams: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/admit-card/{exam_id}")
    async def get_student_admit_card(
        exam_id: str,
        current_user = Depends(get_current_user)
    ):
        """
        Get admit card data for a specific exam.
        """
        try:
            tenant_id = current_user.tenant_id
            
            # Resolve student identity
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                raise HTTPException(status_code=404, detail="Student record not found")
            
            # Get exam details
            exam = None
            try:
                exam = await db.exams.find_one({
                    "_id": ObjectId(exam_id),
                    "tenant_id": tenant_id
                })
            except Exception:
                exam = await db.exams.find_one({
                    "id": exam_id,
                    "tenant_id": tenant_id
                })
            
            if not exam:
                raise HTTPException(status_code=404, detail="Exam not found")
            
            # Get institution info for branding
            institution = await db.institutions.find_one({"tenant_id": tenant_id})
            
            # Get class info
            class_info = await get_student_class_info(db, tenant_id, student.get('class_id'))
            class_name = class_info.get('name', '') if class_info else student.get('class_name', '')
            
            # Check payment status if required
            payment_required = exam.get('require_fee_clearance', False)
            has_dues = False
            
            if payment_required:
                current_year = datetime.now().year
                payment_summary = await get_student_payment_summary(db, tenant_id, student, current_year)
                has_dues = payment_summary.get('total_due', 0) > 0
            
            if payment_required and has_dues:
                return {
                    "admit_card": None,
                    "access_denied": True,
                    "message": "ফি বাকি আছে। এডমিট কার্ড পেতে প্রথমে ফি পরিশোধ করুন।"
                }
            
            # Build admit card data
            admit_card = {
                "student": {
                    "name": student.get('name', ''),
                    "name_bn": student.get('name_bn', student.get('name', '')),
                    "admission_no": student.get('admission_no', ''),
                    "roll_no": student.get('roll_no', student.get('class_roll', '')),
                    "class_name": class_name,
                    "section": student.get('section_name', student.get('section_id', '')),
                    "photo_url": student.get('photo_url', ''),
                    "father_name": student.get('father_name', ''),
                    "date_of_birth": str(student.get('date_of_birth', ''))
                },
                "exam": {
                    "name": exam.get('name', exam.get('exam_name', '')),
                    "name_bn": exam.get('name_bn', exam.get('name', '')),
                    "start_date": str(exam.get('start_date', '')),
                    "end_date": str(exam.get('end_date', '')),
                    "year": exam.get('year', datetime.now().year),
                    "instructions": exam.get('instructions', [])
                },
                "institution": {
                    "name": institution.get('school_name', '') if institution else '',
                    "address": institution.get('address', '') if institution else '',
                    "phone": institution.get('phone', '') if institution else '',
                    "logo_url": institution.get('logo_url', '') if institution else ''
                }
            }
            
            # Get exam schedule/subjects if available
            exam_subjects = exam.get('subjects', [])
            if not exam_subjects:
                # Try to get from exam_schedule collection
                schedules = await db.exam_schedules.find({
                    "exam_id": exam_id,
                    "tenant_id": tenant_id,
                    "class_id": student.get('class_id')
                }).to_list(20)
                
                for sched in schedules:
                    exam_subjects.append({
                        "subject": sched.get('subject_name', sched.get('subject', '')),
                        "date": str(sched.get('date', '')),
                        "time": sched.get('time', sched.get('start_time', ''))
                    })
            
            admit_card["subjects"] = exam_subjects
            
            return {
                "admit_card": admit_card,
                "access_denied": False
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating admit card: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/profile")
    async def get_student_profile_api(current_user = Depends(get_current_user)):
        """
        Get complete student profile.
        """
        try:
            tenant_id = current_user.tenant_id
            
            # Resolve student identity
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                return {
                    "profile": None,
                    "message": "Student record not found"
                }
            
            # Get class info
            class_info = await get_student_class_info(db, tenant_id, student.get('class_id'))
            
            # Build profile response
            profile = {
                "name": student.get('name', ''),
                "name_bn": student.get('name_bn', student.get('name', '')),
                "admission_no": student.get('admission_no', ''),
                "student_id": student.get('student_id', ''),
                "roll_no": student.get('roll_no', student.get('class_roll', '')),
                "class_name": class_info.get('name', '') if class_info else student.get('class_name', ''),
                "class_name_bn": class_info.get('display_name', class_info.get('name', '')) if class_info else '',
                "section": student.get('section_name', student.get('section_id', '')),
                "gender": student.get('gender', ''),
                "date_of_birth": str(student.get('date_of_birth', '')),
                "photo_url": student.get('photo_url', ''),
                "father_name": student.get('father_name', ''),
                "mother_name": student.get('mother_name', ''),
                "guardian_phone": student.get('guardian_phone', student.get('parent_phone', '')),
                "address": student.get('address', ''),
                "blood_group": student.get('blood_group', ''),
                "email": student.get('email', ''),
                "phone": student.get('phone', ''),
                "admission_date": str(student.get('admission_date', student.get('created_at', ''))),
                "is_active": student.get('is_active', True)
            }
            
            return {"profile": profile}
            
        except Exception as e:
            logger.error(f"Error fetching student profile: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/homework")
    async def get_student_homework(current_user = Depends(get_current_user)):
        """
        Get homework assignments for current student.
        """
        try:
            tenant_id = current_user.tenant_id
            
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                return {
                    "homework": [],
                    "payment_required": False,
                    "message": "Student record not found"
                }
            
            class_id = student.get('class_id')
            section_id = student.get('section_id')
            student_id = str(student.get('_id', student.get('id', '')))
            
            # Check payment status
            current_year = datetime.now().year
            payment_summary = await get_student_payment_summary(db, tenant_id, student, current_year)
            
            settings = await db.settings.find_one({"tenant_id": tenant_id})
            payment_gating = settings.get('payment_gating', {}) if settings else {}
            homework_requires_payment = payment_gating.get('homework', False)
            
            if homework_requires_payment and payment_summary.get('total_due', 0) > 0:
                return {
                    "homework": [],
                    "payment_required": True,
                    "message": "মাসিক ফি পরিশোধ করুন"
                }
            
            # Get homework for this class
            query = {
                "tenant_id": tenant_id,
                "$or": [
                    {"class_id": class_id},
                    {"class_ids": {"$in": [class_id]}}
                ]
            }
            
            homework_list = await db.homework.find(query).sort("due_date", -1).to_list(50)
            
            # Get submissions by this student
            submissions = await db.homework_submissions.find({
                "tenant_id": tenant_id,
                "student_id": student_id
            }).to_list(100)
            
            submitted_ids = {str(s.get('homework_id', '')) for s in submissions}
            
            normalized_homework = []
            for hw in homework_list:
                hw_id = str(hw.get('_id', hw.get('id', '')))
                normalized_homework.append({
                    "id": hw_id,
                    "title": hw.get('title', ''),
                    "description": hw.get('description', ''),
                    "subject": hw.get('subject_name', hw.get('subject', '')),
                    "due_date": str(hw.get('due_date', '')),
                    "assigned_by": hw.get('teacher_name', hw.get('assigned_by', '')),
                    "attachments": hw.get('attachments', []),
                    "submitted": hw_id in submitted_ids
                })
            
            return {
                "homework": normalized_homework,
                "payment_required": False,
                "student_id": student_id
            }
            
        except Exception as e:
            logger.error(f"Error fetching homework: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/student/homework/submit")
    async def submit_student_homework(
        data: dict,
        current_user = Depends(get_current_user)
    ):
        """
        Submit homework for current student.
        """
        try:
            tenant_id = current_user.tenant_id
            
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")
            
            student_id = str(student.get('_id', student.get('id', '')))
            homework_id = data.get('homework_id')
            
            if not homework_id:
                raise HTTPException(status_code=400, detail="homework_id is required")
            
            # Check if already submitted
            existing = await db.homework_submissions.find_one({
                "tenant_id": tenant_id,
                "homework_id": homework_id,
                "student_id": student_id
            })
            
            if existing:
                raise HTTPException(status_code=400, detail="আপনি ইতিমধ্যে এই হোমওয়ার্ক সাবমিট করেছেন")
            
            # Create submission
            submission = {
                "tenant_id": tenant_id,
                "homework_id": homework_id,
                "student_id": student_id,
                "student_name": student.get('name', ''),
                "submission_text": data.get('submission_text', ''),
                "attachments": data.get('attachments', []),
                "submitted_at": datetime.utcnow(),
                "status": "submitted"
            }
            
            await db.homework_submissions.insert_one(submission)
            
            return {"success": True, "message": "হোমওয়ার্ক সাবমিট হয়েছে"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error submitting homework: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/attendance")
    async def get_student_attendance(
        month: Optional[int] = None,
        year: Optional[int] = None,
        current_user = Depends(get_current_user)
    ):
        """
        Get attendance records for current student.
        """
        try:
            tenant_id = current_user.tenant_id
            
            student = await resolve_student_identity(db, current_user)
            
            if not student:
                return {
                    "records": [],
                    "summary": {"total_days": 0, "present_days": 0, "absent_days": 0, "percentage": 0}
                }
            
            student_id = str(student.get('_id', student.get('id', '')))
            
            if month is None:
                month = datetime.now().month
            if year is None:
                year = datetime.now().year
            
            # Build date range
            from datetime import date
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1)
            else:
                end_date = date(year, month + 1, 1)
            
            # Get attendance records
            records = await db.attendance.find({
                "tenant_id": tenant_id,
                "student_id": student_id,
                "date": {"$gte": start_date.isoformat(), "$lt": end_date.isoformat()}
            }).sort("date", 1).to_list(31)
            
            # Calculate summary
            present_count = sum(1 for r in records if r.get('status') == 'present')
            absent_count = sum(1 for r in records if r.get('status') == 'absent')
            late_count = sum(1 for r in records if r.get('status') == 'late')
            total = len(records)
            
            day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
            
            normalized_records = []
            for rec in records:
                rec_date = rec.get('date', '')
                try:
                    d = datetime.fromisoformat(rec_date) if isinstance(rec_date, str) else rec_date
                    day_name = day_names[d.weekday()]
                except:
                    day_name = ''
                
                normalized_records.append({
                    "date": rec_date,
                    "day": day_name,
                    "status": rec.get('status', 'absent'),
                    "remarks": rec.get('remarks', '')
                })
            
            percentage = round((present_count + late_count) / total * 100) if total > 0 else 0
            
            return {
                "records": normalized_records,
                "summary": {
                    "total_days": total,
                    "present_days": present_count,
                    "absent_days": absent_count,
                    "late_days": late_count,
                    "percentage": percentage
                },
                "month": month,
                "year": year
            }
            
        except Exception as e:
            logger.error(f"Error fetching attendance: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    logger.info("Student portal routes registered successfully")
