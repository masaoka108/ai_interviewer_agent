// ユーザー関連の型定義
export interface User {
  id: number;
  email: string;
  fullName: string | null;
  isActive: boolean;
  isSuperuser: boolean;
  isCompanyuser: boolean;
  companyId: number | null;
}

// 企業関連の型定義
export interface Company {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

// 求人関連の型定義
export interface JobPosting {
  id: number;
  title: string;
  description: string;
  requirements: string;
  companyId: number;
  createdAt: string;
  baseQuestions: BaseQuestion[];
}

// 質問関連の型定義
export interface BaseQuestion {
  id: number;
  question_text: string;
  order: number;
}

export interface BaseQuestionCreate {
  question_text: string;
  order: number;
}

export interface CustomQuestion {
  id: number;
  interview_id: number;
  question_text: string;
  order: number;
}

// 面接関連の型定義
export interface InterviewData {
  id: number;
  job_posting_id: number;
  candidate_name: string;
  candidate_email: string;
  interview_url: string;
  avatar_type: 'male' | 'female';
  status: 'pending' | 'in_progress' | 'completed';
  resume_url?: string;
  cv_url?: string;
  recording_url?: string;
  custom_questions?: string[];
  questions_generated?: boolean;
  created_at: string;
  updated_at: string;
}

export interface InterviewResponse {
  id: number;
  interview_id: number;
  question_text: string;
  response_text: string;
  response_time: string;
}

export interface AIEvaluation {
  score: number;  // 100点満点
  positive_points: string[];
  negative_points: string[];
  overall_evaluation: string;
} 