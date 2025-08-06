"""
数据洞察框架模块

提供智能数据分析和洞察功能，包括：
- 异常检测
- 趋势分析
- 相关性分析
- 聚类分析
- 周期性检测
- 统计分析
- 智能报告生成
"""

from .data_insight_framework import (
    DataInsightFramework,
    InsightResult,
    LLMOptimizer,
    SmartLLMOptimizer,
    LocalLLMOptimizer
)

__all__ = [
    'DataInsightFramework',
    'InsightResult', 
    'LLMOptimizer',
    'SmartLLMOptimizer',
    'LocalLLMOptimizer'
]

__version__ = '1.0.0' 