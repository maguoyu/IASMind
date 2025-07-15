import logging
from typing import List

import unicodedata
from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader, Docx2txtLoader, \
    UnstructuredWordDocumentLoader
from langchain_core.documents import Document
from starlette.exceptions import HTTPException
import os
from src.database.models import FileDocument


logger = logging.getLogger(__name__)
FILE_PATH = os.getenv("FILE_PATH", "uploads")

def loadDocument( file_document: FileDocument,source_dir=FILE_PATH) -> (str,List[Document]):
    if file_document is None:
        return []
    txt_grob = []
    pdf_grob=[]
    md_grob = []
    docx_grob = []
    doc_grob = []
    try:
        if file_document.type == "txt":
            txt_grob.append(file_document.name)
            # 分别加载不同格式
            text_loader = DirectoryLoader(
                path=source_dir,  # 指定读取文件的父目录
                glob=txt_grob,  # 指定读取文件的格式
                show_progress=True,  # 显示加载进度
                use_multithreading=True,  # 使用多线程
                loader_cls=TextLoader,  # 指定加载器
                loader_kwargs={"autodetect_encoding": True},  # 自动检测文件编码
            )
            text_docs = text_loader.load()
            formate_metadatas(text_docs, str(file_document.id))
            return "txt",text_docs
        elif file_document.type == "pdf":
            pdf_grob.append(file_document.name)
            pdf_loader = DirectoryLoader(
                path=source_dir,
                glob=pdf_grob,
                show_progress=True,
                use_multithreading=True,
                loader_cls=PyPDFLoader,
            )
            # 初步清洗 PDF 文档的文本，删除多余空格。
            # TODO: 后续会修改，将单独优化 PDF 文档的分割。
            pdf_docs = pdf_loader.load()
            for doc in pdf_docs:
                doc.page_content = clean_text(doc.page_content)
            formate_metadatas(pdf_docs, str(file_document.id))
            return "pdf",pdf_docs
        elif file_document.type == "docx":
            docx_grob.append(file_document.name)
            docx_loader = DirectoryLoader(
                path=source_dir,
                glob=docx_grob,
                show_progress=True,
                use_multithreading=True,
                loader_cls=Docx2txtLoader,
            )
            docx_docs = docx_loader.load()
            formate_metadatas(docx_docs, str(file_document.id))
            return "docx",docx_docs
        elif file_document.type == "doc":
            doc_grob.append(file_document.name)
            doc_loader = DirectoryLoader(
                path=source_dir,
                glob=doc_grob,
                show_progress=True,
                use_multithreading=True,
                loader_cls=UnstructuredWordDocumentLoader,
                loader_kwargs={"autodetect_encoding": True},
            )
            doc_docs = doc_loader.load()
            formate_metadatas(doc_docs, str(file_document.id))
            return "doc",doc_docs
        elif file_document.type == "md":
            md_grob.append(file_document.name)
            # 分别加载不同格式
            md_loader = DirectoryLoader(
                path=source_dir,  # 指定读取文件的父目录
                glob=md_grob,  # 指定读取文件的格式
                show_progress=True,  # 显示加载进度
                use_multithreading=True,  # 使用多线程
                loader_cls=TextLoader,  # 指定加载器
                loader_kwargs={"autodetect_encoding": True},  # 自动检测文件编码
            )
            md_docs = md_loader.load()
            formate_metadatas(md_docs, str(file_document.id))
            return "md",md_docs
        return "",[]

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
def formate_metadatas(docs,fileId:str=None ):
    [formate_metadata(doc,fileId) for doc in docs]
def formate_metadata(doc :Document,fileId:str=None):
    doc.metadata = {k.replace("-", "_"): v for k, v in doc.metadata.items()}
    doc.metadata["file_id"] = fileId

