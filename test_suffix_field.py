#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
测试FileDocument的suffix字段
"""

import tempfile
import os
from src.database.connection import db_connection
from src.database.models import KnowledgeBase, FileDocument

def TestSuffixField():
    """测试suffix字段的保存和读取"""
    
    print("🧪 开始测试FileDocument的suffix字段")
    print("=" * 50)
    
    try:
        # 初始化数据库
        db_connection.InitializeTables()
        print("✅ 数据库初始化完成")
        
        # 创建测试知识库
        test_kb = KnowledgeBase.Create(
            name="Suffix测试知识库",
            description="用于测试suffix字段"
        )
        print(f"✅ 创建测试知识库: {test_kb.name}")
        
        # 创建临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("这是一个测试文件内容")
            temp_file_path = f.name
        
        try:
            # 测试1: 不指定suffix，自动从文件名提取
            print("\n1. 测试自动提取suffix...")
            doc1 = FileDocument.Create(
                name="test_document.pdf",
                file_type="application/pdf",
                size=1024,
                knowledge_base_id=test_kb.id,
                file_path=temp_file_path,
                metadata={"test": "auto_suffix"}
            )
            
            print(f"   文件名: {doc1.name}")
            print(f"   自动提取的suffix: {doc1.suffix}")
            assert doc1.suffix == ".pdf", f"期望suffix为.pdf，实际为{doc1.suffix}"
            print("   ✅ 自动提取suffix成功")
            
            # 测试2: 指定suffix
            print("\n2. 测试指定suffix...")
            doc2 = FileDocument.Create(
                name="test_document.docx",
                file_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                size=2048,
                knowledge_base_id=test_kb.id,
                file_path=temp_file_path,
                suffix=".docx",
                metadata={"test": "manual_suffix"}
            )
            
            print(f"   文件名: {doc2.name}")
            print(f"   指定的suffix: {doc2.suffix}")
            assert doc2.suffix == ".docx", f"期望suffix为.docx，实际为{doc2.suffix}"
            print("   ✅ 指定suffix成功")
            
            # 测试3: 从数据库读取验证
            print("\n3. 测试从数据库读取...")
            retrieved_doc1 = FileDocument.GetById(doc1.id)
            retrieved_doc2 = FileDocument.GetById(doc2.id)
            
            print(f"   文档1 suffix: {retrieved_doc1.suffix}")
            print(f"   文档2 suffix: {retrieved_doc2.suffix}")
            
            assert retrieved_doc1.suffix == ".pdf", "数据库读取的suffix不匹配"
            assert retrieved_doc2.suffix == ".docx", "数据库读取的suffix不匹配"
            print("   ✅ 数据库读取suffix成功")
            
            # 测试4: ToDict方法包含suffix
            print("\n4. 测试ToDict方法...")
            doc1_dict = doc1.ToDict()
            doc2_dict = doc2.ToDict()
            
            print(f"   文档1字典中的suffix: {doc1_dict.get('suffix')}")
            print(f"   文档2字典中的suffix: {doc2_dict.get('suffix')}")
            
            assert doc1_dict.get('suffix') == ".pdf", "ToDict中的suffix不匹配"
            assert doc2_dict.get('suffix') == ".docx", "ToDict中的suffix不匹配"
            print("   ✅ ToDict方法包含suffix成功")
            
            # 测试5: 测试不同文件类型
            print("\n5. 测试不同文件类型...")
            test_files = [
                ("document.txt", "text/plain", ".txt"),
                ("image.png", "image/png", ".png"),
                ("data.json", "application/json", ".json"),
                ("spreadsheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"),
                ("archive.zip", "application/zip", ".zip")
            ]
            
            for filename, file_type, expected_suffix in test_files:
                doc = FileDocument.Create(
                    name=filename,
                    file_type=file_type,
                    size=512,
                    knowledge_base_id=test_kb.id,
                    file_path=temp_file_path,
                    metadata={"test": "file_type_test"}
                )
                
                print(f"   {filename} -> suffix: {doc.suffix}")
                assert doc.suffix == expected_suffix, f"{filename}的suffix应为{expected_suffix}，实际为{doc.suffix}"
            
            print("   ✅ 不同文件类型suffix提取成功")
            
            # 清理测试数据
            print("\n6. 清理测试数据...")
            doc1.Delete()
            doc2.Delete()
            print("   ✅ 测试数据清理完成")
            
        finally:
            # 删除临时文件
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
        # 删除测试知识库
        test_kb.Delete()
        print("✅ 测试知识库删除完成")
        
        print("\n" + "=" * 50)
        print("🎉 所有测试通过！suffix字段功能正常")
        return True
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        return False

if __name__ == "__main__":
    success = TestSuffixField()
    exit(0 if success else 1) 