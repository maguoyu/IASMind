# 文件服务快速开始指南

## 简介

本文档介绍如何快速启动和使用文件管理服务。该服务基于MinIO对象存储，提供文件上传、下载、删除和查询功能。

## 前置要求

### 1. MinIO服务器

确保MinIO服务器已经运行：

- **地址**: 172.20.0.112:9000
- **账号**: minioadmin
- **密码**: minioadmin

### 2. Python依赖

安装minio库：

```bash
pip install minio>=7.1.0
```

或者使用项目的依赖管理：

```bash
# 如果使用pip
pip install -e .

# 如果使用poetry
poetry install
```

## 启动服务

### 1. 进入项目目录

```bash
cd /home/magy/IASMind
```

### 2. 启动FastAPI服务器

```bash
# 开发模式（带自动重载）
uvicorn src.server.app:app --reload --host 0.0.0.0 --port 8000

# 生产模式
uvicorn src.server.app:app --host 0.0.0.0 --port 8000 --workers 4
```

### 3. 访问API文档

服务启动后，可以访问以下地址查看API文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 快速测试

### 方法一：使用提供的测试脚本

```bash
python src/server/routers/test_file_api.py
```

### 方法二：使用curl命令

#### 1. 上传文件

```bash
curl -X POST "http://localhost:8000/api/files/upload?bucket=default" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/file.txt"
```

#### 2. 获取文件列表

```bash
curl -X GET "http://localhost:8000/api/files?bucket=default"
```

#### 3. 下载文件

```bash
curl -X GET "http://localhost:8000/api/files/download/{file_id}?bucket=default" \
  -o downloaded_file.txt
```

#### 4. 删除文件

```bash
curl -X DELETE "http://localhost:8000/api/files/{file_id}?bucket=default"
```

### 方法三：使用Python脚本

```python
import requests

# 上传文件
with open('test.txt', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        'http://localhost:8000/api/files/upload?bucket=default',
        files=files
    )
    print(response.json())
```

### 方法四：使用浏览器

1. 访问 http://localhost:8000/docs
2. 找到 `/api/files/upload` 接口
3. 点击 "Try it out"
4. 选择文件并点击 "Execute"

## 配置说明

### MinIO连接配置

MinIO配置已抽取到配置文件中，请按以下步骤配置：

1. **复制配置文件模板**
   ```bash
   cp conf.yaml.example conf.yaml
   ```

2. **编辑配置文件**
   
   打开 `conf.yaml` 文件，找到MINIO配置部分：
   
   ```yaml
   MINIO:
     endpoint: "172.20.0.112:9000"  # MinIO服务器地址和端口
     access_key: "minioadmin"        # 访问密钥
     secret_key: "minioadmin"        # 密钥
     secure: false                   # 使用HTTPS (true) 或 HTTP (false)
     default_bucket: "ias-mind"      # 默认存储桶名称
   ```

3. **根据实际环境修改配置**
   - `endpoint`: 修改为您的MinIO服务器地址
   - `access_key` 和 `secret_key`: 修改为您的MinIO访问凭证
   - `secure`: 如果使用HTTPS，设置为true
   - `default_bucket`: 修改默认存储桶名称

### 存储桶配置

默认使用配置文件中的 `default_bucket`（ias-mind），可以通过API参数指定其他存储桶：

```bash
# 使用默认bucket（ias-mind）
curl -X POST "http://localhost:8000/api/files/upload" \
  -F "file=@test.txt"

# 指定其他bucket
curl -X POST "http://localhost:8000/api/files/upload?bucket=my-bucket" \
  -F "file=@test.txt"
```

## API端点总览

| 方法 | 端点 | 功能 | 说明 |
|------|------|------|------|
| POST | `/api/files/upload` | 上传文件 | 支持multipart/form-data |
| DELETE | `/api/files/{file_id}` | 删除文件 | 根据file_id删除 |
| GET | `/api/files/download/{file_id}` | 下载文件 | 返回文件流 |
| GET | `/api/files/{file_id}/info` | 获取文件信息 | 不下载文件内容 |
| GET | `/api/files` | 获取文件列表 | 支持前缀过滤和分页 |

## 故障排查

### 1. 连接MinIO失败

**症状**: 上传/下载文件时报连接错误

**解决方案**:
- 检查MinIO服务器是否运行：`telnet 172.20.0.112 9000`
- 确认防火墙是否允许访问9000端口
- 检查账号密码是否正确

### 2. 文件上传失败

**症状**: 返回500错误

**解决方案**:
- 检查文件大小是否超过限制
- 查看服务器日志：`tail -f logs/app.log`
- 确认存储桶是否有足够空间

### 3. 找不到文件

**症状**: 下载或删除时返回404

**解决方案**:
- 确认file_id是否正确
- 确认bucket参数是否正确
- 使用列表接口检查文件是否存在

## 安全建议

### 生产环境配置

1. **启用HTTPS**
   ```python
   file_service = FileService(
       endpoint="172.20.0.112:9000",
       access_key="your_access_key",
       secret_key="your_secret_key",
       secure=True  # 启用HTTPS
   )
   ```

2. **修改默认密码**
   - 不要使用 `minioadmin/minioadmin` 作为生产环境密码

3. **添加访问控制**
   - 为不同的存储桶设置访问策略
   - 实现用户认证和授权机制

4. **文件大小限制**
   - 在FastAPI配置中设置最大请求大小
   - 对大文件使用分片上传

## 性能优化

### 1. 并发上传

```python
import asyncio
import aiohttp

async def upload_files(files):
    async with aiohttp.ClientSession() as session:
        tasks = []
        for file_path in files:
            task = upload_single_file(session, file_path)
            tasks.append(task)
        return await asyncio.gather(*tasks)
```

### 2. 使用CDN

对于频繁访问的文件，考虑在MinIO前面添加CDN层。

### 3. 缓存策略

对文件元数据实现缓存，减少对MinIO的查询次数。

## 更多资源

- [完整API文档](./FILE_API_README.md)
- [MinIO官方文档](https://docs.min.io/)
- [FastAPI官方文档](https://fastapi.tiangolo.com/)

## 支持

如有问题，请查看：
1. 服务器日志
2. API文档 (http://localhost:8000/docs)
3. 测试脚本输出

---

更新时间: 2025-10-14

