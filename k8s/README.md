# IASMind - Kubernetes 部署说明

本目录包含用于在 Kubernetes 中部署 IASMind 前后端的清单文件。镜像仓库为 `172.20.0.113`，需要先创建镜像拉取密钥。

## 目录结构
- `namespace.yaml`：命名空间 `iasmind`
- `secret.yaml`：Harbor 镜像仓库认证 Secret
- `configmap.yaml`：配置 ConfigMap（包含 `conf.yaml` 和 `.env`）
- `backend-deployment.yaml`：后端 Deployment + Service（端口 8000）
- `frontend-deployment.yaml`：前端 Deployment + Service（端口 3000）
- `ingress.yaml`：Ingress 配置（用于外部访问）

## 前置要求
- 已可访问 `172.20.0.113` 私有镜像仓库
- 镜像：
  - `172.20.0.113/ias/iasmind-backend:latest`
  - `172.20.0.113/ias/iasmind-frontend:latest`
- 镜像仓库账号：
  - 用户名：`admin`
  - 密码：`Harbor12345`

## 一键部署步骤

```bash
# 1) 创建命名空间
kubectl apply -f k8s/namespace.yaml

# 2) 创建镜像拉取密钥（名称：harbor-registry）
kubectl apply -f k8s/secret.yaml

# 3) 部署 ConfigMap（包含 conf.yaml 和 .env）
kubectl apply -f k8s/configmap.yaml

# 4) 部署后端与前端
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# 5) 部署 Ingress（可选，用于外部访问）
kubectl apply -f k8s/ingress.yaml

# 6) 查看服务
kubectl get all -n iasmind
kubectl get ingress -n iasmind
```

## 访问方式

### 1. 集群内部访问（ClusterIP）
- 后端服务：`iasmind-backend.iasmind.svc.cluster.local:8000`
- 前端服务：`iasmind-frontend.iasmind.svc.cluster.local:3000`

### 2. 通过 Ingress 外部访问（推荐）

部署 Ingress 后，可以通过 Ingress Controller 提供的地址访问服务：

```bash
# 查看 Ingress 地址
kubectl get ingress -n iasmind

# 查看 Ingress Controller 的 Service（通常是 LoadBalancer 或 NodePort）
kubectl get svc -n ingress-nginx  # 假设使用 nginx-ingress
```

**访问路径：**
- 前端：`http://<ingress-ip或域名>/`
- 后端 API：`http://<ingress-ip或域名>/api`

**配置说明：**
- 默认使用域名 `iasmind.local`，需要修改 `/etc/hosts` 或使用实际域名
- 如果使用 IP 访问，需要修改 `ingress.yaml`，注释掉 `host` 字段，启用无域名的规则
- 根据实际使用的 Ingress Controller 调整 `ingressClassName`（nginx, traefik, istio 等）

**修改域名或使用 IP 访问：**
```bash
# 编辑 ingress.yaml，修改 host 字段或启用无域名规则
vim k8s/ingress.yaml

# 重新应用
kubectl apply -f k8s/ingress.yaml
```

### 3. 使用 NodePort 或 LoadBalancer（备选）

如需直接暴露服务，可以修改 Service 类型：
```bash
# 修改 Service 类型为 NodePort
kubectl patch svc iasmind-frontend -n iasmind -p '{"spec":{"type":"NodePort"}}'
kubectl patch svc iasmind-backend -n iasmind -p '{"spec":{"type":"NodePort"}}'
```

## 配置管理

### ConfigMap
- `configmap.yaml` 包含所有配置项，以环境变量的形式提供
- 后端 Deployment 使用 `envFrom` 从 ConfigMap 读取所有环境变量
- LLM 配置使用双下划线格式：`{TYPE}_MODEL__{KEY}`（如 `BASIC_MODEL__api_key`）
- MinIO 配置使用格式：`MINIO__{KEY}`（如 `MINIO__endpoint`）
- 修改配置后，更新 ConfigMap 并重启 Pod：
  ```bash
  # 更新 ConfigMap
  kubectl apply -f k8s/configmap.yaml
  
  # 重启后端 Pod 使配置生效
  kubectl rollout restart deployment/iasmind-backend -n iasmind
  ```
  
### 环境变量格式说明
- **LLM 配置**：使用 `{TYPE}_MODEL__{KEY}` 格式（双下划线）
  - 例如：`BASIC_MODEL__base_url`, `BASIC_MODEL__model`, `BASIC_MODEL__api_key`
  - 支持的类型：`BASIC_MODEL`, `REASONING_MODEL`, `VISION_MODEL`
- **MinIO 配置**：使用 `MINIO__{KEY}` 格式
  - 例如：`MINIO__endpoint`, `MINIO__access_key`, `MINIO__secret_key`
- **其他配置**：直接使用环境变量名
  - 例如：`MYSQL_HOST`, `REDIS_HOST`, `N8N_API_URL` 等

### 敏感信息
- 当前 ConfigMap 中包含 API keys 等敏感信息
- 生产环境建议将敏感信息（如密码、API keys）迁移到 `Secret`：
  ```bash
  kubectl create secret generic iasmind-secrets \
    --from-literal=mysql-password='your_password' \
    --from-literal=api-key='your_api_key' \
    -n iasmind
  ```

## 备注
- ConfigMap 中的配置值需要根据实际环境修改（如数据库地址、API keys 等）
- 修改 ConfigMap 后需要重启 Pod 才能生效


