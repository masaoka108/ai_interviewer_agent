from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_base_question
from app.models.models import User
from app.schemas.base_question import (
    BaseQuestion,
    BaseQuestionCreate,
    BaseQuestionUpdate,
)

router = APIRouter()

@router.get("/", response_model=List[BaseQuestion])
def read_base_questions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    ベース質問一覧の取得
    """
    questions = crud_base_question.base_question.get_all(
        db, skip=skip, limit=limit
    )
    return questions

@router.post("/", response_model=BaseQuestion)
def create_base_question(
    *,
    db: Session = Depends(deps.get_db),
    question_in: BaseQuestionCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    新規ベース質問の作成
    """
    question = crud_base_question.base_question.create(db, obj_in=question_in)
    return question

@router.put("/{question_id}", response_model=BaseQuestion)
def update_base_question(
    *,
    db: Session = Depends(deps.get_db),
    question_id: int,
    question_in: BaseQuestionUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    ベース質問の更新
    """
    question = crud_base_question.base_question.get(db, id=question_id)
    if not question:
        raise HTTPException(status_code=404, detail="質問が見つかりません")
    question = crud_base_question.base_question.update(
        db, db_obj=question, obj_in=question_in
    )
    return question

@router.delete("/{question_id}", response_model=BaseQuestion)
def delete_base_question(
    *,
    db: Session = Depends(deps.get_db),
    question_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    ベース質問の削除
    """
    question = crud_base_question.base_question.get(db, id=question_id)
    if not question:
        raise HTTPException(status_code=404, detail="質問が見つかりません")
    question = crud_base_question.base_question.remove(db, id=question_id)
    return question 