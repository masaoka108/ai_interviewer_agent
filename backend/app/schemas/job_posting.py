from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .interview import BaseQuestion

class JobPostingBase(BaseModel):
    title: str
    description: str
    requirements: str
    company_id: int

class JobPostingCreate(JobPostingBase):
    pass

class JobPostingUpdate(JobPostingBase):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    company_id: Optional[int] = None

class JobPostingInDBBase(JobPostingBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class JobPosting(JobPostingInDBBase):
    base_questions: List[BaseQuestion] = []

class JobPostingInDB(JobPostingInDBBase):
    pass

# ベース質問用のスキーマ
class BaseQuestionCreate(BaseModel):
    job_posting_id: int
    questions: List[BaseQuestion] 