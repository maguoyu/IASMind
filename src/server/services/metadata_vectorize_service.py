"""
元数据向量化服务 - 重构版
采用智能表级拆分 + 多表关联检索的综合方案
为text2sql功能提供高质量的元数据检索支撑
"""

import time
import uuid
import asyncio
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Set, Tuple
from dataclasses import dataclass

from langchain_core.documents import Document
from src.rag.metadata_milvus import MetadataVectorStore
from src.server.services.metadata_service import MetadataService
from src.utils.json_utils import safe_json_loads, safe_json_dumps
import logging

logger = logging.getLogger(__name__)

@dataclass
class VectorizeConfig:
    """向量化配置"""
    include_tables: bool = True
    include_relationships: bool = True
    include_indexes: bool = False
    include_constraints: bool = False
    enhance_descriptions: bool = True  # 是否增强描述信息

@dataclass
class TableRelationship:
    """表关系信息"""
    from_table: str
    to_table: str
    from_columns: List[str]
    to_columns: List[str]
    constraint_name: str
    relationship_type: str = "foreign_key"

class TableRelationshipManager:
    """表关系管理器"""
    
    def __init__(self):
        self.relationships_cache: Dict[str, Dict[str, List[str]]] = {}
    
    def build_relationship_graph(self, datasource_id: str, tables: List[Dict[str, Any]]) -> Dict[str, Dict[str, List[str]]]:
        """构建表关系图"""
        relationships = {}
        
        for table in tables:
            table_name = table['table_name']
            relationships[table_name] = {
                'references': [],      # 该表引用的其他表
                'referenced_by': [],   # 引用该表的其他表
                'related_tables': []   # 所有相关表
            }
            
            # 分析外键约束
            for constraint in table.get('constraints', []):
                if constraint.get('constraint_type', '').upper() == 'FOREIGN KEY':
                    ref_table = constraint.get('referenced_table')
                    if ref_table:
                        relationships[table_name]['references'].append(ref_table)
                        
                        # 确保被引用表的条目存在
                        if ref_table not in relationships:
                            relationships[ref_table] = {
                                'references': [], 'referenced_by': [], 'related_tables': []
                            }
                        relationships[ref_table]['referenced_by'].append(table_name)
        
        # 计算所有相关表
        for table_name in relationships:
            related = set()
            related.update(relationships[table_name]['references'])
            related.update(relationships[table_name]['referenced_by'])
            relationships[table_name]['related_tables'] = list(related)
        
        self.relationships_cache[datasource_id] = relationships
        return relationships
    
    def get_related_tables(self, datasource_id: str, table_name: str, depth: int = 1) -> Set[str]:
        """获取相关表，支持指定深度"""
        if datasource_id not in self.relationships_cache:
            return set()
        
        relationships = self.relationships_cache[datasource_id]
        if table_name not in relationships:
            return set()
        
        related = set()
        to_visit = {table_name}
        visited = set()
        
        for _ in range(depth):
            current_level = to_visit - visited
            if not current_level:
                break
            
            visited.update(current_level)
            next_level = set()
            
            for table in current_level:
                if table in relationships:
                    next_level.update(relationships[table]['related_tables'])
            
            related.update(next_level)
            to_visit = next_level
        
        return related - {table_name}

class BusinessEntityRecognizer:
    """业务实体识别器"""
    
    def __init__(self):
        # 业务领域关键词映射
        self.domain_keywords = {
            "用户管理": {
                "keywords": ["用户", "user", "customer", "member", "account", "人员", "员工"],
                "related_concepts": ["权限", "角色", "登录", "注册", "资料"]
            },
            "订单系统": {
                "keywords": ["订单", "order", "purchase", "transaction", "交易", "买卖"],
                "related_concepts": ["商品", "支付", "物流", "发货", "收货"]
            },
            "商品管理": {
                "keywords": ["商品", "product", "item", "goods", "merchandise", "产品"],
                "related_concepts": ["库存", "价格", "分类", "品牌", "规格"]
            },
            "支付财务": {
                "keywords": ["支付", "payment", "pay", "billing", "财务", "金额", "费用"],
                "related_concepts": ["账单", "发票", "退款", "优惠", "折扣"]
            },
            "车辆管理": {
                "keywords": ["车辆", "vehicle", "car", "truck", "汽车", "货车"],
                "related_concepts": ["司机", "加油", "维修", "保险", "运输"]
            },
            "物流运输": {
                "keywords": ["物流", "logistics", "运输", "transport", "配送", "发货"],
                "related_concepts": ["仓库", "路线", "司机", "车辆", "收货"]
            },
            "航空管理": {
                "keywords": ["航空", "aviation", "aircraft", "airplane", "飞机", "机场", "airport"],
                "related_concepts": ["起降", "跑道", "候机楼", "塔台", "航站楼", "机坪"]
            },
            "航班运营": {
                "keywords": ["航班", "flight", "班次", "航线", "route", "起飞", "降落"],
                "related_concepts": ["时刻表", "延误", "取消", "准点率", "机型", "座位"]
            },
            "航油管理": {
                "keywords": ["航油", "fuel", "燃油", "油料", "加油", "航空煤油"],
                "related_concepts": ["油耗", "消耗", "效率", "成本", "油箱", "补给"]
            },
            "机型设备": {
                "keywords": ["机型", "aircraft_type", "boeing", "airbus", "B737", "A320", "设备"],
                "related_concepts": ["维修", "保养", "检修", "零件", "性能", "配置"]
            },
            "航空数据": {
                "keywords": ["架次", "frequency", "passenger", "乘客", "载客", "货运"],
                "related_concepts": ["客座率", "载重", "里程", "飞行时间", "统计", "分析"]
            }
        }
        
        # 查询意图模式
        self.intent_patterns = {
            "统计分析": ["统计", "分析", "汇总", "报表", "趋势", "对比"],
            "详细查询": ["详细", "明细", "列表", "记录", "信息"],
            "关联查询": ["关联", "关系", "相关", "对应", "匹配"],
            "时间查询": ["时间", "日期", "期间", "最近", "历史"]
        }
    
    def recognize_entities(self, query: str) -> List[str]:
        """识别查询中的业务实体"""
        recognized = []
        query_lower = query.lower()
        
        for domain, info in self.domain_keywords.items():
            # 检查主关键词
            if any(keyword in query for keyword in info["keywords"]):
                recognized.append(domain)
            # 检查相关概念
            elif any(concept in query for concept in info["related_concepts"]):
                recognized.append(domain)
        
        return recognized
    
    def analyze_query_intent(self, query: str) -> Dict[str, Any]:
        """分析查询意图"""
        intent = {
            "entities": self.recognize_entities(query),
            "intent_types": [],
            "requires_relations": False,
            "complexity_level": "simple"
        }
        
        # 分析意图类型
        for intent_type, patterns in self.intent_patterns.items():
            if any(pattern in query for pattern in patterns):
                intent["intent_types"].append(intent_type)
        
        # 判断是否需要关联查询
        relation_indicators = ["关联", "相关", "统计", "分析", "明细", "对应"]
        intent["requires_relations"] = any(indicator in query for indicator in relation_indicators)
        
        # 判断复杂度
        if len(intent["entities"]) > 1 or intent["requires_relations"]:
            intent["complexity_level"] = "complex"
        elif intent["intent_types"]:
            intent["complexity_level"] = "medium"
        
        return intent

class SmartTableDescriptionGenerator:
    """智能表描述生成器"""
    
    @classmethod
    def generate_comprehensive_table_description(cls, table_data: Dict[str, Any], 
                                               relationships: Dict[str, List[str]] = None) -> str:
        """生成全面的表级描述"""
        
        table_name = table_data.get("table_name", "")
        table_comment = table_data.get("table_comment", "")
        columns = table_data.get("columns", [])
        
        # 基础信息
        description_parts = []
        description_parts.append(f"数据表: {table_name}")
        
        if table_comment:
            description_parts.append(f"业务用途: {table_comment}")
        
        # 推断业务领域
        business_domain = cls._infer_business_domain(table_name, table_comment)
        if business_domain:
            description_parts.append(f"业务领域: {business_domain}")
        
        # 分类字段信息
        field_categories = cls._categorize_columns(columns)
        
        # 主键信息
        if field_categories["primary_keys"]:
            pk_desc = ", ".join([f"{col['column_name']}({col.get('column_comment', '')})" 
                               for col in field_categories["primary_keys"]])
            description_parts.append(f"主键: {pk_desc}")
        
        # 核心业务字段
        if field_categories["business_fields"]:
            business_desc = ", ".join([
                f"{col['column_name']}({col.get('column_comment', col['data_type'])})"
                for col in field_categories["business_fields"][:8]
            ])
            description_parts.append(f"核心字段: {business_desc}")
        
        # 金额字段
        if field_categories["amount_fields"]:
            amount_desc = ", ".join([f"{col['column_name']}({col.get('column_comment', '')})" 
                                   for col in field_categories["amount_fields"]])
            description_parts.append(f"金额字段: {amount_desc}")
        
        # 时间字段
        if field_categories["time_fields"]:
            time_desc = ", ".join([f"{col['column_name']}({col.get('column_comment', '')})" 
                                 for col in field_categories["time_fields"]])
            description_parts.append(f"时间字段: {time_desc}")
        
        # 状态字段
        if field_categories["status_fields"]:
            status_desc = ", ".join([f"{col['column_name']}({col.get('column_comment', '')})" 
                                   for col in field_categories["status_fields"]])
            description_parts.append(f"状态字段: {status_desc}")
        
        # 关联字段
        if field_categories["reference_fields"]:
            ref_desc = ", ".join([f"{col['column_name']}({col.get('column_comment', '')})" 
                                for col in field_categories["reference_fields"][:5]])
            description_parts.append(f"关联字段: {ref_desc}")
        
        # 关系信息
        if relationships:
            related_tables = relationships.get('related_tables', [])
            if related_tables:
                description_parts.append(f"关联表: {', '.join(related_tables[:5])}")
        
        # 查询特性提示
        query_features = cls._generate_query_features(field_categories, relationships)
        if query_features:
            description_parts.append(f"查询特性: {', '.join(query_features)}")
        
        # SQL生成提示
        sql_hints = cls._generate_sql_hints(table_name, field_categories)
        if sql_hints:
            description_parts.append(f"SQL提示: {', '.join(sql_hints)}")
        
        return " | ".join(description_parts)
    
    @classmethod
    def _infer_business_domain(cls, table_name: str, table_comment: str) -> str:
        """推断业务领域"""
        content = f"{table_name} {table_comment}".lower()
        
        domain_patterns = {
            "用户管理": ["user", "customer", "member", "account", "用户", "客户", "会员"],
            "订单系统": ["order", "purchase", "transaction", "订单", "交易", "买卖"],
            "商品管理": ["product", "item", "goods", "商品", "产品", "货物"],
            "支付财务": ["payment", "billing", "financial", "支付", "财务", "账单"],
            "车辆管理": ["vehicle", "car", "truck", "车辆", "汽车", "货车"],
            "物流运输": ["logistics", "transport", "shipping", "物流", "运输", "配送"],
            "系统管理": ["system", "config", "setting", "系统", "配置", "设置"]
        }
        
        for domain, patterns in domain_patterns.items():
            if any(pattern in content for pattern in patterns):
                return domain
        
        return ""
    
    @classmethod
    def _categorize_columns(cls, columns: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
        """分类列信息"""
        categories = {
            "primary_keys": [],
            "business_fields": [],
            "amount_fields": [],
            "time_fields": [],
            "status_fields": [],
            "reference_fields": [],
            "other_fields": []
        }
        
        for col in columns:
            col_name = col["column_name"].lower()
            col_comment = col.get("column_comment", "").lower()
            col_key = col.get("column_key", "")
            
            # 主键
            if col_key == "PRI":
                categories["primary_keys"].append(col)
            # 时间字段
            elif any(time_word in col_name for time_word in 
                    ["time", "date", "created", "updated", "modified"]):
                categories["time_fields"].append(col)
            # 金额字段
            elif any(money_word in col_name for money_word in 
                    ["amount", "price", "cost", "fee", "money", "pay"]) or \
                 any(money_word in col_comment for money_word in 
                    ["金额", "价格", "费用", "成本", "支付"]):
                categories["amount_fields"].append(col)
            # 状态字段
            elif any(status_word in col_name for status_word in 
                    ["status", "state", "flag", "type"]) or \
                 any(status_word in col_comment for status_word in 
                    ["状态", "类型", "标识"]):
                categories["status_fields"].append(col)
            # 关联字段
            elif col_key in ["MUL", "UNI"] or "_id" in col_name or "id" == col_name:
                categories["reference_fields"].append(col)
            # 业务字段（有详细注释的）
            elif col.get("column_comment") and len(col.get("column_comment", "")) > 3:
                categories["business_fields"].append(col)
            else:
                categories["other_fields"].append(col)
        
        return categories
    
    @classmethod
    def _generate_query_features(cls, field_categories: Dict, relationships: Dict = None) -> List[str]:
        """生成查询特性标签"""
        features = []
        
        if field_categories["time_fields"]:
            features.append("支持时间范围查询")
        if field_categories["amount_fields"]:
            features.append("支持金额统计")
        if field_categories["status_fields"]:
            features.append("支持状态筛选")
        if relationships and relationships.get('related_tables'):
            features.append("支持多表关联")
        if field_categories["business_fields"]:
            features.append("包含业务属性")
        
        return features
    
    @classmethod
    def _generate_sql_hints(cls, table_name: str, field_categories: Dict) -> List[str]:
        """生成SQL提示"""
        hints = []
        
        # 常用SELECT字段建议
        important_fields = []
        if field_categories["primary_keys"]:
            important_fields.extend([col["column_name"] for col in field_categories["primary_keys"]])
        if field_categories["business_fields"]:
            important_fields.extend([col["column_name"] for col in field_categories["business_fields"][:3]])
        
        if important_fields:
            hints.append(f"常用字段: {', '.join(important_fields)}")
        
        # WHERE条件建议
        if field_categories["status_fields"]:
            status_field = field_categories["status_fields"][0]["column_name"]
            hints.append(f"状态筛选: WHERE {status_field} = ?")
        
        if field_categories["time_fields"]:
            time_field = field_categories["time_fields"][0]["column_name"]
            hints.append(f"时间筛选: WHERE {time_field} BETWEEN ? AND ?")
        
        return hints

class SmartMultiTableRetriever:
    """智能多表检索器"""
    
    def __init__(self, vector_store: MetadataVectorStore):
        self.vector_store = vector_store
        self.relationship_manager = TableRelationshipManager()
        self.entity_recognizer = BusinessEntityRecognizer()
    
    async def smart_search(self, query: str, datasource_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """智能多表检索主入口"""
        
        # 1. 分析查询意图
        intent = self.entity_recognizer.analyze_query_intent(query)
        logger.info(f"查询意图分析: {intent}")
        
        # 2. 基础向量检索
        base_results = await self._basic_search(query, datasource_id, limit//2)
        
        # 3. 根据意图决定是否需要扩展检索
        all_results = base_results.copy()
        
        if intent["requires_relations"] or intent["complexity_level"] == "complex":
            # 关系感知扩展
            relation_results = await self._expand_by_relations(
                base_results, datasource_id, intent
            )
            all_results.extend(relation_results)
            
            # 关键词扩展检索
            keyword_results = await self._expand_by_keywords(query, datasource_id, intent)
            all_results.extend(keyword_results)
        
        # 4. 智能合并和排序
        final_results = self._smart_merge(all_results, query, intent)
        
        return final_results[:limit]
    
    async def _basic_search(self, query: str, datasource_id: str, limit: int) -> List[Dict[str, Any]]:
        """基础向量检索"""
        return self.vector_store.search_metadata(
            query=query,
            datasource_ids=[datasource_id],
            limit=limit
        )
    
    async def _expand_by_relations(self, base_results: List[Dict], 
                                 datasource_id: str, intent: Dict) -> List[Dict[str, Any]]:
        """基于关系扩展检索"""
        if not base_results:
            return []
        
        # 获取种子表
        seed_tables = set()
        for result in base_results:
            table_name = result.get('metadata', {}).get('table_name')
            if table_name:
                seed_tables.add(table_name)
        
        # 获取相关表
        related_tables = set()
        for table in seed_tables:
            # 根据查询复杂度决定关系深度
            depth = 2 if intent["complexity_level"] == "complex" else 1
            related = self.relationship_manager.get_related_tables(
                datasource_id, table, depth
            )
            related_tables.update(related)
        
        # 检索相关表的元数据
        relation_results = []
        for table_name in related_tables:
            table_results = await self._search_by_table_name(table_name, datasource_id)
            relation_results.extend(table_results)
        
        return relation_results
    
    async def _expand_by_keywords(self, query: str, datasource_id: str, 
                                intent: Dict) -> List[Dict[str, Any]]:
        """基于关键词扩展检索"""
        expanded_queries = []
        
        # 基于识别的实体生成扩展查询
        for entity in intent["entities"]:
            entity_keywords = self.entity_recognizer.domain_keywords.get(entity, {})
            for keyword in entity_keywords.get("keywords", [])[:3]:
                if keyword not in query:
                    expanded_query = f"{query} {keyword}"
                    expanded_queries.append(expanded_query)
        
        # 执行扩展检索
        keyword_results = []
        for exp_query in expanded_queries[:3]:  # 限制扩展查询数量
            results = await self._basic_search(exp_query, datasource_id, 3)
            keyword_results.extend(results)
        
        return keyword_results
    
    async def _search_by_table_name(self, table_name: str, datasource_id: str) -> List[Dict[str, Any]]:
        """根据表名搜索元数据"""
        return self.vector_store.search_metadata(
            query=f"table {table_name}",
            datasource_ids=[datasource_id],
            limit=1
        )
    
    def _smart_merge(self, all_results: List[Dict], query: str, intent: Dict) -> List[Dict[str, Any]]:
        """智能合并多个检索结果"""
        
        # 按表名去重
        seen_tables = set()
        merged = []
        
        for result in all_results:
            table_name = result.get('metadata', {}).get('table_name')
            if table_name and table_name not in seen_tables:
                seen_tables.add(table_name)
                # 重新计算综合相关性分数
                result['final_score'] = self._calculate_comprehensive_score(result, query, intent)
                merged.append(result)
        
        # 按综合分数排序
        return sorted(merged, key=lambda x: x.get('final_score', 0), reverse=True)
    
    def _calculate_comprehensive_score(self, result: Dict, query: str, intent: Dict) -> float:
        """计算综合相关性分数"""
        base_score = result.get('score', 0.5)
        
        content = result.get('content', '')
        table_name = result.get('metadata', {}).get('table_name', '')
        
        # 基础分数权重
        score = base_score * 0.4
        
        # 表名匹配度
        query_words = set(query.lower().split())
        if any(word in table_name.lower() for word in query_words):
            score += 0.2
        
        # 业务实体匹配度
        entity_match_count = 0
        for entity in intent["entities"]:
            if entity in content:
                entity_match_count += 1
        
        if intent["entities"]:
            entity_score = entity_match_count / len(intent["entities"])
            score += entity_score * 0.3
        
        # 内容相关性
        content_words = set(content.lower().split())
        intersection = len(query_words & content_words)
        union = len(query_words | content_words)
        if union > 0:
            jaccard_score = intersection / union
            score += jaccard_score * 0.1
        
        return min(score, 1.0)

class MetadataVectorizeService:
    """元数据向量化服务 - 重构版"""
    
    # 简单的内存状态存储（生产环境可以使用Redis）
    _vectorize_status: Dict[str, Dict[str, Any]] = {}
    
    def __init__(self):
        self.relationship_manager = TableRelationshipManager()
        self.description_generator = SmartTableDescriptionGenerator()
        self.multi_table_retriever = None  # 延迟初始化
    
    @classmethod
    def _create_enhanced_table_documents(cls, datasource_id: str, metadata: Dict[str, Any], 
                                       config: VectorizeConfig) -> List[Document]:
        """创建增强的表级文档"""
        documents = []
        tables = metadata.get("tables", [])
        
        # 构建表关系图
        relationship_manager = TableRelationshipManager()
        relationships = relationship_manager.build_relationship_graph(datasource_id, tables)
        
        # 处理每个表
        for table in tables:
            table_name = table.get("table_name", "")
            
            # 获取该表的关系信息
            table_relationships = relationships.get(table_name, {})
            
            # 生成增强的表描述
            description = SmartTableDescriptionGenerator.generate_comprehensive_table_description(
                table, table_relationships
            )
            
            # 创建文档元数据
            doc_metadata = {
                "datasource_id": datasource_id,
                "item_type": "table",
                "table_name": table_name,
                "business_domain": cls._extract_business_domain(description),
                "has_relationships": len(table_relationships.get('related_tables', [])) > 0,
                "field_count": len(table.get("columns", [])),
                "raw_data": safe_json_dumps(table)
            }
            
            documents.append(Document(page_content=description, metadata=doc_metadata))
        
        return documents
    
    @classmethod
    def _extract_business_domain(cls, description: str) -> str:
        """从描述中提取业务领域"""
        if "业务领域:" in description:
            parts = description.split("业务领域:")
            if len(parts) > 1:
                domain_part = parts[1].split("|")[0].strip()
                return domain_part
        return ""
    
    @classmethod
    def _update_vectorize_status(
        cls,
        datasource_id: str,
        status: str,
        progress: float = 0.0,
        vectors_count: int = 0,
        total_items: int = 0,
        started_at: str = None,
        completed_at: str = None,
        error_message: str = None
    ):
        """更新向量化状态"""
        cls._vectorize_status[datasource_id] = {
            "status": status,
            "progress": progress,
            "vectors_count": vectors_count,
            "total_items": total_items,
            "started_at": started_at,
            "completed_at": completed_at,
            "error_message": error_message,
            "updated_at": datetime.now().isoformat()
        }
        logger.info(f"向量化状态更新 - 数据源: {datasource_id}, 状态: {status}, 进度: {progress}%")
    
    @classmethod
    async def vectorize_datasource_metadata(
        cls,
        datasource_id: str,
        include_tables: bool = True,
        include_relationships: bool = True,
        include_indexes: bool = False,
        include_constraints: bool = False,
        enhance_descriptions: bool = True
    ) -> Dict[str, Any]:
        """向量化数据源元数据"""
        start_time = time.time()
        vectors_count = 0
        
        try:
            # 配置向量化选项
            config = VectorizeConfig(
                include_tables=include_tables,
                include_relationships=include_relationships,
                include_indexes=include_indexes,
                include_constraints=include_constraints,
                enhance_descriptions=enhance_descriptions
            )
            
            # 记录开始状态
            cls._update_vectorize_status(
                datasource_id, "processing", 0.0, 0, 0, datetime.now().isoformat()
            )
            
            # 获取元数据
            logger.info(f"开始向量化数据源 {datasource_id} 的元数据")
            metadata_result = MetadataService.get_database_metadata(datasource_id, use_cache=False)
            
            if not metadata_result["success"]:
                raise Exception(f"获取元数据失败: {metadata_result.get('message', '未知错误')}")
            
            metadata = metadata_result["data"]
            
            # 创建增强的文档列表（使用表级拆分）
            documents = cls._create_enhanced_table_documents(datasource_id, metadata, config)
            total_items = len(documents)
            
            cls._update_vectorize_status(
                datasource_id, "processing", 25.0, 0, total_items
            )
            
            # 初始化向量存储
            vector_store = MetadataVectorStore()
            
            # 清理现有向量
            deleted_count = vector_store.delete_by_datasource(datasource_id)
            logger.info(f"清理了 {deleted_count} 个旧的向量记录")
            
            cls._update_vectorize_status(
                datasource_id, "processing", 50.0, 0, total_items
            )
            
            # 添加新的向量
            if documents:
                vectors_count = vector_store.add_metadata_vectors(datasource_id, documents)
            
            cls._update_vectorize_status(
                datasource_id, "processing", 90.0, vectors_count, total_items
            )
            
            processing_time = time.time() - start_time
            
            # 更新完成状态
            cls._update_vectorize_status(
                datasource_id, "completed", 100.0, vectors_count, total_items,
                completed_at=datetime.now().isoformat()
            )
            
            logger.info(f"向量化完成，生成 {vectors_count} 个向量，耗时 {processing_time:.2f} 秒")
            
            return {
                "success": True,
                "vectors_count": vectors_count,
                "collection_name": "metadata_vectors",
                "processing_time": processing_time,
                "message": f"成功向量化 {vectors_count} 个元数据项目"
            }
            
        except Exception as e:
            # 更新错误状态
            cls._update_vectorize_status(
                datasource_id, "error", 0.0, vectors_count, 0,
                error_message=str(e)
            )
            logger.exception(f"向量化失败: {e}")
            raise
    
    @classmethod
    async def delete_datasource_vectors(cls, datasource_id: str) -> Dict[str, Any]:
        """删除数据源的所有向量"""
        try:
            vector_store = MetadataVectorStore()
            deleted_count = vector_store.delete_by_datasource(datasource_id)
            
            # 清理状态
            if datasource_id in cls._vectorize_status:
                del cls._vectorize_status[datasource_id]
            
            return {
                "success": True,
                "deleted_count": deleted_count,
                "message": f"已删除数据源 {datasource_id} 的 {deleted_count} 个向量"
            }
            
        except Exception as e:
            logger.exception(f"删除向量失败: {e}")
            raise
    
    @classmethod
    async def search_metadata_vectors(
        cls,
        query: str,
        datasource_ids: Optional[List[str]] = None,
        limit: int = 10,
        use_smart_search: bool = True
    ) -> Dict[str, Any]:
        """搜索元数据向量 - 智能版"""
        try:
            vector_store = MetadataVectorStore()
            
            if use_smart_search and datasource_ids and len(datasource_ids) == 1:
                # 使用智能多表检索
                smart_retriever = SmartMultiTableRetriever(vector_store)
                results = await smart_retriever.smart_search(query, datasource_ids[0], limit)
            else:
                # 使用标准检索
                results = vector_store.search_metadata(query, datasource_ids, limit)
            
            # 格式化搜索结果
            search_results = []
            for result in results:
                metadata = result["metadata"]
                search_results.append({
                    "content": result["content"],
                    "score": result.get("score", result.get("final_score", 0)),
                    "datasource_id": metadata.get("datasource_id"),
                    "item_type": metadata.get("item_type"),
                    "table_name": metadata.get("table_name"),
                    "business_domain": metadata.get("business_domain"),
                    "raw_data": safe_json_loads(metadata.get("raw_data", "{}"))
                })
            
            return {
                "success": True,
                "query": query,
                "results": search_results,
                "count": len(search_results),
                "message": f"找到 {len(search_results)} 个相关结果"
            }
            
        except Exception as e:
            logger.exception(f"搜索向量失败: {e}")
            raise
    
    @classmethod
    def get_vectorize_status(cls, datasource_id: str) -> Dict[str, Any]:
        """获取向量化状态"""
        try:
            status_data = cls._vectorize_status.get(datasource_id, {
                "status": "idle",
                "progress": 0.0,
                "vectors_count": 0,
                "total_items": 0,
                "started_at": None,
                "completed_at": None,
                "error_message": None
            })
            
            return {
                "success": True,
                **status_data,
                "message": "获取状态成功"
            }
            
        except Exception as e:
            logger.exception(f"获取向量化状态失败: {e}")
            return {
                "success": False,
                "status": "error",
                "progress": 0.0,
                "vectors_count": 0,
                "total_items": 0,
                "started_at": None,
                "completed_at": None,
                "error_message": str(e),
                "message": f"获取状态失败: {str(e)}"
            }
    
    @classmethod
    def get_vectorize_stats(cls, datasource_id: str) -> Dict[str, Any]:
        """获取向量化统计信息"""
        try:
            vector_store = MetadataVectorStore()
            stats = vector_store.get_stats(datasource_id)
            
            return {
                "success": True,
                "stats": stats,
                "message": "获取统计信息成功"
            }
            
        except Exception as e:
            logger.exception(f"获取统计信息失败: {e}")
            return {
                "success": False,
                "stats": {"total_vectors": 0, "status": "error"},
                "message": f"获取统计信息失败: {str(e)}"
            } 