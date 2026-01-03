"""
In-Memory Caching Layer for Performance Optimization
Simple TTL-based cache for dashboard stats, metadata, and dropdowns
(Redis-ready: can be swapped to Redis when needed)
"""

import time
import asyncio
from typing import Any, Optional, Callable
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class SimpleCache:
    """Thread-safe in-memory cache with TTL support"""
    
    def __init__(self):
        self._cache = {}
        self._lock = asyncio.Lock()
        
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        async with self._lock:
            if key in self._cache:
                value, expiry = self._cache[key]
                if time.time() < expiry:
                    return value
                else:
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl_seconds: int = 300):
        """Set value in cache with TTL"""
        async with self._lock:
            expiry = time.time() + ttl_seconds
            self._cache[key] = (value, expiry)
    
    async def delete(self, key: str):
        """Delete key from cache"""
        async with self._lock:
            self._cache.pop(key, None)
    
    async def clear_pattern(self, pattern: str):
        """Clear all keys matching pattern prefix"""
        async with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
    
    async def clear_all(self):
        """Clear entire cache"""
        async with self._lock:
            self._cache.clear()
    
    def stats(self) -> dict:
        """Get cache statistics"""
        now = time.time()
        valid_count = sum(1 for v in self._cache.values() if v[1] > now)
        return {
            "total_keys": len(self._cache),
            "valid_keys": valid_count,
            "expired_keys": len(self._cache) - valid_count
        }

# Global cache instance
cache = SimpleCache()

# Cache TTL constants (in seconds)
class CacheTTL:
    DASHBOARD_STATS = 300       # 5 minutes
    INSTITUTION_METADATA = 3600  # 1 hour
    CLASS_SECTION_LIST = 1800    # 30 minutes
    USER_CONTEXT = 300           # 5 minutes
    TENANT_INFO = 3600           # 1 hour

def cached(key_prefix: str, ttl: int = 300):
    """Decorator for caching async function results"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Build cache key from prefix and arguments
            cache_key = f"{key_prefix}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_value = await cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result, ttl)
            return result
        return wrapper
    return decorator

# Cache helper functions for common operations
async def get_cached_dashboard_stats(tenant_id: str, db) -> Optional[dict]:
    """Get cached dashboard statistics"""
    cache_key = f"dashboard_stats:{tenant_id}"
    return await cache.get(cache_key)

async def set_cached_dashboard_stats(tenant_id: str, stats: dict):
    """Cache dashboard statistics"""
    cache_key = f"dashboard_stats:{tenant_id}"
    await cache.set(cache_key, stats, CacheTTL.DASHBOARD_STATS)

async def get_cached_institution(tenant_id: str) -> Optional[dict]:
    """Get cached institution metadata"""
    cache_key = f"institution:{tenant_id}"
    return await cache.get(cache_key)

async def set_cached_institution(tenant_id: str, institution: dict):
    """Cache institution metadata"""
    cache_key = f"institution:{tenant_id}"
    await cache.set(cache_key, institution, CacheTTL.INSTITUTION_METADATA)

async def get_cached_classes(tenant_id: str) -> Optional[list]:
    """Get cached classes list"""
    cache_key = f"classes:{tenant_id}"
    return await cache.get(cache_key)

async def set_cached_classes(tenant_id: str, classes: list):
    """Cache classes list"""
    cache_key = f"classes:{tenant_id}"
    await cache.set(cache_key, classes, CacheTTL.CLASS_SECTION_LIST)

async def get_cached_sections(tenant_id: str) -> Optional[list]:
    """Get cached sections list"""
    cache_key = f"sections:{tenant_id}"
    return await cache.get(cache_key)

async def set_cached_sections(tenant_id: str, sections: list):
    """Cache sections list"""
    cache_key = f"sections:{tenant_id}"
    await cache.set(cache_key, sections, CacheTTL.CLASS_SECTION_LIST)

async def invalidate_tenant_cache(tenant_id: str):
    """Invalidate all caches for a tenant"""
    await cache.clear_pattern(f"dashboard_stats:{tenant_id}")
    await cache.clear_pattern(f"institution:{tenant_id}")
    await cache.clear_pattern(f"classes:{tenant_id}")
    await cache.clear_pattern(f"sections:{tenant_id}")
    logger.info(f"Cache invalidated for tenant: {tenant_id}")

logger.info("✅ Cache module initialized")
