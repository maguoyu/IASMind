#!/usr/bin/env python3
# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
修复数据洞察功能的脚本
检查并修复数据库表结构，确保data_insights字段正常工作
"""

import os
import sys
import logging
import json
from pathlib import Path

# 添加项目根目录到Python路径
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.append(str(PROJECT_ROOT))

# 导入项目模块
from src.database.connection import db_connection
from src.database.models import FileExploration

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("fix-data-insights")

def check_database_connection():
    """检查数据库连接"""
    logger.info("检查数据库连接...")
    try:
        conn = db_connection.GetConnection()
        logger.info("✅ 数据库连接正常")
        return True
    except Exception as e:
        logger.error(f"❌ 数据库连接失败: {e}")
        return False

def check_table_structure():
    """检查表结构"""
    logger.info("检查file_exploration表结构...")
    
    # 检查data_insights字段
    sql = "DESCRIBE file_exploration data_insights"
    try:
        result = db_connection.ExecuteQuery(sql)
        if result:
            field_type = result[0].get('Type', '')
            logger.info(f"✅ data_insights字段存在，类型为: {field_type}")
            return True, field_type
        else:
            logger.error("❌ data_insights字段不存在")
            return False, None
    except Exception as e:
        logger.error(f"❌ 检查表结构失败: {e}")
        return False, None

def fix_table_structure():
    """修复表结构"""
    logger.info("正在修复file_exploration表结构...")
    
    # 修改data_insights字段为JSON类型
    sql = "ALTER TABLE file_exploration MODIFY COLUMN data_insights JSON"
    try:
        db_connection.ExecuteUpdate(sql)
        logger.info("✅ 已修改data_insights字段为JSON类型")
        return True
    except Exception as e:
        logger.error(f"❌ 修改表结构失败: {e}")
        return False

def test_update_insights():
    """测试更新洞察信息"""
    logger.info("测试更新洞察信息...")
    
    # 获取一个文件进行测试
    files = FileExploration.GetByUserId(user_id="test_user", limit=1)
    if not files:
        logger.warning("⚠️ 未找到测试文件，创建测试文件...")
        try:
            # 创建测试文件
            test_file = FileExploration.Create(
                name="test_file.csv",
                file_type="text/csv",
                size=1024,
                user_id="test_user",
                file_path="/tmp/test_file.csv",
                preview_data=[{"col1": 1, "col2": "test"}]
            )
            logger.info(f"✅ 已创建测试文件: {test_file.id}")
            test_file_id = test_file.id
        except Exception as e:
            logger.error(f"❌ 创建测试文件失败: {e}")
            return False
    else:
        test_file_id = files[0].id
        logger.info(f"✅ 找到测试文件: {test_file_id}")
    
    # 测试更新洞察
    test_insights = {
        "test_key": "test_value",
        "timestamp": "2023-01-01"
    }
    
    # 直接执行SQL更新
    sql = """
    UPDATE file_exploration 
    SET data_insights = %s, updated_at = CURRENT_TIMESTAMP
    WHERE id = %s
    """
    try:
        result = db_connection.ExecuteUpdate(sql, (json.dumps(test_insights), test_file_id))
        if result > 0:
            logger.info("✅ 直接SQL更新成功")
            return True
        else:
            logger.error("❌ 直接SQL更新失败")
            return False
    except Exception as e:
        logger.error(f"❌ 直接SQL更新异常: {e}")
        return False

def main():
    """主函数"""
    logger.info("开始修复数据洞察功能...")
    
    # 检查数据库连接
    if not check_database_connection():
        logger.error("无法继续修复，请检查数据库配置")
        return 1
    
    # 检查表结构
    structure_ok, field_type = check_table_structure()
    if structure_ok:
        logger.info("表结构正常，无需修复")
    else:
        logger.warning("需要修复表结构")
        if not fix_table_structure():
            logger.error("修复表结构失败，终止操作")
            return 1
    
    # 测试更新洞察
    if test_update_insights():
        logger.info("✅ 测试成功，数据洞察功能已修复")
    else:
        logger.error("❌ 测试失败，可能需要进一步排查")
        return 1
    
    logger.info("修复完成！")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 