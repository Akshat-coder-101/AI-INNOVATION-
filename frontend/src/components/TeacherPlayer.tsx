"use client";

import { useState, useEffect, useRef } from "react";
import { 
  LessonSegmentRender, 
  InteractionResponse, 
  api 
} from "@/lib/api";
import VisualRenderer from "./VisualRenderer";
import CitationChip from "./CitationChip";
import DemoModeToggle from "./DemoModeToggle";
import MisconceptionModal from "./MisconceptionModal";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw,
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Send, 
  Languages, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Code2, 
  Tv,
  Mic,
  MicOff,
  Radio,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  LayoutGrid
} from "lucide-react";

interface TeacherPlayerProps {
  initialSegment: LessonSegmentRender;
  totalSegments: number;
  onLessonComplete: () => void;
  onSegmentChange?: (segmentId: number) => void;
}

export default function TeacherPlayer({
  initialSegment,
  totalSegments,
  onLessonComplete,
  onSegmentChange,
}: TeacherPlayerProps) {
  const [segment, setSegment] = useState<LessonSegmentRender>(initialSegment);
  const [activeTab, setActiveTab] = useState<"interactive" | "reading" | "practice">("interactive");
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeCaption, setActiveCaption] = useState<string>("");
  const [progressSec, setProgressSec] = useState<number>(0);
  const [durationSec, setDurationSec] = useState<number>(14);
  const [isPausedForCheckpoint, setIsPausedForCheckpoint] = useState<boolean>(false);
  const [studentAnswer, setStudentAnswer] = useState<string>("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [misconceptionData, setMisconceptionData] = useState<InteractionResponse | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>(initialSegment.language || "en");
  const [isSwitchingLang, setIsSwitchingLang] = useState<boolean>(false);
  const [naturalQuery, setNaturalQuery] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Audio Recording State for STT
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  // SSE Token Streaming State
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamedText, setStreamedText] = useState<string>("");

  const [playerViewMode, setPlayerViewMode] = useState<"theater" | "split">("theater");
  const [isTranscriptExpanded, setIsTranscriptExpanded] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isSpeakingWebSpeech = useRef<boolean>(false);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleSkip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(durationSec, progressSec + seconds));
    setProgressSec(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
    if (videoRef.current) videoRef.current.currentTime = newTime;
  };

  // Sync segment on prop changes
  useEffect(() => {
    setSegment(initialSegment);
    setProgressSec(0);
    setIsPausedForCheckpoint(false);
    setIsPlaying(true);
    setFeedbackMessage(null);
    setStudentAnswer("");

    // Calculate segment duration from captions or speech length
    if (initialSegment.captions && initialSegment.captions.length > 0) {
      const maxEnd = Math.max(...initialSegment.captions.map((c) => c.end_sec));
      setDurationSec(Math.max(6, Math.ceil(maxEnd)));
    } else {
      const words = initialSegment.spoken_script.split(" ").length;
      setDurationSec(Math.max(6, Math.ceil(words / 2.2)));
    }
  }, [initialSegment]);

  // Handle Real Audio playback vs Web Speech fallback
  useEffect(() => {
    if (!isPlaying) {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.pause();
      }
      return;
    }

    // If real ElevenLabs audio URL exists
    if (segment.audio_url) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.muted = isMuted;
        audioRef.current.play().catch((e) => console.log("Audio autoplay prevented:", e));
      }
    } else {
      // Fallback: Web Speech API (with stateful resume)
      if (typeof window !== "undefined" && "speechSynthesis" in window && !isMuted && activeTab === "interactive") {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else if (!window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(segment.spoken_script);
          utterance.rate = 1.0;
          utterance.lang = activeLanguage === "hi" ? "hi-IN" : "en-US";
          utterance.onend = () => {
            setIsPlaying(false);
            setIsPausedForCheckpoint(true);
          };
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [isPlaying, isMuted, segment, activeLanguage, activeTab]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Web Speech fallback playback timer (only if NO audio_url)
  useEffect(() => {
    let interval: any = null;
    if (!segment.audio_url && isPlaying && !isPausedForCheckpoint) {
      interval = setInterval(() => {
        setProgressSec((prev) => {
          const next = prev + 0.5;
          if (next >= durationSec) {
            setIsPlaying(false);
            setIsPausedForCheckpoint(true);
            return durationSec;
          }
          return next;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [segment.audio_url, isPlaying, isPausedForCheckpoint, durationSec]);

  // Update live caption dynamically from captions array
  useEffect(() => {
    if (!segment.captions || segment.captions.length === 0) {
      setActiveCaption(segment.spoken_script);
      return;
    }
    const current = segment.captions.find(
      (c) => progressSec >= c.start_sec && progressSec <= c.end_sec
    );
    if (current) {
      setActiveCaption(current.text);
    } else if (progressSec >= durationSec) {
      setActiveCaption(segment.captions[segment.captions.length - 1]?.text || segment.spoken_script);
    } else {
      setActiveCaption(segment.captions[0]?.text || segment.spoken_script);
    }
  }, [progressSec, segment, durationSec]);

  // Audio HTML5 Events Handler
  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      setProgressSec(cur);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDurationSec(Math.ceil(audioRef.current.duration));
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setIsPausedForCheckpoint(true);
  };

  // Student answer submission
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studentAnswer.trim()) return;

    setIsSubmittingAnswer(true);
    try {
      const res = await api.submitAnswer({
        session_id: segment.session_id,
        segment_id: segment.segment_id,
        student_answer: studentAnswer,
        is_demo_mode: isDemoMode,
        force_misconception: isDemoMode, // Deterministic reteach demo
      });

      if (res.action === "reteach") {
        setMisconceptionData(res);
      } else {
        setFeedbackMessage(res.feedback);
        setTimeout(async () => {
          setFeedbackMessage(null);
          setStudentAnswer("");
          setIsPausedForCheckpoint(false);
          
          if (segment.segment_id >= totalSegments) {
            onLessonComplete();
          } else {
            const nextSegId = segment.segment_id + 1;
            const nextSeg = await api.renderSegment(
              nextSegId,
              segment.session_id,
              activeLanguage
            );
            setSegment(nextSeg);
            setProgressSec(0);
            setIsPlaying(true);
            if (onSegmentChange) onSegmentChange(nextSegId);
          }
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Voice recording & submission (Deepgram STT) with Barge-In
  const startRecording = async () => {
    try {
      // Barge-in: immediately stop active video/audio/speech synthesis
      setIsPlaying(false);
      if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
      if (videoRef.current && !videoRef.current.paused) videoRef.current.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        const formData = new FormData();
        formData.append("audio", audioBlob, "voice_answer.wav");
        formData.append("session_id", segment.session_id);
        formData.append("segment_id", segment.segment_id.toString());
        formData.append("is_demo_mode", isDemoMode.toString());
        formData.append("force_misconception", isDemoMode.toString());

        setIsSubmittingAnswer(true);
        try {
          const res = await api.submitVoiceAnswer(formData);
          if (res.transcript) {
            setStudentAnswer(res.transcript);
          }
          if (res.action === "reteach") {
            setMisconceptionData(res);
          } else {
            setFeedbackMessage(res.feedback);

            // If teacher spoken reply audio is returned, play it
            if (res.audio_url) {
              const fullAudioUrl = res.audio_url.startsWith("http") ? res.audio_url : `${apiBaseUrl}${res.audio_url}`;
              const replyAudio = new Audio(fullAudioUrl);
              replyAudio.play().catch((e) => console.log("Voice reply play error:", e));
            }

            setTimeout(async () => {
              setFeedbackMessage(null);
              setStudentAnswer("");
              setIsPausedForCheckpoint(false);
              if (segment.segment_id >= totalSegments) {
                onLessonComplete();
              } else {
                const nextSegId = segment.segment_id + 1;
                const nextSeg = await api.renderSegment(nextSegId, segment.session_id, activeLanguage);
                setSegment(nextSeg);
                if (onSegmentChange) onSegmentChange(nextSegId);
              }
            }, 3500);
          }
        } catch (err) {
          console.error("Voice submission error:", err);
        } finally {
          setIsSubmittingAnswer(false);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to access microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };

  // SSE Token Streaming for Explanations
  const handleStartTokenStream = async () => {
    setIsStreaming(true);
    setStreamedText("");
    try {
      const resp = await fetch(
        `${apiBaseUrl}/api/lesson/segment/${segment.segment_id}/stream?session_id=${segment.session_id}&language=${activeLanguage}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data:")) {
              const data = line.replace("data:", "").trim();
              if (data === "[DONE]") {
                break;
              }
              accumulated += (accumulated ? " " : "") + data;
              setStreamedText(accumulated);
              setActiveCaption(accumulated);
            }
          }
        }
      }
    } catch (err) {
      console.error("Token streaming error:", err);
    } finally {
      setIsStreaming(false);
    }
  };

  // Continue with adaptive reteach segment
  const handleContinueReteach = () => {
    if (misconceptionData?.reteach_segment) {
      setSegment(misconceptionData.reteach_segment);
      setMisconceptionData(null);
      setProgressSec(0);
      setStudentAnswer("");
      setIsPausedForCheckpoint(false);
      setIsPlaying(true);
    }
  };

  // Language switch
  const handleLanguageChange = async (targetLang: string) => {
    if (targetLang === activeLanguage) return;
    setIsSwitchingLang(true);
    try {
      const updatedSeg = await api.switchLanguage({
        session_id: segment.session_id,
        target_language: targetLang,
        current_segment_id: segment.segment_id,
      });
      setActiveLanguage(targetLang);
      setSegment(updatedSeg);
      setProgressSec(0);
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwitchingLang(false);
    }
  };

  const handleNaturalLanguageSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = naturalQuery.toLowerCase();
    if (q.includes("hindi") || q.includes("हिंदी")) {
      handleLanguageChange("hi");
    } else if (q.includes("hinglish")) {
      handleLanguageChange("hinglish");
    } else if (q.includes("english") || q.includes("अंग्रेजी")) {
      handleLanguageChange("en");
    }
    setNaturalQuery("");
  };

  return (
    <div className="space-y-4">
      {/* Hidden real HTML5 audio element when ElevenLabs audio_url is present */}
      {segment.audio_url && (
        <audio
          ref={audioRef}
          src={segment.audio_url.startsWith("http") ? segment.audio_url : `${apiBaseUrl}${segment.audio_url}`}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={handleAudioEnded}
          autoPlay={isPlaying}
        />
      )}

      {/* Top Tab Switcher & Language Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-border shadow-2xs">
        <div className="flex items-center gap-1 bg-canvas-elevated p-1 rounded-md border border-border">
          <button
            onClick={() => setActiveTab("interactive")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "interactive"
                ? "bg-primary text-white shadow-2xs"
                : "text-ink-secondary hover:text-ink-primary hover:bg-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Interactive Video</span>
          </button>
          <button
            onClick={() => setActiveTab("reading")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "reading"
                ? "bg-primary text-white shadow-2xs"
                : "text-ink-secondary hover:text-ink-primary hover:bg-white"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reading Notes</span>
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "practice"
                ? "bg-primary text-white shadow-2xs"
                : "text-ink-secondary hover:text-ink-primary hover:bg-white"
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Practice Sandbox</span>
          </button>
        </div>

        {/* View Mode Switcher: Theater (Large Screen) vs Split View */}
        {activeTab === "interactive" && (
          <div className="hidden sm:flex items-center gap-1 bg-canvas-elevated p-1 rounded-md border border-border">
            <button
              onClick={() => setPlayerViewMode("theater")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                playerViewMode === "theater"
                  ? "bg-white text-primary font-bold shadow-2xs"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
              title="Large Screen Theater Mode"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Large Screen</span>
            </button>
            <button
              onClick={() => setPlayerViewMode("split")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                playerViewMode === "split"
                  ? "bg-white text-primary font-bold shadow-2xs"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
              title="Split View (Side-by-Side)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
          </div>
        )}

        {/* Language Switcher */}
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-ink-muted" />
          <div className="flex rounded bg-canvas-elevated p-0.5 border border-border text-xs">
            {[
              { id: "en", label: "English" },
              { id: "hi", label: "हिंदी" },
              { id: "hinglish", label: "Hinglish" },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                disabled={isSwitchingLang}
                className={`px-2.5 py-1 rounded font-semibold transition-all ${
                  activeLanguage === lang.id
                    ? "bg-white text-primary shadow-2xs font-bold"
                    : "text-ink-secondary hover:text-ink-primary"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: AI INTERACTIVE LESSON */}
      {activeTab === "interactive" && (
        <div className="space-y-6">
          {/* THEATER / LARGE SCREEN MODE */}
          {playerViewMode === "theater" ? (
            <div className="space-y-6">
              {/* Large Screen Video Viewport */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 w-full aspect-video sm:max-h-[480px] shadow-2xl flex flex-col justify-between group transition-all">
                {/* Media Element */}
                {segment.video_url ? (
                  <video
                    ref={videoRef}
                    src={segment.video_url.startsWith("http") ? segment.video_url : `${apiBaseUrl}${segment.video_url}`}
                    playsInline
                    autoPlay={isPlaying}
                    muted={isMuted}
                    className="absolute inset-0 w-full h-full object-contain bg-black"
                    onTimeUpdate={() => {
                      if (videoRef.current) setProgressSec(videoRef.current.currentTime);
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      setIsPausedForCheckpoint(true);
                    }}
                  />
                ) : segment.avatar_video_url ? (
                  <video
                    ref={videoRef}
                    src={segment.avatar_video_url}
                    playsInline
                    autoPlay={isPlaying}
                    muted={isMuted}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  /* Virtual Teacher Studio (free_avatar) */
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-4">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className={`relative rounded-full overflow-hidden transition-all duration-500 w-28 h-28 sm:w-36 sm:h-36 ${
                        isPlaying
                          ? "ring-4 ring-primary ring-offset-4 ring-offset-neutral-950 shadow-[0_0_35px_rgba(0,86,210,0.4)] scale-105"
                          : "ring-2 ring-neutral-700"
                      }`}>
                        <img
                          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop"
                          alt="Prof. Sahayak"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <span className="text-white text-sm font-bold tracking-wide mt-3">
                        Prof. Sahayak AI
                      </span>
                      <span className="text-neutral-400 text-xs font-mono mt-0.5">
                        {activeLanguage === "hi" ? "अध्यापन सत्र (Hindi)" : activeLanguage === "hinglish" ? "Interactive Hinglish Session" : "Adaptive Lecture Studio"}
                      </span>

                      {/* Waveform Equalizer when Playing */}
                      {isPlaying && (
                        <div className="flex items-center gap-1 mt-3">
                          <span className="w-1.5 h-3.5 bg-accent rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-6 bg-highlight rounded-full animate-bounce [animation-delay:0.15s]"></span>
                          <span className="w-1.5 h-8 bg-primary rounded-full animate-bounce [animation-delay:0.3s]"></span>
                          <span className="w-1.5 h-5 bg-accent rounded-full animate-bounce [animation-delay:0.45s]"></span>
                          <span className="w-1.5 h-2.5 bg-highlight rounded-full animate-bounce [animation-delay:0.6s]"></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Status & Controls Overlay */}
                <div className="relative z-20 flex items-center justify-between p-3 sm:p-4 bg-gradient-to-b from-black/80 via-black/30 to-transparent">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-white font-mono font-bold border border-white/20 flex items-center gap-1.5 shadow-md">
                      <span className={`w-2 h-2 rounded-full ${isPlaying ? "bg-emerald-400 animate-pulse" : "bg-neutral-500"}`}></span>
                      {segment.audio_url ? "ElevenLabs Voice" : "AI Teacher Synced"}
                    </span>
                    {segment.is_reteach && (
                      <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-accent/90 backdrop-blur-md text-white font-mono font-bold animate-pulse shadow-md">
                        Adaptive Reteach
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Speed Selector */}
                    <div className="flex items-center bg-black/70 backdrop-blur-md rounded-md p-0.5 border border-white/20 text-[10px] font-mono font-bold text-white">
                      {[1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => handleRateChange(rate)}
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            playbackRate === rate ? "bg-primary text-white" : "text-neutral-300 hover:text-white"
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setPlayerViewMode("split")}
                      className="p-1.5 rounded-md bg-black/70 hover:bg-black/90 backdrop-blur-md text-white border border-white/20 text-xs flex items-center gap-1 transition-all"
                      title="Switch to Split View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Split View</span>
                    </button>
                  </div>
                </div>

                {/* In-Video Live Subtitle Pill */}
                <div className="relative z-20 px-4 pb-2 pointer-events-none">
                  <div className="max-w-3xl mx-auto px-4 py-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-center shadow-lg pointer-events-auto">
                    <p className="text-xs sm:text-sm font-medium text-white leading-relaxed drop-shadow-sm line-clamp-2">
                      "{activeCaption || segment.spoken_script}"
                    </p>
                  </div>
                </div>

                {/* Bottom Scrub Timeline & Playback Bar */}
                <div className="relative z-20 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent space-y-2">
                  <div 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickRatio = (e.clientX - rect.left) / rect.width;
                      const newSec = clickRatio * durationSec;
                      handleSkip(newSec - progressSec);
                    }}
                    className="w-full h-1.5 hover:h-2.5 bg-white/20 rounded-full cursor-pointer relative group/timeline transition-all"
                  >
                    <div 
                      className="h-full bg-primary rounded-full relative transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, (progressSec / (durationSec || 1)) * 100))}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md scale-0 group-hover/timeline:scale-100 transition-transform" />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-9 h-9 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                        title={isPlaying ? "Pause Lecture" : "Play Lecture"}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      <button
                        onClick={() => handleSkip(-10)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs"
                        title="Rewind 10 seconds"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleSkip(10)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs"
                        title="Skip forward 10 seconds"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-xs ml-1"
                        title={isMuted ? "Unmute" : "Mute"}
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>

                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-300 font-mono font-semibold ml-2">
                        <span>{Math.floor(progressSec)}s</span>
                        <span className="text-neutral-500">/</span>
                        <span>{durationSec}s</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleStartTokenStream}
                        disabled={isStreaming}
                        className="text-[10px] sm:text-xs px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-mono font-bold transition-all flex items-center gap-1 border border-white/10"
                        title="Stream real-time LLM token explanation"
                      >
                        <Sparkles className="w-3 h-3 text-highlight" />
                        <span className="hidden sm:inline">{isStreaming ? "Streaming..." : "Live Stream"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Subtitle Transcript Ribbon & Natural Language Switcher */}
              <div className="bg-white rounded-xl p-4 sm:p-5 border border-border space-y-4 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">
                      Spoken Subtitles & Transcript
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-[#0F7B3F] font-mono font-bold border border-emerald-200">
                      Live Synced
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    <button
                      onClick={() => setIsTranscriptExpanded(!isTranscriptExpanded)}
                      className="text-xs text-ink-muted hover:text-primary transition-colors flex items-center gap-1 font-semibold"
                    >
                      <span>{isTranscriptExpanded ? "Collapse Script" : "View Full Script"}</span>
                      {isTranscriptExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-ink-primary leading-relaxed font-medium">
                  "{activeCaption || segment.spoken_script}"
                </p>

                {isTranscriptExpanded && (
                  <div className="p-4 rounded-lg bg-canvas-elevated border border-border space-y-3 mt-2">
                    <h5 className="text-xs font-bold uppercase text-ink-muted">Complete Segment Transcript</h5>
                    <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-wrap">
                      {streamedText || segment.spoken_script}
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <CitationChip citations={segment.citations} />

                  <form onSubmit={handleNaturalLanguageSwitch} className="relative w-full sm:w-80">
                    <input
                      type="text"
                      value={naturalQuery}
                      onChange={(e) => setNaturalQuery(e.target.value)}
                      placeholder="Ask in natural language (e.g. 'Explain in Hindi')"
                      className="w-full px-3.5 py-2 rounded-md bg-white border border-border text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-primary transition-colors pr-9"
                    />
                    <button
                      type="submit"
                      className="absolute right-1.5 top-1.5 p-1.5 rounded bg-black hover:bg-neutral-800 text-white transition-colors"
                      title="Submit query"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Lower Stage: Blackboard (Visual Spec) & Concept Checkpoint */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Interactive Blackboard & Demonstrator
                    </span>
                    <span className="text-xs text-primary font-semibold">Live Visual Canvas</span>
                  </div>
                  <div className="min-h-[380px]">
                    <VisualRenderer visualSpec={segment.visual_spec} />
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      Pedagogical Checkpoint
                    </span>
                    {isPausedForCheckpoint && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFF1E6] text-accent font-bold border border-orange-200 animate-pulse">
                        Paused for Answer
                      </span>
                    )}
                  </div>

                  {/* Concept Checkpoint Card */}
                  <div className="bg-white rounded-xl p-5 border border-border shadow-2xs space-y-4">
                    <div className="flex items-center gap-2 pb-2.5 border-b border-border">
                      <HelpCircle className="w-4 h-4 text-primary" />
                      <h3 className="font-bold text-sm text-ink-primary">Concept Mastery Check</h3>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-ink-primary leading-relaxed">
                      {segment.checkpoint_question.question}
                    </p>

                    {/* Multiple Choice Options */}
                    {segment.checkpoint_question.options && (
                      <div className="grid grid-cols-1 gap-2">
                        {segment.checkpoint_question.options.map((opt, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setStudentAnswer(opt)}
                            className={`text-left p-3 rounded-lg border text-xs transition-all ${
                              studentAnswer === opt
                                ? "bg-[#E9F1FC] border-primary text-primary font-bold shadow-2xs"
                                : "bg-white border-border text-ink-secondary hover:border-primary/50 hover:bg-canvas-elevated"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Free Text Input */}
                    {!segment.checkpoint_question.options && (
                      <textarea
                        rows={3}
                        value={studentAnswer}
                        onChange={(e) => setStudentAnswer(e.target.value)}
                        placeholder="Explain your understanding in your own words..."
                        className="w-full p-3 rounded-md bg-white border border-border text-xs text-ink-primary placeholder-ink-muted focus:outline-none focus:border-primary"
                      />
                    )}

                    {feedbackMessage && (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-[#0F7B3F] font-bold flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-pre-wrap">{feedbackMessage}</span>
                      </div>
                    )}

                    <form onSubmit={handleSubmitAnswer} className="space-y-3 pt-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <DemoModeToggle
                            isDemoMode={isDemoMode}
                            onToggle={setIsDemoMode}
                          />

                          {/* Voice Answer STT Button */}
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2 rounded-full border transition-all flex items-center gap-1.5 text-xs font-semibold ${
                              isRecording 
                                ? "bg-rose-50 border-rose-500 text-rose-600 animate-pulse ring-2 ring-rose-300"
                                : "bg-white border-border text-ink-secondary hover:border-primary hover:text-primary"
                            }`}
                            title={isRecording ? "Stop voice recording" : "Answer with Voice (Deepgram Nova-2)"}
                          >
                            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            <span className="text-[11px] hidden sm:inline">
                              {isRecording ? "Listening..." : "Voice Answer"}
                            </span>
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingAnswer || (!studentAnswer.trim() && !isRecording)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-2xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{isSubmittingAnswer ? "Evaluating..." : "Check Answer"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* SPLIT MODE (SIDE-BY-SIDE) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Video + Transcript */}
              <div className="lg:col-span-6 flex flex-col space-y-4">
                {/* Video Viewport */}
                <div className="relative rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-950 aspect-video w-full shadow-xl flex flex-col justify-between group">
                  {segment.video_url ? (
                    <video
                      ref={videoRef}
                      src={segment.video_url.startsWith("http") ? segment.video_url : `${apiBaseUrl}${segment.video_url}`}
                      playsInline
                      autoPlay={isPlaying}
                      muted={isMuted}
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      onTimeUpdate={() => {
                        if (videoRef.current) setProgressSec(videoRef.current.currentTime);
                      }}
                      onEnded={() => {
                        setIsPlaying(false);
                        setIsPausedForCheckpoint(true);
                      }}
                    />
                  ) : segment.avatar_video_url ? (
                    <video
                      ref={videoRef}
                      src={segment.avatar_video_url}
                      playsInline
                      autoPlay={isPlaying}
                      muted={isMuted}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 via-neutral-950 to-black p-4">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-2 border-primary/50 shadow-md">
                        <img
                          src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop"
                          alt="AI Teacher"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-white text-xs font-bold mt-2">Prof. Sahayak AI</span>
                    </div>
                  )}

                  {/* Top Bar */}
                  <div className="relative z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-black/70 text-white font-mono font-bold border border-white/20">
                      AI Teacher Synced
                    </span>
                    <button
                      onClick={() => setPlayerViewMode("theater")}
                      className="p-1 rounded bg-black/70 text-white border border-white/20 text-xs flex items-center gap-1"
                      title="Switch to Large Screen Theater"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Controls */}
                  <div className="relative z-20 p-3 bg-gradient-to-t from-black/95 to-transparent flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center"
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                      </button>
                      <button
                        onClick={() => handleSkip(-10)}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                      >
                        {isMuted ? <VolumeX className="w-3 h-3 text-rose-400" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </div>
                    <span className="text-[11px] font-mono">{Math.floor(progressSec)}s / {durationSec}s</span>
                  </div>
                </div>

                {/* Subtitles */}
                <div className="bg-white rounded-xl p-4 border border-border space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">Spoken Subtitles</span>
                    <button
                      onClick={handleStartTokenStream}
                      disabled={isStreaming}
                      className="text-[10px] px-2 py-0.5 rounded bg-[#E9F1FC] text-primary font-mono font-bold"
                    >
                      <Sparkles className="w-2.5 h-2.5 inline mr-1" />
                      Live Stream
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-ink-primary leading-relaxed font-medium">
                    "{activeCaption || segment.spoken_script}"
                  </p>
                  <CitationChip citations={segment.citations} />
                </div>
              </div>

              {/* Right Column: Visual Stage + Checkpoint */}
              <div className="lg:col-span-6 flex flex-col space-y-4">
                <div className="min-h-[340px]">
                  <VisualRenderer visualSpec={segment.visual_spec} />
                </div>

                {/* Checkpoint Question Card */}
                <div className="bg-white rounded-xl p-5 border border-border shadow-2xs space-y-3">
                  <h3 className="font-bold text-sm text-ink-primary flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-primary" />
                    <span>Concept Checkpoint</span>
                  </h3>
                  <p className="text-xs font-medium text-ink-primary">
                    {segment.checkpoint_question.question}
                  </p>

                  {segment.checkpoint_question.options && (
                    <div className="grid grid-cols-1 gap-2">
                      {segment.checkpoint_question.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setStudentAnswer(opt)}
                          className={`text-left p-2.5 rounded border text-xs transition-all ${
                            studentAnswer === opt
                              ? "bg-[#E9F1FC] border-primary text-primary font-bold shadow-2xs"
                              : "bg-white border-border text-ink-secondary hover:bg-canvas-elevated"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {feedbackMessage && (
                    <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-xs text-[#0F7B3F] font-bold">
                      {feedbackMessage}
                    </div>
                  )}

                  <form onSubmit={handleSubmitAnswer} className="flex items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className="p-2 rounded-full border text-xs"
                      title="Answer with Voice"
                    >
                      {isRecording ? <MicOff className="w-3.5 h-3.5 text-rose-500" /> : <Mic className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmittingAnswer || !studentAnswer.trim()}
                      className="px-4 py-2 rounded-md bg-black text-white font-bold text-xs"
                    >
                      {isSubmittingAnswer ? "Checking..." : "Submit Answer"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: READING NOTES */}
      {activeTab === "reading" && (
        <div className="p-6 rounded-lg bg-white border border-border space-y-6 shadow-2xs">
          <div className="border-b border-border pb-4">
            <span className="text-xs font-bold text-primary uppercase">
              Lesson Reading Guide · Part {segment.segment_id} of {totalSegments}
            </span>
            <h3 className="text-lg font-bold text-ink-primary mt-1">{segment.concept}</h3>
          </div>

          <div className="space-y-4 text-sm text-ink-secondary leading-relaxed">
            <div className="p-4 rounded-md bg-canvas-elevated border border-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>On-Screen Pedagogical Summary</span>
              </h4>
              <p className="text-xs leading-relaxed text-ink-primary font-medium whitespace-pre-wrap">
                {segment.on_screen_text || segment.spoken_script}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Key Conceptual Rules
              </h4>
              <p className="text-xs leading-relaxed text-ink-secondary">
                {segment.spoken_script}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRACTICE & SANDBOX */}
      {activeTab === "practice" && (
        <div className="p-6 rounded-lg bg-white border border-border space-y-6 shadow-2xs">
          <div className="border-b border-border pb-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-primary uppercase">
                Practice Sandbox
              </span>
              <h3 className="text-lg font-bold text-ink-primary mt-1">Interactive Code & Concept Execution</h3>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#E9F1FC] text-primary text-xs font-bold border border-blue-200">
              Sandboxed Python Engine
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-ink-secondary leading-relaxed">
              Execute live code simulations for <strong className="text-ink-primary">{segment.concept}</strong> in an isolated environment.
            </p>
            <VisualRenderer visualSpec={segment.visual_spec} />
          </div>
        </div>
      )}

      {/* Misconception Adaptive Modal */}
      {misconceptionData && (
        <MisconceptionModal
          interaction={misconceptionData}
          onContinueReteach={handleContinueReteach}
        />
      )}
    </div>
  );
}
