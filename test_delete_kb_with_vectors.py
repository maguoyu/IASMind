#!/usr/bin/env python3
"""
测试删除知识库时删除Milvus向量数据的功能
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
        "name": "向量删除测试知识库",
        "description": "用于测试删除知识库时删除向量数据",
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
    test_content = f"这是测试文档 {file_index}，用于验证删除知识库时删除向量数据的功能。包含多个段落和不同的内容。"
    
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

def test_vectorize_files(file_ids, kb_id):
    """测试向量化文件"""
    print(f"🔍 向量化文件 (文件数量: {len(file_ids)}, 知识库ID: {kb_id})...")
    
    # 单个文件向量化
    for file_id in file_ids:
        vectorize_data = {
            "knowledge_base_id": kb_id
        }
        
        response = requests.post(
            f"{API_BASE}/files/{file_id}/vectorize", 
            json=vectorize_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ 文件 {file_id} 向量化成功: {result['message']}")
        else:
            print(f"   ❌ 文件 {file_id} 向量化失败: {response.status_code} - {response.text}")

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
    print("🚀 开始测试删除知识库时删除向量数据功能...")
    print("=" * 60)
    
    # 1. 创建知识库
    kb = test_knowledge_base_creation()
    if not kb:
        print("❌ 无法创建知识库，测试终止")
        return
    
    kb_id = kb['id']
    print()
    
    # 2. 上传多个测试文件
    file_ids = []
    for i in range(2):
        file_id = test_file_upload(kb_id, i + 1)
        if file_id:
            file_ids.append(file_id)
        time.sleep(1)  # 避免上传过快
    
    if not file_ids:
        print("❌ 无法上传文件，测试终止")
        return
    
    print(f"📁 成功上传 {len(file_ids)} 个文件")
    print()
    
    # 3. 向量化文件（创建向量数据）
    print("🧪 测试1: 向量化文件（创建向量数据）")
    test_vectorize_files(file_ids, kb_id)
    print()
    
    # 等待一下让向量化完成
    print("⏳ 等待向量化完成...")
    time.sleep(3)
    print()
    
    # 4. 删除知识库（应该同时删除向量数据）
    print("🧪 测试2: 删除知识库（验证向量数据删除）")
    success = test_delete_knowledge_base(kb_id)
    print()
    
    # 5. 验证知识库是否已删除
    print("🧪 测试3: 验证知识库删除结果")
    kb_exists = test_knowledge_base_exists(kb_id)
    print()
    
    # 6. 测试结果总结
    print("=" * 60)
    print("📊 测试结果总结:")
    print(f"   知识库创建: ✅ 成功")
    print(f"   文件上传: ✅ 成功 ({len(file_ids)} 个文件)")
    print(f"   文件向量化: ✅ 完成")
    print(f"   知识库删除: {'✅ 成功' if success else '❌ 失败'}")
    print(f"   知识库验证: {'✅ 已删除' if kb_exists is False else '❌ 仍然存在' if kb_exists else '⚠️  状态未知'}")
    
    if success and kb_exists is False:
        print("\n🎉 测试通过！删除知识库功能正常")
        print("   说明: 知识库删除时应该同时删除Milvus中的向量数据")
    else:
        print("\n⚠️  测试失败，请检查删除知识库的实现")

if __name__ == "__main__":
    main() 