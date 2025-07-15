#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据库初始化脚本
用于创建MySQL数据库和表结构
"""

import os
import sys
import pymysql
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.database.connection import db_connection


def CreateDatabase():
    """创建数据库"""
    try:
        # 获取数据库配置
        host = os.getenv("MYSQL_HOST", "localhost")
        port = int(os.getenv("MYSQL_PORT", "3306"))
        user = os.getenv("MYSQL_USER", "root")
        password = os.getenv("MYSQL_PASSWORD", "")
        database = os.getenv("MYSQL_DATABASE", "iasmind")
        charset = os.getenv("MYSQL_CHARSET", "utf8mb4")
        
        # 连接MySQL服务器（不指定数据库）
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            charset=charset
        )
        
        cursor = connection.cursor()
        
        # 创建数据库
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET {charset} COLLATE {charset}_unicode_ci")
        print(f"✅ 数据库 '{database}' 创建成功")
        
        cursor.close()
        connection.close()
        
        return True
        
    except Exception as e:
        print(f"❌ 创建数据库失败: {e}")
        return False


def InitializeTables():
    """初始化表结构"""
    try:
        # 初始化数据库表
        db_connection.InitializeTables()
        print("✅ 数据库表初始化成功")
        return True
        
    except Exception as e:
        print(f"❌ 数据库表初始化失败: {e}")
        return False


def InsertSampleData():
    """插入示例数据"""
    try:
        from src.database.models import KnowledgeBase
        
        # 检查是否已有数据
        existing_kbs = KnowledgeBase.GetAll()
        if existing_kbs:
            print("ℹ️  数据库中已有数据，跳过示例数据插入")
            return True
        
        # 创建示例知识库
        sample_kbs = [
            {
                "name": "产品文档库",
                "description": "包含所有产品相关文档和说明书",
                "embedding_model": "text-embedding-3-small",
                "chunk_size": 1000,
                "chunk_overlap": 200
            },
            {
                "name": "技术文档库", 
                "description": "开发相关的技术文档和API文档",
                "embedding_model": "text-embedding-3-large",
                "chunk_size": 800,
                "chunk_overlap": 150
            },
            {
                "name": "法务合规文档",
                "description": "法律法规和合规相关文档",
                "embedding_model": "text-embedding-3-small",
                "chunk_size": 1200,
                "chunk_overlap": 100
            }
        ]
        
        for kb_data in sample_kbs:
            KnowledgeBase.Create(**kb_data)
        
        print("✅ 示例数据插入成功")
        return True
        
    except Exception as e:
        print(f"❌ 示例数据插入失败: {e}")
        return False


def main():
    """主函数"""
    print("🚀 开始初始化IASMind数据库...")
    
    # 创建数据库
    if not CreateDatabase():
        print("❌ 数据库创建失败，退出")
        sys.exit(1)
    
    # 初始化表结构
    if not InitializeTables():
        print("❌ 表结构初始化失败，退出")
        sys.exit(1)
    
    # 插入示例数据
    if not InsertSampleData():
        print("❌ 示例数据插入失败，退出")
        sys.exit(1)
    
    print("🎉 IASMind数据库初始化完成！")
    print("\n📋 下一步操作：")
    print("1. 确保MySQL服务正在运行")
    print("2. 检查.env文件中的数据库配置")
    print("3. 启动后端服务: python main.py")
    print("4. 启动前端服务: cd web && pnpm dev")


if __name__ == "__main__":
    main() 