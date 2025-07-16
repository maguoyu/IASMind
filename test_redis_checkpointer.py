#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Redis Checkpointer测试脚本
验证Redis checkpointer功能是否正常工作
"""

import asyncio
import os
import sys
from typing import Dict, Any

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_redis_checkpointer():
    """测试Redis checkpointer功能"""
    print("🧪 开始测试Redis Checkpointer...")
    
    try:
        # 测试导入
        print("📦 测试导入...")
        from langgraph_checkpoint_redis import AsyncRedisSaver
        import redis.asyncio as async_redis
        print("✅ 导入成功")
        
        # 测试Redis连接
        print("🔗 测试Redis连接...")
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        redis_db = int(os.getenv("REDIS_DB", "0"))
        
        redis_client = async_redis.Redis(host=redis_host, port=redis_port, db=redis_db)
        
        # 测试连接
        await redis_client.ping()
        print("✅ Redis连接成功")
        
        # 测试AsyncRedisSaver创建
        print("🔧 测试AsyncRedisSaver创建...")
        memory = AsyncRedisSaver(
            redis_client=redis_client, 
            ttl={"default_ttl": 60*24}
        )
        print("✅ AsyncRedisSaver创建成功")
        
        # 测试状态保存和恢复
        print("💾 测试状态保存和恢复...")
        thread_id = "test_thread_123"
        state = {"messages": [{"role": "user", "content": "Hello"}], "step": 1}
        
        # 保存状态
        await memory.put(thread_id, state)
        print("✅ 状态保存成功")
        
        # 恢复状态
        restored_state = await memory.get(thread_id)
        print("✅ 状态恢复成功")
        print(f"   原始状态: {state}")
        print(f"   恢复状态: {restored_state}")
        
        # 清理测试数据
        await redis_client.delete(f"langgraph:checkpoint:{thread_id}")
        print("🧹 测试数据清理完成")
        
        # 关闭连接
        await redis_client.close()
        print("🔌 Redis连接已关闭")
        
        print("🎉 所有测试通过！Redis Checkpointer工作正常")
        return True
        
    except ImportError as e:
        print(f"❌ 导入失败: {e}")
        print("💡 请安装依赖: pip install redis>=6.2.0 langgraph-checkpoint-redis~=0.0.6")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

async def test_chatbot_builder():
    """测试chatbot builder的Redis checkpointer集成"""
    print("\n🤖 测试Chatbot Builder Redis集成...")
    
    try:
        from src.chatbot.graph.builder import build_graph_with_memory
        
        # 构建带Redis checkpointer的图
        graph = build_graph_with_memory()
        print("✅ Chatbot graph with Redis checkpointer构建成功")
        
        return True
        
    except Exception as e:
        print(f"❌ Chatbot builder测试失败: {e}")
        return False

def main():
    """主函数"""
    print("🚀 Redis Checkpointer测试开始")
    print("=" * 50)
    
    # 运行测试
    async def run_tests():
        test1_result = await test_redis_checkpointer()
        test2_result = await test_chatbot_builder()
        
        print("\n" + "=" * 50)
        print("📊 测试结果汇总:")
        print(f"   Redis Checkpointer: {'✅ 通过' if test1_result else '❌ 失败'}")
        print(f"   Chatbot Builder: {'✅ 通过' if test2_result else '❌ 失败'}")
        
        if test1_result and test2_result:
            print("\n🎉 所有测试通过！Redis Checkpointer已成功集成")
        else:
            print("\n⚠️  部分测试失败，请检查配置和依赖")
    
    # 运行异步测试
    asyncio.run(run_tests())

if __name__ == "__main__":
    main() 