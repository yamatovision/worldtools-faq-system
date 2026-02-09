import secrets

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API
    api_title: str = "ワールドツール 社内FAQ AI API"
    api_version: str = "1.0.0"

    # Database
    database_url: str

    # OpenAI (embeddings only)
    openai_api_key: str
    openai_embedding_model: str = "text-embedding-3-small"

    # Anthropic (Generator)
    anthropic_api_key: str = ""

    # RAG Settings
    chunk_size: int = 512
    chunk_overlap: int = 77
    retrieval_top_k: int = 5

    # Auth
    admin_password: str
    jwt_secret_key: str = secrets.token_hex(32)

    # BOX API
    box_client_id: str = ""
    box_client_secret: str = ""
    box_enterprise_id: str = ""
    box_jwt_key_id: str = ""
    box_private_key: str = ""
    box_private_key_passphrase: str = ""

    # DB Pool
    db_pool_size: int = 20
    db_max_overflow: int = 30
    db_pool_recycle: int = 300
    db_pool_timeout: int = 30

    # Frontend
    frontend_origin: str = "http://localhost:3300"

    # CORS (comma-separated string for env var compatibility)
    cors_origins: str = "http://localhost:3300,http://localhost:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
