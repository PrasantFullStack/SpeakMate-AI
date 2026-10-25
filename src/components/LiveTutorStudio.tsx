import React, { useEffect, useRef, useState } from 'react';
import {
  LanguageCode,
  LanguageConfig,
  PlanQuotaConfig,
  ProficiencyLevel,
  ScenarioConfig,
  ScenarioId,
} from '../config/languages';
import {
  buildRealTimeGrammarCorrectionCheck,
  RealTimeGrammarCorrection,
  SavedVocabItem,
  UserOnboardingProfile,
} from '../utils/learningEngine';
import {
  calculateRmsLevel,
  float32ToPcm16Base64,
  GaplessPcmPlayer,
  playWavBase64OrSpeak,
} from '../utils/audioStream';
import {
  Mic,
  MicOff,
  Volume2,
  Send,
  BookmarkPlus,
  Check,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Lock,
  Radio,
  MessageSquare,
} from 'lucide-react';

export interface TranscriptEntry {
  role: 'user' | 'tutor';
  text: string;
  timestamp: string;
  realTimeCorrection?: RealTimeGrammarCorrection | null;
}

export interface SessionEvaluationData {
  grammarScore: number;
  vocabularyScore: number;
  sentenceStructureScore: number;
  fluencyScore: number;
  pronunciationScore: number | null;
  pronunciationNote: string;
  overallSummary: string;
  corrections: Array<{
    originalSentence: string;
    correctedSentence: string;
    explanation: string;
    naturalExample: string;
    category: string;
  }>;
  suggestedVocabulary: Array<{
    phrase: string;
    translation: string;
    explanation: string;
    naturalExample: string;
  }>;
}

interface LiveTutorStudioProps {
  user: UserOnboardingProfile;
  languages: LanguageConfig[];
  scenarios: ScenarioConfig[];
  currentPlan: PlanQuotaConfig;
  usedMinutesToday: number;
  usedSessionsToday: number;
  onSelectLanguageAndProficiency: (lang: LanguageCode, prof: ProficiencyLevel) => Promise<void>;
  onSaveVocab: (item: Partial<SavedVocabItem>) => Promise<void>;
  onSessionEvaluated: () => Promise<void>;
  onNavigateToPlans: () => void;
}

export const LiveTutorStudio: React.FC<LiveTutorStudioProps> = ({
  user,
  languages,
  scenarios,
  currentPlan,
  usedMinutesToday,
  usedSessionsToday,
  onSelectLanguageAndProficiency,
  onSaveVocab,
  onSessionEvaluated,
  onNavigateToPlans,
}) => {
  const activeLanguage =
    languages.find((l) => l.code === user.targetLanguage) || languages[0];

  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>('daily_life');
  const activeScenario =
    scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const [sessionActive, setSessionActive] = useState<boolean>(false);
  const [realTimeGrammarCorrections, setRealTimeGrammarCorrections] = useState<boolean>(true);
  const [liveVoiceConnected, setLiveVoiceConnected] = useState<boolean>(false);
  const [micPermissionState, setMicPermissionState] = useState<'prompt' | 'granted' | 'fallback'>('prompt');
  const [micLevel, setMicLevel] = useState<number>(0);
  const [tutorSpeaking, setTutorSpeaking] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string>('');
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptEntry[]>([
    {
      role: 'tutor',
      text: activeLanguage.starterGreeting,
      timestamp: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [inlineTip, setInlineTip] = useState<string>(
    user.explanationLanguage === 'hi-en'
      ? 'Hinglish Tip: Aap mic chalu karke seedhe bol sakte hain ya neeche diye gaye suggested prompts par click karke baatcheet shuru kar sakte hain.'
      : 'Tip: Start a live two-way voice session with your microphone, or click any scenario prompt below to speak.'
  );
  const [sendingTurn, setSendingTurn] = useState<boolean>(false);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<SessionEvaluationData | null>(null);
  const [savedKeys, setSavedKeys] = useState<Record<string, boolean>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Refs for WebSocket & AudioContext inside callbacks
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmPlayerRef = useRef<GaplessPcmPlayer>(new GaplessPcmPlayer());
  const sessionActiveRef = useRef<boolean>(false);

  // Reset opening greeting when user switches language
  useEffect(() => {
    setTranscript([
      {
        role: 'tutor',
        text: activeLanguage.starterGreeting,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setEvaluationResult(null);
    setQuotaError(null);
  }, [activeLanguage.code]);

  // Session elapsed timer
  useEffect(() => {
    if (!sessionActive) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [sessionActive]);

  // Cleanup audio & websocket on unmount
  useEffect(() => {
    return () => {
      stopVoiceResources();
      pcmPlayerRef.current.close();
    };
  }, []);

  const stopVoiceResources = () => {
    sessionActiveRef.current = false;
    setLiveVoiceConnected(false);
    setMicLevel(0);

    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (_e) {}
      scriptProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.close();
      } catch (_e) {}
      wsRef.current = null;
    }
    pcmPlayerRef.current.stopAll();
  };

  const handleStartVoiceSession = async () => {
    setQuotaError(null);
    setEvaluationResult(null);
    setStatusNotice('Checking subscription quota and initializing Gemini Live session...');

    try {
      const preflightRes = await fetch('/api/session/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageCode: activeLanguage.code,
          scenarioId: activeScenario.id,
          micAvailable: true,
        }),
      });
      const preflight = await preflightRes.json();
      if (!preflight.quota?.allowed) {
        setQuotaError(preflight.quota?.reason || 'Quota limit reached.');
        setStatusNotice('');
        return;
      }

      setSessionActive(true);
      sessionActiveRef.current = true;
      setElapsedSeconds(0);

      // Connect WebSocket to server Gemini Live API bridge
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live-voice`);
      wsRef.current = ws;

      ws.onopen = async () => {
        ws.send(
          JSON.stringify({
            type: 'start',
            languageCode: activeLanguage.code,
            proficiency: user.proficiency,
            scenarioId: activeScenario.id,
            realTimeGrammarCorrections,
          })
        );

        // Request microphone stream for 16kHz PCM streaming
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 16000,
              },
            });
            micStreamRef.current = stream;
            setMicPermissionState('granted');

            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            inputAudioCtxRef.current = inputCtx;

            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;

            source.connect(processor);
            processor.connect(inputCtx.destination);

            processor.onaudioprocess = (event) => {
              if (!sessionActiveRef.current) return;
              const channelData = event.inputBuffer.getChannelData(0);
              const rms = calculateRmsLevel(channelData);
              setMicLevel(rms);
              if (ws.readyState === WebSocket.OPEN) {
                const base64Audio = float32ToPcm16Base64(channelData);
                ws.send(JSON.stringify({ type: 'audio', audio: base64Audio }));
              }
            };
          } catch (_micErr) {
            setMicPermissionState('fallback');
            setStatusNotice(
              'Microphone unavailable or blocked by browser — switched automatically to Hybrid Interactive Voice & Text Mode.'
            );
          }
        } else {
          setMicPermissionState('fallback');
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            setLiveVoiceConnected(true);
            setStatusNotice(
              `Connected to Gemini Live (${activeLanguage.tutorName} · ${activeLanguage.recommendedVoice} voice). Speak naturally!`
            );
          } else if (msg.type === 'quota_error') {
            setQuotaError(msg.error);
            setSessionActive(false);
            stopVoiceResources();
          } else if (msg.type === 'audio' && msg.audio) {
            setTutorSpeaking(true);
            pcmPlayerRef.current.playPcm24kBase64(msg.audio);
            window.setTimeout(() => setTutorSpeaking(false), 900);
          } else if (msg.type === 'output_transcription' || msg.type === 'tutor_text') {
            const textChunk = String(msg.text || '').trim();
            if (textChunk) {
              setTranscript((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'tutor' && last.timestamp === 'Live') {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, text: `${last.text} ${textChunk}`.trim() },
                  ];
                }
                return [
                  ...prev,
                  { role: 'tutor', text: textChunk, timestamp: 'Live' },
                ];
              });
            }
          } else if (msg.type === 'input_transcription') {
            const userChunk = String(msg.text || '').trim();
            if (userChunk) {
              setTranscript((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user' && last.timestamp === 'Live') {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, text: `${last.text} ${userChunk}`.trim() },
                  ];
                }
                return [
                  ...prev,
                  { role: 'user', text: userChunk, timestamp: 'Live' },
                ];
              });
            }
          } else if (msg.type === 'interrupted') {
            pcmPlayerRef.current.stopAll();
            setTutorSpeaking(false);
          } else if (msg.type === 'live_fallback_notice') {
            setStatusNotice(msg.message);
          }
        } catch (_e) {}
      };
    } catch (_err) {
      setStatusNotice('Session started in Hybrid Interactive Mode.');
      setSessionActive(true);
    }
  };

  const handleToggleRealTimeGrammar = () => {
    const nextValue = !realTimeGrammarCorrections;
    setRealTimeGrammarCorrections(nextValue);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'toggle_grammar',
          realTimeGrammarCorrections: nextValue,
        })
      );
    }

    setInlineTip(
      nextValue
        ? user.explanationLanguage === 'hi-en'
          ? 'Real-Time Grammar ON: Baatcheet ke dauran aapke sentences par turant grammar feedback aur sudhaar dikhaya jayega.'
          : 'Real-Time Grammar Corrections enabled: The tutor will gently highlight and recast grammar errors during live conversation.'
        : user.explanationLanguage === 'hi-en'
          ? 'Fluency Mode (Real-Time Grammar OFF): Ab bina kisi rukawat ke bolein — grammar corrections keval session ke ant mein dikhaye jayenge.'
          : 'Real-Time Grammar Corrections disabled: Focus on uninterrupted speaking flow; grammar diagnostics are saved for the post-session report.'
    );
  };

  const handleSendInteractiveTurn = async (textOverride?: string) => {
    const messageToSend = (textOverride ?? inputMessage).trim();
    if (!messageToSend || sendingTurn) return;

    setQuotaError(null);
    if (!sessionActive) {
      setSessionActive(true);
    }
    setInputMessage('');

    const optimisticCorrection = buildRealTimeGrammarCorrectionCheck({
      userText: messageToSend,
      languageCode: activeLanguage.code,
      explanationLanguage: user.explanationLanguage,
      enabled: realTimeGrammarCorrections,
    });

    const nowLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const nextTranscript: TranscriptEntry[] = [
      ...transcript,
      {
        role: 'user',
        text: messageToSend,
        timestamp: nowLabel,
        realTimeCorrection: optimisticCorrection,
      },
    ];
    setTranscript(nextTranscript);
    setSendingTurn(true);

    // Also forward text to Live WebSocket if open
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && liveVoiceConnected) {
      wsRef.current.send(JSON.stringify({ type: 'text', text: messageToSend }));
    }

    try {
      const response = await fetch('/api/conversation/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageCode: activeLanguage.code,
          proficiency: user.proficiency,
          scenarioId: activeScenario.id,
          userMessage: messageToSend,
          transcript: nextTranscript,
          synthesizeAudio: true,
          realTimeGrammarCorrections,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setQuotaError(data.error || 'Quota limit reached for this scenario or plan.');
        setSendingTurn(false);
        return;
      }

      if (data.tutorReply) {
        setTranscript((prev) => [
          ...prev,
          {
            role: 'tutor',
            text: data.tutorReply,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);

        playWavBase64OrSpeak(
          data.audioWavBase64,
          data.tutorReply,
          activeLanguage.bcp47,
          () => setTutorSpeaking(true),
          () => setTutorSpeaking(false)
        );
      }

      if (data.inlineCoachTip) {
        setInlineTip(data.inlineCoachTip);
      }
    } finally {
      setSendingTurn(false);
    }
  };

  const handleEndAndAnalyzeSession = async () => {
    stopVoiceResources();
    setSessionActive(false);
    setEvaluating(true);
    setStatusNotice('Generating post-conversation grammar, vocabulary, and bilingual diagnostics...');

    try {
      const durationMins = Math.max(2, Math.ceil(elapsedSeconds / 60) || 3);
      const response = await fetch('/api/conversation/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          languageCode: activeLanguage.code,
          proficiency: user.proficiency,
          scenarioId: activeScenario.id,
          transcript,
          durationMinutes: durationMins,
          usedVoiceAudio: micPermissionState === 'granted',
        }),
      });
      const data = await response.json();
      if (data.sessionRecord?.evaluation) {
        setEvaluationResult(data.sessionRecord.evaluation);
        await onSessionEvaluated();
      }
    } finally {
      setEvaluating(false);
      setStatusNotice('');
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const remainingMinutes = Math.max(0, currentPlan.dailySpeakingMinutesLimit - usedMinutesToday);

  return (
    <div className="space-y-6">
      {/* Top Studio Control Bar: Language Switcher, Proficiency, Quota Meter */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="studio-lang-select" className="block text-[11px] text-slate-500 font-medium mb-1">
              Active Interview &amp; Speaking Language
            </label>
            <select
              id="studio-lang-select"
              value={activeLanguage.code}
              onChange={(e) =>
                onSelectLanguageAndProficiency(e.target.value as LanguageCode, user.proficiency)
              }
              className="px-3 py-1.5 text-sm font-semibold text-[#0A1128] bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.nativeName}) — Coach: {lang.tutorName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="block text-[11px] text-slate-500 font-medium mb-1">
              Adaptive Tutor Level
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {(['beginner', 'intermediate', 'advanced'] as ProficiencyLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => onSelectLanguageAndProficiency(activeLanguage.code, lvl)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                    user.proficiency === lvl
                      ? 'bg-white text-[#0A1128] shadow-sm'
                      : 'text-slate-600 hover:text-[#0A1128]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[11px] text-slate-500 font-medium mb-1">
              Real-Time Grammar Corrections
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={realTimeGrammarCorrections}
              aria-label="Real-time grammar corrections"
              data-testid="realtime-grammar-toggle"
              onClick={handleToggleRealTimeGrammar}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                realTimeGrammarCorrections
                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                  : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-[#0A1128]'
              }`}
            >
              <span
                className={`w-7 h-4 rounded-md p-0.5 flex items-center transition-colors ${
                  realTimeGrammarCorrections ? 'bg-blue-600 justify-end' : 'bg-slate-400 justify-start'
                }`}
              >
                <span className="w-3 h-3 rounded-sm bg-white shadow-xs" />
              </span>
              <span>
                {realTimeGrammarCorrections ? 'Live Corrections On' : 'Off (Fluency Mode)'}
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
          <div>
            <span className="text-slate-500">Explanation Mode:</span>{' '}
            <span className="font-semibold text-[#0A1128]">
              {user.explanationLanguage === 'hi-en'
                ? 'Hindi + English (Hinglish)'
                : user.explanationLanguage.toUpperCase()}
            </span>
          </div>
          <span aria-hidden="true">·</span>
          <div>
            <span className="text-slate-500">Plan Quota:</span>{' '}
            <span className="font-mono font-semibold text-[#0A1128] tabular-nums">
              {remainingMinutes}m left today
            </span>{' '}
            <span className="text-slate-500">({currentPlan.name})</span>
          </div>
        </div>
      </div>

      {/* Scenario Selector Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 lg:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-[#0A1128]">
              Select AI Mock Interview &amp; Communication Coaching Scenario
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Practice Java, Spring Boot, React, SQL, HR behavioral interviews, executive communication &amp; 10-language fluency
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Setting: {activeScenario.rolePlaySetting}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {scenarios.map((scen) => {
            const isSelected = scen.id === activeScenario.id;
            const isAllowed = currentPlan.allowedScenarios.includes(scen.id);
            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => {
                  setSelectedScenarioId(scen.id);
                  setQuotaError(null);
                }}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 text-[#0A1128] ring-1 ring-blue-600'
                    : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                    <span>{scen.category}</span>
                    {!isAllowed && <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </div>
                  <div className="font-semibold text-xs text-[#0A1128] mt-1 line-clamp-2">
                    {scen.title}
                  </div>
                </div>
                <div className="mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-500">
                  Min Tier: <span className="uppercase font-mono">{scen.minTier}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quota Error Banner if blocked */}
      {quotaError && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-950">
                Server Quota or Plan Tier Restriction
              </h3>
              <p className="text-xs text-amber-900 mt-0.5">{quotaError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToPlans}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
          >
            Upgrade Plan Tier
          </button>
        </div>
      )}

      {/* Main Two-Zone Sandbox Layout (Left: Live Voice Stage & Transcript | Right: Bilingual Diagnostics & Corrections) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone (7 cols): Live Voice Stage + Interactive Transcript */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          {/* Tutor Header & Animated Voice Stage */}
          <div className="p-5 bg-[#0A1128] text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center font-display font-bold text-lg text-blue-300 shrink-0">
                  {activeLanguage.monogram}
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>{activeLanguage.tutorName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeLanguage.tutorPersona}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white font-display mt-0.5">
                    {activeScenario.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Goal: {activeScenario.learnerGoal}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Session Timer</div>
                  <div className="text-sm font-mono font-semibold tabular-nums text-white">
                    {formatTimer(elapsedSeconds)}
                  </div>
                </div>

                {!sessionActive ? (
                  <button
                    type="button"
                    onClick={handleStartVoiceSession}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>Start Voice Session</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleEndAndAnalyzeSession}
                    className="px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <MicOff className="w-4 h-4" />
                    <span>End &amp; Analyze Session</span>
                  </button>
                )}
              </div>
            </div>

            {/* Animated Microphone & Tutor Voice Waveform Visualizer */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform ${
                    sessionActive
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {sessionActive ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-xs font-medium text-white">
                    {sessionActive
                      ? tutorSpeaking
                        ? `${activeLanguage.tutorName} is speaking (${activeLanguage.name})...`
                        : liveVoiceConnected
                          ? 'Gemini Live Audio Active — Listening to your voice'
                          : 'Interactive Hybrid Session Active — Speak or select a response'
                      : 'Ready for Two-Way Voice or Interactive Practice'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {statusNotice || activeLanguage.capabilityNote}
                  </div>
                </div>
              </div>

              {/* Dynamic SVG Audio Bars */}
              <div
                aria-label="Audio waveform visualizer"
                className="flex items-center gap-1 h-8 px-3 bg-slate-950/70 rounded-lg border border-slate-800 shrink-0"
              >
                {[18, 32, 48, 26, 60, 40, 22, 52, 36, 20].map((baseHeight, idx) => {
                  const activeBoost =
                    sessionActive && (tutorSpeaking || micLevel > 5)
                      ? Math.min(100, baseHeight + ((micLevel + idx * 11) % 45))
                      : 20;
                  return (
                    <span
                      key={idx}
                      style={{ height: `${ Math.max(20, activeBoost) }%` }}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        tutorSpeaking
                          ? 'bg-sky-400'
                          : sessionActive
                            ? 'bg-emerald-400'
                            : 'bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Conversation Transcript */}
          <div
            data-testid="conversation-transcript"
            className="p-5 space-y-4 max-h-[380px] overflow-y-auto bg-slate-50/50"
          >
            {transcript.map((item, idx) => {
              const isTutor = item.role === 'tutor';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isTutor ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1 px-1">
                    <span className="font-semibold text-slate-700">
                      {isTutor ? activeLanguage.tutorName : user.name}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{item.timestamp}</span>
                    {isTutor && (
                      <button
                        type="button"
                        onClick={() =>
                          playWavBase64OrSpeak(
                            null,
                            item.text,
                            activeLanguage.bcp47,
                            () => setTutorSpeaking(true),
                            () => setTutorSpeaking(false)
                          )
                        }
                        aria-label={`Listen to ${activeLanguage.tutorName} utterance ${idx + 1}`}
                        className="text-sky-600 hover:text-sky-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Listen</span>
                      </button>
                    )}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      isTutor
                        ? 'bg-white border border-slate-200 text-slate-900'
                        : 'bg-slate-900 text-white'
                    }`}
                  >
                    {item.text}
                  </div>
                  {!isTutor && realTimeGrammarCorrections && item.realTimeCorrection && (
                    <div
                      data-testid="inline-grammar-correction"
                      className="mt-1.5 max-w-[88%] rounded-lg px-3.5 py-2.5 bg-amber-50 border border-amber-200 text-xs text-slate-800 space-y-1"
                    >
                      <div className="font-semibold text-amber-900">
                        Live Grammar Correction:{' '}
                        <span className="text-emerald-800">{item.realTimeCorrection.correctedSentence}</span>
                      </div>
                      <div className="text-slate-600">{item.realTimeCorrection.explanation}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {sendingTurn && (
              <div className="text-xs text-slate-500 italic">
                {activeLanguage.tutorName} is formulating a response in {activeLanguage.name}...
              </div>
            )}
          </div>

          {/* Suggested Spoken Responses & Interactive Input Box */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3">
            <div>
              <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                Suggested Role-Play Responses (Click to Speak & Send):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeScenario.suggestedPrompts.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendInteractiveTurn(promptText)}
                    disabled={sendingTurn}
                    className="text-left text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-sky-50 hover:text-sky-900 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                  >
                    “{promptText}”
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendInteractiveTurn();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                aria-label="Speak or type your response in the conversation"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={`Speak into mic or type your ${activeLanguage.name} interview response here...`}
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
              />
              <button
                type="submit"
                disabled={sendingTurn || !inputMessage.trim()}
                className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Turn</span>
              </button>
              <button
                type="button"
                onClick={handleEndAndAnalyzeSession}
                disabled={evaluating}
                className="px-4 py-2.5 text-xs font-semibold text-[#0A1128] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
              >
                {evaluating ? 'Analyzing...' : 'Get Feedback'}
              </button>
            </form>

            {/* Real-time Inline Coach Tip */}
            <div className="px-3 py-2 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs text-slate-700 flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{inlineTip}</span>
            </div>
          </div>
        </div>

        {/* Right Zone (5 cols): Post-Conversation Bilingual Feedback & Corrections */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
            <div>
              <h2 className="text-base font-bold text-[#0A1128] font-display">
                Grammar, Clarity &amp; Answer-Structure Feedback
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Original sentence · Corrected sentence · Bilingual explanation · Natural example
              </p>
            </div>
            <button
              type="button"
              onClick={handleEndAndAnalyzeSession}
              disabled={evaluating}
              className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {evaluating ? 'Evaluating...' : 'Analyze Transcript'}
            </button>
          </div>

          {/* Score Breakdown Grid */}
          {evaluationResult ? (
            <div className="space-y-5" data-testid="evaluation-report">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Grammar', score: evaluationResult.grammarScore },
                  { label: 'Vocabulary', score: evaluationResult.vocabularyScore },
                  { label: 'Structure', score: evaluationResult.sentenceStructureScore },
                  { label: 'Fluency', score: evaluationResult.fluencyScore },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center"
                  >
                    <div className="text-[11px] text-slate-500">{metric.label}</div>
                    <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {metric.score}%
                    </div>
                  </div>
                ))}
              </div>

              {/* Honest Model Capability & Pronunciation Evaluation Note */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between font-semibold text-slate-900">
                  <span>Pronunciation & Fluency Evaluation</span>
                  <span className="font-mono tabular-nums">
                    {evaluationResult.pronunciationScore !== null
                      ? `${evaluationResult.pronunciationScore}% Acoustic`
                      : 'Transcript Mode'}
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {evaluationResult.pronunciationNote}
                </p>
              </div>

              {/* Overall Bilingual Summary */}
              <div className="p-3.5 rounded-lg bg-sky-50/60 border border-sky-200 text-xs text-slate-800 leading-relaxed">
                <div className="font-semibold text-slate-900 mb-1">
                  Tutor Summary ({user.explanationLanguage === 'hi-en' ? 'Hindi + English' : user.explanationLanguage.toUpperCase()}):
                </div>
                {evaluationResult.overallSummary}
              </div>

              {/* Detailed Sentence Corrections */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-900">
                  Sentence-by-Sentence Corrections ({evaluationResult.corrections.length})
                </h3>
                {evaluationResult.corrections.map((item, idx) => {
                  const saveKey = `corr-${idx}`;
                  const isSaved = Boolean(savedKeys[saveKey]);
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border border-slate-200 bg-white space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-medium text-slate-700">{item.category}</span>
                        <button
                          type="button"
                          disabled={isSaved}
                          onClick={async () => {
                            await onSaveVocab({
                              languageCode: activeLanguage.code,
                              phrase: item.correctedSentence,
                              translation: item.originalSentence,
                              explanation: item.explanation,
                              naturalExample: item.naturalExample,
                              category: item.category,
                            });
                            setSavedKeys((prev) => ({ ...prev, [saveKey]: true }));
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 disabled:text-emerald-700 cursor-pointer"
                        >
                          {isSaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Saved to Notebook</span>
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="w-3.5 h-3.5" />
                              <span>Save Phrase</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-xs space-y-1.5">
                        <div>
                          <span className="text-slate-500 font-medium">Original: </span>
                          <span className="line-through text-rose-700">{item.originalSentence}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-medium">Corrected: </span>
                          <span className="font-semibold text-emerald-800">
                            {item.correctedSentence}
                          </span>
                        </div>
                        <div className="pt-1 text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">Explanation: </span>
                          {item.explanation}
                        </div>
                        <div className="pt-1 text-slate-600 italic">
                          <span className="not-italic font-semibold text-slate-800">
                            Natural Example:{' '}
                          </span>
                          “{item.naturalExample}”
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Preview Sample Corrections for the Selected Language before session ends */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                Practice speaking with <strong className="text-slate-900">{activeLanguage.tutorName}</strong> on the left, then click{' '}
                <strong className="text-slate-900">Analyze Transcript</strong> or{' '}
                <strong className="text-slate-900">End & Analyze Session</strong> to generate live diagnostic scores. Below is a preview of how corrections are explained in your preferred language ({user.explanationLanguage === 'hi-en' ? 'Hindi-to-English' : user.explanationLanguage}):
              </div>

              {activeLanguage.sampleCorrections.map((sc, idx) => {
                const saveKey = `sample-${activeLanguage.code}-${idx}`;
                const isSaved = Boolean(savedKeys[saveKey]);
                const explanationText =
                  user.explanationLanguage === 'hi-en' || user.explanationLanguage === 'hi'
                    ? sc.explanationHi
                    : sc.explanationEn;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-slate-200 bg-white space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {sc.category} · {activeLanguage.name} Diagnostic Preview
                      </span>
                      <button
                        type="button"
                        disabled={isSaved}
                        onClick={async () => {
                          await onSaveVocab({
                            languageCode: activeLanguage.code,
                            phrase: sc.correctedSentence,
                            translation: sc.originalSentence,
                            explanation: explanationText,
                            naturalExample: sc.naturalExample,
                            category: sc.category,
                          });
                          setSavedKeys((prev) => ({ ...prev, [saveKey]: true }));
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900 disabled:text-emerald-700 cursor-pointer"
                      >
                        {isSaved ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>Save to Notebook</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs space-y-1.5">
                      <div>
                        <span className="text-slate-500 font-medium">Original Sentence: </span>
                        <span className="line-through text-rose-700">{sc.originalSentence}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Corrected Sentence: </span>
                        <span className="font-semibold text-emerald-800">
                          {sc.correctedSentence}
                        </span>
                      </div>
                      <div className="pt-1 text-slate-700 leading-relaxed">
                        <span className="font-semibold text-slate-900">
                          Explanation ({user.explanationLanguage === 'hi-en' ? 'Hindi + English' : 'Preferred Language'}):{' '}
                        </span>
                        {explanationText}
                      </div>
                      <div className="pt-1 text-slate-600 italic">
                        <span className="not-italic font-semibold text-slate-800">
                          Natural Example:{' '}
                        </span>
                        “{sc.naturalExample}”
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
