# 文件ID列表查询API

## 概述

`/api/knowledge_base/files` 接口新增了 `file_ids` 参数，支持通过多个文件ID查询特定的文件列表。

## 参数说明

### file_ids 参数

- **类型**: `string` (可选)
- **格式**: 逗号分隔的文件ID列表
- **示例**: `file-id-1,file-id-2,file-id-3`
- **说明**: 当提供此参数时，API将只返回指定ID的文件

## API 接口

### GET /api/knowledge_base/files

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| knowledge_base_id | string | 否 | 知识库ID |
| status | string | 否 | 文件状态筛选 |
| file_type | string | 否 | 文件类型筛选 |
| search | string | 否 | 搜索关键词 |
| **file_ids** | **string** | **否** | **文件ID列表（逗号分隔）** |
| page | int | 否 | 页码，默认1 |
| page_size | int | 否 | 每页数量，默认20 |
| sort_by | string | 否 | 排序字段，默认uploaded_at |
| sort_order | string | 否 | 排序方向，asc/desc，默认desc |

#### 响应格式

```json
{
  "files": [
    {
      "id": "file-id-1",
      "name": "文档1.pdf",
      "type": "application/pdf",
      "size": 1024000,
      "uploaded_at": "2024-01-01T10:00:00Z",
      "status": "vectorized",
      "knowledge_base_id": "kb-id-1",
      "vector_count": 150,
      "last_vectorized_at": "2024-01-01T10:05:00Z",
      "error_message": null,
      "metadata": {
        "description": "示例文档",
        "original_filename": "文档1.pdf"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 20
}
```

## 使用示例

### 1. 基本用法

```bash
# 查询指定ID的文件
curl "http://localhost:8000/api/knowledge_base/files?file_ids=file-id-1,file-id-2,file-id-3"
```

### 2. 与其他参数组合

```bash
# 查询指定ID且状态为uploaded的文件
curl "http://localhost:8000/api/knowledge_base/files?file_ids=file-id-1,file-id-2&status=uploaded"

# 查询指定ID且属于特定知识库的文件
curl "http://localhost:8000/api/knowledge_base/files?file_ids=file-id-1,file-id-2&knowledge_base_id=kb-id-1"

# 查询指定ID且包含搜索关键词的文件
curl "http://localhost:8000/api/knowledge_base/files?file_ids=file-id-1,file-id-2&search=文档"
```

### 3. JavaScript/TypeScript 使用

```typescript
import { knowledgeBaseApi } from "~/core/api/knowledge-base";

// 查询指定ID的文件
const response = await knowledgeBaseApi.GetFiles({
  file_ids: ["file-id-1", "file-id-2", "file-id-3"]
});

console.log(response.files); // 返回的文件列表
console.log(response.total); // 总数
```

### 4. Python 使用

```python
import requests

# 查询指定ID的文件
file_ids = "file-id-1,file-id-2,file-id-3"
response = requests.get(
    "http://localhost:8000/api/knowledge_base/files",
    params={"file_ids": file_ids}
)

data = response.json()
print(f"找到 {len(data['files'])} 个文件")
```

## 特性说明

### 1. 参数优先级

当同时提供 `file_ids` 和其他筛选参数时：
- `file_ids` 参数具有最高优先级
- 其他筛选参数（如 `status`、`file_type`、`search`）会在 `file_ids` 筛选的基础上进一步过滤

### 2. 无效ID处理

- 如果提供的文件ID不存在，这些ID会被忽略
- 只返回存在的文件ID对应的文件
- 不会因为无效ID而返回错误

### 3. 分页支持

- `file_ids` 参数与分页参数（`page`、`page_size`）完全兼容
- 分页在 `file_ids` 筛选的基础上进行

### 4. 排序支持

- `file_ids` 参数与排序参数（`sort_by`、`sort_order`）完全兼容
- 排序在 `file_ids` 筛选的基础上进行

## 错误处理

### 常见错误

1. **参数格式错误**
   ```json
   {
     "detail": "参数格式错误"
   }
   ```

2. **服务内部错误**
   ```json
   {
     "detail": "获取文件列表失败"
   }
   ```

### 状态码

- `200`: 成功
- `400`: 参数错误
- `500`: 服务器内部错误

## 性能考虑

1. **大量ID**: 当提供大量文件ID时，建议分批查询以避免URL过长
2. **缓存**: 对于频繁查询的ID组合，建议在客户端进行缓存
3. **索引**: 数据库已对 `id` 字段建立索引，查询性能良好

## 最佳实践

1. **ID验证**: 在发送请求前验证文件ID的格式
2. **批量处理**: 对于大量文件，考虑分批查询
3. **错误处理**: 始终处理可能的错误情况
4. **缓存策略**: 对于重复查询，实施适当的缓存策略

## 更新日志

- **v1.0.0**: 新增 `file_ids` 参数支持
- 支持通过逗号分隔的ID列表查询文件
- 与其他筛选参数完全兼容
- 支持分页和排序 