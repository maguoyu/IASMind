# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
Redis配置模块
定义Redis连接参数和配置
"""

import os
from typing import Optional

# Redis配置
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_DB = int(os.getenv("REDIS_DB", "0"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
REDIS_SSL = os.getenv("REDIS_SSL", "false").lower() == "true"
REDIS_SSL_CERT_REQS = os.getenv("REDIS_SSL_CERT_REQS", "required")

# Redis连接池配置
REDIS_MAX_CONNECTIONS = int(os.getenv("REDIS_MAX_CONNECTIONS", "10"))
REDIS_RETRY_ON_TIMEOUT = os.getenv("REDIS_RETRY_ON_TIMEOUT", "true").lower() == "true"
REDIS_SOCKET_CONNECT_TIMEOUT = int(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", "5"))
REDIS_SOCKET_TIMEOUT = int(os.getenv("REDIS_SOCKET_TIMEOUT", "5"))

# Checkpointer配置
CHECKPOINTER_TTL = int(os.getenv("CHECKPOINTER_TTL", "86400"))  # 24小时
CHECKPOINTER_PREFIX = os.getenv("CHECKPOINTER_PREFIX", "langgraph:checkpoint:")
CHECKPOINTER_COMPRESS = os.getenv("CHECKPOINTER_COMPRESS", "true").lower() == "true" 