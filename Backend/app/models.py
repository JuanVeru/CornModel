from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    """Admin user table for JWT authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

class CornClass(Base):
    """Saves agricultural and medical descriptions for Blight, Common_Rust, and Healthy classes."""
    __tablename__ = "corn_classes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)  # 'Blight', 'Common_Rust', 'Healthy'
    display_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    favored_conditions = Column(Text, nullable=True)
    preventive_management = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
