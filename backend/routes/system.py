import torch
from fastapi import APIRouter, Depends

from backend.auth import verify_api_key
from backend.inference import check_model_files_exist, VOXCPM_MODEL, CURRENT_DEVICE

router = APIRouter()

@router.get("/status")
async def get_system_status(auth=Depends(verify_api_key)):
    """Check GPU availability and current model loading status"""
    cuda_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if cuda_available else "None"
    
    model_exists, missing_files = check_model_files_exist()
    
    return {
        "gpu": {
            "cuda_available": cuda_available,
            "device_name": gpu_name
        },
        "model": {
            "is_loaded": VOXCPM_MODEL is not None,
            "loaded_device": CURRENT_DEVICE if VOXCPM_MODEL is not None else None,
            "exists_complete": model_exists,
            "missing_files": missing_files
        }
    }
