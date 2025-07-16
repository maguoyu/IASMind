import logging
import time
from typing import List, Optional

from fastapi import HTTPException
from pymilvus.milvus_client import IndexParams

from src.rag.document_tool import loadDocument
from src.rag.splitter_tool import getTextSplitter, getMdTextSplitter
from src.database.connection import db_connection
from src.database.models import FileDocument
import os
from src.rag.milvus import milvus_vector_store


logger = logging.getLogger("langchain_vector")




def delete_documentsByFileId(file_id :str):
    # 初始化  milvus 向量数据库
    vector_store = milvus_vector_store()
    expr = f'metadata["file_id"] == "{file_id}"'
    pks = vector_store.get_pks(expr=expr)
    if pks:
        vector_store.delete(ids=[str(pk) for pk in pks])



def delete_documents(ids: Optional[List[str]] = None):
    # 初始化  milvus 向量数据库
    vector_store = milvus_vector_store()
    vector_store.delete(ids=ids)

def split_documents(documents, splitter=None):
    """
    使用递归字符分割器处理文本
    参数说明：
    - chunk_size：每个文本块的最大字符数，推荐 500-1000
    - chunk_overlap：相邻块之间的重叠字符数（保持上下文连贯），推荐 100-200
    """

    if splitter is None:
        splitter = getTextSplitter()


    split_docs = splitter.split_documents(documents)
    print(f"原始文档数：{len(documents)}")
    print(f"分割后文本块数：{len(split_docs)}")

    return split_docs
def split_md_documents(documents, splitter=None):
    """
    使用递归字符分割器处理文本
    参数说明：
    - chunk_size：每个文本块的最大字符数，推荐 500-1000
    - chunk_overlap：相邻块之间的重叠字符数（保持上下文连贯），推荐 100-200
    """

    if splitter is None:
        splitter = getMdTextSplitter()

    res_docs= []
    for  document in documents:
        split_docs = splitter.split_text(document.page_content)

        for doc in split_docs:
            # 合并原始元数据（id, category）与分割产生的标题元数据
            doc.metadata.update(document.metadata)
        res_docs.extend(split_docs)
    print(f"原始文档数：{len(documents)}")
    print(f"分割后文本块数：{len(res_docs)}")

    return res_docs

def create_vector_store(split_docs,drop_old_data=False):
    """
    创建持久化向量数据库
    - split_docs: 经过分割的文档列表
    - persist_dir: 向量数据库存储路径（建议使用WSL原生路径）
    """

    # 初始化  milvus 向量数据库
    vector_store = milvus_vector_store(drop_old_data)
    #先成成集合，添加索引
    if drop_old_data:
        vector_store.add_documents([split_docs[0]])
        split_docs.pop(0)
        vector_store.client.flush(collection_name=os.getenv("DOC_COLLECTION_NAME", "rag_docs"))
        indexParam = IndexParams()
        params = {"path": "metadata.file_id", "json_cast_type": "varchar"}
        indexParam.add_index(field_name="metadata", index_type="INVERTED", params=params)
        vector_store.client.create_index(collection_name=os.getenv("DOC_COLLECTION_NAME", "rag_docs"), index_params=indexParam)
    # 向量化文档之前，先把原来集合里的数据清空
    # ids = vector_store.collection.get()["ids"]
    # vector_store.get_by_ids()
    # if len(ids):
    #     vector_store.delete(ids=vector_store.collection.get()["ids"])
    # 如果分割文档为空，不做向量化操作
    if not split_docs or len(split_docs) == 0:
        return []

    try:
        start_time = time.time()
        print(f"\n开始向量化====>")

        # 向量化文档到向量数据库
        return  vector_store.add_documents(split_docs,  batch_size=1000 )

        # print(f"\n向量化完成！耗时 {time.time()-start_time:.2f} 秒")
        # print(f"数据库存储路径：{persist_dir}")
        # print(f"总文档块数：{vector_store.}")

    except Exception as e:
        print(f"向量化失败：{str(e)}")
        raise HTTPException(status_code=500, detail=f"向量化失败：{str(e)}")



def vector_documents(drop_old_data: bool = False, file_ids: List[str] = [], knowledge_base_id: Optional[str] = None):
    """
    启动文档向量化，并保存数据库
    """

    total_files = FileDocument.GetAll(limit=10000, knowledge_base_id=knowledge_base_id, file_ids=file_ids)


    split_docs = []
    for doc in total_files:
        docs = loadDocument(doc)

        if docs[0] == "txt":
            txt_docs = docs[1]
            split_docs.extend(split_documents(txt_docs))
        elif docs[0] == "md":
            md_docs = docs[1]
            split_docs.extend(split_md_documents(md_docs))
        elif docs[0] == "pdf":
            pdf_docs = docs[1]
            split_docs.extend(split_documents(pdf_docs))
        elif docs[0] == "docx":
            docx_docs = docs[1]
            split_docs.extend(split_documents(docx_docs))
        elif docs[0] == "doc":
            doc_docs = docs[1]
            split_docs.extend(split_documents(doc_docs))
        else:
            pass


   # 执行向量化（使用之前分割好的split_docs）
    return create_vector_store(split_docs,drop_old_data=drop_old_data)



