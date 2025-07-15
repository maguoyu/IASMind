#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
测试数据录入脚本
插入丰富的测试数据用于功能测试
"""

import os
import sys
import tempfile
import random
from pathlib import Path
from datetime import datetime, timedelta

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.database.models import KnowledgeBase, FileDocument
from src.database.connection import db_connection


def CreateTestKnowledgeBases():
    """创建测试知识库"""
    print("📚 创建测试知识库...")
    
    test_knowledge_bases = [
        {
            "name": "产品文档库",
            "description": "包含所有产品相关文档、用户手册、技术规格书等",
            "embedding_model": "text-embedding-3-small",
            "chunk_size": 1000,
            "chunk_overlap": 200
        },
        {
            "name": "技术文档库",
            "description": "开发相关的技术文档、API文档、架构设计文档",
            "embedding_model": "text-embedding-3-large",
            "chunk_size": 800,
            "chunk_overlap": 150
        },
        {
            "name": "法务合规文档",
            "description": "法律法规、合规要求、合同模板等文档",
            "embedding_model": "text-embedding-3-small",
            "chunk_size": 1200,
            "chunk_overlap": 100
        },
        {
            "name": "市场调研报告",
            "description": "市场分析、竞品研究、用户调研等报告",
            "embedding_model": "text-embedding-3-small",
            "chunk_size": 1500,
            "chunk_overlap": 300
        },
        {
            "name": "培训资料库",
            "description": "员工培训材料、操作指南、最佳实践文档",
            "embedding_model": "text-embedding-3-small",
            "chunk_size": 600,
            "chunk_overlap": 100
        }
    ]
    
    created_kbs = []
    for kb_data in test_knowledge_bases:
        kb = KnowledgeBase.Create(**kb_data)
        created_kbs.append(kb)
        print(f"  ✅ 创建知识库: {kb.name}")
    
    return created_kbs


def CreateTestFiles(knowledge_bases):
    """创建测试文件"""
    print("\n📄 创建测试文件...")
    
    # 文件类型和名称模板
    file_templates = [
        {
            "type": "application/pdf",
            "names": [
                "产品需求文档_v2.3.pdf",
                "用户手册_最新版.pdf",
                "技术规格书.pdf",
                "API接口文档.pdf",
                "系统架构设计.pdf",
                "数据库设计文档.pdf",
                "前端开发规范.pdf",
                "后端开发规范.pdf",
                "测试用例文档.pdf",
                "部署指南.pdf"
            ]
        },
        {
            "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "names": [
                "项目计划书.docx",
                "会议纪要.docx",
                "需求分析报告.docx",
                "设计方案.docx",
                "工作总结.docx",
                "培训材料.docx",
                "操作手册.docx",
                "故障排除指南.docx"
            ]
        },
        {
            "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "names": [
                "项目进度表.xlsx",
                "预算规划表.xlsx",
                "人员配置表.xlsx",
                "数据统计表.xlsx",
                "成本分析表.xlsx",
                "风险评估表.xlsx"
            ]
        },
        {
            "type": "text/plain",
            "names": [
                "README.txt",
                "CHANGELOG.txt",
                "LICENSE.txt",
                "配置说明.txt",
                "安装指南.txt",
                "常见问题.txt"
            ]
        },
        {
            "type": "text/markdown",
            "names": [
                "项目介绍.md",
                "开发指南.md",
                "API文档.md",
                "部署文档.md",
                "贡献指南.md"
            ]
        }
    ]
    
    # 状态分布
    statuses = ["uploaded", "processing", "vectorized", "failed"]
    status_weights = [0.3, 0.1, 0.5, 0.1]  # 权重分布
    
    created_files = []
    
    for kb in knowledge_bases:
        print(f"\n  为知识库 '{kb.name}' 创建文件:")
        
        # 为每个知识库创建多个文件
        num_files = random.randint(3, 8)
        
        for i in range(num_files):
            # 随机选择文件类型
            file_template = random.choice(file_templates)
            file_name = random.choice(file_template["names"])
            
            # 生成随机文件大小 (10KB - 10MB)
            file_size = random.randint(10 * 1024, 10 * 1024 * 1024)
            
            # 随机选择状态
            status = random.choices(statuses, weights=status_weights)[0]
            
            # 创建临时文件
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
            temp_file.write(f"这是测试文件 {file_name} 的内容。\n" * 100)
            temp_file.close()
            
            # 创建文件文档记录
            metadata = {
                "description": f"测试文件 {i+1}",
                "original_filename": file_name,
                "uploaded_by": "test_user",
                "file_size_mb": round(file_size / (1024 * 1024), 2),
                "test_data": True
            }
            
            # 设置上传时间为过去几天
            upload_time = datetime.now() - timedelta(days=random.randint(1, 30))
            
            doc = FileDocument.Create(
                name=file_name,
                file_type=file_template["type"],
                size=file_size,
                knowledge_base_id=kb.id,
                file_path=temp_file.name,
                metadata=metadata
            )
            
            # 手动设置上传时间
            doc.uploaded_at = upload_time.isoformat()
            doc.Update()
            
            # 如果状态是向量化完成，设置向量数量
            if status == "vectorized":
                vector_count = random.randint(50, 500)
                doc.vector_count = vector_count
                doc.last_vectorized_at = upload_time.isoformat()
                doc.Update()
            
            # 设置状态
            doc.UpdateStatus(status)
            
            created_files.append(doc)
            print(f"    ✅ {file_name} ({status})")
    
    return created_files


def CreateSampleData():
    """创建示例数据"""
    print("🎯 创建示例数据...")
    
    # 创建示例知识库
    sample_kb = KnowledgeBase.Create(
        name="示例知识库",
        description="这是一个示例知识库，用于演示功能",
        embedding_model="text-embedding-3-small",
        chunk_size=1000,
        chunk_overlap=200
    )
    
    # 创建示例文件
    sample_files = [
        {
            "name": "示例文档.pdf",
            "type": "application/pdf",
            "size": 1024 * 1024,  # 1MB
            "status": "vectorized",
            "vector_count": 150
        },
        {
            "name": "示例报告.docx",
            "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "size": 512 * 1024,  # 512KB
            "status": "uploaded",
            "vector_count": 0
        },
        {
            "name": "示例数据.xlsx",
            "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "size": 256 * 1024,  # 256KB
            "status": "processing",
            "vector_count": 0
        }
    ]
    
    for file_data in sample_files:
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        temp_file.write(f"这是{file_data['name']}的内容")
        temp_file.close()
        
        metadata = {
            "description": "示例文件",
            "original_filename": file_data["name"],
            "uploaded_by": "demo_user",
            "file_size_mb": round(file_data["size"] / (1024 * 1024), 2),
            "sample_data": True
        }
        
        doc = FileDocument.Create(
            name=file_data["name"],
            file_type=file_data["type"],
            size=file_data["size"],
            knowledge_base_id=sample_kb.id,
            file_path=temp_file.name,
            metadata=metadata
        )
        
        if file_data["status"] == "vectorized":
            doc.UpdateVectorization(file_data["vector_count"])
        elif file_data["status"] == "processing":
            doc.UpdateStatus("processing")
        
        print(f"  ✅ 创建示例文件: {file_data['name']}")


def ShowStatistics():
    """显示数据统计"""
    print("\n📊 数据统计:")
    
    knowledge_bases = KnowledgeBase.GetAll()
    files = FileDocument.GetAll(limit=10000)
    
    print(f"  知识库数量: {len(knowledge_bases)}")
    print(f"  文件总数: {len(files)}")
    
    # 按状态统计文件
    status_stats = {}
    for file in files:
        status_stats[file.status] = status_stats.get(file.status, 0) + 1
    
    print("  文件状态分布:")
    for status, count in status_stats.items():
        print(f"    {status}: {count}")
    
    # 按知识库统计
    print("  各知识库文件数量:")
    for kb in knowledge_bases:
        kb_files = [f for f in files if f.knowledge_base_id == kb.id]
        print(f"    {kb.name}: {len(kb_files)} 个文件")


def main():
    """主函数"""
    print("🚀 开始插入测试数据...")
    
    try:
        # 初始化数据库
        db_connection.InitializeTables()
        print("✅ 数据库初始化完成")
        
        # 检查是否已有数据
        existing_kbs = KnowledgeBase.GetAll()
        if existing_kbs:
            print("⚠️  数据库中已有数据")
            response = input("是否继续插入测试数据？(y/N): ")
            if response.lower() != 'y':
                print("❌ 操作已取消")
                return
        
        # 创建测试知识库
        test_kbs = CreateTestKnowledgeBases()
        
        # 创建测试文件
        test_files = CreateTestFiles(test_kbs)
        
        # 创建示例数据
        CreateSampleData()
        
        # 显示统计信息
        ShowStatistics()
        
        print("\n🎉 测试数据插入完成！")
        print("\n📋 下一步操作:")
        print("1. 启动后端服务: python main.py")
        print("2. 启动前端服务: cd web && pnpm dev")
        print("3. 访问知识库管理页面进行测试")
        
    except Exception as e:
        print(f"❌ 插入测试数据失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main() 