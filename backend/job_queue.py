"""
Simple in-memory background job queue for long-running tasks like PDF/ID Card generation.
Uses asyncio for non-blocking execution. Can be upgraded to Celery/RQ for production scale.
"""

import asyncio
import uuid
import logging
from datetime import datetime
from typing import Dict, Optional, Callable, Any
from enum import Enum
from pydantic import BaseModel

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class Job(BaseModel):
    id: str
    status: JobStatus = JobStatus.PENDING
    job_type: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress: int = 0
    total: int = 0
    result: Optional[Any] = None
    error: Optional[str] = None
    tenant_id: str

class JobQueue:
    """Simple in-memory job queue with status tracking"""
    
    def __init__(self, max_concurrent: int = 3):
        self.jobs: Dict[str, Job] = {}
        self.max_concurrent = max_concurrent
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._cleanup_interval = 3600  # Cleanup old jobs every hour
        self._job_ttl = 86400  # Keep completed jobs for 24 hours
    
    def create_job(self, job_type: str, tenant_id: str, total: int = 0) -> Job:
        """Create a new job and return its ID"""
        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            job_type=job_type,
            created_at=datetime.utcnow(),
            tenant_id=tenant_id,
            total=total
        )
        self.jobs[job_id] = job
        logging.info(f"Created job {job_id} of type {job_type} for tenant {tenant_id}")
        return job
    
    def get_job(self, job_id: str) -> Optional[Job]:
        """Get job status by ID"""
        return self.jobs.get(job_id)
    
    def get_tenant_jobs(self, tenant_id: str, job_type: Optional[str] = None) -> list:
        """Get all jobs for a tenant"""
        jobs = [j for j in self.jobs.values() if j.tenant_id == tenant_id]
        if job_type:
            jobs = [j for j in jobs if j.job_type == job_type]
        return sorted(jobs, key=lambda j: j.created_at, reverse=True)
    
    def update_progress(self, job_id: str, progress: int):
        """Update job progress"""
        if job_id in self.jobs:
            self.jobs[job_id].progress = progress
    
    async def run_job(self, job_id: str, task_fn: Callable, *args, **kwargs):
        """Run a job in the background with concurrency control"""
        job = self.jobs.get(job_id)
        if not job:
            logging.error(f"Job {job_id} not found")
            return
        
        async with self._semaphore:
            try:
                job.status = JobStatus.RUNNING
                job.started_at = datetime.utcnow()
                logging.info(f"Starting job {job_id}")
                
                # Run the task
                result = await task_fn(job_id, *args, **kwargs)
                
                job.status = JobStatus.COMPLETED
                job.completed_at = datetime.utcnow()
                job.result = result
                job.progress = job.total
                logging.info(f"Job {job_id} completed successfully")
                
            except Exception as e:
                job.status = JobStatus.FAILED
                job.completed_at = datetime.utcnow()
                job.error = str(e)
                logging.error(f"Job {job_id} failed: {e}")
    
    def cleanup_old_jobs(self):
        """Remove completed/failed jobs older than TTL"""
        now = datetime.utcnow()
        to_remove = []
        for job_id, job in self.jobs.items():
            if job.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                if job.completed_at and (now - job.completed_at).total_seconds() > self._job_ttl:
                    to_remove.append(job_id)
        
        for job_id in to_remove:
            del self.jobs[job_id]
        
        if to_remove:
            logging.info(f"Cleaned up {len(to_remove)} old jobs")

# Global job queue instance
job_queue = JobQueue(max_concurrent=3)
