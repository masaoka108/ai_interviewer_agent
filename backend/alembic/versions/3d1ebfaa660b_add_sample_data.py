"""add_sample_data

Revision ID: 3d1ebfaa660b
Revises: feb04ca3cafb
Create Date: 2024-12-13 07:22:58.533670

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d1ebfaa660b'
down_revision: Union[str, None] = 'feb04ca3cafb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # サンプルデータの挿入
    op.execute("""
        INSERT INTO companies (id, name, description, created_at) VALUES 
        (1, 'テック株式会社', 'IT企業のサンプルデータです', NOW()),
        (2, 'スタートアップ株式会社', 'スタートアップ企業のサンプルデータです', NOW());
        
        SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies));
    """)

    op.execute("""
        INSERT INTO users (id, email, hashed_password, full_name, is_active, is_superuser, is_companyuser, company_id) VALUES 
        (1, 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKxcQw8iBX24n4W', '管理者', true, true, false, null),
        (2, 'tech@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKxcQw8iBX24n4W', 'テック太郎', true, false, true, 1);
        
        SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));
    """)

    op.execute("""
        INSERT INTO job_postings (id, title, description, requirements, company_id, created_at) VALUES 
        (1, 'バックエンドエンジニア募集', 'Python/FastAPIを使用したバックエンド開発', '・Python経験3年以上\n・WebAPI開発経験\n・チーム開発経験', 1, NOW()),
        (2, 'フロントエンドエンジニア募集', 'React/Next.jsを使用したフロントエンド開発', '・React経験2年以上\n・TypeScript経験\n・UIデザインの知識', 1, NOW());
        
        SELECT setval('job_postings_id_seq', (SELECT MAX(id) FROM job_postings));
    """)

    op.execute("""
        INSERT INTO base_questions (id, job_posting_id, question_text, "order") VALUES 
        (1, 1, 'これまでのPythonでの開発経験について教えてください', 1),
        (2, 1, 'チーム開発での課題解決経験について教えてください', 2),
        (3, 2, 'Reactを選択した理由を教えてください', 1);
        
        SELECT setval('base_questions_id_seq', (SELECT MAX(id) FROM base_questions));
    """)

    op.execute("""
        INSERT INTO interviews (id, job_posting_id, candidate_name, candidate_email, interview_url, status, avatar_type, questions_generated) VALUES 
        (1, 1, '山田太郎', 'yamada@example.com', 'interview_123', 'pending', 'hayato', false),
        (2, 2, '鈴木花子', 'suzuki@example.com', 'interview_456', 'completed', 'hayato', true);
        
        SELECT setval('interviews_id_seq', (SELECT MAX(id) FROM interviews));
    """)

    op.execute("""
        INSERT INTO custom_questions (id, interview_id, question_text, "order") VALUES 
        (1, 1, 'あなたが最近取り組んだ技術的な課題について教えてください', 1),
        (2, 1, '今後のキャリアプランについて教えてください', 2),
        (3, 2, 'フロントエンド開発で重視していることは何ですか？', 1);
        
        SELECT setval('custom_questions_id_seq', (SELECT MAX(id) FROM custom_questions));
    """)

    op.execute("""
        INSERT INTO interview_responses (id, interview_id, question_id, question_type, question_text, answer_text, created_at) VALUES 
        (1, 1, 1, 'base', 'これまでのPythonでの開発経験について教えてください', 'Pythonを使用して...', NOW()),
        (2, 1, 2, 'base', 'チーム開発での課題解決経験について教えてください', 'チームでの開発では...', NOW()),
        (3, 2, 3, 'base', 'Reactを選択した理由を教えてください', 'Reactのコンポーネント指向が...', NOW());
        
        SELECT setval('interview_responses_id_seq', (SELECT MAX(id) FROM interview_responses));
    """)


def downgrade() -> None:
    # データの削除（順序に注意）
    op.execute("DELETE FROM interview_responses")
    op.execute("DELETE FROM custom_questions")
    op.execute("DELETE FROM interviews")
    op.execute("DELETE FROM base_questions")
    op.execute("DELETE FROM job_postings")
    op.execute("DELETE FROM users")
    op.execute("DELETE FROM companies")
