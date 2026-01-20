from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    FASTAPI_ENV: str = "development"
    DATABASE_URL: str
    WHATSAPP_VERIFY_TOKEN: str
    WHATSAPP_PHONE_NUMBER_ID: str
    WHATSAPP_ACCESS_TOKEN: str
    GROQ_API_KEY: str
    LOG_LEVEL: str = "info"

    class Config:
        env_file = ".env"

settings = Settings()
