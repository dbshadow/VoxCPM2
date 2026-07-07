from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.config import CORS_ORIGINS
from backend.auth import verify_api_key

# Import routers (we will implement these next)
from backend.routes.system import router as system_router
from backend.routes.tts import router as tts_router

app = FastAPI(
    title="VoxCPM2 API Service",
    description="Backend API service for VoxCPM2 Voice Synthesis Station",
    version="1.0.0"
)

# Setup CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
# We apply verify_api_key dependencies to all functional APIs
app.include_router(
    system_router,
    prefix="/api",
    tags=["system"]
)

app.include_router(
    tts_router,
    prefix="/api/tts",
    tags=["tts"]
)

@app.get("/health", tags=["system"])
async def health_check():
    """Simple unauthenticated health check endpoint"""
    return {"status": "ok"}
