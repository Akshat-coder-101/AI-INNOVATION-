"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, LearningReport } from "@/lib/api";
import Link from "next/link";
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  CheckSquare, 
  Compass, 
  Share2 
} from "lucide-react";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [report, setReport] = useState<LearningReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadReport() {
      try {
        setIsLoading(true);
        const data = await api.getReport(sessionId);
        setReport(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (sessionId) loadReport();
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
          <Award className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">Compiling Learning Report</h2>
        <p className="text-xs text-slate-400">
          Aggregating checkpoint attempts, misconception resolutions, and assessment grades.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>No report found for this session.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-brand-500/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
              Personalized Learning Report
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{report.topic}</h1>
            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-4">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {report.time_spent_minutes} Minutes Session</span>
              <span>•</span>
              <span>Generated on {new Date(report.generated_at).toLocaleDateString()}</span>
            </p>
          </div>

          {/* Mastery Score Badge */}
          <div className="flex flex-col items-center p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl">
            <span className="text-xs text-slate-400 uppercase font-semibold">Mastery Score</span>
            <span className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-brand-400 bg-clip-text text-transparent mt-1">
              {report.score_percent}%
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold mt-1">
              {report.score_percent >= 80 ? "Proficiency Achieved" : "Review Recommended"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Concepts Understood vs Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Concepts Mastered */}
        <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Demonstrated Mastery</h3>
          </div>
          <ul className="space-y-2">
            {report.concepts_understood.map((c, i) => (
              <li key={i} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weak Areas & Misconceptions */}
        <div className="glass-panel rounded-2xl p-6 border border-amber-500/30 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm text-white">Growth & Revision Areas</h3>
          </div>
          {report.weak_areas.length > 0 || report.misconceptions_encountered.length > 0 ? (
            <ul className="space-y-2">
              {report.weak_areas.map((w, i) => (
                <li key={i} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-slate-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0"></span>
                  <span>{w}</span>
                </li>
              ))}
              {report.misconceptions_encountered.map((m, i) => (
                <li key={i} className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 font-bold">Misconception Reteach</span>
                  <span className="truncate">{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 rounded-xl bg-slate-900/60 text-center text-xs text-slate-400">
              No prominent conceptual misconceptions detected!
            </div>
          )}
        </div>
      </div>

      {/* Actionable Revision Checklist */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
          <CheckSquare className="w-5 h-5 text-brand-400" />
          <h3 className="font-bold text-sm text-white">Actionable Revision Plan</h3>
        </div>
        <div className="space-y-2">
          {report.recommended_revision.map((rec, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
              <span className="font-mono text-brand-400 font-bold">{i + 1}.</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Next Topics */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Recommended Next Topics in Learning Path</h3>
          </div>
          <Link
            href={`/learning-path/${encodeURIComponent(report.topic.toLowerCase().replace(/\s+/g, '-'))}`}
            className="text-xs text-cyan-300 hover:text-cyan-200 font-bold flex items-center gap-1"
          >
            <span>View Full Curriculum DAG</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {report.suggested_next_topics.map((t, i) => (
            <Link
              key={i}
              href={`/setup?topic=${encodeURIComponent(t)}`}
              className="p-4 rounded-xl glass-card border border-slate-800/80 hover:border-brand-500/40 transition-all hover:scale-[1.02] group"
            >
              <span className="text-[10px] text-brand-400 font-bold">Step {i + 1}</span>
              <h4 className="font-bold text-xs text-white group-hover:text-brand-300 transition-colors mt-1">
                {t}
              </h4>
            </Link>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
        <Link
          href={`/lesson/${sessionId}`}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass-panel border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-all"
        >
          <RotateCcw className="w-4 h-4 text-cyan-400" />
          <span>Revise This Lesson</span>
        </Link>

        <Link
          href="/topic"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start Next Curriculum Topic</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
