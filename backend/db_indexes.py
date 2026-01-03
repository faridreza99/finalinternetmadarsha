"""
Database Index Management for Performance Optimization
Creates compound indexes for efficient querying at scale (100k+ students)
"""

import logging

logger = logging.getLogger(__name__)

async def create_performance_indexes(db):
    """Create all critical compound indexes for optimal query performance"""
    
    indexes_created = []
    
    try:
        # ==================== STUDENTS COLLECTION ====================
        students = db.students
        
        # Primary lookup: by tenant + class + status (most common query)
        await students.create_index(
            [("tenant_id", 1), ("class_id", 1), ("status", 1)],
            name="idx_students_tenant_class_status",
            background=True
        )
        indexes_created.append("students: tenant_class_status")
        
        # Admission number lookup
        await students.create_index(
            [("tenant_id", 1), ("admission_no", 1)],
            name="idx_students_tenant_admission",
            background=True
        )
        indexes_created.append("students: tenant_admission")
        
        # Roll number lookup
        await students.create_index(
            [("tenant_id", 1), ("roll_no", 1)],
            name="idx_students_tenant_roll",
            background=True
        )
        indexes_created.append("students: tenant_roll")
        
        # Section filtering
        await students.create_index(
            [("tenant_id", 1), ("class_id", 1), ("section_id", 1)],
            name="idx_students_tenant_class_section",
            background=True
        )
        indexes_created.append("students: tenant_class_section")
        
        # Name search with class filter
        await students.create_index(
            [("tenant_id", 1), ("name", 1)],
            name="idx_students_tenant_name",
            background=True
        )
        indexes_created.append("students: tenant_name")

        # ==================== ATTENDANCE COLLECTION ====================
        attendance = db.attendance
        
        # Primary: by date + class (daily attendance view)
        await attendance.create_index(
            [("tenant_id", 1), ("date", -1), ("class_id", 1)],
            name="idx_attendance_tenant_date_class",
            background=True
        )
        indexes_created.append("attendance: tenant_date_class")
        
        # Student attendance history
        await attendance.create_index(
            [("student_id", 1), ("date", -1)],
            name="idx_attendance_student_date",
            background=True
        )
        indexes_created.append("attendance: student_date")
        
        # Monthly reports
        await attendance.create_index(
            [("tenant_id", 1), ("year", 1), ("month", 1)],
            name="idx_attendance_tenant_year_month",
            background=True
        )
        indexes_created.append("attendance: tenant_year_month")

        # ==================== RESULTS COLLECTION ====================
        results = db.results
        
        # Class results by exam
        await results.create_index(
            [("tenant_id", 1), ("class_id", 1), ("exam_id", 1)],
            name="idx_results_tenant_class_exam",
            background=True
        )
        indexes_created.append("results: tenant_class_exam")
        
        # Student results history
        await results.create_index(
            [("student_id", 1), ("academic_year", 1)],
            name="idx_results_student_year",
            background=True
        )
        indexes_created.append("results: student_year")

        # ==================== USERS COLLECTION ====================
        users = db.users
        
        # User lookup by tenant + id
        await users.create_index(
            [("tenant_id", 1), ("id", 1)],
            name="idx_users_tenant_id",
            background=True
        )
        indexes_created.append("users: tenant_id")
        
        # Username lookup
        await users.create_index(
            [("tenant_id", 1), ("username", 1)],
            name="idx_users_tenant_username",
            unique=True,
            background=True
        )
        indexes_created.append("users: tenant_username (unique)")

        # ==================== CLASSES COLLECTION ====================
        classes = db.classes
        
        await classes.create_index(
            [("tenant_id", 1), ("status", 1)],
            name="idx_classes_tenant_status",
            background=True
        )
        indexes_created.append("classes: tenant_status")

        # ==================== SECTIONS COLLECTION ====================
        sections = db.sections
        
        await sections.create_index(
            [("tenant_id", 1), ("class_id", 1)],
            name="idx_sections_tenant_class",
            background=True
        )
        indexes_created.append("sections: tenant_class")

        # ==================== INSTITUTIONS COLLECTION ====================
        institutions = db.institutions
        
        await institutions.create_index(
            [("tenant_id", 1)],
            name="idx_institutions_tenant",
            unique=True,
            background=True
        )
        indexes_created.append("institutions: tenant (unique)")

        # ==================== FEES COLLECTION ====================
        fees = db.fees
        
        await fees.create_index(
            [("tenant_id", 1), ("student_id", 1), ("status", 1)],
            name="idx_fees_tenant_student_status",
            background=True
        )
        indexes_created.append("fees: tenant_student_status")
        
        await fees.create_index(
            [("tenant_id", 1), ("due_date", 1), ("status", 1)],
            name="idx_fees_tenant_duedate_status",
            background=True
        )
        indexes_created.append("fees: tenant_duedate_status")

        logger.info(f"✅ Created {len(indexes_created)} performance indexes: {', '.join(indexes_created)}")
        return indexes_created
        
    except Exception as e:
        logger.error(f"❌ Index creation error: {e}")
        # Don't raise - indexes are optimization, not critical
        return indexes_created
