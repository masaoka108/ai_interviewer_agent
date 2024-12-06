from typing import List
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.models import BaseQuestion
from app.schemas.base_question import BaseQuestionCreate, BaseQuestionUpdate

class CRUDBaseQuestion(CRUDBase[BaseQuestion, BaseQuestionCreate, BaseQuestionUpdate]):
    def get_all(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[BaseQuestion]:
        return (
            db.query(BaseQuestion)
            .order_by(BaseQuestion.order)
            .offset(skip)
            .limit(limit)
            .all()
        )

base_question = CRUDBaseQuestion(BaseQuestion) 