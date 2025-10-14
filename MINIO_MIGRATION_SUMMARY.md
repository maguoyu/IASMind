# MinIO迁移总结

## 迁移日期
2025-10-14

## 迁移概述

已成功将系统中的文件功能从本地存储迁移到MinIO对象存储。所有文件上传、下载、删除操作现在都通过MinIO进行。

## 主要变更

### 1. 知识库文件管理 (`src/server/routers/knowledge_base_router.py`)

#### 变更内容：
- **文件上传**: 使用MinIO存储，bucket名称为 `knowledge-base`
- **文件下载**: 从MinIO下载文件，使用 `StreamingResponse` 返回
- **文件删除**: 从MinIO删除文件
- **健康检查**: 添加MinIO连接状态检查

#### 代码变更：
- 导入 `file_service` 模块
- 移除 `FILE_PATH` 本地路径配置
- 移除 `shutil` 导入
- 将 `FileResponse` 改为 `StreamingResponse`
- 文件路径现在存储的是MinIO的 `file_id`

### 2. 数据探索文件管理 (`src/server/routers/data_exploration_router.py`)

#### 变更内容：
- **文件上传**: 使用MinIO存储，bucket名称为 `data-exploration`
- **文件删除**: 从MinIO删除文件
- **文件分析**: 从MinIO下载到临时文件进行处理，处理完成后删除临时文件

#### 代码变更：
- 导入 `file_service` 模块
- 移除 `DATA_EXPLORATION_DIR` 本地路径配置
- 使用临时文件进行数据处理
- 文件路径现在存储的是MinIO的 `file_id`

### 3. 向量化文档加载 (`src/rag/document_tool.py`)

#### 变更内容：
- **文档加载**: 从MinIO下载文件到临时位置进行处理
- 处理完成后自动清理临时文件

#### 代码变更：
- 导入 `file_service` 和 `tempfile` 模块
- 移除 `DirectoryLoader` 依赖
- 使用单个文件加载器（`TextLoader`, `PyPDFLoader`, `Docx2txtLoader`, `UnstructuredWordDocumentLoader`）
- 移除 `FILE_PATH` 配置
- 添加临时文件清理逻辑

### 4. 配置文件清理

#### `env.example`
- 移除 `FILE_PATH=uploads` 配置
- 移除 `EXPLORATION_FILE_PATH=data_exploration_files` 配置

#### `src/config/configuration.py`
- 移除 `exploration_file_path` 字段

## MinIO存储桶使用

系统现在使用以下MinIO存储桶：

1. **knowledge-base**: 知识库文件存储
2. **data-exploration**: 数据探索文件存储

## 技术细节

### 文件ID格式
MinIO中的文件ID格式：`{uuid}_{原始文件名}`

示例：`a1b2c3d4e5f6g7h8_{example.pdf}`

### 临时文件处理
对于需要本地文件路径的操作（如文档加载、数据分析），系统采用以下流程：

1. 从MinIO下载文件内容
2. 创建临时文件并写入内容
3. 使用临时文件进行处理
4. 处理完成后自动删除临时文件（使用 `finally` 块确保清理）

### 错误处理
- 所有MinIO操作都有完善的错误处理
- 上传失败时会自动清理已上传的文件
- 临时文件在异常情况下也会被清理

## 兼容性说明

### 数据库变更
- 数据库中的 `file_path` 字段现在存储的是MinIO的 `file_id` 而不是本地文件路径
- **重要**: 如果系统中已有使用本地路径的数据，需要进行数据迁移

### API变更
- 所有文件相关的API接口保持不变
- 返回的数据结构保持兼容
- 用户无需修改客户端代码

## 优势

1. **可扩展性**: MinIO支持分布式存储，易于扩展
2. **可靠性**: 对象存储提供更好的数据持久性
3. **性能**: 支持并发访问和CDN加速
4. **管理**: 统一的文件管理界面
5. **安全性**: 支持访问控制和加密
6. **跨平台**: 不依赖本地文件系统

## 后续建议

1. **数据迁移**: 如果有旧数据，需要将本地文件迁移到MinIO
2. **备份策略**: 配置MinIO的备份和版本控制
3. **监控**: 添加MinIO存储空间和性能监控
4. **权限管理**: 根据业务需求配置存储桶的访问权限
5. **清理策略**: 配置文件过期和清理策略

## 测试建议

在生产环境部署前，请测试以下功能：

1. 文件上传（知识库和数据探索）
2. 文件下载
3. 文件删除
4. 文件向量化
5. 数据分析
6. 健康检查接口
7. 错误处理和异常情况

## 配置检查清单

- [ ] 确保 `conf.yaml` 中配置了正确的MinIO连接信息
- [ ] 确保MinIO服务正常运行
- [ ] 确保MinIO的访问密钥正确配置
- [ ] 测试MinIO连接是否正常
- [ ] 备份现有数据（如有）
- [ ] 进行数据迁移（如需要）

## 注意事项

1. **文件路径兼容**: 旧数据库中的 `file_path` 如果是本地路径，需要迁移
2. **临时文件**: 系统会在 `/tmp` 目录创建临时文件，确保有足够的磁盘空间
3. **并发处理**: MinIO支持高并发，但要注意系统资源（临时文件数量等）
4. **网络**: 确保应用服务器与MinIO之间的网络连接稳定

## 回滚计划

如需回滚到本地存储：

1. 恢复 `env.example` 中的 `FILE_PATH` 和 `EXPLORATION_FILE_PATH` 配置
2. 恢复各路由文件中的本地存储代码
3. 恢复 `document_tool.py` 中的 `DirectoryLoader` 使用
4. 从MinIO下载所有文件到本地目录
5. 更新数据库中的 `file_path` 字段

---

**迁移完成时间**: 2025-10-14  
**迁移执行人**: AI Assistant  
**审核状态**: 待审核

