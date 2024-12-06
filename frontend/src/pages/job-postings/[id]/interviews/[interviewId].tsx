import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layouts/MainLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import { Interview, InterviewResponse, BaseQuestion, CustomQuestion } from '../../../../types';
import apiClient from '../../../../api/client';

export default function InterviewDetail() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: jobPostingId, interviewId } = router.query;
  const [interview, setInterview] = useState<Interview | null>(null);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [baseQuestions, setBaseQuestions] = useState<BaseQuestion[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newCustomQuestion, setNewCustomQuestion] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    if (jobPostingId && interviewId) {
      fetchInterview();
      fetchResponses();
      fetchBaseQuestions();
      fetchCustomQuestions();
    }
  }, [jobPostingId, interviewId]);

  const fetchInterview = async () => {
    try {
      const response = await apiClient.get<Interview>(`/api/v1/job-postings/${jobPostingId}/interviews/${interviewId}`);
      setInterview(response.data);
    } catch (error) {
      console.error('Failed to fetch interview:', error);
      setError('面接情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const response = await apiClient.get<InterviewResponse[]>(`/api/v1/interviews/${interviewId}/responses`);
      setResponses(response.data);
    } catch (error) {
      console.error('Failed to fetch responses:', error);
      setError('面接回答の取得に失敗しました');
    }
  };

  const fetchBaseQuestions = async () => {
    try {
      const response = await apiClient.get<BaseQuestion[]>(`/api/v1/interviews/${interviewId}/base-questions`);
      setBaseQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch base questions:', error);
    }
  };

  const fetchCustomQuestions = async () => {
    try {
      const response = await apiClient.get<CustomQuestion[]>(`/api/v1/interviews/${interviewId}/custom-questions`);
      setCustomQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch custom questions:', error);
    }
  };

  const handleAddCustomQuestion = async () => {
    if (!newCustomQuestion.trim()) return;

    try {
      const response = await apiClient.post(`/api/v1/interviews/${interviewId}/custom-questions`, {
        question_text: newCustomQuestion,
        order: customQuestions.length + 1
      });
      setCustomQuestions([...customQuestions, response.data]);
      setNewCustomQuestion('');
    } catch (error) {
      console.error('Failed to add custom question:', error);
      setError('カスタム質問の追加に失敗しました');
    }
  };

  const handleEditCustomQuestion = async (questionId: number) => {
    if (!editingQuestion) return;

    try {
      console.log('Editing custom question:', {
        questionId,
        question_text: editingQuestion.text
      });

      const response = await apiClient.put(
        `/api/v1/interviews/${interviewId}/custom-questions/${questionId}`,
        {
          question_text: editingQuestion.text
        }
      );

      console.log('Edit response:', response.data);
      setCustomQuestions(customQuestions.map(q => 
        q.id === questionId ? response.data : q
      ));
      setEditingQuestion(null);
    } catch (error) {
      console.error('Failed to edit custom question:', error);
      setError('カスタム質問の編集に失敗しました');
    }
  };

  const handleDeleteCustomQuestion = async (questionId: number) => {
    try {
      await apiClient.delete(`/api/v1/interviews/${interviewId}/custom-questions/${questionId}`);
      setCustomQuestions(customQuestions.filter(q => q.id !== questionId));
    } catch (error) {
      console.error('Failed to delete custom question:', error);
      setError('カスタム質問の削除に失敗しました');
    }
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-600">ログインが必要です</p>
        </div>
      </MainLayout>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p>読み込み中...</p>
        </div>
      </MainLayout>
    );
  }

  if (!interview) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-red-600">面接情報が見つかりません</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            {/* 基本情報セクション */}
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">面接詳細</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">補者名</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {interview.candidate_name}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {interview.candidate_email}
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">面接URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {interview.interview_url}
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {interview.status === 'pending' && '未実施'}
                    {interview.status === 'in_progress' && '実施中'}
                    {interview.status === 'completed' && '完了'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* 面接映像セクション（面接完了時のみ表示） */}
            {interview.status === 'completed' && interview.recording_url && (
              <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">面接映像</h3>
                <div className="aspect-w-16 aspect-h-9">
                  <video
                    src={interview.recording_url}
                    controls
                    className="rounded-lg shadow-lg"
                  >
                    お使いのブラウザは動画の再生に対応していません。
                  </video>
                </div>
              </div>
            )}

            {/* 質問と回答セクション */}
            {responses.length > 0 && (
              <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">質問と回答</h3>
                <div className="space-y-6">
                  {responses.map((response, index) => (
                    <div key={response.id} className="bg-gray-50 p-4 rounded-lg">
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-500">質問 {index + 1}:</span>
                        <p className="text-sm text-gray-900 mt-1">{response.question_text}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">回答:</span>
                        <p className="text-sm text-gray-900 mt-1">{response.response_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI評価セクション（面接完了時のみ表示） */}
            {interview.status === 'completed' && interview.ai_evaluation && (
              <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">AI評価</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">総合評価点</h4>
                    <p className="text-2xl font-bold text-indigo-600">{interview.ai_evaluation.score} / 100</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">ポジティブな見解</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {interview.ai_evaluation.positive_points.map((point, index) => (
                        <li key={index} className="text-sm text-gray-900">{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">ネガティブな見解</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {interview.ai_evaluation.negative_points.map((point, index) => (
                        <li key={index} className="text-sm text-gray-900">{point}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">総合評価</h4>
                    <p className="text-sm text-gray-900">{interview.ai_evaluation.overall_evaluation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ベース質問セクション */}
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">ベース質問</h3>
              <div className="space-y-4">
                {baseQuestions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">
                      {index + 1}. {question.question_text}
                    </p>
                  </div>
                ))}
                {baseQuestions.length === 0 && (
                  <p className="text-sm text-gray-500">ベース質問はまだありません</p>
                )}
              </div>
            </div>

            {/* カスタム質問セクション */}
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">カスタム質問</h3>
              
              {/* 新規質問追加フォーム */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCustomQuestion}
                    onChange={(e) => setNewCustomQuestion(e.target.value)}
                    placeholder="新しい質問を入力"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddCustomQuestion}
                    className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    追加
                  </button>
                </div>
              </div>

              {/* 質問リスト */}
              <div className="space-y-4">
                {customQuestions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                    {editingQuestion?.id === question.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingQuestion.text}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, text: e.target.value })}
                          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                        <button
                          onClick={() => handleEditCustomQuestion(question.id)}
                          className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingQuestion(null)}
                          className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-900">
                          {index + 1}. {question.question_text}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingQuestion({ id: question.id, text: question.question_text })}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteCustomQuestion(question.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {customQuestions.length === 0 && (
                  <p className="text-sm text-gray-500">カスタム質問はまだありません</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 