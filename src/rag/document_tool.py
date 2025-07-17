import logging
from tkinter.constants import N
from typing import List

import unicodedata
from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader, Docx2txtLoader, \
    UnstructuredWordDocumentLoader
from langchain_core.documents import Document
from starlette.exceptions import HTTPException
import os
from src.database.models import FileDocument
from typing import Optional

logger = logging.getLogger(__name__)
FILE_PATH = os.getenv("FILE_PATH", "uploads")

def loadDocument( file_document: FileDocument,source_dir=FILE_PATH,knowledge_base_id:Optional[str] = None) -> (str,List[Document]):
    if file_document is None:
        return []
    grob = [file_document.file_path.split("\\")[-1]]
    docs = None
    type = ""
    try:
        if file_document.suffix == ".txt":
            # 分别加载不同格式
            text_loader = DirectoryLoader(
                path=source_dir,  # 指定读取文件的父目录
                glob=grob,  # 指定读取文件的格式
                show_progress=True,  # 显示加载进度
                use_multithreading=True,  # 使用多线程
                loader_cls=TextLoader,  # 指定加载器
                loader_kwargs={"autodetect_encoding": True},  # 自动检测文件编码
            )
            docs = text_loader.load()
            type =  "txt"
        elif file_document.suffix == ".pdf":
            pdf_loader = DirectoryLoader(
                path=source_dir,
                glob=grob,
                show_progress=True,
                use_multithreading=True,
                loader_cls=PyPDFLoader,
            )
            # 初步清洗 PDF 文档的文本，删除多余空格。
            # TODO: 后续会修改，将单独优化 PDF 文档的分割。
            docs = pdf_loader.load()
            for doc in docs:
                doc.page_content = clean_text(doc.page_content)
            type =  "pdf"
        elif file_document.suffix == ".docx":
            docx_loader = DirectoryLoader(
                path=source_dir,
                glob=grob,
                show_progress=True,
                use_multithreading=True,
                loader_cls=Docx2txtLoader,
            )
            docs = docx_loader.load()
            type =  "docx"
        elif file_document.suffix == ".doc":
            doc_loader = DirectoryLoader(
                path=source_dir,
                glob=grob,
                show_progress=True,
                use_multithreading=True,
                loader_cls=UnstructuredWordDocumentLoader,
                loader_kwargs={"autodetect_encoding": True},
            )
            docs = doc_loader.load()
            type =  "doc"
        elif file_document.suffix == ".md":
            # 分别加载不同格式
            md_loader = DirectoryLoader(
                path=source_dir,  # 指定读取文件的父目录
                glob=grob,  # 指定读取文件的格式
                show_progress=True,  # 显示加载进度
                use_multithreading=True,  # 使用多线程
                loader_cls=TextLoader,  # 指定加载器
                loader_kwargs={"autodetect_encoding": True},  # 自动检测文件编码
            )
            docs = md_loader.load()
            type = "md"
        formate_metadatas(docs, str(file_document.id),knowledge_base_id,file_document.name)
        return type,docs

    except Exception as e:
        logger.error(f"加载文档失败：{str(e)}")
        raise HTTPException(status_code=500, detail=f"加载文档失败：{str(e)}")


def clean_text(text: str) -> str:
    """统一文本清洗函数"""

    cleaned = ""
    if not text.strip():
        return cleaned
    # 1. 标准化全角字符（字母、数字、标点）为半角
    normalized = unicodedata.normalize("NFKC", text)
    # 2. 删除所有空格（包括全角空格\u3000和普通空格）
    cleaned = normalized.replace("\u3000", "").replace(" ", "")
    # 3. 中文标点替换为英文标点（按需扩展）
    replacements = {
        "，": ",",
        "。": ".",
        "（": "(",
        "）": ")",
        "；": ";",
        "：": ":",
        "！": "!",
        "？": "?",
    }
    for cn, en in replacements.items():
        cleaned = cleaned.replace(cn, en)
    return cleaned
def formate_metadatas(docs,fileId:str=None ,knowledge_base_id:Optional[str] = None,file_name:Optional[str] = None):
    [formate_metadata(doc,fileId,knowledge_base_id,file_name) for doc in docs]
    
def formate_metadata(doc :Document,fileId:str=None,knowledge_base_id:Optional[str] = None,file_name:Optional[str] = None):
    doc.metadata = {k.replace("-", "_"): v for k, v in doc.metadata.items()}
    doc.metadata["file_id"] = fileId
    doc.metadata["knowledge_base_id"] = knowledge_base_id
    doc.metadata["file_name"] = file_name

