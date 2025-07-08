from langchain_core.embeddings import Embeddings
from langchain_milvus import Milvus, BM25BuiltInFunction
from src.rag.retriever import Chunk, Document, Resource, Retriever

from langchain_ollama import ChatOllama, OllamaEmbeddings
import os
def milvus_vector_store(drop_old:  bool = False):
    """Chroma 向量数据库"""

    return Milvus(
        builtin_function=BM25BuiltInFunction(output_field_names="sparse"),  # output_field_names="sparse"),
        embedding_function=[dense_embeddings_model()],
        vector_field=["dense", "sparse"],
        metadata_field="metadata",
        text_field="text",
        connection_args={"uri": os.getenv("MILVUS_RUL", "")},
        consistency_level="Bounded",  # Supported values are (`"Strong"`, `"Session"`, `"Bounded"`, `"Eventually"`). See https://milvus.io/docs/consistency.md#Consistency-Level for more details.
        collection_name=os.getenv("DOC_COLLECTION_NAME", "rag_docs"),
        drop_old=drop_old,  # 如果集合已存在，删除旧集合

        auto_id=True  # 自动生成唯一 ID
    )

def dense_embeddings_model():
    """Embedding 模型"""

    # https://ollama.com/library/nomic-embed-text
    embeddings = OllamaEmbeddings(model=os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text"), base_url=os.getenv("OLLAMA_EMBEDDING_URL", "http://localhost:11434"))


    return embeddings

class LocalMilvusProvider(Retriever):
    def __init__(self):
        self.vector_store = milvus_vector_store()

    def query_relevant_documents(self, query: str, resources: list[Resource] = []):
            # 初始化检索，并配置

        base_retriever = self.vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 5,  # 检索结果返回最相似的文档数量
            "fetch_k": 20,  # 要传递给 MMR 算法的文档量
            # "search_type": "mmr",
            # "score_threshold": 0.7,  # 相似度阈值过滤
             "ranker_type": "weighted",
            "ranker_params": {"weights": [0.6, 0.4]}
        }
    )
        return base_retriever.invoke(query)

    def list_resources(self, query: str | None = None) -> list[Resource]:



        resources = []

        item = Resource(
                uri=f"rag://dataset/{os.getenv("DOC_COLLECTION_NAME", "rag_docs")}",
                title=f"milvus_collection:{os.getenv("DOC_COLLECTION_NAME", "rag_docs")}",
                description="milvus",
            )        
        resources.append(item)

        return resources

