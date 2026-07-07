FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

WORKDIR /app

# Install system dependencies (libsndfile1 is required by soundfile, ffmpeg for librosa)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install dependencies
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy backend source code into /app/backend
COPY backend /app/backend

# Set up environment variables
ENV VOXCPM_MODEL_DIR=/app/models/VoxCPM2
ENV VOXCPM_OUTPUT_DIR=/app/outputs
ENV ALLOWED_ORIGINS=*
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
