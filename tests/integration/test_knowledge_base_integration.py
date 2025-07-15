#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
知识库管理系统集成测试
测试完整的知识库管理功能
"""

import os
import sys
import tempfile
import time
import requests
import json
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.database.models import KnowledgeBase, FileDocument
from src.database.connection import db_connection


class KnowledgeBaseIntegrationTest:
    """知识库集成测试类"""
    
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_data = {}
        
    def Log(self, message):
        """日志输出"""
        print(f"[{time.strftime('%H:%M:%S')}] {message}")
    
    def TestHealthCheck(self):
        """测试健康检查"""
        self.Log("🔍 测试健康检查...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/knowledge_base/health")
            assert response.status_code == 200, f"健康检查失败: {response.status_code}"
            
            data = response.json()
            assert data["status"] == "healthy", f"系统状态异常: {data['status']}"
            assert data["database"] == "connected", f"数据库连接失败: {data['database']}"
            
            self.Log("✅ 健康检查通过")
            return True
        except Exception as e:
            self.Log(f"❌ 健康检查失败: {e}")
            return False
    
    def TestCreateKnowledgeBase(self):
        """测试创建知识库"""
        self.Log("📚 测试创建知识库...")
        
        try:
            kb_data = {
                "name": "集成测试知识库",
                "description": "用于集成测试的知识库",
                "embedding_model": "text-embedding-3-small",
                "chunk_size": 1000,
                "chunk_overlap": 200
            }
            
            response = self.session.post(
                f"{self.base_url}/api/knowledge_base/knowledge_bases",
                json=kb_data
            )
            assert response.status_code == 200, f"创建知识库失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "创建知识库返回失败"
            
            kb = data["knowledge_base"]
            self.test_data["knowledge_base_id"] = kb["id"]
            
            self.Log(f"✅ 知识库创建成功: {kb['name']} (ID: {kb['id']})")
            return True
        except Exception as e:
            self.Log(f"❌ 创建知识库失败: {e}")
            return False
    
    def TestGetKnowledgeBases(self):
        """测试获取知识库列表"""
        self.Log("📋 测试获取知识库列表...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/knowledge_base/knowledge_bases")
            assert response.status_code == 200, f"获取知识库列表失败: {response.status_code}"
            
            data = response.json()
            assert "knowledge_bases" in data, "响应格式错误"
            assert len(data["knowledge_bases"]) > 0, "知识库列表为空"
            
            # 验证我们创建的知识库在列表中
            kb_ids = [kb["id"] for kb in data["knowledge_bases"]]
            assert self.test_data["knowledge_base_id"] in kb_ids, "创建的知识库不在列表中"
            
            self.Log(f"✅ 获取知识库列表成功: {len(data['knowledge_bases'])} 个知识库")
            return True
        except Exception as e:
            self.Log(f"❌ 获取知识库列表失败: {e}")
            return False
    
    def TestGetKnowledgeBase(self):
        """测试获取知识库详情"""
        self.Log("📖 测试获取知识库详情...")
        
        try:
            kb_id = self.test_data["knowledge_base_id"]
            response = self.session.get(f"{self.base_url}/api/knowledge_base/knowledge_bases/{kb_id}")
            assert response.status_code == 200, f"获取知识库详情失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "获取知识库详情返回失败"
            assert data["knowledge_base"]["id"] == kb_id, "知识库ID不匹配"
            
            self.Log(f"✅ 获取知识库详情成功: {data['knowledge_base']['name']}")
            return True
        except Exception as e:
            self.Log(f"❌ 获取知识库详情失败: {e}")
            return False
    
    def TestUploadFile(self):
        """测试文件上传"""
        self.Log("📤 测试文件上传...")
        
        try:
            # 创建测试文件
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                f.write("这是一个测试文件，用于集成测试。\n" * 10)
                temp_file_path = f.name
            
            # 上传文件
            with open(temp_file_path, 'rb') as f:
                files = {'file': ('test_file.txt', f, 'text/plain')}
                data = {
                    'knowledge_base_id': self.test_data["knowledge_base_id"],
                    'description': '集成测试文件'
                }
                
                response = self.session.post(
                    f"{self.base_url}/api/knowledge_base/upload",
                    files=files,
                    data=data
                )
            
            # 清理临时文件
            os.unlink(temp_file_path)
            
            assert response.status_code == 200, f"文件上传失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "文件上传返回失败"
            assert data["file_id"] is not None, "文件ID为空"
            
            self.test_data["file_id"] = data["file_id"]
            
            self.Log(f"✅ 文件上传成功: {data['file_info']['name']} (ID: {data['file_id']})")
            return True
        except Exception as e:
            self.Log(f"❌ 文件上传失败: {e}")
            return False
    
    def TestGetFiles(self):
        """测试获取文件列表"""
        self.Log("📄 测试获取文件列表...")
        
        try:
            response = self.session.get(
                f"{self.base_url}/api/knowledge_base/files",
                params={"knowledge_base_id": self.test_data["knowledge_base_id"]}
            )
            assert response.status_code == 200, f"获取文件列表失败: {response.status_code}"
            
            data = response.json()
            assert "files" in data, "响应格式错误"
            assert len(data["files"]) > 0, "文件列表为空"
            
            # 验证我们上传的文件在列表中
            file_ids = [f["id"] for f in data["files"]]
            assert self.test_data["file_id"] in file_ids, "上传的文件不在列表中"
            
            self.Log(f"✅ 获取文件列表成功: {len(data['files'])} 个文件")
            return True
        except Exception as e:
            self.Log(f"❌ 获取文件列表失败: {e}")
            return False
    
    def TestGetFile(self):
        """测试获取文件详情"""
        self.Log("📖 测试获取文件详情...")
        
        try:
            file_id = self.test_data["file_id"]
            response = self.session.get(f"{self.base_url}/api/knowledge_base/files/{file_id}")
            assert response.status_code == 200, f"获取文件详情失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "获取文件详情返回失败"
            assert data["file"]["id"] == file_id, "文件ID不匹配"
            
            self.Log(f"✅ 获取文件详情成功: {data['file']['name']}")
            return True
        except Exception as e:
            self.Log(f"❌ 获取文件详情失败: {e}")
            return False
    
    def TestVectorizeFile(self):
        """测试文件向量化"""
        self.Log("⚡ 测试文件向量化...")
        
        try:
            file_id = self.test_data["file_id"]
            response = self.session.post(f"{self.base_url}/api/knowledge_base/files/{file_id}/vectorize")
            assert response.status_code == 200, f"文件向量化失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "文件向量化返回失败"
            
            self.Log("✅ 文件向量化请求成功")
            return True
        except Exception as e:
            self.Log(f"❌ 文件向量化失败: {e}")
            return False
    
    def TestDownloadFile(self):
        """测试文件下载"""
        self.Log("📥 测试文件下载...")
        
        try:
            file_id = self.test_data["file_id"]
            response = self.session.get(f"{self.base_url}/api/knowledge_base/files/{file_id}/download")
            assert response.status_code == 200, f"文件下载失败: {response.status_code}"
            assert len(response.content) > 0, "下载的文件内容为空"
            
            self.Log("✅ 文件下载成功")
            return True
        except Exception as e:
            self.Log(f"❌ 文件下载失败: {e}")
            return False
    
    def TestGetStats(self):
        """测试获取统计信息"""
        self.Log("📊 测试获取统计信息...")
        
        try:
            response = self.session.get(f"{self.base_url}/api/knowledge_base/stats")
            assert response.status_code == 200, f"获取统计信息失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "获取统计信息返回失败"
            assert "stats" in data, "统计信息格式错误"
            
            stats = data["stats"]
            assert stats["total_knowledge_bases"] > 0, "知识库数量为0"
            assert stats["total_files"] > 0, "文件数量为0"
            
            self.Log(f"✅ 获取统计信息成功: {stats['total_knowledge_bases']} 个知识库, {stats['total_files']} 个文件")
            return True
        except Exception as e:
            self.Log(f"❌ 获取统计信息失败: {e}")
            return False
    
    def TestDeleteFile(self):
        """测试删除文件"""
        self.Log("🗑️  测试删除文件...")
        
        try:
            file_id = self.test_data["file_id"]
            response = self.session.delete(f"{self.base_url}/api/knowledge_base/files/{file_id}")
            assert response.status_code == 200, f"删除文件失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "删除文件返回失败"
            
            self.Log("✅ 文件删除成功")
            return True
        except Exception as e:
            self.Log(f"❌ 删除文件失败: {e}")
            return False
    
    def TestDeleteKnowledgeBase(self):
        """测试删除知识库"""
        self.Log("🗑️  测试删除知识库...")
        
        try:
            kb_id = self.test_data["knowledge_base_id"]
            response = self.session.delete(f"{self.base_url}/api/knowledge_base/knowledge_bases/{kb_id}")
            assert response.status_code == 200, f"删除知识库失败: {response.status_code}"
            
            data = response.json()
            assert data["success"] == True, "删除知识库返回失败"
            
            self.Log("✅ 知识库删除成功")
            return True
        except Exception as e:
            self.Log(f"❌ 删除知识库失败: {e}")
            return False
    
    def RunAllTests(self):
        """运行所有测试"""
        self.Log("🚀 开始知识库管理系统集成测试")
        self.Log("=" * 50)
        
        tests = [
            ("健康检查", self.TestHealthCheck),
            ("创建知识库", self.TestCreateKnowledgeBase),
            ("获取知识库列表", self.TestGetKnowledgeBases),
            ("获取知识库详情", self.TestGetKnowledgeBase),
            ("上传文件", self.TestUploadFile),
            ("获取文件列表", self.TestGetFiles),
            ("获取文件详情", self.TestGetFile),
            ("文件向量化", self.TestVectorizeFile),
            ("文件下载", self.TestDownloadFile),
            ("获取统计信息", self.TestGetStats),
            ("删除文件", self.TestDeleteFile),
            ("删除知识库", self.TestDeleteKnowledgeBase),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.Log(f"❌ {test_name} 测试异常: {e}")
                failed += 1
            
            # 测试间隔
            time.sleep(1)
        
        self.Log("=" * 50)
        self.Log(f"🎯 测试完成: {passed} 通过, {failed} 失败")
        
        if failed == 0:
            self.Log("🎉 所有测试通过！")
            return True
        else:
            self.Log("❌ 部分测试失败")
            return False


def main():
    """主函数"""
    print("🧪 知识库管理系统集成测试")
    print("=" * 40)
    
    # 检查后端服务是否运行
    try:
        response = requests.get("http://localhost:8000/api/knowledge_base/health", timeout=5)
        if response.status_code != 200:
            print("❌ 后端服务未运行或不可访问")
            print("请先启动后端服务: python scripts/start_services.py")
            return False
    except:
        print("❌ 无法连接到后端服务")
        print("请先启动后端服务: python scripts/start_services.py")
        return False
    
    # 运行测试
    tester = KnowledgeBaseIntegrationTest()
    success = tester.RunAllTests()
    
    if success:
        print("\n✅ 集成测试全部通过！")
        print("知识库管理系统功能正常")
    else:
        print("\n❌ 集成测试失败")
        print("请检查系统配置和日志")
    
    return success


if __name__ == "__main__":
    main() 