#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
n8n 集成测试脚本
用于验证 n8n API 集成是否正常工作
"""

import asyncio
import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 加载环境变量
from dotenv import load_dotenv
load_dotenv()

import httpx


async def test_n8n_health():
    """测试 n8n 健康检查"""
    print("🔍 测试 n8n 健康检查...")
    
    api_url = os.getenv("N8N_API_URL", "http://172.20.0.113:15678/api/v1")
    api_key = os.getenv("N8N_API_KEY", "")
    
    if not api_key:
        print("❌ 错误: N8N_API_KEY 未配置")
        return False
    
    print(f"   API URL: {api_url}")
    print(f"   API Key: {'*' * (len(api_key) - 4)}{api_key[-4:] if len(api_key) > 4 else '****'}")
    
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{api_url}/workflows",
                headers=headers,
                params={"limit": 1}
            )
            response.raise_for_status()
            print("✅ n8n API 连接成功")
            return True
    except httpx.HTTPStatusError as e:
        print(f"❌ n8n API 错误: {e.response.status_code}")
        print(f"   响应: {e.response.text}")
        return False
    except Exception as e:
        print(f"❌ 连接失败: {str(e)}")
        return False


async def test_get_workflows():
    """测试获取工作流列表"""
    print("\n🔍 测试获取工作流列表...")
    
    api_url = os.getenv("N8N_API_URL", "http://172.20.0.113:15678/api/v1")
    api_key = os.getenv("N8N_API_KEY", "")
    
    headers = {
        "X-N8N-API-KEY": api_key,
        "Accept": "application/json",
    }
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{api_url}/workflows",
                headers=headers,
                params={"limit": 10}
            )
            response.raise_for_status()
            data = response.json()
            
            workflows = data.get("data", [])
            print(f"✅ 成功获取 {len(workflows)} 个工作流")
            
            for i, workflow in enumerate(workflows[:3], 1):
                print(f"   {i}. {workflow.get('name', '未命名')} (ID: {workflow.get('id', 'N/A')}, 激活: {workflow.get('active', False)})")
            
            if len(workflows) > 3:
                print(f"   ... 还有 {len(workflows) - 3} 个工作流")
            
            return True
    except Exception as e:
        print(f"❌ 获取工作流失败: {str(e)}")
        return False


async def test_backend_api():
    """测试后端代理 API"""
    print("\n🔍 测试后端代理 API...")
    
    backend_url = "http://localhost:8000"
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # 测试健康检查
            response = await client.get(f"{backend_url}/api/n8n/health")
            response.raise_for_status()
            health_data = response.json()
            
            print(f"✅ 后端 API 健康检查成功")
            print(f"   状态: {health_data.get('status', 'unknown')}")
            print(f"   API URL: {health_data.get('api_url', 'N/A')}")
            print(f"   API Key 已配置: {health_data.get('api_key_configured', False)}")
            
            # 测试获取工作流
            response = await client.get(f"{backend_url}/api/n8n/workflows?limit=5")
            response.raise_for_status()
            data = response.json()
            
            workflows = data.get("data", [])
            print(f"✅ 后端 API 成功获取 {len(workflows)} 个工作流")
            
            return True
    except httpx.ConnectError:
        print("❌ 无法连接到后端服务")
        print("   请确保后端服务已启动: python server.py")
        return False
    except Exception as e:
        print(f"❌ 后端 API 测试失败: {str(e)}")
        return False


async def main():
    """主测试函数"""
    print("=" * 60)
    print("n8n 集成测试")
    print("=" * 60)
    
    # 测试配置
    print("\n📋 环境配置:")
    print(f"   N8N_API_URL: {os.getenv('N8N_API_URL', '未配置')}")
    print(f"   N8N_API_KEY: {'已配置' if os.getenv('N8N_API_KEY') else '未配置'}")
    
    results = []
    
    # 测试直接连接 n8n
    results.append(await test_n8n_health())
    results.append(await test_get_workflows())
    
    # 测试后端代理
    results.append(await test_backend_api())
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ 通过: {passed}/{total}")
    print(f"❌ 失败: {total - passed}/{total}")
    
    if all(results):
        print("\n🎉 所有测试通过！n8n 集成工作正常。")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查配置和服务状态。")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

