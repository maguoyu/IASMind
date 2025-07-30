# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
元数据管理服务
提供数据源元数据的获取、同步和管理功能
"""

import json
import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple

from src.database.connection import db_connection
from src.database.models import DataSource

logger = logging.getLogger(__name__)


class MetadataService:
    """元数据管理服务类"""
    
    @staticmethod
    def get_database_metadata(datasource_id: str, use_cache: bool = False) -> Dict[str, Any]:
        """
        获取数据源的完整元数据
        
        Args:
            datasource_id: 数据源ID
            use_cache: 是否使用缓存数据（默认False，直接从数据源实时查询）
            
        Returns:
            元数据信息字典
        """
        try:
            # 获取数据源信息
            datasource = DataSource.GetById(datasource_id)
            if not datasource:
                return {
                    "success": False,
                    "message": f"未找到ID为 {datasource_id} 的数据源",
                    "data": None,
                    "sync_time": None,
                    "version": None
                }
            
            # 缓存功能已弃用，始终使用实时查询
            if use_cache:
                logger.warning("缓存功能已弃用，将使用实时查询代替")
                # 继续执行实时查询
            
            # 默认进行实时查询
            logger.info(f"开始实时获取数据源 {datasource_id} 的元数据")
            
            # 根据数据源类型进行实时查询
            if datasource.type == 'mysql':
                metadata_result = MetadataService._get_mysql_metadata_realtime(datasource)
            elif datasource.type == 'oracle':
                metadata_result = MetadataService._get_oracle_metadata_realtime(datasource)
            else:
                return {
                    "success": False,
                    "message": f"不支持的数据源类型: {datasource.type}",
                    "data": None,
                    "sync_time": None,
                    "version": None
                }
            
            if metadata_result['success']:
                # 添加实时查询的时间戳
                metadata_result['sync_time'] = datetime.now().isoformat()
                metadata_result['version'] = 'realtime'
                logger.info(f"数据源 {datasource_id} 元数据实时获取成功")
            
            return metadata_result
            
        except Exception as e:
            logger.exception(f"获取元数据失败: {e}")
            return {
                "success": False,
                "message": f"获取元数据失败: {str(e)}",
                "data": None,
                "sync_time": None,
                "version": None
            }
    

    
    @staticmethod
    def _get_mysql_metadata_realtime(datasource: DataSource) -> Dict[str, Any]:
        """实时获取MySQL数据源元数据"""
        try:
            logger.info(f"开始实时查询MySQL数据源: {datasource.host}:{datasource.port}/{datasource.database}")
            
            import pymysql
            
            connection = pymysql.connect(
                host=datasource.host,
                port=datasource.port,
                user=datasource.username,
                password=datasource.password,
                database=datasource.database,
                charset='utf8mb4',
                connect_timeout=10,  # 设置连接超时
                read_timeout=30      # 设置读取超时
            )
            
            with connection.cursor() as cursor:
                # 获取数据库基本信息
                cursor.execute("SELECT DATABASE() as db_name")
                db_info = cursor.fetchone()
                
                cursor.execute("""
                    SELECT 
                        DEFAULT_CHARACTER_SET_NAME as charset,
                        DEFAULT_COLLATION_NAME as collation
                    FROM information_schema.SCHEMATA 
                    WHERE SCHEMA_NAME = %s
                """, (datasource.database,))
                db_charset_info = cursor.fetchone()
                
                # 获取数据库大小
                cursor.execute("""
                    SELECT 
                        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
                    FROM information_schema.tables 
                    WHERE table_schema = %s
                """, (datasource.database,))
                size_info = cursor.fetchone()
                
                # 获取表和视图统计
                cursor.execute("""
                    SELECT 
                        table_type,
                        COUNT(*) as count
                    FROM information_schema.tables 
                    WHERE table_schema = %s
                    GROUP BY table_type
                """, (datasource.database,))
                table_stats = cursor.fetchall()
                
                tables_count = 0
                views_count = 0
                for stat in table_stats:
                    if stat[0] == 'BASE TABLE':
                        tables_count = stat[1]
                    elif stat[0] == 'VIEW':
                        views_count = stat[1]
                
                # 获取详细表信息
                tables = MetadataService._get_mysql_tables_metadata_realtime(cursor, datasource.database)
            
            connection.close()
            
            database_metadata = {
                'database_name': datasource.database,
                'charset': db_charset_info[0] if db_charset_info else None,
                'collation': db_charset_info[1] if db_charset_info else None,
                'size_mb': float(size_info[0]) if size_info and size_info[0] else 0.0,
                'tables_count': tables_count,
                'views_count': views_count,
                'created_at': None,
                'tables': tables
            }
            
            logger.info(f"MySQL元数据实时查询成功，获取到 {len(tables)} 个表")
            
            return {
                'success': True,
                'data': database_metadata,
                'message': f'MySQL元数据实时获取成功，共 {len(tables)} 个表'
            }
            
        except Exception as e:
            logger.exception(f"实时获取MySQL元数据失败: {e}")
            return {
                'success': False,
                'data': None,
                'message': f"实时获取MySQL元数据失败: {str(e)}"
            }
    
    @staticmethod
    def _get_mysql_tables_metadata_realtime(cursor, database_name: str) -> List[Dict[str, Any]]:
        """实时获取MySQL表的详细元数据"""
        tables = []
        
        try:
            # 获取所有表和视图的基本信息
            cursor.execute("""
                SELECT 
                    table_name,
                    table_type,
                    table_comment,
                    table_rows,
                    ROUND((data_length + index_length) / 1024 / 1024, 2) AS size_mb,
                    create_time,
                    update_time
                FROM information_schema.tables 
                WHERE table_schema = %s
                ORDER BY table_name
            """, (database_name,))
            
            table_infos = cursor.fetchall()
            
            for table_info in table_infos:
                table_name = table_info[0]
                table_type = 'table' if table_info[1] == 'BASE TABLE' else 'view'
                
                # 获取列信息
                columns = MetadataService._get_mysql_columns_realtime(cursor, database_name, table_name)
                
                # 获取索引信息
                indexes = MetadataService._get_mysql_indexes_realtime(cursor, database_name, table_name)
                
                # 获取约束信息
                constraints = MetadataService._get_mysql_constraints_realtime(cursor, database_name, table_name)
                
                table_metadata = {
                    'table_name': table_name,
                    'schema': database_name,
                    'type': table_type,
                    'table_comment': table_info[2] or '',
                    'rows_count': table_info[3] if table_info[3] else 0,
                    'size_mb': float(table_info[4]) if table_info[4] else 0.0,
                    'created_at': table_info[5].isoformat() if table_info[5] else None,
                    'updated_at': table_info[6].isoformat() if table_info[6] else None,
                    'columns': columns,
                    'indexes': indexes,
                    'constraints': constraints
                }
                
                tables.append(table_metadata)
                
        except Exception as e:
            logger.exception(f"实时获取MySQL表元数据失败: {e}")
        
        return tables
    
    @staticmethod
    def _get_mysql_columns_realtime(cursor, database_name: str, table_name: str) -> List[Dict[str, Any]]:
        """实时获取MySQL表的列信息"""
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_key,
                column_default,
                extra,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                column_comment
            FROM information_schema.columns 
            WHERE table_schema = %s AND table_name = %s
            ORDER BY ordinal_position
        """, (database_name, table_name))
        
        columns = []
        for col in cursor.fetchall():
            column_data = {
                'column_name': col[0],
                'data_type': col[1],
                'is_nullable': col[2],
                'column_key': col[3] if col[3] else None,
                'column_default': col[4],
                'extra': col[5],
                'character_maximum_length': col[6],
                'numeric_precision': col[7],
                'numeric_scale': col[8],
                'column_comment': col[9] or ''
            }
            columns.append(column_data)
        
        return columns
    
    @staticmethod
    def _get_mysql_indexes_realtime(cursor, database_name: str, table_name: str) -> List[Dict[str, Any]]:
        """实时获取MySQL表的索引信息"""
        cursor.execute("""
            SELECT 
                index_name,
                column_name,
                non_unique,
                index_type,
                index_comment
            FROM information_schema.statistics 
            WHERE table_schema = %s AND table_name = %s
            ORDER BY index_name, seq_in_index
        """, (database_name, table_name))
        
        # 按索引名分组
        indexes_dict = {}
        for row in cursor.fetchall():
            index_name = row[0]
            if index_name not in indexes_dict:
                # 确定索引类型
                if index_name == 'PRIMARY':
                    index_type = 'primary'
                elif row[2] == 0:  # non_unique = 0 表示唯一索引
                    index_type = 'unique'
                else:
                    index_type = 'index'
                
                indexes_dict[index_name] = {
                    'index_name': index_name,
                    'index_type': index_type,
                    'columns': [],
                    'unique': row[2] == 0,
                    'index_comment': row[4] or ''
                }
            
            indexes_dict[index_name]['columns'].append(row[1])
        
        return list(indexes_dict.values())
    
    @staticmethod
    def _get_mysql_constraints_realtime(cursor, database_name: str, table_name: str) -> List[Dict[str, Any]]:
        """实时获取MySQL表的约束信息"""
        constraints = []
        
        try:
            # 获取外键约束
            cursor.execute("""
                SELECT 
                    kcu.constraint_name,
                    kcu.column_name,
                    kcu.referenced_table_name,
                    kcu.referenced_column_name,
                    rc.constraint_name
                FROM information_schema.key_column_usage kcu
                LEFT JOIN information_schema.referential_constraints rc 
                    ON kcu.constraint_name = rc.constraint_name
                    AND kcu.table_schema = rc.constraint_schema
                WHERE kcu.table_schema = %s 
                    AND kcu.table_name = %s
                    AND kcu.referenced_table_name IS NOT NULL
                ORDER BY kcu.constraint_name, kcu.ordinal_position
            """, (database_name, table_name))
            
            # 按约束名分组外键
            fk_constraints = {}
            for row in cursor.fetchall():
                constraint_name = row[0]
                if constraint_name not in fk_constraints:
                    fk_constraints[constraint_name] = {
                        'constraint_name': constraint_name,
                        'constraint_type': 'foreign_key',
                        'columns': [],
                        'referenced_table': row[2],
                        'referenced_columns': []
                    }
                
                fk_constraints[constraint_name]['columns'].append(row[1])
                fk_constraints[constraint_name]['referenced_columns'].append(row[3])
            
            constraints.extend(list(fk_constraints.values()))
            
        except Exception as e:
            logger.exception(f"获取MySQL约束信息失败: {e}")
        
        return constraints
    
    @staticmethod
    def _get_oracle_metadata_realtime(datasource: DataSource) -> Dict[str, Any]:
        """实时获取Oracle数据源元数据"""
        try:
            logger.info(f"开始实时查询Oracle数据源: {datasource.host}:{datasource.port}/{datasource.service_name}")
            
            # Oracle实时查询的实现
            # 这里提供基本框架，可以根据需要完善
            import cx_Oracle
            
            # 构建连接字符串
            if datasource.service_name:
                dsn = cx_Oracle.makedsn(datasource.host, datasource.port, service_name=datasource.service_name)
            else:
                dsn = cx_Oracle.makedsn(datasource.host, datasource.port, sid=datasource.database)
            
            connection = cx_Oracle.connect(
                user=datasource.username,
                password=datasource.password,
                dsn=dsn,
                encoding="UTF-8"
            )
            
            with connection.cursor() as cursor:
                # 获取数据库基本信息
                cursor.execute("SELECT user FROM dual")
                schema_name = cursor.fetchone()[0]
                
                # 获取表统计信息
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM user_tables
                """)
                tables_count = cursor.fetchone()[0]
                
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM user_views
                """)
                views_count = cursor.fetchone()[0]
                
                # 获取详细表信息
                tables = MetadataService._get_oracle_tables_metadata_realtime(cursor, schema_name)
            
            connection.close()
            
            database_metadata = {
                'database_name': schema_name,
                'charset': None,  # Oracle字符集信息需要特殊查询
                'collation': None,
                'size_mb': 0.0,   # Oracle大小计算较复杂
                'tables_count': tables_count,
                'views_count': views_count,
                'created_at': None,
                'tables': tables
            }
            
            logger.info(f"Oracle元数据实时查询成功，获取到 {len(tables)} 个表")
            
            return {
                'success': True,
                'data': database_metadata,
                'message': f'Oracle元数据实时获取成功，共 {len(tables)} 个表'
            }
            
        except Exception as e:
            logger.exception(f"实时获取Oracle元数据失败: {e}")
            return {
                'success': False,
                'data': None,
                'message': f"实时获取Oracle元数据失败: {str(e)}"
            }
    
    @staticmethod
    def _get_oracle_tables_metadata_realtime(cursor, schema_name: str) -> List[Dict[str, Any]]:
        """实时获取Oracle表的详细元数据"""
        tables = []
        
        try:
            # 获取表的基本信息
            cursor.execute("""
                SELECT 
                    table_name,
                    'table' as table_type,
                    NVL(comments, '') as table_comment,
                    NVL(num_rows, 0) as table_rows
                FROM user_tables t
                LEFT JOIN user_tab_comments c ON t.table_name = c.table_name
                ORDER BY table_name
            """)
            
            for row in cursor.fetchall():
                table_name = row[0]
                
                # 获取列信息（简化版）
                cursor.execute("""
                    SELECT 
                        column_name,
                        data_type,
                        nullable,
                        NVL(comments, '') as column_comment
                    FROM user_tab_columns c
                    LEFT JOIN user_col_comments cc ON c.table_name = cc.table_name 
                        AND c.column_name = cc.column_name
                    WHERE c.table_name = :table_name
                    ORDER BY column_id
                """, {'table_name': table_name})
                
                columns = []
                for col in cursor.fetchall():
                    columns.append({
                        'column_name': col[0],
                        'data_type': col[1],
                        'is_nullable': col[2],
                        'column_key': None,  # Oracle主键信息需要额外查询
                        'column_default': None,
                        'column_comment': col[3]
                    })
                
                table_metadata = {
                    'table_name': table_name,
                    'schema': schema_name,
                    'type': 'table',
                    'table_comment': row[2],
                    'rows_count': row[3],
                    'size_mb': 0.0,  # Oracle表大小计算较复杂
                    'created_at': None,
                    'updated_at': None,
                    'columns': columns,
                    'indexes': [],   # 索引信息可以后续添加
                    'constraints': [] # 约束信息可以后续添加
                }
                
                tables.append(table_metadata)
                
        except Exception as e:
            logger.exception(f"获取Oracle表元数据失败: {e}")
        
        return tables


    

    

    

    

    

    

    
    @staticmethod
    def _create_sync_history(history_id: str, datasource_id: str, status: str):
        """创建同步历史记录"""
        sql = """
        INSERT INTO datasource_sync_history (
            id, datasource_id, status, started_at
        ) VALUES (%s, %s, %s, %s)
        """
        db_connection.ExecuteInsert(sql, (
            history_id, datasource_id, status, datetime.now()
        ))
    
    @staticmethod
    def _update_sync_history(history_id: str, status: str, duration_seconds: int,
                           tables_synced: int, changes_detected: int, error_message: str = None):
        """更新同步历史记录"""
        sql = """
        UPDATE datasource_sync_history 
        SET status = %s, duration_seconds = %s, tables_synced = %s,
            changes_detected = %s, error_message = %s, completed_at = %s
        WHERE id = %s
        """
        db_connection.ExecuteUpdate(sql, (
            status, duration_seconds, tables_synced, changes_detected,
            error_message, datetime.now(), history_id
        ))
    
    @staticmethod
    def get_sync_config(datasource_id: str) -> Dict[str, Any]:
        """获取同步配置"""
        try:
            sql = "SELECT * FROM datasource_sync_config WHERE datasource_id = %s"
            result = db_connection.ExecuteQuery(sql, (datasource_id,))
            
            if not result:
                # 创建默认配置
                return MetadataService._create_default_sync_config(datasource_id)
            
            config = result[0]
            return {
                'enabled': bool(config['enabled']),
                'interval_hours': config['interval_hours'],
                'auto_sync': bool(config['auto_sync']),
                'include_table_stats': bool(config['include_table_stats']),
                'include_indexes': bool(config['include_indexes']),
                'include_constraints': bool(config['include_constraints'])
            }
            
        except Exception as e:
            logger.exception(f"获取同步配置失败: {e}")
            return MetadataService._create_default_sync_config(datasource_id)
    
    @staticmethod
    def _create_default_sync_config(datasource_id: str) -> Dict[str, Any]:
        """创建默认同步配置"""
        try:
            config_id = str(uuid.uuid4())
            sql = """
            INSERT INTO datasource_sync_config (
                id, datasource_id, enabled, interval_hours, auto_sync,
                include_table_stats, include_indexes, include_constraints
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            db_connection.ExecuteInsert(sql, (
                config_id, datasource_id, False, 24, True, True, True, True
            ))
            
            return {
                'enabled': False,
                'interval_hours': 24,
                'auto_sync': True,
                'include_table_stats': True,
                'include_indexes': True,
                'include_constraints': True
            }
        except Exception as e:
            logger.exception(f"创建默认同步配置失败: {e}")
            return {
                'enabled': False,
                'interval_hours': 24,
                'auto_sync': True,
                'include_table_stats': True,
                'include_indexes': True,
                'include_constraints': True
            }
    
    @staticmethod
    def update_sync_config(datasource_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """更新同步配置"""
        try:
            sql = """
            UPDATE datasource_sync_config 
            SET enabled = %s, interval_hours = %s, auto_sync = %s,
                include_table_stats = %s, include_indexes = %s, include_constraints = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE datasource_id = %s
            """
            
            result = db_connection.ExecuteUpdate(sql, (
                config.get('enabled', False),
                config.get('interval_hours', 24),
                config.get('auto_sync', True),
                config.get('include_table_stats', True),
                config.get('include_indexes', True),
                config.get('include_constraints', True),
                datasource_id
            ))
            
            if result == 0:
                # 如果更新失败，可能是记录不存在，创建新记录
                MetadataService._create_default_sync_config(datasource_id)
                return MetadataService.update_sync_config(datasource_id, config)
            
            return MetadataService.get_sync_config(datasource_id)
            
        except Exception as e:
            logger.exception(f"更新同步配置失败: {e}")
            raise
    
    @staticmethod
    def get_sync_status(datasource_id: str) -> Dict[str, Any]:
        """获取同步状态"""
        try:
            # 获取最新同步历史
            history_sql = """
            SELECT * FROM datasource_sync_history 
            WHERE datasource_id = %s 
            ORDER BY sync_time DESC 
            LIMIT 1
            """
            history_result = db_connection.ExecuteQuery(history_sql, (datasource_id,))
            
            # 获取同步配置
            config = MetadataService.get_sync_config(datasource_id)
            
            # 计算同步状态
            status = 'idle'
            last_sync = None
            next_sync = None
            
            if history_result:
                last_history = history_result[0]
                last_sync = last_history['sync_time'].isoformat()
                
                # 如果最近的同步状态是运行中或部分成功，且时间很近，认为正在同步
                if (last_history['status'] in ['running', 'partial'] and 
                    (datetime.now() - last_history['sync_time']).total_seconds() < 300):
                    status = 'syncing'
                elif last_history['status'] == 'failed':
                    status = 'error'
                
                # 计算下次同步时间
                if config['enabled'] and config['auto_sync']:
                    next_sync_time = last_history['sync_time'] + timedelta(hours=config['interval_hours'])
                    if next_sync_time > datetime.now():
                        next_sync = next_sync_time.isoformat()
            
            return {
                'success': True,
                'status': status,
                'last_sync': last_sync,
                'next_sync': next_sync,
                'config': config,
                'message': '获取同步状态成功'
            }
            
        except Exception as e:
            logger.exception(f"获取同步状态失败: {e}")
            return {
                'success': False,
                'status': 'error',
                'last_sync': None,
                'next_sync': None,
                'config': {},
                'message': f"获取同步状态失败: {str(e)}"
            }
    
    @staticmethod
    def get_sync_history(datasource_id: str, page: int = 1, limit: int = 10) -> Dict[str, Any]:
        """获取同步历史"""
        try:
            offset = (page - 1) * limit
            
            # 获取总数
            count_sql = "SELECT COUNT(*) as total FROM datasource_sync_history WHERE datasource_id = %s"
            count_result = db_connection.ExecuteQuery(count_sql, (datasource_id,))
            total = count_result[0]['total'] if count_result else 0
            
            # 获取历史记录
            history_sql = """
            SELECT * FROM datasource_sync_history 
            WHERE datasource_id = %s 
            ORDER BY sync_time DESC 
            LIMIT %s OFFSET %s
            """
            history_result = db_connection.ExecuteQuery(history_sql, (datasource_id, limit, offset))
            
            history_list = []
            for record in history_result:
                history_list.append({
                    'id': record['id'],
                    'datasource_id': record['datasource_id'],
                    'sync_time': record['sync_time'].isoformat(),
                    'status': record['status'],
                    'duration_seconds': record['duration_seconds'],
                    'tables_synced': record['tables_synced'],
                    'changes_detected': record['changes_detected'],
                    'error_message': record['error_message']
                })
            
            return {
                'success': True,
                'history': history_list,
                'total': total,
                'message': '获取同步历史成功'
            }
            
        except Exception as e:
            logger.exception(f"获取同步历史失败: {e}")
            return {
                'success': False,
                'history': [],
                'total': 0,
                'message': f"获取同步历史失败: {str(e)}"
            } 