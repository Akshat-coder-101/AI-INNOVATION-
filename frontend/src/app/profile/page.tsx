"use client";

import { useEffect, useState } from "react";
import { api, LearnerProfile } from "@/lib/api";
import Link from "next/link";
import { 
  User, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowRight, 
  Sliders, 
  Clock, 
  Sparkles, 
  BookOpen 
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<LearnerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const data = await api.getProfile("default-user");
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">Loading Learner Profile...</div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Profile Card */}
      <div className="glass-panel rounded-3xl p-8 border border-brand-500/30">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-accent-cyan p-1 shadow-xl">
            <div className="w-full h-full rounded-xl bg-slate-950 flex items-center justify-center">
              <User className="w-10 h-10 text-brand-300" />
            </div>
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30 capitalize">
                {profile.level} Level
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Primary Goal: {profile.goal.replace("_", " ")} · Preferred Style: {profile.preferred_style}
            </p>
          </div>

          <Link
            href="/topic"
            className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-all hover:scale-105"
          >
            Start New Lesson
          </Link>
        </div>
      </div>

      {/* Historical Topics & Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong vs Weak Concepts */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Mastery Diagnostics</span>
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-emerald-400 font-bold block mb-1">Strong Concepts:</span>
              <div className="flex flex-wrap gap-2">
                {profile.strong_concepts.map((c, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-amber-400 font-bold block mb-1">Concepts Flagged for Revision:</span>
              <div className="flex flex-wrap gap-2">
                {profile.weak_concepts.map((c, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Learning History */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Session History</span>
          </h3>

          <div className="space-y-2">
            {profile.scores_history.length > 0 ? (
              profile.scores_history.map((h, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-slate-200">{h.topic}</h4>
                    <span className="text-[10px] text-slate-500">{h.date}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    {h.score}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">No past sessions recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
