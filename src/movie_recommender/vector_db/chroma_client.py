import chromadb
from chromadb.config import Settings

def make_client(persist_directory: str = "./chroma_db") -> chromadb.Client:
    client = chromadb.Client(
        Settings(
            persist_directory=persist_directory,
            anonymized_telemetry=False
        )
    )
    return client