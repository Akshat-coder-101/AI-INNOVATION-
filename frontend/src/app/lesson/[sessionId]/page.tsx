"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, LessonPlan, LessonSegmentRender } from "@/lib/api";
import TeacherPlayer from "@/components/TeacherPlayer";
import { BrainCircuit, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [initialSegment, setInitialSegment] = useState<LessonSegmentRender | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLesson() {
      try {
        setIsLoading(true);
        // Try fetching plan from backend
        let plan: LessonPlan;
        try {
          plan = await api.getLessonPlan(sessionId);
        } catch {
          // If session not created yet, generate a fallback
          plan = await api.createLessonPlan({
            topic: "Newton's Laws of Motion and Mechanical Conservation",
            time_budget_minutes: 20,
            language: "en"
          });
        }
        setLessonPlan(plan);

        // Render segment 1
        const seg = await api.renderSegment(1, plan.session_id, plan.language);
        setInitialSegment(seg);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load lesson pipeline");
      } finally {
        setIsLoading(false);
      }
    }

    if (sessionId) {
      loadLesson();
    }
  }, [sessionId]);

  const handleLessonComplete = () => {
    if (lessonPlan) {
      router.push(`/assessment/${lessonPlan.session_id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
          <BrainCircuit className="w-8 h-8 animate-spin" />
        </div>
        <h2 className="text-xl font-bold text-white">Synthesizing Pedagogical Pipeline</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Teacher Agent FSM is assembling lesson segments, rendering subject-aware visual models, and generating grounded audio.
        </p>
      </div>
    );
  }

  if (error || !lessonPlan || !initialSegment) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">Lesson Loading Error</h2>
        <p className="text-xs text-slate-400">{error || "Unable to render lesson session."}</p>
        <Link
          href="/topic"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Topic Selection</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <TeacherPlayer
        initialSegment={initialSegment}
        totalSegments={lessonPlan.segments.length}
        onLessonComplete={handleLessonComplete}
      />
    </div>
  );
}
