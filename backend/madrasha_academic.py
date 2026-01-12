"""
Madrasha Academic Hierarchy Module
Handles Marhalas (academic stages), Departments (Jamaat), and Semesters
Following the standard Madrasha academic flow:
Marhala → Department → Semester → Student

All operations (Attendance, Video Classes, Exams, Fees) are semester-centric.
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Callable
from datetime import datetime
import uuid
import logging

router = APIRouter(prefix="/api", tags=["Madrasha Academic"])
security = HTTPBearer()


# ============== Pydantic Models ==============

class MarhalaCreate(BaseModel):
    """Create a new Marhala (academic stage like Dakhil, Alim, Fazil)"""
    name_bn: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0
    duration_years: int = 2
    is_active: bool = True


class MarhalaUpdate(BaseModel):
    """Update Marhala fields"""
    name_bn: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    order_index: Optional[int] = None
    duration_years: Optional[int] = None
    is_active: Optional[bool] = None


class Marhala(BaseModel):
    """Full Marhala model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    name_bn: str
    name_en: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0
    duration_years: int = 2
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DepartmentCreate(BaseModel):
    """Create a new Department (Jamaat like Science, Hadith, Tafsir)"""
    marhala_id: str
    name_bn: str
    name_en: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    head_teacher_id: Optional[str] = None
    order_index: int = 0
    max_students: int = 100
    is_active: bool = True


class DepartmentUpdate(BaseModel):
    """Update Department fields"""
    marhala_id: Optional[str] = None
    name_bn: Optional[str] = None
    name_en: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    head_teacher_id: Optional[str] = None
    order_index: Optional[int] = None
    max_students: Optional[int] = None
    is_active: Optional[bool] = None


class Department(BaseModel):
    """Full Department model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    marhala_id: str
    name_bn: str
    name_en: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    head_teacher_id: Optional[str] = None
    order_index: int = 0
    max_students: int = 100
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AcademicSemesterCreate(BaseModel):
    """Create a new Academic Semester within a Department"""
    department_id: str
    name_bn: str
    name_en: Optional[str] = None
    semester_number: int = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order_index: int = 0
    is_active: bool = True


class AcademicSemesterUpdate(BaseModel):
    """Update Semester fields"""
    department_id: Optional[str] = None
    name_bn: Optional[str] = None
    name_en: Optional[str] = None
    semester_number: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None


class AcademicSemester(BaseModel):
    """Full Academic Semester model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    department_id: str
    marhala_id: Optional[str] = None
    name_bn: str
    name_en: Optional[str] = None
    semester_number: int = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    order_index: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SubjectCreate(BaseModel):
    """Create a new Subject"""
    name_bn: str
    name_en: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    is_active: bool = True


class Subject(BaseModel):
    """Full Subject model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    tenant_id: str
    name_bn: str
    name_en: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[str] = None
    semester_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============== Dependencies (set from server.py) ==============

db = None
_get_current_user_func: Callable = None


def set_dependencies(database, get_user_func):
    """Initialize database and auth dependencies from main server"""
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


# ============== Marhala Endpoints ==============

@router.get("/marhalas")
async def get_marhalas(user=Depends(require_staff)):
    """Get all Marhalas for the tenant"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    marhalas = await db.marhalas.find({
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("order_index", 1).to_list(100)
    
    for m in marhalas:
        m.pop("_id", None)
    
    return {"marhalas": marhalas}


@router.post("/marhalas")
async def create_marhala(data: MarhalaCreate, user=Depends(require_admin)):
    """Create a new Marhala"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    existing = await db.marhalas.find_one({
        "tenant_id": user.tenant_id,
        "name_bn": data.name_bn,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="এই মারহালা ইতিমধ্যে আছে")
    
    marhala = Marhala(
        tenant_id=user.tenant_id,
        **data.dict()
    )
    
    await db.marhalas.insert_one(marhala.dict())
    logging.info(f"Created marhala {data.name_bn} for tenant: {user.tenant_id}")
    
    result = marhala.dict()
    result.pop("_id", None)
    
    return {"message": "মারহালা সফলভাবে তৈরি হয়েছে", "marhala": result}


@router.get("/marhalas/{marhala_id}")
async def get_marhala(marhala_id: str, user=Depends(require_staff)):
    """Get a specific Marhala"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    marhala = await db.marhalas.find_one({
        "id": marhala_id,
        "tenant_id": user.tenant_id
    })
    
    if not marhala:
        raise HTTPException(status_code=404, detail="মারহালা পাওয়া যায়নি")
    
    marhala.pop("_id", None)
    return {"marhala": marhala}


@router.patch("/marhalas/{marhala_id}")
async def update_marhala(marhala_id: str, data: MarhalaUpdate, user=Depends(require_admin)):
    """Update a Marhala"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.marhalas.update_one(
        {"id": marhala_id, "tenant_id": user.tenant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="মারহালা পাওয়া যায়নি")
    
    return {"message": "মারহালা আপডেট হয়েছে"}


@router.delete("/marhalas/{marhala_id}")
async def delete_marhala(marhala_id: str, user=Depends(require_admin)):
    """Soft delete a Marhala"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    dept_count = await db.departments.count_documents({
        "marhala_id": marhala_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if dept_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"এই মারহালায় {dept_count}টি বিভাগ আছে। প্রথমে বিভাগগুলো মুছুন।"
        )
    
    result = await db.marhalas.update_one(
        {"id": marhala_id, "tenant_id": user.tenant_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="মারহালা পাওয়া যায়নি")
    
    logging.info(f"Deleted marhala {marhala_id} for tenant: {user.tenant_id}")
    return {"message": "মারহালা মুছে ফেলা হয়েছে"}


# ============== Department Endpoints ==============

@router.get("/departments")
async def get_departments(marhala_id: Optional[str] = None, user=Depends(require_staff)):
    """Get all Departments, optionally filtered by Marhala"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {
        "tenant_id": user.tenant_id,
        "is_active": True
    }
    
    if marhala_id:
        query["marhala_id"] = marhala_id
    
    departments = await db.departments.find(query).sort("order_index", 1).to_list(200)
    
    marhala_ids = list(set(d.get("marhala_id") for d in departments if d.get("marhala_id")))
    marhalas = await db.marhalas.find({"id": {"$in": marhala_ids}}).to_list(100)
    marhala_map = {m["id"]: m for m in marhalas}
    
    for d in departments:
        d.pop("_id", None)
        if d.get("marhala_id") and d["marhala_id"] in marhala_map:
            d["marhala_name_bn"] = marhala_map[d["marhala_id"]].get("name_bn")
    
    return {"departments": departments}


@router.post("/departments")
async def create_department(data: DepartmentCreate, user=Depends(require_admin)):
    """Create a new Department"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    marhala = await db.marhalas.find_one({
        "id": data.marhala_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    if not marhala:
        raise HTTPException(status_code=400, detail="মারহালা পাওয়া যায়নি")
    
    existing = await db.departments.find_one({
        "tenant_id": user.tenant_id,
        "marhala_id": data.marhala_id,
        "name_bn": data.name_bn,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="এই বিভাগ ইতিমধ্যে আছে")
    
    department = Department(
        tenant_id=user.tenant_id,
        **data.dict()
    )
    
    await db.departments.insert_one(department.dict())
    logging.info(f"Created department {data.name_bn} for tenant: {user.tenant_id}")
    
    result = department.dict()
    result.pop("_id", None)
    
    return {"message": "বিভাগ সফলভাবে তৈরি হয়েছে", "department": result}


@router.get("/departments/{department_id}")
async def get_department(department_id: str, user=Depends(require_staff)):
    """Get a specific Department"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    department = await db.departments.find_one({
        "id": department_id,
        "tenant_id": user.tenant_id
    })
    
    if not department:
        raise HTTPException(status_code=404, detail="বিভাগ পাওয়া যায়নি")
    
    department.pop("_id", None)
    
    marhala = await db.marhalas.find_one({"id": department.get("marhala_id")})
    if marhala:
        department["marhala_name_bn"] = marhala.get("name_bn")
    
    return {"department": department}


@router.patch("/departments/{department_id}")
async def update_department(department_id: str, data: DepartmentUpdate, user=Depends(require_admin)):
    """Update a Department"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.departments.update_one(
        {"id": department_id, "tenant_id": user.tenant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="বিভাগ পাওয়া যায়নি")
    
    return {"message": "বিভাগ আপডেট হয়েছে"}


@router.delete("/departments/{department_id}")
async def delete_department(department_id: str, user=Depends(require_admin)):
    """Soft delete a Department"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    sem_count = await db.academic_semesters.count_documents({
        "department_id": department_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if sem_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"এই বিভাগে {sem_count}টি সেমিস্টার আছে। প্রথমে সেমিস্টারগুলো মুছুন।"
        )
    
    result = await db.departments.update_one(
        {"id": department_id, "tenant_id": user.tenant_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="বিভাগ পাওয়া যায়নি")
    
    logging.info(f"Deleted department {department_id} for tenant: {user.tenant_id}")
    return {"message": "বিভাগ মুছে ফেলা হয়েছে"}


# ============== Academic Semester Endpoints ==============

@router.get("/academic-semesters")
async def get_academic_semesters(
    department_id: Optional[str] = None,
    marhala_id: Optional[str] = None,
    user=Depends(require_staff)
):
    """Get all Academic Semesters, optionally filtered"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {
        "tenant_id": user.tenant_id,
        "is_active": True
    }
    
    if department_id:
        query["department_id"] = department_id
    if marhala_id:
        query["marhala_id"] = marhala_id
    
    semesters = await db.academic_semesters.find(query).sort("order_index", 1).to_list(500)
    
    dept_ids = list(set(s.get("department_id") for s in semesters if s.get("department_id")))
    departments = await db.departments.find({"id": {"$in": dept_ids}}).to_list(200)
    dept_map = {d["id"]: d for d in departments}
    
    for s in semesters:
        s.pop("_id", None)
        if s.get("department_id") and s["department_id"] in dept_map:
            dept = dept_map[s["department_id"]]
            s["department_name_bn"] = dept.get("name_bn")
            s["marhala_id"] = dept.get("marhala_id")
    
    return {"semesters": semesters}


@router.post("/academic-semesters")
async def create_academic_semester(data: AcademicSemesterCreate, user=Depends(require_admin)):
    """Create a new Academic Semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    department = await db.departments.find_one({
        "id": data.department_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    if not department:
        raise HTTPException(status_code=400, detail="বিভাগ পাওয়া যায়নি")
    
    existing = await db.academic_semesters.find_one({
        "tenant_id": user.tenant_id,
        "department_id": data.department_id,
        "name_bn": data.name_bn,
        "is_active": True
    })
    if existing:
        raise HTTPException(status_code=400, detail="এই সেমিস্টার ইতিমধ্যে আছে")
    
    semester = AcademicSemester(
        tenant_id=user.tenant_id,
        marhala_id=department.get("marhala_id"),
        **data.dict()
    )
    
    await db.academic_semesters.insert_one(semester.dict())
    logging.info(f"Created academic semester {data.name_bn} for tenant: {user.tenant_id}")
    
    result = semester.dict()
    result.pop("_id", None)
    
    return {"message": "সেমিস্টার সফলভাবে তৈরি হয়েছে", "semester": result}


@router.get("/academic-semesters/{semester_id}")
async def get_academic_semester(semester_id: str, user=Depends(require_staff)):
    """Get a specific Academic Semester with hierarchy info"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semester = await db.academic_semesters.find_one({
        "id": semester_id,
        "tenant_id": user.tenant_id
    })
    
    if not semester:
        raise HTTPException(status_code=404, detail="সেমিস্টার পাওয়া যায়নি")
    
    semester.pop("_id", None)
    
    department = await db.departments.find_one({"id": semester.get("department_id")})
    if department:
        semester["department_name_bn"] = department.get("name_bn")
        
        marhala = await db.marhalas.find_one({"id": department.get("marhala_id")})
        if marhala:
            semester["marhala_id"] = marhala.get("id")
            semester["marhala_name_bn"] = marhala.get("name_bn")
    
    return {"semester": semester}


@router.patch("/academic-semesters/{semester_id}")
async def update_academic_semester(semester_id: str, data: AcademicSemesterUpdate, user=Depends(require_admin)):
    """Update an Academic Semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.academic_semesters.update_one(
        {"id": semester_id, "tenant_id": user.tenant_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="সেমিস্টার পাওয়া যায়নি")
    
    return {"message": "সেমিস্টার আপডেট হয়েছে"}


@router.delete("/academic-semesters/{semester_id}")
async def delete_academic_semester(semester_id: str, user=Depends(require_admin)):
    """Soft delete an Academic Semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    student_count = await db.students.count_documents({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if student_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"এই সেমিস্টারে {student_count}জন ছাত্র ভর্তি আছে। প্রথমে ছাত্রদের অন্য সেমিস্টারে স্থানান্তর করুন।"
        )
    
    result = await db.academic_semesters.update_one(
        {"id": semester_id, "tenant_id": user.tenant_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="সেমিস্টার পাওয়া যায়নি")
    
    logging.info(f"Deleted academic semester {semester_id} for tenant: {user.tenant_id}")
    return {"message": "সেমিস্টার মুছে ফেলা হয়েছে"}


# ============== Hierarchy Helper Endpoints ==============

@router.get("/academic-hierarchy")
async def get_academic_hierarchy(user=Depends(require_staff)):
    """Get complete academic hierarchy for dropdown cascades"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    marhalas = await db.marhalas.find({
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("order_index", 1).to_list(100)
    
    departments = await db.departments.find({
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("order_index", 1).to_list(200)
    
    semesters = await db.academic_semesters.find({
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("order_index", 1).to_list(500)
    
    for m in marhalas:
        m.pop("_id", None)
    for d in departments:
        d.pop("_id", None)
    for s in semesters:
        s.pop("_id", None)
    
    hierarchy = []
    for marhala in marhalas:
        marhala_depts = [d for d in departments if d.get("marhala_id") == marhala["id"]]
        marhala_data = {
            **marhala,
            "departments": []
        }
        
        for dept in marhala_depts:
            dept_semesters = [s for s in semesters if s.get("department_id") == dept["id"]]
            marhala_data["departments"].append({
                **dept,
                "semesters": dept_semesters
            })
        
        hierarchy.append(marhala_data)
    
    return {
        "hierarchy": hierarchy,
        "flat": {
            "marhalas": marhalas,
            "departments": departments,
            "semesters": semesters
        }
    }


@router.get("/academic-semesters/{semester_id}/students")
async def get_semester_students(semester_id: str, user=Depends(require_staff)):
    """Get all students enrolled in a specific semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semester = await db.academic_semesters.find_one({
        "id": semester_id,
        "tenant_id": user.tenant_id
    })
    
    if not semester:
        raise HTTPException(status_code=404, detail="সেমিস্টার পাওয়া যায়নি")
    
    semester.pop("_id", None)
    
    students = await db.students.find({
        "semester_id": semester_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    }).sort("roll_no", 1).to_list(1000)
    
    for s in students:
        s.pop("_id", None)
    
    return {
        "semester": semester,
        "students": students,
        "count": len(students)
    }


@router.post("/academic-semesters/{semester_id}/enroll")
async def enroll_students_in_semester(
    semester_id: str,
    data: dict,
    user=Depends(require_admin)
):
    """Enroll multiple students in a semester"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    semester = await db.academic_semesters.find_one({
        "id": semester_id,
        "tenant_id": user.tenant_id,
        "is_active": True
    })
    
    if not semester:
        raise HTTPException(status_code=404, detail="সেমিস্টার পাওয়া যায়নি")
    
    student_ids = data.get("student_ids", [])
    if not student_ids:
        raise HTTPException(status_code=400, detail="কোন ছাত্র নির্বাচন করা হয়নি")
    
    result = await db.students.update_many(
        {
            "id": {"$in": student_ids},
            "tenant_id": user.tenant_id
        },
        {
            "$set": {
                "semester_id": semester_id,
                "marhala_id": semester.get("marhala_id"),
                "department_id": semester.get("department_id"),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    logging.info(f"Enrolled {result.modified_count} students in semester {semester_id}")
    
    return {
        "message": f"{result.modified_count}জন ছাত্র সেমিস্টারে ভর্তি করা হয়েছে",
        "enrolled_count": result.modified_count
    }


# ============== Subject Endpoints ==============

@router.get("/subjects")
async def get_subjects(department_id: Optional[str] = None, semester_id: Optional[str] = None, user=Depends(require_staff)):
    """Get all Subjects, optionally filtered"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    query = {
        "tenant_id": user.tenant_id,
        "is_active": True
    }
    
    if department_id:
        query["department_id"] = department_id
    if semester_id:
        query["semester_id"] = semester_id
    
    subjects = await db.subjects.find(query).sort("name_bn", 1).to_list(200)
    
    for s in subjects:
        s.pop("_id", None)
    
    return {"subjects": subjects}

@router.post("/subjects")
async def create_subject(data: SubjectCreate, user=Depends(require_admin)):
    """Create a new Subject"""
    if db is None:
        raise HTTPException(status_code=500, detail="Database not initialized")
    
    existing = await db.subjects.find_one({
        "tenant_id": user.tenant_id,
        "name_bn": data.name_bn,
        "is_active": True
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="এই বিষয়টি ইতিমধ্যে আছে")
    
    subject = Subject(
        tenant_id=user.tenant_id,
        **data.dict()
    )
    
    await db.subjects.insert_one(subject.dict())
    
    result = subject.dict()
    result.pop("_id", None)
    
    return {"message": "বিষয় সফলভাবে তৈরি হয়েছে", "subject": result}
