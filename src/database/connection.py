# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
MySQL数据库连接管理
"""

import os
import logging
from typing import Optional
import pymysql
from pymysql.cursors import DictCursor
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class DatabaseConnection:
    """MySQL数据库连接管理类"""
    
    def __init__(self):
        self.host = os.getenv("MYSQL_HOST", "localhost")
        self.port = int(os.getenv("MYSQL_PORT", "3306"))
        self.user = os.getenv("MYSQL_USER", "root")
        self.password = os.getenv("MYSQL_PASSWORD", "")
        self.database = os.getenv("MYSQL_DATABASE", "iasmind")
        self.charset = os.getenv("MYSQL_CHARSET", "utf8mb4")
        self._connection = None
    
    def GetConnection(self):
        """获取数据库连接"""
        if self._connection is None or not self._connection.open:
            try:
                self._connection = pymysql.connect(
                    host=self.host,
                    port=self.port,
                    user=self.user,
                    password=self.password,
                    database=self.database,
                    charset=self.charset,
                    cursorclass=DictCursor,
                    autocommit=True
                )
                logger.info("MySQL数据库连接成功")
            except Exception as e:
                logger.error(f"MySQL数据库连接失败: {e}")
                raise
        return self._connection
    
    def CloseConnection(self):
        """关闭数据库连接"""
        if self._connection and self._connection.open:
            self._connection.close()
            self._connection = None
            logger.info("MySQL数据库连接已关闭")
    
    @contextmanager
    def GetCursor(self):
        """获取数据库游标的上下文管理器"""
        connection = self.GetConnection()
        cursor = connection.cursor()
        try:
            yield cursor
        except Exception as e:
            connection.rollback()
            logger.error(f"数据库操作失败: {e}")
            raise
        finally:
            cursor.close()
    
    def ExecuteQuery(self, sql: str, params: Optional[tuple] = None):
        """执行查询语句"""
        try:
            with self.GetCursor() as cursor:
                cursor.execute(sql, params)
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"执行查询失败: SQL={sql}, 参数={params}, 错误={e}")
            return []
    
    def ExecuteUpdate(self, sql: str, params: Optional[tuple] = None):
        """执行更新语句"""
        try:
            with self.GetCursor() as cursor:
                result = cursor.execute(sql, params)
                return result
        except Exception as e:
            logger.error(f"执行更新失败: SQL={sql}, 参数={params}, 错误={e}")
            return 0
    
    def ExecuteInsert(self, sql: str, params: Optional[tuple] = None):
        """执行插入语句并返回插入的ID"""
        try:
            with self.GetCursor() as cursor:
                cursor.execute(sql, params)
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"执行插入失败: SQL={sql}, 参数={params}, 错误={e}")
            return None
    
    def InitializeTables(self):
        """初始化数据库表"""
        try:
            # 创建知识库表
            knowledge_base_sql = """
            CREATE TABLE IF NOT EXISTS knowledge_bases (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                file_count INT DEFAULT 0,
                vector_count INT DEFAULT 0,
                status ENUM('active', 'inactive', 'processing') DEFAULT 'active',
                embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
                chunk_size INT DEFAULT 1000,
                chunk_overlap INT DEFAULT 200,
                INDEX idx_status (status),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建文件文档表
            file_documents_sql = """
            CREATE TABLE IF NOT EXISTS file_documents (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                size BIGINT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('uploaded', 'processing', 'vectorized', 'failed') DEFAULT 'uploaded',
                knowledge_base_id VARCHAR(36) NOT NULL,
                vector_count INT DEFAULT 0,
                last_vectorized_at TIMESTAMP NULL,
                error_message TEXT,
                file_path VARCHAR(500) NOT NULL,
                suffix VARCHAR(20),
                metadata JSON,
                INDEX idx_knowledge_base_id (knowledge_base_id),
                INDEX idx_status (status),
                INDEX idx_uploaded_at (uploaded_at),
                INDEX idx_type (type),
                INDEX idx_suffix (suffix),
                FOREIGN KEY (knowledge_base_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建数据探索文件表
            file_exploration_sql = """
            CREATE TABLE IF NOT EXISTS file_exploration (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                size BIGINT NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                file_path VARCHAR(500) NOT NULL,
                status ENUM('active', 'deleted') DEFAULT 'active',
                suffix VARCHAR(20),
                metadata JSON,
                preview_data JSON,
                data_insights JSON,
                last_accessed_at TIMESTAMP NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                INDEX idx_created_at (created_at),
                INDEX idx_updated_at (updated_at),
                INDEX idx_type (type),
                INDEX idx_suffix (suffix),
                INDEX idx_last_accessed_at (last_accessed_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建数据源表
            data_sources_sql = """
            CREATE TABLE IF NOT EXISTS data_sources (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                type ENUM('mysql', 'oracle') NOT NULL DEFAULT 'mysql',
                host VARCHAR(255) NOT NULL,
                port INT NOT NULL,
                username VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                database_name VARCHAR(255) NOT NULL,
                schema_name VARCHAR(255),
                service_name VARCHAR(255),
                `ssl` TINYINT(1) DEFAULT 0,
                ssl_ca TEXT,
                ssl_cert TEXT,
                ssl_key TEXT,
                status ENUM('inactive', 'active', 'error') DEFAULT 'inactive',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                last_connected_at TIMESTAMP NULL,
                error_message TEXT,
                INDEX idx_status (status),
                INDEX idx_type (type),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建数据源元数据表
            datasource_metadata_sql = """
            CREATE TABLE IF NOT EXISTS datasource_metadata (
                id VARCHAR(36) PRIMARY KEY,
                datasource_id VARCHAR(36) NOT NULL,
                database_name VARCHAR(255) NOT NULL,
                charset VARCHAR(100),
                collation VARCHAR(100),
                size_mb DECIMAL(10,2) DEFAULT 0,
                tables_count INT DEFAULT 0,
                views_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                version VARCHAR(50),
                metadata_json JSON,
                INDEX idx_datasource_id (datasource_id),
                INDEX idx_sync_time (sync_time),
                FOREIGN KEY (datasource_id) REFERENCES data_sources(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建表元数据表
            table_metadata_sql = """
            CREATE TABLE IF NOT EXISTS table_metadata (
                id VARCHAR(36) PRIMARY KEY,
                datasource_id VARCHAR(36) NOT NULL,
                metadata_id VARCHAR(36) NOT NULL,
                table_name VARCHAR(255) NOT NULL,
                schema_name VARCHAR(255),
                table_type ENUM('table', 'view') DEFAULT 'table',
                comment TEXT,
                rows_count BIGINT DEFAULT 0,
                size_mb DECIMAL(10,2) DEFAULT 0,
                created_at TIMESTAMP NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                columns_json JSON,
                indexes_json JSON,
                constraints_json JSON,
                INDEX idx_datasource_id (datasource_id),
                INDEX idx_metadata_id (metadata_id),
                INDEX idx_table_name (table_name),
                INDEX idx_table_type (table_type),
                FOREIGN KEY (datasource_id) REFERENCES data_sources(id) ON DELETE CASCADE,
                FOREIGN KEY (metadata_id) REFERENCES datasource_metadata(id) ON DELETE CASCADE,
                UNIQUE KEY uk_datasource_table (datasource_id, table_name, schema_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建同步配置表
            sync_config_sql = """
            CREATE TABLE IF NOT EXISTS datasource_sync_config (
                id VARCHAR(36) PRIMARY KEY,
                datasource_id VARCHAR(36) NOT NULL UNIQUE,
                enabled TINYINT(1) DEFAULT 0,
                interval_hours INT DEFAULT 24,
                auto_sync TINYINT(1) DEFAULT 1,
                include_table_stats TINYINT(1) DEFAULT 1,
                include_indexes TINYINT(1) DEFAULT 1,
                include_constraints TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_datasource_id (datasource_id),
                INDEX idx_enabled (enabled),
                FOREIGN KEY (datasource_id) REFERENCES data_sources(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            # 创建同步历史表
            sync_history_sql = """
            CREATE TABLE IF NOT EXISTS datasource_sync_history (
                id VARCHAR(36) PRIMARY KEY,
                datasource_id VARCHAR(36) NOT NULL,
                sync_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                status ENUM('success', 'failed', 'partial') NOT NULL,
                duration_seconds INT DEFAULT 0,
                tables_synced INT DEFAULT 0,
                changes_detected INT DEFAULT 0,
                error_message TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL,
                INDEX idx_datasource_id (datasource_id),
                INDEX idx_sync_time (sync_time),
                INDEX idx_status (status),
                FOREIGN KEY (datasource_id) REFERENCES data_sources(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            self.ExecuteUpdate(knowledge_base_sql)
            self.ExecuteUpdate(file_documents_sql)
            self.ExecuteUpdate(file_exploration_sql)
            self.ExecuteUpdate(data_sources_sql)
            self.ExecuteUpdate(datasource_metadata_sql)
            self.ExecuteUpdate(table_metadata_sql)
            self.ExecuteUpdate(sync_config_sql)
            self.ExecuteUpdate(sync_history_sql)
            
            logger.info("数据库表初始化完成")
            
        except Exception as e:
            logger.error(f"数据库表初始化失败: {e}")
            raise


# 全局数据库连接实例
db_connection = DatabaseConnection() 