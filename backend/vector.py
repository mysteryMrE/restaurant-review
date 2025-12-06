from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
import os
import pandas as pd

embeddings = OllamaEmbeddings(model="mxbai-embed-large")
db_loc = "./chromaDB"

vector_store = Chroma(
    collection_name="restaurant_reviews",
    persist_directory=db_loc,
    embedding_function=embeddings,
)


def embedToVectors(data_id: str, texts: list[dict]) -> None:
    docs = []
    ids = []
    for i, text in enumerate(texts):
        doc_id = f"{data_id}-{i}"
        doc = Document(
            page_content=text["text"],
            metadata={
                "rating": text["rating"],
                "date": text["date"],
                "data_id": data_id,
            },
            id=str(i),
        )
        docs.append(doc)
        ids.append(doc_id)
    vector_store.add_documents(docs, ids=ids)


def getRetriever(data_id: str):
    retriever = vector_store.as_retriever(
        search_kwargs={"k": 4, "filter": {"data_id": data_id}}
    )
    return retriever
