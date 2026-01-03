"""
Enterprise Attendance Management System
Biometric + RFID + Manual + ERP Integrated

Features:
- Attendance Rule Engine (late/absent/half-day policies)
- Student & Staff Attendance with rule-based status
- Manual Attendance with audit logging
- Parent Notifications (SMS/App)
- Offline Sync with conflict resolution
- AI-Assisted Insights
- Comprehensive Reporting
"""

import asyncio
import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)

# ================================
# MODELS
# ================================

class AttendanceRuleCreate(BaseModel):
    rule_name: str
    rule_type: str = "general"  # general, class_wise, shift_wise
    class_id: Optional[str] = None
    shift: Optional[str] = None
    late_threshold_minutes: int = 15
    absent_threshold_minutes: int = 60
    half_day_checkout_time: str = "13:00"
    school_start_time: str = "09:00"
    school_end_time: str = "15:00"
    excluded_days: List[str] = []
    exam_rule: bool = False
    is_active: bool = True

class ManualAttendanceRecord(BaseModel):
    person_id: str
    person_type: str = "student"
    date: str
    status: str
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    remarks: Optional[str] = None
    reason: Optional[str] = None
    class_id: Optional[str] = None
    section_id: Optional[str] = None

class AttendanceEditRequest(BaseModel):
    new_status: str
    edit_reason: str

class BulkManualAttendance(BaseModel):
    date: str
    class_id: str
    section_id: Optional[str] = None
    records: List[ManualAttendanceRecord]

# ================================
# ATTENDANCE RULE ENGINE
# ================================

async def calculate_attendance_status(
    db,
    tenant_id: str,
    check_in_time: Optional[str],
    check_out_time: Optional[str],
    date_str: str,
    class_id: Optional[str] = None,
    shift: Optional[str] = None
) -> dict:
    """Calculate attendance status based on rules"""
    try:
        filter_criteria = {"tenant_id": tenant_id, "is_active": True}
        rule = None
        
        if class_id:
            filter_criteria["class_id"] = class_id
            rule = await db.attendance_rules.find_one(filter_criteria)
            if not rule:
                del filter_criteria["class_id"]
        
        if shift and not rule:
            filter_criteria["shift"] = shift
            rule = await db.attendance_rules.find_one(filter_criteria)
            if not rule:
                del filter_criteria["shift"]
        
        if not rule:
            filter_criteria["rule_type"] = "general"
            rule = await db.attendance_rules.find_one(filter_criteria)
        
        if not rule:
            rule = {
                "late_threshold_minutes": 15,
                "absent_threshold_minutes": 60,
                "half_day_checkout_time": "13:00",
                "school_start_time": "09:00",
                "school_end_time": "15:00",
                "excluded_days": ["friday"]
            }
        
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        day_name = date_obj.strftime("%A").lower()
        
        if day_name in [d.lower() for d in rule.get("excluded_days", [])]:
            return {"status": "holiday", "reason": f"{day_name.capitalize()} is a holiday"}
        
        if not check_in_time:
            return {"status": "absent", "reason": "No check-in recorded"}
        
        try:
            school_start = datetime.strptime(rule["school_start_time"], "%H:%M")
            check_in_str = check_in_time.split("T")[-1][:5] if "T" in check_in_time else check_in_time[:5]
            check_in = datetime.strptime(check_in_str, "%H:%M")
        except:
            return {"status": "present", "reason": "Time parse issue - default present"}
        
        late_minutes = rule["late_threshold_minutes"]
        absent_minutes = rule["absent_threshold_minutes"]
        
        late_threshold = school_start + timedelta(minutes=late_minutes)
        absent_threshold = school_start + timedelta(minutes=absent_minutes)
        
        if check_in > absent_threshold:
            return {"status": "absent", "reason": f"Checked in after {absent_minutes} minutes"}
        elif check_in > late_threshold:
            return {"status": "late", "reason": f"Checked in after {late_minutes} minutes"}
        
        if check_out_time:
            try:
                half_day_time = datetime.strptime(rule["half_day_checkout_time"], "%H:%M")
                check_out_str = check_out_time.split("T")[-1][:5] if "T" in check_out_time else check_out_time[:5]
                check_out = datetime.strptime(check_out_str, "%H:%M")
                
                if check_out < half_day_time:
                    return {"status": "half_day", "reason": f"Left before {rule['half_day_checkout_time']}"}
            except:
                pass
        
        return {"status": "present", "reason": "On time"}
        
    except Exception as e:
        logger.error(f"Error calculating attendance status: {e}")
        return {"status": "present", "reason": "Default status"}

# ================================
# PARENT NOTIFICATION
# ================================

async def send_attendance_notification(db, tenant_id: str, student_id: str, status: str, date: str):
    """Send SMS/notification to parent about student attendance"""
    try:
        student = await db.students.find_one({"id": student_id, "tenant_id": tenant_id})
        if not student:
            return
        
        parent_phone = student.get("guardian_phone") or student.get("parent_phone")
        student_name = student.get("full_name", student.get("first_name", "Your child"))
        
        if status == "absent":
            message = f"প্রিয় অভিভাবক, আপনার সন্তান {student_name} আজ ({date}) স্কুলে অনুপস্থিত। - School ERP"
        elif status == "late":
            message = f"প্রিয় অভিভাবক, আপনার সন্তান {student_name} আজ ({date}) স্কুলে দেরিতে এসেছে। - School ERP"
        else:
            return
        
        settings = await db.notification_settings.find_one({"tenant_id": tenant_id})
        sms_enabled = settings.get("attendance_sms_enabled", True) if settings else True
        
        if sms_enabled and parent_phone:
            try:
                from twilio.rest import Client
                account_sid = os.getenv("TWILIO_ACCOUNT_SID")
                auth_token = os.getenv("TWILIO_AUTH_TOKEN")
                from_number = os.getenv("TWILIO_PHONE_NUMBER")
                
                if account_sid and auth_token and from_number:
                    client = Client(account_sid, auth_token)
                    client.messages.create(
                        body=message,
                        from_=from_number,
                        to=parent_phone
                    )
                    logger.info(f"Attendance SMS sent to {parent_phone}")
            except Exception as sms_error:
                logger.error(f"Failed to send SMS: {sms_error}")
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "tenant_id": tenant_id,
            "type": "attendance_alert",
            "title": "উপস্থিতি সতর্কতা / Attendance Alert",
            "message": message,
            "recipient_type": "parent",
            "recipient_id": student.get("parent_id"),
            "related_student_id": student_id,
            "status": status,
            "read": False,
            "created_at": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to send attendance notification: {e}")

# ================================
# HELPER FUNCTIONS
# ================================

def sanitize_mongo_data(data):
    """Remove MongoDB _id field and convert to serializable format"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key == "_id":
                continue
            result[key] = sanitize_mongo_data(value)
        return result
    elif isinstance(data, list):
        return [sanitize_mongo_data(item) for item in data]
    return data

# ================================
# ROUTE SETUP FUNCTION
# ================================

def setup_attendance_routes(api_router, db, get_current_user, User):
    """Setup all attendance management routes"""
    
    # ================================
    # ATTENDANCE RULES CRUD
    # ================================
    
    @api_router.get("/attendance-rules")
    async def get_attendance_rules(
        rule_type: Optional[str] = None,
        class_id: Optional[str] = None,
        current_user: User = Depends(get_current_user)
    ):
        """Get all attendance rules for the institution"""
        try:
            filter_criteria = {"tenant_id": current_user.tenant_id}
            if rule_type:
                filter_criteria["rule_type"] = rule_type
            if class_id:
                filter_criteria["class_id"] = class_id
            
            rules = await db.attendance_rules.find(filter_criteria).to_list(100)
            
            if not rules:
                default_rules = [{
                    "id": f"default_rule_{current_user.tenant_id}",
                    "tenant_id": current_user.tenant_id,
                    "rule_name": "Default Attendance Rule / ডিফল্ট উপস্থিতি নিয়ম",
                    "rule_type": "general",
                    "late_threshold_minutes": 15,
                    "absent_threshold_minutes": 60,
                    "half_day_checkout_time": "13:00",
                    "school_start_time": "09:00",
                    "school_end_time": "15:00",
                    "excluded_days": ["friday"],
                    "exam_rule": False,
                    "is_active": True,
                    "created_at": datetime.utcnow().isoformat()
                }]
                return {"rules": default_rules, "total": 1}
            
            return {"rules": [sanitize_mongo_data(r) for r in rules], "total": len(rules)}
        except Exception as e:
            logger.error(f"Failed to fetch attendance rules: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch attendance rules")

    @api_router.post("/attendance-rules")
    async def create_attendance_rule(
        rule_data: AttendanceRuleCreate,
        current_user: User = Depends(get_current_user)
    ):
        """Create a new attendance rule"""
        if current_user.role not in ["super_admin", "admin", "principal"]:
            raise HTTPException(status_code=403, detail="Not authorized to create attendance rules")
        
        try:
            rule_id = str(uuid.uuid4())
            rule_doc = {
                "id": rule_id,
                "tenant_id": current_user.tenant_id,
                **rule_data.dict(),
                "created_at": datetime.utcnow().isoformat(),
                "created_by": current_user.id
            }
            
            await db.attendance_rules.insert_one(rule_doc)
            
            await db.audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": current_user.tenant_id,
                "action": "CREATE_ATTENDANCE_RULE",
                "entity_type": "attendance_rule",
                "entity_id": rule_id,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "details": rule_data.dict(),
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return {"message": "Attendance rule created successfully", "rule_id": rule_id}
        except Exception as e:
            logger.error(f"Failed to create attendance rule: {e}")
            raise HTTPException(status_code=500, detail="Failed to create attendance rule")

    @api_router.put("/attendance-rules/{rule_id}")
    async def update_attendance_rule(
        rule_id: str,
        rule_data: AttendanceRuleCreate,
        current_user: User = Depends(get_current_user)
    ):
        """Update an attendance rule"""
        if current_user.role not in ["super_admin", "admin", "principal"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            update_data = {
                **rule_data.dict(),
                "updated_at": datetime.utcnow().isoformat(),
                "updated_by": current_user.id
            }
            
            result = await db.attendance_rules.update_one(
                {"id": rule_id, "tenant_id": current_user.tenant_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Rule not found")
            
            return {"message": "Attendance rule updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update attendance rule: {e}")
            raise HTTPException(status_code=500, detail="Failed to update attendance rule")

    @api_router.delete("/attendance-rules/{rule_id}")
    async def delete_attendance_rule(
        rule_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Delete an attendance rule"""
        if current_user.role not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            result = await db.attendance_rules.delete_one({
                "id": rule_id,
                "tenant_id": current_user.tenant_id
            })
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Rule not found")
            
            return {"message": "Attendance rule deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete attendance rule: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete attendance rule")

    # ================================
    # STUDENT ATTENDANCE
    # ================================
    
    @api_router.get("/student-attendance")
    async def get_student_attendance(
        date: Optional[str] = None,
        class_id: Optional[str] = None,
        section_id: Optional[str] = None,
        student_id: Optional[str] = None,
        month: Optional[int] = None,
        year: Optional[int] = None,
        current_user: User = Depends(get_current_user)
    ):
        """Get student attendance records with rule-based status"""
        try:
            filter_criteria = {"tenant_id": current_user.tenant_id}
            
            if date:
                filter_criteria["date"] = date
            elif month and year:
                start_date = f"{year}-{month:02d}-01"
                if month == 12:
                    end_date = f"{year + 1}-01-01"
                else:
                    end_date = f"{year}-{month + 1:02d}-01"
                filter_criteria["date"] = {"$gte": start_date, "$lt": end_date}
            
            if class_id:
                filter_criteria["class_id"] = class_id
            if section_id:
                filter_criteria["section_id"] = section_id
            if student_id:
                filter_criteria["person_id"] = student_id
            
            records = await db.student_attendance.find(filter_criteria).sort("date", -1).to_list(1000)
            
            enriched_records = []
            for record in records:
                student = await db.students.find_one({"id": record.get("person_id"), "tenant_id": current_user.tenant_id})
                if student:
                    record["student_name"] = student.get("full_name", student.get("first_name", "Unknown"))
                    record["roll_number"] = student.get("roll_number", "")
                    record["class_name"] = student.get("class_name", "")
                    record["section_name"] = student.get("section", "")
                enriched_records.append(sanitize_mongo_data(record))
            
            return {"records": enriched_records, "total": len(enriched_records)}
        except Exception as e:
            logger.error(f"Failed to fetch student attendance: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch student attendance")

    @api_router.post("/student-attendance/manual")
    async def save_manual_student_attendance(
        attendance_data: List[ManualAttendanceRecord],
        current_user: User = Depends(get_current_user)
    ):
        """Save manual student attendance (teachers/admins only)"""
        if current_user.role not in ["super_admin", "admin", "principal", "teacher"]:
            raise HTTPException(status_code=403, detail="Not authorized to take manual attendance")
        
        try:
            saved_count = 0
            today = datetime.utcnow().strftime("%Y-%m-%d")
            
            for record in attendance_data:
                if record.date < today and current_user.role not in ["super_admin", "admin"]:
                    continue
                
                record_id = str(uuid.uuid4())
                
                student = await db.students.find_one({"id": record.person_id, "tenant_id": current_user.tenant_id})
                
                attendance_doc = {
                    "id": record_id,
                    "tenant_id": current_user.tenant_id,
                    "person_id": record.person_id,
                    "person_type": "student",
                    "person_name": student.get("full_name", "") if student else "",
                    "date": record.date,
                    "status": record.status,
                    "check_in": record.check_in,
                    "check_out": record.check_out,
                    "class_id": record.class_id or (student.get("class_id") if student else None),
                    "section_id": record.section_id or (student.get("section_id") if student else None),
                    "source": "manual",
                    "recorded_by": current_user.id,
                    "recorded_by_name": current_user.full_name or current_user.email,
                    "remarks": record.remarks,
                    "reason": record.reason,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                await db.student_attendance.update_one(
                    {
                        "person_id": record.person_id,
                        "date": record.date,
                        "tenant_id": current_user.tenant_id
                    },
                    {"$set": attendance_doc},
                    upsert=True
                )
                
                await db.attendance_audit_logs.insert_one({
                    "id": str(uuid.uuid4()),
                    "tenant_id": current_user.tenant_id,
                    "action": "MANUAL_ATTENDANCE",
                    "record_id": record_id,
                    "person_id": record.person_id,
                    "date": record.date,
                    "status": record.status,
                    "user_id": current_user.id,
                    "user_email": current_user.email,
                    "user_role": current_user.role,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                saved_count += 1
                
                if record.status in ["absent", "late"]:
                    asyncio.create_task(send_attendance_notification(
                        db, current_user.tenant_id, record.person_id, record.status, record.date
                    ))
            
            return {"message": f"Manual attendance saved for {saved_count} students", "saved_count": saved_count}
        except Exception as e:
            logger.error(f"Failed to save manual attendance: {e}")
            raise HTTPException(status_code=500, detail="Failed to save manual attendance")

    @api_router.post("/student-attendance/bulk")
    async def save_bulk_student_attendance(
        data: BulkManualAttendance,
        current_user: User = Depends(get_current_user)
    ):
        """Save bulk student attendance for a class"""
        if current_user.role not in ["super_admin", "admin", "principal", "teacher"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            saved_count = 0
            
            for record in data.records:
                record.date = data.date
                record.class_id = data.class_id
                if data.section_id:
                    record.section_id = data.section_id
                
                record_id = str(uuid.uuid4())
                student = await db.students.find_one({"id": record.person_id, "tenant_id": current_user.tenant_id})
                
                attendance_doc = {
                    "id": record_id,
                    "tenant_id": current_user.tenant_id,
                    "person_id": record.person_id,
                    "person_type": "student",
                    "person_name": student.get("full_name", "") if student else "",
                    "date": record.date,
                    "status": record.status,
                    "class_id": record.class_id,
                    "section_id": record.section_id,
                    "source": "manual_bulk",
                    "recorded_by": current_user.id,
                    "recorded_by_name": current_user.full_name or current_user.email,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                await db.student_attendance.update_one(
                    {"person_id": record.person_id, "date": record.date, "tenant_id": current_user.tenant_id},
                    {"$set": attendance_doc},
                    upsert=True
                )
                saved_count += 1
            
            return {"message": f"Bulk attendance saved for {saved_count} students", "saved_count": saved_count}
        except Exception as e:
            logger.error(f"Failed to save bulk attendance: {e}")
            raise HTTPException(status_code=500, detail="Failed to save bulk attendance")

    @api_router.put("/student-attendance/{record_id}")
    async def edit_student_attendance(
        record_id: str,
        edit_request: AttendanceEditRequest,
        current_user: User = Depends(get_current_user)
    ):
        """Edit an existing attendance record"""
        try:
            record = await db.student_attendance.find_one({
                "id": record_id,
                "tenant_id": current_user.tenant_id
            })
            
            if not record:
                raise HTTPException(status_code=404, detail="Attendance record not found")
            
            today = datetime.utcnow().strftime("%Y-%m-%d")
            is_past_record = record.get("date", "") < today
            
            if is_past_record and current_user.role not in ["super_admin", "admin"]:
                await db.attendance_edit_requests.insert_one({
                    "id": str(uuid.uuid4()),
                    "tenant_id": current_user.tenant_id,
                    "record_id": record_id,
                    "original_status": record.get("status"),
                    "new_status": edit_request.new_status,
                    "edit_reason": edit_request.edit_reason,
                    "requested_by": current_user.id,
                    "requested_by_name": current_user.full_name or current_user.email,
                    "status": "pending",
                    "created_at": datetime.utcnow().isoformat()
                })
                return {"message": "Edit request submitted for admin approval", "requires_approval": True}
            
            old_status = record.get("status")
            await db.student_attendance.update_one(
                {"id": record_id},
                {"$set": {
                    "status": edit_request.new_status,
                    "last_edited_by": current_user.id,
                    "last_edited_at": datetime.utcnow().isoformat(),
                    "edit_reason": edit_request.edit_reason
                }}
            )
            
            await db.attendance_audit_logs.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": current_user.tenant_id,
                "action": "EDIT_ATTENDANCE",
                "record_id": record_id,
                "old_status": old_status,
                "new_status": edit_request.new_status,
                "edit_reason": edit_request.edit_reason,
                "user_id": current_user.id,
                "user_email": current_user.email,
                "user_role": current_user.role,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return {"message": "Attendance record updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to edit attendance: {e}")
            raise HTTPException(status_code=500, detail="Failed to edit attendance")

    # ================================
    # REPORTS
    # ================================
    
    @api_router.get("/attendance-reports/daily")
    async def get_daily_attendance_report(
        date: Optional[str] = None,
        class_id: Optional[str] = None,
        format: str = "json",
        current_user: User = Depends(get_current_user)
    ):
        """Get daily attendance report"""
        try:
            if not date:
                date = datetime.utcnow().strftime("%Y-%m-%d")
            
            filter_criteria = {"tenant_id": current_user.tenant_id, "date": date}
            if class_id:
                filter_criteria["class_id"] = class_id
            
            student_records = await db.student_attendance.find(filter_criteria).to_list(1000)
            
            staff_filter = {"tenant_id": current_user.tenant_id, "date": date, "type": "staff"}
            staff_records = await db.attendance.find(staff_filter).to_list(500)
            
            student_summary = {
                "total": len(student_records),
                "present": len([r for r in student_records if r.get("status") == "present"]),
                "absent": len([r for r in student_records if r.get("status") == "absent"]),
                "late": len([r for r in student_records if r.get("status") == "late"]),
                "half_day": len([r for r in student_records if r.get("status") == "half_day"])
            }
            student_summary["attendance_rate"] = round(
                (student_summary["present"] / student_summary["total"] * 100) if student_summary["total"] > 0 else 0, 2
            )
            
            staff_summary = {
                "total": len(staff_records),
                "present": len([r for r in staff_records if r.get("status") == "present"]),
                "absent": len([r for r in staff_records if r.get("status") == "absent"]),
                "late": len([r for r in staff_records if r.get("status") == "late"])
            }
            staff_summary["attendance_rate"] = round(
                (staff_summary["present"] / staff_summary["total"] * 100) if staff_summary["total"] > 0 else 0, 2
            )
            
            return {
                "date": date,
                "generated_at": datetime.utcnow().isoformat(),
                "student_summary": student_summary,
                "staff_summary": staff_summary,
                "student_records": [sanitize_mongo_data(r) for r in student_records],
                "staff_records": [sanitize_mongo_data(r) for r in staff_records]
            }
        except Exception as e:
            logger.error(f"Failed to generate daily report: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate report")

    @api_router.get("/attendance-reports/monthly")
    async def get_monthly_attendance_report(
        month: int,
        year: int,
        class_id: Optional[str] = None,
        person_type: str = "student",
        format: str = "json",
        current_user: User = Depends(get_current_user)
    ):
        """Get monthly attendance summary report"""
        try:
            start_date = f"{year}-{month:02d}-01"
            if month == 12:
                end_date = f"{year + 1}-01-01"
            else:
                end_date = f"{year}-{month + 1:02d}-01"
            
            collection = db.student_attendance if person_type == "student" else db.attendance
            
            filter_criteria = {
                "tenant_id": current_user.tenant_id,
                "date": {"$gte": start_date, "$lt": end_date}
            }
            if class_id and person_type == "student":
                filter_criteria["class_id"] = class_id
            
            records = await collection.find(filter_criteria).to_list(5000)
            
            person_stats = {}
            for record in records:
                person_id = record.get("person_id") or record.get("employee_id")
                if person_id not in person_stats:
                    person_stats[person_id] = {
                        "person_id": person_id,
                        "person_name": record.get("person_name", record.get("employee_name", "Unknown")),
                        "total_days": 0,
                        "present": 0,
                        "absent": 0,
                        "late": 0,
                        "half_day": 0
                    }
                
                person_stats[person_id]["total_days"] += 1
                status = record.get("status", "absent")
                if status in person_stats[person_id]:
                    person_stats[person_id][status] += 1
            
            for stats in person_stats.values():
                if stats["total_days"] > 0:
                    stats["attendance_rate"] = round((stats["present"] / stats["total_days"]) * 100, 2)
                else:
                    stats["attendance_rate"] = 0
            
            return {
                "month": month,
                "year": year,
                "person_type": person_type,
                "generated_at": datetime.utcnow().isoformat(),
                "summary": {"total_records": len(records), "unique_persons": len(person_stats)},
                "person_details": list(person_stats.values())
            }
        except Exception as e:
            logger.error(f"Failed to generate monthly report: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate report")

    @api_router.get("/attendance-reports/class-wise")
    async def get_class_wise_attendance_report(
        date: Optional[str] = None,
        month: Optional[int] = None,
        year: Optional[int] = None,
        current_user: User = Depends(get_current_user)
    ):
        """Get class-wise attendance summary"""
        try:
            if date:
                date_filter = {"date": date}
            elif month and year:
                start_date = f"{year}-{month:02d}-01"
                if month == 12:
                    end_date = f"{year + 1}-01-01"
                else:
                    end_date = f"{year}-{month + 1:02d}-01"
                date_filter = {"date": {"$gte": start_date, "$lt": end_date}}
            else:
                date_filter = {"date": datetime.utcnow().strftime("%Y-%m-%d")}
            
            classes = await db.classes.find({"tenant_id": current_user.tenant_id}).to_list(50)
            
            class_stats = []
            for cls in classes:
                class_id = cls.get("id")
                class_name = cls.get("name", cls.get("class_name", "Unknown"))
                
                filter_criteria = {"tenant_id": current_user.tenant_id, "class_id": class_id, **date_filter}
                records = await db.student_attendance.find(filter_criteria).to_list(1000)
                
                if records:
                    present = len([r for r in records if r.get("status") == "present"])
                    total = len(records)
                    
                    class_stats.append({
                        "class_id": class_id,
                        "class_name": class_name,
                        "total_students": total,
                        "present": present,
                        "absent": len([r for r in records if r.get("status") == "absent"]),
                        "late": len([r for r in records if r.get("status") == "late"]),
                        "attendance_rate": round((present / total * 100) if total > 0 else 0, 2)
                    })
            
            return {
                "generated_at": datetime.utcnow().isoformat(),
                "class_summary": class_stats,
                "total_classes": len(class_stats)
            }
        except Exception as e:
            logger.error(f"Failed to generate class-wise report: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate report")

    # ================================
    # OFFLINE SYNC
    # ================================
    
    @api_router.post("/attendance/offline-sync")
    async def sync_offline_attendance(
        records: List[dict],
        device_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Sync offline attendance records from biometric devices"""
        try:
            synced_count = 0
            duplicate_count = 0
            conflict_count = 0
            
            for record in records:
                existing = await db.student_attendance.find_one({
                    "person_id": record.get("person_id"),
                    "date": record.get("date"),
                    "tenant_id": current_user.tenant_id
                })
                
                if existing:
                    existing_checkin = existing.get("check_in", "23:59")
                    new_checkin = record.get("check_in", "23:59")
                    
                    if new_checkin < existing_checkin:
                        await db.student_attendance.update_one(
                            {"id": existing.get("id")},
                            {"$set": {
                                "check_in": new_checkin,
                                "source": "biometric_sync",
                                "device_id": device_id,
                                "synced_at": datetime.utcnow().isoformat()
                            }}
                        )
                        conflict_count += 1
                    else:
                        duplicate_count += 1
                else:
                    status_result = await calculate_attendance_status(
                        db,
                        current_user.tenant_id,
                        record.get("check_in"),
                        record.get("check_out"),
                        record.get("date"),
                        record.get("class_id")
                    )
                    
                    record_doc = {
                        "id": str(uuid.uuid4()),
                        "tenant_id": current_user.tenant_id,
                        **record,
                        "status": status_result["status"],
                        "status_reason": status_result["reason"],
                        "source": "biometric_sync",
                        "device_id": device_id,
                        "synced_at": datetime.utcnow().isoformat()
                    }
                    
                    await db.student_attendance.insert_one(record_doc)
                    synced_count += 1
                    
                    if status_result["status"] in ["absent", "late"]:
                        asyncio.create_task(send_attendance_notification(
                            db, current_user.tenant_id, record.get("person_id"),
                            status_result["status"], record.get("date")
                        ))
            
            await db.sync_logs.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": current_user.tenant_id,
                "device_id": device_id,
                "sync_type": "offline_attendance",
                "records_synced": synced_count,
                "duplicates_skipped": duplicate_count,
                "conflicts_resolved": conflict_count,
                "synced_by": current_user.id,
                "synced_at": datetime.utcnow().isoformat()
            })
            
            return {
                "message": "Offline sync completed",
                "synced": synced_count,
                "duplicates": duplicate_count,
                "conflicts_resolved": conflict_count
            }
        except Exception as e:
            logger.error(f"Failed to sync offline attendance: {e}")
            raise HTTPException(status_code=500, detail="Failed to sync offline attendance")

    # ================================
    # AI INSIGHTS
    # ================================
    
    @api_router.get("/attendance/ai-insights")
    async def get_attendance_ai_insights(
        period: str = "month",
        class_id: Optional[str] = None,
        current_user: User = Depends(get_current_user)
    ):
        """Get AI-assisted attendance insights and analytics"""
        try:
            today = datetime.utcnow()
            if period == "week":
                start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
            elif period == "month":
                start_date = (today - timedelta(days=30)).strftime("%Y-%m-%d")
            else:
                start_date = (today - timedelta(days=90)).strftime("%Y-%m-%d")
            
            end_date = today.strftime("%Y-%m-%d")
            
            filter_criteria = {
                "tenant_id": current_user.tenant_id,
                "date": {"$gte": start_date, "$lte": end_date}
            }
            if class_id:
                filter_criteria["class_id"] = class_id
            
            records = await db.student_attendance.find(filter_criteria).to_list(5000)
            
            person_patterns = {}
            for record in records:
                person_id = record.get("person_id")
                if person_id not in person_patterns:
                    person_patterns[person_id] = {
                        "person_id": person_id,
                        "person_name": record.get("person_name", "Unknown"),
                        "total_days": 0,
                        "absences": 0,
                        "late_arrivals": 0,
                        "absence_streak": 0,
                        "current_streak": 0
                    }
                
                person_patterns[person_id]["total_days"] += 1
                status = record.get("status")
                if status == "absent":
                    person_patterns[person_id]["absences"] += 1
                    person_patterns[person_id]["current_streak"] += 1
                elif status == "late":
                    person_patterns[person_id]["late_arrivals"] += 1
                    person_patterns[person_id]["current_streak"] = 0
                else:
                    person_patterns[person_id]["current_streak"] = 0
                
                person_patterns[person_id]["absence_streak"] = max(
                    person_patterns[person_id]["absence_streak"],
                    person_patterns[person_id]["current_streak"]
                )
            
            at_risk_students = []
            chronic_absentees = []
            
            for stats in person_patterns.values():
                if stats["total_days"] > 0:
                    absence_rate = stats["absences"] / stats["total_days"]
                    late_rate = stats["late_arrivals"] / stats["total_days"]
                    
                    if absence_rate > 0.20:
                        chronic_absentees.append({
                            **stats,
                            "absence_rate": round(absence_rate * 100, 2),
                            "risk_level": "high" if absence_rate > 0.30 else "medium"
                        })
                    
                    if stats["absence_streak"] >= 3 or absence_rate > 0.15:
                        at_risk_students.append({
                            **stats,
                            "absence_rate": round(absence_rate * 100, 2),
                            "late_rate": round(late_rate * 100, 2),
                            "risk_reason": "Consecutive absences" if stats["absence_streak"] >= 3 else "High absence rate"
                        })
            
            insights = {
                "period": period,
                "date_range": {"start": start_date, "end": end_date},
                "overall_stats": {
                    "total_records": len(records),
                    "unique_students": len(person_patterns),
                    "overall_attendance_rate": round(
                        len([r for r in records if r.get("status") == "present"]) / len(records) * 100 if records else 0, 2
                    )
                },
                "alerts": {
                    "at_risk_students": sorted(at_risk_students, key=lambda x: x["absence_rate"], reverse=True)[:10],
                    "chronic_absentees": sorted(chronic_absentees, key=lambda x: x["absence_rate"], reverse=True)[:10]
                },
                "recommendations": []
            }
            
            if chronic_absentees:
                insights["recommendations"].append({
                    "type": "intervention",
                    "message_bn": f"{len(chronic_absentees)} জন শিক্ষার্থীর দীর্ঘমেয়াদী অনুপস্থিতি রয়েছে (>২০%)। অভিভাবক সভা বিবেচনা করুন।",
                    "message": f"{len(chronic_absentees)} students have chronic absenteeism (>20%). Consider parent meetings.",
                    "priority": "high"
                })
            
            if at_risk_students:
                insights["recommendations"].append({
                    "type": "monitoring",
                    "message_bn": f"{len(at_risk_students)} জন শিক্ষার্থী ঝুঁকিতে রয়েছে। নিবিড় পর্যবেক্ষণ প্রয়োজন।",
                    "message": f"{len(at_risk_students)} students are at risk. Enable closer monitoring.",
                    "priority": "medium"
                })
            
            return insights
        except Exception as e:
            logger.error(f"Failed to generate AI insights: {e}")
            raise HTTPException(status_code=500, detail="Failed to generate insights")

    # ================================
    # EDIT REQUESTS & AUDIT
    # ================================
    
    @api_router.get("/attendance/edit-requests")
    async def get_attendance_edit_requests(
        status: str = "pending",
        current_user: User = Depends(get_current_user)
    ):
        """Get pending attendance edit requests (admins only)"""
        if current_user.role not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            requests = await db.attendance_edit_requests.find({
                "tenant_id": current_user.tenant_id,
                "status": status
            }).sort("created_at", -1).to_list(100)
            
            return {"requests": [sanitize_mongo_data(r) for r in requests], "total": len(requests)}
        except Exception as e:
            logger.error(f"Failed to fetch edit requests: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch edit requests")

    @api_router.put("/attendance/edit-requests/{request_id}/approve")
    async def approve_attendance_edit(
        request_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Approve an attendance edit request"""
        if current_user.role not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            edit_request = await db.attendance_edit_requests.find_one({
                "id": request_id,
                "tenant_id": current_user.tenant_id
            })
            
            if not edit_request:
                raise HTTPException(status_code=404, detail="Request not found")
            
            await db.student_attendance.update_one(
                {"id": edit_request["record_id"]},
                {"$set": {
                    "status": edit_request["new_status"],
                    "approved_by": current_user.id,
                    "approved_at": datetime.utcnow().isoformat()
                }}
            )
            
            await db.attendance_edit_requests.update_one(
                {"id": request_id},
                {"$set": {
                    "status": "approved",
                    "approved_by": current_user.id,
                    "approved_at": datetime.utcnow().isoformat()
                }}
            )
            
            return {"message": "Edit request approved"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to approve edit request: {e}")
            raise HTTPException(status_code=500, detail="Failed to approve request")

    @api_router.put("/attendance/edit-requests/{request_id}/reject")
    async def reject_attendance_edit(
        request_id: str,
        reason: str = "",
        current_user: User = Depends(get_current_user)
    ):
        """Reject an attendance edit request"""
        if current_user.role not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            await db.attendance_edit_requests.update_one(
                {"id": request_id, "tenant_id": current_user.tenant_id},
                {"$set": {
                    "status": "rejected",
                    "rejected_by": current_user.id,
                    "rejection_reason": reason,
                    "rejected_at": datetime.utcnow().isoformat()
                }}
            )
            
            return {"message": "Edit request rejected"}
        except Exception as e:
            logger.error(f"Failed to reject edit request: {e}")
            raise HTTPException(status_code=500, detail="Failed to reject request")

    @api_router.get("/attendance/audit-trail")
    async def get_attendance_audit_trail(
        person_id: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        action: Optional[str] = None,
        current_user: User = Depends(get_current_user)
    ):
        """Get attendance audit trail logs"""
        if current_user.role not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            filter_criteria = {"tenant_id": current_user.tenant_id}
            
            if person_id:
                filter_criteria["person_id"] = person_id
            if action:
                filter_criteria["action"] = action
            if date_from:
                filter_criteria["timestamp"] = {"$gte": date_from}
            if date_to:
                if "timestamp" in filter_criteria:
                    filter_criteria["timestamp"]["$lte"] = date_to
                else:
                    filter_criteria["timestamp"] = {"$lte": date_to}
            
            logs = await db.attendance_audit_logs.find(filter_criteria).sort("timestamp", -1).to_list(500)
            
            return {"audit_logs": [sanitize_mongo_data(log) for log in logs], "total": len(logs)}
        except Exception as e:
            logger.error(f"Failed to fetch audit trail: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch audit trail")

    return api_router
