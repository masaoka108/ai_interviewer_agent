from typing import Any, List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session

from app.api import deps
from app.crud import crud_interview
from app.models.models import User
from app.schemas.interview import (
    Interview,
    InterviewCreate,
    InterviewUpdate,
    InterviewStatusUpdate,
    BaseQuestion,
    CustomQuestion,
    CustomQuestionCreate,
    CustomQuestionUpdateText,
    InterviewResponse,
    InterviewResponseCreate,
)

router = APIRouter()

@router.get("/", response_model=List[Interview])
def read_interviews(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    job_posting_id: Optional[int] = None,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    面接一覧の取得
    """
    try:
        print(f"Fetching interviews with params: job_posting_id={job_posting_id}, user={current_user.email}")
        
        if current_user.is_superuser:
            interviews = crud_interview.interview.get_multi(db, skip=skip, limit=limit)
        else:
            if job_posting_id:
                print(f"Fetching interviews for job posting {job_posting_id}")
                interviews = crud_interview.interview.get_by_job_posting(
                    db=db, job_posting_id=job_posting_id, skip=skip, limit=limit
                )
            else:
                print(f"Fetching interviews for company {current_user.company_id}")
                interviews = crud_interview.interview.get_by_company(
                    db=db, company_id=current_user.company_id, skip=skip, limit=limit
                )
        
        print(f"Found {len(interviews)} interviews")
        return interviews
    except Exception as e:
        print(f"Error fetching interviews: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"面接一覧の取得中にエラーが発生しました: {str(e)}"
        )

@router.post("/", response_model=Interview)
def create_interview(
    *,
    db: Session = Depends(deps.get_db),
    interview_in: InterviewCreate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    新規面接の作成
    """
    interview = crud_interview.interview.create(db, obj_in=interview_in)
    return interview

@router.get("/{interview_id}", response_model=Interview)
def read_interview(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    特定の面接情報の取得
    """
    interview = crud_interview.interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    return interview

@router.get("/url/{interview_url}", response_model=Interview)
def read_interview_by_url(
    *,
    db: Session = Depends(deps.get_db),
    interview_url: str,
) -> Any:
    """
    URLから面接情報の取得（候補者用）
    """
    interview = crud_interview.interview.get_by_url(db, url=interview_url)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    return interview

@router.put("/{interview_id}", response_model=Interview)
def update_interview(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    interview_in: InterviewUpdate,
    current_user: User = Depends(deps.get_current_active_user),
) -> Any:
    """
    面接情報の更新
    """
    interview = crud_interview.interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    interview = crud_interview.interview.update(db, db_obj=interview, obj_in=interview_in)
    return interview

@router.post("/{interview_id}/documents", response_model=Interview)
async def upload_documents(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    resume: UploadFile = File(None),
    cv: UploadFile = File(None),
) -> Any:
    """
    履歴書・職務経歴書のアップロード
    """
    interview = crud_interview.interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")

    # TODO: ファイルのアップロード処理を実装
    # ここではダミーのURLを返します
    resume_url = f"/uploads/resume_{interview_id}.pdf" if resume else None
    cv_url = f"/uploads/cv_{interview_id}.pdf" if cv else None

    interview = crud_interview.interview.upload_documents(
        db, db_obj=interview, resume_url=resume_url, cv_url=cv_url
    )
    return interview

@router.post("/{interview_id}/complete", response_model=Interview)
def complete_interview(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    recording_url: str,
    ai_evaluation: Dict,
) -> Any:
    """
    面接の完了処理
    """
    interview = crud_interview.interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    
    interview = crud_interview.interview.complete_interview(
        db,
        db_obj=interview,
        recording_url=recording_url,
        ai_evaluation=ai_evaluation,
    )
    return interview

@router.get("/{interview_id}/base-questions", response_model=List[BaseQuestion])
def read_base_questions(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
) -> Any:
    """
    ベース質問の取得
    """
    interview = crud_interview.interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    
    questions = crud_interview.interview.get_base_questions(
        db, job_posting_id=interview.job_posting_id
    )
    return questions

@router.get("/{interview_id}/custom-questions", response_model=List[CustomQuestion])
def read_custom_questions(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
) -> Any:
    """
    カスタム質問の取得
    """
    questions = crud_interview.interview.get_custom_questions(db, interview_id=interview_id)
    return questions

@router.post("/{interview_id}/custom-questions", response_model=CustomQuestion)
def create_custom_question(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    question_in: CustomQuestionCreate,
) -> Any:
    """
    カスタム質問の作成
    """
    question = crud_interview.interview.add_custom_question(db, obj_in=question_in)
    return question

@router.put("/{interview_id}/custom-questions/{question_id}", response_model=CustomQuestion)
def update_custom_question(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    question_id: int,
    question_in: dict,
) -> Any:
    """
    カスタム質問の更新
    """
    print(f"Updating custom question: id={question_id}, text={question_in.get('question_text')}")
    try:
        question = crud_interview.interview.update_custom_question(
            db, question_id=question_id, question_text=question_in.get('question_text')
        )
        if not question:
            raise HTTPException(status_code=404, detail="カスタム質問が見つかりません")
        return question
    except Exception as e:
        print(f"Error updating question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{interview_id}/responses", response_model=List[InterviewResponse])
def read_responses(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
) -> Any:
    """
    面接回答の取得
    """
    responses = crud_interview.interview.get_responses(db, interview_id=interview_id)
    return responses

@router.post("/{interview_id}/responses", response_model=InterviewResponse)
def create_response(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    response_in: InterviewResponseCreate,
) -> Any:
    """
    面接回答の記録
    """
    response = crud_interview.interview.add_response(db, obj_in=response_in)
    return response

@router.get("/by-url/{url}", response_model=Interview)
def get_interview_by_url(
    url: str,
    db: Session = Depends(deps.get_db),
):
    """面接URLから面接情報を取得"""
    db_interview = crud_interview.interview.get_by_url(db, url=url)
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return db_interview

@router.post("/", response_model=Interview)
def create_interview(
    interview_in: InterviewCreate,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user)
):
    """面接を作成"""
    return crud_interview.interview.create(db, obj_in=interview_in)

@router.post("/{interview_id}/upload-document")
async def upload_document(
    interview_id: int,
    type: str,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db)
):
    """履歴書・職務経歴書をアップロード"""
    db_interview = crud_interview.interview.get(db, id=interview_id)
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # TODO: ファイルの保存処理
    file_url = f"uploads/{file.filename}"  # 仮の実装
    
    if type == "resume":
        db_interview = crud_interview.interview.upload_documents(db, db_obj=db_interview, resume_url=file_url)
    elif type == "cv":
        db_interview = crud_interview.interview.upload_documents(db, db_obj=db_interview, cv_url=file_url)
    else:
        raise HTTPException(status_code=400, detail="Invalid document type")

    return {"message": "Document uploaded successfully"}

@router.post("/{interview_id}/upload-recording")
async def upload_recording(
    interview_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(deps.get_db)
):
    """面接の録画データをアップロード"""
    db_interview = crud_interview.interview.get(db, id=interview_id)
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # TODO: 録画データの保存処理
    recording_url = f"recordings/{file.filename}"  # 仮の実装

    db_interview = crud_interview.interview.update(
        db,
        db_obj=db_interview,
        obj_in={"recording_url": recording_url}
    )

    return {"message": "Recording uploaded successfully"}

@router.post("/{interview_id}/responses")
async def save_response(
    interview_id: int,
    response_data: dict,
    db: Session = Depends(deps.get_db)
):
    """面接の回答を保存"""
    db_interview = crud_interview.interview.get(db, id=interview_id)
    if not db_interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    # TODO: 回答の保存処理
    response = crud_interview.interview.add_response(
        db,
        obj_in={
            "interview_id": interview_id,
            "question_text": response_data["question_text"],
            "response_text": response_data["response_text"]
        }
    )

    return response

@router.post("/{interview_id}/generate-questions", response_model=Interview)
async def generate_questions(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
) -> Any:
    """
    履歴書と職務経歴書から質問を生成
    """
    interview = crud_interview.interview.get(db, id=interview_id)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    
    if not interview.resume_url or not interview.cv_url:
        raise HTTPException(
            status_code=400,
            detail="履歴書と職務経歴書の両方がアップロードされている必要があります"
        )

    try:
        # TODO: AIによる質問生成ロジックを実装
        # ここではダミーの質問を生成
        dummy_questions = [
            "あなたの強みを教えてください",
            "これまでの経験で最も困難だった課題は何ですか？",
            "なぜこの職種に興味を持ったのですか？",
            "チームワークについてどのように考えていますか？",
            "5年後のキャリアビジョンを教えてください"
        ]

        # カスタム質問として保存
        for i, question in enumerate(dummy_questions):
            question_in = CustomQuestionCreate(
                interview_id=interview_id,
                question_text=question,
                order=i + 1
            )
            crud_interview.interview.add_custom_question(db, obj_in=question_in)

        # 質問生成完了フラグを更新
        interview = crud_interview.interview.update(
            db,
            db_obj=interview,
            obj_in={"questions_generated": True}
        )
        
        return interview

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"質問の生成中にエラーが発生しました: {str(e)}"
        ) 

@router.delete("/{interview_id}/custom-questions/{question_id}")
def delete_custom_question(
    *,
    db: Session = Depends(deps.get_db),
    interview_id: int,
    question_id: int,
) -> Any:
    """
    カスタム質問の削除
    """
    print(f"Deleting custom question: id={question_id}")
    try:
        question = crud_interview.interview.get_custom_question(db, question_id=question_id)
        if not question:
            raise HTTPException(status_code=404, detail="質問が見つかりません")
        
        if question.interview_id != interview_id:
            raise HTTPException(status_code=400, detail="この質問は指定された面接に属していません")
        
        success = crud_interview.interview.delete_custom_question(db, question_id=question_id)
        if success:
            return {"message": "質問を削除しました"}
        else:
            raise HTTPException(status_code=500, detail="質問の削除に失敗しました")
    except Exception as e:
        print(f"Error deleting question: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 

@router.put("/url/{interview_url}/status", response_model=Interview)
def update_interview_status_by_url(
    *,
    db: Session = Depends(deps.get_db),
    interview_url: str,
    status_update: InterviewStatusUpdate,
) -> Any:
    """
    面接URLを使用して面接のステータスを更新
    """
    interview = crud_interview.interview.get_by_url(db, url=interview_url)
    if not interview:
        raise HTTPException(status_code=404, detail="面接が見つかりません")
    
    interview = crud_interview.interview.update(
        db,
        db_obj=interview,
        obj_in={"status": status_update.status}
    )
    return interview 