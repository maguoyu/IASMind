# 知识库管理系统使用指南

## 概述

知识库管理系统是一个完整的文档管理和向量化解决方案，支持多种文件格式的上传、存储、向量化和检索。系统采用前后端分离架构，提供直观的Web界面和完整的REST API。

## 功能特性

### 🎯 核心功能
- **知识库管理**: 创建、编辑、删除知识库
- **文件上传**: 支持PDF、Word、Excel、文本等多种格式
- **文件向量化**: 自动将文档转换为向量用于检索
- **文件管理**: 查看、下载、删除文件
- **批量操作**: 批量向量化、批量删除
- **统计信息**: 实时统计知识库和文件状态

### 📊 支持的文件格式
- PDF文档 (.pdf)
- Word文档 (.docx)
- Excel表格 (.xlsx)
- 文本文件 (.txt)
- Markdown文件 (.md)
- JSON文件 (.json)
- CSV文件 (.csv)

### 🔧 技术特性
- MySQL数据库存储
- FastAPI后端API
- React + TypeScript前端
- 文件本地存储
- 向量化处理
- 健康检查
- API调试面板

## 快速开始

### 1. 环境准备

确保您的系统已安装以下软件：
- Python 3.8+
- Node.js 16+
- pnpm
- MySQL 8.0+

### 2. 配置环境

1. 复制环境变量文件：
```bash
cp env.example .env
```

2. 编辑 `.env` 文件，配置MySQL连接：
```env
# MySQL配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=knowledge_base

# 文件上传配置
UPLOAD_DIR=uploads
```

### 3. 安装依赖

```bash
# 安装Python依赖
pip install -r requirements.txt

# 安装前端依赖
cd web
pnpm install
```

### 4. 初始化数据库

```bash
python scripts/init_database.py
```

### 5. 插入测试数据（可选）

```bash
python scripts/insert_test_data.py
```

### 6. 启动服务

#### 方式一：使用快速启动脚本（推荐）
```bash
python scripts/start_services.py
```

#### 方式二：手动启动
```bash
# 启动后端服务
python -m uvicorn src.server.app:app --host 0.0.0.0 --port 8000 --reload

# 启动前端服务（新终端）
cd web
pnpm dev
```

### 7. 访问系统

- **前端界面**: http://localhost:3000
- **后端API**: http://localhost:8000
- **API文档**: http://localhost:8000/docs
- **健康检查**: http://localhost:8000/api/knowledge_base/health

## 使用指南

### 知识库管理

#### 创建知识库
1. 访问前端界面
2. 点击"创建知识库"按钮
3. 填写知识库信息：
   - 名称：知识库名称
   - 描述：知识库描述
   - 嵌入模型：选择向量化模型
   - 分块大小：文本分块大小
   - 分块重叠：分块重叠大小

#### 管理知识库
- 查看知识库列表和统计信息
- 编辑知识库配置
- 删除知识库（会同时删除所有文件）

### 文件管理

#### 上传文件
1. 选择目标知识库
2. 点击"上传文件"按钮
3. 选择要上传的文件
4. 添加文件描述（可选）
5. 确认上传

#### 文件操作
- **查看文件**: 查看文件详情和元数据
- **下载文件**: 下载原始文件
- **向量化**: 将文件转换为向量
- **删除文件**: 删除文件和向量数据

#### 批量操作
- 选择多个文件
- 执行批量向量化
- 批量删除文件

### API调试

系统提供了完整的API调试面板，可以：
- 测试所有API接口
- 查看请求和响应
- 调试接口问题
- 验证系统功能

## API接口

### 健康检查
```http
GET /api/knowledge_base/health
```

### 知识库管理
```http
# 创建知识库
POST /api/knowledge_base/knowledge_bases

# 获取知识库列表
GET /api/knowledge_base/knowledge_bases

# 获取知识库详情
GET /api/knowledge_base/knowledge_bases/{kb_id}

# 更新知识库
PUT /api/knowledge_base/knowledge_bases/{kb_id}

# 删除知识库
DELETE /api/knowledge_base/knowledge_bases/{kb_id}
```

### 文件管理
```http
# 上传文件
POST /api/knowledge_base/upload

# 获取文件列表
GET /api/knowledge_base/files

# 获取文件详情
GET /api/knowledge_base/files/{file_id}

# 向量化文件
POST /api/knowledge_base/files/{file_id}/vectorize

# 批量向量化
POST /api/knowledge_base/files/batch_vectorize

# 下载文件
GET /api/knowledge_base/files/{file_id}/download

# 删除文件
DELETE /api/knowledge_base/files/{file_id}
```

### 统计信息
```http
GET /api/knowledge_base/stats
```

## 测试

### 运行集成测试
```bash
python tests/integration/test_knowledge_base_integration.py
```

### 测试覆盖范围
- 健康检查
- 知识库CRUD操作
- 文件上传和管理
- 文件向量化
- 文件下载
- 统计信息
- 错误处理

## 故障排除

### 常见问题

#### 1. 数据库连接失败
- 检查MySQL服务是否运行
- 验证数据库配置是否正确
- 确认数据库用户权限

#### 2. 文件上传失败
- 检查文件大小是否超限（默认50MB）
- 确认文件格式是否支持
- 验证上传目录权限

#### 3. 向量化失败
- 检查文件内容是否可读
- 确认嵌入模型配置
- 查看错误日志

#### 4. 前端无法访问后端
- 检查后端服务是否启动
- 确认端口配置
- 验证CORS设置

### 日志查看

#### 后端日志
```bash
# 查看后端服务日志
tail -f logs/backend.log
```

#### 前端日志
```bash
# 查看前端构建日志
cd web
pnpm build
```

### 性能优化

#### 数据库优化
- 定期清理临时文件
- 优化数据库索引
- 监控查询性能

#### 文件存储优化
- 定期清理上传目录
- 压缩大文件
- 使用CDN加速

#### 向量化优化
- 调整分块大小
- 选择合适的嵌入模型
- 并行处理大文件

## 开发指南

### 项目结构
```
IASMind/
├── src/
│   ├── database/          # 数据库模型和连接
│   ├── server/           # FastAPI后端服务
│   └── ...
├── web/                  # React前端应用
├── scripts/              # 工具脚本
├── tests/                # 测试文件
└── docs/                 # 文档
```

### 添加新功能

#### 后端开发
1. 在 `src/server/routers/` 中添加新路由
2. 在 `src/database/models.py` 中定义数据模型
3. 更新API文档和测试

#### 前端开发
1. 在 `web/src/app/` 中添加新页面
2. 在 `web/src/core/api/` 中添加API客户端
3. 更新组件和样式

### 部署

#### 生产环境部署
1. 配置生产环境变量
2. 使用生产级数据库
3. 配置反向代理
4. 启用HTTPS
5. 设置监控和日志

#### Docker部署
```bash
# 构建镜像
docker build -t knowledge-base .

# 运行容器
docker run -p 8000:8000 -p 3000:3000 knowledge-base
```

## 更新日志

### v1.0.0 (2025-01-XX)
- 初始版本发布
- 支持知识库管理
- 支持文件上传和向量化
- 提供完整的Web界面
- 集成测试和文档

## 贡献指南

欢迎贡献代码和提出建议！

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 创建Pull Request

## 许可证

MIT License

## 联系方式

如有问题或建议，请通过以下方式联系：
- 提交Issue
- 发送邮件
- 参与讨论

---

感谢使用知识库管理系统！ 