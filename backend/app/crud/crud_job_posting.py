from typing import List, Optional
from sqlalchemy.orm import Session
from app.crud.base import CRUDBase
from app.models.models import JobPosting, BaseQuestion
from app.schemas.job_posting import JobPostingCreate, JobPostingUpdate
from app.schemas.interview import BaseQuestionCreate

class CRUDJobPosting(CRUDBase[JobPosting, JobPostingCreate, JobPostingUpdate]):
    def get_by_company(
        self, db: Session, *, company_id: int, skip: int = 0, limit: int = 100
    ) -> List[JobPosting]:
        return (
            db.query(JobPosting)
            .filter(JobPosting.company_id == company_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_active(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[JobPosting]:
        return (
            db.query(JobPosting)
            .filter(JobPosting.is_active == True)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def create_base_questions(
        self, db: Session, *, job_posting_id: int, questions: List[BaseQuestionCreate]
    ) -> List[BaseQuestion]:
        db_questions = []
        for question in questions:
            db_obj = BaseQuestion(
                job_posting_id=job_posting_id,
                question_text=question.question_text,
                order=question.order,
            )
            db.add(db_obj)
            db_questions.append(db_obj)
        
        db.commit()
        for question in db_questions:
            db.refresh(question)
        
        return db_questions

    def get_base_questions(
        self, db: Session, *, job_posting_id: int
    ) -> List[BaseQuestion]:
        return (
            db.query(BaseQuestion)
            .filter(BaseQuestion.job_posting_id == job_posting_id)
            .order_by(BaseQuestion.order)
            .all()
        )

    def update_base_questions(
        self,
        db: Session,
        *,
        job_posting_id: int,
        questions: List[BaseQuestionCreate]
    ) -> List[BaseQuestion]:
        # 既存の質問を削除
        db.query(BaseQuestion).filter(
            BaseQuestion.job_posting_id == job_posting_id
        ).delete()
        
        # 新しい質問を作成
        return self.create_base_questions(
            db, job_posting_id=job_posting_id, questions=questions
        )

job_posting = CRUDJobPosting(JobPosting) 