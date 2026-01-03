from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, time
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Month mapping: English to Bengali and vice versa
ENGLISH_TO_BENGALI_MONTHS = {
    "January": "জানুয়ারি",
    "February": "ফেব্রুয়ারি",
    "March": "মার্চ",
    "April": "এপ্রিল",
    "May": "মে",
    "June": "জুন",
    "July": "জুলাই",
    "August": "আগস্ট",
    "September": "সেপ্টেম্বর",
    "October": "অক্টোবর",
    "November": "নভেম্বর",
    "December": "ডিসেম্বর"
}

BENGALI_TO_ENGLISH_MONTHS = {v: k for k, v in ENGLISH_TO_BENGALI_MONTHS.items()}

def get_current_month_bengali():
    """Get current month in Bengali"""
    english_month = datetime.utcnow().strftime("%B")
    return ENGLISH_TO_BENGALI_MONTHS.get(english_month, english_month)

class LiveClassCreate(BaseModel):
    class_name: str
    gender: str = Field(..., pattern="^(male|female)$")
    start_time: str
    end_time: str
    teacher_id: str
    teacher_name: str
    month: str
    year: int
    telegram_link: str
    is_active: bool = True

class LiveClassUpdate(BaseModel):
    class_name: Optional[str] = None
    gender: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    teacher_id: Optional[str] = None
    teacher_name: Optional[str] = None
    month: Optional[str] = None
    year: Optional[int] = None
    telegram_link: Optional[str] = None
    is_active: Optional[bool] = None

class FeeTypeCreate(BaseModel):
    name: str
    name_bn: Optional[str] = None
    amount: float
    currency: str = "BDT"
    description: Optional[str] = None
    is_active: bool = True

class FeeTypeUpdate(BaseModel):
    name: Optional[str] = None
    name_bn: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class MonthlyPaymentCreate(BaseModel):
    student_id: str
    month: str
    year: int
    amount: float
    fee_type: str
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

class DonationCreate(BaseModel):
    donor_name: str
    donor_phone: Optional[str] = None
    donor_email: Optional[str] = None
    purpose: str = Field(..., pattern="^(zakat|sadaqah|nafol|donation)$")
    amount: float
    currency: str = "BDT"
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    notes: Optional[str] = None
    student_id: Optional[str] = None

class ContactLinkCreate(BaseModel):
    link_type: str
    url: str
    label: Optional[str] = None
    is_active: bool = True

class HomeworkCreate(BaseModel):
    title: str
    description: str
    class_name: str
    section: Optional[str] = None
    subject: Optional[str] = None
    due_date: str
    assigned_by: str
    attachments: Optional[List[str]] = []

class HomeworkSubmission(BaseModel):
    homework_id: str
    student_id: str
    submission_text: Optional[str] = None
    attachments: Optional[List[str]] = []

def sanitize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [sanitize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == '_id':
                result['id'] = str(v)
            elif isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            else:
                result[k] = sanitize_doc(v)
        return result
    return doc

def setup_live_class_routes(app, db, get_current_user, get_current_tenant):
    
    @app.get("/live-classes")
    async def get_live_classes(
        month: Optional[str] = None,
        year: Optional[int] = None,
        gender: Optional[str] = None,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            query = {"tenant_id": tenant_id, "is_deleted": {"$ne": True}}
            
            if month:
                query["month"] = month
            if year:
                query["year"] = year
            if gender:
                query["gender"] = gender
                
            classes = await db.live_classes.find(query).sort("created_at", -1).to_list(100)
            return {"classes": sanitize_doc(classes)}
        except Exception as e:
            logger.error(f"Error fetching live classes: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/live-classes")
    async def create_live_class(
        data: LiveClassCreate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin", "teacher"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            live_class = {
                "tenant_id": tenant_id,
                "class_name": data.class_name,
                "gender": data.gender,
                "start_time": data.start_time,
                "end_time": data.end_time,
                "teacher_id": data.teacher_id,
                "teacher_name": data.teacher_name,
                "month": data.month,
                "year": data.year,
                "telegram_link": data.telegram_link,
                "is_active": data.is_active,
                "is_deleted": False,
                "created_at": datetime.utcnow(),
                "created_by": current_user.username
            }
            
            result = await db.live_classes.insert_one(live_class)
            live_class["id"] = str(result.inserted_id)
            
            return {"message": "Live class created successfully", "class": sanitize_doc(live_class)}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating live class: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.put("/live-classes/{class_id}")
    async def update_live_class(
        class_id: str,
        data: LiveClassUpdate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin", "teacher"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.utcnow()
            update_data["updated_by"] = current_user.username
            
            result = await db.live_classes.update_one(
                {"_id": ObjectId(class_id), "tenant_id": tenant_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Live class not found")
            
            return {"message": "Live class updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating live class: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/live-classes/{class_id}")
    async def delete_live_class(
        class_id: str,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            result = await db.live_classes.update_one(
                {"_id": ObjectId(class_id), "tenant_id": tenant_id},
                {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Live class not found")
            
            return {"message": "Live class deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting live class: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/live-classes")
    async def get_student_live_classes(
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            student_id = current_user.student_id
            
            if not student_id:
                raise HTTPException(status_code=400, detail="Not a student account")
            
            student = await db.students.find_one({
                "student_id": student_id,
                "tenant_id": tenant_id
            })
            
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")
            
            student_gender = student.get("gender", "").lower()
            student_class = student.get("class_standard") or student.get("class_name")
            
            current_date = datetime.utcnow()
            current_month_english = current_date.strftime("%B")
            current_month_bengali = get_current_month_bengali()
            current_year = current_date.year
            
            has_paid = await check_student_payment_status(db, tenant_id, student_id, current_month_bengali, current_year)
            
            if not has_paid:
                return {
                    "classes": [],
                    "payment_required": True,
                    "message": "Payment required to access live classes"
                }
            
            # Query for both English and Bengali month names for compatibility
            query = {
                "tenant_id": tenant_id,
                "is_deleted": {"$ne": True},
                "is_active": True,
                "month": {"$in": [current_month_english, current_month_bengali]},
                "year": current_year
            }
            
            logger.info(f"Student live classes query: month={current_month_bengali}, year={current_year}, gender={student_gender}")
            
            if student_gender in ["male", "female"]:
                query["gender"] = student_gender
            
            classes = await db.live_classes.find(query).to_list(50)
            
            now = datetime.utcnow()
            current_time = now.strftime("%H:%M")
            
            for cls in classes:
                start = cls.get("start_time", "00:00")
                end = cls.get("end_time", "23:59")
                
                if current_time < start:
                    cls["status"] = "not_started"
                    cls["status_text"] = "Not Started"
                elif current_time >= start and current_time <= end:
                    cls["status"] = "live"
                    cls["status_text"] = "Join Now"
                else:
                    cls["status"] = "ended"
                    cls["status_text"] = "Ended"
            
            return {"classes": sanitize_doc(classes), "payment_required": False}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching student live classes: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/student/join-class/{class_id}")
    async def join_live_class(
        class_id: str,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            student_id = current_user.student_id
            
            if not student_id:
                raise HTTPException(status_code=400, detail="Not a student account")
            
            live_class = await db.live_classes.find_one({
                "_id": ObjectId(class_id),
                "tenant_id": tenant_id,
                "is_deleted": {"$ne": True}
            })
            
            if not live_class:
                raise HTTPException(status_code=404, detail="Live class not found")
            
            now = datetime.utcnow()
            current_time = now.strftime("%H:%M")
            start = live_class.get("start_time", "00:00")
            end = live_class.get("end_time", "23:59")
            
            if current_time >= start and current_time <= end:
                today = now.strftime("%Y-%m-%d")
                
                existing_attendance = await db.live_class_attendance.find_one({
                    "tenant_id": tenant_id,
                    "student_id": student_id,
                    "class_id": class_id,
                    "date": today
                })
                
                if not existing_attendance:
                    attendance_record = {
                        "tenant_id": tenant_id,
                        "student_id": student_id,
                        "class_id": class_id,
                        "class_name": live_class.get("class_name"),
                        "date": today,
                        "join_time": now.isoformat(),
                        "status": "present",
                        "auto_marked": True,
                        "created_at": now
                    }
                    await db.live_class_attendance.insert_one(attendance_record)
                    
                    await db.attendance.update_one(
                        {
                            "tenant_id": tenant_id,
                            "student_id": student_id,
                            "date": today
                        },
                        {
                            "$set": {
                                "status": "present",
                                "marked_via": "live_class",
                                "live_class_id": class_id,
                                "updated_at": now
                            },
                            "$setOnInsert": {
                                "created_at": now
                            }
                        },
                        upsert=True
                    )
            
            return {
                "message": "Joined successfully",
                "telegram_link": live_class.get("telegram_link"),
                "attendance_marked": current_time >= start and current_time <= end
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error joining live class: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/fee-types")
    async def get_fee_types(current_user = Depends(get_current_user)):
        try:
            tenant_id = current_user.tenant_id
            fee_types = await db.fee_types.find({
                "tenant_id": tenant_id,
                "is_deleted": {"$ne": True}
            }).to_list(100)
            return {"fee_types": sanitize_doc(fee_types)}
        except Exception as e:
            logger.error(f"Error fetching fee types: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/fee-types")
    async def create_fee_type(
        data: FeeTypeCreate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            fee_type = {
                "tenant_id": tenant_id,
                "name": data.name,
                "name_bn": data.name_bn,
                "amount": data.amount,
                "currency": data.currency,
                "description": data.description,
                "is_active": data.is_active,
                "is_deleted": False,
                "created_at": datetime.utcnow(),
                "created_by": current_user.username
            }
            
            result = await db.fee_types.insert_one(fee_type)
            fee_type["id"] = str(result.inserted_id)
            
            return {"message": "Fee type created successfully", "fee_type": sanitize_doc(fee_type)}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating fee type: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.put("/fee-types/{fee_type_id}")
    async def update_fee_type(
        fee_type_id: str,
        data: FeeTypeUpdate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            update_data = {k: v for k, v in data.dict().items() if v is not None}
            update_data["updated_at"] = datetime.utcnow()
            
            result = await db.fee_types.update_one(
                {"_id": ObjectId(fee_type_id), "tenant_id": tenant_id},
                {"$set": update_data}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Fee type not found")
            
            return {"message": "Fee type updated successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating fee type: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/fee-types/{fee_type_id}")
    async def delete_fee_type(
        fee_type_id: str,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            result = await db.fee_types.update_one(
                {"_id": ObjectId(fee_type_id), "tenant_id": tenant_id},
                {"$set": {"is_deleted": True, "deleted_at": datetime.utcnow()}}
            )
            
            if result.matched_count == 0:
                raise HTTPException(status_code=404, detail="Fee type not found")
            
            return {"message": "Fee type deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting fee type: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/monthly-payments")
    async def get_monthly_payments(
        student_id: Optional[str] = None,
        month: Optional[str] = None,
        year: Optional[int] = None,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            query = {"tenant_id": tenant_id}
            
            if student_id:
                query["student_id"] = student_id
            if month:
                query["month"] = month
            if year:
                query["year"] = year
                
            payments = await db.monthly_payments.find(query).sort("created_at", -1).to_list(500)
            return {"payments": sanitize_doc(payments)}
        except Exception as e:
            logger.error(f"Error fetching monthly payments: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/monthly-payments")
    async def create_monthly_payment(
        data: MonthlyPaymentCreate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin", "accountant"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            existing = await db.monthly_payments.find_one({
                "tenant_id": tenant_id,
                "student_id": data.student_id,
                "month": data.month,
                "year": data.year
            })
            
            if existing:
                raise HTTPException(status_code=400, detail="Payment already exists for this month")
            
            payment = {
                "tenant_id": tenant_id,
                "student_id": data.student_id,
                "month": data.month,
                "year": data.year,
                "amount": data.amount,
                "fee_type": data.fee_type,
                "payment_method": data.payment_method,
                "transaction_id": data.transaction_id,
                "notes": data.notes,
                "status": "completed",
                "payment_date": datetime.utcnow(),
                "created_at": datetime.utcnow(),
                "created_by": current_user.username
            }
            
            result = await db.monthly_payments.insert_one(payment)
            payment["id"] = str(result.inserted_id)
            
            return {"message": "Payment recorded successfully", "payment": sanitize_doc(payment)}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating monthly payment: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/payment-status")
    async def get_student_payment_status(current_user = Depends(get_current_user)):
        try:
            tenant_id = current_user.tenant_id
            student_id = current_user.student_id
            
            if not student_id:
                raise HTTPException(status_code=400, detail="Not a student account")
            
            payments = await db.monthly_payments.find({
                "tenant_id": tenant_id,
                "student_id": student_id,
                "status": "completed"
            }).sort([("year", -1), ("month", -1)]).to_list(100)
            
            current_date = datetime.utcnow()
            current_month = current_date.strftime("%B")
            current_year = current_date.year
            
            current_month_paid = any(
                p.get("month") == current_month and p.get("year") == current_year
                for p in payments
            )
            
            months_order = ["January", "February", "March", "April", "May", "June",
                          "July", "August", "September", "October", "November", "December"]
            
            payment_history = []
            for payment in payments:
                payment_history.append({
                    "month": payment.get("month"),
                    "year": payment.get("year"),
                    "amount": payment.get("amount"),
                    "payment_date": payment.get("payment_date"),
                    "status": payment.get("status")
                })
            
            return {
                "current_month_paid": current_month_paid,
                "payment_history": sanitize_doc(payment_history),
                "current_month": current_month,
                "current_year": current_year
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching payment status: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/donations")
    async def get_donations(
        purpose: Optional[str] = None,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin", "accountant"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            query = {"tenant_id": tenant_id}
            
            if purpose:
                query["purpose"] = purpose
                
            donations = await db.donations.find(query).sort("created_at", -1).to_list(500)
            return {"donations": sanitize_doc(donations)}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching donations: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/donations")
    async def create_donation(
        data: DonationCreate,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            
            donation = {
                "tenant_id": tenant_id,
                "donor_name": data.donor_name,
                "donor_phone": data.donor_phone,
                "donor_email": data.donor_email,
                "purpose": data.purpose,
                "amount": data.amount,
                "currency": data.currency,
                "payment_method": data.payment_method,
                "transaction_id": data.transaction_id,
                "notes": data.notes,
                "student_id": data.student_id,
                "status": "completed",
                "created_at": datetime.utcnow(),
                "created_by": current_user.username
            }
            
            result = await db.donations.insert_one(donation)
            donation["id"] = str(result.inserted_id)
            
            return {"message": "Donation recorded successfully", "donation": sanitize_doc(donation)}
        except Exception as e:
            logger.error(f"Error creating donation: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/contact-links")
    async def get_contact_links(current_user = Depends(get_current_user)):
        try:
            tenant_id = current_user.tenant_id
            links = await db.contact_links.find({
                "tenant_id": tenant_id,
                "is_active": True
            }).to_list(20)
            return {"links": sanitize_doc(links)}
        except Exception as e:
            logger.error(f"Error fetching contact links: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/contact-links")
    async def create_contact_link(
        data: ContactLinkCreate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            await db.contact_links.update_one(
                {"tenant_id": tenant_id, "link_type": data.link_type},
                {"$set": {
                    "tenant_id": tenant_id,
                    "link_type": data.link_type,
                    "url": data.url,
                    "label": data.label,
                    "is_active": data.is_active,
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            
            return {"message": "Contact link saved successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving contact link: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/homework")
    async def get_homework(
        class_name: Optional[str] = None,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            query = {"tenant_id": tenant_id, "is_deleted": {"$ne": True}}
            
            if class_name:
                query["class_name"] = class_name
                
            homework_list = await db.homework.find(query).sort("created_at", -1).to_list(100)
            return {"homework": sanitize_doc(homework_list)}
        except Exception as e:
            logger.error(f"Error fetching homework: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/homework")
    async def create_homework(
        data: HomeworkCreate,
        current_user = Depends(get_current_user)
    ):
        try:
            if current_user.role not in ["admin", "super_admin", "teacher"]:
                raise HTTPException(status_code=403, detail="Not authorized")
            
            tenant_id = current_user.tenant_id
            
            homework = {
                "tenant_id": tenant_id,
                "title": data.title,
                "description": data.description,
                "class_name": data.class_name,
                "section": data.section,
                "subject": data.subject,
                "due_date": data.due_date,
                "assigned_by": data.assigned_by,
                "attachments": data.attachments,
                "is_deleted": False,
                "created_at": datetime.utcnow(),
                "created_by": current_user.username
            }
            
            result = await db.homework.insert_one(homework)
            homework["id"] = str(result.inserted_id)
            
            return {"message": "Homework created successfully", "homework": sanitize_doc(homework)}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating homework: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/homework")
    async def get_student_homework(current_user = Depends(get_current_user)):
        try:
            tenant_id = current_user.tenant_id
            student_id = current_user.student_id
            
            if not student_id:
                raise HTTPException(status_code=400, detail="Not a student account")
            
            student = await db.students.find_one({
                "student_id": student_id,
                "tenant_id": tenant_id
            })
            
            if not student:
                raise HTTPException(status_code=404, detail="Student not found")
            
            current_date = datetime.utcnow()
            current_month = current_date.strftime("%B")
            current_year = current_date.year
            
            has_paid = await check_student_payment_status(db, tenant_id, student_id, current_month, current_year)
            
            if not has_paid:
                return {
                    "homework": [],
                    "payment_required": True,
                    "message": "Payment required to access homework"
                }
            
            student_class = student.get("class_standard") or student.get("class_name")
            
            homework_list = await db.homework.find({
                "tenant_id": tenant_id,
                "class_name": student_class,
                "is_deleted": {"$ne": True}
            }).sort("due_date", -1).to_list(50)
            
            submissions = await db.homework_submissions.find({
                "tenant_id": tenant_id,
                "student_id": student_id
            }).to_list(100)
            
            submission_map = {str(s.get("homework_id")): s for s in submissions}
            
            for hw in homework_list:
                hw_id = str(hw.get("_id"))
                if hw_id in submission_map:
                    hw["submitted"] = True
                    hw["submission"] = sanitize_doc(submission_map[hw_id])
                else:
                    hw["submitted"] = False
            
            return {"homework": sanitize_doc(homework_list), "payment_required": False}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching student homework: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.post("/student/homework/submit")
    async def submit_homework(
        data: HomeworkSubmission,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            student_id = current_user.student_id
            
            if not student_id:
                raise HTTPException(status_code=400, detail="Not a student account")
            
            submission = {
                "tenant_id": tenant_id,
                "homework_id": data.homework_id,
                "student_id": student_id,
                "submission_text": data.submission_text,
                "attachments": data.attachments,
                "submitted_at": datetime.utcnow(),
                "status": "submitted"
            }
            
            await db.homework_submissions.update_one(
                {
                    "tenant_id": tenant_id,
                    "homework_id": data.homework_id,
                    "student_id": student_id
                },
                {"$set": submission},
                upsert=True
            )
            
            return {"message": "Homework submitted successfully"}
        except Exception as e:
            logger.error(f"Error submitting homework: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/reports/student-attendance/{student_id}")
    async def get_student_attendance_report(
        student_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            
            query = {
                "tenant_id": tenant_id,
                "student_id": student_id
            }
            
            if start_date:
                query["date"] = {"$gte": start_date}
            if end_date:
                if "date" in query:
                    query["date"]["$lte"] = end_date
                else:
                    query["date"] = {"$lte": end_date}
            
            attendance_records = await db.attendance.find(query).sort("date", -1).to_list(365)
            
            live_class_attendance = await db.live_class_attendance.find({
                "tenant_id": tenant_id,
                "student_id": student_id
            }).to_list(365)
            
            total = len(attendance_records)
            present = sum(1 for r in attendance_records if r.get("status") == "present")
            absent = sum(1 for r in attendance_records if r.get("status") == "absent")
            late = sum(1 for r in attendance_records if r.get("status") == "late")
            
            return {
                "student_id": student_id,
                "summary": {
                    "total_days": total,
                    "present": present,
                    "absent": absent,
                    "late": late,
                    "attendance_percentage": round((present / total * 100) if total > 0 else 0, 2)
                },
                "attendance_records": sanitize_doc(attendance_records),
                "live_class_attendance": sanitize_doc(live_class_attendance)
            }
        except Exception as e:
            logger.error(f"Error fetching attendance report: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/reports/student-payments/{student_id}")
    async def get_student_payment_report(
        student_id: str,
        year: Optional[int] = None,
        current_user = Depends(get_current_user)
    ):
        try:
            tenant_id = current_user.tenant_id
            
            query = {
                "tenant_id": tenant_id,
                "student_id": student_id
            }
            
            if year:
                query["year"] = year
            
            payments = await db.monthly_payments.find(query).sort([("year", -1), ("month", -1)]).to_list(100)
            
            total_paid = sum(p.get("amount", 0) for p in payments)
            
            months_paid = [{"month": p.get("month"), "year": p.get("year")} for p in payments]
            
            return {
                "student_id": student_id,
                "summary": {
                    "total_paid": total_paid,
                    "payments_count": len(payments),
                    "months_paid": months_paid
                },
                "payments": sanitize_doc(payments)
            }
        except Exception as e:
            logger.error(f"Error fetching payment report: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/student/access-status")
    async def get_student_access_status(current_user = Depends(get_current_user)):
        try:
            tenant_id = current_user.tenant_id
            student_id = current_user.student_id
            
            if not student_id:
                raise HTTPException(status_code=400, detail="Not a student account")
            
            current_date = datetime.utcnow()
            current_month = current_date.strftime("%B")
            current_year = current_date.year
            
            has_paid = await check_student_payment_status(db, tenant_id, student_id, current_month, current_year)
            
            return {
                "has_paid": has_paid,
                "current_month": current_month,
                "current_year": current_year,
                "features": {
                    "live_class": has_paid,
                    "attendance": has_paid,
                    "homework": has_paid,
                    "results": True,
                    "profile": True
                }
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching access status: {e}")
            raise HTTPException(status_code=500, detail=str(e))

async def check_student_payment_status(db, tenant_id: str, student_id: str, month: str, year: int) -> bool:
    """Check if student has paid for the given month (supports both English and Bengali month names)"""
    # Convert month to Bengali if it's in English
    month_bengali = ENGLISH_TO_BENGALI_MONTHS.get(month, month)
    month_english = BENGALI_TO_ENGLISH_MONTHS.get(month, month)
    
    # Search for payment with either month format
    payment = await db.monthly_payments.find_one({
        "tenant_id": tenant_id,
        "student_id": student_id,
        "month": {"$in": [month, month_bengali, month_english]},
        "year": year,
        "status": "completed"
    })
    return payment is not None
