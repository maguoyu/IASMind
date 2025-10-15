# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
MinIO文件存储服务
提供文件的上传、下载、删除等功能
"""

import logging
import uuid
import io
from datetime import datetime
from typing import Optional, Dict, Any, List
from minio import Minio
from minio.error import S3Error
from fastapi import HTTPException, status
from src.config.loader import load_yaml_config

logger = logging.getLogger(__name__)

# 加载配置
_config = load_yaml_config("conf.yaml")
_minio_config = _config.get("MINIO", {})


class FileService:
    """MinIO文件存储服务类"""
    
    def __init__(
        self,
        endpoint: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        secure: Optional[bool] = None,
        default_bucket: Optional[str] = None
    ):
        """
        初始化MinIO客户端
        
        参数:
        - endpoint: MinIO服务器地址和端口（默认从配置文件读取）
        - access_key: 访问密钥（默认从配置文件读取）
        - secret_key: 密钥（默认从配置文件读取）
        - secure: 是否使用HTTPS（默认从配置文件读取）
        - default_bucket: 默认存储桶名称（默认从配置文件读取）
        """
        # 从配置文件或参数获取配置
        self.endpoint = endpoint or _minio_config.get("endpoint", "172.20.0.112:9000")
        self.access_key = access_key or _minio_config.get("access_key", "minioadmin")
        self.secret_key = secret_key or _minio_config.get("secret_key", "minioadmin")
        self.secure = secure if secure is not None else _minio_config.get("secure", False)
        self.default_bucket = default_bucket or _minio_config.get("default_bucket", "ias-mind")
        
        try:
            # 创建MinIO客户端
            self.client = Minio(
                endpoint=self.endpoint,
                access_key=self.access_key,
                secret_key=self.secret_key,
                secure=self.secure
            )
            logger.info(f"MinIO客户端初始化成功: {self.endpoint}, 默认bucket: {self.default_bucket}")
        except Exception as e:
            logger.error(f"MinIO客户端初始化失败: {str(e)}")
            raise
    
    def _ensure_bucket_exists(self, bucket_name: str):
        """
        确保存储桶存在，如果不存在则创建
        
        参数:
        - bucket_name: 存储桶名称
        """
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"创建存储桶: {bucket_name}")
        except S3Error as e:
            logger.error(f"检查/创建存储桶失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"存储桶操作失败: {str(e)}"
            )
    
    def upload_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str = "application/octet-stream",
        bucket_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        上传文件到MinIO
        
        参数:
        - file_content: 文件内容（字节）
        - filename: 文件名
        - content_type: 文件MIME类型
        - bucket_name: 存储桶名称（默认使用配置的default_bucket）
        
        返回:
        - 包含文件信息的字典
        """
        try:
            # 使用默认bucket或指定的bucket
            bucket = bucket_name or self.default_bucket
            
            # 确保存储桶存在
            self._ensure_bucket_exists(bucket)
            
            # 生成唯一的文件ID
            file_id = f"{uuid.uuid4().hex}_{filename}"
            
            # 获取文件大小
            file_size = len(file_content)
            
            # 创建文件流
            file_stream = io.BytesIO(file_content)
            
            # 上传文件
            self.client.put_object(
                bucket_name=bucket,
                object_name=file_id,
                data=file_stream,
                length=file_size,
                content_type=content_type
            )
            
            logger.info(f"文件上传成功: {file_id}, 大小: {file_size} bytes, bucket: {bucket}")
            
            # 构建文件URL
            protocol = "https" if self.secure else "http"
            file_url = f"{protocol}://{self.endpoint}/{bucket}/{file_id}"
            
            return {
                "file_id": file_id,
                "filename": filename,
                "content_type": content_type,
                "size": file_size,
                "bucket": bucket,
                "upload_time": datetime.now(),
                "url": file_url
            }
            
        except S3Error as e:
            logger.error(f"MinIO上传失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件上传到MinIO失败: {str(e)}"
            )
        except Exception as e:
            logger.error(f"文件上传失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件上传失败: {str(e)}"
            )
    
    def delete_file(self, file_id: str, bucket_name: Optional[str] = None):
        """
        从MinIO删除文件
        
        参数:
        - file_id: 文件ID（支持路径格式）
        - bucket_name: 存储桶名称（默认使用配置的default_bucket）
        """
        try:
            # 使用默认bucket或指定的bucket
            bucket = bucket_name or self.default_bucket
            
            # 确保存储桶存在
            self._ensure_bucket_exists(bucket)
            
            # 清理 file_id：去除开头的斜杠
            clean_file_id = file_id.lstrip('/')
            
            # 删除文件
            self.client.remove_object(bucket, clean_file_id)
            
            logger.info(f"文件删除成功: {clean_file_id}")
            
        except S3Error as e:
            if e.code == "NoSuchKey":
                logger.warning(f"文件不存在: {file_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"文件不存在: {file_id}"
                )
            logger.error(f"MinIO删除失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件删除失败: {str(e)}"
            )
        except Exception as e:
            logger.error(f"文件删除失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件删除失败: {str(e)}"
            )
    
    def download_file(self, file_id: str, bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        从MinIO下载文件
        
        参数:
        - file_id: 文件ID（支持路径格式，如 "管理制度/文件.png"）
        - bucket_name: 存储桶名称（默认使用配置的default_bucket）
        
        返回:
        - 包含文件内容和元数据的字典
        """
        try:
            # 使用默认bucket或指定的bucket
            bucket = bucket_name or self.default_bucket
            
            # 确保存储桶存在
            self._ensure_bucket_exists(bucket)
            
            # 清理 file_id：去除开头的斜杠（MinIO对象键不应以斜杠开头）
            clean_file_id = file_id.lstrip('/')
            
            logger.info(f"准备下载文件: 原始={file_id}, 清理后={clean_file_id}")
            
            # 获取文件对象
            response = self.client.get_object(bucket, clean_file_id)
            
            # 读取文件内容
            file_content = response.read()
            
            # 获取文件元数据
            stat = self.client.stat_object(bucket, clean_file_id)
            
            # 从file_id中提取原始文件名
            # 优先处理路径格式（包含斜杠）
            if "/" in clean_file_id:
                # 路径格式：取最后一个斜杠后的部分
                filename = clean_file_id.split("/")[-1]
            elif "_" in clean_file_id:
                # UUID格式：去掉前面的UUID部分
                filename = "_".join(clean_file_id.split("_")[1:])
            else:
                # 其他情况：直接使用file_id
                filename = clean_file_id
            
            logger.info(f"文件下载成功: {clean_file_id}, 文件名: {filename}")
            
            return {
                "content": io.BytesIO(file_content),
                "filename": filename,
                "content_type": stat.content_type or "application/octet-stream",
                "size": stat.size
            }
            
        except S3Error as e:
            if e.code == "NoSuchKey":
                logger.warning(f"文件不存在: {file_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"文件不存在: {file_id}"
                )
            logger.error(f"MinIO下载失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件下载失败: {str(e)}"
            )
        except Exception as e:
            logger.error(f"文件下载失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"文件下载失败: {str(e)}"
            )
        finally:
            if 'response' in locals():
                response.close()
                response.release_conn()
    
    def get_file_info(self, file_id: str, bucket_name: Optional[str] = None) -> Dict[str, Any]:
        """
        获取文件信息（不下载内容）
        
        参数:
        - file_id: 文件ID（支持路径格式）
        - bucket_name: 存储桶名称（默认使用配置的default_bucket）
        
        返回:
        - 文件信息字典
        """
        try:
            # 使用默认bucket或指定的bucket
            bucket = bucket_name or self.default_bucket
            
            # 确保存储桶存在
            self._ensure_bucket_exists(bucket)
            
            # 清理 file_id：去除开头的斜杠
            clean_file_id = file_id.lstrip('/')
            
            # 获取文件统计信息
            stat = self.client.stat_object(bucket, clean_file_id)
            
            # 从file_id中提取原始文件名
            if "/" in clean_file_id:
                # 路径格式：取最后一个斜杠后的部分
                filename = clean_file_id.split("/")[-1]
            elif "_" in clean_file_id:
                # UUID格式：去掉前面的UUID部分
                filename = "_".join(clean_file_id.split("_")[1:])
            else:
                # 其他情况：直接使用file_id
                filename = clean_file_id
            
            # 构建文件URL
            protocol = "https" if self.secure else "http"
            file_url = f"{protocol}://{self.endpoint}/{bucket}/{clean_file_id}"
            
            logger.info(f"获取文件信息成功: {clean_file_id}, 文件名: {filename}")
            
            return {
                "file_id": clean_file_id,
                "filename": filename,
                "content_type": stat.content_type or "application/octet-stream",
                "size": stat.size,
                "bucket": bucket,
                "upload_time": stat.last_modified,
                "url": file_url
            }
            
        except S3Error as e:
            if e.code == "NoSuchKey":
                logger.warning(f"文件不存在: {file_id}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"文件不存在: {file_id}"
                )
            logger.error(f"获取文件信息失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"获取文件信息失败: {str(e)}"
            )
        except Exception as e:
            logger.error(f"获取文件信息失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"获取文件信息失败: {str(e)}"
            )
    
    def list_files(
        self,
        bucket_name: Optional[str] = None,
        prefix: str = "",
        limit: int = 100
    ) -> Dict[str, Any]:
        """
        列出存储桶中的文件
        
        参数:
        - bucket_name: 存储桶名称（默认使用配置的default_bucket）
        - prefix: 文件名前缀过滤
        - limit: 返回的最大文件数
        
        返回:
        - 包含文件列表的字典
        """
        try:
            # 使用默认bucket或指定的bucket
            bucket = bucket_name or self.default_bucket
            
            # 确保存储桶存在
            self._ensure_bucket_exists(bucket)
            
            # 列出对象
            objects = self.client.list_objects(
                bucket,
                prefix=prefix,
                recursive=True
            )
            
            # 构建文件列表
            files = []
            protocol = "https" if self.secure else "http"
            
            for obj in objects:
                if len(files) >= limit:
                    break
                
                file_id = obj.object_name
                filename = "_".join(file_id.split("_")[1:]) if "_" in file_id else file_id
                file_url = f"{protocol}://{self.endpoint}/{bucket}/{file_id}"
                
                files.append({
                    "file_id": file_id,
                    "filename": filename,
                    "content_type": obj.content_type or "application/octet-stream",
                    "size": obj.size,
                    "bucket": bucket,
                    "upload_time": obj.last_modified,
                    "url": file_url
                })
            
            logger.info(f"获取文件列表成功, 共 {len(files)} 个文件")
            
            return {
                "total": len(files),
                "files": files
            }
            
        except S3Error as e:
            logger.error(f"列出文件失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"列出文件失败: {str(e)}"
            )
        except Exception as e:
            logger.error(f"列出文件失败: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"列出文件失败: {str(e)}"
            )


# 创建全局文件服务实例（使用配置文件中的配置）
file_service = FileService()

