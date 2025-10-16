from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.text_splitter import MarkdownHeaderTextSplitter

def getTextSplitter(chunk_size=800, chunk_overlap=150, separators=None):
    """
    创建通用文本分割器（适用于 TXT、PDF、DOCX 等格式）
    
    参数:
        chunk_size (int): 每个文本块的目标字符数，默认 800
        chunk_overlap (int): 块之间的重叠字符数（保持上下文连贯），默认 150
        separators (List[str], optional): 分割优先级列表，默认 ["\n\n", "\n"]
    
    返回:
        RecursiveCharacterTextSplitter: 文本分割器实例
        
    说明:
        - add_start_index=True 会在 metadata 中添加原始文档的字符偏移量
        - 分割后的文档会保留原始 metadata（file_id, knowledge_base_id 等）
    """
    if separators is None:
        separators = ["\n\n", "\n", "。", "！", "？", ". ", "! ", "? "]
    
    return RecursiveCharacterTextSplitter(
        separators=separators,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True,  # 保留原始文档中的位置信息
    )


def getMdTextSplitter(headers_to_split_on=None, strip_headers=False):
    """
    创建 Markdown 文档分割器（基于标题层级分割）
    
    参数:
        headers_to_split_on (List[Tuple[str, str]], optional): 
            标题级别映射列表，格式：[(markdown_符号, metadata_键名), ...]
            默认分割 H1-H6 六级标题
        strip_headers (bool): 是否移除标题行，默认 False（保留标题作为上下文）
    
    返回:
        MarkdownHeaderTextSplitter: Markdown 分割器实例
        
    说明:
        分割后的每个文档块会包含以下 metadata：
        - Header 1/2/3/4/5/6: 标题层级信息（用于上下文展示和溯源）
        - file_id, knowledge_base_id: 原始文档元数据（由 vector.py 合并）
        
    示例:
        原始 Markdown:
        ```
        # 公司制度
        ## 考勤管理
        ### 请假流程
        员工请假需提前申请...
        ```
        
        分割结果:
        ```
        Document(
            page_content="### 请假流程\n员工请假需提前申请...",
            metadata={
                "Header 1": "公司制度",
                "Header 2": "考勤管理",
                "Header 3": "请假流程"
            }
        )
        ```
    """
    if headers_to_split_on is None:
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
            ("####", "Header 4"),
            ("#####", "Header 5"),
            ("######", "Header 6"),
        ]
    
    return MarkdownHeaderTextSplitter(
        headers_to_split_on=headers_to_split_on,
        strip_headers=strip_headers,  # 保留标题可提供更好的上下文
        return_each_line=False  # 返回完整段落而非每一行
    )


def getAdvancedMdTextSplitter(
    max_chunk_size=1500,
    chunk_overlap=200,
    headers_to_split_on=None,
    strip_headers=False
):
    """
    创建高级 Markdown 分割器（标题分割 + 二次分割）
    
    适用场景：
        - Markdown 文档中某些章节过长（>1500字符）
        - 需要更精细的文本块控制
    
    参数:
        max_chunk_size (int): 触发二次分割的阈值，默认 1500
        chunk_overlap (int): 二次分割时的重叠字符数，默认 200
        headers_to_split_on: 同 getMdTextSplitter
        strip_headers: 同 getMdTextSplitter
    
    返回:
        tuple: (header_splitter, recursive_splitter)
        
    使用方法（需要在 vector.py 中实现）:
        ```python
        header_splitter, recursive_splitter = getAdvancedMdTextSplitter()
        
        # 第一步：按标题分割
        header_docs = header_splitter.split_text(markdown_text)
        
        # 第二步：对过长的块进行二次分割
        final_docs = []
        for doc in header_docs:
            if len(doc.page_content) > max_chunk_size:
                # 二次分割
                sub_docs = recursive_splitter.split_documents([doc])
                final_docs.extend(sub_docs)
            else:
                final_docs.append(doc)
        ```
    """
    header_splitter = getMdTextSplitter(headers_to_split_on, strip_headers)
    
    recursive_splitter = RecursiveCharacterTextSplitter(
        separators=["\n\n", "\n", "。", "！", "？", ". ", "! ", "? "],
        chunk_size=max_chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=False,  # 避免覆盖标题分割器的 metadata
    )
    
    return header_splitter, recursive_splitter

