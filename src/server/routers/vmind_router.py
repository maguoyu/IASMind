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
from typing import Any, Dict, List, Optional, Tuple, Union
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
    data: Optional[Any] = Field(None, description="要可视化的数据，可以是JSON数组、CSV字符串或其他文本格式")
    user_prompt: Optional[str] = Field(None, description="用户提示")
    language: str = Field("zh", description="语言代码，默认为中文")


class GenerateChartResponse(BaseModel):
    """生成图表的响应模型"""
    spec: Optional[str] = Field(None, description="spec")
    insight_md: Optional[str] = Field(None, description="洞察内容（Markdown格式）")
    error: Optional[str] = Field(None, description="错误信息")


def is_valid_csv(text: str) -> bool:
    """
    检查文本是否符合CSV格式标准
    
    参数:
        text: 要检查的文本
        
    返回:
        bool: 是否符合CSV格式标准
    """
    # 检查字符串是否为空
    if not text.strip():
        return False
        
    # 按行分割
    lines = text.strip().split('\n')
    if len(lines) < 2:  # 至少需要有标题行和一行数据
        return False
        
    # 检查分隔符一致性
    first_line_commas = lines[0].count(',')
    if first_line_commas == 0:  # 必须有逗号分隔
        return False
        
    # 检查每行字段数是否一致
    for line in lines[1:]:
        if line.strip() and line.count(',') != first_line_commas:
            return False
            
    return True


def process_data(input_data: Any) -> Tuple[str, List, Optional[str], Optional[str], Optional[Dict]]:
    """
    处理各种格式的输入数据，判断数据类型并进行相应处理
    
    参数:
        input_data: 输入数据，可以是字符串、列表或其他类型
        
    返回:
        Tuple[str, List, Optional[str], Optional[str], Optional[Dict]]: 
        (数据类型, 数据集, CSV数据, 文本数据, 字段信息)
    """
    dataType = "dataset"
    dataset = []
    csvData = None
    textData = None
    fieldInfo = None
    
    if input_data is None:
        return dataType, dataset, csvData, textData, fieldInfo
    
    # 处理列表类型数据
    if isinstance(input_data, list):
        dataset = input_data
        dataType = "dataset"
    # 处理字符串类型数据
    elif isinstance(input_data, str):
        data_str = input_data.strip()
        
        # 尝试解析为JSON
        try:
            parsed_data = json.loads(data_str)
            if isinstance(parsed_data, list):
                dataset = parsed_data
                dataType = "dataset"
            else:
                # 不是列表格式的JSON，作为文本处理
                textData = data_str
                dataType = "text"
        except json.JSONDecodeError:
            # 尝试解析为CSV
            try:
                # 只有符合CSV格式标准才进行解析
                if is_valid_csv(data_str):
                    df = pd.read_csv(io.StringIO(data_str), sep=',')  # 明确指定逗号分隔符
                    csvData = df.to_csv(index=False)
                    dataType = "csv"
                    logger.info("成功解析为CSV格式")
                else:
                    # 不是标准CSV格式，按文本处理
                    textData = data_str
                    dataType = "text"
                    logger.info("不符合CSV格式标准，按文本处理")
            except Exception as e:
                # 如果都解析失败，则按纯文本处理
                textData = data_str
                dataType = "text"
                logger.info(f"CSV解析失败: {str(e)}，按文本处理")
    # 处理其他类型数据
    else:
        # 尝试转换为JSON字符串再处理
        try:
            json_str = json.dumps(input_data)
            textData = json_str
            dataType = "text"
        except Exception:
            # 如果转换失败，报错
            logger.error("不支持的数据格式")
            raise HTTPException(status_code=400, detail="不支持的数据格式")
    
    logger.info(f"数据处理结果：类型={dataType}")
    return dataType, dataset, csvData, textData, fieldInfo


@router.post("/generate-chart", response_model=Any)
async def generate_chart(
    request: GenerateChartRequest,
    user=Depends(GetCurrentUser)
):
    """生成数据可视化图表，支持多种数据格式"""

    try:
        # 获取LLM客户端
        llm_config = await get_llm_config("basic")

        # 创建VMind客户端
        vmind_client = VmindClient(llm_config)
        
        # 处理数据
        dataType, dataset, csvData, textData, fieldInfo = process_data(request.data)
        
        # 调用VMind服务
        result = await vmind_client.invoke_vmind(
            file_name=request.file_name,
            output_type=request.output_type,
            task_type=request.task_type,
            insights_id=request.insights_id,
            dataset=dataset,
            csvData=csvData,
            textData=textData,
            fieldInfo=fieldInfo,
            dataType=dataType,
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
                    file_content = json.load(f)
                    # 使用通用处理函数处理JSON内容
                    dataType, dataset, csvData, textData, fieldInfo = process_data(file_content)
            elif suffix.lower() in ['.txt', '.text']:
                # 读取文本文件
                with open(temp_path, 'r', encoding='utf-8') as f:
                    file_content = f.read().strip()
                    # 使用通用处理函数处理文本内容
                    dataType, dataset, csvData, textData, fieldInfo = process_data(file_content)
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