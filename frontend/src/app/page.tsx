"use client";

import Link from "next/link";
import { 
  Sparkles, 
  UploadCloud, 
  BookOpen, 
  BrainCircuit, 
  ShieldCheck, 
  TrendingUp, 
  Languages, 
  Layers, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  PlayCircle 
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="space-y-20 pb-12">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 text-center overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-brand-600/20 via-indigo-500/15 to-accent-cyan/20 blur-[100px] pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-brand-500/30 text-xs font-semibold text-brand-300 mb-6 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
          AI Innovation Hackathon 2026 · Adaptive AI Educator
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          Not Just a Chatbot. <br />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-accent-cyan bg-clip-text text-transparent">
            A True Adaptive AI Teacher.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Sahayak AI Teacher executes full pedagogical cycles: understand, plan, explain, demonstrate, question, evaluate, and dynamically adapt on misconceptions with fresh analogies.
        </p>

        {/* Dual Primary Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href="/upload"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-700 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95 group"
          >
            <UploadCloud className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span>Upload Learning Material</span>
          </Link>

          <Link
            href="/topic"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl glass-panel border border-slate-700 hover:border-brand-500/50 hover:bg-slate-800/80 text-slate-200 font-bold text-sm transition-all hover:scale-105 active:scale-95"
          >
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Teach Me Any Topic</span>
          </Link>
        </div>

        {/* Live Metrics Row */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div className="glass-card p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-brand-400">10-State</span>
            <p className="text-xs text-slate-400 mt-1 font-medium">Teacher Agent FSM</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-cyan-400">4 Domain</span>
            <p className="text-xs text-slate-400 mt-1 font-medium">Visual Routers</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-emerald-400">Zero</span>
            <p className="text-xs text-slate-400 mt-1 font-medium">Hallucination RAG</p>
          </div>
          <div className="glass-card p-4 rounded-xl text-center">
            <span className="text-2xl font-black text-purple-400">3 Lang</span>
            <p className="text-xs text-slate-400 mt-1 font-medium">Mid-Lesson Switch</p>
          </div>
        </div>
      </section>

      {/* Teacher State Machine Architecture Card */}
      <section className="glass-panel rounded-3xl p-8 sm:p-10 border border-brand-500/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
              The Heart of Sahayak
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Deterministic Teacher State Machine
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Unlike chatbots that simply react, Sahayak orchestrates deliberate instructional sequences.
            </p>
          </div>

          <Link
            href="/topic"
            className="inline-flex items-center gap-2 text-xs font-bold text-brand-300 hover:text-brand-200"
          >
            <span>Experience Live Pipeline</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Visual Pipeline Nodes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { step: "01", name: "Understand", desc: "Learner level & topic parsing", color: "from-blue-600 to-indigo-600" },
            { step: "02", name: "Plan", desc: "Time & concept budget allocation", color: "from-indigo-600 to-purple-600" },
            { step: "03", name: "Explain", desc: "Avatar video + audio script", color: "from-purple-600 to-pink-600" },
            { step: "04", name: "Demonstrate", desc: "LaTeX / Plot / SVG / Code", color: "from-pink-600 to-rose-600" },
            { step: "05", name: "Question", desc: "Inline checkpoint pause", color: "from-amber-600 to-orange-600" },
            { step: "06", name: "Evaluate", desc: "Misconception classifier", color: "from-emerald-600 to-teal-600" },
            { step: "07", name: "Adapt", desc: "Reteach with fresh analogy", color: "from-cyan-600 to-blue-600" },
            { step: "08", name: "Assess", desc: "Targeted quiz & report", color: "from-brand-600 to-indigo-600" },
          ].map((item, i) => (
            <div key={i} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-brand-500/40 transition-all text-center">
              <span className="text-[10px] font-mono font-bold text-slate-500">{item.step}</span>
              <h3 className="font-bold text-xs text-slate-200 mt-1">{item.name}</h3>
              <p className="text-[10px] text-slate-400 mt-1 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4 Subject-Aware Renderers Showcase */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Beyond Talking Heads
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Subject-Aware Visual Routers
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Every concept is automatically matched with the highest-fidelity pedagogical visualizer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-indigo-500/30">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Math & Physics</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              LaTeX mathematical derivations, 2D/3D dynamic coordinate charts, trajectory analysis, and step-by-step calculus solvers.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-emerald-500/30">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Biology & Sciences</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Interactive high-resolution SVG diagrams with clickable structural hotspots, anatomical roles, and cellular mechanisms.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-purple-500/30">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">History & Chronology</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Interactive chronological timelines, milestone nodes, epoch categorizations, and geopolitical impact maps.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-cyan-500/30">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center mb-4">
              <PlayCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Computer Science</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Real code sandbox runner with isolated Python execution, actual standard output stream, and algorithmic trace steps.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="rounded-3xl bg-gradient-to-r from-brand-900/60 via-indigo-950/80 to-slate-950 p-8 sm:p-12 border border-brand-500/30 text-center relative overflow-hidden">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Ready to Experience the Future of AI Education?
        </h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto mt-3">
          Upload any lecture notes, syllabus PDF, or input a custom topic to launch your personalized interactive teaching session.
        </p>

        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/upload"
            className="px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm shadow-xl shadow-brand-600/40 transition-all hover:scale-105"
          >
            Launch Demo Now
          </Link>
        </div>
      </section>
    </div>
  );
}
