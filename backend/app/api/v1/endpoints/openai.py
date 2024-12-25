from fastapi import APIRouter, Depends, WebSocket, HTTPException
# from app.core.config import settings
import httpx
import json
from app.api import deps
# from app.models.models import User
import os
from dotenv import load_dotenv

# .envファイルを読み込む
load_dotenv()

router = APIRouter()

@router.get("/token")
async def get_realtime_token():
    """
    OpenAI Realtime APIのセッショントークンを取得
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/realtime/sessions",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-realtime-preview-2024-12-17",
                    "voice": "verse",
                }
            )
            return response.json()
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"OpenAI Realtime APIとの通信中にエラーが発生しました: {str(e)}"
        )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocketエンドポイント
    """
    await websocket.accept()
    try:
        while True:
            # クライアントからのメッセージを待機
            data = await websocket.receive_text()
            # メッセージの処理とレスポンスの送信
            await websocket.send_text(f"Message received: {data}")
    except Exception as e:
        await websocket.close()
        print(f"WebSocket error: {str(e)}") 