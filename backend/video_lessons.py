"""
Video Lessons & Semester Management Module
Handles semesters, video lessons, questions, and student responses
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Any, Callable
from datetime import datetime
import uuid
import logging

router = APIRouter(prefix="/api", tags=["Video Lessons"])
security = HTTPBearer()


# ============== Pydantic Models ==============

class SemesterCreate(BaseModel):
    class_id: str
    title_bn: str
    title_en: Optional[str] = None
    order: int = 1
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class SemesterUpdate(BaseModel):
    title_bn: Optional[str] = None
    title_en: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class VideoLessonCreate(BaseModel):
    semester_id: str
    subject_id: str
    title_bn: str
    title_en: Optional[str] = None
    description_bn: Optional[str] = None
    video_url: str
    video_type: str = "youtube"
    duration_minutes: Optional[int] = None
    order: int = 1
    is_published: bool = False


class VideoLessonUpdate(BaseModel):
    title_bn: Optional[str] = None
    title_en: Optional[str] = None
    description_bn: Optional[str] = None
    video_url: Optional[str] = None
    video_type: Optional[str] = None
    duration_minutes: Optional[int] = None
    order: Optional[int] = None
    is_published: Optional[bool] = None


class QuestionOption(BaseModel):
    id: str
    text_bn: str
    is_correct: bool = False


class MatchingPair(BaseModel):
    id: str
    left_bn: str
    right_bn: str


class QuestionCreate(BaseModel):
    lesson_id: str
    question_type: str
    question_bn: str
    order: int = 1
    points: int = 1
    options: Optional[List[QuestionOption]] = None
    correct_answers: Optional[List[str]] = None
    matching_pairs: Optional[List[MatchingPair]] = None


class QuestionUpdate(BaseModel):
    question_bn: Optional[str] = None
    order: Optional[int] = None
    points: Optional[int] = None
    options: Optional[List[QuestionOption]] = None
    correct_answers: Optional[List[str]] = None
    matching_pairs: Optional[List[MatchingPair]] = None


class StudentAnswer(BaseModel):
    question_id: str
    answer: Any


class LessonSubmission(BaseModel):
    lesson_id: str
    answers: List[StudentAnswer]
    time_spent_seconds: Optional[int] = None


# ============== Dependencies (set from server.py) ==============
db = None
_get_current_user_func: Callable = None


def set_dependencies(database, get_user_func):
    global db, _get_current_user_func
    db = database
    _get_current_user_func = get_user_func


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Wrapper that calls the main app's get_current_user"""
    if _get_current_user_func is None:
        raise HTTPException(status_code=500, detail="Authentication not initialized")
    return await _get_current_user_func(credentials)


async def require_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user and verify admin role"""
    user = await get_current_user(credentials)
    if user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="অ্যাডমিন অ্যাক্সেস প্রয়োজন")
    return user


async def require_staff(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user and verify staff/admin/teacher role"""
    user = await get_current_user(credentials)
    if user.role not in ["super_admin", "admin", "teacher"]:
        raise HTTPException(status_code=403, detail="স্টাফ অ্যাক্সেস প্রয়োজন")
    return user


# ============== Semester Endpoints ==============

@router.post("/admin/semesters")
async def create_semester(semester: SemesterCreate, user = Depends(require_admin)):
    """Create a new semester for a class (Admin only)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    class_doc = await db.classes.find_one({"id": semester.class_id, "tenant_id": user.tenant_id})
    if not class_doc:
        raise HTTPException(status_code=404, detail="জামাত খুঁজে পাওয়া যায়নি")
    
    semester_id = str(uuid.uuid4())
    semester_doc = {
        "id": semester_id,
        "tenant_id": user.tenant_id,
        "class_id": semester.class_id,
        "title_bn": semester.title_bn,
        "title_en": semester.title_en,
        "order": semester.order,
        "is_active": semester.is_active,
        "start_date": semester.start_date,
        "end_date": semester.end_date,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": user.id
    }
    
    await db.semesters.insert_one(semester_doc)
    logging.info(f"Created semester {semester.title_bn} for class {semester.class_id}, tenant: {user.tenant_id}")
    
    semester_doc.pop("_id", None)
    return {"message": "সেমিস্টার সফলভাবে তৈরি হয়েছে", "semester_id": semester_id, "semester": semester_doc}


@router.get("/admin/semesters")
async def get_all_semesters(user = Depends(require_staff)):
    """Get all semesters for the tenant (for dropdowns)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semesters = await db.semesters.find({
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("order", 1).to_list(500)
    
    class_ids = list(set(s.get("class_id") for s in semesters if s.get("class_id")))
    classes = await db.classes.find({"id": {"$in": class_ids}, "tenant_id": user.tenant_id}).to_list(100)
    class_map = {c["id"]: c.get("display_name") or c.get("name") for c in classes}
    
    for sem in semesters:
        sem.pop("_id", None)
        sem["class_name"] = class_map.get(sem.get("class_id"), "")
    
    return {"semesters": semesters}


@router.get("/admin/students/{student_id}/semesters")
async def get_student_enrolled_semesters(student_id: str, user = Depends(require_staff)):
    """Get all semesters a specific student is enrolled in (Admin/Staff)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    enrollments = await db.student_semester_enrollments.find({
        "student_id": student_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    }).to_list(100)
    
    semester_ids = [e["semester_id"] for e in enrollments]
    return {"semester_ids": semester_ids}


@router.get("/admin/classes/{class_id}/semesters")
async def get_class_semesters(class_id: str, user = Depends(require_staff)):
    """Get all semesters for a class"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semesters = await db.semesters.find({
        "class_id": class_id,
        "tenant_id": user.tenant_id
    }).sort("order", 1).to_list(100)
    
    for sem in semesters:
        sem.pop("_id", None)
    
    return {"semesters": semesters}


@router.get("/admin/semesters/{semester_id}")
async def get_semester(semester_id: str, user = Depends(require_staff)):
    """Get a specific semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semester = await db.semesters.find_one({"id": semester_id, "tenant_id": user.tenant_id})
    if not semester:
        raise HTTPException(status_code=404, detail="সেমিস্টার খুঁজে পাওয়া যায়নি")
    
    semester.pop("_id", None)
    return semester


@router.patch("/admin/semesters/{semester_id}")
async def update_semester(semester_id: str, update: SemesterUpdate, user = Depends(require_admin)):
    """Update a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = await db.semesters.update_one(
        {"id": semester_id, "tenant_id": user.tenant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="সেমিস্টার খুঁজে পাওয়া যায়নি")
    
    return {"message": "সেমিস্টার সফলভাবে আপডেট হয়েছে"}


@router.delete("/admin/semesters/{semester_id}")
async def delete_semester(semester_id: str, user = Depends(require_admin)):
    """Delete a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    lesson_count = await db.video_lessons.count_documents({"semester_id": semester_id, "tenant_id": user.tenant_id})
    if lesson_count > 0:
        raise HTTPException(status_code=400, detail=f"{lesson_count}টি পাঠ আছে, মুছতে পারবেন না")
    
    result = await db.semesters.delete_one({"id": semester_id, "tenant_id": user.tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="সেমিস্টার খুঁজে পাওয়া যায়নি")
    
    return {"message": "সেমিস্টার সফলভাবে মুছে ফেলা হয়েছে"}


# ============== Student Enrollment Endpoints ==============

@router.post("/admin/semesters/{semester_id}/enroll")
async def enroll_students(semester_id: str, student_ids: List[str], user = Depends(require_admin)):
    """Enroll students in a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semester = await db.semesters.find_one({"id": semester_id, "tenant_id": user.tenant_id})
    if not semester:
        raise HTTPException(status_code=404, detail="সেমিস্টার খুঁজে পাওয়া যায়নি")
    
    enrolled_count = 0
    for student_id in student_ids:
        existing = await db.student_semester_enrollments.find_one({
            "student_id": student_id,
            "semester_id": semester_id,
            "tenant_id": user.tenant_id
        })
        
        if not existing:
            enrollment = {
                "id": str(uuid.uuid4()),
                "student_id": student_id,
                "semester_id": semester_id,
                "tenant_id": user.tenant_id,
                "enrolled_at": datetime.utcnow().isoformat(),
                "enrolled_by": user.id,
                "is_active": True
            }
            await db.student_semester_enrollments.insert_one(enrollment)
            enrolled_count += 1
    
    return {"message": f"{enrolled_count} জন ছাত্র সফলভাবে ভর্তি হয়েছে", "enrolled_count": enrolled_count}


@router.delete("/admin/semesters/{semester_id}/unenroll/{student_id}")
async def unenroll_student(semester_id: str, student_id: str, user = Depends(require_admin)):
    """Remove a student from a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.student_semester_enrollments.delete_one({
        "student_id": student_id,
        "semester_id": semester_id,
        "tenant_id": user.tenant_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="ভর্তি রেকর্ড খুঁজে পাওয়া যায়নি")
    
    return {"message": "ছাত্র সফলভাবে বাদ দেওয়া হয়েছে"}


@router.get("/admin/semesters/{semester_id}/students")
async def get_semester_students(semester_id: str, user = Depends(require_staff)):
    """Get all students enrolled in a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    enrollments = await db.student_semester_enrollments.find({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    }).to_list(1000)
    
    student_ids = [e["student_id"] for e in enrollments]
    students = await db.students.find({
        "id": {"$in": student_ids},
        "tenant_id": user.tenant_id
    }).to_list(1000)
    
    for s in students:
        s.pop("_id", None)
    
    return {"students": students, "total": len(students)}


# ============== Video Lesson Endpoints ==============

@router.post("/admin/lessons")
async def create_lesson(lesson: VideoLessonCreate, user = Depends(require_admin)):
    """Create a new video lesson"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semester = await db.semesters.find_one({"id": lesson.semester_id, "tenant_id": user.tenant_id})
    if not semester:
        raise HTTPException(status_code=404, detail="সেমিস্টার খুঁজে পাওয়া যায়নি")
    
    lesson_id = str(uuid.uuid4())
    lesson_doc = {
        "id": lesson_id,
        "tenant_id": user.tenant_id,
        "semester_id": lesson.semester_id,
        "subject_id": lesson.subject_id,
        "title_bn": lesson.title_bn,
        "title_en": lesson.title_en,
        "description_bn": lesson.description_bn,
        "video_url": lesson.video_url,
        "video_type": lesson.video_type,
        "duration_minutes": lesson.duration_minutes,
        "order": lesson.order,
        "is_published": lesson.is_published,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": user.id
    }
    
    await db.video_lessons.insert_one(lesson_doc)
    logging.info(f"Created video lesson: {lesson.title_bn}, tenant: {user.tenant_id}")
    
    lesson_doc.pop("_id", None)
    return {"message": "পাঠ সফলভাবে তৈরি হয়েছে", "lesson_id": lesson_id, "lesson": lesson_doc}


@router.get("/admin/semesters/{semester_id}/lessons")
async def get_semester_lessons(semester_id: str, user = Depends(require_staff)):
    """Get all lessons for a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    lessons = await db.video_lessons.find({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id
    }).sort("order", 1).to_list(500)
    
    for lesson in lessons:
        lesson.pop("_id", None)
        question_count = await db.assessment_questions.count_documents({
            "lesson_id": lesson["id"],
            "tenant_id": user.tenant_id
        })
        lesson["question_count"] = question_count
    
    return {"lessons": lessons}


@router.get("/admin/lessons/{lesson_id}")
async def get_lesson(lesson_id: str, user = Depends(require_staff)):
    """Get a specific lesson with questions"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    lesson = await db.video_lessons.find_one({"id": lesson_id, "tenant_id": user.tenant_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="পাঠ খুঁজে পাওয়া যায়নি")
    
    lesson.pop("_id", None)
    
    questions = await db.assessment_questions.find({
        "lesson_id": lesson_id,
        "tenant_id": user.tenant_id
    }).sort("order", 1).to_list(100)
    
    for q in questions:
        q.pop("_id", None)
    
    lesson["questions"] = questions
    return lesson


@router.patch("/admin/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, update: VideoLessonUpdate, user = Depends(require_admin)):
    """Update a lesson"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = await db.video_lessons.update_one(
        {"id": lesson_id, "tenant_id": user.tenant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="পাঠ খুঁজে পাওয়া যায়নি")
    
    return {"message": "পাঠ সফলভাবে আপডেট হয়েছে"}


@router.delete("/admin/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, user = Depends(require_admin)):
    """Delete a lesson and its questions"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    await db.assessment_questions.delete_many({"lesson_id": lesson_id, "tenant_id": user.tenant_id})
    
    result = await db.video_lessons.delete_one({"id": lesson_id, "tenant_id": user.tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="পাঠ খুঁজে পাওয়া যায়নি")
    
    return {"message": "পাঠ ও প্রশ্নসমূহ সফলভাবে মুছে ফেলা হয়েছে"}


# ============== Question Endpoints ==============

@router.post("/admin/questions")
async def create_question(question: QuestionCreate, user = Depends(require_admin)):
    """Create a question for a lesson"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    lesson = await db.video_lessons.find_one({"id": question.lesson_id, "tenant_id": user.tenant_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="পাঠ খুঁজে পাওয়া যায়নি")
    
    if question.question_type not in ["mcq", "fill_blank", "matching"]:
        raise HTTPException(status_code=400, detail="অবৈধ প্রশ্নের ধরন")
    
    question_id = str(uuid.uuid4())
    question_doc = {
        "id": question_id,
        "tenant_id": user.tenant_id,
        "lesson_id": question.lesson_id,
        "question_type": question.question_type,
        "question_bn": question.question_bn,
        "order": question.order,
        "points": question.points,
        "created_at": datetime.utcnow().isoformat(),
        "created_by": user.id
    }
    
    if question.question_type == "mcq" and question.options:
        question_doc["options"] = [opt.dict() for opt in question.options]
    elif question.question_type == "fill_blank" and question.correct_answers:
        question_doc["correct_answers"] = question.correct_answers
    elif question.question_type == "matching" and question.matching_pairs:
        question_doc["matching_pairs"] = [pair.dict() for pair in question.matching_pairs]
    
    await db.assessment_questions.insert_one(question_doc)
    
    return {"message": "প্রশ্ন সফলভাবে তৈরি হয়েছে", "question_id": question_id}


@router.get("/admin/lessons/{lesson_id}/questions")
async def get_lesson_questions(lesson_id: str, user = Depends(require_staff)):
    """Get all questions for a lesson"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    questions = await db.assessment_questions.find({
        "lesson_id": lesson_id,
        "tenant_id": user.tenant_id
    }).sort("order", 1).to_list(100)
    
    for q in questions:
        q.pop("_id", None)
    
    return {"questions": questions}


@router.patch("/admin/questions/{question_id}")
async def update_question(question_id: str, update: QuestionUpdate, user = Depends(require_admin)):
    """Update a question"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {}
    for k, v in update.dict().items():
        if v is not None:
            if k in ["options", "matching_pairs"] and v:
                update_data[k] = [item.dict() if hasattr(item, 'dict') else item for item in v]
            else:
                update_data[k] = v
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = await db.assessment_questions.update_one(
        {"id": question_id, "tenant_id": user.tenant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="প্রশ্ন খুঁজে পাওয়া যায়নি")
    
    return {"message": "প্রশ্ন সফলভাবে আপডেট হয়েছে"}


@router.delete("/admin/questions/{question_id}")
async def delete_question(question_id: str, user = Depends(require_admin)):
    """Delete a question"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    result = await db.assessment_questions.delete_one({"id": question_id, "tenant_id": user.tenant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="প্রশ্ন খুঁজে পাওয়া যায়নি")
    
    return {"message": "প্রশ্ন সফলভাবে মুছে ফেলা হয়েছে"}


# ============== Student Endpoints ==============

@router.get("/student/my-semesters")
async def get_student_semesters(user = Depends(get_current_user)):
    """Get semesters a student is enrolled in"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    student = await db.students.find_one({"user_id": user.id, "tenant_id": user.tenant_id})
    student_id = student["id"] if student else user.id
    
    enrollments = await db.student_semester_enrollments.find({
        "student_id": student_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    }).to_list(50)
    
    semester_ids = [e["semester_id"] for e in enrollments]
    semesters = await db.semesters.find({
        "id": {"$in": semester_ids},
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("order", 1).to_list(50)
    
    for sem in semesters:
        sem.pop("_id", None)
        class_doc = await db.classes.find_one({"id": sem["class_id"], "tenant_id": user.tenant_id})
        if class_doc:
            sem["class_name"] = class_doc.get("display_name") or class_doc.get("name")
    
    return {"semesters": semesters}


@router.get("/student/semesters/{semester_id}/lessons")
async def get_student_semester_lessons(semester_id: str, user = Depends(get_current_user)):
    """Get lessons for a semester (student view)"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    student = await db.students.find_one({"user_id": user.id, "tenant_id": user.tenant_id})
    student_id = student["id"] if student else user.id
    
    enrollment = await db.student_semester_enrollments.find_one({
        "student_id": student_id,
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="এই সেমিস্টারে আপনি ভর্তি নন")
    
    lessons = await db.video_lessons.find({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_published": True
    }).sort("order", 1).to_list(500)
    
    for lesson in lessons:
        lesson.pop("_id", None)
        response = await db.student_lesson_responses.find_one({
            "student_id": student_id,
            "lesson_id": lesson["id"],
            "tenant_id": user.tenant_id
        })
        lesson["is_completed"] = response is not None
        lesson["score"] = response.get("score") if response else None
        lesson["total_points"] = response.get("total_points") if response else None
    
    return {"lessons": lessons}


@router.get("/student/lessons/{lesson_id}")
async def get_student_lesson(lesson_id: str, user = Depends(get_current_user)):
    """Get a lesson with questions for student"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    student = await db.students.find_one({"user_id": user.id, "tenant_id": user.tenant_id})
    student_id = student["id"] if student else user.id
    
    lesson = await db.video_lessons.find_one({
        "id": lesson_id,
        "tenant_id": user.tenant_id,
        "is_published": True
    })
    
    if not lesson:
        raise HTTPException(status_code=404, detail="পাঠ খুঁজে পাওয়া যায়নি")
    
    enrollment = await db.student_semester_enrollments.find_one({
        "student_id": student_id,
        "semester_id": lesson["semester_id"],
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="এই সেমিস্টারে আপনি ভর্তি নন")
    
    lesson.pop("_id", None)
    
    questions = await db.assessment_questions.find({
        "lesson_id": lesson_id,
        "tenant_id": user.tenant_id
    }).sort("order", 1).to_list(100)
    
    import random
    for q in questions:
        q.pop("_id", None)
        if q["question_type"] == "mcq" and "options" in q:
            for opt in q["options"]:
                opt.pop("is_correct", None)
        if "correct_answers" in q:
            del q["correct_answers"]
        if "matching_pairs" in q:
            pairs = q["matching_pairs"]
            right_items = [p["right_bn"] for p in pairs]
            random.shuffle(right_items)
            q["left_items"] = [{"id": p["id"], "text": p["left_bn"]} for p in pairs]
            q["right_items"] = right_items
            del q["matching_pairs"]
    
    lesson["questions"] = questions
    
    response = await db.student_lesson_responses.find_one({
        "student_id": student_id,
        "lesson_id": lesson_id,
        "tenant_id": user.tenant_id
    })
    lesson["is_completed"] = response is not None
    if response:
        lesson["previous_score"] = response.get("score")
        lesson["previous_total"] = response.get("total_points")
    
    return lesson


@router.post("/student/lessons/{lesson_id}/submit")
async def submit_lesson_answers(lesson_id: str, submission: LessonSubmission, user = Depends(get_current_user)):
    """Submit answers for a lesson"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    student = await db.students.find_one({"user_id": user.id, "tenant_id": user.tenant_id})
    student_id = student["id"] if student else user.id
    
    lesson = await db.video_lessons.find_one({"id": lesson_id, "tenant_id": user.tenant_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="পাঠ খুঁজে পাওয়া যায়নি")
    
    enrollment = await db.student_semester_enrollments.find_one({
        "student_id": student_id,
        "semester_id": lesson["semester_id"],
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if not enrollment:
        raise HTTPException(status_code=403, detail="এই সেমিস্টারে আপনি ভর্তি নন")
    
    questions = await db.assessment_questions.find({
        "lesson_id": lesson_id,
        "tenant_id": user.tenant_id
    }).to_list(100)
    
    question_map = {q["id"]: q for q in questions}
    
    total_points = 0
    earned_points = 0
    graded_answers = []
    
    for answer in submission.answers:
        question = question_map.get(answer.question_id)
        if not question:
            continue
        
        points = question.get("points", 1)
        total_points += points
        is_correct = False
        
        if question["question_type"] == "mcq":
            correct_option = next((o for o in question.get("options", []) if o.get("is_correct")), None)
            if correct_option and answer.answer == correct_option["id"]:
                is_correct = True
                earned_points += points
        
        elif question["question_type"] == "fill_blank":
            correct_answers = [a.strip().lower() for a in question.get("correct_answers", [])]
            if answer.answer and answer.answer.strip().lower() in correct_answers:
                is_correct = True
                earned_points += points
        
        elif question["question_type"] == "matching":
            pairs = {p["id"]: p["right_bn"] for p in question.get("matching_pairs", [])}
            if isinstance(answer.answer, dict):
                correct_matches = sum(1 for k, v in answer.answer.items() if pairs.get(k) == v)
                partial_points = (correct_matches / len(pairs)) * points if pairs else 0
                earned_points += partial_points
                is_correct = correct_matches == len(pairs)
        
        graded_answers.append({
            "question_id": answer.question_id,
            "student_answer": answer.answer,
            "is_correct": is_correct,
            "points_earned": points if is_correct else 0
        })
    
    response_id = str(uuid.uuid4())
    response_doc = {
        "id": response_id,
        "student_id": student_id,
        "lesson_id": lesson_id,
        "semester_id": lesson["semester_id"],
        "tenant_id": user.tenant_id,
        "answers": graded_answers,
        "score": earned_points,
        "total_points": total_points,
        "percentage": round((earned_points / total_points) * 100, 1) if total_points > 0 else 0,
        "time_spent_seconds": submission.time_spent_seconds,
        "submitted_at": datetime.utcnow().isoformat()
    }
    
    await db.student_lesson_responses.update_one(
        {"student_id": student_id, "lesson_id": lesson_id, "tenant_id": user.tenant_id},
        {"$set": response_doc},
        upsert=True
    )
    
    return {
        "message": "উত্তর সফলভাবে জমা হয়েছে",
        "score": earned_points,
        "total_points": total_points,
        "percentage": response_doc["percentage"],
        "graded_answers": graded_answers
    }


@router.get("/student/lessons/{lesson_id}/result")
async def get_lesson_result(lesson_id: str, user = Depends(get_current_user)):
    """Get student's result for a lesson"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    student = await db.students.find_one({"user_id": user.id, "tenant_id": user.tenant_id})
    student_id = student["id"] if student else user.id
    
    response = await db.student_lesson_responses.find_one({
        "student_id": student_id,
        "lesson_id": lesson_id,
        "tenant_id": user.tenant_id
    })
    
    if not response:
        raise HTTPException(status_code=404, detail="কোনো জমা পাওয়া যায়নি")
    
    response.pop("_id", None)
    return response


# ============== Progress & Reports ==============

@router.get("/admin/semesters/{semester_id}/progress")
async def get_semester_progress(semester_id: str, user = Depends(require_staff)):
    """Get progress report for all students in a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    enrollments = await db.student_semester_enrollments.find({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    }).to_list(1000)
    
    student_ids = [e["student_id"] for e in enrollments]
    
    lessons = await db.video_lessons.find({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_published": True
    }).to_list(500)
    
    total_lessons = len(lessons)
    lesson_ids = [l["id"] for l in lessons]
    
    progress_data = []
    for student_id in student_ids:
        student = await db.students.find_one({"id": student_id, "tenant_id": user.tenant_id})
        if not student:
            continue
        
        responses = await db.student_lesson_responses.find({
            "student_id": student_id,
            "lesson_id": {"$in": lesson_ids},
            "tenant_id": user.tenant_id
        }).to_list(500)
        
        completed = len(responses)
        total_score = sum(r.get("score", 0) for r in responses)
        total_possible = sum(r.get("total_points", 0) for r in responses)
        
        progress_data.append({
            "student_id": student_id,
            "student_name": student.get("full_name_bn") or student.get("full_name"),
            "roll_number": student.get("roll_number"),
            "lessons_completed": completed,
            "total_lessons": total_lessons,
            "progress_percent": round((completed / total_lessons) * 100, 1) if total_lessons > 0 else 0,
            "total_score": total_score,
            "total_possible": total_possible,
            "average_percent": round((total_score / total_possible) * 100, 1) if total_possible > 0 else 0
        })
    
    return {"progress": progress_data, "total_students": len(progress_data), "total_lessons": total_lessons}
