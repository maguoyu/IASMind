# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据可视化相关API路由
提供基于VMind的数据可视化功能
"""

import logging
import os
import tempfile
import csv
import json
import pandas as pd
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form

from src.vmind.charts import VmindClient
from src.llms.llm import get_llm_by_type
from ..auth_middleware import GetCurrentUser
from src.config.agents import AGENT_LLM_MAP
from src.utils.llm_utils import get_llm_config
import io

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
    user_prompt: Optional[str] = Field(None, description="用户提示")
    language: str = Field("zh", description="语言代码，默认为中文")


class GenerateChartResponse(BaseModel):
    """生成图表的响应模型"""
    spec: Optional[str] = Field(None, description="spec")
    insight_md: Optional[str] = Field(None, description="洞察内容（Markdown格式）")
    error: Optional[str] = Field(None, description="错误信息")


@router.post("/generate-chart-with-dataset", response_model=Any)
async def generate_chart(
    request: GenerateChartRequest,
    user=Depends(GetCurrentUser)
):
    """生成数据可视化图表"""

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
            dataset=request.data,
            dataType="dataset",
            user_prompt=request.user_prompt,
            language=request.language
        )
        
        # 如果有错误，抛出异常
        if "error" in result:
            logger.error(f"VMind 处理错误: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
    
    except Exception as e:
        logger.exception(f"生成图表时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{INTERNAL_SERVER_ERROR_DETAIL}: {str(e)}")


@router.post("/generate-chart-with-file", response_model=Any)
async def generate_chart_with_file(
    file: UploadFile = File(...),
    file_name: str = Form(...),
    output_type: str = Form(...),
    task_type: str = Form("visualization"),
    user_prompt: Optional[str] = Form(None),
    language: str = Form("zh"),
    user=Depends(GetCurrentUser)
):
    """通过上传文件生成数据可视化图表"""
    
    try:
        # 创建临时文件
        suffix = os.path.splitext(file.filename)[1] if file.filename else ""
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            # 写入上传的文件内容
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        # 根据文件类型读取数据

        dataType = "dataset"
        dataset = []
        csvData = None
        textData = None
        fieldInfo = None
        try:
            if suffix.lower() == '.csv':
                # 读取CSV文件
                df = pd.read_csv(temp_path)
                csvData = df.to_csv(index=False)
                dataType = "csv"
            elif suffix.lower() in ['.xls', '.xlsx']:
                # 读取Excel文件
                df = pd.read_excel(temp_path)
                csvData = df.to_csv(index=False)
                dataType = "csv"
            elif suffix.lower() == '.json':
                # 读取JSON文件
                with open(temp_path, 'r', encoding='utf-8') as f:
                    dataset = json.load(f)
                    dataType = "dataset"
                    if not isinstance(dataset, list):
                        dataType = "text"
                        textData = json.dumps(dataset)
            elif suffix.lower() in ['.txt', '.text']:
                # 读取文本文件
                try:
                    # 首先尝试作为JSON解析
                    with open(temp_path, 'r', encoding='utf-8') as f:
                        content = f.read().strip()
                        try:
                            dataset = json.loads(content)
                            if isinstance(dataset, list):
                                dataType = "dataset"
                            else:
                                dataType = "text"
                                textData = content
                        except json.JSONDecodeError:
                            # 如果不是JSON格式，尝试作为CSV格式解析
                            try:
                                # 使用pandas读取为CSV
                                df = pd.read_csv(io.StringIO(content), sep=None, engine='python')
                                csvData = df.to_csv(index=False)
                                dataType = "csv"
                            except Exception:
                                # 如果仍无法解析，则按行拆分并创建简单数据结构
                                dataType = "text"
                                textData = content
                except Exception as e:
                    logger.error(f"解析文本文件失败: {str(e)}")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"无法解析文本文件: {str(e)}. 请确保文件格式正确。"
                    )
            else:
                # 不支持的文件类型
                raise HTTPException(
                    status_code=400, 
                    detail=f"不支持的文件类型: {suffix}. 支持的类型: .csv, .xls, .xlsx, .json, .txt, .text"
                )
        finally:
            # 删除临时文件
            os.unlink(temp_path)

        
        # 获取LLM客户端
        llm_config = await get_llm_config("basic")

        # 创建VMind客户端
        vmind_client = VmindClient(llm_config)
        
        # 调用VMind服务
        result = await vmind_client.invoke_vmind(
            file_name=file_name,
            output_type=output_type,
            task_type=task_type,
            dataset=dataset,
            csvData=csvData,
            textData=textData,
            fieldInfo=fieldInfo,
            dataType=dataType,
            user_prompt=user_prompt,
            language=language
        )
        
        # 如果有错误，抛出异常
        if "error" in result:
            logger.error(f"VMind 处理错误: {result['error']}")
            raise HTTPException(status_code=500, detail=result["error"])
        
        return result
    
    except HTTPException as e:
        # 直接重新抛出HTTP异常
        raise
    except Exception as e:
        logger.exception(f"通过文件生成图表时发生错误: {str(e)}")
        raise HTTPException(status_code=500, detail=f"{INTERNAL_SERVER_ERROR_DETAIL}: {str(e)}") 