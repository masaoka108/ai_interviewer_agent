import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import CandidateLayout from '@/components/layouts/CandidateLayout';
import { apiClient } from '@/lib/apiClient';
import { InterviewData, CustomQuestion, BaseQuestion } from '@/types';
import Image from 'next/image';

export default function InterviewSession() {
  console.log('InterviewSession component rendering');
  const router = useRouter();
  const { url } = router.query;
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [baseQuestions, setBaseQuestions] = useState<BaseQuestion[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isBaseQuestion, setIsBaseQuestion] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [hasMediaPermissions, setHasMediaPermissions] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [isRecognitionEnabled, setIsRecognitionEnabled] = useState(false);
  const retryCountRef = useRef(0);
  const MAX_RETRY_COUNT = 3;
  const RETRY_DELAY = 2000;
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isVideoElementMounted, setIsVideoElementMounted] = useState(false);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const autoRestartRef = useRef(false);

  // 音声認識の結果を処理
  const handleSpeechResult = useCallback((event: SpeechRecognitionEvent) => {
    console.log('Speech recognition result received');
    const results = Array.from(event.results);
    
    let finalTranscript = '';
    let currentInterim = '';

    results.forEach(result => {
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        currentInterim += result[0].transcript;
      }
    });

    if (finalTranscript) {
      console.log('Final transcript:', finalTranscript);
      setTranscription(prev => prev + finalTranscript + ' ');
    }
    
    if (currentInterim) {
      console.log('Interim transcript:', currentInterim);
      setInterimTranscript(currentInterim);
    }
  }, []);

  // 音声認識の開始
  const startSpeechRecognition = useCallback(async () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not initialized');
      return;
    }

    try {
      // 既に開始している場合は一旦停止
      if (isListening) {
        console.log('Recognition is already running, stopping first...');
        try {
          recognitionRef.current.stop();
          await new Promise(resolve => setTimeout(resolve, 100)); // 短い待機時間を設定
        } catch (error) {
          console.log('Error stopping existing recognition:', error);
        }
      }

      console.log('Starting speech recognition...');
      recognitionRef.current.start();
      setIsRecognitionEnabled(true);
      setIsListening(true);
      autoRestartRef.current = true;
      console.log('Speech recognition started successfully');
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setError('マイクの使用が許可されていません');
      } else {
        setError('音声認識の開始に失敗しました');
      }
      setIsRecognitionEnabled(false);
      setIsListening(false);
      autoRestartRef.current = false;
    }
  }, [isListening]);

  // 音声認識の停止
  const stopSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) {
      return;
    }

    try {
      console.log('Stopping speech recognition...');
      autoRestartRef.current = false;
      recognitionRef.current.stop();
      setIsRecognitionEnabled(false);
      setIsListening(false);
      console.log('Speech recognition stopped successfully');
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      // エラーが発生しても状態をリセット
      setIsRecognitionEnabled(false);
      setIsListening(false);
    }
  }, []);

  // 音声認識の初期化
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    console.log('Initializing speech recognition...');
    
    // ブラウザ固有の SpeechRecognition オブジェクトを取得
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      setBrowserSupported(false);
      setError('このブラウザは音声認識に対応していません。Chromeブラウザの使用を推奨します。');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP';

    recognition.onstart = () => {
      console.log('Speech recognition service has started');
      setIsListening(true);
    };

    recognition.onend = () => {
      console.log('Speech recognition service disconnected');
      setIsListening(false);
      
      // 自動再開が有効な場合は再起動
      if (autoRestartRef.current && isRecognitionEnabled) {
        console.log('Automatically restarting speech recognition...');
        try {
          setTimeout(() => {
            if (autoRestartRef.current && !isListening) {
              recognition.start();
            }
          }, 100);
        } catch (error) {
          console.error('Error restarting recognition:', error);
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('マイクの使用が許可されていません。ブラウザの設定を確認してください。');
      } else if (event.error === 'no-speech') {
        console.log('No speech detected');
      } else {
        setError('音声認識でエラーが発生しました');
      }
      setIsListening(false);
      autoRestartRef.current = false;
    };

    recognition.onresult = handleSpeechResult;

    recognitionRef.current = recognition;
    setIsInitialized(true);

    return () => {
      if (recognitionRef.current) {
        try {
          autoRestartRef.current = false;
          recognitionRef.current.stop();
        } catch (error) {
          console.log('Error cleaning up recognition:', error);
        }
      }
    };
  }, [handleSpeechResult, isRecognitionEnabled]);

  // メディアデバイスの権限を要求
  const requestMediaPermissions = useCallback(async () => {
    try {
      console.log('Requesting media permissions...');
      setShowPermissionDialog(true);
      setError('');

      // デバイスの存在確認
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);

      // デバイスのリセット処理
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // ブラウザの権限状態をリセット
      await navigator.mediaDevices.getUserMedia({ audio: false, video: false })
        .catch(() => console.log('Resetting permissions...'));

      // まずマイクの権限を要求
      console.log('Requesting microphone permission...');
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('Microphone permission granted');
      
      // 次にカメラの権限を要求
      console.log('Requesting camera permission...');
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      console.log('Camera permission granted');

      // ストリームの結合
      const tracks = [...audioStream.getTracks(), ...videoStream.getTracks()];
      const combinedStream = new MediaStream(tracks);

      if (videoRef.current) {
        videoRef.current.srcObject = combinedStream;
        mediaStreamRef.current = combinedStream;
      } else {
        tracks.forEach(track => track.stop());
      }

      setHasMediaPermissions(true);
      setShowPermissionDialog(false);
      console.log('All media permissions granted');
      return true;

    } catch (error) {
      console.error('Error requesting media permissions:', error);
      let errorMessage = 'デバイスの使用許可が必要です。';
      
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'カメラまたはマイクが見つかりません。以下をご確認ください：\n' +
            '1. デバイスが正しく接続されているか\n' +
            '2. ブラウザの設定でデバイスがブロックされていないか\n' +
            '3. 他のアプリケーションがデバイスを使用していないか';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'カメラとマイクの使用が許可されていません。ブラウザの設定から許可してください。\n' +
            'Chrome の場合: chrome://settings/content/camera と chrome://settings/content/microphone';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'デバイスにアクセスできません。他のアプリケーションが使用している可能性があります。';
        }
      }
      
      setError(errorMessage);
      setShowPermissionDialog(false);
      setHasMediaPermissions(false);
      return false;
    }
  }, []);

  // 音声認識の制御
  const toggleSpeechRecognition = useCallback(() => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  }, [isListening, startSpeechRecognition, stopSpeechRecognition]);

  // ビデオ要素のマウント状態を監視
  useEffect(() => {
    console.log('Checking video element mount status');
    if (videoRef.current) {
      console.log('Video element mounted');
      setIsVideoElementMounted(true);
    }
  }, []);

  // カメラの初期化
  const startCamera = useCallback(async () => {
    try {
      if (!videoRef.current) {
        console.error('Video element not found');
        return;
      }

      // 既存のストリームをクリーンアップ
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      mediaStreamRef.current = stream;
      setIsCameraReady(true);
      console.log('Camera initialized successfully');

    } catch (error) {
      console.error('Error initializing camera:', error);
      let errorMessage = 'カメラの初期化に失敗しました。';
      
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage = 'カメラが見つかりません。デバイスが正しく接続されているか確認してください。';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'カメラの使用が許可されていません。ブラウザの設定から許可してください。';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'カメラにアクセスできません。他のアプリケーションが使用している可能性があります。';
        }
      }
      
      setError(errorMessage);
      throw error;
    }
  }, []);

  // カメラの停止
  const stopCamera = useCallback(() => {
    console.log('Stopping camera...');
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  }, []);

  // 録画の開始
  const startRecording = (stream: MediaStream) => {
    try {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        saveRecording(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setError('録画の開始に失敗しました');
    }
  };

  // 録画の停止
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 録画の保存
  const saveRecording = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('video', blob, 'interview-recording.webm');
      await apiClient.post(`/interviews/${interview?.id}/recording`, formData);
    } catch (error) {
      console.error('Failed to save recording:', error);
      setError('録画の保存に失敗しました');
    }
  };

  // ブラウザのチェック
  useEffect(() => {
    const checkBrowser = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isBrave = userAgent.includes('brave') || navigator.brave;
      
      if (isBrave) {
        console.log('Brave browser detected');
        setError('Braveブラウザでは音声認識機能が制限される可能性があります。Chromeブラウザの使用を推奨します。');
        setBrowserSupported(false);
      } else if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.log('Speech recognition not supported');
        setError('このブラウザは音声認識に対応していません。Chromeブラウザの使用を推奨します。');
        setBrowserSupported(false);
      } else {
        setBrowserSupported(true);
      }
    };

    checkBrowser();
  }, []);

  // データの取得
  const fetchInterview = async () => {
    try {
      const response = await apiClient.get<InterviewData>(`/interviews/by-url/${url}`);
      setInterview(response.data);
      
      const [baseResponse, customResponse] = await Promise.all([
        apiClient.get<BaseQuestion[]>(`/interviews/${response.data.id}/base-questions`),
        apiClient.get<CustomQuestion[]>(`/interviews/${response.data.id}/custom-questions`)
      ]);
      
      setBaseQuestions(baseResponse.data);
      setCustomQuestions(customResponse.data);
    } catch (error) {
      console.error('Error in fetchInterview:', error);
      setError('面接情報の取得に失敗しました');
    }
  };

  // 初期化
  useEffect(() => {
    if (url) {
      fetchInterview();
    }
  }, [url]);

  // 音声合成の初期化
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setIsInitialized(true);
      }

      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        if (updatedVoices.length > 0) {
          setIsInitialized(true);
        }
      };
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ビデオ要素のマウント状態を監視
  useEffect(() => {
    console.log('Checking video element mount status');
    if (videoRef.current) {
      console.log('Video element mounted');
      setIsVideoElementMounted(true);
    }
  }, []);

  // カメラの初期化
  useEffect(() => {
    console.log('Camera initialization effect triggered');
    console.log('Conditions:', {
      isVideoElementMounted,
      showStartButton,
      hasMediaPermissions
    });

    if (isVideoElementMounted && !showStartButton) {
      console.log('Starting camera...');
      startCamera();
    }

    return () => {
      console.log('Cleanup: stopping camera');
      stopCamera();
    };
  }, [isVideoElementMounted, showStartButton]);

  // コンポーネントのマウント時の初期化
  useEffect(() => {
    console.log('Component mounted');
    
    // クリーンアップ関数
    return () => {
      console.log('Component unmounting, cleaning up...');
      // カメラの停止
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          console.log('Stopping track:', track.kind);
          track.stop();
        });
        mediaStreamRef.current = null;
      }
      // ビデオ要素のクリーンアップ
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraReady(false);
      setIsVideoMounted(false);
    };
  }, []);

  // ビデオ要素の監視
  useEffect(() => {
    console.log('Setting up video element observer');
    
    const checkVideoMount = () => {
      const videoElement = videoRef.current;
      if (videoElement && !isVideoMounted) {
        console.log('Video element found and mounted');
        setIsVideoMounted(true);
      }
    };

    // 初回チェック
    checkVideoMount();

    // MutationObserverの設定
    const observer = new MutationObserver(() => {
      checkVideoMount();
    });

    // video要素の親要素を監視
    const container = document.getElementById('camera-container');
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    }

    return () => {
      observer.disconnect();
    };
  }, [isVideoMounted]);

  // エラー状態の監視とリセット
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [error]);

  // 質問の読み上げ
  const speakQuestion = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        console.log('Speech started');
        setIsSpeaking(true);
        stopSpeechRecognition(); // 質問読み上げ中は音声認識を停止
      };

      utterance.onend = () => {
        console.log('Speech ended');
        setIsSpeaking(false);
        startSpeechRecognition(); // 質問読み上げ終了後に音声認識を開始
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        startSpeechRecognition();
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error in speakQuestion:', error);
      setError('音声合成でエラーが発生しました');
      setIsSpeaking(false);
      startSpeechRecognition();
    }
  }, [startSpeechRecognition, stopSpeechRecognition]);

  // 面接開始の処理
  const handleStartInterview = useCallback(async () => {
    try {
      console.log('Starting interview...');
      setShowStartButton(false);

      // まず権限を要求
      const granted = await requestMediaPermissions();
      if (!granted) {
        console.error('Media permissions not granted');
        setShowStartButton(true);
        return;
      }

      // カメラの初期化を待機
      await startCamera();
      console.log('Camera initialized successfully');

      // 音声認識の開始
      await startSpeechRecognition();
      console.log('Speech recognition started');

      // 最初の質問を読み上げる
      if (baseQuestions.length > 0) {
        speakQuestion(baseQuestions[0].question_text);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      setError('面接の開始に失敗しました');
      setShowStartButton(true);
    }
  }, [requestMediaPermissions, startCamera, startSpeechRecognition, baseQuestions, speakQuestion]);

  // 次の質問へ
  const handleNextQuestion = useCallback(async () => {
    if (isBaseQuestion) {
      if (currentQuestionIndex < baseQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        speakQuestion(baseQuestions[currentQuestionIndex + 1].question_text);
      } else {
        setIsBaseQuestion(false);
        setCurrentQuestionIndex(0);
        if (customQuestions.length > 0) {
          speakQuestion(customQuestions[0].question_text);
        }
      }
    } else {
      if (currentQuestionIndex < customQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        speakQuestion(customQuestions[currentQuestionIndex + 1].question_text);
      } else {
        stopRecording();
        try {
          await apiClient.post(`/interviews/${interview?.id}/complete`);
          router.push('/interviews');
        } catch (error) {
          console.error('Failed to complete interview:', error);
          setError('面接の終了処理に失敗しました');
        }
      }
    }
  }, [
    isBaseQuestion,
    currentQuestionIndex,
    baseQuestions,
    customQuestions,
    speakQuestion,
    stopRecording,
    interview?.id,
    router
  ]);

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

  if (!interview || !baseQuestions.length || !customQuestions.length) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600">読み込み中...</div>
        </div>
      </CandidateLayout>
    );
  }

  const currentQuestion = isBaseQuestion 
    ? baseQuestions[currentQuestionIndex]
    : customQuestions[currentQuestionIndex];

  return (
    <CandidateLayout>
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {!browserSupported && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    このブラウザでは音声認識機能が制限される可能性があります。
                    <a href="https://www.google.com/chrome/" target="_blank" rel="noopener noreferrer" className="font-medium underline text-yellow-700 hover:text-yellow-600">
                      Chromeブラウザ
                    </a>
                    の使用を推奨ます。
                  </p>
                </div>
              </div>
            </div>
          )}

          {showPermissionDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  カメラとマイクの許可が必です
                </h3>
                <p className="text-gray-600 mb-4">
                  面接を開始するには、ブラウザカメラとマイクの使用を許可してください。
                  表示されるポップアップで「許可」を選択してください。
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowPermissionDialog(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {showStartButton ? (
            <div className="text-center mb-8">
              <button
                onClick={handleStartInterview}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isInitialized && browserSupported
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
                disabled={!isInitialized || !browserSupported}
              >
                面接を開始する
              </button>
              <p className="mt-2 text-sm text-gray-600">
                ※ カメラとマイクの使用許可が必要です
              </p>
              {!isInitialized && (
                <p className="mt-2 text-sm text-yellow-600">
                  音声の初期化中です。しばらくお待ちください...
                </p>
              )}
              {error && (
                <p className="mt-2 text-sm text-red-600">
                  {error}
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow-lg p-6 aspect-video relative flex items-center justify-center">
                  {interview && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img
                        src={interview.avatar_type === 'male' 
                          ? '/avatars/male-avatar.png' 
                          : '/avatars/female-avatar.png'}
                        alt="AI面接官"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  )}
                </div>
                <div 
                  className="bg-black rounded-lg shadow-lg aspect-video overflow-hidden relative"
                  id="camera-container"
                >
                  {!isCameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                      <p className="text-white">カメラを起動中...</p>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                    onLoadedMetadata={() => {
                      console.log('Video metadata loaded');
                      if (videoRef.current) {
                        videoRef.current.play()
                          .then(() => console.log('Video playback started'))
                          .catch(err => console.error('Video playback failed:', err));
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    現在の質問: ({isBaseQuestion ? 'ベース質問' : 'カスタム質問'} {currentQuestionIndex + 1}/{isBaseQuestion ? baseQuestions.length : customQuestions.length})
                  </h3>
                  <p className="text-gray-700">
                    {currentQuestion?.question_text}
                  </p>
                </div>

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    あなたの回答:
                  </h3>
                  <p className="text-gray-700 min-h-[100px] p-4 bg-gray-50 rounded whitespace-pre-wrap">
                    {transcript}
                  </p>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    onClick={() => {
                      setTranscript('');
                      handleNextQuestion();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={isSpeaking}
                  >
                    次の質問へ
                  </button>
                </div>
              </div>

              {/* 音声認識の結果表示 */}
              <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className="text-sm text-gray-600">
                        {isListening ? '音声認識中...' : '音声認識停止中'}
                      </span>
                    </div>
                    <button
                      onClick={toggleSpeechRecognition}
                      className={`px-4 py-2 rounded-lg font-medium ${
                        isListening
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {isListening ? '音声認識を停止' : '音声認識を開始'}
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-900">あなたの回答:</h3>
                    <div className="bg-gray-50 rounded p-4 min-h-[100px]">
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {transcription}
                        <span className="text-gray-400 italic">
                          {interimTranscript}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setTranscription('');
                        setInterimTranscript('');
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                      回答をクリア
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </CandidateLayout>
  );
} 