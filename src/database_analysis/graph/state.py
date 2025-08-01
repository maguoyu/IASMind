# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

from typing import Dict, List, Optional, TypedDict, Any
from dataclasses import dataclass
from src.server.services.intent_recognized_service import Intent
class DatabaseAnalysisState(TypedDict):
    """数据库分析状态"""
    
    # 输入信息
    user_query: str  # 用户查询
    datasource_id: str  # 数据源ID
    table_name: Optional[str]  # 可选的表名
    
    # 处理过程状态
    intent: Intent  # 意图
    metadata: Dict[str, Any]  # 检索的元数据
    sql_query: str  # 生成的SQL
    validation_result: Dict[str, Any]  # 验证结果
    
    # 执行结果
    query_result: Optional[Dict[str, Any]]  # 查询结果
    result_type: str  # 结果类型: chart, table, text
    chart_config: Optional[Dict[str, Any]]  # 图表配置
    
    # 错误处理
    error: Optional[str]  # 错误信息
    retry_count: int  # 重试次数


@dataclass
class AnalysisEntity:
    """分析实体"""
    name: str
    entity_type: str  # table, column, value, etc.
    confidence: float
    context: str


@dataclass
class TableMetadata:
    """表元数据"""
    table_name: str
    columns: List[Dict[str, str]]
    relationships: List[Dict[str, Any]]
    sample_data: Optional[List[Dict[str, Any]]]


@dataclass
class QueryResult:
    """查询结果"""
    data: List[Dict[str, Any]]
    columns: List[str]
    row_count: int
    execution_time: float 