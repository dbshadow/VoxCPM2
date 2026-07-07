import os
from pathlib import Path

# Base directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent

# API Settings
API_KEY = os.getenv("VOXCPM_API_KEY", "")  # Empty string means authentication is disabled

# Model and Storage Settings
# Default model path in project directory (matches original project structure)
DEFAULT_MODEL_DIR = str(BASE_DIR / "models" / "VoxCPM2")
MODEL_DIR = os.getenv("VOXCPM_MODEL_DIR", DEFAULT_MODEL_DIR)

# Directory to save temporary generated audios
DEFAULT_OUTPUT_DIR = str(BASE_DIR / "outputs")
OUTPUT_DIR = os.getenv("VOXCPM_OUTPUT_DIR", DEFAULT_OUTPUT_DIR)

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# CORS configuration (origins separated by comma)
CORS_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*")
CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]
