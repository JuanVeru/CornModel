from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from .database import get_db, SessionLocal
from .models import CornClass, User
from .schemas import UserLogin, TokenResponse, CornClassResponse, CornClassUpdate, PredictionResultResponse
from .auth import verify_password, create_access_token, get_current_user
from .model_loader import load_keras_model, predict_leaf_image
from .seed import seed_initial_data

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle hook for model preloading and db initialization."""
    print("[*] Startup: Initializing databases and pre-loading ML model...")
    # 1. Preload Keras Model to avoid cold start on first request
    try:
        load_keras_model()
    except Exception as e:
        print(f"[!] Warning: Model preload failed: {e}. Model will attempt to load on first query.")
    
    # 2. Run Database Seeding
    db = SessionLocal()
    try:
        seed_initial_data(db)
    except Exception as e:
        print(f"[!] Warning: Database seeding failed: {e}")
    finally:
        db.close()
        
    yield
    print("[*] Shutdown: Releasing resources...")

app = FastAPI(
    title="Corn Health Classifier API",
    description="Backend API running a Keras model to classify corn leaves and manage disease literature.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
# Standard CORS middleware enabling calls from the Expo client (web, mobile simulators, physical devices)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    """Simple API health check endpoint."""
    return {"status": "ok", "app": "Corn Health API"}

@app.post("/api/auth/login", response_model=TokenResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate admin and return JWT access token."""
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me")
def get_me(current_user: User = Depends(get_current_user)):
    """Verify validity of JWT token and return admin username."""
    return {"username": current_user.username}

@app.post("/api/predict", response_model=PredictionResultResponse)
async def predict(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Public classification endpoint.
    Accepts leaf image files, performs ML classification, 
    and fetches agricultural data from the database.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be an image."
        )
    try:
        contents = await file.read()
        predicted_class, confidence = predict_leaf_image(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference processing error: {str(e)}"
        )
    
    # Retrieve educational content associated with this class from DB
    db_class = db.query(CornClass).filter(CornClass.name == predicted_class).first()
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class details for '{predicted_class}' not found in database."
        )
    
    return {
        "prediction": predicted_class,
        "confidence": confidence,
        "class_details": db_class
    }

@app.get("/api/classes", response_model=list[CornClassResponse])
def get_classes(db: Session = Depends(get_db)):
    """Retrieve full list of corn plant classes (public)."""
    return db.query(CornClass).all()

@app.get("/api/classes/{class_name}", response_model=CornClassResponse)
def get_class(class_name: str, db: Session = Depends(get_db)):
    """Retrieve detailed literature for a single plant class."""
    db_class = db.query(CornClass).filter(CornClass.name == class_name).first()
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class '{class_name}' not found."
        )
    return db_class

@app.put("/api/classes/{class_name}", response_model=CornClassResponse)
def update_class(
    class_name: str, 
    class_update: CornClassUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Update detailed literature for a single plant class (Admin only).
    Protected by JWT.
    """
    db_class = db.query(CornClass).filter(CornClass.name == class_name).first()
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class '{class_name}' not found."
        )
    
    db_class.display_name = class_update.display_name
    db_class.description = class_update.description
    db_class.symptoms = class_update.symptoms
    db_class.favored_conditions = class_update.favored_conditions
    db_class.preventive_management = class_update.preventive_management
    db_class.treatment = class_update.treatment
    
    db.commit()
    db.refresh(db_class)
    return db_class
