import { useEffect, useState } from 'react';
import MainLayout from '../components/layouts/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { JobPosting } from '../types';
import apiClient from '../api/client';

export default function Home() {
  const { user } = useAuth();
  const [activeJobPostings, setActiveJobPostings] = useState<JobPosting[]>([]);

  useEffect(() => {
    const fetchActiveJobPostings = async () => {
      try {
        const response = await apiClient.get('/job-postings/active');
        setActiveJobPostings(response.data);
      } catch (error) {
        console.error('Failed to fetch active job postings:', error);
      }
    };

    fetchActiveJobPostings();
  }, []);

  return (
    <MainLayout>
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-indigo-600 font-semibold tracking-wide uppercase">
            採用面接AIエージェント
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              次世代の採用プロセスを実現
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              AIが面接を行い、候補者の適性を客観的に評価します。
              時間や場所にとらわれない、効率的な採用プロセスを実現します。
            </p>
          </div>

          {user ? (
            <div className="mt-10">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {user.companyId ? '自社の求人管理' : '現在公開中の求人'}
              </h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {activeJobPostings.map((posting) => (
                  <div
                    key={posting.id}
                    className="bg-white overflow-hidden shadow rounded-lg"
                  >
                    <div className="px-4 py-5 sm:p-6">
                      <h4 className="text-lg font-medium text-gray-900">
                        {posting.title}
                      </h4>
                      <p className="mt-2 text-sm text-gray-500">
                        {posting.description.substring(0, 150)}...
                      </p>
                    </div>
                    <div className="bg-gray-50 px-4 py-4 sm:px-6">
                      <div className="text-sm">
                        <a
                          href={`/job-postings/${posting.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                          詳細を見る
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-10 text-center">
              <a
                href="/login"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                ログインして始める
              </a>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 