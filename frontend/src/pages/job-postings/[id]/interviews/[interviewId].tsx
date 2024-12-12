import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layouts/MainLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import apiClient from '../../../../api/client';

interface InterviewResponse {
  id: number;
  question_text: string;
  answer_text: string;
  question_type: string;
}

interface Interview {
  id: number;
  candidate_name: string;
  candidate_email: string;
  status: string;
  recording_url: string | null;
}

export default function InterviewDetail() {
  const router = useRouter();
  const { user } = useAuth();
  const { id, interviewId } = router.query;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interview, setInterview] = useState<Interview | null>(null);
  const [responses, setResponses] = useState<InterviewResponse[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!interviewId || !user || !mounted) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        // 面接の基本情報を取得
        const interviewResponse = await apiClient.get(`/api/v1/interviews/${interviewId}`);
        setInterview(interviewResponse.data);

        // 面接の回答データを取得
        const responsesResponse = await apiClient.get(`/api/v1/interviews/${interviewId}/responses`);
        setResponses(responsesResponse.data);
      } catch (error) {
        console.error('Failed to fetch interview data:', error);
        setError('面接データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [interviewId, user, mounted]);

  // 映像URLを構築する関数
  const getVideoUrl = (recordingUrl: string) => {
    // バックエンドのベースURLを取得（API_URLからベースURLを抽出）
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    
    // recording_urlが完全なURLの場合はそのまま返す
    if (recordingUrl.startsWith('http')) {
      return recordingUrl;
    }
    // 相対パスの場合は、ベースURLと組み合わせる
    // 先頭のスラッシュを確認
    const cleanRecordingUrl = recordingUrl.startsWith('/') ? recordingUrl.slice(1) : recordingUrl;
    return `${baseUrl}/${cleanRecordingUrl}`;
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {interview && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                面接詳細
              </h3>
            </div>
            
            {/* 面接情報 */}
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">応募者名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{interview.candidate_name}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900">{interview.candidate_email}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                  <dd className="mt-1 text-sm text-gray-900">{interview.status}</dd>
                </div>
              </dl>
            </div>

            {/* 面接映像セクション */}
            {interview.recording_url && (
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  面接映像
                </h3>
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                  <video
                    src={getVideoUrl(interview.recording_url)}
                    controls
                    className="w-full h-full object-contain"
                    controlsList="nodownload"
                  >
                    <p>お使いのブラウザは動画の再生に対応していません。</p>
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
                        <p className="text-sm text-gray-900 mt-1">{response.answer_text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
} 