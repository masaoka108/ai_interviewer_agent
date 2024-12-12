import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CandidateLayout from '@/components/layouts/CandidateLayout';
import publicApiClient from '@/lib/publicApiClient';
import { InterviewData } from '@/types';

export default function InterviewComplete() {
  const router = useRouter();
  const { url } = router.query;
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!router.isReady) return;
    
    if (!url || url === 'undefined') {
      console.error('Invalid interview URL:', url);
      setError('無効な面接URLです');
      return;
    }

    const fetchInterview = async () => {
      try {
        const response = await publicApiClient.get(`/interviews/url/${url}`);
        if (response.data) {
          setInterview(response.data);
        } else {
          setError('面接データが見つかりませんでした');
        }
      } catch (error: any) {
        console.error('Failed to fetch interview:', error);
        setError('面接データの取得に失敗しました');
      }
    };

    fetchInterview();
  }, [url, router.isReady]);

  if (error) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </CandidateLayout>
    );
  }

  if (!interview) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-6">
                <img
                  src={interview.avatar_type === 'male' 
                    ? '/avatars/male-avatar.png' 
                    : '/avatars/female-avatar.png'}
                  alt="AI面接官"
                  className="w-32 h-32 object-cover"
                />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                面接完了
              </h2>
              <p className="text-lg text-gray-700 whitespace-pre-line">
                本日は面接ありがとうございました。{'\n'}
                結果は追って連絡しますので引き続きよろしくお願いします。
              </p>
            </div>
            <div className="text-center">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        </div>
      </div>
    </CandidateLayout>
  );
} 