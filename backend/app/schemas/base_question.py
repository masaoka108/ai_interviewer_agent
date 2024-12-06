from pydantic import BaseModel
from typing import Optional

class BaseQuestionBase(BaseModel):
    question_text: str
    order: int

class BaseQuestionCreate(BaseQuestionBase):
    pass

class BaseQuestionUpdate(BaseQuestionBase):
    question_text: Optional[str] = None
    order: Optional[int] = None

class BaseQuestionInDBBase(BaseQuestionBase):
    id: int

    class Config:
        from_attributes = True

class BaseQuestion(BaseQuestionInDBBase):
    pass

class BaseQuestionInDB(BaseQuestionInDBBase):
    pass 