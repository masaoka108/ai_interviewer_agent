from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime

class QuestionBase(BaseModel):
    question_text: str
    order: int

class BaseQuestionCreate(QuestionBase):
    job_posting_id: int

class BaseQuestionUpdate(QuestionBase):
    pass

class CustomQuestionCreate(QuestionBase):
    interview_id: int

class CustomQuestionUpdate(QuestionBase):
    pass

class CustomQuestionUpdateText(BaseModel):
    question_text: str

class QuestionInDBBase(QuestionBase):
    id: int

    class Config:
        from_attributes = True

class BaseQuestion(QuestionInDBBase):
    job_posting_id: int

class CustomQuestion(QuestionInDBBase):
    interview_id: int

class InterviewResponseBase(BaseModel):
    interview_id: int
    question_id: int
    question_text: str
    answer_text: str
    question_type: str

class InterviewResponseCreate(InterviewResponseBase):
    pass

class InterviewResponse(InterviewResponseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class InterviewBase(BaseModel):
    job_posting_id: int
    candidate_name: str
    candidate_email: str
    avatar_type: str

class InterviewCreate(InterviewBase):
    pass

class InterviewUpdate(BaseModel):
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    avatar_type: Optional[str] = None
    status: Optional[str] = None
    recording_url: Optional[str] = None
    resume_url: Optional[str] = None
    cv_url: Optional[str] = None
    ai_evaluation: Optional[Dict] = None

class InterviewStatusUpdate(BaseModel):
    status: str

class InterviewInDBBase(InterviewBase):
    id: int
    interview_url: str
    status: str
    recording_url: Optional[str] = None
    resume_url: Optional[str] = None
    cv_url: Optional[str] = None
    ai_evaluation: Optional[Dict] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class Interview(InterviewInDBBase):
    custom_questions: List[CustomQuestion] = []
    responses: List[InterviewResponse] = []

class InterviewInDB(InterviewInDBBase):
    pass 