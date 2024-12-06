from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_job_posting
from app.models.models import User
from app.schemas.job_posting import (
    JobPosting,
    JobPostingCreate,
    JobPostingUpdate,
    BaseQuestionCreate,
)
from app.schemas.interview import BaseQuestion, Interview, InterviewCreate
from app.crud.crud_interview import interview

router = APIRouter()

@router.get("/", response_model=List[JobPosting])
def read_job_postings(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    求人一覧の取得
    """
    if current_user.is_superuser:
        job_postings = crud_job_posting.job_posting.get_multi(db, skip=skip, limit=limit)
    else:
        job_postings = crud_job_posting.job_posting.get_by_company(
            db=db, company_id=current_user.company_id, skip=skip, limit=limit
        )
    return job_postings

@router.get("/active", response_model=List[JobPosting])
def read_active_job_postings(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    アクティブな求人一覧の取得（認証不要）
    """
    job_postings = crud_job_posting.job_posting.get_active(db, skip=skip, limit=limit)
    return job_postings

@router.post("/", response_model=JobPosting)
def create_job_posting(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_in: JobPostingCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    新規求人の作成
    """
    # 企業に所属しているユーザーのみ作成可能
    if not current_user.company_id:
        raise HTTPException(
            status_code=400,
            detail="企業に所属していないユーザーは求人を作成できません",
        )
    
    # 自社の求人のみ作成可能
    if job_posting_in.company_id != current_user.company_id:
        raise HTTPException(
            status_code=400,
            detail="他社の求人は作成できません",
        )
    
    job_posting = crud_job_posting.job_posting.create(db, obj_in=job_posting_in)
    return job_posting

@router.get("/{job_posting_id}", response_model=JobPosting)
def read_job_posting(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    特定の求人情報の取得
    """
    job_posting = crud_job_posting.job_posting.get(db, id=job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="求人が見つかりません")
    
    # 管理者以外は自社の求人のみ閲覧可能
    if not current_user.is_superuser:
        if job_posting.company_id != current_user.company_id:
            raise HTTPException(status_code=400, detail="権限が不足しています")
    
    return job_posting

@router.put("/{job_posting_id}", response_model=JobPosting)
def update_job_posting(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_id: int,
    job_posting_in: JobPostingUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    求人情報の更新
    """
    job_posting = crud_job_posting.job_posting.get(db, id=job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="求人が見つかりません")
    
    # 管理者以外は自社の求人のみ更新可能
    if not current_user.is_superuser:
        if job_posting.company_id != current_user.company_id:
            raise HTTPException(status_code=400, detail="権限が不足しています")
    
    job_posting = crud_job_posting.job_posting.update(
        db, db_obj=job_posting, obj_in=job_posting_in
    )
    return job_posting

@router.delete("/{job_posting_id}", response_model=JobPosting)
def delete_job_posting(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    求人の削除
    """
    job_posting = crud_job_posting.job_posting.get(db, id=job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="求人が見つかりません")
    
    # 管理者以外は自社の求人のみ削除可能
    if not current_user.is_superuser:
        if job_posting.company_id != current_user.company_id:
            raise HTTPException(status_code=400, detail="権限が不足しています")
    
    job_posting = crud_job_posting.job_posting.remove(db, id=job_posting_id)
    return job_posting

@router.get("/{job_posting_id}/base-questions", response_model=List[BaseQuestion])
def read_base_questions(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    ベース質問の取得
    """
    job_posting = crud_job_posting.job_posting.get(db, id=job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="求人が見つかりません")
    
    questions = crud_job_posting.job_posting.get_base_questions(
        db, job_posting_id=job_posting_id
    )
    return questions

@router.post("/{job_posting_id}/base-questions", response_model=List[BaseQuestion])
def create_base_questions(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_id: int,
    questions_in: List[BaseQuestionCreate],
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    ベース質問の作成
    """
    job_posting = crud_job_posting.job_posting.get(db, id=job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="求人が見つかりません")
    
    # 管理者以外は自社の求人のみ質問作成可能
    if not current_user.is_superuser:
        if job_posting.company_id != current_user.company_id:
            raise HTTPException(status_code=400, detail="権限が不足しています")
    
    questions = crud_job_posting.job_posting.create_base_questions(
        db, job_posting_id=job_posting_id, questions=questions_in
    )
    return questions

@router.put("/{job_posting_id}/base-questions", response_model=List[BaseQuestion])
def update_base_questions(
    *,
    db: Session = Depends(deps.get_db),
    job_posting_id: int,
    questions_in: List[BaseQuestionCreate],
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    ベース質問の更新
    """
    job_posting = crud_job_posting.job_posting.get(db, id=job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="求人が見つかりません")
    
    # 管理者以外は自社の求人のみ質問更新可能
    if not current_user.is_superuser:
        if job_posting.company_id != current_user.company_id:
            raise HTTPException(status_code=400, detail="権限が不足しています")
    
    questions = crud_job_posting.job_posting.update_base_questions(
        db, job_posting_id=job_posting_id, questions=questions_in
    )
    return questions

@router.get("/{job_posting_id}/interviews/{interview_id}", response_model=Interview)
def get_interview(
    job_posting_id: int,
    interview_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """求人に紐づく面接詳細を取得"""
    db_interview = interview.get_by_job_posting_and_id(
        db, 
        job_posting_id=job_posting_id, 
        interview_id=interview_id
    )
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return db_interview 