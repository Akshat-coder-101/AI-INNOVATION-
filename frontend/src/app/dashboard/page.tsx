"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  getUserAnalytics, 
  clearUserSessions, 
  UserAnalytics 
} from "@/lib/analytics";
import { 
  TrendingUp, 
  Award, 
  Clock, 
  BrainCircuit, 
  Target, 
  Sparkles, 
  ArrowRight, 
  RotateCcw, 
  BookOpen, 
  Compass, 
  UploadCloud 
} from "lucide-react";
import { StatCard } from "@/components/ui";

export default function DashboardPage() {
  const { user } = useAuth();
  const userId = user?.id || "default-user";
  
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);

  const refreshAnalytics = () => {
    const data = getUserAnalytics(userId);
    setAnalytics(data);
  };

  useEffect(() => {
    refreshAnalytics();
  }, [userId]);

  const handleResetData = () => {
    clearUserSessions(userId);
    refreshAnalytics();
  };

  if (!analytics) return null;

  const hoursDisplay = (analytics.totalStudyMinutes / 60).toFixed(1);
  const hasSessions = analytics.recentSessions.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Learner Analytics & Diagnostics
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-canvas-elevated text-ink-muted font-mono font-medium">
              User: {user?.name || "Guest"}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-black mt-1">Analytics Dashboard</h1>
          <p className="text-sm text-ink-secondary mt-1 font-medium">
            Real-time pedagogical metrics calculated dynamically from your actual learning sessions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/topic"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Launch New Lesson</span>
          </Link>
        </div>
      </div>

      {/* Watermelon UI Component 3: Metric Stat Cards Grid (Spring counters bound strictly to real data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Study Time"
          value={hasSessions ? `${hoursDisplay} Hours` : "0.0 Hours"}
          numericValue={hasSessions ? Number(hoursDisplay) : 0}
          suffix=" Hours"
          subtext={hasSessions ? `${analytics.totalStudyMinutes} min active study` : "No sessions completed yet"}
          icon={Clock}
          color="text-primary"
          badge={hasSessions ? `${analytics.totalStudyMinutes}m` : undefined}
          isEmpty={!hasSessions}
        />
        <StatCard
          title="Average Mastery Score"
          value={hasSessions ? `${analytics.averageScore}%` : "—"}
          numericValue={hasSessions ? analytics.averageScore : 0}
          suffix="%"
          subtext={hasSessions ? "Calibrated from real assessments" : "Take a quiz to calibrate score"}
          icon={Award}
          color="text-[#0F7B3F]"
          badge={hasSessions ? (analytics.averageScore >= 80 ? "Mastery" : "Progressing") : undefined}
          isEmpty={!hasSessions}
        />
        <StatCard
          title="Curriculum Nodes Mastered"
          value={hasSessions ? `${analytics.nodesMastered} Nodes` : "0 Nodes"}
          numericValue={hasSessions ? analytics.nodesMastered : 0}
          suffix=" Nodes"
          subtext={hasSessions ? "Bloom's taxonomy milestones" : "0 / 6 initial tier"}
          icon={Target}
          color="text-primary"
          isEmpty={!hasSessions}
        />
        <StatCard
          title="Misconceptions Resolved"
          value={hasSessions ? `${analytics.misconceptionsResolved} Adapted` : "0 Adapted"}
          numericValue={hasSessions ? analytics.misconceptionsResolved : 0}
          suffix=" Adapted"
          subtext={hasSessions ? "Targeted analogies delivered" : "0 conceptual gaps flagged"}
          icon={BrainCircuit}
          color="text-accent"
          isEmpty={!hasSessions}
        />
      </div>

      {/* Analytics Chart & Domain Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Activity Trajectory (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="font-bold text-sm text-black flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Study Activity & Score Trajectory</span>
            </h3>
            {hasSessions && (
              <span className="text-xs text-[#0F7B3F] font-bold">
                {analytics.recentSessions.length} Recorded Session{analytics.recentSessions.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {hasSessions ? (
            <div>
              <div className="h-44 flex items-end justify-between gap-3 px-4 pt-6 pb-2 border-b border-border">
                {analytics.weeklyActivity.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div 
                      className={`w-full rounded-t transition-all ${
                        d.score > 0 ? "bg-primary group-hover:opacity-80" : "bg-canvas-elevated h-2"
                      }`}
                      style={{ height: d.score > 0 ? `${Math.max(d.score, 15)}%` : "8px" }}
                    />
                    <span className="text-[10px] text-ink-muted font-mono mt-1 font-semibold">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-ink-muted font-medium pt-2">
                <span>Recent Average: {analytics.averageScore}%</span>
                <span>Active Track: STEM Curriculum</span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-ink-muted space-y-2">
              <TrendingUp className="w-8 h-8 mx-auto text-ink-muted opacity-40" />
              <p className="text-xs font-semibold text-black">No learning activity recorded yet.</p>
              <p className="text-[11px]">Complete an adaptive session or assessment to start tracking your growth trajectory.</p>
            </div>
          )}
        </div>

        {/* Cognitive Domain Competencies (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <h3 className="font-bold text-sm text-black">Domain Competencies</h3>
          
          {analytics.domainCompetencies.length > 0 ? (
            <div className="space-y-3">
              {analytics.domainCompetencies.map((sub, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-ink-secondary">
                    <span>{sub.subject}</span>
                    <span className="font-mono text-primary font-bold">{sub.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-canvas-elevated overflow-hidden border border-border">
                    <div className={`h-full ${sub.color} rounded-full transition-all duration-500`} style={{ width: `${sub.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-ink-muted space-y-2">
              <Award className="w-8 h-8 mx-auto text-ink-muted opacity-40" />
              <p className="text-xs font-semibold text-black">Domain competencies uncalibrated</p>
              <p className="text-[11px]">As you study topics across Physics, Biology, History, or CS, your domain competencies will render here automatically.</p>
            </div>
          )}
        </div>
      </div>

      {/* Real Completed Sessions Table */}
      <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-black">Completed Learning Sessions ({analytics.recentSessions.length})</h3>
          
          {hasSessions && (
            <button
              onClick={handleResetData}
              className="text-[11px] text-ink-muted hover:text-[#C21E1E] transition-colors flex items-center gap-1 font-mono"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear History</span>
            </button>
          )}
        </div>
        
        {hasSessions ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink-secondary">
              <thead className="text-ink-muted uppercase border-b border-border text-[11px] font-bold">
                <tr>
                  <th className="pb-3">Curriculum Topic</th>
                  <th className="pb-3">Domain</th>
                  <th className="pb-3">Score</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3">Misconceptions</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {analytics.recentSessions.map((s, i) => (
                  <tr key={i} className="hover:bg-canvas-elevated transition-colors">
                    <td className="py-3 font-semibold text-black">{s.topic}</td>
                    <td className="py-3 text-ink-muted">{s.domain}</td>
                    <td className="py-3 font-mono font-bold text-[#0F7B3F]">{s.score}%</td>
                    <td className="py-3 text-ink-muted">{s.timeMinutes} min</td>
                    <td className="py-3">
                      {s.misconceptionsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-[#FFF1E6] text-accent font-bold text-[10px] border border-orange-200">
                          {s.misconceptionsCount} Reteach
                        </span>
                      ) : (
                        <span className="text-ink-muted font-mono text-[11px]">0 Flagged</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/setup?topic=${encodeURIComponent(s.topic)}`}
                        className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                      >
                        <span>Replay</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center rounded border border-dashed border-border bg-canvas-elevated text-ink-muted space-y-4">
            <BookOpen className="w-8 h-8 mx-auto text-ink-muted opacity-40" />
            <div>
              <p className="text-xs font-bold text-black">No completed sessions found for this learner account</p>
              <p className="text-[11px] text-ink-muted mt-0.5">
                Start a customized session or upload study material to generate your real learning metrics.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <Link
                href="/topic"
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-black text-white font-bold text-xs shadow-xs hover:bg-neutral-800 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Teach Me a Topic</span>
              </Link>
              <Link
                href="/upload"
                className="flex items-center gap-1.5 px-4 py-2 rounded border border-border bg-white text-ink-primary hover:bg-canvas-elevated font-semibold text-xs transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-primary" />
                <span>Upload Material (PDF/DOCX)</span>
              </Link>
              <Link
                href="/learning-path/quantum-computing"
                className="flex items-center gap-1.5 px-4 py-2 rounded border border-border bg-white text-ink-primary hover:bg-canvas-elevated font-semibold text-xs transition-colors"
              >
                <Compass className="w-3.5 h-3.5 text-[#0F7B3F]" />
                <span>Explore Curriculum DAGs</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
