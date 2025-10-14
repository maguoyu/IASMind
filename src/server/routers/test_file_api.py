# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
文件API测试脚本
用于测试文件上传、下载、删除等功能
"""

import requests
import io

# 配置
BASE_URL = "http://localhost:8000"
BUCKET = "default"


def test_upload_file():
    """测试文件上传"""
    print("=" * 50)
    print("测试文件上传")
    print("=" * 50)
    
    # 创建一个测试文件
    test_content = b"Hello, this is a test file content!"
    test_file = io.BytesIO(test_content)
    
    # 准备文件数据
    files = {
        'file': ('test_document.txt', test_file, 'text/plain')
    }
    
    # 发送上传请求
    response = requests.post(
        f"{BASE_URL}/api/files/upload?bucket={BUCKET}",
        files=files
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 上传成功!")
        print(f"   文件ID: {data['file_id']}")
        print(f"   文件名: {data['filename']}")
        print(f"   大小: {data['size']} bytes")
        print(f"   URL: {data['url']}")
        return data['file_id']
    else:
        print(f"❌ 上传失败: {response.status_code}")
        print(f"   错误信息: {response.text}")
        return None


def test_get_file_info(file_id):
    """测试获取文件信息"""
    print("\n" + "=" * 50)
    print("测试获取文件信息")
    print("=" * 50)
    
    response = requests.get(
        f"{BASE_URL}/api/files/{file_id}/info?bucket={BUCKET}"
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 获取文件信息成功!")
        print(f"   文件ID: {data['file_id']}")
        print(f"   文件名: {data['filename']}")
        print(f"   类型: {data['content_type']}")
        print(f"   大小: {data['size']} bytes")
    else:
        print(f"❌ 获取文件信息失败: {response.status_code}")
        print(f"   错误信息: {response.text}")


def test_download_file(file_id):
    """测试文件下载"""
    print("\n" + "=" * 50)
    print("测试文件下载")
    print("=" * 50)
    
    response = requests.get(
        f"{BASE_URL}/api/files/download/{file_id}?bucket={BUCKET}"
    )
    
    if response.status_code == 200:
        print(f"✅ 下载成功!")
        print(f"   文件内容: {response.content.decode('utf-8')}")
    else:
        print(f"❌ 下载失败: {response.status_code}")
        print(f"   错误信息: {response.text}")


def test_list_files():
    """测试获取文件列表"""
    print("\n" + "=" * 50)
    print("测试获取文件列表")
    print("=" * 50)
    
    response = requests.get(
        f"{BASE_URL}/api/files?bucket={BUCKET}&limit=10"
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 获取文件列表成功!")
        print(f"   文件总数: {data['total']}")
        for i, file_info in enumerate(data['files'], 1):
            print(f"   {i}. {file_info['filename']} ({file_info['size']} bytes)")
    else:
        print(f"❌ 获取文件列表失败: {response.status_code}")
        print(f"   错误信息: {response.text}")


def test_delete_file(file_id):
    """测试文件删除"""
    print("\n" + "=" * 50)
    print("测试文件删除")
    print("=" * 50)
    
    response = requests.delete(
        f"{BASE_URL}/api/files/{file_id}?bucket={BUCKET}"
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ 删除成功!")
        print(f"   消息: {data['message']}")
        print(f"   文件ID: {data['file_id']}")
    else:
        print(f"❌ 删除失败: {response.status_code}")
        print(f"   错误信息: {response.text}")


def main():
    """主测试函数"""
    print("\n" + "🚀 开始测试文件API\n")
    
    # 1. 上传文件
    file_id = test_upload_file()
    if not file_id:
        print("\n❌ 测试中止: 文件上传失败")
        return
    
    # 2. 获取文件信息
    test_get_file_info(file_id)
    
    # 3. 下载文件
    test_download_file(file_id)
    
    # 4. 获取文件列表
    test_list_files()
    
    # 5. 删除文件
    test_delete_file(file_id)
    
    print("\n" + "✅ 所有测试完成!\n")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  测试被用户中断")
    except Exception as e:
        print(f"\n\n❌ 测试过程中发生错误: {str(e)}")

