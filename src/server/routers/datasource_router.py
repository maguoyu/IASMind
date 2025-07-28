# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据源管理API路由
提供数据源的CRUD操作和连接测试功能
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field

from src.database.models import DataSource
from ..auth_middleware import GetCurrentUser, GetCurrentAdminUser

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
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "f8c3de3d-1fea-4d7c-a8b0-29f63c4c3454",
                "name": "生产环境MySQL",
                "description": "生产环境主数据库",
                "type": "mysql",
                "host": "localhost",
                "port": 3306,
                "username": "root",
                "database_name": "production",
                "schema_name": None,
                "service_name": None,
                "ssl": False,
                "status": "active",
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00",
                "last_connected_at": "2023-01-01T00:00:00",
                "error_message": None
            }
        }

# 数据源测试连接响应模型
class ConnectionTestResponse(BaseModel):
    success: bool = Field(..., description="连接是否成功")
    message: str = Field(..., description="连接结果消息")
    details: Dict[str, Any] = Field(default_factory=dict, description="详细信息")


@router.post("", response_model=DataSourceResponse, status_code=201)
async def create_datasource(
    data: DataSourceCreate,
    user=Depends(GetCurrentAdminUser)
):
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
async def get_all_datasources(
    user=Depends(GetCurrentUser)
):
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
async def get_datasource(
    datasource_id: str,
    user=Depends(GetCurrentUser)
):
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


@router.put("/{datasource_id}", response_model=DataSourceResponse)
async def update_datasource(
    datasource_id: str,
    data: DataSourceUpdate,
    user=Depends(GetCurrentAdminUser)
):
    """更新数据源信息"""
    try:
        datasource = DataSource.GetById(datasource_id)
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"未找到ID为 {datasource_id} 的数据源")
        
        # 更新字段
        if data.name is not None:
            datasource.name = data.name
        if data.description is not None:
            datasource.description = data.description
        if data.host is not None:
            datasource.host = data.host
        if data.port is not None:
            datasource.port = data.port
        if data.username is not None:
            datasource.username = data.username
        if data.password is not None:
            datasource.password = data.password
        if data.database_name is not None:
            datasource.database = data.database_name
        if data.schema_name is not None:
            datasource.schema = data.schema_name
        if data.service_name is not None:
            datasource.service_name = data.service_name
        if data.ssl is not None:
            datasource.ssl = data.ssl
        if data.ssl_ca is not None:
            datasource.ssl_ca = data.ssl_ca
        if data.ssl_cert is not None:
            datasource.ssl_cert = data.ssl_cert
        if data.ssl_key is not None:
            datasource.ssl_key = data.ssl_key
        
        # 数据源信息变更后，设置状态为未连接
        if (data.host or data.port or data.username or data.password or 
            data.database_name or data.schema_name or data.service_name or 
            data.ssl is not None or data.ssl_ca or data.ssl_cert or data.ssl_key):
            datasource.status = 'inactive'
        
        # 保存更改
        success = datasource.Update()
        
        if not success:
            raise HTTPException(status_code=500, detail="更新数据源信息失败")
        
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
        logger.exception(f"更新数据源信息失败: {e}")
        raise HTTPException(status_code=500, detail=f"更新数据源信息失败: {str(e)}")


@router.delete("/{datasource_id}", status_code=204)
async def delete_datasource(
    datasource_id: str,
    user=Depends(GetCurrentAdminUser)
):
    """删除数据源"""
    try:
        datasource = DataSource.GetById(datasource_id)
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"未找到ID为 {datasource_id} 的数据源")
        
        success = datasource.Delete()
        
        if not success:
            raise HTTPException(status_code=500, detail="删除数据源失败")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"删除数据源失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除数据源失败: {str(e)}")


@router.post("/{datasource_id}/test", response_model=ConnectionTestResponse)
async def test_connection(
    datasource_id: str,
    user=Depends(GetCurrentUser)
):
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
async def test_connection_params(
    data: DataSourceCreate = Body(...),
    user=Depends(GetCurrentUser)
):
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


@router.get("/{datasource_id}/tables")
async def get_tables(
    datasource_id: str,
    user=Depends(GetCurrentUser)
):
    """获取数据源中的表列表"""
    try:
        datasource = DataSource.GetById(datasource_id)
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"未找到ID为 {datasource_id} 的数据源")
        
        # 测试连接并获取表列表
        if datasource.type == 'mysql':
            import pymysql
            connection = pymysql.connect(
                host=datasource.host,
                port=datasource.port,
                user=datasource.username,
                password=datasource.password,
                database=datasource.database,
                charset='utf8mb4'
            )
            
            with connection.cursor() as cursor:
                cursor.execute("SHOW TABLES")
                tables = [row[0] for row in cursor.fetchall()]
            
            connection.close()
            
            return {
                "success": True,
                "tables": tables,
                "count": len(tables)
            }
            
        elif datasource.type == 'oracle':
            try:
                import cx_Oracle
            except ImportError:
                return {
                    "success": False,
                    "message": "未安装cx_Oracle驱动程序",
                    "tables": []
                }
            
            # 构建DSN
            if datasource.service_name:
                dsn = cx_Oracle.makedsn(datasource.host, datasource.port, service_name=datasource.service_name)
            else:
                dsn = cx_Oracle.makedsn(datasource.host, datasource.port, sid=datasource.database)
            
            connection = cx_Oracle.connect(
                user=datasource.username,
                password=datasource.password,
                dsn=dsn
            )
            
            with connection.cursor() as cursor:
                schema = datasource.schema or datasource.username.upper()
                cursor.execute(f"SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = '{schema}' ORDER BY TABLE_NAME")
                tables = [row[0] for row in cursor.fetchall()]
            
            connection.close()
            
            return {
                "success": True,
                "tables": tables,
                "count": len(tables),
                "schema": schema
            }
        
        else:
            return {
                "success": False,
                "message": f"不支持的数据源类型: {datasource.type}",
                "tables": []
            }
    
    except Exception as e:
        logger.exception(f"获取表列表失败: {e}")
        return {
            "success": False, 
            "message": f"获取表列表失败: {str(e)}",
            "tables": []
        }


@router.get("/{datasource_id}/tables/{table_name}/columns")
async def get_table_columns(
    datasource_id: str,
    table_name: str,
    user=Depends(GetCurrentUser)
):
    """获取指定表的列信息"""
    try:
        datasource = DataSource.GetById(datasource_id)
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"未找到ID为 {datasource_id} 的数据源")
        
        if datasource.type == 'mysql':
            import pymysql
            connection = pymysql.connect(
                host=datasource.host,
                port=datasource.port,
                user=datasource.username,
                password=datasource.password,
                database=datasource.database,
                charset='utf8mb4'
            )
            
            with connection.cursor() as cursor:
                cursor.execute(f"DESCRIBE {table_name}")
                columns = []
                for row in cursor.fetchall():
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "null": row[2] == "YES",
                        "key": row[3],
                        "default": row[4],
                        "extra": row[5]
                    })
            
            connection.close()
            
            return {
                "success": True,
                "table_name": table_name,
                "columns": columns,
                "count": len(columns)
            }
            
        elif datasource.type == 'oracle':
            try:
                import cx_Oracle
            except ImportError:
                return {
                    "success": False,
                    "message": "未安装cx_Oracle驱动程序",
                    "columns": []
                }
            
            # 构建DSN
            if datasource.service_name:
                dsn = cx_Oracle.makedsn(datasource.host, datasource.port, service_name=datasource.service_name)
            else:
                dsn = cx_Oracle.makedsn(datasource.host, datasource.port, sid=datasource.database)
            
            connection = cx_Oracle.connect(
                user=datasource.username,
                password=datasource.password,
                dsn=dsn
            )
            
            with connection.cursor() as cursor:
                schema = datasource.schema or datasource.username.upper()
                sql = f"""
                SELECT COLUMN_NAME, DATA_TYPE, NULLABLE, DATA_LENGTH, DATA_PRECISION, DATA_SCALE
                FROM ALL_TAB_COLUMNS 
                WHERE OWNER = '{schema}' AND TABLE_NAME = '{table_name.upper()}'
                ORDER BY COLUMN_ID
                """
                cursor.execute(sql)
                columns = []
                for row in cursor.fetchall():
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "null": row[2] == "Y",
                        "length": row[3],
                        "precision": row[4],
                        "scale": row[5]
                    })
            
            connection.close()
            
            return {
                "success": True,
                "table_name": table_name,
                "columns": columns,
                "count": len(columns),
                "schema": schema
            }
        
        else:
            return {
                "success": False,
                "message": f"不支持的数据源类型: {datasource.type}",
                "columns": []
            }
    
    except Exception as e:
        logger.exception(f"获取表列信息失败: {e}")
        return {
            "success": False,
            "message": f"获取表列信息失败: {str(e)}",
            "columns": []
        } 