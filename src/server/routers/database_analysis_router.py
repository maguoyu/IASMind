# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
import json
import asyncio
from uuid import uuid4

from src.database_analysis.graph.builder import run_database_analysis
from ..auth_middleware import GetCurrentUser

# 创建路由器
router = APIRouter(prefix="/api/database_analysis", tags=["database_analysis"])


class DatabaseAnalysisRequest(BaseModel):
    """数据库分析请求"""
    user_query: str
    datasource_id: str
    table_name: Optional[str] = None


class TableData(BaseModel):
    """表格数据结构"""
    data: List[Dict[str, Any]]
    columns: List[str]


class TextData(BaseModel):
    """文本数据结构"""
    summary: str
    details: List[Dict[str, Any]]


class DatabaseAnalysisResponse(BaseModel):
    """数据库分析响应"""
    success: bool
    result_type: str  # chart, table, text
    data: Optional[Union[TableData, TextData]] = None
    chart_config: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def generate_vchart_spec(chart_config: Dict[str, Any], data: List[Dict[str, Any]], columns: List[str]) -> Dict[str, Any]:
    """
    根据图表配置生成VChart格式的spec
    
    Args:
        chart_config: 图表配置
        data: 数据列表
        columns: 列名列表
        
    Returns:
        VChart格式的spec配置
    """
    if not data or not chart_config:
        return {}
    
    chart_type = chart_config.get("type", "table")
    
    # 如果是表格类型，返回表格配置
    if chart_type == "table":
        return {
            "type": "table",
            "columns": columns
        }
    
    # 基础VChart配置
    base_spec = {
        "data": [{"id": "chartData", "values": data}],
        "padding": {"top": 20, "right": 40, "bottom": 60, "left": 80}
    }
    
    # 根据图表类型生成对应的spec
    if chart_type == "bar":
        x_field = chart_config.get("x", columns[0] if columns else "category")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_spec,
            "type": "bar",
            "xField": x_field,
            "yField": y_field
        }
        
    elif chart_type == "line":
        x_field = chart_config.get("x", columns[0] if columns else "category")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_spec,
            "type": "line", 
            "xField": x_field,
            "yField": y_field
        }
        
    elif chart_type == "pie":
        # 饼图需要 categoryField 和 angleField
        category_field = chart_config.get("x", columns[0] if columns else "category")
        value_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_spec,
            "type": "pie",
            "categoryField": category_field,
            "angleField": value_field,
            "padding": {"top": 40, "right": 80, "bottom": 60, "left": 80}
        }
        
    elif chart_type == "scatter":
        x_field = chart_config.get("x", columns[0] if columns else "x")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "y")
        
        return {
            **base_spec,
            "type": "scatter",
            "xField": x_field,
            "yField": y_field
        }
        
    elif chart_type == "area":
        x_field = chart_config.get("x", columns[0] if columns else "category")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_spec,
            "type": "area",
            "xField": x_field,
            "yField": y_field,
            "padding": {"top": 60, "right": 40, "bottom": 60, "left": 80}
        }
    
    # 默认返回柱状图
    return {
        **base_spec,
        "type": "bar",
        "xField": columns[0] if columns else "category",
        "yField": columns[1] if len(columns) > 1 else "value"
    }


@router.post("/analyze", response_model=DatabaseAnalysisResponse)
async def analyze_database(
    request: DatabaseAnalysisRequest,
    user_info: dict = Depends(GetCurrentUser)
):
    """
    数据库数据分析接口
    
    功能流程：
    1. 查询输入 → 预处理 → 实体识别 → 元数据检索 
    2. SQL生成 → 验证 → 执行 → 结果返回 
    3. 判断显示类型（图表、表格或纯文本）→ 页面显示
    """
    try:
        # 生成线程ID
        thread_id = str(uuid4())
        
        # 执行分析
        result = await run_database_analysis(
            user_query=request.user_query,
            datasource_id=request.datasource_id,
            table_name=request.table_name,
            thread_id=thread_id
        )
        
        # 检查是否有错误
        if result.get("error"):
            return DatabaseAnalysisResponse(
                success=False,
                result_type="text",
                error=result["error"]
            )
        
        # 构建响应
        response_data = {
            "success": True,
            "result_type": result.get("result_type", "table"),
            "metadata": {
                "sql_query": result.get("sql_query", ""),
                "execution_time": result.get("query_result", {}).get("execution_time", 0),
                "row_count": result.get("query_result", {}).get("row_count", 0),
                "entities": result.get("entities", []),
                "tables": [table.get("name", "") for table in result.get("metadata", {}).get("tables", [])]
            }
        }
        
        # 根据结果类型返回不同数据
        result_type = result.get("result_type", "table")
        query_result = result.get("query_result", {})
        
        if result_type == "chart":
            # 生成VChart格式的spec
            original_chart_config = result.get("chart_config", {})
            data = query_result.get("data", [])
            columns = query_result.get("columns", [])
            
            # 根据原始配置生成VChart格式的spec
            vchart_spec = generate_vchart_spec(original_chart_config, data, columns)
            
            # 如果是表格类型，使用特殊处理
            if vchart_spec.get("type") == "table":
                response_data["chart_config"] = {
                    "type": "table",
                    "columns": columns
                }
            else:
                # 图表类型，返回完整的VChart spec作为config，type设置为custom让前端使用我们的spec
                vchart_spec["chart_type"] = "custom"  # 添加chart_type字段标识这是VChart格式
                response_data["chart_config"] = vchart_spec
            
            response_data["data"] = TableData(
                data=data,
                columns=columns
            )
        elif result_type == "table":
            response_data["data"] = TableData(
                data=query_result.get("data", []),
                columns=query_result.get("columns", [])
            )
        else:  # text
            # 生成文本摘要
            data = query_result.get("data", [])
            row_count = len(data)
            columns = query_result.get("columns", [])
            
            summary = f"查询完成，共 {row_count} 条记录"
            if row_count > 0:
                summary += f"，包含字段：{', '.join(columns)}"
            
            response_data["data"] = TextData(
                summary=summary,
                details=data[:5] if data else []  # 最多显示5条详细记录
            )
        
        return DatabaseAnalysisResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"数据库分析失败: {str(e)}"
        )


@router.post("/analyze/stream")
async def analyze_database_stream(
    request: DatabaseAnalysisRequest,
    user_info: dict = Depends(GetCurrentUser)
):
    """
    流式数据库分析接口 - 返回分析过程的实时进展
    """
    async def generate_stream():
        try:
            thread_id = str(uuid4())
            
            # 发送开始信号
            yield f"data: {json.dumps({'type': 'start', 'message': '开始分析查询...'}, ensure_ascii=False)}\n\n"
            
            # 这里可以实现流式处理，目前简化为一次性处理
            result = await run_database_analysis(
                user_query=request.user_query,
                datasource_id=request.datasource_id,
                table_name=request.table_name,
                thread_id=thread_id
            )
            
            # 发送进度更新
            yield f"data: {json.dumps({'type': 'progress', 'message': '查询分析完成', 'step': 'analysis'}, ensure_ascii=False)}\n\n"
            
            # 发送最终结果
            if result.get("error"):
                yield f"data: {json.dumps({'type': 'error', 'error': result['error']}, ensure_ascii=False)}\n\n"
            else:
                response_data = {
                    "type": "result",
                    "result_type": result.get("result_type", "table"),
                    "data": result.get("query_result", {}),
                    "chart_config": result.get("chart_config"),
                    "metadata": {
                        "sql_query": result.get("sql_query", ""),
                        "execution_time": result.get("query_result", {}).get("execution_time", 0),
                        "row_count": result.get("query_result", {}).get("row_count", 0)
                    }
                }
                yield f"data: {json.dumps(response_data, ensure_ascii=False)}\n\n"
            
            # 发送结束信号
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': f'分析失败: {str(e)}'}, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


@router.get("/datasources/{datasource_id}/tables")
async def get_tables(
    datasource_id: str,
    user_info: dict = Depends(GetCurrentUser)
):
    """获取数据源的表列表"""
    try:
        from src.database.models import DataSource
        import pymysql
        
        # 获取数据源信息
        datasource = DataSource.GetById(datasource_id)
        if not datasource:
            raise HTTPException(status_code=404, detail=f"数据源不存在: {datasource_id}")
        
        # 创建连接
        connection = pymysql.connect(
            host=datasource.host,
            port=datasource.port,
            user=datasource.username,
            password=datasource.password,
            database=datasource.database,
            charset='utf8mb4'
        )
        
        if not connection:
            raise HTTPException(status_code=404, detail=f"数据源不存在: {datasource_id}")
        
        # 获取表列表
        with connection.cursor() as cursor:
            cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
            result = cursor.fetchall()
            tables = [{"name": row[0], "description": ""} for row in result]
        
        connection.close()
        return {"tables": tables}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取表列表失败: {str(e)}"
        ) 