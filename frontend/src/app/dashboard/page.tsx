"use client";

import Link from "next/link";
import { 
  LayoutDashboard, 
  TrendingUp, 
  Award, 
  Clock, 
  BrainCircuit, 
  Target, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2 
} from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { title: "Total Study Time", value: "3.5 Hours", icon: Clock, color: "text-cyan-400" },
    { title: "Average Mastery Score", value: "91.2%", icon: Award, color: "text-emerald-400" },
    { title: "Curriculum Nodes Mastered", value: "14 Nodes", icon: Target, color: "text-brand-400" },
    { title: "Misconceptions Resolved", value: "8 Adapted", icon: BrainCircuit, color: "text-amber-400" },
  ];

  const recentSessions = [
    { topic: "Newton's Laws & Mechanical Conservation", score: 95, time: "20 min", status: "Mastered", date: "Today" },
    { topic: "Cellular Respiration & ATP Synthesis", score: 88, time: "20 min", status: "Mastered", date: "Yesterday" },
    { topic: "Binary Search Trees & Recursive Algorithms", score: 92, time: "25 min", status: "Mastered", date: "3 days ago" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Learner Intelligence
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-1">Analytics Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated pedagogical metrics across all interactive sessions and assessments.
          </p>
        </div>

        <Link
          href="/topic"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4" />
          <span>Launch New Session</span>
        </Link>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((st, i) => {
          const Icon = st.icon;
          return (
            <div key={i} className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">{st.title}</span>
                <Icon className={`w-5 h-5 ${st.color}`} />
              </div>
              <span className="text-2xl font-black text-white block">{st.value}</span>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Mastery Progression (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Mastery Score Trajectory</span>
            </h3>
            <span className="text-xs text-emerald-400 font-bold">+14% Growth</span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 px-4 pt-6 pb-2 border-b border-slate-800">
            {[
              { day: "Mon", score: 70 },
              { day: "Tue", score: 78 },
              { day: "Wed", score: 82 },
              { day: "Thu", score: 89 },
              { day: "Fri", score: 92 },
              { day: "Sat", score: 94 },
              { day: "Sun", score: 96 },
            ].map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div 
                  className="w-full bg-gradient-to-t from-brand-600 to-cyan-400 rounded-t transition-all group-hover:scale-y-105"
                  style={{ height: `${d.score}%` }}
                />
                <span className="text-[10px] text-slate-400 font-mono mt-1">{d.day}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Baseline Diagnostic: 70%</span>
            <span>Current Mastery: 96%</span>
          </div>
        </div>

        {/* Cognitive Domain Mastery (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-sm text-white">Domain Competencies</h3>
          
          <div className="space-y-3">
            {[
              { subject: "Physics & Mechanics", pct: 95, color: "bg-indigo-500" },
              { subject: "Biology & Life Sciences", pct: 90, color: "bg-emerald-500" },
              { subject: "Algorithms & Computer Science", pct: 92, color: "bg-cyan-500" },
              { subject: "Historical Chronology", pct: 85, color: "bg-purple-500" },
            ].map((sub, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>{sub.subject}</span>
                  <span className="font-mono text-cyan-300">{sub.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
                  <div className={`h-full ${sub.color} rounded-full`} style={{ width: `${sub.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="font-bold text-sm text-white">Recent Completed Sessions</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="pb-3">Curriculum Topic</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentSessions.map((s, i) => (
                <tr key={i} className="hover:bg-slate-900/40">
                  <td className="py-3 font-semibold text-white">{s.topic}</td>
                  <td className="py-3 font-mono font-bold text-emerald-400">{s.score}%</td>
                  <td className="py-3 text-slate-400">{s.time}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-[10px]">
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href="/setup"
                      className="text-brand-400 hover:text-brand-300 font-bold inline-flex items-center gap-1"
                    >
                      <span>Study</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
