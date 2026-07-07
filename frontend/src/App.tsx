import { useState, useEffect, useRef } from "react";
import {
  Mic,
  Square,
  Play,
  Download,
  Settings,
  FolderOpen,
  Volume2,
  Trash2,
  RefreshCw,
  Sparkles,
  Layers,
  UserCheck,
  CheckCircle,
  AlertTriangle,
  StopCircle
} from "lucide-react";
import JSZip from "jszip";
import {
  getApiConfig,
  saveApiConfig,
  checkApiStatus,
  getTtsLogsEventSource,
  runTtsDesign,
  runTtsClone,
  runTtsUltimate
} from "./services/api";

// Preset voice options matching original project
const VOICE_PRESETS = {
  tw_mandarin: {
    label: "臺灣國語",
    sentence: "哈囉！這是使用語音設計無中生有出來的聲音。",
    roles: {
      "臺灣老爺爺": "An elderly man, Taiwanese Mandarin accent, warm and gentle voice",
      "臺灣老奶奶": "An elderly woman, Taiwanese Mandarin accent, kind and soft voice",
      "臺灣年輕男生": "A young man, Taiwanese Mandarin accent, clear and energetic voice",
      "臺灣年輕女生": "A young woman, Taiwanese Mandarin accent, gentle and sweet voice",
      "臺灣小男孩": "A young boy, Taiwanese Mandarin accent, cute voice",
      "臺灣小女孩": "A young girl, Taiwanese Mandarin accent, lovely and sweet voice"
    }
  },
  japanese: {
    label: "日語",
    sentence: "こんにちは！これは音声設計で新しく生成された声です。",
    roles: {
      "老爺爺": "An old man, Japanese accent, warm and gentle voice",
      "老奶奶": "An old woman, Japanese accent, kind and soft voice",
      "年輕男生": "A young man, Japanese accent, clear and energetic voice",
      "年輕女生": "A young woman, Japanese accent, gentle and sweet voice",
      "小男孩": "A young boy, Japanese accent, cute voice",
      "小女孩": "A young girl, Japanese accent, lovely voice"
    }
  },
  us_english: {
    label: "英語",
    sentence: "Hello! This is a voice generated from scratch using voice design.",
    roles: {
      "老爺爺": "An old man, American accent, deep and warm voice",
      "老奶奶": "An old woman, American accent, kind and gentle voice",
      "年輕男生": "A young man, American accent, clear and energetic voice",
      "年輕女生": "A young woman, American accent, gentle and sweet voice",
      "小男孩": "A young boy, American accent, cute voice",
      "小女孩": "A young girl, American accent, lovely voice"
    }
  },
  korean: {
    label: "韓語",
    sentence: "안녕하세요! 이것은 음성 디자인으로 새로 생성된 목소리입니다.",
    roles: {
      "老爺爺": "An old man, Korean accent, warm and gentle voice",
      "老奶奶": "An old woman, Korean accent, kind and soft voice",
      "年輕男生": "A young man, Korean accent, clear and energetic voice",
      "年輕女生": "A young woman, Korean accent, gentle and sweet voice",
      "小男孩": "A young boy, Korean accent, cute voice",
      "小女孩": "A young girl, Korean accent, lovely voice"
    }
  }
};

export default function App() {
  // Tabs: design, clone, ultimate, settings
  const [activeTab, setActiveTab] = useState<string>("design");
  
  // Connection and API Key settings
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [gpuInfo, setGpuInfo] = useState<{ cuda_available: boolean; device_name: string }>({
    cuda_available: false,
    device_name: "未偵測"
  });
  const [modelStatus, setModelStatus] = useState<{ is_loaded: boolean; exists_complete: boolean; missing_files: string[] }>({
    is_loaded: false,
    exists_complete: false,
    missing_files: []
  });

  // Inference params (shared defaults, independent values)
  const [cfgScale, setCfgScale] = useState<number>(2.0);
  const [timesteps, setTimesteps] = useState<number>(10);
  const [speedRate, setSpeedRate] = useState<number>(1.0);
  const [normalize, setNormalize] = useState<boolean>(false);
  const [denoise, setDenoise] = useState<boolean>(false);
  const [seedEnabled, setSeedEnabled] = useState<boolean>(false);
  const [seed, setSeed] = useState<string>("");

  // Input states per tab
  const [designText, setDesignText] = useState<string>("");
  const [designMode, setDesignMode] = useState<"single" | "batch">("single");
  
  const [cloneText, setCloneText] = useState<string>("");
  const [cloneRefFile, setCloneRefFile] = useState<File | Blob | null>(null);
  
  const [ultText, setUltText] = useState<string>("");
  const [ultPromptText, setUltPromptText] = useState<string>("");
  const [ultRefFile, setUltRefFile] = useState<File | Blob | null>(null);

  // Audio Result States
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [generatedSeed, setGeneratedSeed] = useState<number | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  // Micro and recording states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTarget, setRecordingTarget] = useState<"clone" | "ultimate" | null>(null);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);



  // Background SSE logs console state
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleBottomRef = useRef<HTMLDivElement | null>(null);

  // Batch states (Frontend-driven)
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<{ text: string; blob: Blob; filename: string }[]>([]);
  const isBatchCancelledRef = useRef<boolean>(false);

  // Init api settings and connect SSE
  useEffect(() => {
    const config = getApiConfig();
    setBaseUrl(config.baseUrl);
    setApiKey(config.apiKey);
    testConnection(config.baseUrl, config.apiKey);
  }, []);

  // Connect SSE for background logs
  useEffect(() => {
    let sse: EventSource | null = null;
    if (connectionStatus === "connected") {
      try {
        sse = getTtsLogsEventSource();
        sse.addEventListener("log", (event: any) => {
          setConsoleLogs((prev) => [...prev, event.data]);
        });
        sse.onerror = () => {
          console.warn("TTS Logs SSE connection error, retrying...");
        };
      } catch (err) {
        console.error("Failed to connect to TTS Logs SSE:", err);
      }
    }
    return () => {
      if (sse) sse.close();
    };
  }, [connectionStatus, baseUrl, apiKey]);

  // Keep terminal scrolled to bottom
  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);



  const testConnection = async (url: string, key: string) => {
    setConnectionStatus("checking");
    try {
      // Temporary override settings to test
      localStorage.setItem("voxcpm_api_url", url);
      localStorage.setItem("voxcpm_api_key", key);
      
      const status = await checkApiStatus();
      setConnectionStatus("connected");
      setGpuInfo(status.gpu);
      setModelStatus(status.model);
    } catch (e) {
      setConnectionStatus("disconnected");
      // Restore actual config
      const original = getApiConfig();
      localStorage.setItem("voxcpm_api_url", original.baseUrl);
      localStorage.setItem("voxcpm_api_key", original.apiKey);
    }
  };

  const handleSaveConfig = () => {
    saveApiConfig(baseUrl, apiKey);
    testConnection(baseUrl, apiKey);
  };

  // Preset quick click
  const applyPreset = (_lang: string, _roleName: string, roleDesc: string, sentence: string) => {
    const formatted = `(${roleDesc}) ${sentence}`;
    if (!designText.trim()) {
      setDesignText(formatted);
    } else {
      setDesignText((prev) => prev.trim() + "\n" + formatted);
    }
  };

  // HTML5 MediaRecorder Sound Recording
  const startRecording = async (target: "clone" | "ultimate") => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const sourceNode = audioContextRef.current.createMediaStreamSource(stream);
      sourceNode.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      recordingChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: "audio/wav" });
        if (target === "clone") {
          setCloneRefFile(audioBlob);
        } else {
          setUltRefFile(audioBlob);
        }
        setRecordedBlobUrl(URL.createObjectURL(audioBlob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTarget(target);
      setRecordDuration(0);
      
      // Timer setup
      recordingTimerRef.current = window.setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);

      // Start Visualizer
      drawWaveform();
    } catch (err) {
      alert("無法啟用麥克風。請檢查瀏覽器麥克風授權設定！");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTarget(null);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
  };

  // Draw real-time canvas volume wave
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const renderFrame = () => {
      if (!isRecording || !analyserRef.current) return;
      animationFrameIdRef.current = requestAnimationFrame(renderFrame);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Draw custom visual audio bar
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        
        // HSL Aurora purple/pink gradient style
        const hue = (i / bufferLength) * 120 + 280; 
        ctx.fillStyle = `hsla(${hue}, 90%, 65%, 0.85)`;
        
        ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
        x += barWidth;
      }
    };

    renderFrame();
  };



  // 1. Single Voice Design Generation
  const handleSingleDesign = async () => {
    if (!designText.trim()) return alert("請輸入目標文字！");
    setIsSynthesizing(true);
    setGeneratedAudioUrl(null);
    
    try {
      const result = await runTtsDesign({
        text: designText.trim(),
        cfg_value: cfgScale,
        inference_timesteps: timesteps,
        normalize,
        denoise,
        seed: seedEnabled ? parseInt(seed, 10) : null,
        speed_rate: speedRate
      });
      
      const url = URL.createObjectURL(result.audioBlob);
      setGeneratedAudioUrl(url);
      setGeneratedSeed(result.seed);
    } catch (e: any) {
      alert(`生成失敗: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // 2. Front-driven Batch Voice Generation (Asexual Async Loop)
  const handleBatchDesign = async () => {
    const lines = designText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "");
      
    if (lines.length === 0) return alert("文字框中沒有任何可供合成的行！");
    
    setIsBatchProcessing(true);
    isBatchCancelledRef.current = false;
    setBatchResults([]);
    setBatchProgress({ current: 0, total: lines.length });
    
    const results: { text: string; blob: Blob; filename: string }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (isBatchCancelledRef.current) {
        setConsoleLogs((prev) => [...prev, `${timeStr()} | 🛑 使用者取消了批次生成工作流程。`]);
        break;
      }
      
      setBatchProgress({ current: i + 1, total: lines.length });
      const currentLine = lines[i];
      setConsoleLogs((prev) => [...prev, `${timeStr()} | ⏳ [批次 ${i+1}/${lines.length}] 正在生成: "${currentLine.substring(0, 15)}..."`]);
      
      try {
        const result = await runTtsDesign({
          text: currentLine,
          cfg_value: cfgScale,
          inference_timesteps: timesteps,
          normalize,
          denoise,
          seed: seedEnabled ? parseInt(seed, 10) : null,
          speed_rate: speedRate
        });
        
        results.push({
          text: currentLine,
          blob: result.audioBlob,
          filename: `voxcpm_line_${String(i + 1).padStart(3, "0")}.wav`
        });
        
        setBatchResults([...results]);
      } catch (err: any) {
        setConsoleLogs((prev) => [...prev, `${timeStr()} | ❌ [批次 ${i+1}/${lines.length}] 失敗: ${err.message}`]);
        const proceed = confirm(`第 ${i + 1} 句生成失敗: ${err.message}\n是否繼續生成下一句？`);
        if (!proceed) break;
      }
    }
    
    setIsBatchProcessing(false);
  };

  // JSZip Package Downloader
  const downloadAllBatchFiles = async () => {
    if (batchResults.length === 0) return;
    const zip = new JSZip();
    
    batchResults.forEach((item) => {
      zip.file(item.filename, item.blob);
    });
    
    // Add text log list inside zip
    const manifest = batchResults.map((item, _idx) => `${item.filename}: ${item.text}`).join("\n");
    zip.file("manifest.txt", manifest);
    
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `voxcpm_batch_${timeStr().replace(/:/g, "")}.zip`;
    link.click();
  };

  // 3. Voice Clone Generation
  const handleVoiceClone = async () => {
    if (!cloneText.trim()) return alert("請輸入目標文字！");
    if (!cloneRefFile) return alert("請提供參考音檔（上傳或使用麥克風錄音）！");
    
    setIsSynthesizing(true);
    setGeneratedAudioUrl(null);
    
    try {
      const result = await runTtsClone({
        reference_wav: cloneRefFile,
        text: cloneText.trim(),
        cfg_value: cfgScale,
        inference_timesteps: timesteps,
        normalize,
        denoise,
        seed: seedEnabled ? parseInt(seed, 10) : null,
        speed_rate: speedRate
      });
      
      setGeneratedAudioUrl(URL.createObjectURL(result.audioBlob));
      setGeneratedSeed(result.seed);
    } catch (e: any) {
      alert(`生成失敗: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  // 4. Ultimate Clone Generation
  const handleUltimateClone = async () => {
    if (!ultText.trim()) return alert("請輸入目標文字！");
    if (!ultPromptText.trim()) return alert("請提供參考語音的對應逐字稿！");
    if (!ultRefFile) return alert("請提供參考音檔！");
    
    setIsSynthesizing(true);
    setGeneratedAudioUrl(null);
    
    try {
      const result = await runTtsUltimate({
        reference_wav: ultRefFile,
        text: ultText.trim(),
        prompt_text: ultPromptText.trim(),
        cfg_value: cfgScale,
        inference_timesteps: timesteps,
        normalize,
        denoise,
        seed: seedEnabled ? parseInt(seed, 10) : null,
        speed_rate: speedRate
      });
      
      setGeneratedAudioUrl(URL.createObjectURL(result.audioBlob));
      setGeneratedSeed(result.seed);
    } catch (e: any) {
      alert(`生成失敗: ${e.message}`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const timeStr = () => timeStrStatic();
  const timeStrStatic = () => {
    return new Date().toLocaleTimeString("zh-TW", { hour12: false });
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col antialiased">
      {/* Glow Top Banner Border */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 shadow-[0_2px_15px_rgba(168,85,247,0.5)]"></div>
      
      {/* Main Header bar */}
      <header className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-500 to-purple-600 p-2.5 rounded-xl glow-blue">
            <Volume2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              Studio0808 VoxCPM
            </h1>
            <p className="text-xs text-slate-400 font-medium tracking-wide">語音合成工作站 Web 控制面板</p>
          </div>
        </div>

        {/* Global connection status badge */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold glass-panel`}>
            <span className={`h-2.5 w-2.5 rounded-full ${
              connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
              connectionStatus === "checking" ? "bg-amber-500 animate-spin" : "bg-red-500"
            }`} />
            <span className="text-slate-300">
              {connectionStatus === "connected" ? `GPU 運算端連線成功 (${gpuInfo.device_name})` :
               connectionStatus === "checking" ? "正在偵測後端服務..." : "未連線至後端設備"}
            </span>
          </div>
          
          <button 
            onClick={() => testConnection(baseUrl, apiKey)} 
            className="p-2 bg-slate-800 hover:bg-slate-700 active:scale-95 transition rounded-lg"
            title="刷新後端狀態"
          >
            <RefreshCw className="h-4 w-4 text-slate-300" />
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Navigation & Parameter Settings & Tabs Content (Columns: 7) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Glass Nav Tabs */}
          <nav className="flex gap-2 p-1.5 bg-slate-900/60 border border-white/5 rounded-xl backdrop-blur-md">
            {[
              { id: "design", label: "語音設計", icon: Sparkles },
              { id: "clone", label: "聲音複製", icon: UserCheck },
              { id: "ultimate", label: "極限複製", icon: Layers },
              { id: "settings", label: "系統設定", icon: Settings }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg glow-blue"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Core Settings Params panel (Don't show when in Tab settings) */}
          {activeTab !== "settings" && (
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-5">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">推理生成參數設定</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* CFG Scale */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>CFG Scale (自由度)</span>
                    <span className="text-blue-400">{cfgScale.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="9.0"
                    step="0.5"
                    value={cfgScale}
                    onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                    className="h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 leading-tight">數值愈大語氣特徵愈強烈</span>
                </div>

                {/* Inference Timesteps */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>去噪步數 (Steps)</span>
                    <span className="text-purple-400">{timesteps}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={timesteps}
                    onChange={(e) => setTimesteps(parseInt(e.target.value, 10))}
                    className="h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <span className="text-[10px] text-slate-500 leading-tight">建議 10-20 步以達最佳性價比</span>
                </div>

                {/* Speed Rate */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold text-slate-400">
                    <span>生成語速</span>
                    <span className="text-pink-400">{speedRate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speedRate}
                    onChange={(e) => setSpeedRate(parseFloat(e.target.value))}
                    className="h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-[10px] text-slate-500 leading-tight">1.00x 為正常說話語速</span>
                </div>
              </div>

              {/* Boolean parameters checklist */}
              <div className="flex flex-wrap gap-6 pt-2 border-t border-white/5 justify-between">
                <div className="flex gap-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={normalize}
                      onChange={(e) => setNormalize(e.target.checked)}
                      className="rounded bg-slate-800 border-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    音量音訊標準化
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={denoise}
                      onChange={(e) => setDenoise(e.target.checked)}
                      className="rounded bg-slate-800 border-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    啟用降噪前處理
                  </label>
                </div>

                {/* Seed settings */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={seedEnabled}
                      onChange={(e) => setSeedEnabled(e.target.checked)}
                      className="rounded bg-slate-800 border-white/10 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    固定隨機種子
                  </label>
                  {seedEnabled && (
                    <input
                      type="text"
                      placeholder="種子 ID (整數)"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value.replace(/\D/g, ""))}
                      className="w-28 px-2 py-1 bg-slate-950 border border-white/10 text-xs rounded text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Voice Design */}
          {activeTab === "design" && (
            <div className="flex flex-col gap-6">
              {/* Presets List */}
              <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md">
                <h2 className="text-sm font-bold tracking-wider text-slate-400 mb-4 uppercase">精美預設音色範本 (點選套用)</h2>
                <div className="flex flex-col gap-4">
                  {Object.entries(VOICE_PRESETS).map(([langKey, preset]) => (
                    <div key={langKey} className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-slate-300">{preset.label}：</span>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(preset.roles).map(([roleName, roleDesc]) => (
                          <button
                            key={roleName}
                            onClick={() => applyPreset(langKey, roleName, roleDesc, preset.sentence)}
                            className="text-xs px-3 py-1.5 bg-slate-850 hover:bg-slate-750 text-slate-200 border border-white/5 hover:border-slate-600 transition rounded-lg font-medium"
                          >
                            {roleName}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input Text Box and Generation Buttons */}
              <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">目標合成文字</h2>
                  
                  {/* Single/Batch mode toggle */}
                  <div className="flex bg-slate-950 rounded-lg p-0.5 border border-white/5">
                    <button
                      onClick={() => setDesignMode("single")}
                      className={`text-xs px-3 py-1 rounded-md font-bold transition ${
                        designMode === "single" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-250"
                      }`}
                    >
                      單句合成
                    </button>
                    <button
                      onClick={() => setDesignMode("batch")}
                      className={`text-xs px-3 py-1 rounded-md font-bold transition-all ${
                        designMode === "batch" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-250"
                      }`}
                    >
                      批次有聲書
                    </button>
                  </div>
                </div>

                <textarea
                  value={designText}
                  onChange={(e) => setDesignText(e.target.value)}
                  placeholder={
                    designMode === "single"
                      ? "輸入英文特徵描述括號在開頭（例如 (A gentle young female voice, smiling)）後輸入目標合成文字..."
                      : "批次模式：一行代表一句，系統將按行依次背景合成單獨的音檔，適合讀小說/有聲書..."
                  }
                  rows={designMode === "single" ? 5 : 8}
                  className="w-full p-4 bg-slate-950/80 border border-white/10 rounded-xl text-slate-250 focus:outline-none focus:border-blue-500 font-medium placeholder-slate-600 text-sm"
                />

                {/* Actions Trigger button */}
                {designMode === "single" ? (
                  <button
                    onClick={handleSingleDesign}
                    disabled={isSynthesizing || connectionStatus !== "connected"}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.99] transition rounded-xl font-bold text-white shadow-lg glow-blue disabled:opacity-50"
                  >
                    {isSynthesizing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                    開始語音設計合成
                  </button>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                      {!isBatchProcessing ? (
                        <button
                          onClick={handleBatchDesign}
                          disabled={connectionStatus !== "connected"}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition rounded-xl font-bold text-white shadow-lg disabled:opacity-50"
                        >
                          <Play className="h-5 w-5 fill-current" />
                          開始批次合成流
                        </button>
                      ) : (
                        <button
                          onClick={() => { isBatchCancelledRef.current = true; }}
                          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 transition rounded-xl font-bold text-white shadow-lg"
                        >
                          <StopCircle className="h-5 w-5" />
                          停止批次生成
                        </button>
                      )}
                      
                      <button
                        onClick={downloadAllBatchFiles}
                        disabled={batchResults.length === 0}
                        className="px-6 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 transition rounded-xl flex items-center justify-center gap-2 font-bold"
                        title="打包 ZIP 下載"
                      >
                        <Download className="h-5 w-5" />
                        下載 ZIP ({batchResults.length})
                      </button>
                    </div>

                    {/* Batch Progress Bar indicator */}
                    {(isBatchProcessing || batchResults.length > 0) && (
                      <div className="bg-slate-950 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
                        <div className="flex justify-between text-xs font-semibold text-slate-400">
                          <span>批次合成進度</span>
                          <span>{batchProgress.current} / {batchProgress.total} 句 ({Math.round(batchProgress.current / batchProgress.total * 100) || 0}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-300"
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                          />
                        </div>
                        {batchResults.length > 0 && (
                          <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pt-2 border-t border-white/5">
                            {batchResults.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs bg-slate-900 px-3 py-1.5 rounded border border-white/5">
                                <span className="text-slate-300 font-medium truncate max-w-sm">{item.filename}: {item.text}</span>
                                <audio src={URL.createObjectURL(item.blob)} controls className="h-6 w-44" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Voice Clone */}
          {activeTab === "clone" && (
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-6">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">聲音複製 (Voice Clone)</h2>
              
              {/* Mic / Upload Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Micro Recording panel */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="font-bold text-xs text-slate-400">現場麥克風錄音 (3-10 秒黃金長度)</div>
                  
                  {isRecording && recordingTarget === "clone" ? (
                    <button
                      onClick={stopRecording}
                      className="p-4 bg-red-600 hover:bg-red-500 animate-recording rounded-full transition active:scale-95 shadow-lg"
                    >
                      <Square className="h-6 w-6 text-white fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startRecording("clone")}
                      disabled={isRecording}
                      className="p-4 bg-blue-600 hover:bg-blue-500 rounded-full transition active:scale-95 shadow-lg disabled:opacity-50"
                    >
                      <Mic className="h-6 w-6 text-white" />
                    </button>
                  )}

                  {isRecording && recordingTarget === "clone" ? (
                    <div className="text-red-500 text-xs font-semibold animate-pulse">正在錄音中... {recordDuration}s</div>
                  ) : cloneRefFile ? (
                    <div className="text-emerald-400 text-xs font-semibold">已獲取現場錄製音訊！</div>
                  ) : (
                    <div className="text-slate-500 text-xs font-medium">點按按鈕開始錄製</div>
                  )}

                  {/* Visualizer Canvas */}
                  {isRecording && recordingTarget === "clone" && (
                    <canvas ref={canvasRef} className="w-full h-12 bg-transparent rounded mt-2" />
                  )}
                </div>

                {/* Upload File Panel */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="font-bold text-xs text-slate-400">或是上傳現有的 WAV 乾淨參考語音</div>
                  <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-slate-500 rounded-xl p-6 transition w-full">
                    <FolderOpen className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-xs text-slate-400 font-semibold">
                      {cloneRefFile && !(cloneRefFile instanceof Blob && !(cloneRefFile instanceof File))
                        ? (cloneRefFile as File).name
                        : cloneRefFile instanceof Blob
                        ? "已錄製參考音訊.wav"
                        : "選擇 WAV 檔案..."}
                    </span>
                    <input
                      type="file"
                      accept="audio/wav"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setCloneRefFile(e.target.files[0]);
                          setRecordedBlobUrl(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Show local audio preview player */}
              {recordedBlobUrl && (
                <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">參考音訊預覽：</span>
                  <audio src={recordedBlobUrl} controls className="h-8 w-60" />
                  <button 
                    onClick={() => { setCloneRefFile(null); setRecordedBlobUrl(null); }}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Target Text */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400">複製目標發音人聲音，說出以下文字：</label>
                <textarea
                  value={cloneText}
                  onChange={(e) => setCloneText(e.target.value)}
                  placeholder="請輸入目標文字..."
                  rows={4}
                  className="w-full p-4 bg-slate-950/80 border border-white/10 rounded-xl text-slate-250 focus:outline-none focus:border-blue-500 font-medium placeholder-slate-600 text-sm"
                />
              </div>

              <button
                onClick={handleVoiceClone}
                disabled={isSynthesizing || connectionStatus !== "connected"}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition rounded-xl font-bold text-white shadow-lg glow-blue disabled:opacity-50"
              >
                {isSynthesizing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                開始聲音複製合成
              </button>
            </div>
          )}

          {/* TAB 3: Ultimate Clone */}
          {activeTab === "ultimate" && (
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-6">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">極限複製 (Ultimate Clone)</h2>
              
              {/* Mic / Upload Container */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Mic recording */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="font-bold text-xs text-slate-400">現場麥克風錄音 (為極限對齊用)</div>
                  {isRecording && recordingTarget === "ultimate" ? (
                    <button
                      onClick={stopRecording}
                      className="p-4 bg-red-600 hover:bg-red-500 animate-recording rounded-full transition shadow-lg"
                    >
                      <Square className="h-6 w-6 text-white fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startRecording("ultimate")}
                      disabled={isRecording}
                      className="p-4 bg-blue-600 hover:bg-blue-500 rounded-full transition shadow-lg disabled:opacity-50"
                    >
                      <Mic className="h-6 w-6 text-white" />
                    </button>
                  )}
                  {isRecording && recordingTarget === "ultimate" ? (
                    <div className="text-red-500 text-xs font-semibold animate-pulse">正在錄音中... {recordDuration}s</div>
                  ) : ultRefFile ? (
                    <div className="text-emerald-400 text-xs font-semibold">已獲取現場錄製音訊！</div>
                  ) : (
                    <div className="text-slate-500 text-xs font-medium">點按按鈕開始錄製</div>
                  )}

                  {isRecording && recordingTarget === "ultimate" && (
                    <canvas ref={canvasRef} className="w-full h-12 bg-transparent rounded mt-2" />
                  )}
                </div>

                {/* Upload wav */}
                <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center gap-3">
                  <div className="font-bold text-xs text-slate-400">或是上傳 WAV 參考音檔</div>
                  <label className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-slate-500 rounded-xl p-6 transition w-full">
                    <FolderOpen className="h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-xs text-slate-400 font-semibold">
                      {ultRefFile && !(ultRefFile instanceof Blob && !(ultRefFile instanceof File))
                        ? (ultRefFile as File).name
                        : ultRefFile instanceof Blob
                        ? "已錄製參考音訊.wav"
                        : "選擇 WAV 檔案..."}
                    </span>
                    <input
                      type="file"
                      accept="audio/wav"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setUltRefFile(e.target.files[0]);
                          setRecordedBlobUrl(URL.createObjectURL(e.target.files[0]));
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Preview player */}
              {recordedBlobUrl && (
                <div className="bg-slate-950/40 p-3 rounded-lg border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">參考音訊預覽：</span>
                  <audio src={recordedBlobUrl} controls className="h-8 w-60" />
                  <button 
                    onClick={() => { setUltRefFile(null); setRecordedBlobUrl(null); }}
                    className="p-1.5 text-slate-500 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Prompt transcripts */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400">參考音訊的「逐字稿文字」(100% 必須相同，否則會亂讀)：</label>
                <input
                  type="text"
                  value={ultPromptText}
                  onChange={(e) => setUltPromptText(e.target.value)}
                  placeholder="輸入參考音檔裡說出來的逐字稿..."
                  className="w-full px-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 text-sm font-medium"
                />
              </div>

              {/* Target Text */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-400">目標合成文字 (將完美接續參考音尾端語氣，合成為一條音軌)：</label>
                <textarea
                  value={ultText}
                  onChange={(e) => setUltText(e.target.value)}
                  placeholder="請輸入目標文字..."
                  rows={4}
                  className="w-full p-4 bg-slate-950/80 border border-white/10 rounded-xl text-slate-250 focus:outline-none focus:border-blue-500 font-medium placeholder-slate-600 text-sm"
                />
              </div>

              <button
                onClick={handleUltimateClone}
                disabled={isSynthesizing || connectionStatus !== "connected"}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition rounded-xl font-bold text-white shadow-lg glow-blue disabled:opacity-50"
              >
                {isSynthesizing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 fill-current" />}
                開始極限複製合成
              </button>
            </div>
          )}

          {/* TAB 4: System Config */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-6">
              
              {/* Endpoint Settings */}
              <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">GPU 後端連線設定</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold">後端 API 主機位址：</label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="http://your-gpu-ip:8000"
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 text-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-slate-400 font-semibold">API-Key 鑑權密鑰 (選填)：</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="未配置請留空"
                      className="px-4 py-2.5 bg-slate-950 border border-white/10 text-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveConfig}
                  className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 active:scale-95 transition rounded-lg text-slate-200 font-bold text-sm w-fit self-end"
                >
                  儲存並測試連線
                </button>
              </div>

              {/* Model status information & Downloader */}
              <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
                <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">VoxCPM2 離線大模型管理</h2>
                
                {/* Model status alert box */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  modelStatus.exists_complete 
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}>
                  {modelStatus.exists_complete ? (
                    <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs font-semibold">
                    {modelStatus.exists_complete ? (
                      <div>
                        後端大模型檢查完成！全部完整模型檔案皆已就緒。
                        <p className="text-[10px] text-emerald-400/80 mt-1">模型路徑已正確指向後端本機位置，可完美使用 CUDA 進行毫秒推理。</p>
                      </div>
                    ) : (
                      <div>
                        後端檢測到模型缺失！
                        <p className="text-[10px] text-amber-400/80 mt-1">請聯絡系統管理員於後端伺服器進行模型部署。</p>
                        {modelStatus.missing_files.length > 0 && (
                          <div className="text-[10px] text-amber-400/80 mt-1.5 font-medium">
                            缺失檔案清單：{modelStatus.missing_files.join(", ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>


              </div>
            </div>
          )}
        </section>

        {/* Right Side: Visual Output player & Terminal logs (Columns: 5) */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Main Visual Wave Output Player */}
          <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex flex-col gap-4">
            <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">語音合成結果</h2>
            
            {generatedAudioUrl ? (
              <div className="flex flex-col items-center gap-4 py-6 bg-slate-950/80 border border-white/5 rounded-xl">
                <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 text-purple-400">
                  <Volume2 className="h-8 w-8" />
                </div>
                
                <div className="text-center">
                  <div className="text-sm font-bold text-slate-200">語音生成成功！</div>
                  {generatedSeed !== null && (
                    <div className="text-[10px] text-slate-500 font-bold mt-1">隨機種子 ID: {generatedSeed}</div>
                  )}
                </div>

                <audio src={generatedAudioUrl} controls className="w-11/12 mt-2" />

                <div className="flex gap-2 w-11/12 mt-2">
                  <a
                    href={generatedAudioUrl}
                    download={`voxcpm_export_${generatedSeed || "generated"}.wav`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                  >
                    <Download className="h-4 w-4" />
                    下載 WAV 音檔
                  </a>
                  
                  {generatedSeed !== null && (
                    <button
                      onClick={() => {
                        setSeedEnabled(true);
                        setSeed(generatedSeed.toString());
                      }}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs transition"
                    >
                      套用此種子固定音色
                    </button>
                  )}
                </div>
              </div>
            ) : isSynthesizing ? (
              <div className="flex flex-col items-center justify-center gap-4 py-16 bg-slate-950/40 border border-white/5 rounded-xl">
                <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
                <div className="text-xs text-slate-400 font-bold animate-pulse">大模型正在進行去噪推理，請稍候...</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-16 bg-slate-950/40 border border-white/5 rounded-xl border-dashed">
                <Volume2 className="h-10 w-10 text-slate-600" />
                <span className="text-xs text-slate-500 font-semibold">尚未生成任何語音</span>
              </div>
            )}
          </div>

          {/* Real-time Terminal Log Console */}
          <div className="p-5 bg-slate-900/40 border border-white/5 rounded-2xl backdrop-blur-md flex-1 flex flex-col gap-3 min-h-[300px]">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold tracking-wider text-slate-400 uppercase">GPU 推理日誌 (Terminal Log)</h2>
              <button 
                onClick={() => setConsoleLogs([])} 
                className="text-[10px] text-slate-500 hover:text-slate-300 font-semibold"
              >
                清空日誌
              </button>
            </div>
            
            <div className="flex-1 bg-slate-950 p-4 border border-white/5 rounded-xl font-mono text-[11px] leading-relaxed text-slate-300 overflow-y-auto max-h-[400px]">
              {consoleLogs.length === 0 ? (
                <span className="text-slate-600 italic">🔌 待命狀態。推理或下載日誌會實時在此處輸出...</span>
              ) : (
                <div className="flex flex-col gap-1">
                  {consoleLogs.map((log, idx) => (
                    <div key={idx} className={log.includes("❌") ? "text-red-400" : log.includes("✅") ? "text-emerald-400" : ""}>
                      {log}
                    </div>
                  ))}
                  <div ref={consoleBottomRef} />
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 border-t border-white/5 text-center text-xs text-slate-500 font-medium">
        版權所有 © 2026 Studio0808.
      </footer>
    </div>
  );
}
