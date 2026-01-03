"""
Centralized Notification Service for School ERP
Event-driven notification system with in-app notifications and optional email support
"""

import os
import logging
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any, Callable
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class NotificationEventType:
    ADMISSION_NEW = "admission_new"
    ADMISSION_APPROVED = "admission_approved"
    ADMISSION_REJECTED = "admission_rejected"
    ATTENDANCE_ABSENT = "attendance_absent"
    ATTENDANCE_LATE = "attendance_late"
    STAFF_ATTENDANCE_LATE = "staff_attendance_late"
    FEE_DUE_REMINDER = "fee_due_reminder"
    FEE_OVERDUE = "fee_overdue"
    FEE_PAYMENT_RECEIVED = "fee_payment_received"
    EXAM_SCHEDULED = "exam_scheduled"
    RESULT_PUBLISHED = "result_published"
    CALENDAR_EVENT = "calendar_event"
    TIMETABLE_UPDATE = "timetable_update"
    TRANSPORT_ROUTE_CHANGE = "transport_route_change"
    GENERAL_ANNOUNCEMENT = "general_announcement"


NOTIFICATION_TEMPLATES = {
    NotificationEventType.ADMISSION_NEW: {
        "title": "New Admission Application",
        "body": "A new admission application has been submitted for {student_name} in Class {class_name}.",
        "priority": "normal",
        "target_role": "admin"
    },
    NotificationEventType.ADMISSION_APPROVED: {
        "title": "Admission Approved",
        "body": "Your admission application for {student_name} has been approved! Welcome to {school_name}.",
        "priority": "high",
        "target_role": "parent"
    },
    NotificationEventType.ADMISSION_REJECTED: {
        "title": "Admission Status Update",
        "body": "The admission application for {student_name} could not be approved at this time. Please contact the school for more details.",
        "priority": "high",
        "target_role": "parent"
    },
    NotificationEventType.ATTENDANCE_ABSENT: {
        "title": "Student Absence Alert",
        "body": "{student_name} was marked absent on {date}. Please contact the school if this is an error.",
        "priority": "high",
        "target_role": "parent"
    },
    NotificationEventType.ATTENDANCE_LATE: {
        "title": "Late Arrival Notice",
        "body": "{student_name} arrived late to school on {date} at {time}.",
        "priority": "normal",
        "target_role": "parent"
    },
    NotificationEventType.STAFF_ATTENDANCE_LATE: {
        "title": "Staff Late Arrival",
        "body": "Staff member {staff_name} arrived late on {date} at {time}.",
        "priority": "normal",
        "target_role": "admin"
    },
    NotificationEventType.FEE_DUE_REMINDER: {
        "title": "Fee Due Reminder",
        "body": "Reminder: Fee payment of {amount} for {student_name} is due on {due_date}. Please make the payment to avoid late fees.",
        "priority": "high",
        "target_role": "parent"
    },
    NotificationEventType.FEE_OVERDUE: {
        "title": "Fee Overdue Alert",
        "body": "URGENT: Fee payment of {amount} for {student_name} is overdue. Please pay immediately to avoid penalties.",
        "priority": "urgent",
        "target_role": "parent"
    },
    NotificationEventType.FEE_PAYMENT_RECEIVED: {
        "title": "Payment Confirmation",
        "body": "Payment of {amount} received for {student_name}. Receipt No: {receipt_no}. Thank you!",
        "priority": "normal",
        "target_role": "parent"
    },
    NotificationEventType.EXAM_SCHEDULED: {
        "title": "Exam Schedule Published",
        "body": "{exam_name} exams have been scheduled from {start_date} to {end_date}. Check the exam schedule for details.",
        "priority": "high",
        "target_role": "all"
    },
    NotificationEventType.RESULT_PUBLISHED: {
        "title": "Exam Results Published",
        "body": "Results for {exam_name} have been published. Check the student portal for detailed results.",
        "priority": "high",
        "target_role": "all"
    },
    NotificationEventType.CALENDAR_EVENT: {
        "title": "New School Event",
        "body": "{event_type}: {event_title} on {event_date}. {description}",
        "priority": "normal",
        "target_role": "all"
    },
    NotificationEventType.TIMETABLE_UPDATE: {
        "title": "Timetable Updated",
        "body": "The timetable for Class {class_name} Section {section} has been updated. Please check the new schedule.",
        "priority": "normal",
        "target_role": "all"
    },
    NotificationEventType.TRANSPORT_ROUTE_CHANGE: {
        "title": "Transport Route Change",
        "body": "The transport route {route_name} has been modified. New pickup time: {pickup_time}.",
        "priority": "high",
        "target_role": "parent"
    },
    NotificationEventType.GENERAL_ANNOUNCEMENT: {
        "title": "{title}",
        "body": "{body}",
        "priority": "normal",
        "target_role": "all"
    }
}


class NotificationService:
    def __init__(self, db):
        self.db = db
    
    async def get_notification_settings(self, tenant_id: str) -> Dict[str, Any]:
        """Get notification settings for a tenant"""
        settings = await self.db.notification_settings.find_one({"tenant_id": tenant_id})
        if not settings:
            return {
                "email_enabled": True,
                "sms_enabled": False,
                "in_app_enabled": True,
                "event_settings": {
                    event_type: {"enabled": True, "email": True, "sms": False, "in_app": True}
                    for event_type in NOTIFICATION_TEMPLATES.keys()
                }
            }
        return settings
    
    async def create_notification(
        self,
        tenant_id: str,
        event_type: str,
        data: Dict[str, Any],
        target_user_ids: List[str] = None,
        target_role: str = None,
        target_class: str = None,
        target_section: str = None,
        school_id: str = None,
        send_email: bool = True,
        email_recipients: List[str] = None
    ) -> Dict[str, Any]:
        """
        Create a notification based on event type and data
        """
        try:
            template = NOTIFICATION_TEMPLATES.get(event_type, NOTIFICATION_TEMPLATES[NotificationEventType.GENERAL_ANNOUNCEMENT])
            
            title = template["title"].format(**data) if "{" in template["title"] else template["title"]
            body = template["body"].format(**data) if "{" in template["body"] else template["body"]
            priority = data.get("priority", template["priority"])
            role = target_role or template["target_role"]
            
            notification_id = str(uuid.uuid4())
            notification = {
                "id": notification_id,
                "tenant_id": tenant_id,
                "school_id": school_id,
                "title": title,
                "body": body,
                "notification_type": event_type,
                "target_role": role,
                "target_class": target_class,
                "target_section": target_section,
                "target_user_ids": target_user_ids or [],
                "priority": priority,
                "is_read_by": [],
                "is_active": True,
                "created_by": "system",
                "created_by_name": "System",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            await self.db.notifications.insert_one(notification)
            logger.info(f"Created notification: {title} for tenant {tenant_id}")
            
            settings = await self.get_notification_settings(tenant_id)
            event_settings = settings.get("event_settings", {}).get(event_type, {})
            
            if send_email and email_recipients and event_settings.get("email", True):
                try:
                    await self.send_email_notification(
                        to=email_recipients,
                        subject=title,
                        body=body,
                        tenant_id=tenant_id
                    )
                except Exception as e:
                    logger.error(f"Failed to send email: {str(e)}")
            
            return {"success": True, "notification_id": notification_id}
            
        except Exception as e:
            logger.error(f"Error creating notification: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def send_email_notification(
        self,
        to: List[str],
        subject: str,
        body: str,
        tenant_id: str = None,
        html: str = None
    ) -> Dict[str, Any]:
        """
        Send email notification - logs for now, can be extended with email provider
        For production, integrate with Resend, SendGrid, or SMTP
        """
        try:
            if not to:
                return {"success": False, "error": "No recipients"}
            
            logger.info(f"[EMAIL] Would send to {to}: {subject}")
            
            await self.db.email_logs.insert_one({
                "id": str(uuid.uuid4()),
                "tenant_id": tenant_id,
                "to": to,
                "subject": subject,
                "body": body,
                "status": "queued",
                "created_at": datetime.utcnow()
            })
            
            return {"success": True, "message": "Email logged for delivery"}
            
        except Exception as e:
            logger.error(f"Error logging email: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def notify_new_admission(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        class_name: str,
        parent_email: str = None
    ):
        """Notify admins about new admission application"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.ADMISSION_NEW,
            data={
                "student_name": student_name,
                "class_name": class_name
            },
            target_role="admin",
            school_id=school_id
        )
    
    async def notify_admission_approved(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        school_name: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about admission approval"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.ADMISSION_APPROVED,
            data={
                "student_name": student_name,
                "school_name": school_name
            },
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_admission_rejected(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about admission rejection"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.ADMISSION_REJECTED,
            data={"student_name": student_name},
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_student_absent(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        student_id: str,
        date: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about student absence"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.ATTENDANCE_ABSENT,
            data={
                "student_name": student_name,
                "date": date
            },
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_student_late(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        date: str,
        time: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about student late arrival"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.ATTENDANCE_LATE,
            data={
                "student_name": student_name,
                "date": date,
                "time": time
            },
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_staff_late(
        self,
        tenant_id: str,
        school_id: str,
        staff_name: str,
        date: str,
        time: str
    ):
        """Notify admin about staff late arrival"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.STAFF_ATTENDANCE_LATE,
            data={
                "staff_name": staff_name,
                "date": date,
                "time": time
            },
            target_role="admin",
            school_id=school_id
        )
    
    async def notify_fee_due(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        amount: str,
        due_date: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about upcoming fee due"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.FEE_DUE_REMINDER,
            data={
                "student_name": student_name,
                "amount": amount,
                "due_date": due_date
            },
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_fee_overdue(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        amount: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about overdue fee"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.FEE_OVERDUE,
            data={
                "student_name": student_name,
                "amount": amount
            },
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_payment_received(
        self,
        tenant_id: str,
        school_id: str,
        student_name: str,
        amount: str,
        receipt_no: str,
        parent_email: str = None,
        parent_user_id: str = None
    ):
        """Notify parent about payment received"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.FEE_PAYMENT_RECEIVED,
            data={
                "student_name": student_name,
                "amount": amount,
                "receipt_no": receipt_no
            },
            target_user_ids=[parent_user_id] if parent_user_id else None,
            target_role="parent",
            school_id=school_id,
            email_recipients=[parent_email] if parent_email else None
        )
    
    async def notify_exam_scheduled(
        self,
        tenant_id: str,
        school_id: str,
        exam_name: str,
        start_date: str,
        end_date: str,
        target_class: str = None
    ):
        """Notify about exam schedule"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.EXAM_SCHEDULED,
            data={
                "exam_name": exam_name,
                "start_date": start_date,
                "end_date": end_date
            },
            target_role="all",
            target_class=target_class,
            school_id=school_id
        )
    
    async def notify_result_published(
        self,
        tenant_id: str,
        school_id: str,
        exam_name: str,
        target_class: str = None
    ):
        """Notify about result publication"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.RESULT_PUBLISHED,
            data={"exam_name": exam_name},
            target_role="all",
            target_class=target_class,
            school_id=school_id
        )
    
    async def notify_calendar_event(
        self,
        tenant_id: str,
        school_id: str,
        event_type: str,
        event_title: str,
        event_date: str,
        description: str = ""
    ):
        """Notify about new calendar event"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.CALENDAR_EVENT,
            data={
                "event_type": event_type,
                "event_title": event_title,
                "event_date": event_date,
                "description": description
            },
            target_role="all",
            school_id=school_id
        )
    
    async def notify_timetable_update(
        self,
        tenant_id: str,
        school_id: str,
        class_name: str,
        section: str
    ):
        """Notify about timetable update"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.TIMETABLE_UPDATE,
            data={
                "class_name": class_name,
                "section": section
            },
            target_role="all",
            target_class=class_name,
            target_section=section,
            school_id=school_id
        )
    
    async def notify_transport_route_change(
        self,
        tenant_id: str,
        school_id: str,
        route_name: str,
        pickup_time: str,
        affected_student_ids: List[str] = None
    ):
        """Notify about transport route changes"""
        return await self.create_notification(
            tenant_id=tenant_id,
            event_type=NotificationEventType.TRANSPORT_ROUTE_CHANGE,
            data={
                "route_name": route_name,
                "pickup_time": pickup_time
            },
            target_user_ids=affected_student_ids,
            target_role="parent",
            school_id=school_id
        )


notification_service = None

def get_notification_service(db):
    global notification_service
    if notification_service is None:
        notification_service = NotificationService(db)
    return notification_service
