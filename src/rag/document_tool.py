import logging
from typing import List
import tempfile
import unicodedata
from langchain_community.document_loaders import TextLoader, PyPDFLoader, Docx2txtLoader, \
    UnstructuredWordDocumentLoader
from langchain_core.documents import Document
from starlette.exceptions import HTTPException
import os
from src.database.models import FileDocument
from typing import Optional
from src.server.file_service import file_service

logger = logging.getLogger(__name__)

def loadDocument(file_document: FileDocument, source_dir=None, knowledge_base_id: Optional[str] = None) -> (str, List[Document]):
    """
    从MinIO加载文档
    
    参数:
    - file_document: 文件文档对象
    - source_dir: 已废弃，保留参数仅为兼容性
    - knowledge_base_id: 知识库ID
    
    返回:
    - (文件类型, 文档列表)
    """
    if file_document is None:
        return []
    
    docs = None
    file_type = ""
    temp_file_path = None
    
    try:
        # 从MinIO下载文件到临时位置
        logger.info(f"从MinIO下载文件: {file_document.file_path}")
        file_data = file_service.download_file(file_document.file_path, bucket_name="knowledge-base")
        
        # 创建临时文件
        file_suffix = file_document.suffix if file_document.suffix else os.path.splitext(file_document.name)[1]
        with tempfile.NamedTemporaryFile(mode='wb', suffix=file_suffix, delete=False) as temp_file:
            temp_file.write(file_data["content"].read())
            temp_file_path = temp_file.name
        
        logger.info(f"文件已保存到临时位置: {temp_file_path}")
        
        # 根据文件类型加载文档
        if file_document.suffix == ".txt":
            text_loader = TextLoader(temp_file_path, autodetect_encoding=True)
            docs = text_loader.load()
            file_type = "txt"
        elif file_document.suffix == ".pdf":
            pdf_loader = PyPDFLoader(temp_file_path)
            docs = pdf_loader.load()
            # 初步清洗 PDF 文档的文本，删除多余空格
            for doc in docs:
                doc.page_content = clean_text(doc.page_content)
            file_type = "pdf"
        elif file_document.suffix == ".docx":
            docx_loader = Docx2txtLoader(temp_file_path)
            docs = docx_loader.load()
            file_type = "docx"
        elif file_document.suffix == ".doc":
            doc_loader = UnstructuredWordDocumentLoader(temp_file_path)
            docs = doc_loader.load()
            file_type = "doc"
        elif file_document.suffix == ".md":
            md_loader = TextLoader(temp_file_path, autodetect_encoding=True)
            docs = md_loader.load()
            file_type = "md"
        else:
            raise ValueError(f"不支持的文件类型: {file_document.suffix}")
        
        formate_metadatas(docs, str(file_document.id), knowledge_base_id, file_document.name)
        return file_type, docs

    except Exception as e:
        logger.error(f"加载文档失败：{str(e)}")
        raise HTTPException(status_code=500, detail=f"加载文档失败：{str(e)}")
    
    finally:
        # 清理临时文件
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"已删除临时文件: {temp_file_path}")
            except Exception as e:
                logger.warning(f"删除临时文件失败: {str(e)}")


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

