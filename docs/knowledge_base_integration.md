# 知识库MySQL集成指南

本文档介绍如何在IASMind系统中集成MySQL数据库来实现知识库管理功能，包括文件上传和文件列表功能。

## 功能特性

- ✅ MySQL数据库集成
- ✅ 知识库管理（创建、查询、更新、删除）
- ✅ 文件上传和管理
- ✅ 文件向量化处理
- ✅ 文件下载功能
- ✅ 统计信息展示
- ✅ 前端界面集成

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端界面      │    │   后端API       │    │   MySQL数据库   │
│                 │    │                 │    │                 │
│ - 文件上传      │◄──►│ - 文件管理API   │◄──►│ - knowledge_bases│
│ - 文件列表      │    │ - 知识库管理API │    │ - file_documents│
│ - 知识库管理    │    │ - 向量化API     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   本地文件存储   │
                       │                 │
                       │ - uploads/      │
                       │ - 文件物理存储   │
                       └─────────────────┘
```

## 数据库设计

### 知识库表 (knowledge_bases)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(36) | 主键，UUID |
| name | VARCHAR(255) | 知识库名称 |
| description | TEXT | 知识库描述 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| file_count | INT | 文件数量 |
| vector_count | INT | 向量数量 |
| status | ENUM | 状态：active/inactive/processing |
| embedding_model | VARCHAR(100) | 嵌入模型 |
| chunk_size | INT | 分块大小 |
| chunk_overlap | INT | 分块重叠 |

### 文件文档表 (file_documents)

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | VARCHAR(36) | 主键，UUID |
| name | VARCHAR(255) | 文件名 |
| type | VARCHAR(100) | 文件类型 |
| size | BIGINT | 文件大小 |
| uploaded_at | TIMESTAMP | 上传时间 |
| status | ENUM | 状态：uploaded/processing/vectorized/failed |
| knowledge_base_id | VARCHAR(36) | 知识库ID（外键） |
| vector_count | INT | 向量数量 |
| last_vectorized_at | TIMESTAMP | 最后向量化时间 |
| error_message | TEXT | 错误信息 |
| file_path | VARCHAR(500) | 文件路径 |
| metadata | JSON | 元数据 |

## 安装和配置

### 1. 环境要求

- Python 3.8+
- MySQL 5.7+ 或 MySQL 8.0+
- Node.js 16+

### 2. 安装依赖

```bash
# 后端依赖
pip install pymysql

# 前端依赖
cd web
pnpm install
```

### 3. 数据库配置

复制环境变量示例文件：

```bash
cp env.example .env
```

编辑 `.env` 文件，配置MySQL连接信息：

```bash
# MySQL数据库配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=iasmind
MYSQL_CHARSET=utf8mb4

# 文件上传配置
UPLOAD_DIR=uploads

# API配置
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. 初始化数据库

运行数据库初始化脚本：

```bash
python scripts/init_database.py
```

这个脚本会：
- 创建MySQL数据库
- 创建必要的表结构
- 插入示例知识库数据

## API接口

### 知识库管理

#### 创建知识库
```http
POST /api/knowledge_base/knowledge_bases
Content-Type: application/json

{
  "name": "产品文档库",
  "description": "包含所有产品相关文档",
  "embedding_model": "text-embedding-3-small",
  "chunk_size": 1000,
  "chunk_overlap": 200
}
```

#### 获取知识库列表
```http
GET /api/knowledge_base/knowledge_bases?page=1&page_size=20&status=active
```

#### 更新知识库
```http
PUT /api/knowledge_base/knowledge_bases/{kb_id}
Content-Type: application/json

{
  "name": "更新后的名称",
  "description": "更新后的描述"
}
```

#### 删除知识库
```http
DELETE /api/knowledge_base/knowledge_bases/{kb_id}
```

### 文件管理

#### 上传文件
```http
POST /api/knowledge_base/upload
Content-Type: multipart/form-data

file: [文件]
knowledge_base_id: "kb-uuid"
description: "文件描述"
```

#### 获取文件列表
```http
GET /api/knowledge_base/files?knowledge_base_id=kb-uuid&status=uploaded&page=1&page_size=20
```

#### 向量化文件
```http
POST /api/knowledge_base/files/{file_id}/vectorize
```

#### 下载文件
```http
GET /api/knowledge_base/files/{file_id}/download
```

#### 删除文件
```http
DELETE /api/knowledge_base/files/{file_id}
```

### 统计信息

#### 获取统计信息
```http
GET /api/knowledge_base/stats
```

## 前端使用

### 1. 导入API客户端

```typescript
import { knowledgeBaseApi } from "~/core/api/knowledge-base";
```

### 2. 创建知识库

```typescript
const createKnowledgeBase = async () => {
  try {
    const response = await knowledgeBaseApi.CreateKnowledgeBase({
      name: "我的知识库",
      description: "这是一个测试知识库",
      embedding_model: "text-embedding-3-small"
    });
    console.log("知识库创建成功:", response.knowledge_base);
  } catch (error) {
    console.error("创建失败:", error);
  }
};
```

### 3. 上传文件

```typescript
const uploadFile = async (file: File, knowledgeBaseId: string) => {
  try {
    const response = await knowledgeBaseApi.UploadFile(file, knowledgeBaseId, "文件描述");
    console.log("文件上传成功:", response.file_id);
  } catch (error) {
    console.error("上传失败:", error);
  }
};
```

### 4. 获取文件列表

```typescript
const getFiles = async () => {
  try {
    const response = await knowledgeBaseApi.GetFiles({
      page: 1,
      page_size: 20,
      status: "uploaded"
    });
    console.log("文件列表:", response.files);
  } catch (error) {
    console.error("获取失败:", error);
  }
};
```

## 文件存储

### 存储结构

```
uploads/
├── 20241220_143022_document1.pdf
├── 20241220_143045_document2.docx
└── 20241220_143112_document3.txt
```

### 文件命名规则

- 格式：`YYYYMMDD_HHMMSS_原文件名`
- 示例：`20241220_143022_产品需求文档.pdf`

### 支持的文件类型

- PDF: `application/pdf`
- Word: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 文本: `text/plain`
- Markdown: `text/markdown`
- JSON: `application/json`
- CSV: `text/csv`

### 文件大小限制

- 最大文件大小：50MB

## 向量化处理

### 处理流程

1. 文件上传后状态为 `uploaded`
2. 调用向量化API，状态变为 `processing`
3. 向量化完成后，状态变为 `vectorized`
4. 如果失败，状态变为 `failed`

### 向量化配置

- 默认嵌入模型：`text-embedding-3-small`
- 默认分块大小：1000字符
- 默认分块重叠：200字符

## 错误处理

### 常见错误

1. **数据库连接失败**
   - 检查MySQL服务是否运行
   - 验证数据库连接配置

2. **文件上传失败**
   - 检查文件类型是否支持
   - 验证文件大小是否超限
   - 确认知识库是否存在

3. **向量化失败**
   - 检查文件格式是否正确
   - 验证嵌入模型配置

### 错误响应格式

```json
{
  "detail": "错误描述信息"
}
```

## 性能优化

### 数据库优化

1. **索引优化**
   - 在 `knowledge_base_id` 字段上建立索引
   - 在 `status` 字段上建立索引
   - 在 `uploaded_at` 字段上建立索引

2. **查询优化**
   - 使用分页查询避免大量数据加载
   - 合理使用WHERE条件过滤

### 文件存储优化

1. **存储路径**
   - 使用时间戳避免文件名冲突
   - 定期清理临时文件

2. **上传优化**
   - 支持大文件分块上传
   - 实现上传进度显示

## 安全考虑

### 文件安全

1. **文件类型验证**
   - 严格限制允许的文件类型
   - 检查文件扩展名和MIME类型

2. **文件大小限制**
   - 设置合理的文件大小上限
   - 防止恶意大文件上传

### 数据库安全

1. **SQL注入防护**
   - 使用参数化查询
   - 避免直接拼接SQL语句

2. **权限控制**
   - 使用最小权限原则
   - 定期更新数据库密码

## 部署指南

### 开发环境

1. 启动MySQL服务
2. 运行数据库初始化脚本
3. 启动后端服务：`python main.py`
4. 启动前端服务：`cd web && pnpm dev`

### 生产环境

1. 配置生产环境变量
2. 使用Docker部署MySQL
3. 配置反向代理（Nginx）
4. 设置SSL证书
5. 配置日志记录

## 故障排除

### 常见问题

1. **数据库连接超时**
   ```bash
   # 检查MySQL服务状态
   sudo systemctl status mysql
   
   # 检查端口是否开放
   netstat -tlnp | grep 3306
   ```

2. **文件上传失败**
   ```bash
   # 检查上传目录权限
   ls -la uploads/
   
   # 检查磁盘空间
   df -h
   ```

3. **前端API调用失败**
   ```bash
   # 检查后端服务状态
   curl http://localhost:8000/health
   
   # 检查CORS配置
   ```

## 更新日志

### v1.0.0 (2024-12-20)
- 初始版本发布
- 支持基本的文件上传和管理功能
- 集成MySQL数据库
- 实现知识库管理功能

## 贡献指南

欢迎提交Issue和Pull Request来改进这个功能。

## 许可证

MIT License 