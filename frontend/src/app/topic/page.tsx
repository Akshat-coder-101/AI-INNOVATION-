"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  TrendingUp, 
  Layers, 
  Calendar, 
  FileCode, 
  Compass 
} from "lucide-react";

export default function TopicPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");

  const suggestedTopics = [
    { title: "Newton's Laws of Motion & Conservation", domain: "Physics", icon: TrendingUp, color: "text-indigo-400" },
    { title: "Cellular Respiration & ATP Synthesis", domain: "Biology", icon: Layers, color: "text-emerald-400" },
    { title: "The Industrial Revolution & Global Modernity", domain: "History", icon: Calendar, color: "text-purple-400" },
    { title: "Binary Search Trees & Recursive Algorithms", domain: "Computer Science", icon: FileCode, color: "text-cyan-400" },
    { title: "Quantum Entanglement & Superposition", domain: "Physics", icon: Sparkles, color: "text-indigo-400" },
    { title: "Transformer Architecture & Attention Mechanisms", domain: "AI / ML", icon: Compass, color: "text-brand-400" },
  ];

  const handleStart = (selectedTopic?: string) => {
    const finalTopic = selectedTopic || topic.trim();
    if (!finalTopic) return;
    router.push(`/setup?topic=${encodeURIComponent(finalTopic)}`);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-brand-400">
          Curriculum Generator
        </span>
        <h1 className="text-3xl font-extrabold text-white mt-1">Teach Me Any Topic</h1>
        <p className="text-sm text-slate-400 mt-1">
          Input any academic or professional subject. Sahayak will synthesize a customized pedagogical lesson plan matching your cognitive level and time budget.
        </p>
      </div>

      {/* Main Topic Input Box */}
      <div className="glass-panel rounded-2xl p-6 border border-brand-500/30 space-y-4">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
          What concept would you like to master?
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="e.g., Photosynthesis and Light-Dependent Reactions"
            className="w-full px-5 py-4 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 text-base shadow-inner"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleStart()}
            disabled={!topic.trim()}
            className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <span>Proceed to Learner Profile</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recommended Topics Grid */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
          Popular Benchmark Topics for Hackathon Evaluation:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suggestedTopics.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                onClick={() => handleStart(item.title)}
                className="glass-card p-4 rounded-xl border border-slate-800/80 hover:border-brand-500/40 cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-slate-100 group-hover:text-brand-300 transition-colors">
                      {item.title}
                    </h3>
                    <span className="text-[10px] text-slate-400">{item.domain}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-brand-300 transition-colors" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
