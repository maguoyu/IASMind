#!/usr/bin/env python3
"""
测试文件ID列表查询功能
"""

import requests
import json

# 配置
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/knowledge_base"

def test_get_files_with_file_ids():
    """测试通过文件ID列表获取文件"""
    print("🧪 测试通过文件ID列表获取文件...")
    
    # 首先获取所有文件，获取一些文件ID
    try:
        response = requests.get(f"{API_BASE}/files", params={"page_size": 5})
        if response.status_code != 200:
            print(f"❌ 获取文件列表失败: {response.status_code}")
            return False
        
        data = response.json()
        files = data.get("files", [])
        
        if len(files) < 2:
            print("⚠️  文件数量不足，无法测试file_ids功能")
            return True
        
        # 获取前两个文件的ID
        file_ids = [files[0]["id"], files[1]["id"]]
        print(f"📋 测试文件ID: {file_ids}")
        
        # 使用file_ids参数查询
        file_ids_str = ",".join(file_ids)
        response = requests.get(f"{API_BASE}/files", params={"file_ids": file_ids_str})
        
        if response.status_code != 200:
            print(f"❌ 通过file_ids查询失败: {response.status_code}")
            return False
        
        data = response.json()
        result_files = data.get("files", [])
        
        print(f"✅ 查询成功，返回 {len(result_files)} 个文件")
        print(f"📊 总数: {data.get('total')}")
        
        # 验证返回的文件ID是否在请求的ID列表中
        returned_ids = [f["id"] for f in result_files]
        for file_id in file_ids:
            if file_id in returned_ids:
                print(f"✅ 文件ID {file_id} 在结果中")
            else:
                print(f"❌ 文件ID {file_id} 不在结果中")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def test_get_files_with_invalid_file_ids():
    """测试无效的文件ID列表"""
    print("\n🧪 测试无效的文件ID列表...")
    
    try:
        # 测试不存在的文件ID
        invalid_ids = ["invalid-id-1", "invalid-id-2"]
        file_ids_str = ",".join(invalid_ids)
        
        response = requests.get(f"{API_BASE}/files", params={"file_ids": file_ids_str})
        
        if response.status_code != 200:
            print(f"❌ 查询失败: {response.status_code}")
            return False
        
        data = response.json()
        result_files = data.get("files", [])
        
        print(f"✅ 查询成功，返回 {len(result_files)} 个文件（应该为0）")
        print(f"📊 总数: {data.get('total')}")
        
        if len(result_files) == 0:
            print("✅ 无效ID返回空结果，符合预期")
        else:
            print("❌ 无效ID返回了结果，不符合预期")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def test_get_files_with_mixed_params():
    """测试file_ids与其他参数组合使用"""
    print("\n🧪 测试file_ids与其他参数组合...")
    
    try:
        # 首先获取一些文件
        response = requests.get(f"{API_BASE}/files", params={"page_size": 3})
        if response.status_code != 200:
            print(f"❌ 获取文件列表失败: {response.status_code}")
            return False
        
        data = response.json()
        files = data.get("files", [])
        
        if len(files) < 2:
            print("⚠️  文件数量不足，无法测试")
            return True
        
        # 获取文件ID
        file_ids = [files[0]["id"], files[1]["id"]]
        file_ids_str = ",".join(file_ids)
        
        # 组合使用file_ids和status参数
        response = requests.get(f"{API_BASE}/files", params={
            "file_ids": file_ids_str,
            "status": "uploaded",
            "page_size": 10
        })
        
        if response.status_code != 200:
            print(f"❌ 组合查询失败: {response.status_code}")
            return False
        
        data = response.json()
        result_files = data.get("files", [])
        
        print(f"✅ 组合查询成功，返回 {len(result_files)} 个文件")
        print(f"📊 总数: {data.get('total')}")
        
        # 验证返回的文件状态
        for file in result_files:
            if file["status"] == "uploaded":
                print(f"✅ 文件 {file['name']} 状态为 uploaded")
            else:
                print(f"⚠️  文件 {file['name']} 状态为 {file['status']}")
        
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试文件ID列表查询功能")
    print("=" * 50)
    
    # 检查服务是否运行
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code != 200:
            print("❌ 服务未运行，请先启动后端服务")
            return
        print("✅ 服务运行正常")
    except Exception as e:
        print(f"❌ 无法连接到服务: {e}")
        return
    
    # 运行测试
    tests = [
        test_get_files_with_file_ids,
        test_get_files_with_invalid_file_ids,
        test_get_files_with_mixed_params
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print("=" * 50)
    print(f"📊 测试结果: {passed}/{total} 通过")
    
    if passed == total:
        print("🎉 所有测试通过！")
    else:
        print("⚠️  部分测试失败")

if __name__ == "__main__":
    main() 