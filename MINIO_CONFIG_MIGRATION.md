# MinIO配置迁移说明

## 更新日期
2025-10-14

## 更新概述

将MinIO的硬编码配置迁移到配置文件 `conf.yaml` 中，并将默认bucket从 `default` 改为 `ias-mind`。

## 主要变更

### 1. 配置文件更新

#### 文件：`conf.yaml.example`

**新增配置节**：
```yaml
# MinIO object storage configuration
# Used for file upload, download, and management
MINIO:
  endpoint: "172.20.0.112:9000"  # MinIO server address and port
  access_key: "minioadmin"        # Access key
  secret_key: "minioadmin"        # Secret key
  secure: false                   # Use HTTPS (true) or HTTP (false)
  default_bucket: "ias-mind"      # Default bucket name
```

### 2. 核心代码更新

#### 文件：`src/server/file_service.py`

**主要变更**：

1. **导入配置加载器**：
```python
from src.config.loader import load_yaml_config

# 加载配置
_config = load_yaml_config("conf.yaml")
_minio_config = _config.get("MINIO", {})
```

2. **更新FileService初始化**：
```python
def __init__(
    self,
    endpoint: Optional[str] = None,
    access_key: Optional[str] = None,
    secret_key: Optional[str] = None,
    secure: Optional[bool] = None,
    default_bucket: Optional[str] = None
):
    # 从配置文件或参数获取配置
    self.endpoint = endpoint or _minio_config.get("endpoint", "172.20.0.112:9000")
    self.access_key = access_key or _minio_config.get("access_key", "minioadmin")
    self.secret_key = secret_key or _minio_config.get("secret_key", "minioadmin")
    self.secure = secure if secure is not None else _minio_config.get("secure", False)
    self.default_bucket = default_bucket or _minio_config.get("default_bucket", "ias-mind")
```

3. **更新所有方法的默认bucket参数**：
- `upload_file(bucket_name: Optional[str] = None)`
- `delete_file(bucket_name: Optional[str] = None)`
- `download_file(bucket_name: Optional[str] = None)`
- `get_file_info(bucket_name: Optional[str] = None)`
- `list_files(bucket_name: Optional[str] = None)`

4. **方法内部使用默认bucket**：
```python
bucket = bucket_name or self.default_bucket
```

5. **更新全局实例创建**：
```python
# 创建全局文件服务实例（使用配置文件中的配置）
file_service = FileService()
```

#### 文件：`src/server/routers/file_router.py`

**主要变更**：

更新所有API端点的bucket参数默认值从 `"default"` 改为 `None`：

```python
# 之前
bucket: Optional[str] = Query(default="default", description="存储桶名称")

# 之后
bucket: Optional[str] = Query(default=None, description="存储桶名称（默认使用配置文件中的default_bucket）")
```

### 3. 文档更新

#### 新增文档

1. **`docs/MINIO_CONFIG_GUIDE.md`**
   - 完整的MinIO配置指南
   - 包含配置说明、环境变量支持、安全建议等

#### 更新文档

1. **`FILE_SERVICE_IMPLEMENTATION.md`**
   - 添加配置管理章节
   - 更新技术架构图中的默认bucket名称

2. **`docs/FILE_SERVICE_QUICKSTART.md`**
   - 更新配置说明部分
   - 添加配置文件创建步骤

3. **`src/server/routers/FILE_API_README.md`**
   - 更新所有API接口的bucket参数说明
   - 从"默认为default"改为"默认使用配置文件中的default_bucket（ias-mind）"

## 迁移指南

### 对于新部署

1. **复制配置文件**：
```bash
cp conf.yaml.example conf.yaml
```

2. **根据需要修改配置**：
```yaml
MINIO:
  endpoint: "your-minio-server:9000"
  access_key: "your-access-key"
  secret_key: "your-secret-key"
  secure: false
  default_bucket: "ias-mind"
```

3. **启动服务**：
```bash
uvicorn src.server.app:app --reload
```

### 对于现有部署

1. **备份现有配置**（如果有）：
```bash
cp conf.yaml conf.yaml.backup
```

2. **添加MinIO配置到conf.yaml**：
```yaml
MINIO:
  endpoint: "172.20.0.112:9000"  # 使用您现有的MinIO地址
  access_key: "minioadmin"        # 使用您现有的凭证
  secret_key: "minioadmin"        # 使用您现有的凭证
  secure: false
  default_bucket: "ias-mind"      # 新的默认bucket
```

3. **数据迁移（可选）**：

如果您之前使用的是 `default` bucket，可以选择：

**选项A：继续使用default bucket**
```yaml
MINIO:
  # ... 其他配置 ...
  default_bucket: "default"  # 保持使用default
```

**选项B：迁移数据到ias-mind bucket**
```bash
# 使用MinIO客户端工具
mc cp --recursive myminio/default/ myminio/ias-mind/
```

4. **重启服务**：
```bash
# 停止现有服务
Ctrl+C

# 重新启动
uvicorn src.server.app:app --reload
```

## 兼容性说明

### 向后兼容

✅ **完全兼容**：
- 如果 `conf.yaml` 中没有MINIO配置，将使用代码中的默认值
- API接口仍然支持通过 `bucket` 参数指定存储桶
- 现有的API调用代码无需修改

### API行为变更

⚠️ **轻微变更**：
- 如果API调用时不指定 `bucket` 参数：
  - **之前**：使用 `default` bucket
  - **之后**：使用配置文件中的 `default_bucket`（默认为 `ias-mind`）

**影响**：
- 如果您的配置文件设置 `default_bucket: "default"`，行为不变
- 如果使用新的默认值 `ias-mind`，新上传的文件会存储到 `ias-mind` bucket

## 测试验证

### 1. 配置加载测试

启动应用后查看日志：
```
INFO:src.server.file_service:MinIO客户端初始化成功: 172.20.0.112:9000, 默认bucket: ias-mind
```

### 2. 功能测试

运行测试脚本：
```bash
python src/server/routers/test_file_api.py
```

### 3. API测试

访问 http://localhost:8000/docs 测试各个接口

## 优势

### 1. 配置集中管理
- 所有配置统一在 `conf.yaml` 中
- 便于不同环境的配置管理
- 支持环境变量

### 2. 更好的安全性
- 敏感信息可以通过环境变量注入
- 配置文件可以排除在版本控制之外

### 3. 更灵活
- 无需修改代码即可更改配置
- 支持多环境部署
- 便于Docker/K8s等容器化部署

### 4. 更规范
- 默认bucket名称更有意义（ias-mind）
- 遵循项目命名规范

## 相关文件清单

### 修改的文件
- `conf.yaml.example`
- `src/server/file_service.py`
- `src/server/routers/file_router.py`
- `FILE_SERVICE_IMPLEMENTATION.md`
- `docs/FILE_SERVICE_QUICKSTART.md`
- `src/server/routers/FILE_API_README.md`

### 新增的文件
- `docs/MINIO_CONFIG_GUIDE.md`
- `MINIO_CONFIG_MIGRATION.md`（本文档）

## 回滚方案

如果需要回滚到之前的硬编码配置：

1. 恢复 `src/server/file_service.py` 中的硬编码初始化：
```python
file_service = FileService(
    endpoint="172.20.0.112:9000",
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)
```

2. 恢复 `src/server/routers/file_router.py` 中的默认bucket：
```python
bucket: Optional[str] = Query(default="default", ...)
```

## 技术支持

如有问题，请参考：
1. [MinIO配置指南](./docs/MINIO_CONFIG_GUIDE.md)
2. [文件服务快速开始](./docs/FILE_SERVICE_QUICKSTART.md)
3. 查看应用日志
4. 检查MinIO服务器状态

---

**变更作者**: AI Assistant  
**审核状态**: 待审核  
**版本**: 1.0.0

