import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '../../../../components/layouts/MainLayout';
import { useAuth } from '../../../../contexts/AuthContext';
import apiClient from '../../../../api/client';
import dynamic from 'next/dynamic';
import { PlusIcon, MenuIcon, TrashIcon } from '@heroicons/react/24/outline';



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
  const [questions, setQuestions] = useState<{ id: number; text: string }[]>([]);

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

  useEffect(() => {
    if (responses.length > 0) {
      setQuestions(responses.map(r => ({ 
        id: r.id, 
        text: r.question_text 
      })));
    }
  }, [responses]);

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

  const handleQuestionChange = async (id: number, newText: string) => {
    try {
      await apiClient.put(`/api/v1/interviews/${interviewId}/responses/${id}`, {
        question_text: newText
      });
      setQuestions(questions.map(q => 
        q.id === id ? { ...q, text: newText } : q
      ));
    } catch (error) {
      console.error('Failed to update question:', error);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
    setQuestions(questions.filter(q => q.id !== id));
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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {interview && (
          <div className="space-y-6 w-full">
            {/* 面接詳細セクション */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  面接詳細
                </h3>
              </div>
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
            </div>

            {/* 質問一覧セクション */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  質問一覧
                </h3>
                <button
                  onClick={() => setQuestions([...questions, { id: questions.length + 1, text: '' }])}
                  className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <PlusIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="border-t border-gray-200">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="px-4 py-3 border-b border-gray-200 last:border-b-0 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) => {
                        // ローカルの状態のみを更新
                        setQuestions(questions.map(q => 
                          q.id === question.id ? { ...q, text: e.target.value } : q
                        ));
                      }}
                      onCompositionEnd={(e) => {
                        // IME入力確定時にAPIを呼び出し
                        handleQuestionChange(question.id, e.currentTarget.value);
                      }}
                      className="flex-1 block w-full py-3 px-4 border-2 border-gray-200 rounded-md shadow-sm 
                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        hover:border-gray-300 transition-colors duration-200
                        sm:text-sm"
                      placeholder="質問を入力してください"
                    />
                    <button
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 面接結果セクション */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg w-full">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  面接結果
                </h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                {/* 評価 */}
                <div className="mb-6">
                  <h4 className="text-base font-medium text-gray-900 mb-2">評価</h4>
                  <div className="flex items-center">
                    <span className="text-4xl font-bold text-purple-600">85</span>
                    <span className="text-sm text-gray-500 ml-2">/100点</span>
                  </div>
                </div>

                {/* サマリー */}
                <div className="mb-6">
                  <h4 className="text-base font-medium text-gray-900 mb-2">サマリー</h4>
                  <p className="text-sm text-gray-700">
                    技術力が高く、特にPythonでの開発経験が豊富。チームワークも良好で、コミュニケーション能力も高い。
                  </p>
                </div>

                {/* 面接動画 */}
                <div className="mb-6">
                  <h4 className="text-base font-medium text-gray-900 mb-2">面接動画</h4>
                  <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                    {interview.recording_url ? (
                      <video
                        src={getVideoUrl(interview.recording_url)}
                        controls
                        className="w-full h-full object-contain"
                        controlsList="nodownload"
                      >
                        <p>お使いのブラウザは動画の再生に対応していません。</p>
                      </video>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">動画がありません</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 面接テキスト */}
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-2">面接テキスト</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <p className="text-sm text-gray-900 mb-2">
                        <span className="font-medium">面接官:</span> これまでのPythonでの開発経験について教えてください。
                      </p>
                      <p className="text-sm text-gray-700 ml-4">
                        <span className="font-medium">応募者:</span> はい、私は3年間、Pythonを使用してWebアプリケーションの開発に携わってきました。主にDjangoフレームワークを使用して、ECサイトやCRMシステムの開発を行いました。特に印象に残っているのは、機械学習を活用した商品レコメンデーションシステムの実装です。
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 mb-2">
                        <span className="font-medium">面接官:</span> チーム開発での課題解決経験について教えてください。
                      </p>
                      <p className="text-sm text-gray-700 ml-4">
                        <span className="font-medium">応募者:</span> 前職では6人チームのテックリードとして、開発プロセスの改善を行いました。具体的には、CI/CDパイプラインの整備とコードレビュープロセスの確立により、デプロイ時間を50%削減し、バグの早期発見率を30%向上させることができました。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 