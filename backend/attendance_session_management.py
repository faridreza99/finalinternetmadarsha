import logging
import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Body

logger = logging.getLogger(__name__)

# ================================
# MODELS
# ================================

class AttendanceSessionCreate(BaseModel):
    name: str  # e.g., "Morning", "Evening"
    start_time: str  # Format: "HH:MM" (24-hour)
    end_time: str    # Format: "HH:MM" (24-hour)
    is_active: bool = True

class AttendanceSessionUpdate(BaseModel):
    name: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: Optional[bool] = None

class AttendanceSessionResponse(BaseModel):
    id: str
    tenant_id: str
    name: str
    start_time: str
    end_time: str
    is_active: bool
    created_at: str

# ================================
# ROUTE SETUP FUNCTION
# ================================

def setup_attendance_session_routes(api_router, db, get_current_user, User):
    """Setup attendance session management routes"""

    @api_router.get("/attendance-sessions", response_model=List[AttendanceSessionResponse])
    async def get_attendance_sessions(
        active_only: bool = False,
        current_user: User = Depends(get_current_user)
    ):
        """Get all attendance sessions"""
        try:
            filter_criteria = {"tenant_id": current_user.tenant_id}
            if active_only:
                filter_criteria["is_active"] = True
            
            sessions = await db.attendance_sessions.find(filter_criteria).to_list(100)
            
            # Helper to sanitize MongoDB _id
            results = []
            for s in sessions:
                s_dict = dict(s)
                if "_id" in s_dict:
                    del s_dict["_id"]
                results.append(s_dict)
                
            return results
        except Exception as e:
            logger.error(f"Failed to fetch attendance sessions: {e}")
            raise HTTPException(status_code=500, detail="Failed to fetch attendance sessions")

    @api_router.post("/attendance-sessions", response_model=AttendanceSessionResponse)
    async def create_attendance_session(
        session_data: AttendanceSessionCreate,
        current_user: User = Depends(get_current_user)
    ):
        """Create a new attendance session"""
        if current_user.role not in ["super_admin", "admin", "principal"]:
            raise HTTPException(status_code=403, detail="Not authorized to create attendance sessions")
        
        try:
            # Validate time format
            try:
                datetime.strptime(session_data.start_time, "%H:%M")
                datetime.strptime(session_data.end_time, "%H:%M")
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM (24-hour)")

            session_id = str(uuid.uuid4())
            session_doc = {
                "id": session_id,
                "tenant_id": current_user.tenant_id,
                **session_data.dict(),
                "created_at": datetime.utcnow().isoformat(),
                "created_by": current_user.id
            }
            
            await db.attendance_sessions.insert_one(session_doc)
            
            # Remove _id for response
            if "_id" in session_doc:
                del session_doc["_id"]
                
            return session_doc
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to create attendance session: {e}")
            raise HTTPException(status_code=500, detail="Failed to create attendance session")

    @api_router.put("/attendance-sessions/{session_id}", response_model=AttendanceSessionResponse)
    async def update_attendance_session(
        session_id: str,
        session_data: AttendanceSessionUpdate,
        current_user: User = Depends(get_current_user)
    ):
        """Update an attendance session"""
        if current_user.role not in ["super_admin", "admin", "principal"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            # Validate time format if provided
            if session_data.start_time:
                try:
                    datetime.strptime(session_data.start_time, "%H:%M")
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid start_time format. Use HH:MM")
            if session_data.end_time:
                try:
                    datetime.strptime(session_data.end_time, "%H:%M")
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid end_time format. Use HH:MM")

            update_data = session_data.dict(exclude_unset=True)
            if not update_data:
                raise HTTPException(status_code=400, detail="No fields to update")

            update_data["updated_at"] = datetime.utcnow().isoformat()
            update_data["updated_by"] = current_user.id
            
            result = await db.attendance_sessions.update_one(
                {"id": session_id, "tenant_id": current_user.tenant_id},
                {"$set": update_data}
            )
            
            if result.modified_count == 0:
                # Check if it exists
                existing = await db.attendance_sessions.find_one({"id": session_id, "tenant_id": current_user.tenant_id})
                if not existing:
                    raise HTTPException(status_code=404, detail="Session not found")
            
            # Fetch updated document
            updated_session = await db.attendance_sessions.find_one({"id": session_id, "tenant_id": current_user.tenant_id})
            if "_id" in updated_session:
                del updated_session["_id"]
                
            return updated_session
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to update attendance session: {e}")
            raise HTTPException(status_code=500, detail="Failed to update attendance session")

    @api_router.delete("/attendance-sessions/{session_id}")
    async def delete_attendance_session(
        session_id: str,
        current_user: User = Depends(get_current_user)
    ):
        """Delete an attendance session"""
        if current_user.role not in ["super_admin", "admin"]:
            raise HTTPException(status_code=403, detail="Not authorized")
        
        try:
            result = await db.attendance_sessions.delete_one({
                "id": session_id,
                "tenant_id": current_user.tenant_id
            })
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Session not found")
            
            return {"message": "Attendance session deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Failed to delete attendance session: {e}")
            raise HTTPException(status_code=500, detail="Failed to delete attendance session")
