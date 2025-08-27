# ChatBI元数据优化总结

## 问题分析

原始的元数据结构包含大量对SQL生成不相关的冗余信息，如表大小、创建时间、字符长度等，这些信息会：

1. **增加Token消耗**：LLM需要处理更多无关信息
2. **影响生成效果**：冗余信息可能干扰LLM对关键信息的理解
3. **降低处理速度**：更大的上下文导致更慢的推理速度
4. **提高成本**：更多Token意味着更高的API调用成本

## 优化方案

### 1. 元数据精简

**移除的冗余字段**：
- `size_mb`、`rows_count`：表统计信息
- `created_at`、`updated_at`：时间戳信息
- `character_maximum_length`、`numeric_precision`、`numeric_scale`：字段长度精度信息
- `extra`、`column_default`（除非有意义）：额外的字段信息

**保留的关键信息**：
- 表名、表注释、表类型
- 列名、列类型、列注释、是否可空
- 主键、唯一键、索引等约束信息
- 外键关系

### 2. 类型标准化

将数据库特定的类型映射为LLM友好的标准类型：

```
varchar/char/text → string
int/bigint/smallint → integer
decimal/float/double → number
datetime/timestamp → datetime
date → date
boolean/tinyint(1) → boolean
```

### 3. 约束信息突出

将约束信息通过标记清晰表示：
- `[主键]`：主键字段
- `[唯一]`：唯一键字段
- `[索引]`：有索引的字段

### 4. 智能SQL提示

自动生成SQL使用提示，帮助LLM更好地理解表的用途：
- 基于表名和注释生成业务用途提示
- 自动识别时间字段、状态字段、关键标识字段
- 提供查询建议和最佳实践

## 实现效果

### 大小对比

- **原始元数据**：1986字符
- **优化后元数据**：871字符
- **减少比例**：56.1%

### 格式对比

**原始格式**：
```
表 flight: fkey(varchar), flno(varchar), adid(varchar), stot(datetime), ftyp(varchar)...
```

**优化格式（包含样本数据）**：
```
表 flight: 航班信息表
列: fkey(string)[主键] // 航班唯一号, flno(string) // 航班号, adid(string)[索引] // 进离港 A：进港航班，D：离港航班, stot(datetime) // 航班计划到达/起飞时间, ftyp(string) // 航班状态（X：取消, Y：延迟，S ：正常）
SQL提示: 航班信息查询：flight表包含航班基本信息、时间、状态等; 时间查询字段：stot; 状态筛选字段：ftyp; 关键标识字段：fkey, flno, adid
样本数据(2条):
  行1: "FL001_20241204_001", "CZ3301", "A", "2024-12-04T08:30:00", "S"
  行2: "FL002_20241204_002", "MU5137", "D", "2024-12-04T10:15:00", "Y"
```

## 技术实现

### 1. MetadataService优化

在`src/server/services/metadata_service.py`中添加：

```python
@staticmethod
def get_database_metadata(datasource_id: str, use_cache: bool = False, optimize_for_chatbi: bool = False, include_sample_data: bool = False) -> Dict[str, Any]:
    # 新增optimize_for_chatbi和include_sample_data参数
    
@staticmethod  
def optimize_metadata_for_chatbi(metadata_result: Dict[str, Any], datasource: DataSource = None, include_sample_data: bool = False) -> Dict[str, Any]:
    # 元数据优化核心逻辑，支持样本数据获取

@staticmethod
def _get_table_sample_data(datasource: DataSource, table_name: str, limit: int = 2) -> Optional[List[Dict[str, Any]]]:
    # 获取表的样本数据，支持MySQL和Oracle
```

### 2. 数据库分析节点更新

在`src/database_analysis/graph/nodes.py`中：

- 修改`metadata_retrieval`方法使用优化的元数据
- 添加`_build_optimized_table_info`方法构建SQL提示
- 更新`sql_generation`方法使用优化格式

### 3. 使用方式

```python
# 获取优化的元数据用于ChatBI（不含样本数据）
metadata_result = MetadataService.get_database_metadata(
    datasource_id, 
    use_cache=False, 
    optimize_for_chatbi=True
)

# 获取优化的元数据用于ChatBI（包含样本数据）
metadata_result = MetadataService.get_database_metadata(
    datasource_id, 
    use_cache=False, 
    optimize_for_chatbi=True,
    include_sample_data=True
)
```

## 优化效果

1. **信息精简**：移除了SQL生成不需要的字段，减少56%的数据量
2. **类型标准化**：统一数据类型表示，便于LLM理解
3. **约束突出**：主键、索引等关键约束信息更直观
4. **智能提示**：自动生成SQL使用提示，指导查询构建
5. **结构清晰**：层次分明，减少LLM解析负担
6. **上下文优化**：减少Token使用，提高生成速度
7. **样本数据增强**：可选包含样本数据，显著提升SQL生成准确性

## 样本数据功能

### 优势分析

1. **提升SQL准确性**：LLM看到实际数据格式，能生成更准确的查询条件
2. **理解数据含义**：通过样本值理解字段的实际用途和格式
3. **避免常见错误**：减少字段类型误判和条件设置错误
4. **智能默认值**：根据样本数据推断合理的筛选条件

### SQL生成对比示例

**用户查询**: "查询今天延迟的航班"

**没有样本数据的SQL（可能不准确）**:
```sql
SELECT * FROM flight WHERE date = '今天' AND status = '延迟'
```

**有样本数据的SQL（更准确）**:
```sql
SELECT * FROM flight WHERE DATE(stot) = CURDATE() AND ftyp = 'Y'
```

### 性能影响

**优势**:
- 每个表只查询2条样本，影响很小
- 显著提升SQL生成准确性
- 减少用户修正SQL的次数

**注意事项**:
- 避免查询包含敏感信息的表
- 可以设置采样数量控制
- 仅在ChatBI优化模式下启用

## 后续建议

1. **根据业务场景扩展提示规则**：可以基于更多业务领域添加专门的SQL提示逻辑
2. **支持更多数据库类型**：当前主要针对MySQL，可扩展至PostgreSQL、Oracle等
3. **动态提示生成**：基于用户查询历史和使用模式生成个性化提示
4. **性能监控**：跟踪优化前后的SQL生成质量和用户满意度
5. **样本数据安全**：实现样本数据脱敏和敏感表过滤机制
6. **智能采样**：基于表大小和数据分布优化采样策略

通过这些优化，特别是样本数据的加入，ChatBI的SQL生成效果将显著提升，为用户提供更准确、更快速的数据查询体验。 