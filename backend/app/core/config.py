from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    minio_endpoint: str | None = None
    minio_access_key: str | None = None
    minio_secret_key: str | None = None
    minio_bucket: str | None = None

    storage_backend: str = "minio"  # "minio" or "r2" — switches which backend get_storage_backend() returns

    r2_account_id: str | None = None
    r2_access_key: str | None = None
    r2_secret_key: str | None = None
    r2_bucket: str | None = None

    max_upload_size_mb: int = 20

    anthropic_api_key: str | None = None

    resend_api_key: str | None = None
    frontend_url: str = "http://localhost:3000"

    voyage_api_key: str | None = None
    
    redis_url: str | None = None

    ask_limit_per_minute: int = 5
    ask_limit_per_hour: int = 30
    max_question_chars: int = 1000
    max_index_chars: int = 500_000
    auth_limit_per_ip_per_hour: int = 30

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()