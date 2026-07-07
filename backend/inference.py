import os
import sys
import gc
import time
import random
import torch
import librosa
import soundfile as sf
import numpy as np

from backend.config import MODEL_DIR, OUTPUT_DIR

# Global variables for model
VOXCPM_MODEL = None
CURRENT_DEVICE = "auto"
MODEL_LOCKED = False  # Simple lock to prevent concurrent inference requests on GPU

def get_target_device(device_choice="auto"):
    """Resolve torch device based on choice and availability"""
    if device_choice == "cuda":
        return "cuda" if torch.cuda.is_available() else "cpu"
    elif device_choice == "cpu":
        return "cpu"
    else: # auto
        return "cuda" if torch.cuda.is_available() else "cpu"

def check_model_files_exist():
    """Verify if all required model files are present in MODEL_DIR"""
    REQUIRED_MODEL_FILES = {
        "config.json": 4000,
        "special_tokens_map.json": 1500,
        "tokenization_voxcpm2.py": 2500,
        "tokenizer.json": 3500000,
        "tokenizer_config.json": 4500,
        "audiovae.pth": 350000000,
        "model.safetensors": 4000000000
    }
    
    if not os.path.exists(MODEL_DIR):
        return False, []
        
    missing = []
    for filename, min_size in REQUIRED_MODEL_FILES.items():
        filepath = os.path.join(MODEL_DIR, filename)
        if not os.path.exists(filepath) or os.path.getsize(filepath) < min_size:
            missing.append(filename)
            
    return len(missing) == 0, missing

def load_voxcpm_model(device_choice="auto", force_reload=False, logger=None):
    """Load VoxCPM2 model with lazy loading and device change detection"""
    global VOXCPM_MODEL, CURRENT_DEVICE
    
    target_device = get_target_device(device_choice)
    
    # Check if model needs to be reloaded
    need_reload = force_reload
    if VOXCPM_MODEL is not None:
        model_device = str(VOXCPM_MODEL.tts_model.device).lower()
        if target_device not in model_device and model_device not in target_device:
            if not (model_device.startswith("cuda") and target_device.startswith("cuda")):
                need_reload = True
                if logger:
                    logger("🔄 Target device changed, reloading model...")
    
    if need_reload:
        if logger:
            logger("🔄 Unloading existing model...")
        VOXCPM_MODEL = None
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

    if VOXCPM_MODEL is None:
        model_exists, _ = check_model_files_exist()
        if not model_exists:
            raise FileNotFoundError("Model files are missing. Please download the model first.")
            
        if logger:
            logger(f"🔄 Loading VoxCPM2 model on {target_device}...")
            
        from voxcpm import VoxCPM
        
        # Decide if optimization (compilation) should be applied
        # In Docker or server, optimize is usually True if using CUDA
        should_optimize = target_device == "cuda"
        
        VOXCPM_MODEL = VoxCPM.from_pretrained(
            MODEL_DIR,
            load_denoiser=False,
            optimize=should_optimize,
            device=target_device
        )
        CURRENT_DEVICE = target_device
        if logger:
            logger(f"✅ Model loaded successfully on {target_device}!")
            
    return VOXCPM_MODEL

def set_global_seed(seed):
    """Set seeds for reproducibility"""
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)

def run_tts_inference(func_type: str, args: dict, speed_rate: float = 1.0, device_choice: str = "auto", logger=None):
    """
    Execute speech synthesis based on function type and arguments.
    Returns: (output_wav_filepath, final_seed)
    """
    global VOXCPM_MODEL, MODEL_LOCKED
    
    if MODEL_LOCKED:
        raise RuntimeError("GPU Inference is busy, please try again later.")
        
    try:
        MODEL_LOCKED = True
        
        # 1. Ensure model is loaded
        model = load_voxcpm_model(device_choice=device_choice, logger=logger)
        
        # 2. Extract and configure Seed
        seed_val = args.pop("seed", None)
        if seed_val is not None:
            set_global_seed(seed_val)
            if logger:
                logger(f"🔒 Using fixed seed: {seed_val}")
        else:
            seed_val = random.randint(0, 10000000)
            set_global_seed(seed_val)
            if logger:
                logger(f"🎲 Using random seed: {seed_val}")
                
        # 3. Clean and map parameters
        inference_timesteps = args.pop("inference_timesteps", 10)
        cfg_value = args.pop("cfg_value", 2.0)
        
        # VoxCPM.generate expects these mapping parameters
        # We need to construct parameters to match original generation call
        gen_args = {
            "text": args.get("text"),
            "cfg_value": cfg_value,
            "inference_timesteps": inference_timesteps,
            "normalize": args.get("normalize", False),
            "denoise": args.get("denoise", False)
        }
        
        if func_type == "clone":
            gen_args["reference_wav_path"] = args.get("reference_wav_path")
        elif func_type == "ultimate":
            gen_args["prompt_wav_path"] = args.get("prompt_wav_path")
            gen_args["prompt_text"] = args.get("prompt_text")
            gen_args["reference_wav_path"] = args.get("reference_wav_path")
            
        if logger:
            logger(f"🚀 Generating speech... (Type: {func_type})")
            logger(f"Params: CFG={cfg_value}, Steps={inference_timesteps}, Speed={speed_rate}x, Normalize={gen_args['normalize']}, Denoise={gen_args['denoise']}")
            
        # 4. Generate audio wave
        start_time = time.time()
        wav = model.generate(**gen_args)
        
        # 5. Apply speed adjustment if requested
        if speed_rate != 1.0:
            if logger:
                logger(f"⏳ Adjusting speed to {speed_rate}x...")
            wav = librosa.effects.time_stretch(wav, rate=speed_rate)
            
        # 6. Save output audio file
        timestamp = time.strftime("%Y%m%d_%H%M%S")
        filename = f"voxcpm_{func_type}_{timestamp}.wav"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        sf.write(filepath, wav, model.tts_model.sample_rate)
        
        elapsed = time.time() - start_time
        if logger:
            logger(f"🎉 Speech generated successfully in {elapsed:.2f}s!")
            logger(f"Saved: {filepath}")
            
        return filepath, seed_val
        
    finally:
        MODEL_LOCKED = False
