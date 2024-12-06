from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    is_companyuser = Column(Boolean, default=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    company = relationship("Company", back_populates="users")

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    users = relationship("User", back_populates="company")
    job_postings = relationship("JobPosting", back_populates="company")

class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    requirements = Column(Text)
    company_id = Column(Integer, ForeignKey("companies.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="job_postings")
    interviews = relationship("Interview", back_populates="job_posting")
    base_questions = relationship("BaseQuestion", back_populates="job_posting")

class BaseQuestion(Base):
    __tablename__ = "base_questions"

    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"))
    question_text = Column(Text)
    order = Column(Integer)
    
    job_posting = relationship("JobPosting", back_populates="base_questions")

class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id"))
    candidate_name = Column(String)
    candidate_email = Column(String)
    interview_url = Column(String, unique=True)
    status = Column(String)  # pending, in_progress, completed
    avatar_type = Column(String)  # male: hayato, female: erika
    recording_url = Column(String, nullable=True)
    resume_url = Column(String, nullable=True)
    cv_url = Column(String, nullable=True)
    ai_evaluation = Column(JSON, nullable=True)
    questions_generated = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    job_posting = relationship("JobPosting", back_populates="interviews")
    custom_questions = relationship("CustomQuestion", back_populates="interview")
    interview_responses = relationship("InterviewResponse", back_populates="interview")

class CustomQuestion(Base):
    __tablename__ = "custom_questions"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    question_text = Column(Text)
    order = Column(Integer)
    
    interview = relationship("Interview", back_populates="custom_questions")

class InterviewResponse(Base):
    __tablename__ = "interview_responses"

    id = Column(Integer, primary_key=True, index=True)
    interview_id = Column(Integer, ForeignKey("interviews.id"))
    question_id = Column(Integer)  # Can be either base_question_id or custom_question_id
    question_type = Column(String)  # base or custom
    response_text = Column(Text)
    response_time = Column(DateTime, default=datetime.utcnow)
    
    interview = relationship("Interview", back_populates="interview_responses") 