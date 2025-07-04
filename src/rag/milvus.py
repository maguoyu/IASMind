from langchain_core.embeddings import Embeddings
from langchain_milvus import Milvus, BM25BuiltInFunction
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
        return self.vector_store.query_relevant_documents(query, resources)

    def list_resources(self, query: str | None = None):
        return self.vector_store.list_resources(query)
