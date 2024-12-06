"""Initial migration

Revision ID: 2627c90a368b
Revises: 
Create Date: 2024-12-04 05:40:05.464773

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision: str = '2627c90a368b'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create users table
    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_companyuser', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('company_id', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # Create companies table
    op.create_table('companies',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create job_postings table
    op.create_table('job_postings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('requirements', sa.Text(), nullable=False),
        sa.Column('company_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=func.now()),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create base_questions table
    op.create_table('base_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_posting_id', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create interviews table
    op.create_table('interviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_posting_id', sa.Integer(), nullable=False),
        sa.Column('candidate_name', sa.String(), nullable=False),
        sa.Column('candidate_email', sa.String(), nullable=False),
        sa.Column('interview_url', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),
        sa.Column('avatar_type', sa.String(), nullable=False, server_default='hayato'),
        sa.Column('recording_url', sa.String(), nullable=True),
        sa.Column('resume_url', sa.String(), nullable=True),
        sa.Column('cv_url', sa.String(), nullable=True),
        sa.Column('ai_evaluation', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=func.now(), onupdate=func.now()),
        sa.ForeignKeyConstraint(['job_posting_id'], ['job_postings.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create custom_questions table
    op.create_table('custom_questions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('interview_id', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Create interview_responses table
    op.create_table('interview_responses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('interview_id', sa.Integer(), nullable=False),
        sa.Column('question_id', sa.Integer(), nullable=False),
        sa.Column('question_type', sa.String(), nullable=False),
        sa.Column('response_text', sa.Text(), nullable=False),
        sa.Column('response_time', sa.DateTime(), nullable=False, server_default=func.now()),
        sa.ForeignKeyConstraint(['interview_id'], ['interviews.id'], ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('interview_responses')
    op.drop_table('custom_questions')
    op.drop_table('interviews')
    op.drop_table('base_questions')
    op.drop_table('job_postings')
    op.drop_table('companies')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
