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

logger = logging.getLogger(__name__)

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
        enable_insights: bool = True
    ) -> Dict[str, Any]:
        """
        生成图表和数据洞察
        
        参数:
            data: 数据内容（可以是dataset、csvData或textData）
            data_type: 数据类型（dataset、csv、text）
            user_prompt: 用户提示
            enable_insights: 是否启用数据洞察
            
        返回:
            包含图表规格和洞察的字典
        """
        try:
            # 1. 解析数据
            df = self._parse_data(data, data_type)
            if df is None or df.empty:
                return {"error": "无法解析数据或数据为空"}
            
            # 2. 如果有用户提示，使用LLM生成图表配置
            if user_prompt and user_prompt.strip():
                logger.info("使用LLM模式生成图表配置")
                return await self._generate_chart_with_llm(df, user_prompt, enable_insights)
            
            # 3. 使用传统方式生成图表
            logger.info("使用传统模式生成图表配置")
            return self._generate_chart_traditional(df, enable_insights)
            
        except Exception as e:
            logger.exception(f"生成图表时发生错误: {str(e)}")
            return {"error": f"生成图表失败: {str(e)}"}
    
    def _generate_chart_traditional(self, df: pd.DataFrame, enable_insights: bool = True) -> Dict[str, Any]:
        """传统方式生成图表"""
        # 数据分析和洞察
        insights = []
        if enable_insights:
            insights = self._generate_insights(df)
        
        # 推荐图表类型
        chart_type = self._recommend_chart_type(df, None)
        
        # 生成ECharts配置
        chart_spec = self._generate_echarts_spec(df, chart_type)
        
        # 生成洞察文档
        insight_md = self._generate_insight_markdown(df, insights, chart_type)
        
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
            
            # 生成洞察（如果需要）
            insights = []
            if enable_insights:
                insights = self._generate_insights(df)
            
            # 生成洞察文档
            insight_md = self._generate_insight_markdown(df, insights, chart_config.get("chart_type", "unknown"))
            
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
            return self._generate_chart_traditional(df, enable_insights)
    
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
        """生成数据洞察"""
        insights = []
        
        try:
            # 基本统计信息
            insights.append({
                "type": "basic_stats",
                "name": "数据概览",
                "description": f"数据包含 {len(df)} 行，{len(df.columns)} 列",
                "data": {
                    "rows": len(df),
                    "columns": len(df.columns),
                    "column_names": df.columns.tolist()
                }
            })
            
            # 数值列分析
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                for col in numeric_cols:
                    col_stats = {
                        "mean": float(df[col].mean()),
                        "median": float(df[col].median()),
                        "std": float(df[col].std()),
                        "min": float(df[col].min()),
                        "max": float(df[col].max())
                    }
                    insights.append({
                        "type": "numeric_analysis",
                        "name": f"{col} 数值分析",
                        "description": f"{col} 的平均值为 {col_stats['mean']:.2f}，标准差为 {col_stats['std']:.2f}",
                        "data": col_stats
                    })
            
            # 分类列分析
            categorical_cols = df.select_dtypes(include=['object']).columns
            for col in categorical_cols:
                if df[col].nunique() <= 10:  # 只分析唯一值不超过10的分类列
                    value_counts = df[col].value_counts()
                    insights.append({
                        "type": "categorical_analysis",
                        "name": f"{col} 分布分析",
                        "description": f"{col} 有 {len(value_counts)} 个不同值，最常见的是 '{value_counts.index[0]}'",
                        "data": {
                            "unique_count": len(value_counts),
                            "top_values": value_counts.head(5).to_dict()
                        }
                    })
            
            # 缺失值分析
            missing_data = df.isnull().sum()
            if missing_data.sum() > 0:
                insights.append({
                    "type": "missing_data",
                    "name": "缺失值分析",
                    "description": f"数据中有 {missing_data.sum()} 个缺失值",
                    "data": missing_data[missing_data > 0].to_dict()
                })
            
        except Exception as e:
            logger.error(f"生成洞察时发生错误: {str(e)}")
        
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
            md_content.append("## 数据洞察")
            for insight in insights:
                md_content.append(f"### {insight['name']}")
                md_content.append(insight['description'])
                md_content.append("")
        
        md_content.append("## 图表说明")
        chart_descriptions = {
            'bar': "柱状图适合比较不同类别的数值大小",
            'line': "折线图适合展示数据随时间或其他连续变量的变化趋势",
            'pie': "饼图适合展示各部分占整体的比例关系",
            'scatter': "散点图适合探索两个数值变量之间的相关关系"
        }
        md_content.append(chart_descriptions.get(chart_type, "图表展示了数据的可视化结果"))
        
        return "\n".join(md_content) 