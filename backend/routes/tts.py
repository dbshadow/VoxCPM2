import os
import time
import queue
import shutil
import threading
from typing import Generator
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Security
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from backend.auth import verify_api_key
from backend.inference import run_tts_inference, check_model_files_exist

router = APIRouter()

# ----------------- TTS Log SSE Mechanism -----------------
class TTSLogger:
    def __init__(self):
        self.listeners = []
        self.lock = threading.Lock()

    def log(self, msg: str):
        formatted = f"{time.strftime('%H:%M:%S')} | {msg}"
        with self.lock:
            for q in self.listeners:
                q.put(formatted)
        print(formatted)

    def get_generator(self) -> Generator[str, None, None]:
        q = queue.Queue()
        with self.lock:
            self.listeners.append(q)
        try:
            # Yield initial connection confirmation
            yield f"event: log\ndata: {time.strftime('%H:%M:%S')} | 🔌 已與 TTS 日誌串流建立連線\n\n"
            while True:
                try:
                    msg = q.get(timeout=1.0)
                    yield f"event: log\ndata: {msg}\n\n"
                except queue.Empty:
                    # Send keep-alive comment
                    yield ": keepalive\n\n"
        finally:
            with self.lock:
                if q in self.listeners:
                    self.listeners.remove(q)

tts_logger = TTSLogger()

@router.get("/logs")
async def stream_tts_logs(auth=Depends(verify_api_key)):
    """SSE endpoint to stream active inference logs to the client terminal"""
    return StreamingResponse(
        tts_logger.get_generator(),
        media_type="text/event-stream"
    )

# ----------------- TTS Requests Pydantic Schemas -----------------
class DesignRequest(BaseModel):
    text: str
    cfg_value: float = 2.0
    inference_timesteps: int = 10
    normalize: bool = False
    denoise: bool = False
    seed: int = None
    speed_rate: float = 1.0

# ----------------- Helper to verify model -----------------
def ensure_model_ready():
    exists, _ = check_model_files_exist()
    if not exists:
        tts_logger.log("❌ 語音合成失敗：模型檔案不完整！")
        raise HTTPException(
            status_code=400, 
            detail="Model files are not fully downloaded. Please go to configurations and download first."
        )

# ----------------- API Route Endpoints -----------------
@router.post("/design")
async def tts_design(req: DesignRequest, auth=Depends(verify_api_key)):
    """Voice Design TTS endpoint"""
    ensure_model_ready()
    
    args = {
        "text": req.text,
        "cfg_value": req.cfg_value,
        "inference_timesteps": req.inference_timesteps,
        "normalize": req.normalize,
        "denoise": req.denoise,
        "seed": req.seed
    }
    
    try:
        wav_path, seed_val = run_tts_inference(
            func_type="design",
            args=args,
            speed_rate=req.speed_rate,
            logger=tts_logger.log
        )
        
        # FileResponse supports binary stream. We add Custom Header for the seed
        return FileResponse(
            wav_path,
            media_type="audio/wav",
            filename=os.path.basename(wav_path),
            headers={"X-Generated-Seed": str(seed_val)}
        )
    except Exception as e:
        tts_logger.log(f"❌ 語音設計推理出錯: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clone")
async def tts_clone(
    reference_wav: UploadFile = File(...),
    text: str = Form(...),
    cfg_value: float = Form(2.0),
    inference_timesteps: int = Form(10),
    normalize: bool = Form(False),
    denoise: bool = Form(False),
    seed: int = Form(None),
    speed_rate: float = Form(1.0),
    auth=Depends(verify_api_key)
):
    """Voice Clone TTS endpoint"""
    ensure_model_ready()
    
    # Save the uploaded file temporarily
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_ref_path = os.path.join(temp_dir, f"ref_{int(time.time())}_{reference_wav.filename}")
    
    with open(temp_ref_path, "wb") as buffer:
        shutil.copyfileobj(reference_wav.file, buffer)
        
    args = {
        "text": text,
        "reference_wav_path": temp_ref_path,
        "cfg_value": cfg_value,
        "inference_timesteps": inference_timesteps,
        "normalize": normalize,
        "denoise": denoise,
        "seed": seed
    }
    
    try:
        wav_path, seed_val = run_tts_inference(
            func_type="clone",
            args=args,
            speed_rate=speed_rate,
            logger=tts_logger.log
        )
        
        return FileResponse(
            wav_path,
            media_type="audio/wav",
            filename=os.path.basename(wav_path),
            headers={"X-Generated-Seed": str(seed_val)}
        )
    except Exception as e:
        tts_logger.log(f"❌ 聲音複製推理出錯: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temporary uploaded file
        if os.path.exists(temp_ref_path):
            try:
                os.remove(temp_ref_path)
            except Exception:
                pass


@router.post("/ultimate")
async def tts_ultimate(
    reference_wav: UploadFile = File(...),
    text: str = Form(...),
    prompt_text: str = Form(...),
    cfg_value: float = Form(2.0),
    inference_timesteps: int = Form(10),
    normalize: bool = Form(False),
    denoise: bool = Form(False),
    seed: int = Form(None),
    speed_rate: float = Form(1.0),
    auth=Depends(verify_api_key)
):
    """Ultimate Clone TTS endpoint"""
    ensure_model_ready()
    
    # Save the uploaded file temporarily
    temp_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    temp_ref_path = os.path.join(temp_dir, f"ref_ult_{int(time.time())}_{reference_wav.filename}")
    
    with open(temp_ref_path, "wb") as buffer:
        shutil.copyfileobj(reference_wav.file, buffer)
        
    args = {
        "text": text,
        "prompt_wav_path": temp_ref_path,
        "prompt_text": prompt_text,
        "reference_wav_path": temp_ref_path,
        "cfg_value": cfg_value,
        "inference_timesteps": inference_timesteps,
        "normalize": normalize,
        "denoise": denoise,
        "seed": seed
    }
    
    try:
        wav_path, seed_val = run_tts_inference(
            func_type="ultimate",
            args=args,
            speed_rate=speed_rate,
            logger=tts_logger.log
        )
        
        return FileResponse(
            wav_path,
            media_type="audio/wav",
            filename=os.path.basename(wav_path),
            headers={"X-Generated-Seed": str(seed_val)}
        )
    except Exception as e:
        tts_logger.log(f"❌ 極限複製推理出錯: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Cleanup temporary uploaded file
        if os.path.exists(temp_ref_path):
            try:
                os.remove(temp_ref_path)
            except Exception:
                pass
