"""
Central configuration — loaded once at startup via pydantic-settings.
All values can be overridden by environment variables or a .env file.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root = 3 levels up from this file:
#   src/movie_recommender/config.py  →  src/movie_recommender  →  src  →  root
ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # App
    # ------------------------------------------------------------------
    app_env: str = Field("development", description="development | staging | production")
    app_log_level: str = Field("INFO")
    app_host: str = Field("0.0.0.0")
    app_port: int = Field(8000)
    app_reload: bool = Field(True)

    # ------------------------------------------------------------------
    # Qdrant
    # ------------------------------------------------------------------
    qdrant_host: str = Field("localhost")
    qdrant_port: int = Field(6333)
    qdrant_grpc_port: int = Field(6334)
    qdrant_prefer_grpc: bool = Field(False)
    qdrant_collection_name: str = Field("movies")

    # ------------------------------------------------------------------
    # Ollama
    # ------------------------------------------------------------------
    ollama_base_url: str = Field("http://localhost:11434")
    ollama_model: str = Field("llama3.1:8b")
    ollama_timeout: int = Field(120)

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------
    embedding_model: str = Field("sentence-transformers/all-MiniLM-L6-v2")
    embedding_batch_size: int = Field(64)
    embedding_device: str = Field("cpu")  # cpu | cuda | mps

    # ------------------------------------------------------------------
    # MovieLens
    # ------------------------------------------------------------------
    movielens_variant: str = Field("ml-latest-small")
    movielens_download_url: str = Field(
        "https://files.grouplens.org/datasets/movielens"
    )

    # ------------------------------------------------------------------
    # SQLite
    # ------------------------------------------------------------------
    sqlite_db_path: str = Field("data/processed/interactions.db")

    # ------------------------------------------------------------------
    # Recommender pipeline
    # ------------------------------------------------------------------
    retrieval_top_k: int = Field(20, description="Candidates fetched from Qdrant")
    rerank_top_n: int = Field(5, description="Final recommendations returned")

    # ------------------------------------------------------------------
    # Computed / derived paths  (not read from env)
    # ------------------------------------------------------------------
    @computed_field  # type: ignore[misc]
    @property
    def data_external_dir(self) -> Path:
        return ROOT_DIR / "data" / "external"

    @computed_field  # type: ignore[misc]
    @property
    def data_raw_dir(self) -> Path:
        return ROOT_DIR / "data" / "raw" / self.movielens_variant

    @computed_field  # type: ignore[misc]
    @property
    def data_interim_dir(self) -> Path:
        return ROOT_DIR / "data" / "interim"

    @computed_field  # type: ignore[misc]
    @property
    def data_processed_dir(self) -> Path:
        return ROOT_DIR / "data" / "processed"

    @computed_field  # type: ignore[misc]
    @property
    def models_dir(self) -> Path:
        return ROOT_DIR / "models"

    @computed_field  # type: ignore[misc]
    @property
    def sqlite_db_url(self) -> str:
        return f"sqlite+aiosqlite:///{ROOT_DIR / self.sqlite_db_path}"

    @computed_field  # type: ignore[misc]
    @property
    def qdrant_url(self) -> str:
        return f"http://{self.qdrant_host}:{self.qdrant_port}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance."""
    return Settings()