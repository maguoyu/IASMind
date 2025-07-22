# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据探索相关API路由
处理数据文件的上传、查询和分析
"""

import os
import json
import tempfile
import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query, HTTPException
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
from pydantic import BaseModel

from ..auth_middleware import GetCurrentUser
from ...database.models import FileExploration
from ...utils.crypto import GenerateSecureToken
from ...config.configuration import get_config

router = APIRouter(prefix="/api/data-exploration", tags=["数据探索"])

# 配置文件存储目录
config = get_config()
DATA_EXPLORATION_DIR = os.getenv("EXPLORATION_FILE_PATH", config.exploration_file_path)
os.makedirs(DATA_EXPLORATION_DIR, exist_ok=True)

# 添加日志记录
print(f"数据探索文件将被保存到: {DATA_EXPLORATION_DIR}")


class FileExplorationCreate(BaseModel):
    name: str
    type: str
    size: int
    user_id: str
    file_path: str
    suffix: Optional[str] = None
    metadata: Optional[Dict] = None
    preview_data: Optional[Dict] = None


class FileExplorationResponse(BaseModel):
    id: str
    name: str
    type: str
    size: int
    user_id: str
    created_at: str
    updated_at: str
    file_path: str
    status: str
    suffix: Optional[str] = None
    metadata: Optional[Dict] = None
    preview_data: Optional[Dict] = None
    data_insights: Optional[Dict] = None
    last_accessed_at: Optional[str] = None


class FileListResponse(BaseModel):
    total: int
    files: List[FileExplorationResponse]


def process_file_data(file_path: str, file_type: str) -> Dict[str, Any]:
    """处理文件数据，生成预览和元数据"""
    preview_rows = 100  # 预览行数
    metadata = {}
    preview_data = []
    
    try:
        if file_type == "text/csv" or file_path.endswith(".csv"):
            # 处理CSV文件
            df = pd.read_csv(file_path, nrows=preview_rows)
            metadata = {
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in zip(df.columns, df.dtypes)},
                "shape": df.shape,
            }
            preview_data = df.head(preview_rows).replace({np.nan: None}).to_dict(orient="records")
            
        elif file_type.startswith("application/vnd.openxmlformats-officedocument.spreadsheetml") or \
             file_path.endswith((".xlsx", ".xls")):
            # 处理Excel文件
            df = pd.read_excel(file_path, nrows=preview_rows)
            metadata = {
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in zip(df.columns, df.dtypes)},
                "shape": df.shape,
            }
            preview_data = df.head(preview_rows).replace({np.nan: None}).to_dict(orient="records")
            
        elif file_type == "application/json" or file_path.endswith(".json"):
            # 处理JSON文件
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            if isinstance(data, list):
                # 如果是记录列表
                df = pd.DataFrame(data[:preview_rows])
                metadata = {
                    "columns": df.columns.tolist(),
                    "dtypes": {col: str(dtype) for col, dtype in zip(df.columns, df.dtypes)},
                    "shape": df.shape,
                }
                preview_data = df.head(preview_rows).replace({np.nan: None}).to_dict(orient="records")
            else:
                # 如果是嵌套的JSON
                preview_data = data
                metadata = {"structure": "nested_json"}
    except Exception as e:
        metadata = {"error": str(e)}
        preview_data = []
    
    return {
        "metadata": metadata,
        "preview_data": preview_data
    }


@router.post("/files", response_model=FileExplorationResponse)
async def upload_file(
    file: UploadFile = File(...),
    user=Depends(GetCurrentUser)
):
    """上传数据探索文件"""
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="需要用户身份认证")
    
    user_id = user.id
    
    # 创建用户目录
    user_dir = os.path.join(DATA_EXPLORATION_DIR, user_id)
    os.makedirs(user_dir, exist_ok=True)
    
    # 生成唯一文件名
    file_id = str(uuid.uuid4())
    file_suffix = os.path.splitext(file.filename)[1].lower()
    file_path = os.path.join(user_dir, f"{file_id}{file_suffix}")
    
    # 保存上传的文件
    file_size = 0
    try:
        with open(file_path, "wb") as f:
            while content := await file.read(1024 * 1024):  # 每次读取1MB
                f.write(content)
                file_size += len(content)
        
        # 记录日志
        print(f"已保存文件到: {file_path}, 大小: {file_size} 字节")
        
        # 处理文件数据
        file_data = process_file_data(file_path, file.content_type)
        
        # 创建文件记录
        file_doc = FileExploration.Create(
            name=file.filename,
            file_type=file.content_type,
            size=file_size,
            user_id=user_id,
            file_path=file_path,
            suffix=file_suffix,
            metadata=file_data["metadata"],
            preview_data=file_data["preview_data"]
        )
        
        # 验证文件记录是否创建成功
        created_file = FileExploration.GetById(file_doc.id)
        if not created_file:
            raise HTTPException(status_code=500, detail="文件记录创建失败")
            
        return FileExplorationResponse(**file_doc.ToDict())
    except Exception as e:
        # 如果处理过程中出现异常，记录日志并清理临时文件
        print(f"上传文件失败: {str(e)}")
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@router.get("/files", response_model=FileListResponse)
async def list_files(
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
    file_type: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "updated_at",
    sort_order: str = "desc",
    user=Depends(GetCurrentUser)
):
    """获取用户的数据探索文件列表"""
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="需要用户身份认证")
    
    user_id = user.id
    
    # 获取文件总数
    total = FileExploration.Count(user_id, file_type, search)
    
    # 获取文件列表
    files = FileExploration.GetByUserId(
        user_id=user_id,
        limit=limit,
        offset=offset,
        file_type=file_type,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return FileListResponse(
        total=total,
        files=[FileExplorationResponse(**file.ToDict()) for file in files]
    )


@router.get("/files/{file_id}", response_model=FileExplorationResponse)
async def get_file(
    file_id: str,
    user=Depends(GetCurrentUser)
):
    """获取文件详情"""
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="需要用户身份认证")
    
    file = FileExploration.GetById(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 检查是否是文件的所有者
    if file.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权访问该文件")
    
    return FileExplorationResponse(**file.ToDict())


@router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    user=Depends(GetCurrentUser)
):
    """删除文件"""
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="需要用户身份认证")
    
    file = FileExploration.GetById(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 检查是否是文件的所有者
    if file.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权删除该文件")
    
    # 删除文件
    success = file.Delete()
    
    # 尝试删除物理文件
    try:
        if os.path.exists(file.file_path):
            os.remove(file.file_path)
    except Exception as e:
        # 文件记录已删除，即使物理文件删除失败也返回成功
        pass
    
    if success:
        return JSONResponse({"status": "success", "message": "文件已删除"})
    else:
        raise HTTPException(status_code=500, detail="删除文件失败")


@router.post("/files/{file_id}/insights")
async def generate_insights(
    file_id: str,
    user=Depends(GetCurrentUser)
):
    """为文件生成数据洞察"""
    if not user or not user.id:
        raise HTTPException(status_code=401, detail="需要用户身份认证")
    
    file = FileExploration.GetById(file_id)
    if not file:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 检查是否是文件的所有者
    if file.user_id != user.id:
        raise HTTPException(status_code=403, detail="无权访问该文件")
    
    # TODO: 实现AI生成数据洞察的功能
    # 这里使用一些示例洞察
    insights = {
        "data_quality": {
            "completeness": 95,
            "accuracy": 90,
            "consistency": 85,
            "summary": "数据完整性良好，无明显异常值"
        },
        "statistics": {
            "numeric_fields": {},
            "categorical_fields": {}
        },
        "recommendations": [
            {
                "type": "visualization",
                "chart_type": "bar",
                "description": "建议使用柱状图展示分类数据"
            },
            {
                "type": "visualization",
                "chart_type": "line",
                "description": "建议使用折线图展示时间序列趋势"
            }
        ]
    }
    
    # 如果有预览数据，尝试生成一些简单的统计信息
    if file.preview_data and isinstance(file.preview_data, list) and len(file.preview_data) > 0:
        try:
            df = pd.DataFrame(file.preview_data)
            
            # 处理数值字段
            numeric_cols = df.select_dtypes(include=['number']).columns
            for col in numeric_cols:
                insights["statistics"]["numeric_fields"][col] = {
                    "min": float(df[col].min()) if not pd.isna(df[col].min()) else None,
                    "max": float(df[col].max()) if not pd.isna(df[col].max()) else None,
                    "mean": float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                    "median": float(df[col].median()) if not pd.isna(df[col].median()) else None,
                }
            
            # 处理分类字段
            cat_cols = df.select_dtypes(include=['object', 'category']).columns
            for col in cat_cols:
                value_counts = df[col].value_counts().head(5).to_dict()
                insights["statistics"]["categorical_fields"][col] = {
                    "unique_values": df[col].nunique(),
                    "top_values": value_counts
                }
        except:
            # 如果处理失败，使用空统计
            pass
    
    # 更新文件的洞察信息
    file.UpdateInsights(insights)
    
    return JSONResponse({
        "status": "success", 
        "message": "数据洞察已生成",
        "insights": insights
    }) 