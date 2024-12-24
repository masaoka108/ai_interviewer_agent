import logging
from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash
from app.crud import crud_user
from app.schemas.user import User, Token

# ロガーの設定
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login/access-token", response_model=Token)
def login_access_token(
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.info(f"Login attempt for user: {form_data.username}")
    try:
        user = crud_user.user.authenticate(
            db, email=form_data.username, password=form_data.password
        )
        if not user:
            logger.error(f"Authentication failed for user: {form_data.username}")
            raise HTTPException(status_code=400, detail="Incorrect email or password")
        elif not crud_user.user.is_active(user):
            logger.error(f"Inactive user attempted login: {form_data.username}")
            raise HTTPException(status_code=400, detail="Inactive user")
        
        access_token = security.create_access_token(user.id)
        logger.info(f"Login successful for user: {form_data.username}")
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        logger.error(f"Login failed for user {form_data.username}: {str(e)}")
        raise

@router.post("/test-token", response_model=User)
def test_token(current_user: User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user 