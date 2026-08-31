"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { 
  User, 
  Sparkles, 
  Clock, 
  Languages, 
  GraduationCap, 
  Target, 
  Sliders, 
  ArrowRight, 
  Layers 
} from "lucide-react";

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTopic = searchParams.get("topic") || "Foundations of Quantum Mechanics";
  const materialId = searchParams.get("materialId") || undefined;
  const filename = searchParams.get("filename") || undefined;

  const [topic, setTopic] = useState(initialTopic);
  const [level, setLevel] = useState("beginner");
  const [goal, setGoal] = useState("understand_concept");
  const [style, setStyle] = useState("visual");
  const [language, setLanguage] = useState("en");
  const [timeBudget, setTimeBudget] = useState(20);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateLesson = async () => {
    setIsGenerating(true);
    try {
      const plan = await api.createLessonPlan({
        topic: materialId ? undefined : topic,
        material_id: materialId,
        learner_profile: {
          level,
          goal,
          preferred_style: style,
          language,
          time_budget_minutes: timeBudget,
        },
        time_budget_minutes: timeBudget,
        language,
      });

      router.push(`/lesson/${plan.session_id}`);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
          Personalization Engine
        </span>
        <h1 className="text-3xl font-extrabold text-white mt-1">Configure Learner Profile</h1>
        <p className="text-sm text-slate-400 mt-1">
          {materialId
            ? `Calibrating adaptive lesson plan for uploaded document: "${filename || 'Document'}"`
            : `Personalizing instruction for: "${topic}"`}
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-brand-500/30 space-y-6">
        {/* Knowledge Level */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-brand-400" />
            <span>Target Cognitive Level:</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "beginner", title: "Beginner", desc: "Intuitive mental models, foundational definitions & analogies" },
              { id: "intermediate", title: "Intermediate", desc: "Formal mechanisms, derivations & practical applications" },
              { id: "advanced", title: "Advanced", desc: "Rigorous proofs, edge cases, state spaces & computational execution" },
            ].map((lvl) => (
              <div
                key={lvl.id}
                onClick={() => setLevel(lvl.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  level === lvl.id
                    ? "bg-brand-600/30 border-brand-400 text-white shadow-md shadow-brand-500/20"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="font-bold text-xs text-slate-100 block">{lvl.title}</span>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">{lvl.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Time Budget */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Available Time Budget:</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { mins: 5, label: "5 Minutes", badge: "2 Core Concepts" },
              { mins: 20, label: "20 Minutes", badge: "Structured Lesson" },
              { mins: 60, label: "60 Minutes", badge: "Comprehensive Deep Dive" },
              { mins: 10080, label: "7-Day Path", badge: "Multi-Session DAG" },
            ].map((item) => (
              <div
                key={item.mins}
                onClick={() => setTimeBudget(item.mins)}
                className={`p-3 rounded-xl border text-center cursor-pointer transition-all ${
                  timeBudget === item.mins
                    ? "bg-cyan-950/60 border-cyan-400 text-white shadow-md shadow-cyan-500/20"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700"
                }`}
              >
                <span className="font-bold text-xs text-slate-100 block">{item.label}</span>
                <span className="text-[10px] text-cyan-300/80 font-mono mt-0.5 block">{item.badge}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preferred Learning Style & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-800">
          {/* Preferred Style */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Pedagogical Style:</span>
            </label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="visual">Visual & Interactive Diagrams</option>
              <option value="analogies">Analogy & Metaphor First</option>
              <option value="socratic">Socratic Questioning</option>
              <option value="code">Code & Computational Demos</option>
            </select>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
              <Languages className="w-4 h-4 text-emerald-400" />
              <span>Instruction Language:</span>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option value="en">English (Global)</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="hinglish">Hinglish (Conversational)</option>
            </select>
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleGenerateLesson}
            disabled={isGenerating}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-cyan hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isGenerating ? "Synthesizing Adaptive Lesson..." : "Launch AI Teaching Session"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">Loading Configuration...</div>}>
      <SetupForm />
    </Suspense>
  );
}
