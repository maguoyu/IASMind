#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
元数据检索流程演示
展示从用户自然语言输入到获取相关元数据的完整过程
"""

import asyncio
import json
from typing import Dict, List, Any

class MetadataRetrievalDemo:
    """元数据检索演示类"""
    
    def __init__(self):
        # 模拟的向量化元数据库
        self.metadata_vectors = [
            {
                "content": "数据表: vehicle_refuel | 业务用途: 车辆加油记录管理 | 业务领域: 车辆管理 | 主键: refuel_id(加油记录ID) | 核心字段: vehicle_id(车辆ID), refuel_volume(加油量（升）), driver_id(司机ID) | 金额字段: refuel_amount(加油金额) | 时间字段: refuel_time(加油时间), created_at() | 状态字段: status(记录状态) | 关联字段: vehicle_id(), driver_id(), station_id() | 关联表: vehicle, driver, gas_station | 查询特性: 支持时间范围查询, 支持金额统计, 支持状态筛选, 支持多表关联, 包含业务属性 | SQL提示: 常用字段: refuel_id, vehicle_id, refuel_volume, 状态筛选: WHERE status = ?, 时间筛选: WHERE refuel_time BETWEEN ? AND ?",
                "metadata": {
                    "datasource_id": "ds_001",
                    "item_type": "table",
                    "table_name": "vehicle_refuel",
                    "business_domain": "车辆管理",
                    "has_relationships": True,
                    "field_count": 8
                },
                "vector_similarity": 0.95
            },
            {
                "content": "数据表: vehicle | 业务用途: 车辆基本信息管理 | 业务领域: 车辆管理 | 主键: vehicle_id(车辆唯一标识) | 核心字段: vehicle_number(车牌号), vehicle_type(车辆类型), brand(品牌), model(型号) | 时间字段: purchase_date(购买日期), created_at() | 状态字段: status(车辆状态) | 关联字段: driver_id() | 关联表: vehicle_refuel, driver, vehicle_maintenance | 查询特性: 支持状态筛选, 支持多表关联, 包含业务属性",
                "metadata": {
                    "datasource_id": "ds_001", 
                    "item_type": "table",
                    "table_name": "vehicle",
                    "business_domain": "车辆管理",
                    "has_relationships": True,
                    "field_count": 10
                },
                "vector_similarity": 0.88
            },
            {
                "content": "数据表: driver | 业务用途: 司机信息管理 | 业务领域: 车辆管理 | 主键: driver_id(司机唯一标识) | 核心字段: driver_name(司机姓名), phone(联系电话), license_number(驾照号码), driver_level(驾驶等级) | 时间字段: hire_date(入职日期), created_at() | 状态字段: status(司机状态) | 关联表: vehicle, vehicle_refuel | 查询特性: 支持状态筛选, 支持多表关联, 包含业务属性",
                "metadata": {
                    "datasource_id": "ds_001",
                    "item_type": "table", 
                    "table_name": "driver",
                    "business_domain": "车辆管理",
                    "has_relationships": True,
                    "field_count": 8
                },
                "vector_similarity": 0.82
            },
            {
                "content": "数据表: gas_station | 业务用途: 加油站信息管理 | 业务领域: 车辆管理 | 主键: station_id(加油站ID) | 核心字段: station_name(加油站名称), address(地址), oil_types(油品类型) | 关联表: vehicle_refuel | 查询特性: 支持多表关联",
                "metadata": {
                    "datasource_id": "ds_001",
                    "item_type": "table",
                    "table_name": "gas_station", 
                    "business_domain": "车辆管理",
                    "has_relationships": True,
                    "field_count": 6
                },
                "vector_similarity": 0.75
            },
            {
                "content": "数据表: user | 业务用途: 用户基本信息 | 业务领域: 用户管理 | 主键: user_id(用户ID) | 核心字段: username(用户名), email(邮箱), phone(手机号) | 时间字段: created_at(创建时间) | 状态字段: status(用户状态) | 关联表: order, user_profile",
                "metadata": {
                    "datasource_id": "ds_001",
                    "item_type": "table",
                    "table_name": "user",
                    "business_domain": "用户管理", 
                    "has_relationships": True,
                    "field_count": 8
                },
                "vector_similarity": 0.45
            }
        ]
        
        # 模拟表关系图
        self.table_relationships = {
            "vehicle_refuel": {
                "references": ["vehicle", "driver", "gas_station"],
                "referenced_by": [],
                "related_tables": ["vehicle", "driver", "gas_station"]
            },
            "vehicle": {
                "references": [],
                "referenced_by": ["vehicle_refuel"],
                "related_tables": ["vehicle_refuel", "driver"]
            },
            "driver": {
                "references": [],
                "referenced_by": ["vehicle_refuel"], 
                "related_tables": ["vehicle_refuel", "vehicle"]
            },
            "gas_station": {
                "references": [],
                "referenced_by": ["vehicle_refuel"],
                "related_tables": ["vehicle_refuel"]
            }
        }
        
        # 业务实体识别器
        self.domain_keywords = {
            "车辆管理": {
                "keywords": ["车辆", "vehicle", "汽车", "货车", "司机", "driver", "加油", "refuel"],
                "related_concepts": ["维修", "保险", "运输"]
            },
            "用户管理": {
                "keywords": ["用户", "user", "客户", "customer"],
                "related_concepts": ["权限", "角色", "登录"]
            }
        }
    
    def preprocess_query(self, user_input: str) -> str:
        """第1阶段：查询预处理"""
        print(f"🔍 第1阶段：查询预处理")
        print(f"   原始输入: '{user_input}'")
        
        # 标准化处理
        cleaned_query = user_input.strip()
        replacements = {
            "查询": "",
            "获取": "",
            "请": "",
            "帮我": "",
            "和": " "
        }
        
        for old, new in replacements.items():
            cleaned_query = cleaned_query.replace(old, new)
        
        cleaned_query = cleaned_query.strip()
        print(f"   预处理后: '{cleaned_query}'")
        return cleaned_query
    
    def analyze_query_intent(self, query: str) -> Dict[str, Any]:
        """第2阶段：意图分析与实体识别"""
        print(f"\n🧠 第2阶段：意图分析与实体识别")
        
        # 识别业务实体
        entities = []
        for domain, info in self.domain_keywords.items():
            if any(keyword in query for keyword in info["keywords"]):
                entities.append(domain)
        
        # 识别意图类型
        intent_types = []
        if any(word in query for word in ["统计", "分析", "汇总", "报表"]):
            intent_types.append("统计分析")
        if any(word in query for word in ["详细", "明细", "信息", "记录"]):
            intent_types.append("详细查询")
        if any(word in query for word in ["关联", "相关", "和"]):
            intent_types.append("关联查询")
        
        # 判断是否需要关联
        requires_relations = any(word in query for word in ["关联", "相关", "统计", "分析", "和"])
        
        # 判断复杂度
        if len(entities) > 1 or requires_relations:
            complexity_level = "complex"
        elif intent_types:
            complexity_level = "medium"
        else:
            complexity_level = "simple"
        
        intent = {
            "entities": entities,
            "intent_types": intent_types,
            "requires_relations": requires_relations,
            "complexity_level": complexity_level
        }
        
        print(f"   识别实体: {entities}")
        print(f"   意图类型: {intent_types}")
        print(f"   需要关联: {requires_relations}")
        print(f"   复杂度级别: {complexity_level}")
        
        return intent
    
    def basic_vector_search(self, query: str, limit: int = 5) -> List[Dict]:
        """基础向量检索"""
        print(f"\n   📊 基础向量检索 (限制: {limit})")
        
        # 模拟向量相似度计算
        results = []
        query_words = set(query.lower().split())
        
        for item in self.metadata_vectors:
            content_words = set(item["content"].lower().split())
            
            # 计算词汇重叠度
            intersection = len(query_words & content_words)
            union = len(query_words | content_words)
            jaccard_score = intersection / union if union > 0 else 0
            
            # 结合预设的向量相似度
            final_score = item["vector_similarity"] * 0.7 + jaccard_score * 0.3
            
            if jaccard_score > 0:  # 有关键词重叠才考虑
                results.append({
                    **item,
                    "score": final_score
                })
        
        # 按分数排序
        results = sorted(results, key=lambda x: x["score"], reverse=True)[:limit]
        
        for i, result in enumerate(results):
            print(f"     {i+1}. {result['metadata']['table_name']} (分数: {result['score']:.3f})")
        
        return results
    
    def expand_by_relations(self, base_results: List[Dict], intent: Dict) -> List[Dict]:
        """关系感知扩展检索"""
        print(f"\n   🔗 关系感知扩展检索")
        
        if not intent["requires_relations"]:
            print("     跳过关系扩展（不需要关联查询）")
            return []
        
        # 获取种子表
        seed_tables = set()
        for result in base_results:
            table_name = result["metadata"]["table_name"]
            seed_tables.add(table_name)
        
        print(f"     种子表: {list(seed_tables)}")
        
        # 获取关联表
        related_tables = set()
        depth = 2 if intent["complexity_level"] == "complex" else 1
        print(f"     关系深度: {depth}")
        
        for table in seed_tables:
            if table in self.table_relationships:
                related = self.table_relationships[table]["related_tables"]
                related_tables.update(related)
        
        related_tables -= seed_tables  # 移除已有的表
        print(f"     发现关联表: {list(related_tables)}")
        
        # 检索关联表的元数据
        relation_results = []
        for table_name in related_tables:
            for item in self.metadata_vectors:
                if item["metadata"]["table_name"] == table_name:
                    relation_results.append({
                        **item,
                        "score": item["vector_similarity"] * 0.8  # 关联表权重稍低
                    })
                    break
        
        return relation_results
    
    def expand_by_keywords(self, query: str, intent: Dict) -> List[Dict]:
        """关键词扩展检索"""
        print(f"\n   🔤 关键词扩展检索")
        
        expanded_queries = []
        
        # 基于识别的实体生成扩展查询
        for entity in intent["entities"]:
            entity_keywords = self.domain_keywords.get(entity, {})
            for keyword in entity_keywords.get("keywords", [])[:2]:
                if keyword not in query:
                    expanded_query = f"{query} {keyword}"
                    expanded_queries.append(expanded_query)
        
        print(f"     扩展查询: {expanded_queries}")
        
        # 执行扩展检索
        keyword_results = []
        for exp_query in expanded_queries[:2]:  # 限制扩展查询数量
            results = self.basic_vector_search(exp_query, 2)
            keyword_results.extend(results)
        
        return keyword_results
    
    def smart_merge_results(self, base_results: List[Dict], relation_results: List[Dict], 
                          keyword_results: List[Dict], query: str, intent: Dict) -> List[Dict]:
        """智能合并结果"""
        print(f"\n🎯 第4阶段：结果智能合并")
        
        all_results = base_results + relation_results + keyword_results
        
        # 按表名去重
        seen_tables = set()
        merged = []
        
        for result in all_results:
            table_name = result["metadata"]["table_name"]
            if table_name not in seen_tables:
                seen_tables.add(table_name)
                
                # 重新计算综合相关性分数
                final_score = self.calculate_comprehensive_score(result, query, intent)
                result["final_score"] = final_score
                merged.append(result)
        
        # 按综合分数排序
        merged = sorted(merged, key=lambda x: x["final_score"], reverse=True)
        
        print(f"   合并后的结果 ({len(merged)} 个表):")
        for i, result in enumerate(merged):
            table_name = result["metadata"]["table_name"]
            score = result["final_score"]
            domain = result["metadata"]["business_domain"]
            print(f"     {i+1}. {table_name} - {domain} (综合分数: {score:.3f})")
        
        return merged
    
    def calculate_comprehensive_score(self, result: Dict, query: str, intent: Dict) -> float:
        """计算综合相关性分数"""
        base_score = result.get("score", 0.5)
        content = result["content"]
        table_name = result["metadata"]["table_name"]
        
        # 基础分数权重 (40%)
        score = base_score * 0.4
        
        # 表名匹配度 (20%)
        query_words = set(query.lower().split())
        if any(word in table_name.lower() for word in query_words):
            score += 0.2
        
        # 业务实体匹配度 (30%)
        entity_match_count = 0
        for entity in intent["entities"]:
            if entity in content:
                entity_match_count += 1
        
        if intent["entities"]:
            entity_score = entity_match_count / len(intent["entities"])
            score += entity_score * 0.3
        
        # 内容词汇重叠度 (10%)
        content_words = set(content.lower().split())
        intersection = len(query_words & content_words)
        union = len(query_words | content_words)
        if union > 0:
            jaccard_score = intersection / union
            score += jaccard_score * 0.1
        
        return min(score, 1.0)
    
    def format_metadata_output(self, results: List[Dict], query: str) -> Dict[str, Any]:
        """第5阶段：元数据结构化输出"""
        print(f"\n📋 第5阶段：元数据结构化输出")
        
        formatted_results = []
        for result in results:
            formatted_result = {
                "content": result["content"],
                "score": result["final_score"],
                "datasource_id": result["metadata"]["datasource_id"],
                "item_type": result["metadata"]["item_type"],
                "table_name": result["metadata"]["table_name"],
                "business_domain": result["metadata"]["business_domain"],
                "raw_data": {
                    "table_name": result["metadata"]["table_name"],
                    "business_domain": result["metadata"]["business_domain"],
                    "field_count": result["metadata"]["field_count"],
                    "has_relationships": result["metadata"]["has_relationships"]
                }
            }
            formatted_results.append(formatted_result)
        
        output = {
            "success": True,
            "query": query,
            "results": formatted_results,
            "count": len(formatted_results),
            "message": f"找到 {len(formatted_results)} 个相关结果"
        }
        
        print(f"   格式化完成，返回 {len(formatted_results)} 个结果")
        return output
    
    async def retrieve_metadata(self, user_input: str) -> Dict[str, Any]:
        """完整的元数据检索流程"""
        print(f"🚀 开始元数据检索流程")
        print(f"=" * 60)
        
        # 第1阶段：查询预处理
        cleaned_query = self.preprocess_query(user_input)
        
        # 第2阶段：意图分析与实体识别
        intent = self.analyze_query_intent(cleaned_query)
        
        # 第3阶段：多策略向量检索
        print(f"\n🔍 第3阶段：多策略向量检索")
        
        # 3.1 基础向量检索
        base_results = self.basic_vector_search(cleaned_query, 3)
        
        # 3.2 关系感知扩展检索
        relation_results = self.expand_by_relations(base_results, intent)
        
        # 3.3 关键词扩展检索
        keyword_results = self.expand_by_keywords(cleaned_query, intent)
        
        # 第4阶段：结果智能合并
        merged_results = self.smart_merge_results(
            base_results, relation_results, keyword_results, cleaned_query, intent
        )
        
        # 第5阶段：元数据结构化输出
        final_output = self.format_metadata_output(merged_results, user_input)
        
        print(f"\n✅ 检索流程完成！")
        print(f"=" * 60)
        
        return final_output

async def main():
    """演示主函数"""
    demo = MetadataRetrievalDemo()
    
    # 测试用例
    test_queries = [
        "查询车辆的加油记录和司机信息",
        "车辆加油统计", 
        "用户信息",
        "车辆维修记录"
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n{'='*20} 测试用例 {i} {'='*20}")
        print(f"用户输入: '{query}'")
        print()
        
        result = await demo.retrieve_metadata(query)
        
        print(f"\n📊 最终检索结果:")
        print(f"查询: {result['query']}")
        print(f"结果数量: {result['count']}")
        print(f"相关表:")
        for j, res in enumerate(result['results'], 1):
            print(f"  {j}. {res['table_name']} ({res['business_domain']}) - 相关性: {res['score']:.3f}")
        
        print(f"\n" + "="*60)

if __name__ == "__main__":
    asyncio.run(main()) 