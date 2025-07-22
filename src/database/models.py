# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

"""
数据库模型类
定义知识库和文件文档的数据操作
"""

import uuid
import json
from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from .connection import db_connection


class KnowledgeBase:
    """知识库模型类"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.name = kwargs.get('name', '')
        self.description = kwargs.get('description', '')
        self.created_at = kwargs.get('created_at', datetime.now().isoformat())
        self.updated_at = kwargs.get('updated_at', datetime.now().isoformat())
        self.file_count = kwargs.get('file_count', 0)
        self.vector_count = kwargs.get('vector_count', 0)
        self.status = kwargs.get('status', 'active')
        self.embedding_model = kwargs.get('embedding_model', 'text-embedding-3-small')
        self.chunk_size = kwargs.get('chunk_size', 1000)
        self.chunk_overlap = kwargs.get('chunk_overlap', 200)
    
    @classmethod
    def Create(cls, name: str, description: str = "", embedding_model: str = "text-embedding-3-small", 
               chunk_size: int = 1000, chunk_overlap: int = 200) -> 'KnowledgeBase':
        """创建新的知识库"""
        kb = cls(
            name=name,
            description=description,
            embedding_model=embedding_model,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        
        sql = """
        INSERT INTO knowledge_bases (id, name, description, embedding_model, chunk_size, chunk_overlap)
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        db_connection.ExecuteInsert(sql, (kb.id, kb.name, kb.description, kb.embedding_model, kb.chunk_size, kb.chunk_overlap))
        return kb
    
    @classmethod
    def GetById(cls, kb_id: str) -> Optional['KnowledgeBase']:
        """根据ID获取知识库"""
        sql = "SELECT * FROM knowledge_bases WHERE id = %s"
        result = db_connection.ExecuteQuery(sql, (kb_id,))
        if result:
            return cls(**result[0])
        return None
    
    @classmethod
    def GetAll(cls) -> List['KnowledgeBase']:
        """获取所有知识库"""
        sql = "SELECT * FROM knowledge_bases ORDER BY created_at DESC"
        results = db_connection.ExecuteQuery(sql)
        return [cls(**row) for row in results]
    
    @classmethod
    def GetByStatus(cls, status: str) -> List['KnowledgeBase']:
        """根据状态获取知识库"""
        sql = "SELECT * FROM knowledge_bases WHERE status = %s ORDER BY created_at DESC"
        results = db_connection.ExecuteQuery(sql, (status,))
        return [cls(**row) for row in results]
    
    def Update(self, **kwargs) -> bool:
        """更新知识库信息"""
        update_fields = []
        params = []
        
        for field, value in kwargs.items():
            if hasattr(self, field) and field != 'id':
                update_fields.append(f"{field} = %s")
                params.append(value)
                setattr(self, field, value)
        
        if not update_fields:
            return False
        
        params.append(self.id)
        sql = f"UPDATE knowledge_bases SET {', '.join(update_fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s"
        return db_connection.ExecuteUpdate(sql, tuple(params)) > 0
    
    def Delete(self) -> bool:
        """删除知识库"""
        sql = "DELETE FROM knowledge_bases WHERE id = %s"
        return db_connection.ExecuteUpdate(sql, (self.id,)) > 0
    
    def UpdateFileCount(self) -> bool:
        """更新文件数量"""
        sql = """
        UPDATE knowledge_bases 
        SET file_count = (SELECT COUNT(*) FROM file_documents WHERE knowledge_base_id = %s),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        result = db_connection.ExecuteUpdate(sql, (self.id, self.id)) > 0
        if result:
            # 重新获取文件数量
            sql = "SELECT file_count FROM knowledge_bases WHERE id = %s"
            result = db_connection.ExecuteQuery(sql, (self.id,))
            if result:
                self.file_count = result[0]['file_count']
        return result
    
    def UpdateVectorCount(self) -> bool:
        """更新向量数量"""
        sql = """
        UPDATE knowledge_bases 
        SET vector_count = (SELECT COALESCE(SUM(vector_count), 0) FROM file_documents WHERE knowledge_base_id = %s),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        result = db_connection.ExecuteUpdate(sql, (self.id, self.id)) > 0
        if result:
            # 重新获取向量数量
            sql = "SELECT vector_count FROM knowledge_bases WHERE id = %s"
            result = db_connection.ExecuteQuery(sql, (self.id,))
            if result:
                self.vector_count = result[0]['vector_count']
        return result
    
    def ToDict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'file_count': self.file_count,
            'vector_count': self.vector_count,
            'status': self.status,
            'embedding_model': self.embedding_model,
            'chunk_size': self.chunk_size,
            'chunk_overlap': self.chunk_overlap
        }


class FileDocument:
    """文件文档模型类"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.name = kwargs.get('name', '')
        self.type = kwargs.get('type', '')
        self.size = kwargs.get('size', 0)
        self.uploaded_at = kwargs.get('uploaded_at', datetime.now().isoformat())
        self.status = kwargs.get('status', 'uploaded')
        self.knowledge_base_id = kwargs.get('knowledge_base_id', '')
        self.vector_count = kwargs.get('vector_count', 0)
        self.last_vectorized_at = kwargs.get('last_vectorized_at')
        self.error_message = kwargs.get('error_message')
        self.file_path = kwargs.get('file_path', '')
        self.suffix = kwargs.get('suffix', '')
        self.metadata = kwargs.get('metadata', {})
    
    @classmethod
    def Create(cls, name: str, file_type: str, size: int, knowledge_base_id: str, 
               file_path: str, suffix: Optional[str] = None, metadata: Optional[Dict] = None) -> 'FileDocument':
        """创建新的文件文档"""
        # 如果没有提供suffix，从文件名中提取
        if suffix is None:
            import os
            suffix = os.path.splitext(name)[1].lower()
        
        doc = cls(
            name=name,
            type=file_type,
            size=size,
            knowledge_base_id=knowledge_base_id,
            file_path=file_path,
            suffix=suffix,
            metadata=metadata or {}
        )
        
        sql = """
        INSERT INTO file_documents (id, name, type, size, knowledge_base_id, file_path, suffix, metadata)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        db_connection.ExecuteInsert(sql, (
            doc.id, doc.name, doc.type, doc.size, doc.knowledge_base_id, 
            doc.file_path, doc.suffix, json.dumps(doc.metadata)
        ))
        
        # 更新知识库的文件数量
        kb = KnowledgeBase.GetById(knowledge_base_id)
        if kb:
            kb.UpdateFileCount()
        
        return doc
    
    @classmethod
    def GetById(cls, doc_id: str) -> Optional['FileDocument']:
        """根据ID获取文件文档"""
        sql = "SELECT * FROM file_documents WHERE id = %s"
        result = db_connection.ExecuteQuery(sql, (doc_id,))
        if result:
            row = result[0]
            if row.get('metadata'):
                row['metadata'] = json.loads(row['metadata'])
            return cls(**row)
        return None
    
    @classmethod
    def GetByKnowledgeBase(cls, knowledge_base_id: str, limit: int = 100, offset: int = 0) -> List['FileDocument']:
        """根据知识库ID获取文件文档"""
        sql = """
        SELECT * FROM file_documents 
        WHERE knowledge_base_id = %s 
        ORDER BY uploaded_at DESC 
        LIMIT %s OFFSET %s
        """
        results = db_connection.ExecuteQuery(sql, (knowledge_base_id, limit, offset))
        documents = []
        for row in results:
            if row.get('metadata'):
                row['metadata'] = json.loads(row['metadata'])
            documents.append(cls(**row))
        return documents
    
    @classmethod
    def GetAll(cls, limit: int = 100, offset: int = 0, status: Optional[str] = None, 
               file_type: Optional[str] = None, search: Optional[str] = None,
               sort_by: str = "uploaded_at", sort_order: str = "desc", knowledge_base_id: Optional[str] = None,
               file_ids: Optional[List[str]] = None) -> List['FileDocument']:
        """获取所有文件文档，支持筛选"""
        conditions = []
        params = []
        
        if knowledge_base_id:
            conditions.append("knowledge_base_id = %s")
            params.append(knowledge_base_id)
        if status:
            conditions.append("status = %s")
            params.append(status)
        if file_type:
            conditions.append("type LIKE %s")
            params.append(f"%{file_type}%")
        if search:
            conditions.append("name LIKE %s")
            params.append(f"%{search}%")
        if file_ids and len(file_ids) > 0:
            placeholders = ", ".join(["%s"] * len(file_ids))
            conditions.append(f"id IN ({placeholders})")
            params.extend(file_ids)
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        allowed_sort_fields = ["uploaded_at", "name", "size", "vector_count", "status"]
        if sort_by not in allowed_sort_fields:
            sort_by = "uploaded_at"
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        
        sql = f"""
        SELECT * FROM file_documents 
        WHERE {where_clause}
        ORDER BY {sort_by} {sort_order.upper()}
        LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        results = db_connection.ExecuteQuery(sql, tuple(params))
        documents = []
        for row in results:
            if row.get('metadata'):
                row['metadata'] = json.loads(row['metadata'])
            documents.append(cls(**row))
        return documents
    
    def Update(self, **kwargs) -> bool:
        """更新文件文档信息"""
        update_fields = []
        params = []
        
        for field, value in kwargs.items():
            if hasattr(self, field) and field != 'id':
                if field == 'metadata' and isinstance(value, dict):
                    value = json.dumps(value)
                update_fields.append(f"{field} = %s")
                params.append(value)
                setattr(self, field, value)
        
        if not update_fields:
            return False
        
        params.append(self.id)
        sql = f"UPDATE file_documents SET {', '.join(update_fields)} WHERE id = %s"
        return db_connection.ExecuteUpdate(sql, tuple(params)) > 0
    
    def Delete(self) -> bool:
        """删除文件文档"""
        sql = "DELETE FROM file_documents WHERE id = %s"
        result = db_connection.ExecuteUpdate(sql, (self.id,)) > 0
        
        if result:
            # 更新知识库的文件数量和向量数量
            kb = KnowledgeBase.GetById(self.knowledge_base_id)
            if kb:
                kb.UpdateFileCount()
                kb.UpdateVectorCount()
        
        return result
    
    def UpdateStatus(self, status: str, error_message: Optional[str] = None) -> bool:
        """更新文件状态"""
        self.status = status
        if error_message:
            self.error_message = error_message
        
        sql = "UPDATE file_documents SET status = %s, error_message = %s WHERE id = %s"
        return db_connection.ExecuteUpdate(sql, (status, error_message, self.id)) > 0
    
    def UpdateVectorization(self, vector_count: int) -> bool:
        """更新向量化信息"""
        self.vector_count = vector_count
        self.last_vectorized_at = datetime.now().isoformat()
        self.status = 'vectorized'
        
        sql = """
        UPDATE file_documents 
        SET vector_count = %s, last_vectorized_at = CURRENT_TIMESTAMP, status = 'vectorized', error_message = NULL
        WHERE id = %s
        """
        result = db_connection.ExecuteUpdate(sql, (vector_count, self.id)) > 0
        
        if result:
            # 更新知识库的向量数量
            kb = KnowledgeBase.GetById(self.knowledge_base_id)
            if kb:
                kb.UpdateVectorCount()
        
        return result
    
    def ToDict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'size': self.size,
            'uploaded_at': self.uploaded_at,
            'status': self.status,
            'knowledge_base_id': self.knowledge_base_id,
            'vector_count': self.vector_count,
            'last_vectorized_at': self.last_vectorized_at,
            'error_message': self.error_message,
            'file_path': self.file_path,
            'suffix': self.suffix,
            'metadata': self.metadata
        } 


class FileExploration:
    """数据探索临时文件模型类"""
    
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', str(uuid.uuid4()))
        self.name = kwargs.get('name', '')
        self.type = kwargs.get('type', '')  # 文件类型，如csv, excel, json等
        self.size = kwargs.get('size', 0)  # 文件大小，以字节为单位
        self.user_id = kwargs.get('user_id', '')  # 上传用户ID
        self.created_at = kwargs.get('created_at', datetime.now().isoformat())
        self.updated_at = kwargs.get('updated_at', datetime.now().isoformat())
        self.file_path = kwargs.get('file_path', '')  # 文件存储路径
        self.status = kwargs.get('status', 'active')  # 文件状态：active, deleted
        self.suffix = kwargs.get('suffix', '')  # 文件扩展名
        self.metadata = kwargs.get('metadata', {})  # 元数据，如列名、数据类型等
        self.preview_data = kwargs.get('preview_data', {})  # 预览数据，存储JSON格式的数据样本
        self.data_insights = kwargs.get('data_insights', {})  # 数据洞察，存储AI生成的分析结果
        self.last_accessed_at = kwargs.get('last_accessed_at')  # 最后访问时间
    
    @classmethod
    def Create(cls, name: str, file_type: str, size: int, user_id: str, file_path: str, 
               suffix: Optional[str] = None, metadata: Optional[Dict] = None,
               preview_data: Optional[Union[List, Dict]] = None) -> 'FileExploration':
        """创建新的数据探索文件"""
        # 如果没有提供suffix，从文件名中提取
        if suffix is None:
            import os
            suffix = os.path.splitext(name)[1].lower()
        
        file = cls(
            name=name,
            type=file_type,
            size=size,
            user_id=user_id,
            file_path=file_path,
            suffix=suffix,
            metadata=metadata or {},
            preview_data=preview_data or []
        )
        
        # 将preview_data转换为有效的JSON
        preview_data_json = json.dumps(file.preview_data if file.preview_data else [])
        
        sql = """
        INSERT INTO file_exploration (id, name, type, size, user_id, file_path, suffix, metadata, preview_data)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        db_connection.ExecuteInsert(sql, (
            file.id, file.name, file.type, file.size, file.user_id, 
            file.file_path, file.suffix, json.dumps(file.metadata), 
            preview_data_json
        ))
        
        return file
    
    @classmethod
    def GetById(cls, file_id: str) -> Optional['FileExploration']:
        """根据ID获取文件"""
        sql = "SELECT * FROM file_exploration WHERE id = %s"
        result = db_connection.ExecuteQuery(sql, (file_id,))
        if result:
            row = result[0]
            # 解析JSON字段
            if row.get('metadata'):
                try:
                    row['metadata'] = json.loads(row['metadata'])
                except json.JSONDecodeError:
                    row['metadata'] = {}
            if row.get('preview_data'):
                try:
                    row['preview_data'] = json.loads(row['preview_data'])
                except json.JSONDecodeError:
                    row['preview_data'] = []
            if row.get('data_insights'):
                try:
                    row['data_insights'] = json.loads(row['data_insights'])
                except json.JSONDecodeError:
                    row['data_insights'] = {}
            
            # 更新最后访问时间
            cls.UpdateLastAccessed(file_id)
            return cls(**row)
        return None
    
    @classmethod
    def GetByUserId(cls, user_id: str, limit: int = 100, offset: int = 0, 
                    file_type: Optional[str] = None, search: Optional[str] = None,
                    sort_by: str = "updated_at", sort_order: str = "desc") -> List['FileExploration']:
        """根据用户ID获取文件列表"""
        conditions = ["user_id = %s", "status = 'active'"]
        params = [user_id]
        
        if file_type:
            conditions.append("type LIKE %s")
            params.append(f"%{file_type}%")
        if search:
            conditions.append("name LIKE %s")
            params.append(f"%{search}%")
        
        where_clause = " AND ".join(conditions)
        
        allowed_sort_fields = ["created_at", "updated_at", "name", "size", "last_accessed_at"]
        if sort_by not in allowed_sort_fields:
            sort_by = "updated_at"
        if sort_order not in ["asc", "desc"]:
            sort_order = "desc"
        
        sql = f"""
        SELECT * FROM file_exploration 
        WHERE {where_clause}
        ORDER BY {sort_by} {sort_order.upper()}
        LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        results = db_connection.ExecuteQuery(sql, tuple(params))
        files = []
        for row in results:
            # 解析JSON字段
            if row.get('metadata'):
                try:
                    row['metadata'] = json.loads(row['metadata'])
                except json.JSONDecodeError:
                    row['metadata'] = {}
            if row.get('preview_data'):
                try:
                    row['preview_data'] = json.loads(row['preview_data'])
                except json.JSONDecodeError:
                    row['preview_data'] = []
            if row.get('data_insights'):
                try:
                    row['data_insights'] = json.loads(row['data_insights'])
                except json.JSONDecodeError:
                    row['data_insights'] = {}
            
            files.append(cls(**row))
        return files
    
    @classmethod
    def Count(cls, user_id: Optional[str] = None, file_type: Optional[str] = None, 
              search: Optional[str] = None) -> int:
        """获取文件总数"""
        conditions = ["status = 'active'"]
        params = []
        
        if user_id:
            conditions.append("user_id = %s")
            params.append(user_id)
        if file_type:
            conditions.append("type LIKE %s")
            params.append(f"%{file_type}%")
        if search:
            conditions.append("name LIKE %s")
            params.append(f"%{search}%")
        
        where_clause = " AND ".join(conditions)
        
        sql = f"SELECT COUNT(*) as count FROM file_exploration WHERE {where_clause}"
        result = db_connection.ExecuteQuery(sql, tuple(params))
        return result[0]['count'] if result else 0
    
    @classmethod
    def UpdateLastAccessed(cls, file_id: str) -> bool:
        """更新最后访问时间"""
        sql = """
        UPDATE file_exploration 
        SET last_accessed_at = CURRENT_TIMESTAMP 
        WHERE id = %s
        """
        return db_connection.ExecuteUpdate(sql, (file_id,)) > 0
    
    def Update(self, **kwargs) -> bool:
        """更新文件信息"""
        update_fields = []
        params = []
        
        for field, value in kwargs.items():
            if hasattr(self, field) and field != 'id':
                if field in ['metadata', 'preview_data', 'data_insights'] and isinstance(value, dict):
                    value = json.dumps(value)
                update_fields.append(f"{field} = %s")
                params.append(value)
                setattr(self, field, value)
        
        if not update_fields:
            return False
        
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        params.append(self.id)
        sql = f"UPDATE file_exploration SET {', '.join(update_fields)} WHERE id = %s"
        return db_connection.ExecuteUpdate(sql, tuple(params)) > 0
    
    def UpdateInsights(self, insights: Dict) -> bool:
        """更新数据洞察信息"""
        self.data_insights = insights
        
        sql = """
        UPDATE file_exploration 
        SET data_insights = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        return db_connection.ExecuteUpdate(sql, (json.dumps(insights), self.id)) > 0
    
    def UpdatePreviewData(self, preview_data: Union[List, Dict]) -> bool:
        """更新预览数据"""
        self.preview_data = preview_data
        
        sql = """
        UPDATE file_exploration 
        SET preview_data = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        return db_connection.ExecuteUpdate(sql, (json.dumps(preview_data), self.id)) > 0
    
    def Delete(self) -> bool:
        """删除文件（标记为已删除）"""
        self.status = "deleted"
        
        sql = """
        UPDATE file_exploration 
        SET status = 'deleted', updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
        """
        return db_connection.ExecuteUpdate(sql, (self.id,)) > 0
    
    def PermanentDelete(self) -> bool:
        """永久删除文件"""
        sql = "DELETE FROM file_exploration WHERE id = %s"
        return db_connection.ExecuteUpdate(sql, (self.id,)) > 0
    
    def ToDict(self) -> Dict[str, Any]:
        """转换为字典"""
        # 确保日期时间字段转换为字符串格式
        created_at = self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at
        updated_at = self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at
        last_accessed_at = self.last_accessed_at.isoformat() if isinstance(self.last_accessed_at, datetime) else self.last_accessed_at
        
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'size': self.size,
            'user_id': self.user_id,
            'created_at': created_at,
            'updated_at': updated_at,
            'file_path': self.file_path,
            'status': self.status,
            'suffix': self.suffix,
            'metadata': self.metadata,
            'preview_data': self.preview_data,
            'data_insights': self.data_insights,
            'last_accessed_at': last_accessed_at
        } 