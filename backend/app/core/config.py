from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://rubro:rubro_dev@localhost:5432/rubro_db"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def fix_async_driver(cls, v: str) -> str:
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql+asyncpg://", 1)
        elif v.startswith("postgresql://"):
            v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    REDIS_URL: str = "redis://localhost:6379"

    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Días de gracia tras el vencimiento de una suscripción/mantenimiento antes de bloquear el acceso
    DIAS_GRACIA_VENCIMIENTO: int = 3

    # Secreto compartido para que un cron externo (ej. Railway Cron Job) pueda invocar
    # endpoints de mantenimiento sin login humano. Vacío = deshabilitado (endpoint solo por JWT superadmin).
    CRON_SECRET: str = ""

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PROJECT_NAME: str = "rubro"
    VERSION: str = "0.1.0"

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    PUBLIC_URL: str = "http://localhost:8000"

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "Rubro <noreply@rubro.app>"
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
