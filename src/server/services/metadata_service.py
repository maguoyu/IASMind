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
    def get_database_metadata(datasource_id: str, use_cache: bool = False, optimize_for_chatbi: bool = False, include_sample_data: bool = False) -> Dict[str, Any]:
        """
        获取数据源的完整元数据
        
        Args:
            datasource_id: 数据源ID
            use_cache: 是否使用缓存数据（默认False，直接从数据源实时查询）
            optimize_for_chatbi: 是否为ChatBI优化元数据格式（默认False）
            include_sample_data: 是否包含样本数据（仅在optimize_for_chatbi=True时生效）
            
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
                
                # 如果需要为ChatBI优化，则进行元数据格式优化
                if optimize_for_chatbi:
                    logger.info(f"为ChatBI优化数据源 {datasource_id} 的元数据格式")
                    metadata_result = MetadataService.optimize_metadata_for_chatbi(metadata_result, datasource, include_sample_data)
            
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
    def optimize_metadata_for_chatbi(metadata_result: Dict[str, Any], datasource: DataSource = None, include_sample_data: bool = False) -> Dict[str, Any]:
        """
        为ChatBI优化元数据格式，移除冗余信息，突出SQL生成相关的关键信息
        
        Args:
            metadata_result: 原始元数据结果
            datasource: 数据源对象（获取样本数据时需要）
            include_sample_data: 是否包含样本数据
            
        Returns:
            优化后的元数据格式
        """
        if not metadata_result.get('success') or not metadata_result.get('data'):
            return metadata_result
            
        try:
            original_data = metadata_result['data']
            optimized_tables = []
            
            for table in original_data.get('tables', []):
                # 提取关键列信息
                essential_columns = []
                for col in table.get('columns', []):
                    column_info = {
                        'name': col['column_name'],
                        'type': MetadataService._normalize_data_type(col['data_type']),
                        'comment': col.get('column_comment', '').strip() or col['column_name'],
                        'nullable': col['is_nullable'] == 'YES',
                    }
                    
                    # 添加关键约束信息
                    if col.get('column_key'):
                        if col['column_key'] == 'PRI':
                            column_info['is_primary'] = True
                        elif col['column_key'] == 'UNI':
                            column_info['is_unique'] = True
                        elif col['column_key'] == 'MUL':
                            column_info['has_index'] = True
                    
                    # 添加默认值（如果有意义）
                    if col.get('column_default') is not None:
                        column_info['default'] = col['column_default']
                    
                    essential_columns.append(column_info)
                
                # 提取关键索引信息（仅主键和唯一索引）
                key_indexes = []
                for idx in table.get('indexes', []):
                    if idx['index_type'] in ['primary', 'unique']:
                        key_indexes.append({
                            'name': idx['index_name'],
                            'type': idx['index_type'],
                            'columns': idx['columns']
                        })
                
                # 提取外键关系
                foreign_keys = []
                for constraint in table.get('constraints', []):
                    if constraint.get('constraint_type') == 'foreign_key':
                        foreign_keys.append({
                            'columns': constraint['columns'],
                            'references': {
                                'table': constraint['referenced_table'],
                                'columns': constraint['referenced_columns']
                            }
                        })
                
                # 构建优化的表信息
                optimized_table = {
                    'table_name': table['table_name'],
                    'comment': table.get('table_comment', '').strip() or table['table_name'],
                    'type': table.get('type', 'table'),
                    'columns': essential_columns
                }
                
                # 只在有关键索引时才添加
                if key_indexes:
                    optimized_table['key_indexes'] = key_indexes
                
                # 只在有外键时才添加
                if foreign_keys:
                    optimized_table['foreign_keys'] = foreign_keys
                
                # 添加表级别的SQL提示
                sql_hints = MetadataService._generate_table_sql_hints(table, essential_columns)
                if sql_hints:
                    optimized_table['sql_hints'] = sql_hints
                
                # 如果需要样本数据且提供了数据源对象
                if include_sample_data and datasource:
                    sample_data = MetadataService._get_table_sample_data(datasource, table['table_name'])
                    if sample_data:
                        optimized_table['sample_data'] = sample_data
                
                optimized_tables.append(optimized_table)
            
            # 构建优化的数据库信息
            optimized_data = {
                'database': original_data.get('database_name', ''),
                'tables': optimized_tables,
                'table_count': len(optimized_tables)
            }
            
            # 添加表间关系摘要
            relationships = MetadataService._extract_table_relationships(optimized_tables)
            if relationships:
                optimized_data['relationships'] = relationships
            
            return {
                'success': True,
                'data': optimized_data,
                'message': f'已优化元数据，包含 {len(optimized_tables)} 个表',
                'version': 'chatbi_optimized',
                'sync_time': metadata_result.get('sync_time')
            }
            
        except Exception as e:
            logger.exception(f"元数据优化失败: {e}")
            return {
                'success': False,
                'message': f"元数据优化失败: {str(e)}",
                'data': None
            }
    
    @staticmethod
    def _normalize_data_type(data_type: str) -> str:
        """标准化数据类型名称，便于SQL生成"""
        data_type = data_type.lower()
        
        # 字符串类型
        if data_type in ['varchar', 'char', 'text', 'longtext', 'mediumtext']:
            return 'string'
        
        # 数值类型
        if data_type in ['int', 'integer', 'bigint', 'smallint', 'tinyint']:
            return 'integer'
        if data_type in ['decimal', 'numeric', 'float', 'double']:
            return 'number'
        
        # 日期时间类型
        if data_type in ['datetime', 'timestamp']:
            return 'datetime'
        if data_type == 'date':
            return 'date'
        if data_type == 'time':
            return 'time'
        
        # 布尔类型
        if data_type in ['boolean', 'bool', 'tinyint(1)']:
            return 'boolean'
        
        # 其他类型保持原样
        return data_type
    
    @staticmethod
    def _generate_table_sql_hints(table: Dict[str, Any], columns: List[Dict[str, Any]]) -> List[str]:
        """为表生成SQL使用提示"""
        hints = []
        table_name = table.get('table_name', '')
        table_comment = table.get('table_comment', '')
        
        # 基于表名和注释生成用途提示
        if '航班' in table_name or '航班' in table_comment:
            hints.append("航班信息查询：flight表包含航班基本信息、时间、状态等")
        
        # 基于列分析生成查询提示
        column_names = [col['name'] for col in columns]
        
        # 时间相关查询提示
        time_columns = [col['name'] for col in columns if 'time' in col['type'] or any(keyword in col['name'].lower() for keyword in ['time', 'date', '时间', '日期'])]
        if time_columns:
            hints.append(f"时间查询字段：{', '.join(time_columns[:3])}")
        
        # 状态相关查询提示
        status_columns = [col['name'] for col in columns if any(keyword in col['name'].lower() for keyword in ['status', 'state', '状态', '类型', 'type'])]
        if status_columns:
            hints.append(f"状态筛选字段：{', '.join(status_columns[:3])}")
        
        # 关键业务字段提示
        key_columns = [col['name'] for col in columns if col.get('is_primary') or '号' in col.get('comment', '') or 'id' in col['name'].lower()]
        if key_columns:
            hints.append(f"关键标识字段：{', '.join(key_columns[:3])}")
        
        return hints
    
    @staticmethod
    def _extract_table_relationships(tables: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """提取表间关系信息"""
        relationships = []
        
        for table in tables:
            for fk in table.get('foreign_keys', []):
                relationships.append({
                    'from_table': table['name'],
                    'from_columns': fk['columns'],
                    'to_table': fk['references']['table'],
                    'to_columns': fk['references']['columns'],
                    'relationship_type': 'foreign_key'
                })
        
        return relationships
    
    @staticmethod
    def _get_table_sample_data(datasource: DataSource, table_name: str, limit: int = 2) -> Optional[List[Dict[str, Any]]]:
        """
        获取表的样本数据，用于帮助SQL生成
        
        Args:
            datasource: 数据源对象
            table_name: 表名
            limit: 样本数据条数限制（默认2条）
            
        Returns:
            样本数据列表，失败时返回None
        """
        try:
            if datasource.type == 'mysql':
                return MetadataService._get_mysql_sample_data(datasource, table_name, limit)
            elif datasource.type == 'oracle':
                return MetadataService._get_oracle_sample_data(datasource, table_name, limit)
            else:
                logger.warning(f"不支持的数据源类型获取样本数据: {datasource.type}")
                return None
                
        except Exception as e:
            logger.warning(f"获取表 {table_name} 样本数据失败: {e}")
            return None
    
    @staticmethod
    def _get_mysql_sample_data(datasource: DataSource, table_name: str, limit: int = 2) -> Optional[List[Dict[str, Any]]]:
        """获取MySQL表的样本数据"""
        try:
            import pymysql
            
            connection = pymysql.connect(
                host=datasource.host,
                port=datasource.port,
                user=datasource.username,
                password=datasource.password,
                database=datasource.database,
                charset='utf8mb4',
                connect_timeout=5,
                read_timeout=10
            )
            
            with connection.cursor() as cursor:
                # 使用LIMIT获取样本数据，避免大表导致的性能问题
                sql = f"SELECT * FROM `{table_name}` LIMIT %s"
                cursor.execute(sql, (limit,))
                
                # 获取列名
                columns = [desc[0] for desc in cursor.description]
                
                # 获取数据行
                rows = cursor.fetchall()
                
                # 转换为字典格式
                sample_data = []
                for row in rows:
                    row_dict = {}
                    for i, value in enumerate(row):
                        # 处理特殊类型的值
                        if value is None:
                            row_dict[columns[i]] = None
                        elif isinstance(value, (datetime,)):
                            row_dict[columns[i]] = value.isoformat()
                        else:
                            row_dict[columns[i]] = str(value)
                    sample_data.append(row_dict)
                
            connection.close()
            return sample_data
            
        except Exception as e:
            logger.warning(f"获取MySQL表 {table_name} 样本数据失败: {e}")
            return None
    
    @staticmethod
    def _get_oracle_sample_data(datasource: DataSource, table_name: str, limit: int = 2) -> Optional[List[Dict[str, Any]]]:
        """获取Oracle表的样本数据"""
        try:
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
                # Oracle使用ROWNUM限制行数
                sql = f"SELECT * FROM {table_name} WHERE ROWNUM <= :limit"
                cursor.execute(sql, {'limit': limit})
                
                # 获取列名
                columns = [desc[0] for desc in cursor.description]
                
                # 获取数据行
                rows = cursor.fetchall()
                
                # 转换为字典格式
                sample_data = []
                for row in rows:
                    row_dict = {}
                    for i, value in enumerate(row):
                        if value is None:
                            row_dict[columns[i]] = None
                        elif isinstance(value, (datetime,)):
                            row_dict[columns[i]] = value.isoformat()
                        else:
                            row_dict[columns[i]] = str(value)
                    sample_data.append(row_dict)
                
            connection.close()
            return sample_data
            
        except Exception as e:
            logger.warning(f"获取Oracle表 {table_name} 样本数据失败: {e}")
            return None


    

    

    

    

    

    

    

    

    

    

    
 