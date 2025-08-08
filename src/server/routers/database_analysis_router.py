# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union
import json
import asyncio
from uuid import uuid4
from datetime import datetime

from src.database_analysis.graph.builder import run_database_analysis
from ..auth_middleware import GetCurrentUser

# 创建路由器
router = APIRouter(prefix="/api/database_analysis", tags=["database_analysis"])


class DatabaseAnalysisRequest(BaseModel):
    """数据库分析请求"""
    user_query: str
    datasource_id: str
    thread_id: str
    table_name: Optional[str] = None
    enable_insights: bool = False


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
    insights: Optional[Dict[str, Any]] = None
    insight_md: Optional[str] = None


def generate_echarts_spec(chart_config: Dict[str, Any], data: List[Dict[str, Any]], columns: List[str]) -> Dict[str, Any]:
    """
    根据图表配置生成ECharts格式的spec
    
    Args:
        chart_config: 图表配置
        data: 数据列表
        columns: 列名列表
        
    Returns:
        ECharts格式的spec配置
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
    
    # 基础ECharts配置
    base_config = {
        "title": {"text": "数据分析图表", "left": "center"},
        "tooltip": {"trigger": "axis" if chart_type in ['line', 'bar'] else "item"},
        "legend": {"orient": "horizontal", "left": "center", "bottom": "10%"},
        "toolbox": {
            "show": True,
            "feature": {
                "dataView": {"show": True, "readOnly": False},
                "magicType": {"show": True, "type": ["line", "bar"]},
                "restore": {"show": True},
                "saveAsImage": {"show": True}
            }
        }
    }
    
    # 根据图表类型生成对应的ECharts配置
    if chart_type == "bar":
        x_field = chart_config.get("x", columns[0] if columns else "category")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_config,
            "xAxis": {"type": "category", "data": [item.get(x_field, '') for item in data]},
            "yAxis": {"type": "value"},
            "series": [{
                "name": y_field,
                "type": "bar",
                "data": [item.get(y_field, 0) for item in data],
                "itemStyle": {"color": "#5470c6"}
            }]
        }
        
    elif chart_type == "line":
        x_field = chart_config.get("x", columns[0] if columns else "category")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_config,
            "xAxis": {"type": "category", "data": [item.get(x_field, '') for item in data]},
            "yAxis": {"type": "value"},
            "series": [{
                "name": y_field,
                "type": "line",
                "data": [item.get(y_field, 0) for item in data],
                "smooth": True,
                "lineStyle": {"color": "#5470c6"}
            }]
        }
        
    elif chart_type == "pie":
        category_field = chart_config.get("x", columns[0] if columns else "category")
        value_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_config,
            "series": [{
                "name": "数据",
                "type": "pie",
                "radius": "50%",
                "data": [{"name": item.get(category_field, ''), "value": item.get(value_field, 0)} for item in data],
                "emphasis": {
                    "itemStyle": {
                        "shadowBlur": 10,
                        "shadowOffsetX": 0,
                        "shadowColor": "rgba(0, 0, 0, 0.5)"
                    }
                }
            }]
        }
        
    elif chart_type == "scatter":
        x_field = chart_config.get("x", columns[0] if columns else "x")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "y")
        
        return {
            **base_config,
            "xAxis": {"type": "value", "name": x_field},
            "yAxis": {"type": "value", "name": y_field},
            "series": [{
                "name": "数据点",
                "type": "scatter",
                "data": [[item.get(x_field, 0), item.get(y_field, 0)] for item in data],
                "symbolSize": 8,
                "itemStyle": {"color": "#5470c6"}
            }]
        }
        
    elif chart_type == "area":
        x_field = chart_config.get("x", columns[0] if columns else "category")
        y_field = chart_config.get("y", columns[1] if len(columns) > 1 else "value")
        
        return {
            **base_config,
            "xAxis": {"type": "category", "data": [item.get(x_field, '') for item in data]},
            "yAxis": {"type": "value"},
            "series": [{
                "name": y_field,
                "type": "line",
                "data": [item.get(y_field, 0) for item in data],
                "areaStyle": {},  # 添加区域填充
                "smooth": True,
                "lineStyle": {"color": "#5470c6"}
            }]
        }
    
    # 默认返回柱状图
    x_field = columns[0] if columns else "category"
    y_field = columns[1] if len(columns) > 1 else "value"
    return {
        **base_config,
        "xAxis": {"type": "category", "data": [item.get(x_field, '') for item in data]},
        "yAxis": {"type": "value"},
        "series": [{
            "name": y_field,
            "type": "bar",
            "data": [item.get(y_field, 0) for item in data],
            "itemStyle": {"color": "#5470c6"}
        }]
    }


def generate_database_insight_markdown(
    data: List[Dict[str, Any]], 
    columns: List[str], 
    metadata: Dict[str, Any], 
    insights_data: Optional[Dict[str, Any]] = None
) -> str:
    """生成数据库分析洞察的Markdown文档"""
    md_content = []
    
    md_content.append("# 数据库查询分析报告")
    md_content.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    md_content.append(f"**查询执行时间**: {metadata.get('execution_time', 0):.3f}秒")
    md_content.append("")
    
    # 查询概览
    md_content.append("## 查询概览")
    md_content.append(f"- 查询结果: {metadata.get('row_count', 0)} 条记录")
    md_content.append(f"- 字段数量: {len(columns)}")
    md_content.append(f"- 涉及表: {', '.join(metadata.get('tables', []))}")
    md_content.append(f"- 字段列表: {', '.join(columns)}")
    md_content.append("")
    
    # SQL查询
    if metadata.get('sql_query'):
        md_content.append("## SQL查询语句")
        md_content.append("```sql")
        md_content.append(metadata['sql_query'])
        md_content.append("```")
        md_content.append("")
    
    # 数据洞察
    if insights_data:
        md_content.append("## 数据洞察分析")
        
        # 基础洞察
        if insights_data.get('basic_insights'):
            md_content.append("### 📊 基础统计分析")
            for insight in insights_data['basic_insights']:
                md_content.append(f"- {insight}")
            md_content.append("")
        
        # 高级洞察
        if insights_data.get('advanced_insights'):
            md_content.append("### 🔍 专业数据洞察")
            
            # 按严重程度分组显示
            severity_order = {'critical': '🔴 关键问题', 'high': '🟠 重要发现', 'medium': '🟡 一般发现', 'low': '🟢 基础信息'}
            insights_by_severity = {}
            
            for insight in insights_data['advanced_insights']:
                severity = insight.get('severity', 'low')
                if severity not in insights_by_severity:
                    insights_by_severity[severity] = []
                insights_by_severity[severity].append(insight)
            
            for severity in ['critical', 'high', 'medium', 'low']:
                if severity in insights_by_severity:
                    md_content.append(f"#### {severity_order[severity]}")
                    for insight in insights_by_severity[severity]:
                        md_content.append(f"**{insight['column']}字段分析**")
                        md_content.append(f"- {insight['description']}")
                        md_content.append(f"- 置信度: {insight.get('confidence', 0):.2f}")
                        md_content.append(f"- 分析类型: {insight.get('type', '未知')}")
                        md_content.append("")
    
    # 数据样例（显示前5行）
    if data and len(data) > 0:
        md_content.append("## 数据样例")
        md_content.append("以下是查询结果的前5行数据：")
        md_content.append("")
        
        # 创建表格头
        md_content.append("| " + " | ".join(columns) + " |")
        md_content.append("| " + " | ".join(["---"] * len(columns)) + " |")
        
        # 添加数据行（最多5行）
        for i, row in enumerate(data[:5]):
            row_values = []
            for col in columns:
                value = row.get(col, "")
                # 处理None值和长字符串
                if value is None:
                    value = "NULL"
                elif isinstance(value, str) and len(value) > 20:
                    value = value[:17] + "..."
                row_values.append(str(value))
            md_content.append("| " + " | ".join(row_values) + " |")
            
        if len(data) > 5:
            md_content.append("")
            md_content.append(f"*还有 {len(data) - 5} 行数据未显示*")
        md_content.append("")
    
    # 数据质量评估
    if data and insights_data:
        md_content.append("## 数据质量评估")
        
        # 计算基础质量指标
        total_records = len(data)
        total_fields = len(columns)
        
        # 检查空值
        null_counts = {}
        for col in columns:
            null_count = sum(1 for row in data if row.get(col) is None or row.get(col) == "")
            if null_count > 0:
                null_counts[col] = null_count
        
        if null_counts:
            md_content.append("### 缺失值分析")
            for col, count in null_counts.items():
                percentage = (count / total_records) * 100
                md_content.append(f"- **{col}**: {count} 个缺失值 ({percentage:.1f}%)")
        else:
            md_content.append("### ✅ 数据完整性良好")
            md_content.append("- 未发现缺失值")
        
        md_content.append("")
    
    # 建议与总结
    md_content.append("## 分析建议")
    if insights_data and insights_data.get('advanced_insights'):
        high_severity_count = len([i for i in insights_data['advanced_insights'] if i.get('severity') in ['high', 'critical']])
        if high_severity_count > 0:
            md_content.append(f"- 发现 {high_severity_count} 个需要关注的数据问题，建议进一步调查")
        else:
            md_content.append("- 数据质量整体良好，未发现明显异常")
    else:
        md_content.append("- 建议启用数据洞察功能以获得更详细的分析")
    
    md_content.append("- 定期监控数据变化，确保数据质量稳定")
    md_content.append("- 考虑建立数据质量监控机制")
    md_content.append("")
    
    md_content.append("---")
    md_content.append("*本报告由IASMind数据分析系统自动生成*")
    
    return "\n".join(md_content)


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
        thread_id = request.thread_id
        if thread_id == "__default__":
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
        
        # 如果启用了数据洞察，生成洞察信息
        insights_data = None
        if request.enable_insights and query_result.get("data"):
            try:
                from src.data_insight.data_insight_framework import DataInsightFramework
                import pandas as pd
                
                # 将查询结果转换为DataFrame
                data = query_result.get("data", [])
                columns = query_result.get("columns", [])
                
                if data and columns:
                    df = pd.DataFrame(data, columns=columns)
                    
                    # 创建数据洞察框架实例
                    framework = DataInsightFramework()
                    
                    # 分析数值列
                    numeric_cols = df.select_dtypes(include=['number']).columns
                    insights_results = []
                    
                    for col in numeric_cols:
                        try:
                            # 使用框架分析每个数值列
                            framework_results = framework.analyze(df, column=col)
                            
                            # 转换框架结果为简化的洞察信息
                            for insight_result in framework_results:
                                if insight_result.severity in ['medium', 'high', 'critical']:  # 只包含重要洞察
                                    insights_results.append({
                                        "type": insight_result.insight_type,
                                        "column": col,
                                        "description": insight_result.description,
                                        "severity": insight_result.severity,
                                        "confidence": insight_result.confidence
                                    })
                        except Exception as e:
                            print(f"分析列 {col} 时出错: {str(e)}")
                    
                    # 生成基础统计洞察
                    basic_insights = []
                    if len(data) > 0:
                        basic_insights.append(f"查询返回 {len(data)} 条记录")
                        basic_insights.append(f"包含 {len(numeric_cols)} 个数值字段: {', '.join(numeric_cols)}")
                        
                        # 添加数据分布洞察
                        for col in numeric_cols:
                            col_data = df[col].dropna()
                            if len(col_data) > 0:
                                mean_val = col_data.mean()
                                std_val = col_data.std()
                                if std_val > mean_val * 0.5:  # 如果标准差较大
                                    basic_insights.append(f"{col} 字段数据分布较为分散，标准差为 {std_val:.2f}")
                                
                                # 检查是否有明显的异常值
                                q75, q25 = col_data.quantile(0.75), col_data.quantile(0.25)
                                iqr = q75 - q25
                                outliers = col_data[(col_data < (q25 - 1.5 * iqr)) | (col_data > (q75 + 1.5 * iqr))]
                                if len(outliers) > 0:
                                    basic_insights.append(f"{col} 字段检测到 {len(outliers)} 个潜在异常值")
                    
                    insights_data = {
                        "basic_insights": basic_insights,
                        "advanced_insights": insights_results
                    }
                    
            except ImportError:
                print("警告: 数据洞察框架不可用，跳过洞察生成")
            except Exception as e:
                print(f"生成数据洞察时出错: {str(e)}")
        
        # 将洞察数据添加到响应中
        if insights_data:
            response_data["insights"] = insights_data
            
            # 生成Markdown格式的洞察报告
            try:
                insight_md = generate_database_insight_markdown(
                    data=query_result.get("data", []),
                    columns=query_result.get("columns", []),
                    metadata={
                        "sql_query": result.get("sql_query", ""),
                        "execution_time": query_result.get("execution_time", 0),
                        "row_count": query_result.get("row_count", 0),
                        "entities": result.get("entities", []),
                        "tables": [table.get("name", "") for table in result.get("metadata", {}).get("tables", [])]
                    },
                    insights_data=insights_data
                )
                response_data["insight_md"] = insight_md
            except Exception as e:
                print(f"生成Markdown洞察报告时出错: {str(e)}")
                # 如果生成失败，不影响主要功能，只是不返回Markdown格式
        
        if result_type == "chart":
            # 生成ECharts格式的spec
            original_chart_config = result.get("chart_config", {})
            data = query_result.get("data", [])
            columns = query_result.get("columns", [])
            
            # 根据原始配置生成ECharts格式的spec
            echarts_spec = generate_echarts_spec(original_chart_config, data, columns)
            
            # 如果是表格类型，使用特殊处理
            if echarts_spec.get("type") == "table":
                response_data["chart_config"] = {
                    "type": "table",
                    "columns": columns
                }
            else:
                # 图表类型，返回完整的ECharts spec作为config，type设置为custom让前端使用我们的spec
                echarts_spec["chart_type"] = "custom"  # 添加chart_type字段标识这是ECharts格式
                response_data["chart_config"] = echarts_spec
            
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