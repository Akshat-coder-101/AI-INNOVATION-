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
  Volume2, 
  VolumeX, 
  HelpCircle, 
  Send, 
  Languages, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  UserCheck 
} from "lucide-react";

interface TeacherPlayerProps {
  initialSegment: LessonSegmentRender;
  totalSegments: number;
  onLessonComplete: () => void;
}

export default function TeacherPlayer({
  initialSegment,
  totalSegments,
  onLessonComplete,
}: TeacherPlayerProps) {
  const [segment, setSegment] = useState<LessonSegmentRender>(initialSegment);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeCaption, setActiveCaption] = useState<string>("");
  const [progressSec, setProgressSec] = useState<number>(0);
  const [isPausedForCheckpoint, setIsPausedForCheckpoint] = useState<boolean>(false);
  const [studentAnswer, setStudentAnswer] = useState<string>("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [misconceptionData, setMisconceptionData] = useState<InteractionResponse | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<string>(initialSegment.language || "en");
  const [isSwitchingLang, setIsSwitchingLang] = useState<boolean>(false);
  const [naturalQuery, setNaturalQuery] = useState<string>("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const durationSec = 14; // standard segment pacing duration

  // Speech synthesis & playback tick
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && !isPausedForCheckpoint) {
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
  }, [isPlaying, isPausedForCheckpoint]);

  // Update live caption based on timestamp
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
    } else {
      setActiveCaption(segment.captions[0]?.text || segment.spoken_script);
    }
  }, [progressSec, segment]);

  // Browser Speech synthesis invocation when unmuted
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window && isPlaying && !isMuted) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(segment.spoken_script);
      utterance.rate = 1.0;
      utterance.lang = activeLanguage === "hi" ? "hi-IN" : "en-US";
      window.speechSynthesis.speak(utterance);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [segment, activeLanguage, isPlaying, isMuted]);

  // Handle student submitting checkpoint answer
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
            // Advance to next segment
            const nextSeg = await api.renderSegment(
              segment.segment_id + 1,
              segment.session_id,
              activeLanguage
            );
            setSegment(nextSeg);
            setProgressSec(0);
            setIsPlaying(true);
          }
        }, 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  // Handle continuing with adaptive reteach segment
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

  // Mid-lesson natural language switch prompt
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
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
            Segment {segment.segment_id} of {totalSegments}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {segment.concept}
          </h2>
          {segment.is_reteach && (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 animate-pulse">
              Adaptive Reteach Mode
            </span>
          )}
        </div>

        {/* Language Switcher Tabs */}
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-slate-400" />
          <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
            {[
              { id: "en", label: "English" },
              { id: "hi", label: "हिंदी" },
              { id: "hinglish", label: "Hinglish" },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => handleLanguageChange(lang.id)}
                disabled={isSwitchingLang}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeLanguage === lang.id
                    ? "bg-brand-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Synced Multi-Pane Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Pane: AI Avatar Teacher + Audio + Script (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Avatar Video / Dynamic Canvas Box */}
          <div className="relative rounded-2xl overflow-hidden glass-panel border border-brand-500/30 shadow-2xl bg-slate-950 aspect-video flex flex-col justify-end p-4">
            {/* Visual Avatar Representation */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 via-brand-950/40 to-slate-950">
              <div className="relative flex flex-col items-center">
                <div className={`w-28 h-28 rounded-full border-4 overflow-hidden shadow-2xl transition-all duration-500 ${
                  isPlaying ? "border-cyan-400 shadow-cyan-500/30 scale-105" : "border-slate-700"
                }`}>
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop"
                    alt="AI Teacher"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Animated Speech Pulse Waveform */}
                {isPlaying && (
                  <div className="flex items-center gap-1 mt-3">
                    <span className="w-1 h-4 bg-cyan-400 rounded-full animate-bounce"></span>
                    <span className="w-1 h-6 bg-brand-400 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                    <span className="w-1 h-8 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                    <span className="w-1 h-5 bg-purple-400 rounded-full animate-bounce [animation-delay:0.45s]"></span>
                    <span className="w-1 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.6s]"></span>
                  </div>
                )}
              </div>
            </div>

            {/* Overlay Status Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-emerald-300 font-semibold border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                AI Educator Synced
              </span>
            </div>

            {/* Playback Controls Overlay */}
            <div className="relative z-10 flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-9 h-9 rounded-xl bg-brand-600/90 hover:bg-brand-500 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button
                  onClick={() => {
                    setProgressSec(0);
                    setIsPlaying(true);
                  }}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-all"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Segment Progress Bar */}
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{Math.floor(progressSec)}s / {durationSec}s</span>
              </div>
            </div>
          </div>

          {/* Synchronized Captions & On-Screen Transcript */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800/80 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Live Spoken Script & Captions
                </span>
                <span className="text-[10px] text-brand-300 font-mono">Synced Timestamps</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed font-medium">
                "{activeCaption}"
              </p>
            </div>

            {/* RAG Citations */}
            <CitationChip citations={segment.citations} />
          </div>

          {/* Mid-lesson Natural Language Switch Input */}
          <form onSubmit={handleNaturalLanguageSwitch} className="relative">
            <input
              type="text"
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              placeholder="e.g., 'Ab Hindi me samjhao' or 'Switch to English'"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors pr-10"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right Pane: Subject-Aware Visual Spec (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex-1 min-h-[380px]">
            <VisualRenderer visualSpec={segment.visual_spec} />
          </div>

          {/* Inline Checkpoint Question & Interactivity */}
          <div className="glass-panel rounded-2xl p-5 border-2 border-brand-500/40 shadow-xl bg-slate-950/70">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-sm text-white">Interactive Checkpoint Question</h3>
              </div>
              {isPausedForCheckpoint && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse">
                  Playback Paused for Answer
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-slate-200 mb-3">
              {segment.checkpoint_question.question}
            </p>

            {/* Multiple Choice Options */}
            {segment.checkpoint_question.options && (
              <div className="grid grid-cols-1 gap-2 mb-3">
                {segment.checkpoint_question.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setStudentAnswer(opt)}
                    className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                      studentAnswer === opt
                        ? "bg-brand-600/30 border-brand-400 text-white font-semibold shadow-md shadow-brand-500/20"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-brand-500/40 hover:bg-slate-800/60"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Answer Input or Free-text */}
            <form onSubmit={handleSubmitAnswer} className="space-y-3">
              {!segment.checkpoint_question.options && (
                <textarea
                  rows={2}
                  value={studentAnswer}
                  onChange={(e) => setStudentAnswer(e.target.value)}
                  placeholder="Explain your understanding in your own words..."
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              )}

              {/* Feedback Alert */}
              {feedbackMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{feedbackMessage}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <DemoModeToggle
                  isDemoMode={isDemoMode}
                  onToggle={setIsDemoMode}
                />

                <button
                  type="submit"
                  disabled={isSubmittingAnswer || !studentAnswer.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingAnswer ? "Evaluating Concept..." : "Submit Answer & Continue"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

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
