# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
VMind兼容性路由
为保持向后兼容，将VMind API调用重定向到新的本地图表生成实现
"""

import logging
from typing import Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from ..auth_middleware import GetCurrentUser
from .charts_router import generate_chart as charts_generate_chart, generate_chart_with_file as charts_generate_chart_with_file
from .charts_router import GenerateChartRequest

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chatbi",
    tags=["VMind兼容性"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)

@router.post("/generate-chart", response_model=Any)
async def generate_chart(
    request: GenerateChartRequest,
    user=Depends(GetCurrentUser)
):
    """生成数据可视化图表（兼容性接口，重定向到本地实现）"""
    logger.info("VMind兼容接口：重定向到本地图表生成实现")
    return await charts_generate_chart(request, user)

@router.post("/generate-chart-with-file", response_model=Any)
async def generate_chart_with_file(
    file: UploadFile = File(...),
    file_name: str = Form(...),
    output_type: str = Form(...),
    task_type: str = Form("visualization"),
    user_prompt: Optional[str] = Form(None),
    language: str = Form("zh"),
    enable_insights: bool = Form(True),
    user=Depends(GetCurrentUser)
):
    """通过上传文件生成数据可视化图表（兼容性接口，重定向到本地实现）"""
    logger.info("VMind兼容接口：重定向到本地图表文件生成实现")
    return await charts_generate_chart_with_file(
        file=file,
        file_name=file_name,
        output_type=output_type,
        task_type=task_type,
        user_prompt=user_prompt,
        language=language,
        enable_insights=enable_insights,
        user=user
    ) 