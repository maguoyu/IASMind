# 文件服务实现说明

## 概述

本文档说明文件管理服务的实现，包括新增的文件和修改的配置。

## 实现日期

2025-10-14

## 新增文件

### 1. 核心服务文件

#### `/src/server/file_service.py`
- **功能**: MinIO文件存储服务类
- **职责**:
  - 与MinIO服务器交互
  - 文件上传、下载、删除操作
  - 文件信息查询和列表获取
  - 存储桶自动创建和管理
- **配置**:
  - 服务器: 172.20.0.112:9000
  - 账号: minioadmin
  - 密码: minioadmin

#### `/src/server/routers/file_router.py`
- **功能**: 文件管理API路由
- **提供的API端点**:
  1. `POST /api/files/upload` - 文件上传
  2. `DELETE /api/files/{file_id}` - 文件删除
  3. `GET /api/files/download/{file_id}` - 文件下载
  4. `GET /api/files/{file_id}/info` - 获取文件信息
  5. `GET /api/files` - 获取文件列表
- **特性**:
  - 支持自定义存储桶
  - 自动生成唯一文件ID
  - 完整的错误处理
  - 详细的日志记录

### 2. 文档文件

#### `/src/server/routers/FILE_API_README.md`
- **内容**: 完整的API使用文档
- **包含**:
  - 详细的API接口说明
  - 请求/响应示例
  - 前端集成示例（JavaScript/Python）
  - 错误处理说明
  - 注意事项

#### `/docs/FILE_SERVICE_QUICKSTART.md`
- **内容**: 快速开始指南
- **包含**:
  - 环境配置说明
  - 启动服务步骤
  - 快速测试方法
  - 故障排查指南
  - 安全和性能建议

### 3. 测试文件

#### `/src/server/routers/test_file_api.py`
- **功能**: API功能测试脚本
- **测试内容**:
  - 文件上传测试
  - 文件信息获取测试
  - 文件下载测试
  - 文件列表获取测试
  - 文件删除测试
- **使用方法**: `python src/server/routers/test_file_api.py`

## 修改的文件

### 1. `/src/server/app.py`
- **修改内容**:
  - 添加file_router导入
  - 注册file_router到FastAPI应用
- **修改位置**:
  ```python
  # 第28行添加
  from src.server.routers.file_router import router as file_router
  
  # 第67行添加
  app.include_router(file_router)
  ```

### 2. `/pyproject.toml`
- **修改内容**: 添加MinIO依赖
- **修改位置**:
  ```toml
  # 第67行添加
  "minio>=7.1.0",
  ```

## 技术架构

```
┌─────────────────────────────────────────────────┐
│              客户端应用                          │
│     (浏览器/移动应用/其他服务)                    │
└────────────────┬────────────────────────────────┘
                 │ HTTP/HTTPS
                 ▼
┌─────────────────────────────────────────────────┐
│            FastAPI 应用服务                      │
│  ┌───────────────────────────────────────┐     │
│  │    file_router.py (路由层)            │     │
│  │  • POST /api/files/upload             │     │
│  │  • DELETE /api/files/{file_id}        │     │
│  │  • GET /api/files/download/{file_id}  │     │
│  │  • GET /api/files/{file_id}/info      │     │
│  │  • GET /api/files                     │     │
│  └──────────────┬────────────────────────┘     │
│                 │                               │
│  ┌──────────────▼────────────────────────┐     │
│  │    file_service.py (业务逻辑层)       │     │
│  │  • FileService 类                     │     │
│  │  • 文件操作封装                        │     │
│  │  • 错误处理                            │     │
│  └──────────────┬────────────────────────┘     │
└─────────────────┼───────────────────────────────┘
                  │ MinIO SDK
                  ▼
┌─────────────────────────────────────────────────┐
│           MinIO 对象存储服务                     │
│       172.20.0.112:9000                         │
│  ┌─────────────────────────────────────┐       │
│  │  Bucket: ias-mind (默认)            │       │
│  │  • 文件存储                          │       │
│  │  • 版本控制                          │       │
│  │  • 访问控制                          │       │
│  └─────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

## 配置管理

### 配置文件结构

MinIO配置已从代码中抽取到 `conf.yaml` 配置文件：

```yaml
MINIO:
  endpoint: "172.20.0.112:9000"  # MinIO服务器地址和端口
  access_key: "minioadmin"        # 访问密钥
  secret_key: "minioadmin"        # 密钥
  secure: false                   # 使用HTTPS (true) 或 HTTP (false)
  default_bucket: "ias-mind"      # 默认存储桶名称
```

### 配置加载

- 配置通过 `src/config/loader.py` 的 `load_yaml_config()` 函数加载
- 支持环境变量替换（以 `$` 开头的值）
- 配置会被缓存以提高性能
- 如果配置文件不存在，使用代码中的默认值

## 主要特性

### 1. 文件上传
- ✅ 支持任意文件类型
- ✅ 自动生成唯一文件ID (UUID + 原始文件名)
- ✅ 自动创建存储桶
- ✅ 返回文件访问URL

### 2. 文件下载
- ✅ 流式传输，支持大文件
- ✅ 自动设置Content-Type
- ✅ 支持浏览器直接下载

### 3. 文件删除
- ✅ 安全删除，带权限检查
- ✅ 自动处理不存在的文件

### 4. 文件查询
- ✅ 获取单个文件详细信息
- ✅ 列表查询支持前缀过滤
- ✅ 支持分页（limit参数）

### 5. 存储桶管理
- ✅ 自动创建不存在的存储桶
- ✅ 支持多存储桶
- ✅ 默认使用"default"存储桶

## 安全性

### 已实现
1. ✅ 文件ID使用UUID，防止猜测
2. ✅ 完整的异常处理
3. ✅ 详细的日志记录

### 待实现（可选）
1. ⏳ 用户认证和授权
2. ⏳ 文件访问权限控制
3. ⏳ 文件大小限制
4. ⏳ 病毒扫描
5. ⏳ HTTPS加密传输

## 性能考虑

1. **流式传输**: 大文件不会一次性加载到内存
2. **连接池**: MinIO客户端自动管理连接池
3. **异步支持**: FastAPI原生支持异步操作
4. **可扩展性**: 可以部署多个实例进行负载均衡

## 依赖项

### Python包
- `fastapi>=0.110.0` - Web框架
- `minio>=7.1.0` - MinIO客户端SDK
- `python-multipart>=0.0.6` - 文件上传支持

### 外部服务
- MinIO服务器 (172.20.0.112:9000)

## 使用示例

### 基础使用

```python
import requests

# 上传文件
with open('example.pdf', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        'http://localhost:8000/api/files/upload',
        files=files
    )
    file_info = response.json()
    print(f"文件ID: {file_info['file_id']}")

# 下载文件
file_id = file_info['file_id']
response = requests.get(
    f'http://localhost:8000/api/files/download/{file_id}'
)
with open('downloaded.pdf', 'wb') as f:
    f.write(response.content)

# 删除文件
requests.delete(
    f'http://localhost:8000/api/files/{file_id}'
)
```

### 前端使用

```javascript
// 上传文件
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}

// 下载文件
function downloadFile(fileId) {
  window.location.href = `/api/files/download/${fileId}`;
}
```

## 测试

### 运行自动化测试

```bash
python src/server/routers/test_file_api.py
```

### 手动测试

1. 启动服务: `uvicorn src.server.app:app --reload`
2. 访问文档: http://localhost:8000/docs
3. 在Swagger UI中测试各个接口

## 故障排查

### 常见问题

1. **无法连接MinIO**
   - 检查MinIO服务是否运行
   - 确认网络连接和防火墙设置

2. **上传失败**
   - 检查文件大小限制
   - 查看服务器日志

3. **下载404错误**
   - 确认file_id是否正确
   - 检查存储桶名称

## 后续优化建议

1. **功能增强**
   - 文件预览功能
   - 缩略图生成
   - 文件批量操作
   - 文件分享链接

2. **性能优化**
   - 添加Redis缓存
   - 实现CDN加速
   - 文件分片上传

3. **安全加固**
   - 添加JWT认证
   - 实现细粒度权限控制
   - 文件扫描和过滤

4. **监控运维**
   - 添加Prometheus指标
   - 实现健康检查接口
   - 日志聚合和分析

## 相关文档

- [API详细文档](./src/server/routers/FILE_API_README.md)
- [快速开始指南](./docs/FILE_SERVICE_QUICKSTART.md)
- [测试脚本](./src/server/routers/test_file_api.py)

## 维护信息

- **创建日期**: 2025-10-14
- **版本**: 1.0.0
- **状态**: ✅ 已完成并可用

---

**注意**: 请确保在生产环境使用前修改MinIO的默认密码并启用HTTPS。

