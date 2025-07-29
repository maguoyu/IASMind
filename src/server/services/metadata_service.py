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
    def get_database_metadata(datasource_id: str) -> Dict[str, Any]:
        """获取数据源的完整元数据"""
        try:
            # 从数据库获取已缓存的元数据
            sql = """
            SELECT dm.*, GROUP_CONCAT(tm.id) as table_ids
            FROM datasource_metadata dm
            LEFT JOIN table_metadata tm ON dm.id = tm.metadata_id
            WHERE dm.datasource_id = %s
            GROUP BY dm.id
            ORDER BY dm.sync_time DESC
            LIMIT 1
            """
            result = db_connection.ExecuteQuery(sql, (datasource_id,))
            
            if not result:
                return {
                    "success": False,
                    "message": "未找到元数据，请先同步数据源元数据",
                    "data": None,
                    "sync_time": None,
                    "version": None
                }
            
            metadata_record = result[0]
            
            # 获取表详细信息
            tables_sql = """
            SELECT * FROM table_metadata 
            WHERE metadata_id = %s
            ORDER BY table_name
            """
            tables_result = db_connection.ExecuteQuery(tables_sql, (metadata_record['id'],))
            
            # 构建表元数据
            tables = []
            for table_row in tables_result:
                table_data = {
                    'name': table_row['table_name'],
                    'schema': table_row['schema_name'],
                    'type': table_row['table_type'],
                    'comment': table_row['comment'],
                    'rows_count': table_row['rows_count'],
                    'size_mb': float(table_row['size_mb']) if table_row['size_mb'] else 0.0,
                    'created_at': table_row['created_at'].isoformat() if table_row['created_at'] else None,
                    'updated_at': table_row['updated_at'].isoformat() if table_row['updated_at'] else None,
                    'columns': json.loads(table_row['columns_json']) if table_row['columns_json'] else [],
                    'indexes': json.loads(table_row['indexes_json']) if table_row['indexes_json'] else [],
                    'constraints': json.loads(table_row['constraints_json']) if table_row['constraints_json'] else []
                }
                tables.append(table_data)
            
            # 构建数据库元数据响应
            database_metadata = {
                'database_name': metadata_record['database_name'],
                'charset': metadata_record['charset'],
                'collation': metadata_record['collation'],
                'size_mb': float(metadata_record['size_mb']) if metadata_record['size_mb'] else 0.0,
                'tables_count': metadata_record['tables_count'],
                'views_count': metadata_record['views_count'],
                'created_at': metadata_record['created_at'].isoformat() if metadata_record['created_at'] else None,
                'tables': tables
            }
            
            return {
                "success": True,
                "data": database_metadata,
                "sync_time": metadata_record['sync_time'].isoformat() if metadata_record['sync_time'] else None,
                "version": metadata_record['version'],
                "message": "获取元数据成功"
            }
            
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
    def sync_database_metadata(datasource_id: str) -> Dict[str, Any]:
        """同步数据源元数据"""
        sync_start_time = datetime.now()
        sync_history_id = str(uuid.uuid4())
        
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
            
            # 创建同步记录
            MetadataService._create_sync_history(sync_history_id, datasource_id, 'running')
            
            # 根据数据源类型同步元数据
            if datasource.type == 'mysql':
                metadata_result = MetadataService._sync_mysql_metadata(datasource)
            elif datasource.type == 'oracle':
                metadata_result = MetadataService._sync_oracle_metadata(datasource)
            else:
                raise ValueError(f"不支持的数据源类型: {datasource.type}")
            
            if not metadata_result['success']:
                MetadataService._update_sync_history(
                    sync_history_id, 'failed', 
                    int((datetime.now() - sync_start_time).total_seconds()),
                    0, 0, metadata_result['message']
                )
                return metadata_result
            
            # 保存元数据到数据库
            metadata_id = MetadataService._save_metadata_to_db(
                datasource_id, metadata_result['data']
            )
            
            # 更新同步历史为成功
            tables_synced = len(metadata_result['data']['tables'])
            MetadataService._update_sync_history(
                sync_history_id, 'success',
                int((datetime.now() - sync_start_time).total_seconds()),
                tables_synced, 0  # changes_detected 可以后续实现
            )
            
            return {
                "success": True,
                "data": metadata_result['data'],
                "sync_time": datetime.now().isoformat(),
                "version": "1.0",
                "message": "元数据同步成功"
            }
            
        except Exception as e:
            logger.exception(f"同步元数据失败: {e}")
            # 更新同步历史为失败
            MetadataService._update_sync_history(
                sync_history_id, 'failed',
                int((datetime.now() - sync_start_time).total_seconds()),
                0, 0, str(e)
            )
            
            return {
                "success": False,
                "message": f"同步元数据失败: {str(e)}",
                "data": None,
                "sync_time": None,
                "version": None
            }
    
    @staticmethod
    def _sync_mysql_metadata(datasource: DataSource) -> Dict[str, Any]:
        """同步MySQL数据源元数据"""
        try:
            import pymysql
            
            connection = pymysql.connect(
                host=datasource.host,
                port=datasource.port,
                user=datasource.username,
                password=datasource.password,
                database=datasource.database,
                charset='utf8mb4'
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
                tables = MetadataService._get_mysql_tables_metadata(cursor, datasource.database)
            
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
            
            return {
                'success': True,
                'data': database_metadata,
                'message': 'MySQL元数据同步成功'
            }
            
        except Exception as e:
            logger.exception(f"同步MySQL元数据失败: {e}")
            return {
                'success': False,
                'data': None,
                'message': f"同步MySQL元数据失败: {str(e)}"
            }
    
    @staticmethod
    def _get_mysql_tables_metadata(cursor, database_name: str) -> List[Dict[str, Any]]:
        """获取MySQL表的详细元数据"""
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
                columns = MetadataService._get_mysql_columns(cursor, database_name, table_name)
                
                # 获取索引信息
                indexes = MetadataService._get_mysql_indexes(cursor, database_name, table_name)
                
                # 获取约束信息
                constraints = MetadataService._get_mysql_constraints(cursor, database_name, table_name)
                
                table_metadata = {
                    'name': table_name,
                    'schema': database_name,
                    'type': table_type,
                    'comment': table_info[2],
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
            logger.exception(f"获取MySQL表元数据失败: {e}")
        
        return tables
    
    @staticmethod
    def _get_mysql_columns(cursor, database_name: str, table_name: str) -> List[Dict[str, Any]]:
        """获取MySQL表的列信息"""
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
                'name': col[0],
                'type': col[1],
                'null': col[2] == 'YES',
                'key': col[3] if col[3] else None,
                'default': col[4],
                'extra': col[5],
                'length': col[6],
                'precision': col[7],
                'scale': col[8],
                'comment': col[9]
            }
            columns.append(column_data)
        
        return columns
    
    @staticmethod
    def _get_mysql_indexes(cursor, database_name: str, table_name: str) -> List[Dict[str, Any]]:
        """获取MySQL表的索引信息"""
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
                    'name': index_name,
                    'type': index_type,
                    'columns': [],
                    'unique': row[2] == 0,
                    'comment': row[4]
                }
            
            indexes_dict[index_name]['columns'].append(row[1])
        
        return list(indexes_dict.values())
    
    @staticmethod
    def _get_mysql_constraints(cursor, database_name: str, table_name: str) -> List[Dict[str, Any]]:
        """获取MySQL表的约束信息"""
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
                        'name': constraint_name,
                        'type': 'foreign_key',
                        'columns': [],
                        'referenced_table': row[2],
                        'referenced_columns': []
                    }
                
                fk_constraints[constraint_name]['columns'].append(row[1])
                fk_constraints[constraint_name]['referenced_columns'].append(row[3])
            
            constraints.extend(list(fk_constraints.values()))
            
            # 获取检查约束（MySQL 8.0+）
            try:
                cursor.execute("""
                    SELECT 
                        constraint_name,
                        check_clause
                    FROM information_schema.check_constraints
                    WHERE constraint_schema = %s 
                        AND constraint_name IN (
                            SELECT constraint_name 
                            FROM information_schema.table_constraints 
                            WHERE table_schema = %s AND table_name = %s
                            AND constraint_type = 'CHECK'
                        )
                """, (database_name, database_name, table_name))
                
                for row in cursor.fetchall():
                    constraints.append({
                        'name': row[0],
                        'type': 'check',
                        'columns': [],  # 检查约束可能涉及多列或表达式
                        'comment': row[1]
                    })
            except Exception:
                # MySQL版本不支持检查约束，忽略
                pass
                
        except Exception as e:
            logger.exception(f"获取MySQL约束信息失败: {e}")
        
        return constraints
    
    @staticmethod
    def _sync_oracle_metadata(datasource: DataSource) -> Dict[str, Any]:
        """同步Oracle数据源元数据"""
        # Oracle元数据同步的实现
        # 由于Oracle比较复杂，这里提供基本框架
        return {
            'success': False,
            'data': None,
            'message': 'Oracle元数据同步功能待实现'
        }
    
    @staticmethod
    def _save_metadata_to_db(datasource_id: str, metadata: Dict[str, Any]) -> str:
        """将元数据保存到数据库"""
        try:
            metadata_id = str(uuid.uuid4())
            
            # 保存数据源元数据主记录
            metadata_sql = """
            INSERT INTO datasource_metadata (
                id, datasource_id, database_name, charset, collation,
                size_mb, tables_count, views_count, version, metadata_json
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                database_name = VALUES(database_name),
                charset = VALUES(charset),
                collation = VALUES(collation),
                size_mb = VALUES(size_mb),
                tables_count = VALUES(tables_count),
                views_count = VALUES(views_count),
                sync_time = CURRENT_TIMESTAMP,
                version = VALUES(version),
                metadata_json = VALUES(metadata_json)
            """
            
            # 先删除旧的元数据记录
            db_connection.ExecuteUpdate(
                "DELETE FROM datasource_metadata WHERE datasource_id = %s",
                (datasource_id,)
            )
            
            db_connection.ExecuteInsert(metadata_sql, (
                metadata_id,
                datasource_id,
                metadata['database_name'],
                metadata.get('charset'),
                metadata.get('collation'),
                metadata['size_mb'],
                metadata['tables_count'],
                metadata['views_count'],
                '1.0',
                json.dumps(metadata)
            ))
            
            # 保存表元数据
            for table in metadata['tables']:
                table_id = str(uuid.uuid4())
                table_sql = """
                INSERT INTO table_metadata (
                    id, datasource_id, metadata_id, table_name, schema_name,
                    table_type, comment, rows_count, size_mb, created_at,
                    columns_json, indexes_json, constraints_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                created_at = None
                if table.get('created_at'):
                    try:
                        created_at = datetime.fromisoformat(table['created_at'].replace('Z', '+00:00'))
                    except:
                        created_at = None
                
                db_connection.ExecuteInsert(table_sql, (
                    table_id,
                    datasource_id,
                    metadata_id,
                    table['name'],
                    table.get('schema'),
                    table['type'],
                    table.get('comment'),
                    table['rows_count'],
                    table['size_mb'],
                    created_at,
                    json.dumps(table['columns']),
                    json.dumps(table['indexes']),
                    json.dumps(table['constraints'])
                ))
            
            return metadata_id
            
        except Exception as e:
            logger.exception(f"保存元数据到数据库失败: {e}")
            raise
    
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