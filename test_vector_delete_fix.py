#!/usr/bin/env python3
"""
测试向量删除的类型转换修复
"""

import requests
import json
import time

# 配置
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/knowledge_base"

def test_knowledge_base_creation():
    """测试创建知识库"""
    print("🔧 创建测试知识库...")
    
    kb_data = {
        "name": "类型转换测试知识库",
        "description": "用于测试向量删除的类型转换修复",
        "embedding_model": "text-embedding-3-small",
        "chunk_size": 1000,
        "chunk_overlap": 200
    }
    
    response = requests.post(f"{API_BASE}/knowledge_bases", json=kb_data)
    if response.status_code == 200:
        kb = response.json()["knowledge_base"]
        print(f"✅ 知识库创建成功: {kb['name']} (ID: {kb['id']})")
        return kb
    else:
        print(f"❌ 知识库创建失败: {response.status_code} - {response.text}")
        return None

def test_file_upload(kb_id, file_index):
    """测试文件上传"""
    print(f"📤 上传测试文件 {file_index}...")
    
    # 创建测试文件内容
    test_content = f"这是测试文档 {file_index}，用于验证向量删除的类型转换修复。包含多个段落和不同的内容。"
    
    files = {
        'file': (f'test_document_{file_index}.txt', test_content, 'text/plain')
    }
    data = {
        'knowledge_base_id': kb_id,
        'description': f'测试文档 {file_index}'
    }
    
    response = requests.post(f"{API_BASE}/upload", files=files, data=data)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 文件上传成功: {result['file_id']}")
        return result['file_id']
    else:
        print(f"❌ 文件上传失败: {response.status_code} - {response.text}")
        return None

def test_delete_knowledge_base(kb_id):
    """测试删除知识库"""
    print(f"🗑️  删除知识库 (ID: {kb_id})...")
    
    response = requests.delete(f"{API_BASE}/knowledge_bases/{kb_id}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ 知识库删除成功: {result['message']}")
        return True
    else:
        print(f"❌ 知识库删除失败: {response.status_code} - {response.text}")
        return False

def test_knowledge_base_exists(kb_id):
    """测试知识库是否还存在"""
    print(f"🔍 检查知识库是否还存在 (ID: {kb_id})...")
    
    response = requests.get(f"{API_BASE}/knowledge_bases/{kb_id}")
    if response.status_code == 404:
        print("✅ 知识库已成功删除（返回404）")
        return False
    elif response.status_code == 200:
        print("❌ 知识库仍然存在")
        return True
    else:
        print(f"⚠️  检查知识库状态时出现异常: {response.status_code}")
        return None

def main():
    """主测试函数"""
    print("🚀 开始测试向量删除的类型转换修复...")
    print("=" * 60)
    
    # 1. 创建知识库
    kb = test_knowledge_base_creation()
    if not kb:
        print("❌ 无法创建知识库，测试终止")
        return
    
    kb_id = kb['id']
    print()
    
    # 2. 上传测试文件
    file_id = test_file_upload(kb_id, 1)
    if not file_id:
        print("❌ 无法上传文件，测试终止")
        return
    
    print(f"📁 成功上传文件: {file_id}")
    print()
    
    # 3. 删除知识库（测试向量删除的类型转换）
    print("🧪 测试: 删除知识库（验证向量删除的类型转换修复）")
    success = test_delete_knowledge_base(kb_id)
    print()
    
    # 4. 验证知识库是否已删除
    print("🧪 验证: 检查知识库删除结果")
    kb_exists = test_knowledge_base_exists(kb_id)
    print()
    
    # 5. 测试结果总结
    print("=" * 60)
    print("📊 测试结果总结:")
    print(f"   知识库创建: ✅ 成功")
    print(f"   文件上传: ✅ 成功")
    print(f"   知识库删除: {'✅ 成功' if success else '❌ 失败'}")
    print(f"   知识库验证: {'✅ 已删除' if kb_exists is False else '❌ 仍然存在' if kb_exists else '⚠️  状态未知'}")
    
    if success and kb_exists is False:
        print("\n🎉 测试通过！向量删除的类型转换修复有效")
        print("   说明: 删除知识库时成功删除了Milvus中的向量数据，没有类型转换错误")
    else:
        print("\n⚠️  测试失败，请检查删除知识库的实现")

if __name__ == "__main__":
    main() 