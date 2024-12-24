import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../components/layouts/MainLayout';
import { useAuth } from '../../contexts/AuthContext';
import { JobPosting } from '../../types';
import apiClient from '../../api/client';

export default function JobPostings() {
  const { user } = useAuth();
  const router = useRouter();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchJobPostings = async () => {
      try {
        const response = await apiClient.get('/api/v1/job-postings');
        setJobPostings(response.data);
      } catch (error) {
        console.error('Failed to fetch job postings:', error);
        setError('求人情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchJobPostings();
  }, []);

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
            <h1 className="text-2xl font-semibold text-gray-900">求人管理</h1>
            <button
              onClick={() => router.push('/job-postings/create')}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              新規求人作成
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {jobPostings.map((posting) => (
                <li key={posting.id}>
                  <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-indigo-600 truncate">
                          {posting.title}
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500 truncate">
                            {posting.description}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex items-center space-x-4">
                        <button
                          onClick={() => router.push(`/job-postings/${posting.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 p-2 rounded-full hover:bg-indigo-50 transition-colors duration-200"
                          title="詳細を表示"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => router.push(`/job-postings/${posting.id}/edit`)}
                          className="text-gray-600 hover:text-gray-900 p-2 rounded-full hover:bg-gray-50 transition-colors duration-200"
                          title="求人を編集"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                            <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      <p>作成日: {new Date(posting.createdAt).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 