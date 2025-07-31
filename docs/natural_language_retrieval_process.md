# 自然语言元数据检索流程详解

## 概述

当用户输入自然语言查询时，系统通过多阶段智能检索流程，从向量化的元数据中提取最相关的表结构信息，为SQL生成提供精准支撑。

## 完整检索流程

```
用户输入: "查询车辆的加油记录和司机信息"
                    ↓
            【1. 查询预处理】
                    ↓
            【2. 意图分析与实体识别】
                    ↓
            【3. 多策略向量检索】
                    ↓
            【4. 结果智能合并】
                    ↓
            【5. 元数据结构化输出】
                    ↓
        返回: 相关表的完整元数据信息
```

## 详细流程分析

### 第1阶段：查询预处理

**目标**：标准化用户输入，提取关键信息

```python
def preprocess_query(user_input: str) -> str:
    """
    查询预处理
    - 去除无关词汇
    - 标准化表达
    - 提取核心查询意图
    """
    # 示例处理
    cleaned_query = user_input.strip()
    
    # 标准化常见表达
    replacements = {
        "查询": "",
        "获取": "", 
        "统计": "统计",
        "分析": "分析"
    }
    
    for old, new in replacements.items():
        cleaned_query = cleaned_query.replace(old, new)
    
    return cleaned_query.strip()
```

### 第2阶段：意图分析与实体识别

**目标**：理解用户真实需求，识别涉及的业务领域

```python
# 实际调用示例
recognizer = BusinessEntityRecognizer()
intent = recognizer.analyze_query_intent("车辆加油记录和司机信息")

# 分析结果
{
    "entities": ["车辆管理"],           # 识别的业务实体
    "intent_types": ["关联查询"],       # 查询意图类型  
    "requires_relations": True,        # 需要关联查询
    "complexity_level": "complex"      # 查询复杂度
}
```

#### 业务实体识别逻辑

```python
def recognize_entities(self, query: str) -> List[str]:
    """
    业务实体识别的核心逻辑
    """
    recognized = []
    
    # 1. 关键词匹配
    for domain, info in self.domain_keywords.items():
        if any(keyword in query for keyword in info["keywords"]):
            recognized.append(domain)
    
    # 2. 语义概念匹配  
    for domain, info in self.domain_keywords.items():
        if any(concept in query for concept in info["related_concepts"]):
            recognized.append(domain)
    
    return list(set(recognized))  # 去重
```

#### 查询复杂度判断

```python
def analyze_complexity(self, intent: Dict) -> str:
    """
    基于多个维度判断查询复杂度
    """
    if len(intent["entities"]) > 1:
        return "complex"  # 涉及多个业务领域
    
    if intent["requires_relations"]:
        return "complex"  # 需要表关联
    
    if intent["intent_types"]:
        return "medium"   # 有特定意图类型
    
    return "simple"       # 简单查询
```

### 第3阶段：多策略向量检索

**目标**：通过多种检索策略确保相关元数据不遗漏

#### 3.1 基础向量检索

```python
async def _basic_search(self, query: str, datasource_id: str, limit: int):
    """
    基础语义向量检索
    使用Milvus的混合检索（稠密向量 + 稀疏向量）
    """
    return self.vector_store.search_metadata(
        query=query,
        datasource_ids=[datasource_id], 
        limit=limit
    )

# 检索示例
base_results = await basic_search("车辆加油记录", "ds_001", 5)
# 返回: [vehicle_refuel表信息]
```

#### 3.2 关系感知扩展检索

```python
async def _expand_by_relations(self, base_results: List[Dict], 
                             datasource_id: str, intent: Dict):
    """
    基于表关系扩展检索
    自动发现相关联的表
    """
    # 获取种子表
    seed_tables = {"vehicle_refuel"}
    
    # 根据复杂度决定关系深度
    depth = 2 if intent["complexity_level"] == "complex" else 1
    
    # 获取关联表
    related_tables = set()
    for table in seed_tables:
        related = self.relationship_manager.get_related_tables(
            datasource_id, table, depth
        )
        related_tables.update(related)
    
    # related_tables = {"vehicle", "driver", "gas_station"}
    
    # 检索关联表的元数据
    relation_results = []
    for table_name in related_tables:
        table_results = await self._search_by_table_name(table_name, datasource_id)
        relation_results.extend(table_results)
    
    return relation_results
```

#### 3.3 关键词扩展检索

```python
async def _expand_by_keywords(self, query: str, datasource_id: str, intent: Dict):
    """
    基于业务实体关键词扩展检索
    """
    expanded_queries = []
    
    # 基于识别的实体生成扩展查询
    for entity in intent["entities"]:  # ["车辆管理"]
        entity_keywords = self.entity_recognizer.domain_keywords.get(entity, {})
        for keyword in entity_keywords.get("keywords", [])[:3]:
            if keyword not in query:
                expanded_query = f"{query} {keyword}"
                expanded_queries.append(expanded_query)
    
    # expanded_queries = ["车辆加油记录 vehicle", "车辆加油记录 driver"]
    
    # 执行扩展检索
    keyword_results = []
    for exp_query in expanded_queries[:3]:
        results = await self._basic_search(exp_query, datasource_id, 3)
        keyword_results.extend(results)
    
    return keyword_results
```

### 第4阶段：结果智能合并

**目标**：避免重复，智能排序，提供最相关的结果

```python
def _smart_merge(self, all_results: List[Dict], query: str, intent: Dict):
    """
    智能合并多个检索结果
    """
    # 1. 按表名去重
    seen_tables = set()
    merged = []
    
    for result in all_results:
        table_name = result.get('metadata', {}).get('table_name')
        if table_name and table_name not in seen_tables:
            seen_tables.add(table_name)
            
            # 2. 重新计算综合相关性分数
            result['final_score'] = self._calculate_comprehensive_score(
                result, query, intent
            )
            merged.append(result)
    
    # 3. 按综合分数排序
    return sorted(merged, key=lambda x: x.get('final_score', 0), reverse=True)
```

#### 综合相关性分数计算

```python
def _calculate_comprehensive_score(self, result: Dict, query: str, intent: Dict) -> float:
    """
    多维度相关性分数计算
    """
    base_score = result.get('score', 0.5)  # 基础向量相似度
    content = result.get('content', '')
    table_name = result.get('metadata', {}).get('table_name', '')
    
    # 加权计算最终分数
    score = base_score * 0.4  # 40%权重给向量相似度
    
    # 表名匹配度 (20%权重)
    query_words = set(query.lower().split())
    if any(word in table_name.lower() for word in query_words):
        score += 0.2
    
    # 业务实体匹配度 (30%权重)
    entity_match_count = 0
    for entity in intent["entities"]:
        if entity in content:
            entity_match_count += 1
    
    if intent["entities"]:
        entity_score = entity_match_count / len(intent["entities"])
        score += entity_score * 0.3
    
    # 内容词汇重叠度 (10%权重)
    content_words = set(content.lower().split())
    intersection = len(query_words & content_words)
    union = len(query_words | content_words)
    if union > 0:
        jaccard_score = intersection / union
        score += jaccard_score * 0.1
    
    return min(score, 1.0)
```

### 第5阶段：元数据结构化输出

**目标**：返回结构化的、可直接用于SQL生成的元数据

```python
# 最终返回的元数据格式
{
    "success": true,
    "query": "车辆加油记录和司机信息",
    "results": [
        {
            "content": "数据表: vehicle_refuel | 业务用途: 车辆加油记录 | 业务领域: 车辆管理 | 主键: refuel_id | 核心字段: vehicle_id(车辆ID), refuel_volume(加油量), refuel_time(加油时间) | 关联表: vehicle, driver | 查询特性: 支持时间范围查询, 支持多表关联 | SQL提示: 常用字段: refuel_id, vehicle_id, refuel_volume",
            "score": 0.95,
            "datasource_id": "ds_001",
            "item_type": "table",
            "table_name": "vehicle_refuel", 
            "business_domain": "车辆管理",
            "raw_data": {
                "table_name": "vehicle_refuel",
                "columns": [
                    {
                        "column_name": "refuel_id",
                        "data_type": "varchar",
                        "column_key": "PRI",
                        "column_comment": "加油记录ID"
                    },
                    {
                        "column_name": "vehicle_id", 
                        "data_type": "varchar",
                        "column_key": "MUL",
                        "column_comment": "车辆ID"
                    }
                    // ... 更多列信息
                ],
                "constraints": [
                    // 外键约束信息
                ]
            }
        },
        {
            "content": "数据表: vehicle | 业务用途: 车辆基本信息 | 业务领域: 车辆管理 | 主键: vehicle_id | 核心字段: vehicle_number(车牌号), vehicle_type(车辆类型) | 关联表: vehicle_refuel, driver | 查询特性: 支持多表关联",
            "score": 0.88,
            "table_name": "vehicle",
            // ... 详细的vehicle表信息
        },
        {
            "content": "数据表: driver | 业务用途: 司机信息管理 | 业务领域: 车辆管理 | 主键: driver_id | 核心字段: driver_name(司机姓名), phone(联系电话) | 关联表: vehicle, vehicle_refuel",
            "score": 0.85,
            "table_name": "driver",
            // ... 详细的driver表信息  
        }
    ],
    "count": 3,
    "message": "找到 3 个相关结果"
}
```

## 实际检索示例

### 示例1：简单查询

**输入**：`"用户信息"`

**处理流程**：
```python
# 1. 意图分析
intent = {
    "entities": ["用户管理"],
    "intent_types": ["详细查询"], 
    "requires_relations": False,
    "complexity_level": "simple"
}

# 2. 基础检索（不扩展）
results = basic_search("用户信息", datasource_id, 5)

# 3. 返回结果
# [user表, user_profile表, user_account表]
```

### 示例2：复杂关联查询

**输入**：`"统计每个用户的订单金额"`

**处理流程**：
```python
# 1. 意图分析
intent = {
    "entities": ["用户管理", "订单系统"],
    "intent_types": ["统计分析", "关联查询"],
    "requires_relations": True, 
    "complexity_level": "complex"
}

# 2. 多策略检索
base_results = basic_search("用户订单金额", datasource_id, 3)
relation_results = expand_by_relations(base_results, datasource_id, intent)
keyword_results = expand_by_keywords("用户订单金额", datasource_id, intent)

# 3. 智能合并
final_results = smart_merge([base_results, relation_results, keyword_results])

# 4. 返回结果
# [user表, order表, order_item表, payment表] - 按相关性排序
```

### 示例3：业务领域特定查询

**输入**：`"车辆维修费用统计"`

**处理流程**：
```python
# 1. 意图分析
intent = {
    "entities": ["车辆管理"],
    "intent_types": ["统计分析"],
    "requires_relations": False,
    "complexity_level": "medium"
}

# 2. 带业务领域过滤的检索
results = search_metadata(
    query="车辆维修费用",
    filter_business_domain="车辆管理",
    limit=10
)

# 3. 返回结果
# [vehicle_maintenance表, vehicle表, maintenance_cost表]
```

## 检索优化策略

### 1. 缓存机制

```python
# 查询结果缓存
cache_key = f"search:{hash(query)}:{datasource_id}"
if cache_key in redis_cache:
    return redis_cache.get(cache_key)

# 关系图缓存
relationship_cache = {}  # 避免重复构建表关系图
```

### 2. 批量检索

```python
# 并行检索多个扩展查询
async def parallel_search(expanded_queries):
    tasks = [basic_search(query, datasource_id, 3) for query in expanded_queries]
    results = await asyncio.gather(*tasks)
    return [item for sublist in results for item in sublist]
```

### 3. 自适应阈值

```python
# 根据查询复杂度调整检索参数
if intent["complexity_level"] == "complex":
    limit = 15  # 复杂查询需要更多候选结果
    depth = 2   # 更深的关系扩展
else:
    limit = 5
    depth = 1
```

## 检索质量评估

### 1. 相关性指标

- **精确率**：返回结果中相关表的比例
- **召回率**：相关表被检索到的比例  
- **F1分数**：精确率和召回率的调和平均

### 2. 用户反馈循环

```python
# 收集用户反馈优化检索
def collect_feedback(query: str, results: List[Dict], user_selection: List[str]):
    """
    基于用户实际选择的表，调整检索权重
    """
    for result in results:
        table_name = result['table_name']
        if table_name in user_selection:
            # 提高该表的检索权重
            adjust_table_weight(table_name, +0.1)
        else:
            # 略微降低未选择表的权重
            adjust_table_weight(table_name, -0.05)
```

## 总结

通过**意图分析** → **多策略检索** → **智能合并**的三阶段流程，系统能够：

1. **准确理解**用户的自然语言查询意图
2. **全面检索**相关的表结构信息，避免遗漏
3. **智能排序**，将最相关的元数据优先返回
4. **结构化输出**，便于后续的SQL生成使用

这种方法特别适合处理复杂的多表关联查询，能够显著提升text2sql的准确性和完整性。 