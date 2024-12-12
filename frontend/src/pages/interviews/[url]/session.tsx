import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import CandidateLayout from '@/components/layouts/CandidateLayout';
import { apiClient } from '@/lib/apiClient';
import { InterviewData, CustomQuestion, BaseQuestion } from '@/types';
import Image from 'next/image';

// 型定義を追加
interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (event: Event) => void;
  onend: (event: Event) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: 'aborted' | 'not-allowed' | 'no-speech' | string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

// 新しい型定義を追加
interface Answer {
  question_id: number;
  question_text: string;
  answer_text: string;
  question_type: 'base' | 'custom';
}

// MediaRecorderのオプションを定義
const MEDIA_RECORDER_OPTIONS = {
  mimeType: 'video/webm;codecs=vp8,opus',
  videoBitsPerSecond: 2500000, // 2.5 Mbps
};

export default function InterviewSession() {
  console.log('InterviewSession component rendering');
  const router = useRouter();
  const { url } = router.query;
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [baseQuestions, setBaseQuestions] = useState<BaseQuestion[]>([]);
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [showStartButton, setShowStartButton] = useState(true);
  const [isRecognitionEnabled, setIsRecognitionEnabled] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRecognitionPaused, setIsRecognitionPaused] = useState(false);
  const MAX_RETRY_COUNT = 3;
  const RETRY_DELAY = 2000;
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isVideoElementMounted, setIsVideoElementMounted] = useState(false);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const autoRestartRef = useRef(false);
  const [hasSpokenInitialQuestion, setHasSpokenInitialQuestion] = useState(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  const [isLastQuestionSpoken, setIsLastQuestionSpoken] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isStreamActive, setIsStreamActive] = useState(false);

  // 全ての質問を統合
  const questions = useMemo(() => {
    if (!baseQuestions || !customQuestions) return [];
    
    // ベース質問とカスタム質問を結合して、必要な形式に変換
    const formattedBaseQuestions = baseQuestions.map(q => ({
      id: q.id,
      question: q.question_text,
      type: 'base'
    }));

    const formattedCustomQuestions = customQuestions.map(q => ({
      id: q.id,
      question: q.question_text,
      type: 'custom'
    }));

    return [...formattedBaseQuestions, ...formattedCustomQuestions];
  }, [baseQuestions, customQuestions]);

  // 音声読み上げ関数を修正
  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported');
      setError('音声合成に対応していません。');
      return;
    }

    // 既存の発話をキャンセル
    window.speechSynthesis.cancel();

    try {
      console.log('Starting speech synthesis for:', text);
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 日本語の音声を探す
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(voice => voice.lang === 'ja-JP');
      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      utterance.lang = 'ja-JP';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        console.log('Speech started:', text);
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('Speech ended');
        setIsSpeaking(false);
        if (currentQuestionIndex === baseQuestions.length + customQuestions.length - 1) {
          setIsLastQuestionSpoken(true);
        }
        if (onEnd) {
          onEnd();
        }
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
        setError('音声合成でエラーが発生しました。');
      };

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error in speak function:', error);
      setIsSpeaking(false);
      setError('音声合成でエラーが発生しました。');
    }
  }, [isSpeaking, currentQuestionIndex, baseQuestions.length, customQuestions.length]);

  // 次の質問へ進む関数
  const handleNextQuestion = useCallback(async () => {
    if (isSpeaking) {
      console.log('Currently speaking, please wait');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      // 現在の質問と回答を保存
      const currentQuestionData = currentQuestionIndex < baseQuestions.length
        ? {
            id: baseQuestions[currentQuestionIndex].id,
            text: baseQuestions[currentQuestionIndex].question_text,
            type: 'base' as const
          }
        : {
            id: customQuestions[currentQuestionIndex - baseQuestions.length].id,
            text: customQuestions[currentQuestionIndex - baseQuestions.length].question_text,
            type: 'custom' as const
          };

      setAnswers(prev => [...prev, {
        question_id: currentQuestionData.id,
        question_text: currentQuestionData.text,
        answer_text: transcription,
        question_type: currentQuestionData.type
      }]);

      setTranscription('');
      setInterimTranscript('');

      setCurrentQuestionIndex(prevIndex => {
        const nextIndex = prevIndex + 1;
        const totalQuestions = (baseQuestions?.length || 0) + (customQuestions?.length || 0);
        
        if (nextIndex < totalQuestions) {
          let nextQuestionText = '';
          if (nextIndex < (baseQuestions?.length || 0)) {
            nextQuestionText = baseQuestions[nextIndex]?.question_text || '';
          } else {
            const customIndex = nextIndex - (baseQuestions?.length || 0);
            nextQuestionText = customQuestions[customIndex]?.question_text || '';
          }
          
          if (nextQuestionText) {
            speak(nextQuestionText, () => {
              if (nextIndex === totalQuestions - 1) {
                setIsLastQuestionSpoken(true);
              }
              if (recognitionRef.current && isRecognitionEnabled) {
                try {
                  recognitionRef.current.start();
                } catch (error) {
                  console.error('Error restarting recognition:', error);
                }
              }
            });
          }
        }
        return nextIndex;
      });
    } catch (error) {
      console.error('Error handling next question:', error);
      setError('次の質問への移動中にエラーが発生しました。');
    }
  }, [baseQuestions, customQuestions, currentQuestionIndex, transcription, isRecognitionEnabled, speak, isSpeaking]);

  // 初期質問の読み上げを修正
  useEffect(() => {
    if (baseQuestions?.length > 0 && !hasSpokenInitialQuestion && !isSpeaking && isInitialized) {
      console.log('Speaking initial question');
      const initialQuestion = baseQuestions[0]?.question_text;
      if (initialQuestion) {
        setHasSpokenInitialQuestion(true);
        // 少し遅延を入れて確実に音声合成を初期化
        setTimeout(() => {
          speak(initialQuestion, () => {
            if (recognitionRef.current && isRecognitionEnabled) {
              try {
                recognitionRef.current.start();
              } catch (error) {
                console.error('Error starting recognition:', error);
              }
            }
          });
        }, 1000);
      }
    }
  }, [baseQuestions, isSpeaking, isRecognitionEnabled, speak, hasSpokenInitialQuestion, isInitialized]);

  // 音声認識の結果を処理
  const handleSpeechResult = useCallback((event: SpeechRecognitionEvent) => {
    console.log('Speech recognition result received');
    const results = Array.from(event.results);
    
    // 最新の結果のみを処理
    const lastResult = results[results.length - 1];
    if (lastResult.isFinal) {
      const finalText = lastResult[0].transcript;
      console.log('Final transcript:', finalText);
      // 最新の結果を追加（改行付き）
      setTranscription(prev => {
        // 空の場合は改行なしで追加
        if (!prev) return finalText;
        // 既に内容がある場合は改行を入れて追加
        return `${prev}\n${finalText}`;
      });
      setInterimTranscript('');
    } else {
      // 中間結果の更新
      const interimText = lastResult[0].transcript;
      setInterimTranscript(interimText);
    }
  }, []);

  // 音声認識の開始
  const startSpeechRecognition = useCallback(() => {
    try {
      if (!recognitionRef.current) {
        console.log('Recognition not initialized');
        return;
      }

      if (isListening) {
        console.log('Recognition is already running');
        return;
      }

      console.log('Starting speech recognition...');
      recognitionRef.current.start();
      setIsRecognitionEnabled(true);
      setIsListening(true);
      autoRestartRef.current = true;
      setError(''); // エラーメッセージをクリア
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setError('音声認識の開始に失敗しました。ページを更新してください。');
    }
  }, [isListening]);

  // 音声認識の停止
  const stopSpeechRecognition = useCallback(() => {
    try {
      if (!recognitionRef.current) {
        console.log('Recognition not initialized');
        return;
      }

      if (!isListening) {
        console.log('Recognition is not running');
        return;
      }

      console.log('Stopping speech recognition...');
      recognitionRef.current.stop();
      setIsRecognitionEnabled(false);
      setIsListening(false);
      autoRestartRef.current = false;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, [isListening]);

  // 音声認識の初期化
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    console.log('Initializing speech recognition...');
    
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
      setError('');
    };

    recognition.onend = () => {
      console.log('Speech recognition service disconnected');
      setIsListening(false);
      
      // 自動再開が有効な場合は再起動
      if (autoRestartRef.current && isRecognitionEnabled && !isListening) {
        console.log('Automatically restarting speech recognition...');
        setTimeout(() => {
          if (autoRestartRef.current && !isListening) {
            try {
              recognition.start();
            } catch (error) {
              console.error('Error restarting recognition:', error);
              setError('音声認識の再開に失敗しました。ページを更新してください。');
            }
          }
        }, 1000);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'not-allowed':
          setError('マイクの使用が許可されていません。ブラウザの設定を確認してください。');
          autoRestartRef.current = false;
          break;
          
        case 'no-speech':
          console.log('No speech detected');
          break;
          
        case 'aborted':
          console.log('Recognition aborted');
          if (autoRestartRef.current && isRecognitionEnabled) {
            setTimeout(() => {
              startSpeechRecognition();
            }, 1000);
          }
          break;
          
        default:
          setError('音声認識でエラーが発生しました。');
          if (autoRestartRef.current && isRecognitionEnabled) {
            setTimeout(() => {
              startSpeechRecognition();
            }, 1000);
          }
      }
    };

    recognition.onresult = handleSpeechResult;
    recognitionRef.current = recognition;

    return () => {
      stopSpeechRecognition();
    };
  }, [handleSpeechResult, isRecognitionEnabled, startSpeechRecognition, stopSpeechRecognition]);

  // メディアデバイスの権限を要求
  const requestMediaPermissions = useCallback(async () => {
    try {
      console.log('Requesting media permissions...');
      setShowPermissionDialog(true);
      setError('');

      // デバイスの存確認
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('Available devices:', devices);

      // デバイスのリセット処理
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // ブラウザの権限状態をセット
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      };

      console.log('Requesting media stream with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // ストリームの状態をチェック
      if (!stream.active) {
        throw new Error('Failed to get active media stream');
      }

      // ストリームの設定
      videoRef.current.srcObject = stream;
      mediaStreamRef.current = stream;
      setIsStreamActive(true);

      // ストリームの再生開始を待機
      await videoRef.current.play();
      setIsCameraReady(true);
      console.log('Camera initialized successfully');

    } catch (error) {
      console.error('Error initializing camera:', error);
      setError('カメラの初期化に失敗しました: ' + error.message);
      setIsCameraReady(false);
      setIsStreamActive(false);
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

  // 録画開始の処理を修正
  useEffect(() => {
    if (mediaStreamRef.current && !isRecording && isStreamActive) {
      try {
        // まずサポートされているMIMEタイプを確認
        let options = MEDIA_RECORDER_OPTIONS;
        if (!MediaRecorder.isTypeSupported(MEDIA_RECORDER_OPTIONS.mimeType)) {
          console.log('Default codec not supported, trying fallback...');
          if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            options = { mimeType: 'video/webm;codecs=vp8' };
          } else if (MediaRecorder.isTypeSupported('video/webm')) {
            options = { mimeType: 'video/webm' };
          } else {
            throw new Error('No supported video codec found');
          }
        }

        // ストリームの状態を再確認
        if (!mediaStreamRef.current.active) {
          console.log('Stream is not active, attempting to reinitialize...');
          startCamera().then(() => {
            if (!mediaStreamRef.current?.active) {
              throw new Error('Failed to reinitialize media stream');
            }
          });
          return;
        }

        console.log('Initializing MediaRecorder with options:', options);
        const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);
        mediaRecorderRef.current = mediaRecorder;
        recordedChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          setError('録画中にエラーが発生しました');
        };

        mediaRecorder.start(1000);
        setIsRecording(true);
        console.log('MediaRecorder started successfully');

      } catch (error) {
        console.error('Failed to start recording:', error);
        setError('録画の開始に失敗しました: ' + error.message);
        setIsRecording(false);
      }
    }
  }, [mediaStreamRef.current, isRecording, isStreamActive, startCamera]);

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

  // 音声合成の初期化を修正
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // 音声合成の初期化を確認
      const initSpeechSynthesis = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const jaVoice = voices.find(voice => voice.lang === 'ja-JP');
          if (jaVoice) {
            console.log('Japanese voice found:', jaVoice.name);
            setIsInitialized(true);
          } else {
            console.log('No Japanese voice found, using default voice');
            setIsInitialized(true);
          }
        }
      };

      // 初期化時に一度実行
      initSpeechSynthesis();

      // voiceschangedイベントのリスナーを設定
      window.speechSynthesis.onvoiceschanged = initSpeechSynthesis;

      // クリーンアップ
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      console.log('Cleaning up resources...');
      
      // 録画の停止
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (error) {
          console.error('Error stopping media recorder:', error);
        }
      }

      // ストリームの停止
      if (mediaStreamRef.current) {
        try {
          mediaStreamRef.current.getTracks().forEach(track => {
            track.stop();
            console.log(`Stopped track: ${track.kind}`);
          });
          mediaStreamRef.current = null;
        } catch (error) {
          console.error('Error stopping media stream:', error);
        }
      }

      // ビデオ要素のクリーンアップ
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsCameraReady(false);
      setIsStreamActive(false);
      setIsRecording(false);
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

  // 面接開始の処理を修正
  const handleStartInterview = useCallback(async () => {
    try {
      console.log('Starting interview...');
      setShowStartButton(false);

      // メディア権限の要求
      const granted = await requestMediaPermissions();
      if (!granted) {
        console.error('Media permissions not granted');
        setShowStartButton(true);
        return;
      }

      // カメラの初期化を待機
      await startCamera();
      
      // ストリームの状態を確認
      if (!mediaStreamRef.current?.active) {
        throw new Error('Failed to initialize media stream');
      }

      // 音声認識の開始
      await startSpeechRecognition();

      // 音声合成が初期化されているか確認
      if (!isInitialized) {
        await new Promise<void>((resolve) => {
          const checkInit = () => {
            if (isInitialized) {
              resolve();
            } else {
              setTimeout(checkInit, 100);
            }
          };
          checkInit();
        });
      }

      // 最初の質問を読み上げる
      if (baseQuestions.length > 0) {
        console.log('Reading first question:', baseQuestions[0].question_text);
        speak(baseQuestions[0].question_text);
      }
    } catch (error) {
      console.error('Failed to start interview:', error);
      setError('面接の開始に失敗しました: ' + error.message);
      setShowStartButton(true);
    }
  }, [requestMediaPermissions, startCamera, startSpeechRecognition, baseQuestions, speak, isInitialized]);

  // 面接終了の処理を追加
  const handleFinishInterview = useCallback(async () => {
    try {
      console.log('\n=== Interview Submission Debug Log ===');
      
      // interview オブジェクトの詳細確認
      console.log('Interview Details:', {
        id: interview?.id,
        job_posting_id: interview?.job_posting_id,
        status: interview?.status,
        url: interview?.url
      });

      // 録画データの確認
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      console.log('Video Data:', {
        size: videoBlob.size,
        type: videoBlob.type,
        chunkCount: recordedChunksRef.current.length
      });

      // 最後の回答を含めた全回答データの準備
      const currentQuestionData = currentQuestionIndex < baseQuestions.length
        ? {
            id: baseQuestions[currentQuestionIndex].id,
            text: baseQuestions[currentQuestionIndex].question_text,
            type: 'base' as const
          }
        : {
            id: customQuestions[currentQuestionIndex - baseQuestions.length].id,
            text: customQuestions[currentQuestionIndex - baseQuestions.length].question_text,
            type: 'custom' as const
          };

      // FormDataの作成
      const formData = new FormData();
      
      // 動画ファイルの追加
      formData.append('video', videoBlob, 'interview-recording.webm');
      
      // 回答データの追加
      const finalAnswers = [...answers];
      if (currentQuestionData && transcription) {
        finalAnswers.push({
          question_id: currentQuestionData.id,
          question_text: currentQuestionData.text,
          answer_text: transcription || "回答なし",
          question_type: currentQuestionData.type
        });
      }
      formData.append('answers', JSON.stringify(finalAnswers));

      console.log('Request Payload:', {
        answers: finalAnswers,
        formData: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          value: value instanceof Blob 
            ? `Blob(${value.size} bytes, ${value.type})` 
            : typeof value === 'string'
            ? `String(${value.length} chars): ${value.substring(0, 100)}...`
            : `Unknown type: ${typeof value}`
        }))
      });

      // APIリクエストの送信
      const response = await apiClient.post(
        `/interviews/${interview?.id}/complete`,
        formData,
        {
          headers: {
            'Accept': 'application/json',
          },
          // Content-Typeは指定しない（ブラウザが自動的に設定）
          transformRequest: [(data) => data],
          timeout: 120000, // タイムアウトを2分に延長
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          }
        }
      );

      console.log('API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      // 200ステータスコードの場合は成功として扱う
      if (response.status === 200) {
        // 面接完了画面へリダイレクト
        if (router.query.url) {
          router.push(`/interviews/${router.query.url}/complete`);
        } else {
          console.error('Interview URL is undefined');
          setError('面接URLの取得に失敗しました');
        }
      } else {
        console.error('API Response Error:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
        throw new Error(
          response.data?.detail || 
          response.data?.message || 
          '面接データの保存に失敗しました'
        );
      }

    } catch (error: any) {
      console.error('Error finishing interview:', error);
      
      if (error.response) {
        console.error('Error Response Details:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        setError(`面接データの保存に失敗しました: ${
          error.response.data?.detail || 
          error.response.data?.message || 
          error.message
        }`);
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('サーバーからの応答がありません。ネットワーク接続を確認してください。');
      } else {
        console.error('Error setting up request:', error.message);
        setError(`リクエストの設定中にエラーが発生しました: ${error.message}`);
      }
    }
  }, [interview, answers, transcription, currentQuestionIndex, baseQuestions, customQuestions, router]);

  // 質問の表示部分を修正
  const currentQuestion = useMemo(() => {
    // 質問データが読み込まれていない場合のガード
    if (!baseQuestions?.length || !customQuestions?.length) {
      return {
        text: '',
        type: 'ベース質問',
        current: 0,
        total: 0
      };
    }

    if (currentQuestionIndex < baseQuestions.length) {
      // ベース質問の範囲内のチェック
      if (!baseQuestions[currentQuestionIndex]) {
        return {
          text: '',
          type: 'ベース質問',
          current: currentQuestionIndex + 1,
          total: baseQuestions.length
        };
      }
      return {
        text: baseQuestions[currentQuestionIndex].question_text,
        type: 'ベース質問',
        current: currentQuestionIndex + 1,
        total: baseQuestions.length
      };
    } else {
      const customIndex = currentQuestionIndex - baseQuestions.length;
      // カスタム質問の範囲内のチェック
      if (!customQuestions[customIndex]) {
        return {
          text: '',
          type: 'カスタマイズ質問',
          current: customIndex + 1,
          total: customQuestions.length
        };
      }
      return {
        text: customQuestions[customIndex].question_text,
        type: 'カスタマイズ質問',
        current: customIndex + 1,
        total: customQuestions.length
      };
    }
  }, [currentQuestionIndex, baseQuestions, customQuestions]);

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

  if (!interview || !baseQuestions?.length || !customQuestions?.length) {
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
                    現在の質問: ({currentQuestion.type} {currentQuestion.current}/{currentQuestion.total})
                  </h3>
                  <p className="text-gray-700">
                    {currentQuestion.text}
                  </p>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-2">
                    あなたの回答:
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line min-h-[100px]">
                      {transcription}
                      {interimTranscript && (
                        <span className="text-gray-400 italic">
                          {interimTranscript}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-end mt-4">
                    <button
                      onClick={
                        currentQuestionIndex >= baseQuestions.length + customQuestions.length - 1
                          ? handleFinishInterview
                          : handleNextQuestion
                      }
                      className={`px-4 py-2 rounded ${
                        isSpeaking 
                          ? 'bg-gray-400 text-white cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                      disabled={isSpeaking}
                    >
                      {currentQuestionIndex >= baseQuestions.length + customQuestions.length - 1 ? '面接終了' : '次の質問へ'}
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