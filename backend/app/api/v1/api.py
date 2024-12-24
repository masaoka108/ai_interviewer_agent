from fastapi import APIRouter
from .endpoints import (
    users,
    companies,
    interviews,
    job_postings,
    auth,
    base_questions,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(interviews.router, prefix="/interviews", tags=["interviews"])
api_router.include_router(job_postings.router, prefix="/job-postings", tags=["job-postings"])
api_router.include_router(
    base_questions.router,
    prefix="/base-questions",
    tags=["base-questions"]
) 