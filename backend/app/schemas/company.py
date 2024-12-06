from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    description: Optional[str] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(CompanyBase):
    pass

class CompanyInDBBase(CompanyBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Company(CompanyInDBBase):
    pass

class CompanyInDB(CompanyInDBBase):
    pass 