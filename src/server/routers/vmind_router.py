# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据可视化相关API路由
提供基于VMind的数据可视化功能
"""

import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends

from src.vmind.charts import VmindClient
from src.llms.llm import get_llm_by_type
from ..auth_middleware import GetCurrentUser
from src.config.agents import AGENT_LLM_MAP
from src.utils.llm_utils import get_llm_config

logger = logging.getLogger(__name__)

INTERNAL_SERVER_ERROR_DETAIL = "内部服务器错误"

router = APIRouter(
    prefix="/api/vmind",
    tags=["数据可视化"],
    responses={404: {"message": "您所访问的资源不存在！"}},
)


class GenerateChartRequest(BaseModel):
    """生成图表的请求模型"""
    file_name: str = Field(..., description="输出文件名")
    output_type: str = Field(..., description="输出类型，如 'png' 或 'html'")
    task_type: str = Field("visualization", description="任务类型")
    insights_id: Optional[List[str]] = Field(None, description="洞察ID列表")
    data: Optional[List[Dict[str, Any]]] = Field(None, description="要可视化的数据")
    description: Optional[str] = Field(None, description="图表描述")
    language: str = Field("zh", description="语言代码，默认为中文")


class GenerateChartResponse(BaseModel):
    """生成图表的响应模型"""
    chart_path: Optional[str] = Field(None, description="生成的图表路径")
    insight_path: Optional[str] = Field(None, description="生成的洞察路径")
    insight_md: Optional[str] = Field(None, description="洞察内容（Markdown格式）")
    error: Optional[str] = Field(None, description="错误信息")


@router.post("/generate-chart", response_model=GenerateChartResponse)
async def generate_chart(
    request: GenerateChartRequest,
    user=Depends(GetCurrentUser)
):
    """生成数据可视化图表"""
    if not user or not user.sub:
        raise HTTPException(status_code=401, detail="需要用户身份认证")
    
    try:
        # 获取LLM客户端
        llm_config = await get_llm_config("basic")

        # 创建VMind客户端
        vmind_client = VmindClient(llm_config)
        
        # 调用VMind服务
        result = await vmind_client.invoke_vmind(
            file_name=request.file_name,
            output_type=request.output_type,
            task_type=request.task_type,
            insights_id=request.insights_id,
            dict_data=request.data,
            chart_description=request.description,
            language=request.language
        )
        
        # 如果有错误，抛出异常
        if "error" in result:
            logger.error(f"VMind 处理错误: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        return GenerateChartResponse(**result)
    
    except Exception as e:
        logger.exception(f"生成图表时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{INTERNAL_SERVER_ERROR_DETAIL}: {str(e)}") 