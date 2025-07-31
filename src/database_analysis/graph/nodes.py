# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import json
import re
import time
from typing import Dict, List, Any, Optional

from src.llms.llm import get_llm_by_type
from src.database.models import DataSource
from src.server.services.metadata_vectorize_service import MetadataVectorizeService, BusinessEntityRecognizer
from .state import DatabaseAnalysisState, AnalysisEntity, TableMetadata, QueryResult


class DatabaseAnalysisNodes:
    """数据库分析节点实现"""
    
    def __init__(self):
        self.llm = get_llm_by_type("basic")
        self.metadata_service = MetadataVectorizeService()
        self.entity_recognizer = BusinessEntityRecognizer()
    
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
    
    def preprocess_query(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """预处理用户查询"""
        try:
            user_query = state["user_query"]
            
            # 基本清理
            preprocessed = user_query.strip()
            
            # 使用LLM进行查询意图理解和标准化
            prompt = f"""
请分析并标准化以下用户查询，使其更适合数据库分析：

用户查询: {user_query}

要求:
1. 识别查询意图（统计分析、详细查询、趋势分析等）
2. 提取关键业务实体
3. 标准化查询表达方式
4. 保持原始语义不变

返回标准化后的查询:
"""
            
            response = self.llm.invoke(prompt)
            preprocessed_query = response.content.strip()
            
            state["preprocessed_query"] = preprocessed_query
            return state
            
        except Exception as e:
            state["error"] = f"查询预处理失败: {str(e)}"
            return state
    
    def entity_recognition(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """实体识别"""
        try:
            query = state["preprocessed_query"]
            
            # 使用业务实体识别器
            entities = []
            
            # 识别业务领域实体
            for domain, config in self.entity_recognizer.domain_keywords.items():
                for keyword in config["keywords"]:
                    if keyword.lower() in query.lower():
                        entities.append({
                            "name": keyword,
                            "type": "domain_keyword",
                            "domain": domain,
                            "confidence": 0.8
                        })
                
                for concept in config["related_concepts"]:
                    if concept.lower() in query.lower():
                        entities.append({
                            "name": concept,
                            "type": "related_concept",
                            "domain": domain,
                            "confidence": 0.6
                        })
            
            # 使用LLM进行更精确的实体识别
            prompt = f"""
分析以下查询中的数据实体，识别可能的表名、字段名、数值等：

查询: {query}
数据源ID: {state["datasource_id"]}

请识别:
1. 可能的表名或业务对象
2. 可能的字段名或属性
3. 数值范围或条件
4. 时间相关信息
5. 聚合操作类型

返回JSON格式:
{{
  "tables": ["表名1", "表名2"],
  "columns": ["字段1", "字段2"],
  "values": ["值1", "值2"],
  "time_info": ["时间信息"],
  "aggregations": ["聚合类型"]
}}
"""
            
            response = self.llm.invoke(prompt)
            try:
                llm_entities = json.loads(response.content)
                
                # 合并LLM识别的实体
                for entity_type, entity_list in llm_entities.items():
                    for entity in entity_list:
                        entities.append({
                            "name": entity,
                            "type": entity_type,
                            "confidence": 0.9
                        })
            except json.JSONDecodeError:
                pass
            
            state["entities"] = entities
            return state
            
        except Exception as e:
            state["error"] = f"实体识别失败: {str(e)}"
            return state
    
    def metadata_retrieval(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """元数据检索"""
        try:
            datasource_id = state["datasource_id"]
            entities = state.get("entities", [])
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
                table_metadata = self._get_table_metadata(connection, table_name)
                if table_metadata:
                    metadata["tables"].append(table_metadata)
            else:
                # 根据实体推荐相关表
                recommended_tables = self._recommend_tables(connection, entities)
                for table in recommended_tables:
                    table_metadata = self._get_table_metadata(connection, table)
                    if table_metadata:
                        metadata["tables"].append(table_metadata)
            
            # 获取表间关系
            metadata["relationships"] = self._get_table_relationships(connection, metadata["tables"])
            
            state["metadata"] = metadata
            return state
            
        except Exception as e:
            state["error"] = f"元数据检索失败: {str(e)}"
            return state
    
    def sql_generation(self, state: DatabaseAnalysisState) -> DatabaseAnalysisState:
        """SQL生成"""
        try:
            query = state["preprocessed_query"]
            entities = state.get("entities", [])
            metadata = state.get("metadata", {})
            
            # 构建SQL生成提示
            tables_info = []
            for table in metadata.get("tables", []):
                columns_str = ", ".join([f"{col['name']}({col['type']})" for col in table.get("columns", [])])
                tables_info.append(f"表 {table['name']}: {columns_str}")
            
            prompt = f"""
根据用户查询和数据库元数据，生成相应的SQL查询语句：

用户查询: {query}

可用表结构:
{chr(10).join(tables_info)}

识别的实体:
{json.dumps(entities, ensure_ascii=False, indent=2)}

要求:
1. 生成标准SQL语句
2. 确保字段名和表名正确
3. 添加适当的WHERE条件
4. 如需聚合，使用适当的GROUP BY
5. 限制结果数量（LIMIT 1000）

只返回SQL语句，不要其他说明:
"""
            
            response = self.llm.invoke(prompt)
            sql_query = response.content.strip()
            
            # 清理SQL语句
            sql_query = re.sub(r'^```sql\s*', '', sql_query)
            sql_query = re.sub(r'\s*```$', '', sql_query)
            sql_query = sql_query.strip()
            
            state["sql_query"] = sql_query
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
                    data.append(row)
                else:
                    row_dict = {}
                    for i, col in enumerate(columns):
                        row_dict[col] = row[i] if i < len(row) else None
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
                if any(isinstance(row.get(col), (int, float)) for row in data[:5]):
                    numeric_columns.append(col)
            
            # 如果有多个数值列且数据量适中，考虑图表
            if len(numeric_columns) >= 1 and len(data) > 1 and len(data) <= 1000:
                # 使用LLM进一步判断
                prompt = f"""
根据用户查询和数据特征，判断最适合的显示方式：

用户查询: {user_query}
数据行数: {len(data)}
数据列: {columns}
数值列: {numeric_columns}

请选择最适合的显示方式:
1. chart - 适合趋势分析、对比分析、统计分析
2. table - 适合详细数据查看、列表展示
3. text - 适合简单统计结果、摘要信息

只返回: chart、table 或 text
"""
                
                response = self.llm.invoke(prompt)
                suggested_type = response.content.strip().lower()
                
                if suggested_type in ["chart", "table", "text"]:
                    result_type = suggested_type
            
            state["result_type"] = result_type
            
            # 如果是图表类型，生成图表配置
            if result_type == "chart":
                chart_config = self._generate_chart_config(data, columns, user_query)
                state["chart_config"] = chart_config
            
            return state
            
        except Exception as e:
            state["error"] = f"结果类型判断失败: {str(e)}"
            return state
    
    def _get_table_metadata(self, connection, table_name: str) -> Optional[Dict[str, Any]]:
        """获取表元数据"""
        try:
            # 获取表结构
            columns_query = f"""
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '{table_name}'
            ORDER BY ORDINAL_POSITION
            """
            
            with connection.cursor() as cursor:
                cursor.execute(columns_query)
                result = cursor.fetchall()
                columns = []
                for row in result:
                    columns.append({
                        "name": row[0],
                        "type": row[1],
                        "nullable": row[2] == "YES",
                        "default": row[3]
                    })
            
            # 获取样本数据
            sample_query = f"SELECT * FROM {table_name} LIMIT 5"
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
                "name": table_name,
                "columns": columns,
                "sample_data": sample_data
            }
            
        except Exception:
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
        """生成图表配置"""
        if not data:
            return {}
        
        # 分析数据类型
        numeric_columns = []
        categorical_columns = []
        
        for col in columns:
            sample_values = [row.get(col) for row in data[:10] if row.get(col) is not None]
            if sample_values:
                if all(isinstance(v, (int, float)) for v in sample_values):
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
        elif len(numeric_columns) == 1:
            config["type"] = "line"
            config["y"] = numeric_columns[0]
            config["x"] = categorical_columns[0] if categorical_columns else "index"
        
        return config 