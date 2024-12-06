import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { InterviewData } from '@/types';
import CandidateLayout from '@/components/layouts/CandidateLayout';
import { GetServerSideProps } from 'next';

interface InterviewRoomProps {
  initialInterview: InterviewData | null;
  error?: string;
}

interface UploadedFiles {
  resume: boolean;
  cv: boolean;
}

export default function InterviewRoom({ initialInterview, error: initialError }: InterviewRoomProps) {
  const router = useRouter();
  const { url } = router.query;
  const [interview, setInterview] = useState<InterviewData | null>(initialInterview);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDocumentsUploaded, setIsDocumentsUploaded] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isQuestionsGenerated, setIsQuestionsGenerated] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    resume: false,
    cv: false,
  });
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // 初期データの設定を監視
  useEffect(() => {
    console.log('Initial interview data updated:', initialInterview);
    if (initialInterview) {
      setInterview(initialInterview);
      setError('');
      // 書類のアップロード状態を確認
      const hasResume = !!initialInterview.resume_url;
      const hasCV = !!initialInterview.cv_url;
      setUploadedFiles({
        resume: hasResume,
        cv: hasCV
      });
      // 書類がアップロード済みの場合は質問生成状態を確認
      if (hasResume && hasCV) {
        setIsDocumentsUploaded(true);
        setIsQuestionsGenerated(!!initialInterview.questions_generated);
      }
    }
  }, [initialInterview]);

  // ファイルアップロード状態の監視
  useEffect(() => {
    console.log('Upload status changed:', uploadedFiles);
    if (uploadedFiles.resume && uploadedFiles.cv) {
      setIsDocumentsUploaded(true);
    }
  }, [uploadedFiles]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'resume' | 'cv') => {
    const file = event.target.files?.[0];
    if (!file || !interview) return;

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    try {
      console.log('Uploading file:', type);
      const response = await apiClient.post(
        `/interviews/${interview.id}/upload-document?type=${type}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.status === 200) {
        console.log('File upload successful:', type);
        setUploadedFiles(prev => ({
          ...prev,
          [type]: true
        }));
      }
    } catch (error: any) {
      console.error('File upload failed:', error);
      setError(
        error.response?.data?.message || 
        'ファイルのアップロードに失敗しました。ファイル形式とサイズを確認してください。'
      );
      setUploadedFiles(prev => ({
        ...prev,
        [type]: false
      }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!interview) return;
    
    setIsGeneratingQuestions(true);
    setError('');

    try {
      console.log('Generating questions for interview:', interview.id);
      const response = await apiClient.post(`/interviews/${interview.id}/generate-questions`);
      
      if (response.status === 200) {
        console.log('Questions generated successfully:', response.data);
        setInterview(response.data);  // 更新された面接データで状態を更新
        setIsQuestionsGenerated(true);
      }
    } catch (error: any) {
      console.error('Failed to generate questions:', error);
      setError(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        '質問の生成に失敗しました。しばらく待ってから再度お試しください。'
      );
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const startRecording = async () => {
    if (!interview || !url) return;
    
    try {
      // 面接ステータスを更新
      const response = await apiClient.put(`/interviews/url/${url}/status`, {
        status: 'in_progress'
      });
      if (response.status === 200) {
        setIsRecording(true);
        setInterview(response.data);
        // 面接画面に遷移
        router.push(`/interviews/${url}/session`);
      }
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      setError(error.response?.data?.detail || '録画の開始に失敗しました');
    }
  };

  if (loading) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-screen">読み込み中...</div>
      </CandidateLayout>
    );
  }

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
          <div className="text-gray-600">
            面接情報を読み込んでいます...
          </div>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h1 className="text-xl font-semibold text-gray-900 mb-8">
                面接準備
              </h1>

              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-8">
                {/* 書類アップロードセクション */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    1. 書類のアップロード
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        履歴書 {uploadedFiles.resume && '✓'}
                      </label>
                      {uploadedFiles.resume ? (
                        <div className="mt-1 text-sm text-green-600">
                          アップロード済み
                        </div>
                      ) : (
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(e, 'resume')}
                          className="mt-1 block w-full"
                          accept=".pdf,.doc,.docx"
                          disabled={isUploading}
                        />
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        職務経歴書 {uploadedFiles.cv && '✓'}
                      </label>
                      {uploadedFiles.cv ? (
                        <div className="mt-1 text-sm text-green-600">
                          アップロード済み
                        </div>
                      ) : (
                        <input
                          type="file"
                          onChange={(e) => handleFileUpload(e, 'cv')}
                          className="mt-1 block w-full"
                          accept=".pdf,.doc,.docx"
                          disabled={isUploading}
                        />
                      )}
                    </div>
                    {!isDocumentsUploaded && (
                      <button
                        onClick={handleGenerateQuestions}
                        disabled={!isDocumentsUploaded || isGeneratingQuestions}
                        className={`w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                          ${isDocumentsUploaded && !isGeneratingQuestions
                            ? 'bg-indigo-600 hover:bg-indigo-700'
                            : 'bg-gray-400 cursor-not-allowed'
                          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      >
                        {isGeneratingQuestions ? '質問を生成中...' : '履歴書と職務経歴書をアップロードする'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 面接開始セクション */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    2. 面接開始
                  </h2>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      面接を開始する前に、以下の準備をお願いします：
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                      <li>カメラとマイクの準備</li>
                      <li>静かな環境の確保</li>
                      <li>十分な明るさの確保</li>
                      <li>安定したインターネット接続の確認</li>
                    </ul>
                    <button
                      onClick={() => startRecording()}
                      disabled={!isDocumentsUploaded}
                      className={`w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                        ${isDocumentsUploaded
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-gray-400 cursor-not-allowed'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                    >
                      {isRecording ? '録画中...' : '面接を開始する'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CandidateLayout>
  );
}

export const getServerSideProps: GetServerSideProps<InterviewRoomProps> = async (context) => {
  const { url } = context.params || {};
  console.log('Server-side props - URL parameter:', url);

  if (!url || typeof url !== 'string') {
    console.log('Invalid URL parameter');
    return {
      props: {
        initialInterview: null,
        error: '無効なURLです',
      },
    };
  }

  try {
    console.log('Attempting to fetch interview data server-side');
    const response = await apiClient.get(`/interviews/by-url/${url}`);
    console.log('Server-side API response:', response.data);
    
    return {
      props: {
        initialInterview: response.data,
      },
    };
  } catch (error: any) {
    console.error('Server-side fetch error:', error);
    return {
      props: {
        initialInterview: null,
        error: '面接情報の取得に失敗しました',
      },
    };
  }
}; 