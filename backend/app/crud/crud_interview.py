from typing import List, Optional, Dict
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.crud.base import CRUDBase
from app.models.models import Interview, CustomQuestion, InterviewResponse, BaseQuestion
from app.schemas.interview import (
    InterviewCreate,
    InterviewUpdate,
    CustomQuestionCreate,
    InterviewResponseCreate,
)

class CRUDInterview(CRUDBase[Interview, InterviewCreate, InterviewUpdate]):
    def create(self, db: Session, *, obj_in: InterviewCreate) -> Interview:
        interview_url = str(uuid.uuid4())
        db_obj = Interview(
            **obj_in.dict(),
            interview_url=interview_url,
            status="scheduled"
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_by_url(self, db: Session, *, url: str) -> Optional[Interview]:
        return db.query(Interview).filter(Interview.interview_url == url).first()

    def get_by_company(
        self, db: Session, *, company_id: int, skip: int = 0, limit: int = 100
    ) -> List[Interview]:
        return (
            db.query(Interview)
            .join(Interview.job_posting)
            .filter(Interview.job_posting.has(company_id=company_id))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def add_custom_question(
        self, db: Session, *, obj_in: CustomQuestionCreate
    ) -> CustomQuestion:
        db_obj = CustomQuestion(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def add_response(
        self, db: Session, *, obj_in: dict
    ) -> InterviewResponse:
        """面接回答を追加"""
        try:
            db_obj = InterviewResponse(
                interview_id=obj_in["interview_id"],
                question_id=obj_in["question_id"],
                question_text=obj_in["question_text"],
                answer_text=obj_in["answer_text"],
                question_type=obj_in["question_type"]
            )
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj
        except Exception as e:
            db.rollback()
            raise Exception(f"Failed to save response: {str(e)}")

    def complete_interview(
        self,
        db: Session,
        *,
        db_obj: Interview,
        recording_url: str,
        ai_evaluation: Dict
    ) -> Interview:
        db_obj.status = "completed"
        db_obj.completed_at = datetime.utcnow()
        db_obj.recording_url = recording_url
        db_obj.ai_evaluation = ai_evaluation
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def upload_documents(
        self,
        db: Session,
        *,
        db_obj: Interview,
        resume_url: Optional[str] = None,
        cv_url: Optional[str] = None
    ) -> Interview:
        if resume_url:
            db_obj.resume_url = resume_url
        if cv_url:
            db_obj.cv_url = cv_url
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_base_questions(
        self, db: Session, *, job_posting_id: int
    ) -> List[BaseQuestion]:
        return (
            db.query(BaseQuestion)
            .filter(BaseQuestion.job_posting_id == job_posting_id)
            .order_by(BaseQuestion.order)
            .all()
        )

    def get_custom_questions(
        self, db: Session, *, interview_id: int
    ) -> List[CustomQuestion]:
        return (
            db.query(CustomQuestion)
            .filter(CustomQuestion.interview_id == interview_id)
            .order_by(CustomQuestion.order)
            .all()
        )

    def get_responses(
        self, db: Session, *, interview_id: int
    ) -> List[InterviewResponse]:
        return (
            db.query(InterviewResponse)
            .filter(InterviewResponse.interview_id == interview_id)
            .order_by(InterviewResponse.created_at)
            .all()
        )

    def get_by_job_posting(
        self, db: Session, *, job_posting_id: int, skip: int = 0, limit: int = 100
    ) -> List[Interview]:
        return (
            db.query(Interview)
            .filter(Interview.job_posting_id == job_posting_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_job_posting_and_id(
        self, db: Session, *, job_posting_id: int, interview_id: int
    ) -> Optional[Interview]:
        return db.query(Interview).filter(
            Interview.job_posting_id == job_posting_id,
            Interview.id == interview_id
        ).first()

    def get_custom_question(
        self, db: Session, *, question_id: int
    ) -> Optional[CustomQuestion]:
        return db.query(CustomQuestion).filter(CustomQuestion.id == question_id).first()

    def update_custom_question(
        self, db: Session, *, question_id: int, question_text: str
    ) -> Optional[CustomQuestion]:
        question = self.get_custom_question(db, question_id=question_id)
        if question:
            question.question_text = question_text
            db.add(question)
            db.commit()
            db.refresh(question)
        return question

    def delete_custom_question(
        self, db: Session, *, question_id: int
    ) -> bool:
        question = self.get_custom_question(db, question_id=question_id)
        if question:
            db.delete(question)
            db.commit()
            return True
        return False

interview = CRUDInterview(Interview) 