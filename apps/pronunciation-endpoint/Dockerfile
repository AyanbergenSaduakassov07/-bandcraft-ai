# OpenPronounce as a private Hugging Face Space (Docker SDK, free CPU tier). ADR-0005.
# The two Wav2Vec2 checkpoints are baked in at build time, so no request waits on a download.
FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg espeak-ng \
    && rm -rf /var/lib/apt/lists/*

# Spaces run as uid 1000.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app

RUN pip install --no-cache-dir --user torch==2.8.0 --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --user "openpronounce==0.3.0" "fastapi>=0.115" "uvicorn>=0.30" "python-multipart>=0.0.9"
RUN python -c "from huggingface_hub import snapshot_download as d; \
d('facebook/wav2vec2-lv-60-espeak-cv-ft'); d('facebook/wav2vec2-large-960h')"

COPY --chown=user app.py .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
