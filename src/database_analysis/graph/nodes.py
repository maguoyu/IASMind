# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import json
import re
import time
from typing import Dict, List, Any, Optional
from decimal import Decimal

from src.llms.llm import get_llm_by_type
from src.database.models import DataSource
from .state import DatabaseAnalysisState, AnalysisEntity, TableMetadata, QueryResult
from src.server.services.intent_recognized_service import IntentRecognized
from src.rag.metadata_milvus import MetadataVectorStore
import logging
logger = logging.getLogger(__name__)

class DatabaseAnalysisNodes:
    """数据库分析节点实现"""

    def __init__(self):
        self.llm = get_llm_by_type("basic")
        self.intent_recognizer = IntentRecognized()
        self.metadata_vector_store = MetadataVectorStore()
    
    @staticmethod
    def _convert_to_json_serializable(value: Any) -> Any:
        """转换数据库值为JSON可序列化的类型"""
        if isinstance(value, Decimal):
            # 将 Decimal 转换为 float
            return float(value)
        elif isinstance(value, (bytes, bytearray)):
            # 将二进制数据转换为字符串
            return value.decode('utf-8', errors='ignore')
        elif hasattr(value, 'isoformat'):
            # 日期时间类型转换为 ISO 格式字符串
            return value.isoformat()
        else:
            return value
    
    @staticmethod
    def _is_numeric_value(value: Any) -> bool:
        """判断值是否为数值类型
        
        支持的数值类型：
        - int, float: Python 基本数值类型
        - Decimal: 数据库精确数值类型
        - bool: 不视为数值（虽然技术上是 int 的子类）
        - 字符串数字: 尝试转换为数值
        """
        if value is None:
            return False
        
        # 排除布尔类型（虽然 bool 是 int 的子类）
        if isinstance(value, bool):
            return False
        
        # 支持的数值类型
        if isinstance(value, (int, float, Decimal)):
            return True
        
        # 尝试将字符串转换为数值
        if isinstance(value, str):
            try:
                float(value.replace(',', ''))  # 处理千分位分隔符
                return True
            except (ValueError, AttributeError):
                return False
        
        # 支持 numpy 类型（如果存在）
        try:
            import numpy as np
            if isinstance(value, (np.integer, np.floating)):
                return True
        except ImportError:
            pass
        
        return False

    def get_connection(self, datasource_id: str):
        """获取数据源连接"""
        import pymysql
        from pymysql.cursors import DictCursor
        
        # 获取数据源信息
        datasource = DataSource.GetById(datasource_id)
        if not datasource:
            raise Exception(f"数据源不存在: {datasource_id}")
        
        if datasource.type == 'mysql':
            connection = pymysql.connect(
                host=datasource.host,
                port=datasource.port,
                user=datasource.username,
                password=datasource.password,
                database=datasource.database,
                charset='utf8mb4',
                cursorclass=DictCursor,
                autocommit=True
            )
            return connection
        else:
            raise Exception(f"暂不支持的数据源类型: {datasource.type}")
    
    def intent_recognized(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """预处理用户查询"""
        try:
            # 基本清理
            user_query = state["user_query"].strip()

            # intent = self.intent_recognizer.analyze_query_intent(user_query, table_name)


            
            # 使用LLM进行查询意图理解和标准化
            prompt = f"""
请识别用户意图，使其更适合数据库分析,以json格式返回：

用户查询: {user_query}

要求:
1. 识别查询意图（intent_types），为统计分析、详细查询、关联查询、时间查询、趋势分析等
2. 提取关键业务实体（entities）,根据用户查询提取实体
3. 如果识别成功,valid为True,否则为False
4. 意图复杂程度complexity_level为simple、medium或complex
5. 是否需要关联查询requires_relations为True或False

返回JSON格式:
{{
    "entities": ["实体1", "实体2"],
    "intent_types": ["意图类型1", "意图类型2"],
    "valid": true,
    "complexity_level": "simple",
    "confidence_score": 0.8,
    "requires_relations": false
}}

请直接返回json格式数据，不要其他说明:
"""
            
            response = self.llm.invoke(prompt)
            content = response.content.strip()
            intent_dict = json.loads(content)
            
            # 将字典转换为Intent对象
            from src.server.services.intent_recognized_service import Intent
            intent = Intent(
                entities=intent_dict.get("entities", []),
                intent_types=intent_dict.get("intent_types", []),
                requires_relations=intent_dict.get("requires_relations", False),
                complexity_level=intent_dict.get("complexity_level", "simple"),
                valid=intent_dict.get("valid", True),
                confidence_score=intent_dict.get("confidence_score", 0.8)
            )
            
            state["intent"] = intent
            return state
            
        except Exception as e:
            # 创建一个失败的Intent对象
            from src.server.services.intent_recognized_service import Intent
            failed_intent = Intent(
                entities=[],
                intent_types=[],
                requires_relations=False,
                complexity_level="simple",
                valid=False,
                confidence_score=0.0
            )
            state["intent"] = failed_intent
            state["error"] = f"查询预处理失败: {str(e)}"
            return state
    

    
    def metadata_retrieval(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """元数据检索"""
        try:
            datasource_id = state["datasource_id"]
            intent = state.get("intent")
            entities = intent.entities if intent else []
            table_name = state.get("table_name")
            
            # 获取数据源连接
            connection = self.get_connection(datasource_id)
            if not connection:
                state["error"] = f"无法连接到数据源: {datasource_id}"
                return state
            
            metadata = {
                "datasource_id": datasource_id,
                "tables": [],
                "relationships": []
            }
            
            # 如果指定了表名，直接获取该表元数据
            if table_name:
                from src.server.services.metadata_service import MetadataService

                metadata_result = MetadataService.get_database_metadata(datasource_id, table_name, use_cache=False, optimize_for_chatbi=False, include_sample_data=True)

                if metadata_result.get("success") and metadata_result.get("data"):
                    table_metadata = metadata_result["data"]["tables"][0]
                    metadata["tables"].append(table_metadata)
            else:
                 # 向量搜索
                query_text = " ".join(entities) if entities else "表结构"
                search_results = self.metadata_vector_store.search_metadata(
                query=query_text, 
                    datasource_ids=[datasource_id],
                        limit=1
                )

                for result in search_results:
                    table_metadata = result.get("metadata", {})
                    if table_metadata:
                        metadata["tables"].append(table_metadata)
            
            # 只有在没有通过MetadataService获取关系数据时才查询
            if not metadata.get("relationships"):
                metadata["relationships"] = self._get_table_relationships(connection, metadata["tables"])
            
            state["metadata"] = metadata
            return state
            
        except Exception as e:
            state["error"] = f"元数据检索失败: {str(e)}"
            return state
    
    def sql_generation(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """SQL生成"""
        try:
            query = state.get("user_query", "")
            intent = state.get("intent")
            entities = intent.entities if intent else []
            metadata = state.get("metadata", {})
            retry_count = state.get("retry_count", 0)
            validation_result = state.get("validation_result", {})
            
            # 构建SQL生成提示
            tables_info = []
            if(state.get("table_name", "")):
                for table in metadata.get("tables", []):
                    columns_str = ", ".join([f"{col['name']}({col['type']})" for col in table.get("columns", [])])
                    tables_info.append(f"表 {table['table_name']}: {columns_str}")
            else:
                for table in metadata.get("tables", []):
                    # 使用优化的元数据格式构建提示信息
                    table_info = table['raw_data']
                    tables_info.append(table_info)
            
            # 基础提示
            prompt = f"""
根据用户查询和数据库元数据，生成相应的SQL查询语句：

用户查询: {query}

可用表结构:
{chr(10).join(tables_info)}

识别的实体:
{json.dumps(entities, ensure_ascii=False, indent=2)}
"""
            
            # 如果是重试，添加错误信息和改进建议
            if retry_count > 0 and validation_result.get("validation_errors"):
                previous_sql = state.get("sql_query", "")
                errors = validation_result.get("validation_errors", [])
                
                prompt += f"""

注意：这是第 {retry_count + 1} 次尝试生成SQL。
之前的SQL语句存在问题:
{previous_sql}

错误信息:
{chr(10).join(errors)}

请根据错误信息修正SQL语句，特别注意：
1. 表名和字段名的正确性
2. SQL语法的正确性
3. 数据类型的匹配
4. JOIN条件的准确性
5. 列名别名尽量使用中文有单位附加在后面，不要使用英文别名
"""
            
            prompt += """

要求:
1. 生成标准SQL语句
2. 确保字段名和表名正确
3. 添加适当的WHERE条件
4. 如需聚合，使用适当的GROUP BY
5. 必须添加LIMIT限制结果数量，根据查询场景智能选择：
   - 聚合统计查询（SUM、COUNT、AVG等单值结果）：LIMIT 1
   - 分组统计查询（GROUP BY）：LIMIT 50-100
   - 详细数据列表查询：LIMIT 100-500
   - 用户明确要求"所有"、"全部"数据时：不限制结果数量
6. 列名别名必须使用中文有单位附加在后面，不要使用英文别名（例如：使用"总加油量（千克）"而不是"total_refueling_weight"）

只返回SQL语句，不要其他说明:
"""
            
            response = self.llm.invoke(prompt)
            sql_query = response.content.strip()
            
            # 清理SQL语句
            sql_query = re.sub(r'^```sql\s*', '', sql_query)
            sql_query = re.sub(r'\s*```$', '', sql_query)
            sql_query = sql_query.strip()
            
            # 更新状态
            state["sql_query"] = sql_query
            state["retry_count"] = retry_count + 1  # 增加重试计数
            
            return state
            
        except Exception as e:
            state["error"] = f"SQL生成失败: {str(e)}"
            return state
    
    def sql_validation(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """SQL验证"""
        try:
            sql_query = state["sql_query"]
            datasource_id = state["datasource_id"]
            
            validation_result = {
                "is_valid": True,
                "issues": [],
                "suggestions": []
            }
            
            # 基本SQL语法检查
            if not sql_query.strip():
                validation_result["is_valid"] = False
                validation_result["issues"].append("SQL语句为空")
                state["validation_result"] = validation_result
                return state
            
            # 检查危险操作
            dangerous_keywords = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "CREATE"]
            for keyword in dangerous_keywords:
                if keyword.upper() in sql_query.upper():
                    validation_result["is_valid"] = False
                    validation_result["issues"].append(f"包含危险操作: {keyword}")
            
            # 尝试执行EXPLAIN来验证SQL
            try:
                connection = self.get_connection(datasource_id)
                if connection:
                    with connection.cursor() as cursor:
                        # 只执行EXPLAIN，不实际运行查询
                        explain_sql = f"EXPLAIN {sql_query}"
                        cursor.execute(explain_sql)
                        # 如果EXPLAIN成功，说明SQL语法正确
                        validation_result["suggestions"].append("SQL语法验证通过")
            except Exception as e:
                validation_result["is_valid"] = False
                validation_result["issues"].append(f"SQL语法错误: {str(e)}")
            
            state["validation_result"] = validation_result
            return state
            
        except Exception as e:
            state["error"] = f"SQL验证失败: {str(e)}"
            return state
    
    def sql_execution(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """SQL执行"""
        try:
            sql_query = state["sql_query"]
            datasource_id = state["datasource_id"]
            validation_result = state.get("validation_result", {})
            
            if not validation_result.get("is_valid", False):
                state["error"] = "SQL验证失败，无法执行"
                return state
            
            # 执行SQL查询
            start_time = time.time()
            connection = self.get_connection(datasource_id)
            
            if not connection:
                state["error"] = f"无法连接到数据源: {datasource_id}"
                return state
            
            with connection.cursor() as cursor:
                cursor.execute(sql_query)
                rows = cursor.fetchall()
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            execution_time = time.time() - start_time
            
            # 转换结果为字典列表
            data = []
            for row in rows:
                if isinstance(row, dict):
                    # 转换字典中的值为JSON可序列化类型
                    row_dict = {k: self._convert_to_json_serializable(v) for k, v in row.items()}
                    data.append(row_dict)
                else:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        value = row[i] if i < len(row) else None
                        row_dict[col] = self._convert_to_json_serializable(value)
                    data.append(row_dict)
            
            query_result = {
                "data": data,
                "columns": columns,
                "row_count": len(data),
                "execution_time": execution_time
            }
            
            state["query_result"] = query_result
            return state
            
        except Exception as e:
            state["error"] = f"SQL执行失败: {str(e)}"
            return state
    
    def result_type_determination(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """判断结果显示类型"""
        try:
            query_result = state.get("query_result", {})
            user_query = state["user_query"]
            
            if not query_result.get("data"):
                state["result_type"] = "text"
                return state
            
            data = query_result["data"]
            columns = query_result["columns"]
            
            # 使用规则+LLM判断显示类型
            result_type = "table"  # 默认表格
            
            # 规则判断
            numeric_columns = []
            for col in columns:
                if any(self._is_numeric_value(row.get(col)) for row in data[:5]):
                    numeric_columns.append(col)
            
            # 如果有多个数值列且数据量适中，考虑图表
            if len(numeric_columns) >= 1 and len(data) > 1 and len(data) <= 1000:
                # 使用LLM进一步判断显示方式和图表类型
                prompt = f"""
根据用户查询和数据特征，判断最适合的显示方式和图表类型：

用户查询: {user_query}
数据行数: {len(data)}
数据列: {columns}
数值列: {numeric_columns}

请选择最适合的显示方式:
1. chart - 适合趋势分析、对比分析、统计分析
   - bar: 适合类别对比、排名展示（如：各部门销售额、产品数量对比）
   - line: 适合时间序列、趋势变化（如：月度销售趋势、增长曲线）
   - pie: 适合占比分析、组成结构（如：市场份额、销售占比）
   - scatter: 适合相关性分析、分布展示（如：价格与销量关系、数据分布）
   - area: 适合累积趋势、数量变化（如：累计销售额、库存变化）
2. table - 适合详细数据查看、列表展示
3. text - 适合简单统计结果、摘要信息

返回格式: 
- 如果选择 chart，返回: chart:图表类型 (例如: chart:bar, chart:pie, chart:line)
- 如果选择 table，返回: table
- 如果选择 text，返回: text

只返回一个结果，不要有其他内容。
"""
                
                response = self.llm.invoke(prompt)
                suggested_response = response.content.strip().lower()
                
                # 解析返回结果
                if ":" in suggested_response:
                    # 格式：chart:bar
                    parts = suggested_response.split(":", 1)
                    result_type = parts[0].strip()
                    chart_type = parts[1].strip() if len(parts) > 1 else None
                else:
                    # 格式：chart / table / text
                    result_type = suggested_response
                    chart_type = None
                
                # 验证返回的类型是否有效
                if result_type in ["chart", "table", "text"]:
                    state["result_type"] = result_type
                    
                    # 如果是图表类型，生成图表配置
                    if result_type == "chart":
                        # 如果LLM指定了具体的图表类型，使用它
                        if chart_type and chart_type in ["bar", "line", "pie", "scatter", "area"]:
                            chart_config = self._generate_chart_config_with_type(
                                data, columns, user_query, chart_type
                            )
                        else:
                            # 回退到原有的自动判断逻辑
                            chart_config = self._generate_chart_config(data, columns, user_query)
                        
                        state["chart_config"] = chart_config
                else:
                    # 如果返回无效，使用默认值
                    state["result_type"] = result_type
            else:
                state["result_type"] = result_type
            
            return state
            
        except Exception as e:
            state["error"] = f"结果类型判断失败: {str(e)}"
            return state
    
    def _get_table_metadata(self, connection, table_name: str) -> Optional[Dict[str, Any]]:
        """获取表元数据"""
        try:
            # 清理table_name中可能存在的引号
            clean_table_name = table_name.strip().strip("'\"")
            
            # 获取表结构（包含列描述信息）
            columns_query = f"""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '{clean_table_name}'
            ORDER BY ORDINAL_POSITION
            """
            
            with connection.cursor() as cursor:
                cursor.execute(columns_query)
                result = cursor.fetchall()
                columns = []
                for row in result:
                    # 处理DictCursor返回的字典格式
                    if isinstance(row, dict):
                        columns.append({
                            "name": row.get("COLUMN_NAME"),
                            "type": row.get("DATA_TYPE"),
                            "nullable": row.get("IS_NULLABLE") == "YES",
                            "default": row.get("COLUMN_DEFAULT"),
                            "comment": row.get("COLUMN_COMMENT", "")
                        })
                    else:
                        # 处理普通cursor返回的元组格式
                        columns.append({
                            "name": row[0],
                            "type": row[1],
                            "nullable": row[2] == "YES",
                            "default": row[3],
                            "comment": row[4] if len(row) > 4 else ""
                        })
            
            # 获取样本数据
            sample_query = f"SELECT * FROM {clean_table_name} LIMIT 2"
            with connection.cursor() as cursor:
                cursor.execute(sample_query)
                sample_result = cursor.fetchall()
                sample_data = []
                for row in sample_result:
                    if isinstance(row, dict):
                        sample_data.append(row)
                    else:
                        row_dict = {}
                        for i, col in enumerate(columns):
                            row_dict[col["name"]] = row[i] if i < len(row) else None
                        sample_data.append(row_dict)
            
            return {
                "table_name": clean_table_name,
                "columns": columns,
                "sample_data": sample_data
            }
            
        except Exception as e:
            print(f"获取表元数据失败: {str(e)}")
            return None
    
    def _recommend_tables(self, connection, entities: List[Dict[str, Any]]) -> List[str]:
        """根据实体推荐相关表"""
        try:
            # 获取所有表名
            tables_query = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"
            with connection.cursor() as cursor:
                cursor.execute(tables_query)
                result = cursor.fetchall()
                all_tables = [row[0] for row in result]
            
            # 根据实体匹配表名
            recommended = []
            entity_names = [entity["name"].lower() for entity in entities]
            
            for table in all_tables:
                table_lower = table.lower()
                for entity_name in entity_names:
                    if entity_name in table_lower or table_lower in entity_name:
                        if table not in recommended:
                            recommended.append(table)
            
            # 如果没有匹配的，返回前几个表作为默认
            if not recommended:
                recommended = all_tables[:3]
            
            return recommended[:5]  # 最多返回5个表
            
        except Exception:
            return []
    
    def _get_table_relationships(self, connection, tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """获取表间关系"""
        # 简化实现，返回空列表
        # 实际项目中可以查询外键关系
        return []
    
    def _generate_chart_config(self, data: List[Dict[str, Any]], columns: List[str], user_query: str) -> Dict[str, Any]:
        """生成图表配置（自动判断图表类型）"""
        if not data:
            return {}
        
        # 分析数据类型
        numeric_columns = []
        categorical_columns = []
        
        for col in columns:
            sample_values = [row.get(col) for row in data[:10] if row.get(col) is not None]
            if sample_values:
                # 检查列名是否包含时间相关关键词
                is_time_related = any(keyword in col.lower() for keyword in ['年', '月', '日', '周', '时', '季', 'year', 'month', 'day', 'date', 'time', '日期', '年份'])
                
                if all(self._is_numeric_value(v) for v in sample_values):
                    # 如果是时间相关列，标记为分类列；否则为数值列
                    if is_time_related:
                        categorical_columns.append(col)
                    else:
                        numeric_columns.append(col)
                else:
                    categorical_columns.append(col)
        
        # 默认配置
        config = {
            "type": "table",  # 默认表格
            "data": data
        }
        
        # 根据数据特征选择图表类型
        if len(numeric_columns) >= 1 and len(categorical_columns) >= 1:
            config["type"] = "bar"
            config["x"] = categorical_columns[0]
            config["y"] = numeric_columns[0]
        elif len(numeric_columns) >= 2:
            config["type"] = "scatter"
            config["x"] = numeric_columns[0]
            config["y"] = numeric_columns[1]
        elif len(numeric_columns) == 1 and len(categorical_columns) >= 1:
            config["type"] = "line"
            config["x"] = categorical_columns[0]
            config["y"] = numeric_columns[0]
        
        return config
    
    def _generate_chart_config_with_type(self, data: List[Dict[str, Any]], columns: List[str], 
                                         user_query: str, chart_type: str) -> Dict[str, Any]:
        """根据指定的图表类型生成图表配置"""
        if not data:
            return {}
        
        # 分析数据类型
        numeric_columns = []
        categorical_columns = []
        
        for col in columns:
            sample_values = [row.get(col) for row in data[:10] if row.get(col) is not None]
            if sample_values:
                # 检查列名是否包含时间相关关键词
                is_time_related = any(keyword in col.lower() for keyword in ['年', '月', '日', '周', '时', '季', 'year', 'month', 'day', 'date', 'time', '日期', '年份'])
                
                if all(self._is_numeric_value(v) for v in sample_values):
                    # 如果是时间相关列，标记为分类列；否则为数值列
                    if is_time_related:
                        categorical_columns.append(col)
                    else:
                        numeric_columns.append(col)
                else:
                    categorical_columns.append(col)
        
        # 基础配置
        config = {
            "type": chart_type,
            "data": data
        }
        
        # 根据图表类型设置字段映射
        if chart_type in ["bar", "line", "area"]:
            # 柱状图、折线图、面积图：需要 x（类别）和 y（数值）
            if categorical_columns and numeric_columns:
                config["x"] = categorical_columns[0]
                config["y"] = numeric_columns[0]
            elif numeric_columns and len(numeric_columns) >= 1:
                # 没有类别列，使用第一列作为x，第一个数值列作为y
                config["x"] = columns[0]
                config["y"] = numeric_columns[0]
            else:
                # 降级为表格
                config["type"] = "table"
                
        elif chart_type == "pie":
            # 饼图：需要类别和数值
            if categorical_columns and numeric_columns:
                config["x"] = categorical_columns[0]  # 类别（名称）
                config["y"] = numeric_columns[0]      # 数值（value）
            else:
                # 如果没有合适的列，降级为柱状图
                config["type"] = "bar"
                config["x"] = columns[0] if columns else "category"
                config["y"] = columns[1] if len(columns) > 1 else "value"
                
        elif chart_type == "scatter":
            # 散点图：需要两个数值列
            if len(numeric_columns) >= 2:
                config["x"] = numeric_columns[0]
                config["y"] = numeric_columns[1]
            elif len(numeric_columns) == 1 and categorical_columns:
                # 只有一个数值列，转换为柱状图
                config["type"] = "bar"
                config["x"] = categorical_columns[0]
                config["y"] = numeric_columns[0]
            else:
                # 降级为表格
                config["type"] = "table"
        
        return config

        """构建优化的表信息字符串，用于SQL生成提示"""
        try:
            table_name = table.get("name", table.get("table_name", ""))
            table_comment = table.get("comment", table.get("table_comment", ""))
            
            # 构建表描述
            table_desc = f"表 {table_name}"
            if table_comment and table_comment != table_name:
                table_desc += f": {table_comment}"
            
            # 构建列信息
            columns_info = []
            for col in table.get("columns", []):
                col_name = col.get("name", col.get("column_name", ""))
                col_type = col.get("type", col.get("data_type", ""))
                col_comment = col.get("comment", col.get("column_comment", ""))
                
                col_info = f"{col_name}({col_type})"
                
                # 添加约束信息
                if col.get("is_primary"):
                    col_info += "[主键]"
                elif col.get("is_unique"):
                    col_info += "[唯一]"
                elif col.get("has_index"):
                    col_info += "[索引]"
                
                # 添加注释
                if col_comment and col_comment != col_name:
                    col_info += f" // {col_comment}"
                
                columns_info.append(col_info)
            
            result = f"{table_desc}\n列: {', '.join(columns_info)}"
            
            # 添加SQL提示（如果有）
            sql_hints = table.get("sql_hints", [])
            if sql_hints:
                result += f"\nSQL提示: {'; '.join(sql_hints)}"
            
            # 添加外键关系（如果有）
            foreign_keys = table.get("foreign_keys", [])
            if foreign_keys:
                fk_info = []
                for fk in foreign_keys:
                    fk_desc = f"{','.join(fk['columns'])} -> {fk['references']['table']}.{','.join(fk['references']['columns'])}"
                    fk_info.append(fk_desc)
                result += f"\n外键关系: {'; '.join(fk_info)}"
            
            # 添加样本数据（如果有）
            sample_data = table.get("sample_data", [])
            if sample_data:
                result += f"\n样本数据({len(sample_data)}条):"
                for i, row in enumerate(sample_data):
                    row_values = []
                    for col in table.get("columns", []):
                        col_name = col.get("name", col.get("column_name", ""))
                        value = row.get(col_name, "NULL")
                        # 格式化值显示
                        if value is None:
                            row_values.append("NULL")
                        elif isinstance(value, str) and len(value) > 20:
                            row_values.append(f'"{value[:20]}..."')
                        else:
                            row_values.append(f'"{value}"' if isinstance(value, str) else str(value))
                    result += f"\n  行{i+1}: {', '.join(row_values)}"
            
            return result
            
        except Exception as e:
            # 回退到原始格式
            logger.warning(f"构建优化表信息失败，使用原始格式: {e}")
            if "raw_data" in table:
                return f"表 {table.get('table_name', 'unknown')}: {table['raw_data']}"
            else:
                # 简单格式
                columns = table.get("columns", [])
                if columns:
                    cols_str = ", ".join([f"{col.get('name', col.get('column_name', ''))}({col.get('type', col.get('data_type', ''))})" for col in columns])
                    return f"表 {table.get('name', table.get('table_name', ''))}: {cols_str}"
                else:
                    return f"表 {table.get('name', table.get('table_name', ''))}: 无列信息" 