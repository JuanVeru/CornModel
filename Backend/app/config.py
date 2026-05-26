import os
from dotenv import load_dotenv

# Load environment variables from the .env file in the parent folder or current folder
load_dotenv()

# Database Connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/corn_db")

# Security Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "corn_model_jwt_secret_key_2026_change_me_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "120"))

# Default Admin Credentials
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "adminpassword")

# Model Configuration
# Since we reside in Backend/app/config.py, the model is located in the parent directory (Backend/mejor_modelo_maiz_V3_38.keras)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "mejor_modelo_maiz_V3_38.keras")
