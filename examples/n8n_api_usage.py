#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
n8n API 使用示例
演示如何在 Python 代码中使用 n8n API
"""

import asyncio
import os
from pathlib import Path
import sys

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

import httpx


async def example_get_workflows():
    """示例: 获取所有工作流"""
    print("📋 示例 1: 获取工作流列表\n")
    
    api_url = os.getenv("N8N_API_URL")
    api_key = os.getenv("N8N_API_KEY")
    
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/workflows",
            headers=headers,
            params={"limit": 10}
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"找到 {len(data.get('data', []))} 个工作流:")
        for workflow in data.get('data', []):
            status = "✅ 已激活" if workflow.get('active') else "⚪ 未激活"
            print(f"  - {workflow.get('name')} ({status})")


async def example_execute_workflow(workflow_id: str):
    """示例: 执行工作流"""
    print(f"\n🚀 示例 2: 执行工作流 (ID: {workflow_id})\n")
    
    api_url = os.getenv("N8N_API_URL")
    api_key = os.getenv("N8N_API_KEY")
    
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{api_url}/workflows/{workflow_id}/execute",
            headers=headers,
            json={}  # 可以传入执行参数
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"工作流执行成功!")
        print(f"  执行 ID: {data.get('data', {}).get('executionId')}")
        print(f"  状态: {data.get('data', {}).get('status')}")


async def example_get_executions(workflow_id: str = None):
    """示例: 获取执行记录"""
    print(f"\n📊 示例 3: 获取执行记录\n")
    
    api_url = os.getenv("N8N_API_URL")
    api_key = os.getenv("N8N_API_KEY")
    
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
    }
    
    params = {"limit": 10}
    if workflow_id:
        params["workflowId"] = workflow_id
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{api_url}/executions",
            headers=headers,
            params=params
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"找到 {len(data.get('data', []))} 条执行记录:")
        for execution in data.get('data', []):
            status_icon = {
                'success': '✅',
                'error': '❌',
                'waiting': '⏳',
                'running': '🔄'
            }.get(execution.get('status'), '❓')
            
            workflow_name = execution.get('workflowData', {}).get('name', '未知')
            print(f"  {status_icon} {workflow_name} - {execution.get('startedAt')}")


async def example_activate_workflow(workflow_id: str, active: bool = True):
    """示例: 激活/停用工作流"""
    action = "激活" if active else "停用"
    print(f"\n⚡ 示例 4: {action}工作流 (ID: {workflow_id})\n")
    
    api_url = os.getenv("N8N_API_URL")
    api_key = os.getenv("N8N_API_KEY")
    
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        # 先获取工作流信息
        response = await client.get(
            f"{api_url}/workflows/{workflow_id}",
            headers=headers,
        )
        response.raise_for_status()
        workflow = response.json()
        
        # 更新激活状态
        workflow['data']['active'] = active
        
        response = await client.patch(
            f"{api_url}/workflows/{workflow_id}",
            headers=headers,
            json=workflow['data']
        )
        response.raise_for_status()
        
        print(f"工作流已{action}!")
        print(f"  名称: {workflow.get('data', {}).get('name')}")
        print(f"  状态: {'✅ 已激活' if active else '⚪ 未激活'}")


async def example_backend_api():
    """示例: 通过后端 API 访问"""
    print(f"\n🔌 示例 5: 使用后端代理 API\n")
    
    backend_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # 健康检查
        response = await client.get(f"{backend_url}/api/n8n/health")
        response.raise_for_status()
        health = response.json()
        
        print(f"后端 API 健康状态:")
        print(f"  状态: {health.get('status')}")
        print(f"  API URL: {health.get('api_url')}")
        print(f"  API Key 已配置: {health.get('api_key_configured')}")
        
        # 获取工作流
        response = await client.get(
            f"{backend_url}/api/n8n/workflows",
            params={"limit": 5}
        )
        response.raise_for_status()
        data = response.json()
        
        print(f"\n通过后端获取到 {len(data.get('data', []))} 个工作流")


async def main():
    """主函数"""
    print("=" * 60)
    print("n8n API 使用示例")
    print("=" * 60)
    
    try:
        # 示例 1: 获取工作流列表
        await example_get_workflows()
        
        # 示例 3: 获取执行记录
        await example_get_executions()
        
        # 示例 5: 使用后端 API
        try:
            await example_backend_api()
        except Exception as e:
            print(f"\n⚠️  后端 API 示例跳过（请确保后端服务已启动）: {e}")
        
        # 以下示例需要实际的工作流 ID，注释掉避免错误
        # workflow_id = "your_workflow_id"
        # await example_execute_workflow(workflow_id)
        # await example_activate_workflow(workflow_id, active=True)
        
        print("\n" + "=" * 60)
        print("✅ 示例运行完成!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())

