import logging
from typing import Optional

from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.redis import AsyncRedisSaver
import redis.asyncio as async_redis

from src.config.redis import (
    REDIS_HOST,
    REDIS_PORT,
    REDIS_DB,
    REDIS_PASSWORD,
    REDIS_SSL,
    REDIS_SSL_CERT_REQS,
    CHECKPOINTER_TTL,
)

logger = logging.getLogger(__name__)

_redis_memory: Optional[AsyncRedisSaver] = None
_redis_memory_initialized: bool = False


def get_memory():
    return MemorySaver()


def _create_async_redis_client():
    return async_redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        ssl=REDIS_SSL,
        ssl_cert_reqs=REDIS_SSL_CERT_REQS,
    )


def get_redis_memory() -> AsyncRedisSaver:
    """返回全局共享的Redis检查点存储实例。"""
    global _redis_memory
    if _redis_memory is None:
        _redis_memory = AsyncRedisSaver(
            redis_client=_create_async_redis_client(),
            ttl={"default_ttl": CHECKPOINTER_TTL},
        )
    return _redis_memory


async def ensure_redis_memory_initialized() -> AsyncRedisSaver:
    """确保Redis检查点索引已创建，避免运行时缺失索引错误。"""
    global _redis_memory_initialized
    memory = get_redis_memory()
    if _redis_memory_initialized:
        return memory

    try:
        await memory.asetup()
        _redis_memory_initialized = True
        logger.info("Redis检查点索引初始化完成")
    except Exception:
        logger.exception("Redis检查点索引初始化失败")
        raise

    return memory