import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layouts/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { BaseQuestion, BaseQuestionCreate } from '../../types';
import apiClient from '../../api/client';

export default function BaseQuestions() {
  const { user } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<BaseQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<BaseQuestion | null>(null);
  const [newQuestion, setNewQuestion] = useState<BaseQuestionCreate>({
    question_text: '',
    order: 1,
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await apiClient.get<BaseQuestion[]>('/api/v1/base-questions');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch base questions:', error);
      setError('ベース質問の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post<BaseQuestion>('/api/v1/base-questions', newQuestion);
      setIsCreateModalOpen(false);
      fetchQuestions();
      setNewQuestion({
        question_text: '',
        order: 1,
      });
    } catch (error) {
      console.error('Failed to create base question:', error);
      setError('ベース質問の作成に失敗しました');
    }
  };

  const handleEditQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;

    try {
      await apiClient.put<BaseQuestion>(`/api/v1/base-questions/${editingQuestion.id}`, {
        question_text: editingQuestion.question_text,
        order: editingQuestion.order,
      });
      setIsEditModalOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to update base question:', error);
      setError('ベース質問の更新に失敗しました');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    if (!confirm('この質問を削除してもよろしいですか？')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/base-questions/${questionId}`);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to delete base question:', error);
      setError('ベース質問の削除に失敗しました');
    }
  };

  const openEditModal = (question: BaseQuestion) => {
    setEditingQuestion(question);
    setIsEditModalOpen(true);
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

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-gray-900">ベース質問設定</h1>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              質問を追加
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {questions.map((question) => (
                <li key={question.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {question.order}. {question.question_text}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(question)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {questions.length === 0 && (
                <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  ベース質問はまだ登録されていません
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* 質問追加モーダル */}
      {isCreateModalOpen && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    ベース質問の追加
                  </h3>
                  <div className="mt-4">
                    <form onSubmit={handleCreateQuestion}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="questionText" className="block text-sm font-medium text-gray-700">
                            質問内容
                          </label>
                          <textarea
                            id="questionText"
                            rows={3}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={newQuestion.question_text}
                            onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor="order" className="block text-sm font-medium text-gray-700">
                            表示順
                          </label>
                          <input
                            type="number"
                            id="order"
                            min="1"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={newQuestion.order}
                            onChange={(e) => setNewQuestion({ ...newQuestion, order: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                        >
                          追加
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsCreateModalOpen(false)}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 質問編集モーダル */}
      {isEditModalOpen && editingQuestion && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    ベース質問の編集
                  </h3>
                  <div className="mt-4">
                    <form onSubmit={handleEditQuestion}>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="editQuestionText" className="block text-sm font-medium text-gray-700">
                            質問内容
                          </label>
                          <textarea
                            id="editQuestionText"
                            rows={3}
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={editingQuestion.question_text}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor="editOrder" className="block text-sm font-medium text-gray-700">
                            表示順
                          </label>
                          <input
                            type="number"
                            id="editOrder"
                            min="1"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={editingQuestion.order}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, order: parseInt(e.target.value) })}
                          />
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                        <button
                          type="submit"
                          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                        >
                          更新
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditModalOpen(false);
                            setEditingQuestion(null);
                          }}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
} 