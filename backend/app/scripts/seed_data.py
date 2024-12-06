from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.security import get_password_hash
from app.models.models import User, Company, JobPosting, BaseQuestion, Interview
from app.core.config import settings

# データベース接続
engine = create_engine(settings.SQLALCHEMY_DATABASE_URI)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def seed_data():
    try:
        # 企業データの作成
        company = Company(
            id=1,
            name="株式会社テスト",
            description="テスト企業です",
            created_at=datetime.utcnow()
        )
        db.add(company)
        db.flush()

        # ユーザーデータの作成
        admin_user = User(
            email="admin@example.com",
            hashed_password=get_password_hash("password"),
            full_name="管理者",
            is_active=True,
            is_superuser=True,
            is_companyuser=False
        )

        company_user = User(
            email="company@example.com",
            hashed_password=get_password_hash("password"),
            full_name="企業ユーザー",
            is_active=True,
            is_superuser=False,
            is_companyuser=True,
            company_id=company.id
        )

        db.add(admin_user)
        db.add(company_user)
        db.flush()

        # 求人データの作成
        job_posting = JobPosting(
            title="Pythonエンジニア募集",
            description="バックエンド開発のポジションです",
            requirements="Python, FastAPI, SQLAlchemyの経験",
            company_id=company.id,
            created_at=datetime.utcnow()
        )
        db.add(job_posting)
        db.flush()

        # 基本質問データの作成
        base_questions = [
            BaseQuestion(
                job_posting_id=job_posting.id,
                question_text="あなたの強みを教えてください",
                order=1
            ),
            BaseQuestion(
                job_posting_id=job_posting.id,
                question_text="この職務を志望した理由を教えてください",
                order=2
            ),
            BaseQuestion(
                job_posting_id=job_posting.id,
                question_text="チームでの開発経験について教えてください",
                order=3
            )
        ]
        for question in base_questions:
            db.add(question)

        # コミット
        db.commit()
        print("シードデータの作成が完了しました")

    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data() 