from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_company
from app.models.models import User
from app.schemas.company import Company, CompanyCreate, CompanyUpdate

router = APIRouter()

@router.get("/", response_model=List[Company])
def read_companies(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    企業一覧の取得
    """
    if crud_company.company.is_superuser(current_user):
        companies = crud_company.company.get_multi(db, skip=skip, limit=limit)
    else:
        companies = crud_company.company.get_multi_by_user(
            db=db, user_id=current_user.id, skip=skip, limit=limit
        )
    return companies

@router.post("/", response_model=Company)
def create_company(
    *,
    db: Session = Depends(deps.get_db),
    company_in: CompanyCreate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    新規企業の作成（管理者のみ）
    """
    company = crud_company.company.get_by_name(db, name=company_in.name)
    if company:
        raise HTTPException(
            status_code=400,
            detail="この企業名は既に登録されています。",
        )
    company = crud_company.company.create(db, obj_in=company_in)
    return company

@router.get("/{company_id}", response_model=Company)
def read_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    特定の企業情報の取得
    """
    company = crud_company.company.get(db, id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    if not crud_company.company.is_superuser(current_user):
        if not any(user.id == current_user.id for user in company.users):
            raise HTTPException(status_code=400, detail="権限が不足しています")
    return company

@router.put("/{company_id}", response_model=Company)
def update_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
    company_in: CompanyUpdate,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    特定の企業情報の更新（管理者のみ）
    """
    company = crud_company.company.get(db, id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    company = crud_company.company.update(db, db_obj=company, obj_in=company_in)
    return company

@router.delete("/{company_id}", response_model=Company)
def delete_company(
    *,
    db: Session = Depends(deps.get_db),
    company_id: int,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    特定の企業の削除（管理者のみ）
    """
    company = crud_company.company.get(db, id=company_id)
    if not company:
        raise HTTPException(status_code=404, detail="企業が見つかりません")
    company = crud_company.company.remove(db, id=company_id)
    return company 