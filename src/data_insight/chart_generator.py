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
            
            # 2. 数据分析和洞察
            insights = []
            if enable_insights:
                insights = self._generate_insights(df)
            
            # 3. 推荐图表类型
            chart_type = self._recommend_chart_type(df, user_prompt)
            
            # 4. 生成ECharts配置
            chart_spec = self._generate_echarts_spec(df, chart_type)
            
            # 5. 生成洞察文档
            insight_md = self._generate_insight_markdown(df, insights, chart_type)
            
            return {
                "spec": json.dumps(chart_spec),
                "insight_md": insight_md,
                "insights": insights,
                "chart_type": chart_type
            }
            
        except Exception as e:
            logger.exception(f"生成图表时发生错误: {str(e)}")
            return {"error": f"生成图表失败: {str(e)}"}
    
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