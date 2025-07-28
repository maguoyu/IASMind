# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据源管理测试服务器
专门用于测试数据源管理功能，无需认证
"""

import logging
import asyncio
import platform

# 设置 Windows 事件循环策略
if platform.system() == 'Windows':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 导入测试版本的数据源路由
from src.server.routers.datasource_router_test import router as datasource_router
from src.database.connection import db_connection

logger = logging.getLogger(__name__)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(
    title="数据源管理测试 API",
    description="数据源管理功能测试服务器",
    version="0.1.0",
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # 允许前端访问
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头部
)

# 注册数据源路由
app.include_router(datasource_router)

@app.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库表"""
    logger.info("正在初始化数据库表...")
    try:
        success = db_connection.InitializeTables()
        if success:
            logger.info("数据库表初始化成功")
        else:
            logger.error("数据库表初始化失败")
    except Exception as e:
        logger.error(f"数据库初始化出错: {e}")

@app.get("/")
async def root():
    """根路径，返回API信息"""
    return {
        "message": "数据源管理测试 API",
        "version": "0.1.0",
        "status": "运行中",
        "endpoints": {
            "datasources": "/api/datasources",
            "docs": "/docs",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "healthy", 
        "message": "数据源管理服务运行正常",
        "database": "connected"
    }

if __name__ == "__main__":
    import uvicorn
    
    logger.info("启动数据源管理测试服务器...")
    logger.info("服务器地址: http://localhost:8000")
    logger.info("API文档: http://localhost:8000/docs")
    
    uvicorn.run(
        "test_datasource_server:app",
        host="localhost",
        port=8000,
        reload=True,
        log_level="info",
    ) 