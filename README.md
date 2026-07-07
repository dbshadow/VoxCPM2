**English** | [繁體中文](README.zh-TW.md)

# 🎙️ Studio0808 VoxCPM — AI Text-to-Speech Workstation

![GitHub License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)
![Platform](https://img.shields.io/badge/platform-windows-lightgrey.svg)

An offline desktop GUI application built on top of OpenBMB's state-of-the-art **VoxCPM2** — a 2-billion-parameter open-source text-to-speech large language model. It bundles voice design, voice cloning, ultimate cloning, and a built-in live recording studio into one tool, so you can experience high-quality AI speech synthesis on your Windows PC without writing a single line of code.

---

## 🌟 Key Features

### 1. 🎤 Live Voice Recording (NEW!)
* **Dynamic Microphone Selection** — Automatically detects and lists every available audio input device on your system.
* **Real-Time Waveform Visualization** — A built-in waveform monitor shows pink ripple animations while recording, giving you instant visual confirmation that audio is being captured.
* **One-Click Apply** — After recording, apply the WAV file and its transcript directly to the Voice Clone or Ultimate Clone tab with a single click.

### 2. ✨ Voice Design
* **Create from Scratch** — No reference audio needed. Simply prepend a parenthesized English description to your text (e.g., `(A gentle young female voice, smiling)`) and the model will generate a unique voice that matches your description.
* **Quick Preset Panel** — Choose from 10+ curated voice presets covering Mandarin, Japanese, English, Korean, and more — one click to apply.
* **📋 Batch Synthesis (Audiobook Mode)** — Paste a long article or novel line-by-line (one sentence per line) and the system synthesizes each line into a separate audio file in the background, preventing memory overflow or context-length crashes.

### 3. 👥 Voice Clone
* **Ultra-Short Reference Audio** — Only 3–10 seconds of clean vocal recording is needed to quickly replicate a speaker's tonal characteristics.
* **Randomized Takes** — The random seed is deliberately left unfixed by default: the timbre stays consistent, but the pacing, pauses, and intonation vary with every generation, letting you cherry-pick the most natural-sounding take.

### 4. 👑 Ultimate Clone
* **Seamless Continuation** — Supply both a reference audio clip and its exact transcript. The model treats the reference as a timeline prefix and seamlessly continues speaking your target text, perfectly inheriting the speaker's breathing, pitch contour, ambient noise, and emotion.

---

## ⚙️ System Requirements

| Item | Recommendation |
|---|---|
| **OS** | Windows 10 / 11 (64-bit) |
| **Python** | 3.8 – 3.11 |
| **GPU** | NVIDIA GPU with **≥ 6 GB VRAM** + CUDA for near-instant generation |
| **Model Size** | ~2 B parameters; weights ≈ 4.63 GB on disk |

> [!NOTE]
> If no GPU is available, the application falls back to CPU mode automatically (expect ~10–30× slower generation).

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/begin0808/VoxCPM2.git
cd VoxCPM2
```

### 2. Install Dependencies
A clean virtual environment (Anaconda or `venv`) is strongly recommended.
```bash
pip install -r requirements.txt
```

### 3. Launch
```bash
python Studio0808_VoxCPM.py
```

---

## 📂 Model Deployment (First Run)

This workstation is **fully offline** — no audio or text is ever uploaded to the cloud.

1. Open the app and navigate to the **System Settings** tab.
2. Select a download mirror:
   * **Hugging Face** (recommended for most regions — highest bandwidth)
   * **ModelScope / Mirror** (recommended for users in mainland China)
3. Click **"Start Download / Check Model"**.
4. The downloader supports **HTTP Range requests (resume)** and **auto-retry**. If the connection drops, simply click again to resume from where it left off. Once downloaded, the app can run entirely offline.

---

## 🖥️ Client-Server (Web API) Deployment Guide (NEW!)

To bypass local hardware constraints, you can now run VoxCPM2 in a **client-server architecture**. Run the GPU-intensive inference backend on a remote NVIDIA GPU server, and control it from a beautiful web dashboard deployed on the public internet.

### 1. 🚀 Backend Deployment (GPU Server)
The backend is written in FastAPI. Docker is highly recommended for easy setup.

#### Option A: Docker Compose (Recommended)
1. Ensure your server has `docker`, `docker-compose`, and the `nvidia-container-toolkit` installed.
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Set your authorization key in `docker-compose.yml` (using `VOXCPM_API_KEY`) to secure your GPU compute resources.
4. Launch the container:
   ```bash
   docker compose up -d --build
   ```
5. The API backend will be live at `http://<YOUR_SERVER_IP>:8000`.

#### Option B: Bare-metal Setup
1. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Start the Uvicorn server:
   ```bash
   python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
   ```

---

### 2. 🌐 Frontend Deployment (Public Web)
The frontend is built with Vite, React, and Tailwind CSS.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install packages and build static files:
   ```bash
   npm install
   npm run build
   ```
3. Deploy the compiled `dist/` directory to any static host (e.g. Vercel, Netlify, Github Pages, Cloudflare Pages).
4. **Configuration**:
   - Open your hosted website, go to the **System Settings** tab.
   - Enter your backend API URL (e.g., `http://<GPU_IP>:8000`) and the API key (if configured). These settings are securely persisted in your browser's local storage.

> [!IMPORTANT]
> **Mixed Content Blocks (HTTPS vs HTTP)**:
> Since web hosts like Vercel force **HTTPS**, requests to a non-HTTPS GPU backend (e.g. `http://<IP>:8000`) will be blocked by browsers.
> **Fixes**:
> 1. Set up Nginx as a reverse proxy on your GPU server with Let's Encrypt SSL.
> 2. Or, use **Cloudflare Tunnels** (`cloudflared`) to map your local port 8000 securely. Cloudflare automatically issues free SSL certificates and handles traffic routing for you without open ports.

---

## ❓ Tips & FAQ

### Q: The model mispronounces certain characters (e.g., polyphonic or rare characters)?
* **Homophone Substitution** — Since the input text is only used to drive speech synthesis (listeners hear the audio, not the text), you can freely swap in a homophone that the model reads correctly.
* **Example:**
  * If the model reads 連**假** with the wrong tone, replace it with a homophone like **連架** or **連價**.
  * If the rare character 狂**飆** is mispronounced, swap it for a common homophone like **狂標**.

### Q: What is the ideal reference audio length for voice cloning?
* **3–10 seconds is the sweet spot.** Longer reference audio (e.g., > 30 seconds) consumes a disproportionate share of the autoregressive model's attention window, often causing repetition loops, hallucinations, or premature cutoffs in the generated output. Aim for 5–8 seconds of clean, background-music-free speech.

---

## 📜 License & Disclaimer

* This project is built on top of OpenBMB's open-source [VoxCPM2](https://github.com/OpenBMB/VoxCPM) model, released under the **Apache License 2.0**.
* This tool is intended for **academic research, testing, and technical evaluation only**. Please comply with all applicable laws and regulations — do not use synthesized speech for illegal or unauthorized purposes.
* Copyright © 2026 Studio0808.
