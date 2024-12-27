import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import CandidateLayout from '@/components/layouts/CandidateLayout';
import { apiClient } from '@/lib/apiClient';
import { InterviewData, CustomQuestion, BaseQuestion } from '@/types';
// import Image from 'next/image';

// 型定義を追加
interface Window {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
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

// 動画のクロスフェード用のスタイルを定義
const videoStyle = (isVisible: boolean) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'contain' as const,
  transition: 'opacity 0.3s ease-in-out',
  opacity: isVisible ? 1 : 0,
});

export default function InterviewSession() {
  console.log('InterviewSession component rendering');
  const router = useRouter();
  const { url } = router.query;
  const [interview, setInterview] = useState<InterviewData | null>(null);
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
  const [browserSupported, setBrowserSupported] = useState(true);
  const [isVideoElementMounted, setIsVideoElementMounted] = useState(false);
  const [isVideoMounted, setIsVideoMounted] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const autoRestartRef = useRef(false);
  const [hasSpokenInitialQuestion] = useState(false);
  // const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);
  // const [isLastQuestionSpoken, setIsLastQuestionSpoken] = useState(false);
  const [answers] = useState<Answer[]>([]);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // WebRTC関連の状態を追加
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  // const peerConnection = useRef<RTCPeerConnection | null>(null);
  const peerConnection = useRef(null);
  const audioElement = useRef<HTMLAudioElement | null>(null);

  // 音声再生状態の管理を追加
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  // WebRTC接続を開始する関数
  async function startRealTimeSession() {
    try {
      // トークンの取得
      const tokenResponse = await apiClient.get("/openai/token");
      const EPHEMERAL_KEY = tokenResponse.data.client_secret.value;
      console.log('EPHEMERAL_KEY:', EPHEMERAL_KEY);

      // RTCPeerConnectionの作成
      const pc = new RTCPeerConnection();

      // 音声出力の設定
      audioElement.current = document.createElement("audio");
      audioElement.current.autoplay = true;
      pc.ontrack = (e) => {
        audioElement.current.srcObject = e.streams[0];
        
        // 音声出力の状態監視を追加
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(e.streams[0]);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);

        const checkAudioLevel = () => {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length;
          setIsAudioPlaying(average > 10);
        };

        const checkInterval = setInterval(checkAudioLevel, 100);
        return () => clearInterval(checkInterval);
      };

      // マイク入力の設定
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      pc.addTrack(stream.getTracks()[0]);

      // データチャネルの設定
      const dc = pc.createDataChannel("oai-events");
      setDataChannel(dc);

      // データチャネルのイベントハンドラを設定
      setupDataChannelHandlers(dc);

      // SDPオファーの作成と送信
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      const answer = {
        type: "answer",
        sdp: await response.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;

      return true;
    } catch (error) {
      console.error("Failed to start realtime session:", error);
      setError("リアルタイムセッションの開始に失敗しました");
      return false;
    }
  }

  function sendClientEvent(message) {
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // データチャネルのイベントハンドラを設定する関数を追加
  function setupDataChannelHandlers(dc: RTCDataChannel) {
    dc.onopen = () => {
      console.log("Data channel opened");
      
      // セッション初期化メッセージを送信
      const sessionUpdate = {
        type: "session.update",
        session: {
          instructions: `
あなたはIT企業の採用面接官です。以下の指示に従って面接を進めてください：

1. 面接の進め方：
- 最初に「はじめまして。本日は面接にお時間をいただきありがとうございます。それでは、まず簡単な自己紹介をお願いできますでしょうか？」と自己紹介を求めてください
- 質問は1つずつ行い、回答を十分に聞いてから次の質問に進んでください
- 十分に回答が得られない場合、候補者の回答に対して適切なフォローアップ質問をしてください
- 面接官らしい丁寧な言葉遣いを心がけてください

2. 主な質問項目：
- PM経験の年数
- これまで担当したプロジェクトの規模や業界
- AI案件の経験について
- チーム管理やステークホルダーとのコミュニケーションについて
- 困難な状況での問題解決例

3. 注意事項：
- 面接の文脈に関係のない会話は避けてください
- 面接官としての立場を常に維持してください
- 具体的な例を求めながら、候補者の経験を深く理解するよう努めてください
- 日本語で応答してください
`,
          modalities: ["audio", "text"],
          voice: "alloy",
        }
      };
      dc.send(JSON.stringify(sessionUpdate));

      // 初期の応答を要求
      setTimeout(() => {
        const responseEvent = {
          type: "response.create",
          response: {
            modalities: ["audio", "text"]
          }
        };
        dc.send(JSON.stringify(responseEvent));
      }, 1000);
    };

    dc.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleServerEvent(data);
      } catch (error) {
        console.error("Error parsing data channel message:", error);
      }
    };

    dc.onerror = (error) => {
      console.error("Data channel error:", error);
      setError("通信エラーが発生しました");
    };

    dc.onclose = () => {
      console.log("Data channel closed");
      setError("通信が切断されました");
    };
  }

  // サーバーイベントを処理する関数を追加
  function handleServerEvent(event: any) {
    console.log("Received server event:", event);

    switch (event.type) {
      case "session.created":
        console.log("Session created:", event.session);
        // 初期の応答を要求
        if (dataChannel) {
          const responseEvent = {
            type: "response.create",
            response: {
              modalities: ["audio", "text"]
            }
          };
          dataChannel.send(JSON.stringify(responseEvent));
        }
        break;

      case "session.updated":
        console.log("Session updated:", event.session);
        break;

      case "conversation.item.created":
        console.log("Conversation item created:", event.item);
        // 音声入力の場合、トランスクリプションを取得
        if (event.item.content?.[0]?.type === "input_audio") {
          const transcript = event.item.content[0].transcript;
          if (transcript) {
            setTranscription(prev => prev + transcript + "\n");
            // 音声認識結果をAIに送信
            sendTranscriptionToAI(transcript);
          }
        }
        break;

      case "response.created":
        console.log("Response created:", event.response);
        break;

      case "response.text.delta":
        setAiResponse(prev => prev + event.delta);
        break;

      case "response.audio_transcript.delta":
        setInterimTranscript(event.delta);
        break;

      case "response.audio_transcript.done":
        setTranscription(prev => prev + event.transcript + "\n");
        setInterimTranscript("");
        // 音声認識結果をAIに送信
        sendTranscriptionToAI(event.transcript);
        break;

      case "input_audio_buffer.speech_started":
        console.log("Speech started");
        setIsListening(true);
        break;

      case "input_audio_buffer.speech_stopped":
        console.log("Speech stopped");
        setIsListening(false);
        break;

      case "input_audio_buffer.committed":
        console.log("Audio buffer committed");
        break;

      case "response.done":
        console.log("Response completed:", event.response);
        if (event.response.status === "failed") {
          console.error("Response failed:", event.response.status_details);
          // エラーの種類に応じて再試行
          if (dataChannel) {
            const responseEvent = {
              type: "response.create",
              response: {
                modalities: ["audio", "text"]
              }
            };
            setTimeout(() => {
              dataChannel.send(JSON.stringify(responseEvent));
            }, 1000);
          }
        }
        break;

      case "error":
        console.error("Server error:", event.error);
        setError(`エラーが発生しました: ${event.error}`);
        break;

      default:
        console.log("Unhandled event type:", event.type);
    }
  }

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

      // まずマイクの権を要求
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

  // // 音声認識の制御
  // const toggleSpeechRecognition = useCallback(() => {
  //   if (isListening) {
  //     stopSpeechRecognition();
  //   } else {
  //     startSpeechRecognition();
  //   }
  // }, [isListening, startSpeechRecognition, stopSpeechRecognition]);

  // ビデオ要素のマウント状態を監視
  useEffect(() => {
    console.log('Checking video element mount status');
    if (videoRef.current) {
      console.log('Video element mounted');
      setIsVideoElementMounted(true);
    }

    //  とりあえず進めるために
    setIsInitialized(true);
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
      
      // const [baseResponse, customResponse] = await Promise.all([
      //   apiClient.get<BaseQuestion[]>(`/interviews/${response.data.id}/base-questions`),
      //   apiClient.get<CustomQuestion[]>(`/interviews/${response.data.id}/custom-questions`)
      // ]);
      
      // setBaseQuestions(baseResponse.data);
      // setCustomQuestions(customResponse.data);
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
  // useEffect(() => {
  //   if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  //     // 音声合成の初期化を確認
  //     const initSpeechSynthesis = () => {
  //       const voices = window.speechSynthesis.getVoices();
  //       if (voices.length > 0) {
  //         const jaVoice = voices.find(voice => voice.lang === 'ja-JP');
  //         if (jaVoice) {
  //           console.log('Japanese voice found:', jaVoice.name);
  //           setIsInitialized(true);
  //         } else {
  //           console.log('No Japanese voice found, using default voice');
  //           setIsInitialized(true);
  //         }
  //       }
  //     };

  //     // 初期化時に度実行
  //     initSpeechSynthesis();

  //     // voiceschangedイベントのリスナーを設定
  //     window.speechSynthesis.onvoiceschanged = initSpeechSynthesis;

  //     // クリーンアップ
  //     return () => {
  //       window.speechSynthesis.onvoiceschanged = null;
  //     };
  //   }
  // }, []);

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

  // // WebSocket接続を行う関数を修正
  // const connectWebSocket = useCallback(() => {
  //   return new Promise<void>((resolve, reject) => {
  //     try {
  //       const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
  //       console.log('Initializing WebSocket connection:', {
  //         wsUrl,
  //         interviewId: interview?.id,
  //       });

  //       // 既存の接続をクリーンアップ
  //       if (wsRef.current) {
  //         console.log('Cleaning up existing connection');
  //         wsRef.current.close();
  //         wsRef.current = null;
  //       }

  //       const ws = new WebSocket(`${wsUrl}/ws/interview?interviewId=${interview?.id}`);
  //       console.log('WebSocket instance created');

  //       // 接続タイムアウトの設定
  //       const connectionTimeout = setTimeout(() => {
  //         if (ws.readyState !== WebSocket.OPEN) {
  //           console.error('Connection timeout');
  //           ws.close();
  //           reject(new Error('Connection timeout'));
  //         }
  //       }, 5000);

  //       ws.onopen = () => {
  //         clearTimeout(connectionTimeout);
  //         console.log('WebSocket connection established');
  //         wsRef.current = ws;
  //         resolve();
  //       };

  //       ws.onerror = (error) => {
  //         clearTimeout(connectionTimeout);
  //         console.error('WebSocket error:', error);
  //         reject(error);
  //       };

  //       ws.onclose = (event) => {
  //         clearTimeout(connectionTimeout);
  //         console.log('WebSocket closed:', {
  //           code: event.code,
  //           reason: event.reason,
  //           wasClean: event.wasClean,
  //         });
  //         wsRef.current = null;
  //       };

  //     } catch (error) {
  //       console.error('WebSocket initialization error:', error);
  //       reject(error);
  //     }
  //   });
  // // }, [interview?.id]);
  // });

  // handleStartInterview は connectWebSocket の後に定義
  const handleStartInterview = useCallback(async () => {
    try {
      setShowStartButton(false);
      
      // メディア権限の要求
      const granted = await requestMediaPermissions();
      if (!granted) {
        setShowStartButton(true);
        return;
      }

      // リアルタイムセッションの開始
      await startRealTimeSession();

      // カメラの初期化
      await startCamera();

      // // 音声認識の開始
      // await startSpeechRecognition();

    } catch (error) {
      console.error('Failed to start interview:', error);
      setError('面接の開始に失敗しました: ' + error.message);
      setShowStartButton(true);
    }
  }, []);
  // }, [requestMediaPermissions, startRealTimeSession, startCamera, startSpeechRecognition]);

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
  }, [answers, transcription, router]);

  // // 質問の表示部分を修正
  // const currentQuestion = useMemo(() => {
  //   // 質問データが読み込まれていない場合のガード
  //   if (!baseQuestions?.length || !customQuestions?.length) {
  //     return {
  //       text: '',
  //       type: 'ベース質問',
  //       current: 0,
  //       total: 0
  //     };
  //   }

  //   if (currentQuestionIndex < baseQuestions.length) {
  //     // ベース質問の範囲内のチェック
  //     if (!baseQuestions[currentQuestionIndex]) {
  //       return {
  //         text: '',
  //         type: 'ベース質問',
  //         current: currentQuestionIndex + 1,
  //         total: baseQuestions.length
  //       };
  //     }
  //     return {
  //       text: baseQuestions[currentQuestionIndex].question_text,
  //       type: 'ベース質問',
  //       current: currentQuestionIndex + 1,
  //       total: baseQuestions.length
  //     };
  //   } else {
  //     const customIndex = currentQuestionIndex - baseQuestions.length;
  //     // カスタム質問の範囲内のチェック
  //     if (!customQuestions[customIndex]) {
  //       return {
  //         text: '',
  //         type: 'カスタマイズ質問',
  //         current: customIndex + 1,
  //         total: customQuestions.length
  //       };
  //     }
  //     return {
  //       text: customQuestions[customIndex].question_text,
  //       type: 'カスタマイズ質問',
  //       current: customIndex + 1,
  //       total: customQuestions.length
  //     };
  //   }
  // }, [currentQuestionIndex, baseQuestions, customQuestions]);

  // AIの応答を表示するコンポーネントを追加
  const AIResponseComponent = () => (
    <div className="mt-4 bg-blue-50 p-4 rounded-lg">
      <h4 className="text-lg font-medium text-gray-900 mb-2">
        AI面接官の応答:
      </h4>
      <p className="text-gray-700 whitespace-pre-line">
        {aiResponse}
      </p>
    </div>
  );

  // 音声認識結果をAIに送信する関数を追加
  function sendTranscriptionToAI(text: string) {
    if (!dataChannel) {
      console.error("No data channel available");
      return;
    }

    console.log("Sending transcription to AI:", text);

    try {
      // まず会話アイテムを作成
      const conversationEvent = {
        type: "conversation.item.create",
        item: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: text,
            }
          ]
        }
      };
      dataChannel.send(JSON.stringify(conversationEvent));

      // 少し待ってから応答生成を要求
      setTimeout(() => {
        const responseEvent = {
          type: "response.create",
          response: {
            modalities: ["audio", "text"],
            instructions: `
前の会話の文脈を踏まえて、面接官として以下の点に注意して応答してください：
- 相手の発言をよく聞き、適切なフォローアップ質問をする
- 具体的な例を引き出すように質問する
- 丁寧な言葉遣いを維持する
- 面接官らしい振る舞いを保つ
`
          }
        };
        dataChannel.send(JSON.stringify(responseEvent));
      }, 500);

    } catch (error) {
      console.error("Error sending transcription:", error);
      setError("メッセージの送信に失敗しました");
    }
  }

  // デバッグログの追加
  useEffect(() => {
    console.log("Current state:", {
      isListening,
      transcription,
      aiResponse,
      dataChannel: !!dataChannel,
      peerConnection: !!peerConnection.current
    });
  }, [isListening, transcription, aiResponse, dataChannel]);

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

  // if (!interview || !baseQuestions?.length || !customQuestions?.length) {
  //   return (
  //     <CandidateLayout>
  //       <div className="flex items-center justify-center min-h-screen">
  //         <div className="text-gray-600">読み込み中...</div>
  //       </div>
  //     </CandidateLayout>
  //   );
  // }

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
                      Chromeラウザ
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
                  カメラとマイクの使用許可が必です
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
                <div className="bg-white rounded-lg shadow-lg aspect-video relative flex items-center justify-center">
                  {interview && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {/* 通常状態の動画 */}
                      <video
                        src="/avatars/female-avatar-speaking-default-no-voice.mp4"
                        autoPlay
                        loop
                        muted
                        playbackRate={0.5}
                        controls={false}
                        style={videoStyle(!isAudioPlaying)}
                      />
                      {/* 発話状態の動画 */}
                      <video
                        src="/avatars/female-avatar-speaking-no-voice.mp4"
                        autoPlay
                        loop
                        muted
                        playbackRate={0.5}
                        controls={false}
                        style={videoStyle(isAudioPlaying)}
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
                    {/* 現在の質問: ({currentQuestion.type} {currentQuestion.current}/{currentQuestion.total}) */}
                  </h3>
                  <p className="text-gray-700">
                    {/* {currentQuestion.text} */}
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

                  {/* AI応答の表示 */}
                  {aiResponse && <AIResponseComponent />}

                  <div className="flex justify-end mt-4">
                    {/* <button
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
                    </button> */}
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