# 文件管理API使用说明

## 概述

文件管理API提供了基于MinIO对象存储的文件上传、下载、删除和列表查询功能。

## MinIO配置

- **服务器地址**: 172.20.0.112:9000
- **访问密钥**: minioadmin
- **密钥**: minioadmin
- **协议**: HTTP (非加密)

## API接口

### 1. 上传文件

**接口**: `POST /api/files/upload`

**请求参数**:
- `file` (必填): 要上传的文件，使用multipart/form-data格式
- `bucket` (可选): 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）

**请求示例**:
```bash
curl -X POST "http://localhost:8000/api/files/upload?bucket=default" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/your/file.pdf"
```

**响应示例**:
```json
{
  "file_id": "a1b2c3d4e5f6_example.pdf",
  "filename": "example.pdf",
  "content_type": "application/pdf",
  "size": 102400,
  "bucket": "default",
  "upload_time": "2025-10-14T10:30:00",
  "url": "http://172.20.0.112:9000/default/a1b2c3d4e5f6_example.pdf"
}
```

### 2. 删除文件

**接口**: `DELETE /api/files/{file_id}`

**路径参数**:
- `file_id` (必填): 文件唯一标识

**查询参数**:
- `bucket` (可选): 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）

**请求示例**:
```bash
curl -X DELETE "http://localhost:8000/api/files/a1b2c3d4e5f6_example.pdf?bucket=default"
```

**响应示例**:
```json
{
  "message": "文件删除成功",
  "file_id": "a1b2c3d4e5f6_example.pdf"
}
```

### 3. 下载文件

**接口**: `GET /api/files/download/{file_id}`

**路径参数**:
- `file_id` (必填): 文件唯一标识

**查询参数**:
- `bucket` (可选): 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/files/download/a1b2c3d4e5f6_example.pdf?bucket=default" \
  -o downloaded_file.pdf
```

**响应**: 返回文件流，浏览器会自动下载文件

### 4. 获取文件信息

**接口**: `GET /api/files/{file_id}/info`

**路径参数**:
- `file_id` (必填): 文件唯一标识

**查询参数**:
- `bucket` (可选): 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/files/a1b2c3d4e5f6_example.pdf/info?bucket=default"
```

**响应示例**:
```json
{
  "file_id": "a1b2c3d4e5f6_example.pdf",
  "filename": "example.pdf",
  "content_type": "application/pdf",
  "size": 102400,
  "bucket": "default",
  "upload_time": "2025-10-14T10:30:00",
  "url": "http://172.20.0.112:9000/default/a1b2c3d4e5f6_example.pdf"
}
```

### 5. 获取文件列表

**接口**: `GET /api/files`

**查询参数**:
- `bucket` (可选): 存储桶名称，默认使用配置文件中的default_bucket（ias-mind）
- `prefix` (可选): 文件名前缀过滤，默认为空
- `limit` (可选): 返回的最大文件数，默认为100，范围1-1000

**请求示例**:
```bash
curl -X GET "http://localhost:8000/api/files?bucket=default&prefix=&limit=100"
```

**响应示例**:
```json
{
  "total": 2,
  "files": [
    {
      "file_id": "a1b2c3d4e5f6_example.pdf",
      "filename": "example.pdf",
      "content_type": "application/pdf",
      "size": 102400,
      "bucket": "default",
      "upload_time": "2025-10-14T10:30:00",
      "url": "http://172.20.0.112:9000/default/a1b2c3d4e5f6_example.pdf"
    },
    {
      "file_id": "b2c3d4e5f6a1_document.docx",
      "filename": "document.docx",
      "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "size": 51200,
      "bucket": "default",
      "upload_time": "2025-10-14T11:00:00",
      "url": "http://172.20.0.112:9000/default/b2c3d4e5f6a1_document.docx"
    }
  ]
}
```

## 错误处理

所有API接口在发生错误时会返回标准的HTTP错误状态码和错误信息：

- **400**: 请求参数错误
- **404**: 文件不存在
- **500**: 服务器内部错误

**错误响应示例**:
```json
{
  "detail": "文件不存在: a1b2c3d4e5f6_example.pdf"
}
```

## 前端集成示例

### JavaScript/TypeScript

```javascript
// 上传文件
async function uploadFile(file, bucket = 'default') {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`/api/files/upload?bucket=${bucket}`, {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
}

// 删除文件
async function deleteFile(fileId, bucket = 'default') {
  const response = await fetch(`/api/files/${fileId}?bucket=${bucket}`, {
    method: 'DELETE'
  });
  
  return await response.json();
}

// 下载文件
function downloadFile(fileId, bucket = 'default') {
  window.location.href = `/api/files/download/${fileId}?bucket=${bucket}`;
}

// 获取文件列表
async function listFiles(bucket = 'default', prefix = '', limit = 100) {
  const response = await fetch(
    `/api/files?bucket=${bucket}&prefix=${prefix}&limit=${limit}`
  );
  
  return await response.json();
}
```

### Python

```python
import requests

# 上传文件
def upload_file(file_path, bucket='default'):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            f'http://localhost:8000/api/files/upload?bucket={bucket}',
            files=files
        )
    return response.json()

# 删除文件
def delete_file(file_id, bucket='default'):
    response = requests.delete(
        f'http://localhost:8000/api/files/{file_id}?bucket={bucket}'
    )
    return response.json()

# 下载文件
def download_file(file_id, save_path, bucket='default'):
    response = requests.get(
        f'http://localhost:8000/api/files/download/{file_id}?bucket={bucket}'
    )
    with open(save_path, 'wb') as f:
        f.write(response.content)

# 获取文件列表
def list_files(bucket='default', prefix='', limit=100):
    response = requests.get(
        f'http://localhost:8000/api/files',
        params={'bucket': bucket, 'prefix': prefix, 'limit': limit}
    )
    return response.json()
```

## 注意事项

1. **文件ID格式**: 上传文件后会生成一个唯一的文件ID，格式为`{uuid}_{原始文件名}`
2. **存储桶**: 如果指定的存储桶不存在，系统会自动创建
3. **文件大小**: 建议单个文件不超过100MB，大文件上传可能需要额外配置
4. **并发限制**: 建议同时上传的文件数不超过10个
5. **安全性**: 当前配置使用HTTP协议，生产环境建议启用HTTPS

## 依赖包

确保在 `requirements.txt` 中添加以下依赖：

```
minio>=7.1.0
```

安装依赖：

```bash
pip install minio
```

