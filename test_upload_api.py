#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
测试文件上传API
"""

import requests
import tempfile
import os

def test_upload_api():
    """测试文件上传API"""
    
    # 创建测试文件
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("这是一个测试文件内容")
        temp_file_path = f.name
    
    try:
        # 准备上传数据
        with open(temp_file_path, 'rb') as f:
            files = {'file': ('test_file.txt', f, 'text/plain')}
            data = {'description': '测试文件'}
            
            # 发送请求
            response = requests.post(
                'http://localhost:8000/api/knowledge_base/upload',
                files=files,
                data=data
            )
        
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            print("✅ 文件上传成功")
        else:
            print("❌ 文件上传失败")
            
    except Exception as e:
        print(f"❌ 测试失败: {e}")
    
    finally:
        # 清理临时文件
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

if __name__ == "__main__":
    test_upload_api() 