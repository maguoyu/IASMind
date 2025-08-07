# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
本地数据洞察和图表生成模块
基于ECharts的数据可视化实现
"""

import json
import logging
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime

from src.llms.llm import get_llm_by_type
from src.data_insight.data_insight_framework import DataInsightFramework

logger = logging.getLogger(__name__)

def clean_numpy_types(obj: Any) -> Any:
    """递归清理numpy类型，转换为Python原生类型以便序列化"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: clean_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [clean_numpy_types(item) for item in obj]
    elif isinstance(obj, tuple):
        return tuple(clean_numpy_types(item) for item in obj)
    else:
        return obj

class LocalChartGenerator:
    """本地图表生成器，使用ECharts规范"""
    
    def __init__(self):
        self.supported_chart_types = [
            'bar', 'line', 'pie', 'scatter', 'area', 'funnel', 'radar'
        ]
    
    async def generate_chart(
        self,
        data: Any,
        data_type: str,
        user_prompt: Optional[str] = None,
        enable_insights: bool = True,
        use_llm: bool = False
    ) -> Dict[str, Any]:
        """
        生成图表和数据洞察
        
        参数:
            data: 数据内容（可以是dataset、csvData或textData）
            data_type: 数据类型（dataset、csv、text）
            user_prompt: 用户提示
            enable_insights: 是否启用数据洞察
            use_llm: 是否使用大模型生成图表配置
            
        返回:
            包含图表规格和洞察的字典
        """
        try:
            # 1. 解析数据
            df = self._parse_data(data, data_type)
            if df is None or df.empty:
                return {"error": "无法解析数据或数据为空"}
            
            # 2. 根据use_llm参数决定是否使用大模型
            if use_llm and user_prompt and user_prompt.strip():
                logger.info("使用LLM模式生成图表配置")
                return await self._generate_chart_with_llm(df, user_prompt, enable_insights)
            elif use_llm:
                logger.info("启用LLM模式但无用户提示，使用基础提示生成图表配置")
                default_prompt = "生成最适合这个数据集的图表类型，并提供数据洞察分析"
                return await self._generate_chart_with_llm(df, default_prompt, enable_insights)
            
            # 3. 使用传统方式生成图表
            logger.info("使用传统模式生成图表配置")
            return await self._generate_chart_traditional(df, enable_insights)
            
        except Exception as e:
            logger.exception(f"生成图表时发生错误: {str(e)}")
            return {"error": f"生成图表失败: {str(e)}"}
    
    async def _generate_chart_traditional(self, df: pd.DataFrame, enable_insights: bool = True) -> Dict[str, Any]:
        """传统方式生成图表"""
        
        # 推荐图表类型
        chart_type = self._recommend_chart_type(df, None)
        
        # 生成ECharts配置
        chart_spec = self._generate_echarts_spec(df, chart_type)
        
        # 基于图表配置生成数据洞察
        insights = []
        if enable_insights:
            insights = self._generate_insights_from_chart(chart_spec, chart_type, df)
        
        # 生成洞察文档
        insight_md = await self._generate_insight_markdown_from_chart(chart_spec, insights, chart_type, use_llm=False)
        
        return {
            "spec": chart_spec,
            "insight_md": insight_md,
            "insights": insights,
            "chart_type": chart_type
        }
    
    async def _generate_chart_with_llm(self, df: pd.DataFrame, user_prompt: str, enable_insights: bool = True) -> Dict[str, Any]:
        """使用LLM生成图表配置"""
        try:
            # 获取LLM实例
            llm = get_llm_by_type("basic")
            
            # 准备数据摘要
            data_summary = self._prepare_data_summary(df)
            
            # 构建LLM提示
            prompt = self._build_llm_prompt(data_summary, user_prompt)
            
            # 调用LLM
            logger.info(f"发送LLM请求，提示长度: {len(prompt)}")
            response = await llm.ainvoke(prompt)
            
            # 解析LLM响应
            chart_config = self._parse_llm_response(response.content)
            
            # 基于LLM生成的图表配置生成洞察
            insights = []
            if enable_insights:
                chart_spec = chart_config.get("spec", {})
                chart_type = chart_config.get("chart_type", "unknown")
                insights = self._generate_insights_from_chart(chart_spec, chart_type, df)
            
            # 生成洞察文档
            chart_spec = chart_config.get("spec", {})
            chart_type = chart_config.get("chart_type", "unknown")
            insight_md = await self._generate_insight_markdown_from_chart(chart_spec, insights, chart_type, use_llm=True)
            
            return {
                "spec": chart_config.get("spec", {}),
                "insight_md": insight_md,
                "insights": insights,
                "chart_type": chart_config.get("chart_type", "unknown"),
                "llm_generated": True
            }
            
        except Exception as e:
            logger.error(f"LLM生成图表配置失败: {str(e)}")
            # 回退到传统模式
            logger.info("回退到传统模式")
            return await self._generate_chart_traditional(df, enable_insights)
    
    def _parse_data(self, data: Any, data_type: str) -> Optional[pd.DataFrame]:
        """解析各种格式的数据为DataFrame"""
        try:
            if data_type == "csv":
                if isinstance(data, str):
                    from io import StringIO
                    return pd.read_csv(StringIO(data))
                else:
                    return pd.DataFrame(data)
            elif data_type == "dataset":
                if isinstance(data, list) and data:
                    return pd.DataFrame(data)
                else:
                    return None
            elif data_type == "text":
                # 尝试从文本中提取结构化数据
                return self._extract_data_from_text(data)
            else:
                return None
        except Exception as e:
            logger.error(f"解析数据失败: {str(e)}")
            return None
    
    def _extract_data_from_text(self, text: str) -> Optional[pd.DataFrame]:
        """从文本中提取结构化数据"""
        try:
            # 尝试解析为JSON
            if text.strip().startswith('[') or text.strip().startswith('{'):
                data = json.loads(text)
                if isinstance(data, list):
                    return pd.DataFrame(data)
            
            # 尝试按行分割并查找模式
            lines = text.strip().split('\n')
            if len(lines) > 1:
                # 简单的键值对解析
                data = []
                for line in lines:
                    if ':' in line:
                        parts = line.split(':', 1)
                        if len(parts) == 2:
                            key = parts[0].strip()
                            value = parts[1].strip()
                            try:
                                value = float(value)
                            except ValueError:
                                pass
                            data.append({"name": key, "value": value})
                
                if data:
                    return pd.DataFrame(data)
            
            return None
        except Exception:
            return None
    
    def _generate_insights(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """使用DataInsightFramework生成专业数据洞察"""
        insights = []
        
        try:
            # 创建数据洞察框架实例
            framework = DataInsightFramework()
            
            # 数值列分析
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                try:
                    # 使用框架分析每个数值列
                    framework_results = framework.analyze(df, column=col)
                    
                    # 转换框架结果为图表生成器的格式
                    for result in framework_results:
                        insight = {
                            "type": result.insight_type,
                            "name": f"{col} - {result.algorithm}",
                            "description": result.description,
                            "data": clean_numpy_types({
                                "algorithm": result.algorithm,
                                "severity": result.severity,
                                "confidence": result.confidence,
                                "details": result.details,
                                "affected_data": result.affected_data,
                                "recommendations": result.recommendations
                            })
                        }
                        insights.append(insight)
                        
                except Exception as e:
                    logger.error(f"分析列 {col} 时发生错误: {str(e)}")
                    # 如果框架分析失败，提供基础统计作为备选
                    col_stats = clean_numpy_types({
                        "mean": float(df[col].mean()),
                        "median": float(df[col].median()),
                        "std": float(df[col].std()),
                        "min": float(df[col].min()),
                        "max": float(df[col].max())
                    })
                    insights.append({
                        "type": "basic_stats",
                        "name": f"{col} 基础统计",
                        "description": f"{col} 的平均值为 {col_stats['mean']:.2f}，标准差为 {col_stats['std']:.2f}",
                        "data": col_stats
                    })
            
            # 相关性分析（如果有多个数值列）
            if len(numeric_cols) >= 2:
                try:
                    for i, col1 in enumerate(numeric_cols[:-1]):
                        for col2 in numeric_cols[i+1:]:
                            corr_results = framework.analyze_correlation_pair(df, col1, col2)
                            for result in corr_results:
                                insight = {
                                    "type": "correlation",
                                    "name": f"{col1} 与 {col2} 相关性分析",
                                    "description": result.description,
                                    "data": clean_numpy_types({
                                        "algorithm": result.algorithm,
                                        "severity": result.severity,
                                        "confidence": result.confidence,
                                        "details": result.details,
                                        "recommendations": result.recommendations
                                    })
                                }
                                insights.append(insight)
                except Exception as e:
                    logger.error(f"相关性分析失败: {str(e)}")
            
            # 分类列分析（保持原有逻辑，因为框架主要处理数值数据）
            categorical_cols = df.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if df[col].nunique() <= 10:
                    try:
                        value_counts = df[col].value_counts()
                        insights.append({
                            "type": "categorical_analysis",
                            "name": f"{col} 分布分析",
                            "description": f"{col} 有 {len(value_counts)} 个不同值，最常见的是 '{value_counts.index[0]}'",
                            "data": clean_numpy_types({
                                "unique_count": len(value_counts),
                                "top_values": value_counts.head(5).to_dict()
                            })
                        })
                    except Exception as e:
                        logger.error(f"分析分类列 {col} 时发生错误: {str(e)}")
            
            # 缺失值分析
            try:
                missing_data = df.isnull().sum()
                if missing_data.sum() > 0:
                    insights.append({
                        "type": "missing_data",
                        "name": "缺失值分析",
                        "description": f"数据中有 {missing_data.sum()} 个缺失值",
                        "data": clean_numpy_types(missing_data[missing_data > 0].to_dict())
                    })
            except Exception as e:
                logger.error(f"缺失值分析失败: {str(e)}")
            
            # 如果没有生成任何洞察，添加基本概览
            if not insights:
                insights.append({
                    "type": "basic_overview",
                    "name": "数据概览", 
                    "description": f"数据包含 {len(df)} 行，{len(df.columns)} 列",
                    "data": {
                        "rows": len(df),
                        "columns": len(df.columns),
                        "column_names": df.columns.tolist()
                    }
                })
                
        except Exception as e:
            logger.error(f"生成洞察时发生严重错误: {str(e)}")
            # 回退到基本概览
            insights = [{
                "type": "error",
                "name": "分析失败",
                "description": f"数据洞察分析失败: {str(e)}，仅提供基本信息",
                "data": {
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": df.columns.tolist()
                }
            }]
        
        return insights
    
    def _recommend_chart_type(self, df: pd.DataFrame, user_prompt: Optional[str] = None) -> str:
        """推荐图表类型"""
        # 基于用户提示推荐
        if user_prompt:
            prompt_lower = user_prompt.lower()
            if any(word in prompt_lower for word in ['趋势', '变化', '时间', '线']):
                return 'line'
            elif any(word in prompt_lower for word in ['比较', '对比', '柱']):
                return 'bar'
            elif any(word in prompt_lower for word in ['占比', '比例', '饼', '分布']):
                return 'pie'
            elif any(word in prompt_lower for word in ['散点', '相关', '关系']):
                return 'scatter'
        
        # 基于数据特征推荐
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        categorical_cols = df.select_dtypes(include=['object']).columns
        
        # 检查是否有时间序列数据
        for col in numeric_cols:
            if self._is_date_column(df[col]):
                logger.info(f"检测到时间序列列: {col}")
                return 'line'  # 时间序列数据推荐折线图
        
        # 检查列名是否包含时间相关关键词
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['日期', '时间', '年', '月', '日', 'date', 'time', '航班日']):
                logger.info(f"根据列名检测到时间相关数据: {col}")
                return 'line'
        
        if len(numeric_cols) >= 2 and len(categorical_cols) == 0:
            return 'scatter'  # 两个数值列，推荐散点图
        elif len(numeric_cols) == 1 and len(categorical_cols) == 1:
            if df[categorical_cols[0]].nunique() <= 10:
                return 'bar'  # 分类+数值，推荐柱状图
            else:
                return 'line'  # 分类过多，推荐折线图
        elif len(categorical_cols) >= 1 and len(numeric_cols) >= 1:
            unique_count = df[categorical_cols[0]].nunique()
            if unique_count <= 8:
                return 'pie'  # 分类不多，推荐饼图
            else:
                return 'bar'  # 分类较多，推荐柱状图
        
        return 'bar'  # 默认柱状图
    
    def _is_date_column(self, series: pd.Series) -> bool:
        """检查数据列是否为日期格式"""
        try:
            # 检查是否为YYYYMMDD格式的整数
            if series.dtype in ['int64', 'int32']:
                sample_values = series.dropna().head(5)
                for val in sample_values:
                    if 19000000 <= val <= 21000000:  # 大致的日期范围
                        date_str = str(val)
                        if len(date_str) == 8:
                            year = int(date_str[:4])
                            month = int(date_str[4:6])
                            day = int(date_str[6:8])
                            if 1900 <= year <= 2100 and 1 <= month <= 12 and 1 <= day <= 31:
                                return True
            return False
        except:
            return False
    
    def _prepare_data_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """准备数据摘要用于LLM"""
        try:
            summary = {
                "shape": df.shape,
                "columns": df.columns.tolist(),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "sample_data": df.head(5).to_dict('records'),
                "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
                "categorical_columns": df.select_dtypes(include=['object']).columns.tolist(),
                "null_counts": df.isnull().sum().to_dict()
            }
            
            # 添加数值列的统计信息
            numeric_stats = {}
            for col in summary["numeric_columns"]:
                try:
                    numeric_stats[col] = {
                        "min": float(df[col].min()),
                        "max": float(df[col].max()),
                        "mean": float(df[col].mean()),
                        "std": float(df[col].std())
                    }
                except:
                    numeric_stats[col] = {"error": "统计计算失败"}
            summary["numeric_stats"] = numeric_stats
            
            return summary
        except Exception as e:
            logger.error(f"准备数据摘要失败: {str(e)}")
            return {"error": str(e)}
    
    def _build_llm_prompt(self, data_summary: Dict[str, Any], user_prompt: str) -> str:
        """构建LLM提示"""
        prompt = f"""你是一个专业的数据可视化专家。请根据以下数据特征和用户需求，生成最合适的ECharts配置。

数据概况:
- 数据行数: {data_summary.get('shape', [0, 0])[0]}
- 数据列数: {data_summary.get('shape', [0, 0])[1]}
- 列名: {data_summary.get('columns', [])}
- 数值列: {data_summary.get('numeric_columns', [])}
- 分类列: {data_summary.get('categorical_columns', [])}

数据样本:
{json.dumps(data_summary.get('sample_data', []), ensure_ascii=False, indent=2)}

数值列统计:
{json.dumps(data_summary.get('numeric_stats', {}), ensure_ascii=False, indent=2)}

用户需求: {user_prompt}

请生成一个完整的ECharts配置对象，要求:
1. 根据数据特征选择最合适的图表类型（柱状图、折线图、饼图、散点图等）
2. 配置必须是有效的ECharts option对象
3. 包含合适的标题、图例、坐标轴标签
4. 颜色搭配要美观
5. 如果是时间序列数据，要正确处理时间轴
6. 响应式设计，适应不同屏幕尺寸

请严格按照以下JSON格式返回:
{{
    "chart_type": "图表类型（如bar、line、pie、scatter等）",
    "spec": {{
        "title": {{"text": "图表标题"}},
        "tooltip": {{}},
        "legend": {{}},
        "xAxis": {{}},
        "yAxis": {{}},
        "series": [{{}}]
    }}
}}

注意：
- 只返回JSON格式的配置，不要包含任何其他文字说明
- 确保所有数据引用都使用实际的列名
- 如果检测到时间格式数据（如YYYYMMDD），要进行适当的格式转换
"""
        return prompt
    
    def _parse_llm_response(self, response_content: str) -> Dict[str, Any]:
        """解析LLM响应"""
        try:
            # 清理响应内容，移除可能的markdown标记
            content = response_content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            
            # 解析JSON
            chart_config = json.loads(content.strip())
            
            # 验证必需的字段
            if not isinstance(chart_config, dict):
                raise ValueError("响应不是有效的字典格式")
            
            if "spec" not in chart_config:
                raise ValueError("响应中缺少spec字段")
            
            return chart_config
            
        except json.JSONDecodeError as e:
            logger.error(f"解析LLM响应JSON失败: {str(e)}")
            logger.error(f"原始响应: {response_content}")
            raise ValueError(f"LLM响应不是有效的JSON格式: {str(e)}")
        except Exception as e:
            logger.error(f"解析LLM响应失败: {str(e)}")
            raise ValueError(f"解析LLM响应失败: {str(e)}")
    
    def _generate_echarts_spec(self, df: pd.DataFrame, chart_type: str) -> Dict[str, Any]:
        """生成ECharts配置"""
        try:
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            categorical_cols = df.select_dtypes(include=['object']).columns
            
            # 基础配置
            base_config = {
                "title": {"text": "数据可视化图表", "left": "center"},
                "tooltip": {"trigger": "axis" if chart_type in ['line', 'bar'] else "item"},
                "legend": {"orient": "horizontal", "left": "center", "top": "bottom"},
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
            
            if chart_type == 'bar':
                return self._generate_bar_chart(df, base_config, numeric_cols, categorical_cols)
            elif chart_type == 'line':
                return self._generate_line_chart(df, base_config, numeric_cols, categorical_cols)
            elif chart_type == 'pie':
                return self._generate_pie_chart(df, base_config, numeric_cols, categorical_cols)
            elif chart_type == 'scatter':
                return self._generate_scatter_chart(df, base_config, numeric_cols)
            else:
                return self._generate_bar_chart(df, base_config, numeric_cols, categorical_cols)
                
        except Exception as e:
            logger.error(f"生成ECharts配置失败: {str(e)}")
            return {"error": f"生成图表配置失败: {str(e)}"}
    
    def _generate_bar_chart(self, df: pd.DataFrame, base_config: Dict, numeric_cols, categorical_cols) -> Dict:
        """生成柱状图配置"""
        config = base_config.copy()
        
        if len(categorical_cols) > 0 and len(numeric_cols) > 0:
            category_col = categorical_cols[0]
            value_col = numeric_cols[0]
            
            categories = df[category_col].astype(str).tolist()
            values = df[value_col].tolist()
            
            config.update({
                "xAxis": {"type": "category", "data": categories},
                "yAxis": {"type": "value"},
                "series": [{
                    "name": value_col,
                    "type": "bar",
                    "data": values,
                    "itemStyle": {"color": "#5470c6"}
                }]
            })
        else:
            # 如果没有合适的分类列，使用行索引
            if len(numeric_cols) > 0:
                value_col = numeric_cols[0]
                config.update({
                    "xAxis": {"type": "category", "data": [f"项目{i+1}" for i in range(len(df))]},
                    "yAxis": {"type": "value"},
                    "series": [{
                        "name": value_col,
                        "type": "bar",
                        "data": df[value_col].tolist(),
                        "itemStyle": {"color": "#5470c6"}
                    }]
                })
        
        return config
    
    def _generate_line_chart(self, df: pd.DataFrame, base_config: Dict, numeric_cols, categorical_cols) -> Dict:
        """生成折线图配置"""
        config = base_config.copy()
        
        # 检查是否有时间列
        time_col = None
        value_col = None
        
        # 优先查找时间列
        for col in numeric_cols:
            if self._is_date_column(df[col]):
                time_col = col
                break
        
        # 如果没找到数值时间列，检查列名
        if not time_col:
            for col in df.columns:
                col_lower = col.lower()
                if any(keyword in col_lower for keyword in ['日期', '时间', '年', '月', '日', 'date', 'time', '航班日']):
                    time_col = col
                    break
        
        # 找到值列（非时间列的数值列）
        for col in numeric_cols:
            if col != time_col:
                value_col = col
                break
        
        if time_col and value_col:
            # 处理时间序列数据
            if self._is_date_column(df[time_col]):
                # 转换YYYYMMDD格式到可读日期
                categories = []
                for val in df[time_col]:
                    date_str = str(val)
                    if len(date_str) == 8:
                        year = date_str[:4]
                        month = date_str[4:6]
                        day = date_str[6:8]
                        categories.append(f"{year}-{month}-{day}")
                    else:
                        categories.append(str(val))
            else:
                categories = df[time_col].astype(str).tolist()
            
            values = df[value_col].tolist()
            
            config.update({
                "xAxis": {
                    "type": "category", 
                    "data": categories,
                    "name": time_col,
                    "axisLabel": {
                        "rotate": 45,
                        "fontSize": 10
                    }
                },
                "yAxis": {
                    "type": "value",
                    "name": value_col
                },
                "series": [{
                    "name": value_col,
                    "type": "line",
                    "data": values,
                    "smooth": True,
                    "lineStyle": {"color": "#5470c6", "width": 2},
                    "symbol": "circle",
                    "symbolSize": 6
                }],
                "grid": {
                    "left": "10%",
                    "right": "10%",
                    "bottom": "20%",
                    "top": "15%",
                    "containLabel": True
                },
                "dataZoom": [
                    {
                        "type": "slider",
                        "show": True,
                        "xAxisIndex": [0],
                        "start": 0,
                        "end": 100
                    },
                    {
                        "type": "inside",
                        "xAxisIndex": [0],
                        "start": 0,
                        "end": 100
                    }
                ]
            })
        elif len(categorical_cols) > 0 and len(numeric_cols) > 0:
            category_col = categorical_cols[0]
            value_col = numeric_cols[0]
            
            categories = df[category_col].astype(str).tolist()
            values = df[value_col].tolist()
            
            config.update({
                "xAxis": {"type": "category", "data": categories},
                "yAxis": {"type": "value"},
                "series": [{
                    "name": value_col,
                    "type": "line",
                    "data": values,
                    "smooth": True,
                    "lineStyle": {"color": "#5470c6"}
                }]
            })
        else:
            if len(numeric_cols) > 0:
                value_col = numeric_cols[0]
                config.update({
                    "xAxis": {"type": "category", "data": [f"点{i+1}" for i in range(len(df))]},
                    "yAxis": {"type": "value"},
                    "series": [{
                        "name": value_col,
                        "type": "line",
                        "data": df[value_col].tolist(),
                        "smooth": True,
                        "lineStyle": {"color": "#5470c6"}
                    }]
                })
        
        return config
    
    def _generate_pie_chart(self, df: pd.DataFrame, base_config: Dict, numeric_cols, categorical_cols) -> Dict:
        """生成饼图配置"""
        config = base_config.copy()
        
        if len(categorical_cols) > 0 and len(numeric_cols) > 0:
            category_col = categorical_cols[0]
            value_col = numeric_cols[0]
            
            # 聚合相同分类的数据
            grouped = df.groupby(category_col)[value_col].sum().reset_index()
            
            data = [
                {"name": str(row[category_col]), "value": float(row[value_col])}
                for _, row in grouped.iterrows()
            ]
            
            config.update({
                "series": [{
                    "name": "数据",
                    "type": "pie",
                    "radius": "50%",
                    "data": data,
                    "emphasis": {
                        "itemStyle": {
                            "shadowBlur": 10,
                            "shadowOffsetX": 0,
                            "shadowColor": "rgba(0, 0, 0, 0.5)"
                        }
                    }
                }]
            })
        else:
            # 如果只有一列数据，按值分布
            if len(numeric_cols) > 0:
                value_col = numeric_cols[0]
                data = [
                    {"name": f"项目{i+1}", "value": float(val)}
                    for i, val in enumerate(df[value_col].tolist())
                ]
                
                config.update({
                    "series": [{
                        "name": "数据",
                        "type": "pie",
                        "radius": "50%",
                        "data": data
                    }]
                })
        
        return config
    
    def _generate_scatter_chart(self, df: pd.DataFrame, base_config: Dict, numeric_cols) -> Dict:
        """生成散点图配置"""
        config = base_config.copy()
        
        if len(numeric_cols) >= 2:
            x_col = numeric_cols[0]
            y_col = numeric_cols[1]
            
            data = [[float(row[x_col]), float(row[y_col])] for _, row in df.iterrows()]
            
            config.update({
                "xAxis": {"type": "value", "name": x_col},
                "yAxis": {"type": "value", "name": y_col},
                "series": [{
                    "name": "数据点",
                    "type": "scatter",
                    "data": data,
                    "symbolSize": 8,
                    "itemStyle": {"color": "#5470c6"}
                }]
            })
        
        return config
    
    def _generate_insight_markdown(self, df: pd.DataFrame, insights: List[Dict], chart_type: str) -> str:
        """生成洞察文档（Markdown格式）"""
        md_content = []
        
        md_content.append("# 数据分析报告")
        md_content.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        md_content.append(f"**图表类型**: {chart_type}")
        md_content.append("")
        
        md_content.append("## 数据概览")
        md_content.append(f"- 数据行数: {len(df)}")
        md_content.append(f"- 数据列数: {len(df.columns)}")
        md_content.append(f"- 列名: {', '.join(df.columns.tolist())}")
        md_content.append("")
        
        if insights:
            # 分类显示洞察
            severity_order = {'critical': '🔴 关键问题', 'high': '🟠 重要发现', 'medium': '🟡 一般发现', 'low': '🟢 基础信息'}
            
            # 按严重程度分组
            insights_by_severity = {}
            basic_insights = []
            
            for insight in insights:
                insight_data = insight.get('data', {})
                severity = insight_data.get('severity', 'unknown')
                
                # 特殊处理非框架生成的洞察
                if insight['type'] in ['categorical_analysis', 'missing_data', 'basic_overview', 'error']:
                    basic_insights.append(insight)
                else:
                    if severity not in insights_by_severity:
                        insights_by_severity[severity] = []
                    insights_by_severity[severity].append(insight)
            
            # 显示框架分析结果
            md_content.append("## 专业数据洞察")
            if insights_by_severity:
                for severity in ['critical', 'high', 'medium', 'low']:
                    if severity in insights_by_severity:
                        md_content.append(f"### {severity_order[severity]}")
                        for insight in insights_by_severity[severity]:
                            md_content.append(f"#### {insight['name']}")
                            md_content.append(insight['description'])
                            
                            insight_data = insight.get('data', {})
                            confidence = insight_data.get('confidence', 0)
                            algorithm = insight_data.get('algorithm', '未知')
                            
                            md_content.append(f"- **算法**: {algorithm}")
                            md_content.append(f"- **置信度**: {confidence:.2f}")
                            
                            # 显示建议
                            recommendations = insight_data.get('recommendations', [])
                            if recommendations:
                                md_content.append("- **建议**:")
                                for rec in recommendations[:3]:  # 最多显示3个建议
                                    md_content.append(f"  - {rec}")
                            
                            # 显示详细信息（如果有异常数据）
                            affected_data = insight_data.get('affected_data', [])
                            if affected_data and len(affected_data) <= 10:  # 只显示少量异常数据
                                md_content.append(f"- **受影响数据位置**: {affected_data}")
                            elif len(affected_data) > 10:
                                md_content.append(f"- **受影响数据**: {len(affected_data)} 个数据点")
                            
                            md_content.append("")
            
            # 显示基础分析结果
            if basic_insights:
                md_content.append("### 📊 基础数据分析")
                for insight in basic_insights:
                    md_content.append(f"#### {insight['name']}")
                    md_content.append(insight['description'])
                    
                    # 显示分类分析的详细信息
                    if insight['type'] == 'categorical_analysis':
                        top_values = insight.get('data', {}).get('top_values', {})
                        if top_values:
                            md_content.append("- **分布详情**:")
                            for value, count in list(top_values.items())[:5]:
                                md_content.append(f"  - {value}: {count}")
                    
                    # 显示缺失值详情
                    elif insight['type'] == 'missing_data':
                        missing_details = insight.get('data', {})
                        if missing_details:
                            md_content.append("- **缺失值详情**:")
                            for col, count in missing_details.items():
                                md_content.append(f"  - {col}: {count} 个缺失值")
                    
                    md_content.append("")
        
        md_content.append("## 图表说明")
        chart_descriptions = {
            'bar': "柱状图适合比较不同类别的数值大小",
            'line': "折线图适合展示数据随时间或其他连续变量的变化趋势",
            'pie': "饼图适合展示各部分占整体的比例关系",
            'scatter': "散点图适合探索两个数值变量之间的相关关系"
        }
        md_content.append(chart_descriptions.get(chart_type, "图表展示了数据的可视化结果"))
        
        # 添加分析说明
        md_content.append("")
        md_content.append("## 分析说明")
        md_content.append("本报告使用了专业的数据洞察框架进行分析，包括：")
        md_content.append("- **异常检测**: Z-Score、IQR、LOF等算法识别数据异常")
        md_content.append("- **趋势分析**: Mann-Kendall检验识别数据趋势")
        md_content.append("- **变化点检测**: Page-Hinkley和贝叶斯方法识别数据转折点")
        md_content.append("- **相关性分析**: Pearson和Spearman相关系数分析变量关系")
        md_content.append("- **聚类分析**: DBSCAN算法识别数据群组和异常点")
        
        return "\n".join(md_content) 
    
    async def _optimize_markdown_with_llm(self, original_md: str, chart_spec: Dict[str, Any], insights: List[Dict], chart_type: str) -> str:
        """使用LLM优化markdown内容"""
        try:
            # 获取LLM实例
            llm = get_llm_by_type("basic")
            
            # 准备数据摘要
            chart_summary = self._prepare_chart_summary(chart_spec, insights, chart_type)
            
            # 构建优化提示
            prompt = self._build_markdown_optimization_prompt(original_md, chart_summary)
            
            # 调用LLM
            logger.info("使用LLM优化Markdown内容")
            response = await llm.ainvoke(prompt)
            
            # 解析并验证LLM响应
            optimized_md = self._parse_markdown_response(response.content)
            
            return optimized_md
            
        except Exception as e:
            logger.error(f"LLM优化Markdown失败: {str(e)}")
            raise e
    
    def _prepare_chart_summary(self, chart_spec: Dict[str, Any], insights: List[Dict], chart_type: str) -> Dict[str, Any]:
        """准备图表摘要用于LLM优化"""
        try:
            summary = {
                "chart_type": chart_type,
                "series_count": len(chart_spec.get("series", [])),
                "insights_count": len(insights),
                "critical_insights": [],
                "high_insights": [],
                "chart_insights": []
            }
            
            # 提取关键洞察
            for insight in insights:
                # 确保 insight 是字典类型
                if not isinstance(insight, dict):
                    logger.warning(f"跳过非字典类型的洞察: {type(insight)}")
                    continue
                
                insight_data = insight.get('data', {})
                # 确保 insight_data 是字典类型
                if not isinstance(insight_data, dict):
                    insight_data = {}
                
                severity = insight_data.get('severity', 'low')
                data_source = insight_data.get('data_source', 'unknown')
                
                insight_summary = {
                    "name": insight.get('name', '未知'),
                    "description": insight.get('description', ''),
                    "type": insight.get('type', 'unknown')
                }
                
                if severity == 'critical':
                    summary["critical_insights"].append(insight_summary)
                elif severity == 'high':
                    summary["high_insights"].append(insight_summary)
                elif data_source == 'chart_data':
                    summary["chart_insights"].append(insight_summary)
            
            # 提取图表数据信息
            if chart_spec.get("series") and len(chart_spec["series"]) > 0:
                first_series = chart_spec["series"][0]
                
                # 确保 first_series 是字典类型
                if isinstance(first_series, dict):
                    summary["data_count"] = len(first_series.get("data", []))
                    summary["series_name"] = first_series.get("name", "未命名")
                else:
                    # 如果不是字典，设置默认值
                    summary["data_count"] = 0
                    summary["series_name"] = "未命名"
                
                # 提取X轴和Y轴信息
                logger.info(f"chart_spec: {chart_spec}")
                if "xAxis" in chart_spec and isinstance(chart_spec["xAxis"], dict):
                    summary["x_axis_name"] = chart_spec["xAxis"].get("name", "")
                if "yAxis" in chart_spec and isinstance(chart_spec["yAxis"], dict):
                    summary["y_axis_name"] = chart_spec["yAxis"].get("name", "")
            
            return summary
            
        except Exception as e:
            logger.error(f"准备图表摘要失败: {str(e)}")
            return {"error": str(e)}
    
    def _build_markdown_optimization_prompt(self, original_md: str, chart_summary: Dict[str, Any]) -> str:
        """构建Markdown优化提示"""
        prompt = f"""你是一个专业的数据分析师和技术写作专家。请优化以下数据分析报告的Markdown内容，使其更加专业、易读和富有洞察力。

原始报告内容:
{original_md}

图表摘要信息:
- 图表类型: {chart_summary.get('chart_type', '未知')}
- 数据系列数: {chart_summary.get('series_count', 0)}
- 数据点数量: {chart_summary.get('data_count', 0)}
- 洞察总数: {chart_summary.get('insights_count', 0)}
- 关键发现数: {len(chart_summary.get('critical_insights', []))}
- 重要发现数: {len(chart_summary.get('high_insights', []))}

关键洞察信息:
{json.dumps(chart_summary.get('critical_insights', []) + chart_summary.get('high_insights', []), ensure_ascii=False, indent=2)}

优化要求:
1. **保持结构**: 保持原有的Markdown章节结构，不要删除或重组主要章节
2. **优化语言**: 使用更专业、准确的数据分析术语
3. **增强可读性**: 改进表达方式，使内容更流畅易懂
4. **突出重点**: 强调关键发现和重要洞察
5. **添加总结**: 在每个主要章节后添加简要总结
6. **保持数据**: 保留所有具体的数据、数字和算法名称
7. **改进格式**: 优化表格、列表和强调标记的使用
8. **专业术语**: 使用准确的统计学和数据分析专业术语
9. **逻辑连贯**: 确保各部分内容逻辑连贯，过渡自然

请返回优化后的完整Markdown内容，确保内容专业、准确且易于理解。不要添加原文中没有的信息，但可以改进表达方式和组织结构。"""

        return prompt
    
    def _parse_markdown_response(self, response_content: str) -> str:
        """解析LLM返回的Markdown内容"""
        try:
            # 清理响应内容
            content = response_content.strip()
            
            # 移除可能的markdown代码块标记
            if content.startswith('```markdown'):
                content = content[11:]
            elif content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            
            # 验证内容是否包含基本的Markdown结构
            content = content.strip()
            if not content or len(content) < 100:
                raise ValueError("LLM返回的内容过短，可能不完整")
            
            # 检查是否包含必要的章节标题
            required_sections = ["图表数据分析报告", "图表概览"]
            for section in required_sections:
                if section not in content:
                    logger.warning(f"优化后的内容缺少必要章节: {section}")
            
            return content
            
        except Exception as e:
            logger.error(f"解析LLM Markdown响应失败: {str(e)}")
            raise ValueError(f"解析LLM响应失败: {str(e)}")

    def _extract_data_from_chart_spec(self, chart_spec: Dict[str, Any], chart_type: str) -> Optional[pd.DataFrame]:
        """从图表配置中提取实际使用的数据"""
        logger.info(f"chart_spec: {chart_spec}")
        try:
            if "series" not in chart_spec or not chart_spec["series"]:
                return None
            
            series_data = chart_spec["series"][0]  # 取第一个系列的数据
            
            if chart_type in ['bar', 'line']:
                # 柱状图和折线图
                x_data = chart_spec.get("xAxis", {}).get("data", [])
                y_data = series_data.get("data", [])
                
                if x_data and y_data:
                    df = pd.DataFrame({
                        'category': x_data,
                        'value': y_data
                    })
                    return df
                    
            elif chart_type == 'pie':
                # 饼图
                pie_data = series_data.get("data", [])
                if pie_data and isinstance(pie_data, list):
                    categories = []
                    values = []
                    for item in pie_data:
                        if isinstance(item, dict):
                            categories.append(item.get("name", ""))
                            values.append(item.get("value", 0))
                    
                    if categories and values:
                        df = pd.DataFrame({
                            'category': categories,
                            'value': values
                        })
                        return df
                        
            elif chart_type == 'scatter':
                # 散点图
                scatter_data = series_data.get("data", [])
                if scatter_data and isinstance(scatter_data, list):
                    x_values = []
                    y_values = []
                    for point in scatter_data:
                        if isinstance(point, list) and len(point) >= 2:
                            x_values.append(point[0])
                            y_values.append(point[1])
                    
                    if x_values and y_values:
                        df = pd.DataFrame({
                            'x': x_values,
                            'y': y_values
                        })
                        return df
            
            return None
            
        except Exception as e:
            logger.error(f"从图表配置提取数据失败: {str(e)}")
            return None

    def _generate_insights_from_chart(self, chart_spec: Dict[str, Any], chart_type: str, original_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """基于图表配置生成数据洞察"""
        insights = []
        
        try:
            # 从图表配置中提取实际数据
            chart_df = self._extract_data_from_chart_spec(chart_spec, chart_type)
            logger.info(f"chart_df: {chart_df}")
            
            if chart_df is None or chart_df.empty:
                logger.warning("无法从图表配置中提取数据，使用原始数据生成洞察")
                return self._generate_insights(original_df)
            
            # 使用DataInsightFramework分析图表数据
            framework = DataInsightFramework()
            
            # 分析数值列
            numeric_cols = chart_df.select_dtypes(include=[np.number]).columns
            
            for col in numeric_cols:
                try:
                    # 使用框架分析每个数值列
                    framework_results = framework.analyze(chart_df, column=col)
                    
                    # 转换框架结果为图表生成器的格式
                    for result in framework_results:
                        insight = {
                            "type": result.insight_type,
                            "name": f"图表数据 {col} - {result.algorithm}",
                            "description": f"[图表数据分析] {result.description}",
                            "data": clean_numpy_types({
                                "algorithm": result.algorithm,
                                "severity": result.severity,
                                "confidence": result.confidence,
                                "details": result.details,
                                "affected_data": result.affected_data,
                                "recommendations": result.recommendations,
                                "chart_type": chart_type,
                                "data_source": "chart_data"
                            })
                        }
                        insights.append(insight)
                        
                except Exception as e:
                    logger.error(f"分析图表数据列 {col} 时发生错误: {str(e)}")
            
            # 图表特定的洞察
            chart_insights = self._generate_chart_specific_insights(chart_spec, chart_type, chart_df)
            insights.extend(chart_insights)
            
            # 如果没有生成任何洞察，添加基本信息
            if not insights:
                insights.append({
                    "type": "chart_overview",
                    "name": f"{chart_type}图表概览",
                    "description": f"图表包含 {len(chart_df)} 个数据点",
                    "data": {
                        "chart_type": chart_type,
                        "data_points": len(chart_df),
                        "data_source": "chart_data"
                    }
                })
                
        except Exception as e:
            logger.error(f"基于图表配置生成洞察时发生错误: {str(e)}")
            # 回退到原始数据分析
            return self._generate_insights(original_df)
        
        return insights

    def _generate_chart_specific_insights(self, chart_spec: Dict[str, Any], chart_type: str, chart_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """生成图表类型特定的洞察"""
        insights = []
        
        try:
            if chart_type in ['bar', 'line'] and 'value' in chart_df.columns:
                values = chart_df['value'].values
                
                # 找出最高值和最低值
                max_idx = np.argmax(values)
                min_idx = np.argmin(values)
                
                max_category = chart_df.iloc[max_idx]['category'] if 'category' in chart_df.columns else f"位置{max_idx}"
                min_category = chart_df.iloc[min_idx]['category'] if 'category' in chart_df.columns else f"位置{min_idx}"
                
                insights.append({
                    "type": "chart_analysis",
                    "name": f"{chart_type}图表数据分析",
                    "description": f"最高值出现在 '{max_category}' ({values[max_idx]:.2f})，最低值出现在 '{min_category}' ({values[min_idx]:.2f})",
                    "data": {
                        "chart_type": chart_type,
                        "max_value": float(values[max_idx]),
                        "min_value": float(values[min_idx]),
                        "max_category": str(max_category),
                        "min_category": str(min_category),
                        "data_source": "chart_data"
                    }
                })
                
                # 计算数据分布
                mean_value = np.mean(values)
                std_value = np.std(values)
                cv = std_value / mean_value if mean_value != 0 else 0
                
                if cv > 0.5:
                    insights.append({
                        "type": "variability_analysis",
                        "name": "数据波动性分析",
                        "description": f"图表数据波动较大，变异系数为 {cv:.3f}，建议关注数据稳定性",
                        "data": {
                            "coefficient_of_variation": float(cv),
                            "mean": float(mean_value),
                            "std": float(std_value),
                            "data_source": "chart_data"
                        }
                    })
                    
            elif chart_type == 'pie' and 'value' in chart_df.columns:
                values = chart_df['value'].values
                total = np.sum(values)
                
                # 找出占比最大的类别
                max_idx = np.argmax(values)
                max_category = chart_df.iloc[max_idx]['category'] if 'category' in chart_df.columns else f"类别{max_idx}"
                max_percentage = (values[max_idx] / total) * 100
                
                insights.append({
                    "type": "proportion_analysis", 
                    "name": "饼图比例分析",
                    "description": f"'{max_category}' 占据最大比例 ({max_percentage:.1f}%)，是主要组成部分",
                    "data": {
                        "dominant_category": str(max_category),
                        "dominant_percentage": float(max_percentage),
                        "total_categories": len(values),
                        "data_source": "chart_data"
                    }
                })
                
        except Exception as e:
            logger.error(f"生成图表特定洞察时发生错误: {str(e)}")
        
        return insights

    async def _generate_insight_markdown_from_chart(self, chart_spec: Dict[str, Any], insights: List[Dict], chart_type: str, use_llm: bool = False) -> str:
        """基于图表配置生成洞察文档（Markdown格式）"""
        md_content = []
        
        md_content.append("# 图表数据分析报告")
        md_content.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        md_content.append(f"**图表类型**: {chart_type}")
        md_content.append("")
        
        # 图表概览
        md_content.append("## 图表概览")
        series_count = len(chart_spec.get("series", []))
        md_content.append(f"- 图表系列数: {series_count}")
        
        if chart_spec.get("series"):
            first_series = chart_spec["series"][0]
            data_count = len(first_series.get("data", []))
            md_content.append(f"- 数据点数量: {data_count}")
            md_content.append(f"- 系列名称: {first_series.get('name', '未命名')}")
        
        md_content.append("")
        
        if insights:
            # 按数据源和严重程度分组显示洞察
            severity_order = {'critical': '🔴 关键发现', 'high': '🟠 重要发现', 'medium': '🟡 一般发现', 'low': '🟢 基础信息'}
            
            # 分组洞察
            chart_insights = []
            framework_insights = {}
            
            for insight in insights:
                insight_data = insight.get('data', {})
                data_source = insight_data.get('data_source', 'unknown')
                
                if data_source == 'chart_data' and insight['type'] in ['chart_analysis', 'proportion_analysis', 'variability_analysis']:
                    chart_insights.append(insight)
                else:
                    severity = insight_data.get('severity', 'low')
                    if severity not in framework_insights:
                        framework_insights[severity] = []
                    framework_insights[severity].append(insight)
            
            # 显示图表特定洞察
            if chart_insights:
                md_content.append("## 📊 图表数据洞察")
                for insight in chart_insights:
                    md_content.append(f"### {insight['name']}")
                    md_content.append(insight['description'])
                    md_content.append("")
            
            # 显示框架分析结果
            if framework_insights:
                md_content.append("## 🔍 专业数据分析")
                for severity in ['critical', 'high', 'medium', 'low']:
                    if severity in framework_insights:
                        md_content.append(f"### {severity_order[severity]}")
                        for insight in framework_insights[severity]:
                            md_content.append(f"#### {insight['name']}")
                            md_content.append(insight['description'])
                            
                            insight_data = insight.get('data', {})
                            confidence = insight_data.get('confidence', 0)
                            algorithm = insight_data.get('algorithm', '未知')
                            
                            md_content.append(f"- **分析算法**: {algorithm}")
                            md_content.append(f"- **置信度**: {confidence:.2f}")
                            
                            # 显示建议
                            recommendations = insight_data.get('recommendations', [])
                            if recommendations:
                                md_content.append("- **建议**:")
                                for rec in recommendations[:3]:
                                    md_content.append(f"  - {rec}")
                            
                            md_content.append("")
        
        # 图表说明
        md_content.append("## 📈 图表说明")
        chart_descriptions = {
            'bar': "柱状图适合比较不同类别的数值大小，本分析基于图表中实际显示的数据",
            'line': "折线图适合展示数据随时间或其他连续变量的变化趋势，本分析基于图表中实际显示的数据",
            'pie': "饼图适合展示各部分占整体的比例关系，本分析基于图表中实际显示的数据",
            'scatter': "散点图适合探索两个数值变量之间的相关关系，本分析基于图表中实际显示的数据"
        }
        md_content.append(chart_descriptions.get(chart_type, "图表展示了数据的可视化结果，本分析基于图表中实际显示的数据"))
        
        # 添加分析说明
        md_content.append("")
        md_content.append("## ℹ️ 分析说明")
        md_content.append("本报告基于图表配置中的实际数据进行分析，确保洞察与可视化内容完全一致。")
        md_content.append("使用了专业的数据洞察框架，包括异常检测、趋势分析、相关性分析等多种算法。")
        
        # 如果启用LLM，使用大模型优化markdown内容
        if use_llm:
            try:
                return await self._optimize_markdown_with_llm("\n".join(md_content), chart_spec, insights, chart_type)
            except Exception as e:
                logger.error(f"使用LLM优化markdown失败: {str(e)}，返回原始内容")
                return "\n".join(md_content)
        
        return "\n".join(md_content) 