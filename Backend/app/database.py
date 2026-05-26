from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

connect_args = {}
# Support SQLite fallback if specified for lightweight local testing
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency injection generator to yield DB sessions and close them upon request completion."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
    db.close()
