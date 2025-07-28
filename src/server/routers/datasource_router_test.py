# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据源管理API路由（测试版本，无需认证）
提供数据源的CRUD操作和连接测试功能
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field

from src.database.models import DataSource

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/datasources",
    tags=["数据源管理"],
    responses={404: {"detail": "找不到资源"}},
)

# 数据源创建请求模型
class DataSourceCreate(BaseModel):
    name: str = Field(..., description="数据源名称")
    description: str = Field("", description="数据源描述")
    type: str = Field(..., description="数据源类型，如 'mysql' 或 'oracle'")
    host: str = Field(..., description="主机名或IP地址")
    port: int = Field(..., description="端口号")
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    database_name: str = Field(..., description="数据库名")
    schema_name: Optional[str] = Field(None, description="模式名，主要用于Oracle")
    service_name: Optional[str] = Field(None, description="服务名，主要用于Oracle")
    ssl: bool = Field(False, description="是否使用SSL连接")
    ssl_ca: Optional[str] = Field(None, description="SSL CA证书")
    ssl_cert: Optional[str] = Field(None, description="SSL客户端证书")
    ssl_key: Optional[str] = Field(None, description="SSL客户端密钥")

# 数据源更新请求模型
class DataSourceUpdate(BaseModel):
    name: Optional[str] = Field(None, description="数据源名称")
    description: Optional[str] = Field(None, description="数据源描述")
    host: Optional[str] = Field(None, description="主机名或IP地址")
    port: Optional[int] = Field(None, description="端口号")
    username: Optional[str] = Field(None, description="用户名")
    password: Optional[str] = Field(None, description="密码")
    database_name: Optional[str] = Field(None, description="数据库名")
    schema_name: Optional[str] = Field(None, description="模式名，主要用于Oracle")
    service_name: Optional[str] = Field(None, description="服务名，主要用于Oracle")
    ssl: Optional[bool] = Field(None, description="是否使用SSL连接")
    ssl_ca: Optional[str] = Field(None, description="SSL CA证书")
    ssl_cert: Optional[str] = Field(None, description="SSL客户端证书")
    ssl_key: Optional[str] = Field(None, description="SSL客户端密钥")

# 数据源响应模型
class DataSourceResponse(BaseModel):
    id: str = Field(..., description="数据源ID")
    name: str = Field(..., description="数据源名称")
    description: str = Field("", description="数据源描述")
    type: str = Field(..., description="数据源类型")
    host: str = Field(..., description="主机名或IP地址")
    port: int = Field(..., description="端口号")
    username: str = Field(..., description="用户名")
    database_name: str = Field(..., description="数据库名")
    schema_name: Optional[str] = Field(None, description="模式名")
    service_name: Optional[str] = Field(None, description="服务名")
    ssl: bool = Field(False, description="是否使用SSL")
    status: str = Field(..., description="连接状态")
    created_at: str = Field(..., description="创建时间")
    updated_at: str = Field(..., description="更新时间")
    last_connected_at: Optional[str] = Field(None, description="最后连接时间")
    error_message: Optional[str] = Field(None, description="错误信息")

# 数据源测试连接响应模型
class ConnectionTestResponse(BaseModel):
    success: bool = Field(..., description="连接是否成功")
    message: str = Field(..., description="连接结果消息")
    details: Dict[str, Any] = Field(default_factory=dict, description="详细信息")


@router.post("", response_model=DataSourceResponse, status_code=201)
async def create_datasource(data: DataSourceCreate):
    """创建新数据源"""
    try:
        datasource = DataSource.Create(
            name=data.name,
            description=data.description,
            type=data.type,
            host=data.host,
            port=data.port,
            username=data.username,
            password=data.password,
            database=data.database_name,
            schema=data.schema_name,
            service_name=data.service_name,
            ssl=data.ssl,
            ssl_ca=data.ssl_ca,
            ssl_cert=data.ssl_cert,
            ssl_key=data.ssl_key
        )
        
        return {
            "id": datasource.id,
            "name": datasource.name,
            "description": datasource.description,
            "type": datasource.type,
            "host": datasource.host,
            "port": datasource.port,
            "username": datasource.username,
            "database_name": datasource.database,
            "schema_name": datasource.schema,
            "service_name": datasource.service_name,
            "ssl": datasource.ssl,
            "status": datasource.status,
            "created_at": str(datasource.created_at) if datasource.created_at else "",
            "updated_at": str(datasource.updated_at) if datasource.updated_at else "",
            "last_connected_at": str(datasource.last_connected_at) if datasource.last_connected_at else None,
            "error_message": datasource.error_message
        }
    except Exception as e:
        logger.exception(f"创建数据源失败: {e}")
        raise HTTPException(status_code=500, detail=f"创建数据源失败: {str(e)}")


@router.get("", response_model=List[DataSourceResponse])
async def get_all_datasources():
    """获取所有数据源"""
    try:
        datasources = DataSource.GetAll()
        
        return [{
            "id": ds.id,
            "name": ds.name,
            "description": ds.description,
            "type": ds.type,
            "host": ds.host,
            "port": ds.port,
            "username": ds.username,
            "database_name": ds.database,
            "schema_name": ds.schema,
            "service_name": ds.service_name,
            "ssl": ds.ssl,
            "status": ds.status,
            "created_at": str(ds.created_at) if ds.created_at else "",
            "updated_at": str(ds.updated_at) if ds.updated_at else "",
            "last_connected_at": str(ds.last_connected_at) if ds.last_connected_at else None,
            "error_message": ds.error_message
        } for ds in datasources]
    except Exception as e:
        logger.exception(f"获取数据源列表失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取数据源列表失败: {str(e)}")


@router.get("/{datasource_id}", response_model=DataSourceResponse)
async def get_datasource(datasource_id: str):
    """根据ID获取指定数据源的详细信息"""
    try:
        datasource = DataSource.GetById(datasource_id)
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"未找到ID为 {datasource_id} 的数据源")
        
        return {
            "id": datasource.id,
            "name": datasource.name,
            "description": datasource.description,
            "type": datasource.type,
            "host": datasource.host,
            "port": datasource.port,
            "username": datasource.username,
            "database_name": datasource.database,
            "schema_name": datasource.schema,
            "service_name": datasource.service_name,
            "ssl": datasource.ssl,
            "status": datasource.status,
            "created_at": str(datasource.created_at) if datasource.created_at else "",
            "updated_at": str(datasource.updated_at) if datasource.updated_at else "",
            "last_connected_at": str(datasource.last_connected_at) if datasource.last_connected_at else None,
            "error_message": datasource.error_message
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"获取数据源信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"获取数据源信息失败: {str(e)}")


@router.post("/{datasource_id}/test", response_model=ConnectionTestResponse)
async def test_connection(datasource_id: str):
    """测试指定数据源的连接"""
    try:
        datasource = DataSource.GetById(datasource_id)
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"未找到ID为 {datasource_id} 的数据源")
        
        result = datasource.TestConnection()
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"测试数据源连接失败: {e}")
        raise HTTPException(status_code=500, detail=f"测试数据源连接失败: {str(e)}")


@router.post("/test-connection", response_model=ConnectionTestResponse)
async def test_connection_params(data: DataSourceCreate = Body(...)):
    """使用提供的参数测试数据库连接(不保存)"""
    try:
        # 创建临时数据源对象
        datasource = DataSource(
            name=data.name,
            description=data.description,
            type=data.type,
            host=data.host,
            port=data.port,
            username=data.username,
            password=data.password,
            database=data.database_name,
            schema=data.schema_name,
            service_name=data.service_name,
            ssl=data.ssl,
            ssl_ca=data.ssl_ca,
            ssl_cert=data.ssl_cert,
            ssl_key=data.ssl_key
        )
        
        # 测试连接但不保存状态
        result = datasource.TestConnection()
        return result
    except Exception as e:
        logger.exception(f"测试数据源连接失败: {e}")
        return {
            "success": False,
            "message": f"连接失败: {str(e)}",
            "details": {}
        } 