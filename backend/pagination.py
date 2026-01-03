"""
Pagination utilities for enforcing consistent pagination across all list endpoints.
Limits are capped to prevent memory issues with large datasets.
"""

from typing import Optional
from pydantic import BaseModel

MAX_PAGE_SIZE = 100
DEFAULT_PAGE_SIZE = 50

class PaginationParams(BaseModel):
    """Standard pagination parameters"""
    page: int = 1
    limit: int = DEFAULT_PAGE_SIZE
    
    @property
    def skip(self) -> int:
        return (self.page - 1) * self.limit
    
    @property
    def effective_limit(self) -> int:
        """Cap limit to MAX_PAGE_SIZE to prevent memory issues"""
        return min(self.limit, MAX_PAGE_SIZE)

class PaginatedResponse(BaseModel):
    """Standard paginated response wrapper"""
    items: list
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool

def get_pagination_params(
    page: int = 1,
    limit: int = DEFAULT_PAGE_SIZE
) -> PaginationParams:
    """Get validated pagination parameters with capped limits"""
    return PaginationParams(
        page=max(1, page),
        limit=min(max(1, limit), MAX_PAGE_SIZE)
    )

def create_paginated_response(
    items: list,
    total: int,
    page: int,
    limit: int
) -> dict:
    """Create a standardized paginated response"""
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_prev": page > 1
    }
