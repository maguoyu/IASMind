"""
元数据向量化 - 重构版
采用智能表级拆分 + 多表关联检索的综合方案
用于将数据源元数据转换为向量并存储到Milvus，为text2sql功能提供高质量的检索支撑
"""

import json
import os
from typing import Dict, List, Any, Optional
from langchain_core.documents import Document
from langchain_milvus import Milvus, BM25BuiltInFunction
from src.rag.milvus import dense_embeddings_model
import logging

logger = logging.getLogger(__name__)

def metadata_vector_store(drop_old: bool = False):
    """
    元数据向量数据库
    基于现有的知识库Milvus集成方式
    """
    return Milvus(
        builtin_function=BM25BuiltInFunction(output_field_names="sparse"),
        embedding_function=[dense_embeddings_model()],
        vector_field=["dense", "sparse"],
        metadata_field="metadata",
        text_field="text",
        connection_args={"uri": os.getenv("MILVUS_RUL", "http://localhost:19530")},
        consistency_level="Bounded",
        collection_name=os.getenv("METADATA_COLLECTION_NAME", "metadata_vectors"),
        drop_old=drop_old,
        auto_id=True
    )

class MetadataVectorStore:
    """元数据向量存储管理器 - 重构版"""
    
    def __init__(self):
        self.vector_store = metadata_vector_store()
    
    def add_metadata_vectors(self, datasource_id: str, metadata_documents: List[Document]) -> int:
        """添加元数据向量"""
        try:
            if not metadata_documents:
                return 0
            
            # 为所有文档添加数据源ID到元数据中
            for doc in metadata_documents:
                if not doc.metadata:
                    doc.metadata = {}
                doc.metadata["datasource_id"] = datasource_id
            
            # 批量添加文档
            ids = self.vector_store.add_documents(metadata_documents, batch_size=100)
            logger.info(f"成功添加 {len(ids)} 个元数据向量到数据源 {datasource_id}")
            return len(ids)
            
        except Exception as e:
            logger.error(f"添加元数据向量失败: {e}")
            raise
    
    def delete_by_datasource(self, datasource_id: str) -> int:
        """删除指定数据源的所有元数据向量"""
        try:
            expr = f'metadata["datasource_id"] == "{datasource_id}"'
            pks = self.vector_store.get_pks(expr=expr)
            
            if pks:
                deleted_count = len(pks)
                self.vector_store.delete(ids=pks)
                logger.info(f"删除数据源 {datasource_id} 的元数据向量，共删除 {deleted_count} 条记录")
                return deleted_count
            else:
                logger.info(f"数据源 {datasource_id} 没有找到对应的元数据向量")
                return 0
                
        except Exception as e:
            logger.error(f"删除数据源 {datasource_id} 的元数据向量失败: {e}")
            raise
    
    def search_metadata(self, query: str, datasource_ids: Optional[List[str]] = None, 
                       limit: int = 1, filter_business_domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """搜索元数据向量 - 增强版"""
        try:
            # 构建搜索表达式
            search_kwargs = {
                "k": limit,
                "fetch_k": limit * 2,
                "ranker_type": "weighted",
                "ranker_params": {"weights": [0.7, 0.3]},  # 稠密向量权重更高
                "score_threshold": 1,  # 相似度阈值过滤
            }
            
            # 构建过滤条件
            filter_conditions = []
            
            # 数据源过滤
            if datasource_ids:
                datasource_expr = f'metadata["datasource_id"] in {json.dumps(datasource_ids)}'
                filter_conditions.append(datasource_expr)
            
            # 业务领域过滤
            if filter_business_domain:
                domain_expr = f'metadata["business_domain"] == "{filter_business_domain}"'
                filter_conditions.append(domain_expr)
            
            # 合并过滤条件
            if filter_conditions:
                search_kwargs["expr"] = " and ".join([f"({cond})" for cond in filter_conditions])
            
            # 执行搜索
            retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs=search_kwargs
            )
            
            docs = retriever.invoke(query)
            
            # 格式化搜索结果
            results = []
            for i, doc in enumerate(docs):
                result = {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": 1.0 - (i * 0.1),  # 模拟相似度分数
                }
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"搜索元数据向量失败: {e}")
            raise
    
    def search_by_table_name(self, table_name: str, datasource_id: str) -> Optional[Dict[str, Any]]:
        """根据表名精确搜索"""
        try:
            expr = f'metadata["table_name"] == "{table_name}" and metadata["datasource_id"] == "{datasource_id}"'
            
            search_kwargs = {
                "k": 1,
                "expr": expr
            }
            
            retriever = self.vector_store.as_retriever(
                search_type="similarity",
                search_kwargs=search_kwargs
            )
            
            docs = retriever.invoke(f"table {table_name}")
            
            if docs:
                doc = docs[0]
                return {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": 1.0
                }
            
            return None
            
        except Exception as e:
            logger.error(f"根据表名搜索失败: {e}")
            return None
    
    def search_by_business_domain(self, domain: str, datasource_ids: Optional[List[str]] = None, 
                                limit: int = 10) -> List[Dict[str, Any]]:
        """根据业务领域搜索"""
        try:
            filter_conditions = [f'metadata["business_domain"] == "{domain}"']
            
            if datasource_ids:
                datasource_expr = f'metadata["datasource_id"] in {json.dumps(datasource_ids)}'
                filter_conditions.append(datasource_expr)
            
            expr = " and ".join([f"({cond})" for cond in filter_conditions])
            
            search_kwargs = {
                "k": limit,
                "expr": expr
            }
            
            retriever = self.vector_store.as_retriever(
                search_type="similarity", 
                search_kwargs=search_kwargs
            )
            
            docs = retriever.invoke(domain)
            
            results = []
            for i, doc in enumerate(docs):
                result = {
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": 1.0 - (i * 0.1)
                }
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"按业务领域搜索失败: {e}")
            return []
    
    def get_related_tables(self, table_name: str, datasource_id: str) -> List[str]:
        """获取与指定表相关的表列表"""
        try:
            # 首先获取该表的信息
            table_result = self.search_by_table_name(table_name, datasource_id)
            if not table_result:
                return []
            
            # 从表描述中提取关联表信息
            content = table_result["content"]
            related_tables = []
            
            # 解析"关联表"部分
            if "关联表:" in content:
                parts = content.split("关联表:")
                if len(parts) > 1:
                    table_part = parts[1].split("|")[0].strip()
                    related_tables = [t.strip() for t in table_part.split(",")]
            
            return related_tables
            
        except Exception as e:
            logger.error(f"获取关联表失败: {e}")
            return []
    
    def get_stats(self, datasource_id: Optional[str] = None, 
                 business_domain: Optional[str] = None) -> Dict[str, Any]:
        """获取向量统计信息 - 增强版"""
        try:
            filter_conditions = []
            
            if datasource_id:
                filter_conditions.append(f'metadata["datasource_id"] == "{datasource_id}"')
            
            if business_domain:
                filter_conditions.append(f'metadata["business_domain"] == "{business_domain}"')
            
            if filter_conditions:
                expr = " and ".join([f"({cond})" for cond in filter_conditions])
                pks = self.vector_store.get_pks(expr=expr)
                count = len(pks) if pks else 0
            else:
                # 获取总数 - 这里可能需要根据实际情况调整
                count = 0
            
            stats = {
                "total_vectors": count,
                "collection_name": os.getenv("METADATA_COLLECTION_NAME", "metadata_vectors"),
                "status": "active"
            }
            
            # 如果有数据源ID，获取更详细的统计
            if datasource_id:
                # 按业务领域统计
                domain_stats = {}
                for domain in ["用户管理", "订单系统", "商品管理", "支付财务", "车辆管理", "物流运输"]:
                    domain_count = len(self.search_by_business_domain(domain, [datasource_id], limit=100))
                    if domain_count > 0:
                        domain_stats[domain] = domain_count
                
                stats["domain_distribution"] = domain_stats
                
                # 按表数量统计
                table_expr = f'metadata["datasource_id"] == "{datasource_id}" and metadata["item_type"] == "table"'
                table_pks = self.vector_store.get_pks(expr=table_expr)
                stats["table_count"] = len(table_pks) if table_pks else 0
            
            return stats
            
        except Exception as e:
            logger.error(f"获取向量统计信息失败: {e}")
            return {
                "total_vectors": 0,
                "collection_name": os.getenv("METADATA_COLLECTION_NAME", "metadata_vectors"),
                "status": "error",
                "error": str(e)
            } 