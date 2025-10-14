# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
文件管理路由模块
提供文件上传、删除、下载等API接口
"""

import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..file_service import file_service

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "服务器内部错误"

router = APIRouter(
    prefix="/api/files",
    tags=["files"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


# 请求和响应模型
class FileUploadResponse(BaseModel):
    """文件上传响应"""
    file_id: str = Field(..., description="文件唯一标识")
    filename: str = Field(..., description="文件名")
    content_type: str = Field(..., description="文件类型")
    size: int = Field(..., description="文件大小（字节）")
    bucket: str = Field(..., description="存储桶名称")
    upload_time: datetime = Field(..., description="上传时间")
    url: str = Field(..., description="文件访问URL")


class FileDeleteResponse(BaseModel):
    """文件删除响应"""
    message: str = Field(default="文件删除成功")
    file_id: str = Field(..., description="已删除的文件ID")


class FileInfo(BaseModel):
    """文件信息"""
    file_id: str = Field(..., description="文件唯一标识")
    filename: str = Field(..., description="文件名")
    content_type: str = Field(..., description="文件类型")
    size: int = Field(..., description="文件大小（字节）")
    bucket: str = Field(..., description="存储桶名称")
    upload_time: datetime = Field(..., description="上传时间")
    url: str = Field(..., description="文件访问URL")


class FileListResponse(BaseModel):
    """文件列表响应"""
    total: int = Field(..., description="文件总数")
    files: List[FileInfo] = Field(default_factory=list, description="文件列表")


@router.post("/upload", response_model=FileUploadResponse, summary="上传文件")
async def upload_file(
    file: UploadFile = File(..., description="要上传的文件"),
    bucket: Optional[str] = Query(default=None, description="存储桶名称（默认使用配置文件中的default_bucket）")
):
    """
    上传文件到MinIO服务器
    
    参数:
    - file: 上传的文件
    - bucket: 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）
    
    返回:
    - 文件上传信息，包括文件ID、访问URL等
    """
    try:
        logger.info(f"开始上传文件: {file.filename}, 大小: {file.size} bytes, 存储桶: {bucket}")
        
        # 读取文件内容
        file_content = await file.read()
        
        # 上传文件到MinIO
        result = file_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
            bucket_name=bucket
        )
        
        logger.info(f"文件上传成功: {result['file_id']}")
        return FileUploadResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"文件上传失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件上传失败: {str(e)}"
        )


@router.delete("/{file_id}", response_model=FileDeleteResponse, summary="删除文件")
async def delete_file(
    file_id: str,
    bucket: Optional[str] = Query(default=None, description="存储桶名称（默认使用配置文件中的default_bucket）")
):
    """
    从MinIO服务器删除文件
    
    参数:
    - file_id: 文件唯一标识
    - bucket: 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）
    
    返回:
    - 删除成功消息
    """
    try:
        logger.info(f"开始删除文件: {file_id}, 存储桶: {bucket}")
        
        # 删除文件
        file_service.delete_file(file_id=file_id, bucket_name=bucket)
        
        logger.info(f"文件删除成功: {file_id}")
        return FileDeleteResponse(
            message="文件删除成功",
            file_id=file_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"文件删除失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件删除失败: {str(e)}"
        )


@router.get("/download/{file_id}", summary="下载文件")
async def download_file(
    file_id: str,
    bucket: Optional[str] = Query(default=None, description="存储桶名称（默认使用配置文件中的default_bucket）")
):
    """
    从MinIO服务器下载文件
    
    参数:
    - file_id: 文件唯一标识
    - bucket: 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）
    
    返回:
    - 文件流
    """
    try:
        logger.info(f"开始下载文件: {file_id}, 存储桶: {bucket}")
        
        # 获取文件
        file_data = file_service.download_file(file_id=file_id, bucket_name=bucket)
        
        logger.info(f"文件下载成功: {file_id}")
        
        # 返回文件流
        return StreamingResponse(
            file_data['content'],
            media_type=file_data['content_type'],
            headers={
                'Content-Disposition': f'attachment; filename="{file_data["filename"]}"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"文件下载失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"文件下载失败: {str(e)}"
        )


@router.get("/{file_id}/info", response_model=FileInfo, summary="获取文件信息")
async def get_file_info(
    file_id: str,
    bucket: Optional[str] = Query(default=None, description="存储桶名称（默认使用配置文件中的default_bucket）")
):
    """
    获取文件信息（不下载文件内容）
    
    参数:
    - file_id: 文件唯一标识
    - bucket: 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）
    
    返回:
    - 文件详细信息
    """
    try:
        logger.info(f"获取文件信息: {file_id}, 存储桶: {bucket}")
        
        # 获取文件信息
        info = file_service.get_file_info(file_id=file_id, bucket_name=bucket)
        
        return FileInfo(**info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"获取文件信息失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取文件信息失败: {str(e)}"
        )


@router.get("", response_model=FileListResponse, summary="获取文件列表")
async def list_files(
    bucket: Optional[str] = Query(default=None, description="存储桶名称（默认使用配置文件中的default_bucket）"),
    prefix: Optional[str] = Query(default="", description="文件名前缀过滤"),
    limit: int = Query(default=100, ge=1, le=1000, description="返回的最大文件数")
):
    """
    获取存储桶中的文件列表
    
    参数:
    - bucket: 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）
    - prefix: 文件名前缀过滤
    - limit: 返回的最大文件数
    
    返回:
    - 文件列表
    """
    try:
        logger.info(f"获取文件列表, 存储桶: {bucket}, 前缀: {prefix}, 限制: {limit}")
        
        # 获取文件列表
        result = file_service.list_files(
            bucket_name=bucket,
            prefix=prefix,
            limit=limit
        )
        
        return FileListResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"获取文件列表失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取文件列表失败: {str(e)}"
        )

