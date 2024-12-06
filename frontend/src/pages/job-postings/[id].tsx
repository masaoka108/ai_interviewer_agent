import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layouts/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { JobPosting, Interview } from '../../types';
import apiClient from '../../api/client';

interface CreateInterviewFormData {
  candidateName: string;
  candidateEmail: string;
  scheduledAt: string;
  avatarType: 'male' | 'female';
}

export default function JobPostingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [jobPosting, setJobPosting] = useState<JobPosting | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateInterviewFormData>({
    candidateName: '',
    candidateEmail: '',
    scheduledAt: '',
    avatarType: 'male',
  });

  useEffect(() => {
    if (id) {
      fetchJobPosting();
      fetchInterviews();
    }
  }, [id]);

  const fetchJobPosting = async () => {
    try {
      const response = await apiClient.get(`/api/v1/job-postings/${id}`);
      setJobPosting(response.data);
    } catch (error) {
      console.error('Failed to fetch job posting:', error);
      setError('求人情報の取得に失敗しました');
    }
  };

  const fetchInterviews = async () => {
    if (!id) return;

    try {
      console.log('Fetching interviews for job posting:', id);
      const response = await apiClient.get('/api/v1/interviews', {
        params: {
          job_posting_id: Number(id)
        },
        headers: {
          'Accept': 'application/json',
        }
      });
      console.log('Fetched interviews:', response.data);
      setInterviews(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to fetch interviews:', error.response?.data || error);
      setError(error.response?.data?.detail || '面接一覧の取得に失敗しました');
      setInterviews([]);  // エラー時は空配列をセット
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const interviewData = {
        job_posting_id: Number(id),
        candidate_name: formData.candidateName,
        candidate_email: formData.candidateEmail,
        avatar_type: formData.avatarType,
      };
      console.log('Creating interview with data:', interviewData);

      const response = await apiClient.post('/api/v1/interviews', interviewData);
      
      if (response.data) {
        console.log('Created interview:', response.data);
        setIsModalOpen(false);
        await fetchInterviews();  // 面接一覧を再取得
        // フォームをリセット
        setFormData({
          candidateName: '',
          candidateEmail: '',
          scheduledAt: '',
          avatarType: 'male',
        });
      }
    } catch (error: any) {
      console.error('Failed to create interview:', error.response?.data || error);
      setError(error.response?.data?.detail || '面接の作成に失敗しました');
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

  return (
    <MainLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {jobPosting && (
            <>
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">{jobPosting.title}</h1>
              </div>

              <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">求人詳細</h3>
                </div>
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">説明</dt>
                      <dd className="mt-1 text-sm text-gray-900">{jobPosting.description}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">応募要件</dt>
                      <dd className="mt-1 text-sm text-gray-900">{jobPosting.requirements}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium text-gray-900">面接一覧</h2>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    面接を作成
                  </button>
                </div>
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <ul className="divide-y divide-gray-200">
                    {interviews.map((interview) => (
                      <li key={interview.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-indigo-600">{interview.candidate_name}</h4>
                            <p className="text-sm text-gray-500">{interview.candidate_email}</p>
                            <p className="text-sm text-gray-500">
                              予定日時: {new Date(interview.scheduled_at).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p className="text-sm text-gray-500">
                              ステータス: {interview.status === 'scheduled' ? '予定' : '完了'}
                            </p>
                            <p className="text-sm text-gray-500">
                              アバター: {interview.avatar_type === 'male' ? 'はやと（男性）' : 'えりか（女性）'}
                            </p>
                          </div>
                          <div className="flex flex-col items-end space-y-2">
                            <a
                              href={`/interviews/${interview.interview_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              面接URL
                            </a>
                            <button
                              onClick={() => router.push(`/job-postings/${id}/interviews/${interview.id}`)}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              詳細
                            </button>
                            {interview.status === 'completed' && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                面接完了
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                    {interviews.length === 0 && (
                      <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                        面接はまだ登録されていません
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* 面接作成モーダル */}
          {isModalOpen && (
            <div className="fixed z-10 inset-0 overflow-y-auto">
              <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                  <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">面接の作成</h3>
                      <div className="mt-4">
                        <form onSubmit={handleCreateInterview}>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="candidateName" className="block text-sm font-medium text-gray-700">
                                候補者名
                              </label>
                              <input
                                type="text"
                                id="candidateName"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.candidateName}
                                onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor="candidateEmail" className="block text-sm font-medium text-gray-700">
                                候補者メールアドレス
                              </label>
                              <input
                                type="email"
                                id="candidateEmail"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.candidateEmail}
                                onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                              />
                            </div>
                            <div>
                              <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700">
                                面接予定日時
                              </label>
                              <input
                                type="datetime-local"
                                id="scheduledAt"
                                required
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={formData.scheduledAt}
                                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">アバタータイプ</label>
                              <div className="mt-4 grid grid-cols-2 gap-4">
                                <label className="relative flex flex-col items-center bg-white border rounded-lg cursor-pointer hover:border-indigo-500 p-4">
                                  <img
                                    src="/avatars/male-avatar.png"
                                    alt="はやと（男性）"
                                    className="w-32 h-32 object-cover rounded-lg mb-2"
                                  />
                                  <input
                                    type="radio"
                                    name="avatarType"
                                    value="male"
                                    checked={formData.avatarType === 'male'}
                                    onChange={(e) => setFormData({ ...formData, avatarType: 'male' })}
                                    className="sr-only"
                                  />
                                  <span className="text-sm font-medium text-gray-900">はやと（男性）</span>
                                  <span
                                    className={`absolute -inset-px rounded-lg border-2 pointer-events-none ${
                                      formData.avatarType === 'male'
                                        ? 'border-indigo-500'
                                        : 'border-transparent'
                                    }`}
                                    aria-hidden="true"
                                  />
                                </label>
                                <label className="relative flex flex-col items-center bg-white border rounded-lg cursor-pointer hover:border-indigo-500 p-4">
                                  <img
                                    src="/avatars/female-avatar.png"
                                    alt="えりか（女性）"
                                    className="w-32 h-32 object-cover rounded-lg mb-2"
                                  />
                                  <input
                                    type="radio"
                                    name="avatarType"
                                    value="female"
                                    checked={formData.avatarType === 'female'}
                                    onChange={(e) => setFormData({ ...formData, avatarType: 'female' })}
                                    className="sr-only"
                                  />
                                  <span className="text-sm font-medium text-gray-900">えりか（女性）</span>
                                  <span
                                    className={`absolute -inset-px rounded-lg border-2 pointer-events-none ${
                                      formData.avatarType === 'female'
                                        ? 'border-indigo-500'
                                        : 'border-transparent'
                                    }`}
                                    aria-hidden="true"
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                            <button
                              type="submit"
                              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                            >
                              作成
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsModalOpen(false)}
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
        </div>
      </div>
    </MainLayout>
  );
} 