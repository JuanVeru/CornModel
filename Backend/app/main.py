from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from sqlalchemy.orm import Session
from .database import get_db, SessionLocal
from .models import CornClass, User
from .schemas import UserLogin, TokenResponse, CornClassResponse, CornClassUpdate, PredictionResultResponse, CornClassName
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

tags_metadata = [
    {
        "name": "Authentication",
        "description": "Operations for admin authentication, including login and session verification.",
    },
    {
        "name": "Predictions",
        "description": "Leaf disease classification using the preloaded Keras ML model.",
    },
    {
        "name": "Corn Classes",
        "description": "Retrieve and update agricultural literature and treatment information for corn plant classes.",
    },
    {
        "name": "System",
        "description": "System health and diagnostic endpoints.",
    },
]

app = FastAPI(
    title="Corn Health Classifier API",
    description="Backend API running a Keras model to classify corn leaves and manage disease literature.",
    version="1.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata
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

@app.get(
    "/api/health",
    tags=["System"],
    summary="Health Check",
    response_description="Returns system status"
)
def health_check():
    """
    Check the operational status of the API service.
    Returns status: 'ok' if the service is running normally.
    """
    return {"status": "ok", "app": "Corn Health API"}

@app.post(
    "/api/auth/login",
    response_model=TokenResponse,
    tags=["Authentication"],
    summary="Authenticate User / Log In",
    response_description="Access token and token type"
)
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Authenticate administrative credentials.
    Supports JSON body payload (mobile app/frontend) and form URL-encoded payload (Swagger UI Authorize button).
    Returns a signed JWT bearer token valid for accessing protected administrative endpoints.
    """
    content_type = request.headers.get("content-type", "")
    username = None
    password = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username")
            password = body.get("password")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            )
    elif "application/x-www-form-urlencoded" in content_type:
        try:
            form = await request.form()
            username = form.get("username")
            password = form.get("password")
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid form data payload"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported Content-Type. Must be application/json or application/x-www-form-urlencoded"
        )

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required"
        )

    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get(
    "/api/auth/me",
    tags=["Authentication"],
    summary="Get Logged-In User Profile",
    response_description="Username of the authenticated administrator"
)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve user metadata for the currently authenticated administrative session.
    Requires a valid JWT access token in the Authorization header.
    """
    return {"username": current_user.username}

@app.post(
    "/api/predict",
    response_model=PredictionResultResponse,
    tags=["Predictions"],
    summary="Classify Corn Leaf Disease",
    response_description="Classification class, confidence score, and agricultural recommendation literature"
)
async def predict(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a corn leaf image to classify its health condition.
    Uses a preloaded Keras CNN model to predict the class (Blight, Common_Rust, or Healthy),
    and retrieves associated diagnosis and treatment literature from the database.
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

@app.get(
    "/api/classes",
    response_model=list[CornClassResponse],
    tags=["Corn Classes"],
    summary="Retrieve All Corn Plant Classes",
    response_description="List of all corn health and disease classes with detailed literature"
)
def get_classes(db: Session = Depends(get_db)):
    """
    Fetch a complete list of corn plant classes (Blight, Common_Rust, Healthy) stored in the database.
    Includes display names, descriptions, symptoms, favored environmental conditions, prevention, and treatment protocols.
    """
    return db.query(CornClass).all()

@app.get(
    "/api/classes/{class_name}",
    response_model=CornClassResponse,
    tags=["Corn Classes"],
    summary="Retrieve Corn Class Details",
    response_description="Details of the specified corn health or disease class"
)
def get_class(class_name: CornClassName, db: Session = Depends(get_db)):
    """
    Fetch detailed diagnosis and management information for a single specific corn class by its database key.
    """
    db_class = db.query(CornClass).filter(CornClass.name == class_name.value).first()
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class '{class_name.value}' not found."
        )
    return db_class

@app.put(
    "/api/classes/{class_name}",
    response_model=CornClassResponse,
    tags=["Corn Classes"],
    summary="Update Corn Class Literature",
    response_description="The updated corn class object"
)
def update_class(
    class_name: CornClassName, 
    class_update: CornClassUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """
    Modify details and agricultural recommendations for a specific corn plant class.
    Protected administrative endpoint. Requires a valid JWT bearer token.
    """
    db_class = db.query(CornClass).filter(CornClass.name == class_name.value).first()
    if not db_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class '{class_name.value}' not found."
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

# Custom OpenAPI Schema Override
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Corn Health Classifier API",
        version="1.0.0",
        description="Backend API running a Keras model to classify corn leaves and manage disease literature.",
        routes=app.routes,
    )
    
    # Ensure components and schemas exist
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
    if "schemas" not in openapi_schema["components"]:
        openapi_schema["components"]["schemas"] = {}
        
    # Inject the UserLogin schema so it shows up in Swagger
    openapi_schema["components"]["schemas"]["UserLogin"] = UserLogin.model_json_schema()
    
    # Custom requestBody for /api/auth/login to support both JSON and Form Data
    if "/api/auth/login" in openapi_schema["paths"]:
        openapi_schema["paths"]["/api/auth/login"]["post"]["requestBody"] = {
            "content": {
                "application/json": {
                    "schema": {
                        "$ref": "#/components/schemas/UserLogin"
                    }
                },
                "application/x-www-form-urlencoded": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "username": {
                                "type": "string",
                                "description": "Admin username"
                            },
                            "password": {
                                "type": "string",
                                "format": "password",
                                "description": "Admin password"
                            }
                        },
                        "required": ["username", "password"]
                    }
                }
            },
            "required": True
        }
        
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

