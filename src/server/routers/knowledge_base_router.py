# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
知识库管理API路由
提供文件上传、文件列表、知识库管理等功能
"""

import os
import logging
import shutil
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import uuid

from src.database.models import KnowledgeBase, FileDocument
from src.database.connection import db_connection

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/knowledge_base",
    tags=["knowledge_base"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)

# 文件存储目录
FILE_PATH = os.getenv("FILE_PATH", "uploads")
os.makedirs(FILE_PATH, exist_ok=True)


class KnowledgeBaseCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="知识库名称")
    description: str = Field("", max_length=1000, description="知识库描述")
    embedding_model: str = Field("text-embedding-3-small", description="嵌入模型")
    chunk_size: int = Field(1000, ge=100, le=5000, description="分块大小")
    chunk_overlap: int = Field(200, ge=0, le=1000, description="分块重叠")


class KnowledgeBaseUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="知识库名称")
    description: Optional[str] = Field(None, max_length=1000, description="知识库描述")
    embedding_model: Optional[str] = Field(None, description="嵌入模型")
    chunk_size: Optional[int] = Field(None, ge=100, le=5000, description="分块大小")
    chunk_overlap: Optional[int] = Field(None, ge=0, le=1000, description="分块重叠")
    status: Optional[str] = Field(None, description="状态")


class FileUploadResponse(BaseModel):
    success: bool
    message: str
    file_id: Optional[str] = None
    file_info: Optional[dict] = None


class FileListResponse(BaseModel):
    files: List[dict]
    total: int
    page: int
    page_size: int


class KnowledgeBaseListResponse(BaseModel):
    knowledge_bases: List[dict]
    total: int


class BatchVectorizeRequest(BaseModel):
    file_ids: List[str] = Field(..., description="文件ID列表")
    config: Optional[dict] = Field(None, description="向量化配置")


class HealthCheckResponse(BaseModel):
    status: str
    database: str
    file_path: str
    timestamp: str


@router.on_event("startup")
async def startup_event():
    """应用启动时初始化数据库"""
    try:
        db_connection.InitializeTables()
        logger.info("知识库数据库初始化完成")
    except Exception as e:
        logger.error(f"知识库数据库初始化失败: {e}")
        raise


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """健康检查接口"""
    try:
        # 检查数据库连接
        db_connection.ExecuteQuery("SELECT 1")
        db_status = "connected"
    except Exception as e:
        logger.error(f"数据库连接失败: {e}")
        db_status = "disconnected"
    
    # 检查上传目录
    upload_status = "accessible" if os.access(FILE_PATH, os.W_OK) else "not_accessible"
    
    return HealthCheckResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        database=db_status,
        file_path=upload_status,
        timestamp=datetime.now().isoformat()
    )


# 知识库管理API
@router.post("/knowledge_bases", response_model=dict)
async def CreateKnowledgeBase(request: KnowledgeBaseCreateRequest):
    """创建知识库"""
    try:
        # 检查知识库名称是否已存在
        existing_kbs = KnowledgeBase.GetAll()
        for kb in existing_kbs:
            if kb.name == request.name:
                raise HTTPException(status_code=400, detail="知识库名称已存在")
        
        kb = KnowledgeBase.Create(
            name=request.name,
            description=request.description,
            embedding_model=request.embedding_model,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        return {"success": True, "knowledge_base": kb.ToDict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"创建知识库失败: {e}")
        raise HTTPException(status_code=500, detail="创建知识库失败")


@router.get("/knowledge_bases", response_model=KnowledgeBaseListResponse)
async def GetKnowledgeBases(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选"),
    search: Optional[str] = Query(None, description="搜索关键词")
):
    """获取知识库列表"""
    try:
        if status:
            knowledge_bases = KnowledgeBase.GetByStatus(status)
        else:
            knowledge_bases = KnowledgeBase.GetAll()
        
        # 搜索过滤
        if search:
            knowledge_bases = [
                kb for kb in knowledge_bases 
                if search.lower() in kb.name.lower() or search.lower() in kb.description.lower()
            ]
        
        # 分页处理
        total = len(knowledge_bases)
        start = (page - 1) * page_size
        end = start + page_size
        paged_kbs = knowledge_bases[start:end]
        
        return KnowledgeBaseListResponse(
            knowledge_bases=[kb.ToDict() for kb in paged_kbs],
            total=total
        )
    except Exception as e:
        logger.error(f"获取知识库列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取知识库列表失败")


@router.get("/knowledge_bases/{kb_id}", response_model=dict)
async def GetKnowledgeBase(kb_id: str):
    """获取知识库详情"""
    try:
        kb = KnowledgeBase.GetById(kb_id)
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 获取该知识库下的文件列表
        files = FileDocument.GetByKnowledgeBase(kb_id, limit=10)
        
        return {
            "success": True, 
            "knowledge_base": kb.ToDict(),
            "recent_files": [f.ToDict() for f in files]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取知识库详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取知识库详情失败")


@router.put("/knowledge_bases/{kb_id}", response_model=dict)
async def UpdateKnowledgeBase(kb_id: str, request: KnowledgeBaseUpdateRequest):
    """更新知识库"""
    try:
        kb = KnowledgeBase.GetById(kb_id)
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        update_data = {}
        if request.name is not None:
            # 检查名称是否与其他知识库重复
            existing_kbs = KnowledgeBase.GetAll()
            for existing_kb in existing_kbs:
                if existing_kb.id != kb_id and existing_kb.name == request.name:
                    raise HTTPException(status_code=400, detail="知识库名称已存在")
            update_data['name'] = request.name
        if request.description is not None:
            update_data['description'] = request.description
        if request.embedding_model is not None:
            update_data['embedding_model'] = request.embedding_model
        if request.chunk_size is not None:
            update_data['chunk_size'] = request.chunk_size
        if request.chunk_overlap is not None:
            update_data['chunk_overlap'] = request.chunk_overlap
        if request.status is not None:
            update_data['status'] = request.status
        
        if update_data:
            success = kb.Update(**update_data)
            if not success:
                raise HTTPException(status_code=500, detail="更新知识库失败")
        
        return {"success": True, "knowledge_base": kb.ToDict()}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新知识库失败: {e}")
        raise HTTPException(status_code=500, detail="更新知识库失败")


@router.delete("/knowledge_bases/{kb_id}", response_model=dict)
async def DeleteKnowledgeBase(kb_id: str):
    """删除知识库"""
    try:
        kb = KnowledgeBase.GetById(kb_id)
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 删除知识库下的所有文件
        files = FileDocument.GetByKnowledgeBase(kb_id, limit=1000)
        for file in files:
            if os.path.exists(file.file_path):
                os.remove(file.file_path)
            file.Delete()
        
        # 删除知识库
        success = kb.Delete()
        if not success:
            raise HTTPException(status_code=500, detail="删除知识库失败")
        
        return {"success": True, "message": "知识库删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除知识库失败: {e}")
        raise HTTPException(status_code=500, detail="删除知识库失败")


# 文件管理API
@router.post("/upload", response_model=FileUploadResponse)
async def UploadFile(
    file: UploadFile = File(...),
    description: str = Form("")
):
    """上传文件到知识库"""
    try:
        # 直接使用默认知识库，不要求用户选择
        # 获取第一个可用的知识库
        all_kbs = KnowledgeBase.GetByStatus("active")
        if all_kbs:
            knowledge_base_id = all_kbs[0].id
            logger.info(f"使用默认知识库: {all_kbs[0].name} (ID: {knowledge_base_id})")
        else:
            # 如果没有可用的知识库，创建一个默认知识库
            default_kb = KnowledgeBase.Create(
                name="默认知识库",
                description="系统自动创建的默认知识库",
                embedding_model="text-embedding-3-small"
            )
            knowledge_base_id = default_kb.id
            logger.info(f"创建默认知识库: {default_kb.name} (ID: {knowledge_base_id})")
        
        # 验证知识库是否存在
        kb = KnowledgeBase.GetById(str(knowledge_base_id))
        if not kb:
            raise HTTPException(status_code=404, detail="知识库不存在")
        
        # 验证文件类型
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/markdown',
            'application/json',
            'text/csv'
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="不支持的文件类型")
        
        # 验证文件大小 (50MB)
        max_size = 50 * 1024 * 1024
        if file.size > max_size:
            raise HTTPException(status_code=400, detail="文件大小超过限制")
        
        # 生成文件路径
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(FILE_PATH, safe_filename)
        
        # 保存文件
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 创建文件文档记录
        metadata = {
            "description": description,
            "original_filename": file.filename,
            "uploaded_by": "system",  # 可以从认证信息中获取
            "file_size_mb": round(file.size / (1024 * 1024), 2)
        }
        
        doc = FileDocument.Create(
            name=file.filename,
            file_type=file.content_type,
            size=file.size,
            knowledge_base_id=str(knowledge_base_id),
            file_path=file_path,
            metadata=metadata
        )
        
        return FileUploadResponse(
            success=True,
            message="文件上传成功",
            file_id=doc.id,
            file_info=doc.ToDict()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail="文件上传失败")


@router.get("/files", response_model=FileListResponse)
async def GetFiles(
    knowledge_base_id: Optional[str] = Query(None, description="知识库ID"),
    status: Optional[str] = Query(None, description="文件状态"),
    file_type: Optional[str] = Query(None, description="文件类型"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    sort_by: Optional[str] = Query("uploaded_at", description="排序字段"),
    sort_order: Optional[str] = Query("desc", description="排序方向")
):
    """获取文件列表"""
    try:
        files = FileDocument.GetAll(
            limit=page_size,
            offset=(page - 1) * page_size,
            status=status,
            file_type=file_type,
            search=search,
            sort_by=sort_by or "uploaded_at",
            sort_order=sort_order or "desc",
            knowledge_base_id=knowledge_base_id
        )
        # Python层过滤已移除
        
        # 获取总数
        total_files = FileDocument.GetAll(limit=10000, status=status, file_type=file_type, search=search, knowledge_base_id=knowledge_base_id)
        total = len(total_files)
        
        return FileListResponse(
            files=[f.ToDict() for f in files],
            total=total,
            page=page,
            page_size=page_size
        )
        
    except Exception as e:
        logger.error(f"获取文件列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取文件列表失败")


@router.get("/files/{file_id}", response_model=dict)
async def GetFile(file_id: str):
    """获取文件详情"""
    try:
        doc = FileDocument.GetById(file_id)
        if not doc:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 获取知识库信息
        kb = KnowledgeBase.GetById(doc.knowledge_base_id)
        
        return {
            "success": True, 
            "file": doc.ToDict(),
            "knowledge_base": kb.ToDict() if kb else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件详情失败: {e}")
        raise HTTPException(status_code=500, detail="获取文件详情失败")


@router.delete("/files/{file_id}", response_model=dict)
async def DeleteFile(file_id: str):
    """删除文件"""
    try:
        doc = FileDocument.GetById(file_id)
        if not doc:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # 删除物理文件
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
        
        # 删除数据库记录
        success = doc.Delete()
        if not success:
            raise HTTPException(status_code=500, detail="删除文件失败")
        
        return {"success": True, "message": "文件删除成功"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除文件失败: {e}")
        raise HTTPException(status_code=500, detail="删除文件失败")


@router.post("/files/{file_id}/vectorize", response_model=dict)
async def VectorizeFile(file_id: str):
    """向量化文件"""
    try:
        doc = FileDocument.GetById(file_id)
        if not doc:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        if doc.status == "vectorized":
            return {"success": True, "message": "文件已经向量化"}
        
        if doc.status == "processing":
            return {"success": True, "message": "文件正在处理中"}
        
        # 更新状态为处理中
        doc.UpdateStatus("processing")
        
        # TODO: 这里应该调用实际的向量化服务
        # 目前只是模拟向量化过程
        import asyncio
        await asyncio.sleep(2)  # 模拟处理时间
        
        # 模拟向量化结果
        vector_count = 100 + (doc.size // 1000)  # 根据文件大小估算向量数量
        success = doc.UpdateVectorization(vector_count)
        
        if success:
            return {"success": True, "message": "文件向量化成功", "vector_count": vector_count}
        else:
            raise HTTPException(status_code=500, detail="文件向量化失败")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件向量化失败: {e}")
        raise HTTPException(status_code=500, detail="文件向量化失败")


@router.post("/files/batch_vectorize", response_model=dict)
async def BatchVectorizeFiles(request: BatchVectorizeRequest):
    """批量向量化文件"""
    try:
        results = []
        for file_id in request.file_ids:
            try:
                doc = FileDocument.GetById(file_id)
                if not doc:
                    results.append({"file_id": file_id, "status": "failed", "message": "文件不存在"})
                    continue
                
                if doc.status == "vectorized":
                    results.append({"file_id": file_id, "status": "skipped", "message": "文件已经向量化"})
                    continue
                
                if doc.status == "processing":
                    results.append({"file_id": file_id, "status": "skipped", "message": "文件正在处理中"})
                    continue
                
                # 更新状态为处理中
                doc.UpdateStatus("processing")
                
                # 模拟向量化过程
                import asyncio
                await asyncio.sleep(1)
                
                # 模拟向量化结果
                vector_count = 100 + (doc.size // 1000)
                success = doc.UpdateVectorization(vector_count)
                
                if success:
                    results.append({
                        "file_id": file_id, 
                        "status": "success", 
                        "message": "向量化成功",
                        "vector_count": vector_count
                    })
                else:
                    results.append({"file_id": file_id, "status": "failed", "message": "向量化失败"})
                    
            except Exception as e:
                results.append({"file_id": file_id, "status": "failed", "message": str(e)})
        
        return {
            "success": True,
            "message": "批量向量化完成",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"批量向量化失败: {e}")
        raise HTTPException(status_code=500, detail="批量向量化失败")


@router.get("/files/{file_id}/download")
async def DownloadFile(file_id: str):
    """下载文件"""
    try:
        doc = FileDocument.GetById(file_id)
        if not doc:
            raise HTTPException(status_code=404, detail="文件不存在")
        
        if not os.path.exists(doc.file_path):
            raise HTTPException(status_code=404, detail="文件不存在")
        
        return FileResponse(
            path=doc.file_path,
            filename=doc.name,
            media_type=doc.type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"文件下载失败: {e}")
        raise HTTPException(status_code=500, detail="文件下载失败")


# 统计信息API
@router.get("/stats", response_model=dict)
async def GetStats():
    """获取知识库统计信息"""
    try:
        knowledge_bases = KnowledgeBase.GetAll()
        files = FileDocument.GetAll(limit=10000)
        
        total_kbs = len(knowledge_bases)
        total_files = len(files)
        total_vectors = sum(f.vector_count for f in files)
        
        # 按状态统计
        kb_status_stats = {}
        file_status_stats = {}
        file_type_stats = {}
        
        for kb in knowledge_bases:
            kb_status_stats[kb.status] = kb_status_stats.get(kb.status, 0) + 1
        
        for file in files:
            file_status_stats[file.status] = file_status_stats.get(file.status, 0) + 1
            
            # 文件类型统计
            file_type = file.type.split('/')[-1].upper()
            file_type_stats[file_type] = file_type_stats.get(file_type, 0) + 1
        
        # 最近上传的文件
        recent_files = sorted(files, key=lambda x: x.uploaded_at, reverse=True)[:5]
        
        return {
            "success": True,
            "stats": {
                "total_knowledge_bases": total_kbs,
                "total_files": total_files,
                "total_vectors": total_vectors,
                "knowledge_base_status": kb_status_stats,
                "file_status": file_status_stats,
                "file_type_stats": file_type_stats,
                "recent_files": [f.ToDict() for f in recent_files]
            }
        }
    except Exception as e:
        logger.error(f"获取统计信息失败: {e}")
        raise HTTPException(status_code=500, detail="获取统计信息失败") 