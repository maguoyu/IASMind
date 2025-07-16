from langgraph.checkpoint.memory import MemorySaver
from langgraph.checkpoint.redis import AsyncRedisSaver
import redis.asyncio as async_redis
from src.config.redis import (
    REDIS_HOST, REDIS_PORT, REDIS_DB, REDIS_PASSWORD, 
    REDIS_SSL, REDIS_SSL_CERT_REQS, CHECKPOINTER_TTL
)


def get_memory():
    return MemorySaver()


def get_redis_memory():
    # 使用config/redis.py中的配置
    redis_client = async_redis.Redis(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        password=REDIS_PASSWORD,
        ssl=REDIS_SSL,
        ssl_cert_reqs=REDIS_SSL_CERT_REQS
    )
    return AsyncRedisSaver(redis_client=redis_client, ttl={"default_ttl": CHECKPOINTER_TTL})