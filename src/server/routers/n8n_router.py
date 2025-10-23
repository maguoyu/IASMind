# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
n8n API 代理路由
提供对 n8n 工作流的完整管理功能
"""

import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/n8n", tags=["n8n"])

# 从环境变量获取 n8n 配置
N8N_API_URL = os.getenv("N8N_API_URL", "http://172.20.0.113:15678/api/v1")
N8N_API_KEY = os.getenv("N8N-API-KEY", "")
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "http://172.20.0.113:15678")

# 确保 API URL 末尾没有斜杠
N8N_API_URL = N8N_API_URL.rstrip("/")
N8N_WEBHOOK_URL = N8N_WEBHOOK_URL.rstrip("/")


class WorkflowActivateRequest(BaseModel):
    """工作流激活/停用请求"""
    active: bool


class WorkflowExecuteRequest(BaseModel):
    """工作流执行请求"""
    workflow_data: Optional[Dict[str, Any]] = None
    webhook_path: Optional[str] = None  # webhook 路径，例如 "/webhook-test/joke-webhook-sse"


def get_n8n_headers() -> Dict[str, str]:
    """获取 n8n API 请求头"""
    return {
        "X-N8N-API-KEY": N8N_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def extract_webhook_path(workflow: Dict[str, Any]) -> Optional[str]:
    """
    从工作流的 nodes 中提取 webhook 路径
    
    Args:
        workflow: 工作流数据
        
    Returns:
        webhook 路径，如果没有找到则返回 None
    """
    nodes = workflow.get("nodes", [])
    for node in nodes:
        # 查找 Webhook 类型的节点
        if node.get("type") == "n8n-nodes-base.webhook":
            parameters = node.get("parameters", {})
            path = parameters.get("path")
            if path:
                # 确保路径以 / 开头
                return path if path.startswith("/") else f"/{path}"
    return None


def enrich_workflow_with_webhook(workflow: Dict[str, Any]) -> Dict[str, Any]:
    """
    为工作流数据添加 webhookPath 字段
    
    Args:
        workflow: 工作流数据
        
    Returns:
        enriched 工作流数据
    """
    webhook_path = extract_webhook_path(workflow)
    if webhook_path:
        workflow["webhookPath"] = webhook_path
    return workflow


async def make_n8n_request(
    method: str,
    endpoint: str,
    json_data: Optional[Dict[str, Any]] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    发送请求到 n8n API
    
    Args:
        method: HTTP 方法
        endpoint: API 端点
        json_data: JSON 数据
        params: 查询参数
        
    Returns:
        API 响应数据
    """
    url = f"{N8N_API_URL}{endpoint}"
    headers = get_n8n_headers()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=json_data,
                params=params,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        logger.error(f"n8n API 错误: {e.response.status_code} - {e.response.text}")
        raise HTTPException(
            status_code=e.response.status_code,
            detail=f"n8n API 错误: {e.response.text}",
        )
    except httpx.RequestError as e:
        logger.error(f"n8n API 请求失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"n8n API 请求失败: {str(e)}",
        )
    except Exception as e:
        logger.error(f"n8n API 未知错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"n8n API 未知错误: {str(e)}",
        )


@router.get("/workflows")
async def get_workflows(
    limit: int = Query(default=100, ge=1, le=250),
    cursor: Optional[str] = Query(default=None),
    active: Optional[bool] = Query(default=None),
):
    """
    获取工作流列表
    
    Args:
        limit: 返回数量限制
        cursor: 分页游标
        active: 过滤激活状态
        
    Returns:
        工作流列表（包含 webhookPath 字段）
    """
    params = {"limit": limit}
    if cursor:
        params["cursor"] = cursor
    if active is not None:
        params["active"] = str(active).lower()
    
    result = await make_n8n_request("GET", "/workflows", params=params)
    
    # 为每个工作流添加 webhookPath 字段
    if "data" in result and isinstance(result["data"], list):
        result["data"] = [enrich_workflow_with_webhook(workflow) for workflow in result["data"]]
    
    return result


@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    """
    获取单个工作流详情
    
    Args:
        workflow_id: 工作流 ID
        
    Returns:
        工作流详情（包含 webhookPath 字段）
    """
    workflow = await make_n8n_request("GET", f"/workflows/{workflow_id}")
    return enrich_workflow_with_webhook(workflow)


@router.patch("/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, workflow_data: Dict[str, Any]):
    """
    更新工作流
    
    Args:
        workflow_id: 工作流 ID
        workflow_data: 工作流数据
        
    Returns:
        更新后的工作流
    """
    return await make_n8n_request("PATCH", f"/workflows/{workflow_id}", json_data=workflow_data)


@router.post("/workflows/{workflow_id}/activate")
async def activate_workflow(workflow_id: str, request: WorkflowActivateRequest):
    """
    激活或停用工作流
    
    Args:
        workflow_id: 工作流 ID
        request: 激活请求
        
    Returns:
        更新后的工作流
    """
    return await make_n8n_request(
        "PATCH",
        f"/workflows/{workflow_id}",
        json_data={"active": request.active}
    )


@router.delete("/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    """
    删除工作流
    
    Args:
        workflow_id: 工作流 ID
        
    Returns:
        删除结果
    """
    return await make_n8n_request("DELETE", f"/workflows/{workflow_id}")


@router.get("/executions")
async def get_executions(
    limit: int = Query(default=100, ge=1, le=250),
    cursor: Optional[str] = Query(default=None),
    workflow_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
):
    """
    获取执行记录列表
    
    Args:
        limit: 返回数量限制
        cursor: 分页游标
        workflow_id: 工作流 ID 过滤
        status: 状态过滤 (success, error, waiting)
        
    Returns:
        执行记录列表
    """
    params = {"limit": limit}
    if cursor:
        params["cursor"] = cursor
    if workflow_id:
        params["workflowId"] = workflow_id
    if status:
        params["status"] = status
    
    return await make_n8n_request("GET", "/executions", params=params)


@router.get("/executions/{execution_id}")
async def get_execution(execution_id: str):
    """
    获取单个执行记录详情
    
    Args:
        execution_id: 执行 ID
        
    Returns:
        执行记录详情
    """
    return await make_n8n_request("GET", f"/executions/{execution_id}")


@router.delete("/executions/{execution_id}")
async def delete_execution(execution_id: str):
    """
    删除执行记录
    
    Args:
        execution_id: 执行 ID
        
    Returns:
        删除结果
    """
    return await make_n8n_request("DELETE", f"/executions/{execution_id}")


@router.post("/workflows/{workflow_id}/execute")
async def execute_workflow(workflow_id: str, request: WorkflowExecuteRequest):
    """
    手动执行工作流
    支持两种方式：
    1. 使用 webhook 路径（推荐）：通过 webhook_path 参数指定 webhook 路径
    2. 使用 API 执行：直接调用 n8n API 执行
    
    Args:
        workflow_id: 工作流 ID（使用 webhook 时可以传任意值，仅用于日志）
        request: 执行请求
            - workflow_data: 执行数据
            - webhook_path: webhook 路径（可选），例如 "/webhook-test/joke-webhook-sse"
        
    Returns:
        执行结果
    """
    # 如果提供了 webhook 路径，使用 webhook 方式执行
    if request.webhook_path:
        webhook_url = f"{N8N_WEBHOOK_URL}/webhook{request.webhook_path}"
        logger.info(f"使用 webhook 执行工作流: {webhook_url}")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    webhook_url,
                    json=request.workflow_data if request.workflow_data else {},
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                
                # 尝试解析 JSON 响应
                try:
                    result = response.json()
                except Exception:
                    # 如果不是 JSON，返回文本
                    result = {"response": response.text}
                
                return {
                    "success": True,
                    "webhook_url": webhook_url,
                    "data": result,
                }
        except httpx.HTTPStatusError as e:
            logger.error(f"Webhook 执行错误: {e.response.status_code} - {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Webhook 执行错误: {e.response.text}",
            )
        except httpx.RequestError as e:
            logger.error(f"Webhook 请求失败: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Webhook 请求失败: {str(e)}",
            )
        except Exception as e:
            logger.error(f"Webhook 执行未知错误: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Webhook 执行未知错误: {str(e)}",
            )
    
    # 否则使用 API 方式执行
    json_data = request.workflow_data if request.workflow_data else {}
    return await make_n8n_request("POST", f"/workflows/{workflow_id}/execute", json_data=json_data)


@router.get("/credentials")
async def get_credentials(
    limit: int = Query(default=100, ge=1, le=250),
    cursor: Optional[str] = Query(default=None),
):
    """
    获取凭证列表
    
    Args:
        limit: 返回数量限制
        cursor: 分页游标
        
    Returns:
        凭证列表
    """
    params = {"limit": limit}
    if cursor:
        params["cursor"] = cursor
    
    return await make_n8n_request("GET", "/credentials", params=params)


@router.get("/health")
async def check_health():
    """
    检查 n8n 服务健康状态
    
    Returns:
        健康状态
    """
    try:
        # n8n 没有专门的 health 端点，我们通过获取工作流列表来检查
        await make_n8n_request("GET", "/workflows", params={"limit": 1})
        return {
            "status": "healthy",
            "api_url": N8N_API_URL,
            "api_key_configured": bool(N8N_API_KEY),
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "api_url": N8N_API_URL,
            "api_key_configured": bool(N8N_API_KEY),
            "error": str(e),
        }
