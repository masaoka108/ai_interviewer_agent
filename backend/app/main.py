from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1.api import api_router
from app.core.config import settings
import os
import logging

# ロガーの設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORSミドルウェアの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Type"],
)

# APIルーターをマウント
app.include_router(api_router, prefix=settings.API_V1_STR)

# 静的ファイルのマウント
RECORDINGS_DIR = "/app/recordings"
if not os.path.exists(RECORDINGS_DIR):
    os.makedirs(RECORDINGS_DIR, mode=0o755, exist_ok=True)
    logger.info(f"Created recordings directory: {RECORDINGS_DIR}")

app.mount("/recordings", StaticFiles(directory=RECORDINGS_DIR), name="recordings")
  