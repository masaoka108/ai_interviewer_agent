from typing import Any, List
from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_user
from app.models.models import User
from app.schemas.user import User, UserCreate, UserUpdate
from app.core.config import settings

router = APIRouter()

@router.get("/", response_model=List[User])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    全ユーザーの取得（管理者のみ）
    """
    users = crud_user.user.get_multi(db, skip=skip, limit=limit)
    return users

@router.post("/", response_model=User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    新規ユーザーの作成（管理者のみ）
    """
    user = crud_user.user.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="このメールアドレスは既に登録されています。",
        )
    user = crud_user.user.create(db, obj_in=user_in)
    return user

@router.get("/me", response_model=User)
def read_user_me(
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    現在のユーザー情報の取得
    """
    return current_user

@router.put("/me", response_model=User)
def update_user_me(
    *,
    db: Session = Depends(deps.get_db),
    full_name: str = Body(None),
    email: str = Body(None),
    password: str = Body(None),
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    現在のユーザー情報の更新
    """
    current_user_data = jsonable_encoder(current_user)
    user_in = UserUpdate(**current_user_data)
    if full_name is not None:
        user_in.full_name = full_name
    if email is not None:
        user_in.email = email
    if password is not None:
        user_in.password = password
    user = crud_user.user.update(db, db_obj=current_user, obj_in=user_in)
    return user

@router.get("/{user_id}", response_model=User)
def read_user_by_id(
    user_id: int,
    current_user: User = Depends(deps.get_current_active_user),
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    特定のユーザー情報の取得
    """
    user = crud_user.user.get(db, id=user_id)
    if user == current_user:
        return user
    if not crud_user.user.is_superuser(current_user):
        raise HTTPException(
            status_code=400, detail="権限が不足しています"
        )
    return user

@router.put("/{user_id}", response_model=User)
def update_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    user_in: UserUpdate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    特定のユーザー情報の更新（管理者のみ）
    """
    user = crud_user.user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )
    user = crud_user.user.update(db, db_obj=user, obj_in=user_in)
    return user

@router.delete("/{user_id}", response_model=User)
def delete_user(
    *,
    db: Session = Depends(deps.get_db),
    user_id: int,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    特定のユーザーの削除（管理者のみ）
    """
    user = crud_user.user.get(db, id=user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="ユーザーが見つかりません",
        )
    user = crud_user.user.remove(db, id=user_id)
    return user 