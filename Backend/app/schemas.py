from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserLogin(BaseModel):
    """Admin login credentials structure."""
    username: str
    password: str

class TokenResponse(BaseModel):
    """JWT response structure."""
    access_token: str
    token_type: str

class CornClassBase(BaseModel):
    """Shared fields for corn classes."""
    display_name: str
    description: str
    symptoms: str
    favored_conditions: str
    preventive_management: str
    treatment: str

class CornClassUpdate(CornClassBase):
    """Properties permitted to be updated by an admin."""
    pass

class CornClassResponse(CornClassBase):
    """Complete representation of a corn class stored in database."""
    id: int
    name: str
    updated_at: datetime

    class Config:
        from_attributes = True

class PredictionResultResponse(BaseModel):
    """Response structure for public leaf image classification request."""
    prediction: str
    confidence: float
    class_details: CornClassResponse
