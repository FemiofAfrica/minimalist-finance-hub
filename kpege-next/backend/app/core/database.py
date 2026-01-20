import ssl
from sqlmodel import SQLModel, create_engine
from app.core.config import settings

# Ensure we use pg8000 driver if not specified
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://")

# Configure SSL context for Supabase
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

engine = create_engine(
    db_url, 
    echo=True if settings.FASTAPI_ENV == "development" else False,
    connect_args={"ssl_context": ssl_context}
)

def get_session():
    from sqlmodel import Session
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)
