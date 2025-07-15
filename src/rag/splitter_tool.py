from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.text_splitter import MarkdownHeaderTextSplitter

def getTextSplitter( chunk_size=800, chunk_overlap=150,separators=None):
    """
    将文档内容按指定规则切分为多个块。

    参数:
        documents (str): 待切分的原始文档文本。
        chunk_size (int): 每个文本块的目标大小，默认为 800。
        chunk_overlap (int): 块之间的重叠大小，默认为 150。
        separators (List[str], optional): 切分文本所使用的分隔符列表，
                                          默认为 ["\n\n", "\n", ]。

    返回:
        List[str]: 切分后的文本块列表。
    """
    if  separators is None:
        separators = ["\n\n", "\n"]
    return RecursiveCharacterTextSplitter(
        separators=separators,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        add_start_index=True,  # 保留原始文档中的位置信息
    )
def getMdTextSplitter( headers_to_split_on=None):
    if  headers_to_split_on is None:
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3")
        ]

    # 初始化 MarkdownHeaderTextSplitter
    return MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on,strip_headers=False)

