"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, LearningReport } from "@/lib/api";
import Link from "next/link";
import { 
  Award, 
  Check, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  CheckSquare, 
  Compass
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
        <div className="w-14 h-14 rounded bg-[#E9F1FC] text-primary flex items-center justify-center mx-auto animate-pulse">
          <Award className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-black">Compiling Learning Report</h2>
        <p className="text-xs text-ink-muted">
          Aggregating checkpoint attempts, misconception resolutions, and assessment grades.
        </p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-4 bg-white rounded-xl border border-border p-8 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-canvas-elevated flex items-center justify-center mx-auto text-ink-muted">
          <Award className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-sm text-black">No Report Available Yet</h3>
        <p className="text-xs text-ink-secondary">
          No learning diagnostics have been generated for this session. Complete a topic lesson and assessment to view your personalized analytics.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            href="/topic"
            className="px-4 py-2 rounded-lg bg-black text-white font-bold text-xs shadow-2xs"
          >
            Start a Lesson
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-border text-ink-primary font-bold text-xs hover:bg-canvas-elevated"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-lg p-6 sm:p-8 border border-border shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <span className="text-xs px-2.5 py-0.5 rounded bg-[#E9F1FC] text-primary font-bold">
              Personalized Learning Report
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-black">{report.topic}</h1>
            <p className="text-xs text-ink-muted flex items-center justify-center sm:justify-start gap-4 font-medium">
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {report.time_spent_minutes} Minutes Session</span>
              <span>•</span>
              <span>Generated on {new Date(report.generated_at || Date.now()).toLocaleDateString()}</span>
            </p>
          </div>

          {/* Mastery Score Badge */}
          <div className="flex flex-col items-center p-5 rounded-lg bg-canvas-elevated border border-border shadow-2xs">
            <span className="text-xs text-ink-muted uppercase font-bold">Mastery Score</span>
            <span className="text-4xl font-black text-primary mt-1">
              {report.score_percent}%
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-[#0F7B3F] font-bold mt-1 border border-emerald-200">
              {report.score_percent >= 80 ? "Proficiency Achieved" : "Review Recommended"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Concepts Understood vs Weak Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Concepts Mastered */}
        <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Check className="w-5 h-5 text-[#0F7B3F] stroke-[3]" />
            <h3 className="font-bold text-sm text-black">Demonstrated Mastery</h3>
          </div>
          <ul className="space-y-2">
            {report.concepts_understood.map((c, i) => (
              <li key={i} className="p-3 rounded bg-emerald-50/40 border border-emerald-200 text-xs text-ink-secondary flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#0F7B3F] flex-shrink-0"></span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weak Areas & Misconceptions */}
        <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <AlertTriangle className="w-5 h-5 text-[#B75F00]" />
            <h3 className="font-bold text-sm text-black">Growth & Revision Areas</h3>
          </div>
          {report.weak_areas.length > 0 || report.misconceptions_encountered.length > 0 ? (
            <ul className="space-y-2">
              {report.weak_areas.map((w, i) => (
                <li key={i} className="p-3 rounded bg-amber-50/40 border border-amber-200 text-xs text-ink-secondary flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#B75F00] flex-shrink-0"></span>
                  <span>{w}</span>
                </li>
              ))}
              {report.misconceptions_encountered.map((m, i) => (
                <li key={i} className="p-3 rounded bg-[#FFF1E6] border border-orange-200 text-xs text-accent flex items-center gap-2 font-semibold">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-200 font-bold text-accent">Misconception Reteach</span>
                  <span className="truncate">{m}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 rounded bg-canvas-elevated text-center text-xs text-ink-muted">
              No prominent conceptual misconceptions detected!
            </div>
          )}
        </div>
      </div>

      {/* Document Gap Map (Missed Concepts & Linked Citations) */}
      {report.gap_map && report.gap_map.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="font-bold text-sm text-black">Diagnostic Gap Map & Verified Citations</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-[#B75F00] font-bold border border-amber-200">
              {report.gap_map.length} Focus Areas
            </span>
          </div>

          <p className="text-xs text-ink-muted">
            The diagnostic evaluator mapped your assessment responses directly to the source document segments and verified excerpts for targeted revision:
          </p>

          <div className="space-y-3">
            {report.gap_map.map((gap, i) => (
              <div key={i} className="p-4 rounded-lg bg-canvas-elevated border border-border space-y-2.5 hover:border-primary/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-[#E9F1FC]">
                      Gap #{i + 1}
                    </span>
                    <h4 className="font-bold text-xs text-black">{gap.concept}</h4>
                  </div>
                  {gap.segment_id && (
                    <Link
                      href={`/lesson/${sessionId}`}
                      className="inline-flex items-center gap-1 text-[11px] text-primary font-bold hover:underline"
                    >
                      <span>Review Segment {gap.segment_id}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {gap.citation && (
                  <div className="p-2.5 rounded bg-white border border-border/80 text-xs text-ink-secondary space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-ink-muted font-mono">
                      <span>Source: {gap.citation.chapter || "Document Reference"}</span>
                      <span>Page {gap.citation.page || 1}</span>
                    </div>
                    {(gap.citation.quote || gap.citation.snippet) && (
                      <blockquote className="text-xs italic text-ink-primary border-l-2 border-primary pl-2 my-1">
                        "{gap.citation.quote || gap.citation.snippet}"
                      </blockquote>
                    )}
                  </div>
                )}

                <p className="text-xs text-ink-secondary font-medium">
                  👉 <strong className="text-black">Action:</strong> {gap.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actionable Revision Checklist */}
      <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <CheckSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm text-black">Actionable Revision Plan</h3>
        </div>
        <div className="space-y-2">
          {report.recommended_revision.map((rec, i) => (
            <div key={i} className="p-3 rounded bg-canvas-elevated border border-border text-xs text-ink-secondary flex items-start gap-2.5 font-medium">
              <span className="font-mono text-primary font-bold">{i + 1}.</span>
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Next Topics */}
      <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm text-black">Recommended Next Topics in Learning Path</h3>
          </div>
          <Link
            href={`/learning-path/${encodeURIComponent(report.topic.toLowerCase().replace(/\s+/g, '-'))}`}
            className="text-xs text-primary hover:underline font-bold flex items-center gap-1"
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
              className="p-4 rounded bg-white border border-border hover:border-primary hover:bg-[#E9F1FC] transition-all hover:scale-[1.01] group shadow-2xs"
            >
              <span className="text-[10px] text-primary font-bold">Step {i + 1}</span>
              <h4 className="font-bold text-xs text-black group-hover:text-primary transition-colors mt-1">
                {t}
              </h4>
            </Link>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
        <Link
          href={`/lesson/${sessionId}`}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded border border-border hover:bg-canvas-elevated text-xs font-semibold text-ink-primary transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-primary" />
          <span>Revise This Lesson</span>
        </Link>

        <Link
          href="/topic"
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start Next Curriculum Topic</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
