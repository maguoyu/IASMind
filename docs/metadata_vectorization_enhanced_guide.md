# 元数据向量化增强指南

## 概述

本指南介绍了重构后的元数据向量化系统，采用智能表级拆分 + 多表关联检索的综合方案，为text2sql功能提供高质量的元数据检索支撑。

## 核心特性

### 1. 智能表级拆分向量化
- **表级粒度**：以表为单位进行向量化，避免信息碎片化
- **增强描述**：自动生成包含业务领域、字段分类、关系信息的综合表描述
- **关系感知**：构建表关系图，支持多层级关联分析

### 2. 业务实体识别
- **领域分类**：自动识别用户管理、订单系统、车辆管理等业务领域
- **意图分析**：理解查询复杂度和关联需求
- **查询建议**：基于意图提供智能查询扩展

### 3. 智能多表检索
- **基础检索**：支持标准的向量相似度搜索
- **关系扩展**：基于外键关系自动发现相关表
- **关键词扩展**：基于业务实体进行查询扩展
- **智能排序**：综合考虑相似度、表名匹配、业务实体匹配等因素

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                    数据源管理层                              │
├─────────────────────────────────────────────────────────────┤
│  MetadataService          │  DataSource Models             │
│  - 实时元数据获取         │  - MySQL/Oracle 连接           │
│  - 表结构分析             │  - 连接测试                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   向量化处理层                               │
├─────────────────────────────────────────────────────────────┤
│  SmartTableDescriptionGenerator  │  TableRelationshipManager │
│  - 业务领域推断                 │  - 构建关系图              │
│  - 字段智能分类                 │  - 深度关联分析            │
│  - SQL提示生成                  │  - 关系缓存管理            │
├─────────────────────────────────────────────────────────────┤
│  BusinessEntityRecognizer        │  MetadataVectorizeService  │
│  - 实体识别                     │  - 向量化协调              │
│  - 意图分析                     │  - 状态管理                │
│  - 查询扩展                     │  - 文档生成                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   向量存储层                                 │
├─────────────────────────────────────────────────────────────┤
│  MetadataVectorStore             │  Milvus                   │
│  - 智能检索                     │  - 向量存储                │
│  - 多维度过滤                   │  - 混合检索                │
│  - 统计分析                     │  - 高性能查询              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   智能检索层                                 │
├─────────────────────────────────────────────────────────────┤
│  SmartMultiTableRetriever                                   │
│  - 意图感知检索                                             │
│  - 关系扩展                                                 │
│  - 智能排序                                                 │
│  - 结果合并                                                 │
└─────────────────────────────────────────────────────────────┘
```

## API 接口

### 1. 基础向量化 API

#### 启动向量化
```http
POST /api/datasources/{datasource_id}/metadata/vectorize
```

**请求参数**：
```json
{
    "include_tables": true,
    "include_relationships": true,
    "include_indexes": false,
    "include_constraints": false,
    "enhance_descriptions": true
}
```

#### 获取向量化状态
```http
GET /api/datasources/{datasource_id}/metadata/vectorize/status
```

#### 获取统计信息
```http
GET /api/datasources/{datasource_id}/metadata/vectorize/stats
```

### 2. 智能搜索 API

#### 元数据搜索
```http
POST /api/datasources/metadata/search
```

**请求参数**：
```json
{
    "query": "车辆加油记录",
    "datasource_ids": ["ds_001"],
    "limit": 10,
    "use_smart_search": true,
    "filter_business_domain": "车辆管理"
}
```

**响应示例**：
```json
{
    "success": true,
    "query": "车辆加油记录",
    "results": [
        {
            "content": "数据表: vehicle_refuel | 业务用途: 车辆加油记录 | 业务领域: 车辆管理 | 主键: refuel_id | 核心字段: vehicle_id(车辆ID), refuel_volume(加油量), refuel_time(加油时间) | 关联表: vehicle, driver | 查询特性: 支持时间范围查询, 支持多表关联",
            "score": 0.95,
            "datasource_id": "ds_001",
            "item_type": "table",
            "table_name": "vehicle_refuel",
            "business_domain": "车辆管理"
        }
    ],
    "count": 1,
    "message": "找到 1 个相关结果"
}
```

### 3. 业务领域 API

#### 获取业务领域分布
```http
GET /api/datasources/{datasource_id}/metadata/business-domains
```

#### 按业务领域搜索
```http
POST /api/datasources/metadata/search-by-domain
```

### 4. 表关系 API

#### 获取表关联关系
```http
GET /api/datasources/{datasource_id}/metadata/tables/{table_name}/relationships
```

#### 表名搜索
```http
GET /api/datasources/{datasource_id}/metadata/tables/search?table_name=vehicle
```

### 5. 查询建议 API

#### 获取查询建议
```http
POST /api/datasources/metadata/query-suggestions
```

**请求参数**：
```json
{
    "query": "用户订单",
    "datasource_ids": ["ds_001"]
}
```

**响应示例**：
```json
{
    "success": true,
    "query": "用户订单",
    "intent_analysis": {
        "entities": ["用户管理", "订单系统"],
        "intent_types": ["关联查询"],
        "requires_relations": true,
        "complexity_level": "complex"
    },
    "query_suggestions": [
        "用户订单 统计",
        "用户订单 明细",
        "用户订单 分析"
    ],
    "complexity_level": "complex",
    "requires_relations": true,
    "message": "查询意图分析完成"
}
```

## 向量化流程

### 1. 元数据获取
```python
# 实时获取数据库元数据
metadata_result = MetadataService.get_database_metadata(datasource_id, use_cache=False)
```

### 2. 关系图构建
```python
# 构建表关系图
relationship_manager = TableRelationshipManager()
relationships = relationship_manager.build_relationship_graph(datasource_id, tables)
```

### 3. 智能描述生成
```python
# 生成增强的表描述
description = SmartTableDescriptionGenerator.generate_comprehensive_table_description(
    table, table_relationships
)
```

### 4. 向量存储
```python
# 存储到Milvus
vector_store = MetadataVectorStore()
vectors_count = vector_store.add_metadata_vectors(datasource_id, documents)
```

## 表描述增强示例

### 原始表信息
```sql
CREATE TABLE vehicle_refuel (
    refuel_id VARCHAR(50) PRIMARY KEY,
    vehicle_id VARCHAR(50),
    driver_id VARCHAR(50),
    refuel_volume DOUBLE COMMENT '加油量（升）',
    refuel_amount DECIMAL(10,2) COMMENT '加油金额',
    refuel_time DATETIME COMMENT '加油时间',
    station_id VARCHAR(50),
    status INT COMMENT '记录状态',
    created_at DATETIME
);
```

### 增强后的描述
```
数据表: vehicle_refuel | 
业务用途: 车辆加油记录管理 | 
业务领域: 车辆管理 | 
主键: refuel_id(加油记录ID) | 
核心字段: vehicle_id(车辆ID), refuel_volume(加油量（升）), driver_id(司机ID) | 
金额字段: refuel_amount(加油金额) | 
时间字段: refuel_time(加油时间), created_at() | 
状态字段: status(记录状态) | 
关联字段: vehicle_id(), driver_id(), station_id() | 
关联表: vehicle, driver, gas_station | 
查询特性: 支持时间范围查询, 支持金额统计, 支持状态筛选, 支持多表关联, 包含业务属性 | 
SQL提示: 常用字段: refuel_id, vehicle_id, refuel_volume, 状态筛选: WHERE status = ?, 时间筛选: WHERE refuel_time BETWEEN ? AND ?
```

## 智能检索示例

### 查询：车辆柴油加注

#### 1. 意图分析
```json
{
    "entities": ["车辆管理"],
    "intent_types": ["详细查询"],
    "requires_relations": false,
    "complexity_level": "medium"
}
```

#### 2. 基础检索
- 匹配到 `vehicle_refuel` 表
- 相关性分数：0.92

#### 3. 关系扩展（如果需要）
- 发现关联表：`vehicle`, `driver`, `gas_station`
- 补充相关元数据

#### 4. 结果排序
- 综合相似度、表名匹配度、业务实体匹配度
- 最终排序结果

## 性能优化

### 1. 缓存策略
- 表关系图缓存
- 向量化状态缓存
- 检索结果缓存

### 2. 批量处理
- 批量向量化（100个文档/批次）
- 并行处理多个表
- 异步状态更新

### 3. 索引优化
- Milvus 混合索引（稠密+稀疏）
- 元数据字段索引
- 业务领域索引

## 最佳实践

### 1. 向量化配置
```python
# 推荐配置
config = VectorizeConfig(
    include_tables=True,           # 必须包含表信息
    include_relationships=True,    # 包含关系信息提高关联查询质量
    include_indexes=False,         # 索引信息通常不影响业务查询
    include_constraints=False,     # 约束信息可选
    enhance_descriptions=True      # 开启增强描述
)
```

### 2. 搜索策略
```python
# 简单查询：关闭智能搜索
simple_search = {
    "use_smart_search": False,
    "limit": 5
}

# 复杂查询：开启智能搜索
complex_search = {
    "use_smart_search": True,
    "limit": 10,
    "filter_business_domain": "车辆管理"
}
```

### 3. 错误处理
- 向量化失败时的回退策略
- 检索超时处理
- 关系图构建失败处理

## 监控与维护

### 1. 关键指标
- 向量化成功率
- 检索响应时间
- 结果相关性评分
- 多表关联命中率

### 2. 日志监控
```python
# 重要日志记录
logger.info(f"向量化完成，生成 {vectors_count} 个向量，耗时 {processing_time:.2f} 秒")
logger.info(f"查询意图分析: {intent}")
logger.info(f"智能检索返回 {len(results)} 个结果")
```

### 3. 定期维护
- 元数据同步更新
- 向量索引重建
- 关系图刷新
- 性能数据分析

## 故障排除

### 1. 常见问题

#### 向量化失败
- 检查数据源连接
- 验证表结构完整性
- 查看错误日志

#### 检索结果不准确
- 检查业务领域映射
- 调整查询权重
- 验证关系图构建

#### 性能问题
- 检查Milvus连接
- 优化批次大小
- 调整缓存策略

### 2. 调试工具
```python
# 获取详细状态
status = MetadataVectorizeService.get_vectorize_status(datasource_id)

# 检查统计信息
stats = vector_store.get_stats(datasource_id)

# 分析查询意图
intent = recognizer.analyze_query_intent(query)
```

## 总结

重构后的元数据向量化系统通过智能表级拆分、业务实体识别、多表关联检索等技术，显著提升了text2sql场景下的元数据检索质量。系统不仅保持了高检索精度，还具备了上下文完整性和关系理解能力，为复杂的SQL生成提供了强有力的支撑。 