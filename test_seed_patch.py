import os
import random
import numpy as np
import torch
from voxcpm import VoxCPM

# Monkey-patch VoxCPM classes to support seed
from voxcpm.model.voxcpm2 import VoxCPM2Model
from voxcpm.model.voxcpm import VoxCPMModel

_orig_generate_v2 = VoxCPM2Model._generate_with_prompt_cache
_orig_generate_v1 = VoxCPMModel._generate_with_prompt_cache

CURRENT_SEED = None

def wrapped_generate_v2(self_model, *args, **kwargs):
    global CURRENT_SEED
    if CURRENT_SEED is not None:
        kwargs['seed'] = CURRENT_SEED
    return _orig_generate_v2(self_model, *args, **kwargs)

def wrapped_generate_v1(self_model, *args, **kwargs):
    global CURRENT_SEED
    if CURRENT_SEED is not None:
        kwargs['seed'] = CURRENT_SEED
    return _orig_generate_v1(self_model, *args, **kwargs)

VoxCPM2Model._generate_with_prompt_cache = wrapped_generate_v2
VoxCPMModel._generate_with_prompt_cache = wrapped_generate_v1

script_dir = os.path.dirname(os.path.abspath(__file__))
model_dir = os.path.join(script_dir, "models", "VoxCPM2")

print("Loading model...")
model = VoxCPM.from_pretrained(model_dir, load_denoiser=False, optimize=False)

text = "(A young woman, gentle voice) 哈囉！測試語音生成的一致性。"

# First run with seed 42
print("Running first generation with seed 42...")
CURRENT_SEED = 42
wav1 = model.generate(text=text, cfg_value=2.0, inference_timesteps=10)

# Second run with seed 42
print("Running second generation with seed 42...")
CURRENT_SEED = 42
wav2 = model.generate(text=text, cfg_value=2.0, inference_timesteps=10)

# Third run with seed 100
print("Running third generation with seed 100...")
CURRENT_SEED = 100
wav3 = model.generate(text=text, cfg_value=2.0, inference_timesteps=10)

CURRENT_SEED = None

# Check if wav1 and wav2 are equal
diff_1_2 = np.max(np.abs(wav1 - wav2))
print(f"Max difference between run 1 and run 2 (same seed 42): {diff_1_2}")

if diff_1_2 == 0:
    print("SUCCESS: Seed patching successfully locked the timbre!")
else:
    print("FAILURE: Audio files are still different.")
