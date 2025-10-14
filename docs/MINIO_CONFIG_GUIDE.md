# MinIO配置指南

本文档说明如何配置IASMind项目的MinIO对象存储服务。

## 配置文件位置

MinIO配置位于项目根目录的 `conf.yaml` 文件中。

## 配置步骤

### 1. 创建配置文件

如果还没有 `conf.yaml` 文件，请从模板创建：

```bash
cp conf.yaml.example conf.yaml
```

### 2. 配置MinIO参数

在 `conf.yaml` 文件中找到或添加 `MINIO` 配置节：

```yaml
MINIO:
  endpoint: "172.20.0.112:9000"  # MinIO服务器地址和端口
  access_key: "minioadmin"        # 访问密钥
  secret_key: "minioadmin"        # 密钥
  secure: false                   # 使用HTTPS (true) 或 HTTP (false)
  default_bucket: "ias-mind"      # 默认存储桶名称
```

### 3. 配置参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `endpoint` | string | 是 | "172.20.0.112:9000" | MinIO服务器地址和端口 |
| `access_key` | string | 是 | "minioadmin" | MinIO访问密钥（Access Key） |
| `secret_key` | string | 是 | "minioadmin" | MinIO密钥（Secret Key） |
| `secure` | boolean | 否 | false | 是否使用HTTPS连接 |
| `default_bucket` | string | 否 | "ias-mind" | 默认存储桶名称 |

## 环境变量支持

配置文件支持环境变量替换。以 `$` 开头的值会被解析为环境变量：

```yaml
MINIO:
  endpoint: "$MINIO_ENDPOINT"
  access_key: "$MINIO_ACCESS_KEY"
  secret_key: "$MINIO_SECRET_KEY"
  secure: false
  default_bucket: "ias-mind"
```

然后在环境中设置：

```bash
export MINIO_ENDPOINT="172.20.0.112:9000"
export MINIO_ACCESS_KEY="your_access_key"
export MINIO_SECRET_KEY="your_secret_key"
```

## 不同环境的配置示例

### 开发环境

```yaml
MINIO:
  endpoint: "localhost:9000"
  access_key: "minioadmin"
  secret_key: "minioadmin"
  secure: false
  default_bucket: "ias-mind-dev"
```

### 测试环境

```yaml
MINIO:
  endpoint: "test-minio.example.com:9000"
  access_key: "test_user"
  secret_key: "test_password"
  secure: true
  default_bucket: "ias-mind-test"
```

### 生产环境

```yaml
MINIO:
  endpoint: "minio.example.com:443"
  access_key: "$MINIO_ACCESS_KEY"  # 从环境变量读取
  secret_key: "$MINIO_SECRET_KEY"  # 从环境变量读取
  secure: true
  default_bucket: "ias-mind-prod"
```

## 存储桶说明

### 默认存储桶

- 配置文件中的 `default_bucket` 参数指定了默认使用的存储桶
- 如果API调用时不指定bucket参数，将自动使用默认存储桶
- 默认值为 `ias-mind`

### 自定义存储桶

在API调用时可以通过 `bucket` 参数指定其他存储桶：

```bash
# 使用默认bucket（ias-mind）
curl -X POST "http://localhost:8000/api/files/upload" \
  -F "file=@test.txt"

# 使用自定义bucket
curl -X POST "http://localhost:8000/api/files/upload?bucket=my-custom-bucket" \
  -F "file=@test.txt"
```

### 自动创建存储桶

文件服务会自动创建不存在的存储桶，无需手动创建。

## 安全建议

### 1. 生产环境配置

- ✅ **必须**修改默认的 `minioadmin/minioadmin` 凭证
- ✅ **必须**启用HTTPS（`secure: true`）
- ✅ **建议**使用环境变量存储敏感信息
- ✅ **建议**定期轮换访问密钥

### 2. 访问控制

在MinIO服务器端配置适当的访问策略：

```bash
# 为特定bucket设置只读策略
mc policy set download myminio/ias-mind

# 为特定bucket设置读写策略
mc policy set public myminio/ias-mind
```

### 3. 网络安全

- 使用防火墙限制MinIO服务器的访问
- 在生产环境使用VPN或内网访问
- 启用MinIO的TLS加密

## 验证配置

### 1. 检查配置加载

启动应用时查看日志：

```
INFO:src.server.file_service:MinIO客户端初始化成功: 172.20.0.112:9000, 默认bucket: ias-mind
```

### 2. 测试连接

使用测试脚本验证配置：

```bash
python src/server/routers/test_file_api.py
```

### 3. 手动测试

使用API文档界面测试：

1. 启动服务：`uvicorn src.server.app:app --reload`
2. 访问：http://localhost:8000/docs
3. 测试上传接口

## 故障排查

### 问题1：无法连接MinIO

**症状**：
```
ERROR:src.server.file_service:MinIO客户端初始化失败: ...
```

**解决方案**：
1. 检查MinIO服务是否运行：`telnet 172.20.0.112 9000`
2. 确认endpoint配置是否正确
3. 检查网络连接和防火墙设置

### 问题2：认证失败

**症状**：
```
HTTPException: 文件上传到MinIO失败: Access Denied
```

**解决方案**：
1. 确认access_key和secret_key是否正确
2. 检查MinIO用户权限
3. 验证存储桶访问策略

### 问题3：SSL证书错误

**症状**：
```
SSL: CERTIFICATE_VERIFY_FAILED
```

**解决方案**：
1. 如果使用自签名证书，可以临时设置 `secure: false`
2. 或者在MinIO客户端配置中添加证书验证选项
3. 生产环境建议使用有效的SSL证书

## 配置更新

### 重新加载配置

修改 `conf.yaml` 后需要重启应用：

```bash
# 如果使用uvicorn --reload，会自动重启
# 否则需要手动重启

# 停止服务
Ctrl+C

# 重新启动
uvicorn src.server.app:app --reload
```

### 配置缓存

配置文件会被缓存以提高性能。如果需要强制重新加载：

1. 重启应用
2. 或修改 `src/config/loader.py` 中的缓存逻辑

## 相关文档

- [文件服务快速开始指南](./FILE_SERVICE_QUICKSTART.md)
- [文件API文档](../src/server/routers/FILE_API_README.md)
- [MinIO官方文档](https://docs.min.io/)

## 技术支持

如有配置问题，请：
1. 查看应用日志
2. 检查MinIO服务器日志
3. 参考本文档的故障排查部分

---

更新时间: 2025-10-14
版本: 1.0.0

