#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
知识库功能集成测试
"""

import os
import sys
import tempfile
import unittest
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.database.models import KnowledgeBase, FileDocument
from src.database.connection import db_connection


class TestKnowledgeBase(unittest.TestCase):
    """知识库功能测试类"""
    
    def setUp(self):
        """测试前准备"""
        # 初始化数据库连接
        db_connection.InitializeTables()
        
        # 创建测试知识库
        self.test_kb = KnowledgeBase.Create(
            name="测试知识库",
            description="用于测试的知识库",
            embedding_model="text-embedding-3-small"
        )
    
    def tearDown(self):
        """测试后清理"""
        # 清理测试数据
        if hasattr(self, 'test_kb'):
            self.test_kb.Delete()
    
    def test_create_knowledge_base(self):
        """测试创建知识库"""
        kb = KnowledgeBase.Create(
            name="测试知识库2",
            description="测试描述",
            embedding_model="text-embedding-3-small"
        )
        
        self.assertIsNotNone(kb.id)
        self.assertEqual(kb.name, "测试知识库2")
        self.assertEqual(kb.description, "测试描述")
        self.assertEqual(kb.status, "active")
        
        # 清理
        kb.Delete()
    
    def test_get_knowledge_base(self):
        """测试获取知识库"""
        kb = KnowledgeBase.GetById(self.test_kb.id)
        
        self.assertIsNotNone(kb)
        self.assertEqual(kb.id, self.test_kb.id)
        self.assertEqual(kb.name, self.test_kb.name)
    
    def test_update_knowledge_base(self):
        """测试更新知识库"""
        success = self.test_kb.Update(
            name="更新后的名称",
            description="更新后的描述"
        )
        
        self.assertTrue(success)
        
        # 重新获取验证更新
        updated_kb = KnowledgeBase.GetById(self.test_kb.id)
        self.assertEqual(updated_kb.name, "更新后的名称")
        self.assertEqual(updated_kb.description, "更新后的描述")
    
    def test_get_all_knowledge_bases(self):
        """测试获取所有知识库"""
        kbs = KnowledgeBase.GetAll()
        
        self.assertIsInstance(kbs, list)
        self.assertGreater(len(kbs), 0)
    
    def test_delete_knowledge_base(self):
        """测试删除知识库"""
        kb = KnowledgeBase.Create(
            name="待删除知识库",
            description="将被删除"
        )
        
        success = kb.Delete()
        self.assertTrue(success)
        
        # 验证已删除
        deleted_kb = KnowledgeBase.GetById(kb.id)
        self.assertIsNone(deleted_kb)


class TestFileDocument(unittest.TestCase):
    """文件文档功能测试类"""
    
    def setUp(self):
        """测试前准备"""
        # 初始化数据库连接
        db_connection.InitializeTables()
        
        # 创建测试知识库
        self.test_kb = KnowledgeBase.Create(
            name="文件测试知识库",
            description="用于文件测试"
        )
        
        # 创建临时文件
        self.temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        self.temp_file.write("这是一个测试文件内容")
        self.temp_file.close()
    
    def tearDown(self):
        """测试后清理"""
        # 清理测试数据
        if hasattr(self, 'test_kb'):
            self.test_kb.Delete()
        
        # 删除临时文件
        if hasattr(self, 'temp_file'):
            os.unlink(self.temp_file.name)
    
    def test_create_file_document(self):
        """测试创建文件文档"""
        doc = FileDocument.Create(
            name="test.txt",
            file_type="text/plain",
            size=1024,
            knowledge_base_id=self.test_kb.id,
            file_path=self.temp_file.name,
            metadata={"test": "data"}
        )
        
        self.assertIsNotNone(doc.id)
        self.assertEqual(doc.name, "test.txt")
        self.assertEqual(doc.type, "text/plain")
        self.assertEqual(doc.knowledge_base_id, self.test_kb.id)
        self.assertEqual(doc.status, "uploaded")
        
        # 清理
        doc.Delete()
    
    def test_get_file_document(self):
        """测试获取文件文档"""
        doc = FileDocument.Create(
            name="test.txt",
            file_type="text/plain",
            size=1024,
            knowledge_base_id=self.test_kb.id,
            file_path=self.temp_file.name
        )
        
        retrieved_doc = FileDocument.GetById(doc.id)
        
        self.assertIsNotNone(retrieved_doc)
        self.assertEqual(retrieved_doc.id, doc.id)
        self.assertEqual(retrieved_doc.name, doc.name)
        
        # 清理
        doc.Delete()
    
    def test_get_files_by_knowledge_base(self):
        """测试根据知识库获取文件"""
        # 创建多个文件
        docs = []
        for i in range(3):
            doc = FileDocument.Create(
                name=f"test{i}.txt",
                file_type="text/plain",
                size=1024,
                knowledge_base_id=self.test_kb.id,
                file_path=self.temp_file.name
            )
            docs.append(doc)
        
        # 获取文件列表
        files = FileDocument.GetByKnowledgeBase(self.test_kb.id)
        
        self.assertEqual(len(files), 3)
        
        # 清理
        for doc in docs:
            doc.Delete()
    
    def test_update_file_status(self):
        """测试更新文件状态"""
        doc = FileDocument.Create(
            name="test.txt",
            file_type="text/plain",
            size=1024,
            knowledge_base_id=self.test_kb.id,
            file_path=self.temp_file.name
        )
        
        # 更新状态
        success = doc.UpdateStatus("processing")
        self.assertTrue(success)
        
        # 验证状态更新
        updated_doc = FileDocument.GetById(doc.id)
        self.assertEqual(updated_doc.status, "processing")
        
        # 清理
        doc.Delete()
    
    def test_vectorize_file(self):
        """测试文件向量化"""
        doc = FileDocument.Create(
            name="test.txt",
            file_type="text/plain",
            size=1024,
            knowledge_base_id=self.test_kb.id,
            file_path=self.temp_file.name
        )
        
        # 向量化
        success = doc.UpdateVectorization(150)
        self.assertTrue(success)
        
        # 验证向量化结果
        vectorized_doc = FileDocument.GetById(doc.id)
        self.assertEqual(vectorized_doc.status, "vectorized")
        self.assertEqual(vectorized_doc.vector_count, 150)
        self.assertIsNotNone(vectorized_doc.last_vectorized_at)
        
        # 清理
        doc.Delete()
    
    def test_delete_file_document(self):
        """测试删除文件文档"""
        doc = FileDocument.Create(
            name="test.txt",
            file_type="text/plain",
            size=1024,
            knowledge_base_id=self.test_kb.id,
            file_path=self.temp_file.name
        )
        
        success = doc.Delete()
        self.assertTrue(success)
        
        # 验证已删除
        deleted_doc = FileDocument.GetById(doc.id)
        self.assertIsNone(deleted_doc)


class TestDatabaseConnection(unittest.TestCase):
    """数据库连接测试类"""
    
    def test_connection(self):
        """测试数据库连接"""
        try:
            connection = db_connection.GetConnection()
            self.assertIsNotNone(connection)
            self.assertTrue(connection.open)
        except Exception as e:
            self.fail(f"数据库连接失败: {e}")
    
    def test_execute_query(self):
        """测试查询执行"""
        try:
            result = db_connection.ExecuteQuery("SELECT 1 as test")
            self.assertIsInstance(result, list)
            self.assertEqual(len(result), 1)
            self.assertEqual(result[0]['test'], 1)
        except Exception as e:
            self.fail(f"查询执行失败: {e}")


if __name__ == "__main__":
    # 设置测试环境
    os.environ.setdefault("MYSQL_HOST", "localhost")
    os.environ.setdefault("MYSQL_PORT", "3306")
    os.environ.setdefault("MYSQL_USER", "root")
    os.environ.setdefault("MYSQL_PASSWORD", "")
    os.environ.setdefault("MYSQL_DATABASE", "iasmind_test")
    
    # 运行测试
    unittest.main(verbosity=2) 