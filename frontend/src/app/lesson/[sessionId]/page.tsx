"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, LessonPlan, LessonSegmentRender } from "@/lib/api";
import TeacherPlayer from "@/components/TeacherPlayer";
import CourseNavigationSidebar from "@/components/CourseNavigationSidebar";
import NotesAndResourcesPanel from "@/components/NotesAndResourcesPanel";
import StickyAdaptiveBottomBar from "@/components/StickyAdaptiveBottomBar";
import { 
  BrainCircuit, 
  AlertCircle, 
  ArrowLeft, 
  Menu, 
  FileText, 
  ChevronRight, 
  Check, 
  Bookmark, 
  Sparkles,
  Award
} from "lucide-react";
import Link from "next/link";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [currentSegment, setCurrentSegment] = useState<LessonSegmentRender | null>(null);
  const [currentSegmentId, setCurrentSegmentId] = useState<number>(1);
  const [completedSegmentIds, setCompletedSegmentIds] = useState<number[]>([]);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive Drawer states
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadLesson() {
      try {
        setIsLoading(true);
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
        setCurrentSegment(seg);
        setCurrentSegmentId(1);
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

  // Handle switching to a specific segment from syllabus
  const handleSelectSegment = async (segId: number) => {
    if (!lessonPlan || segId === currentSegmentId) return;
    try {
      setIsLoading(true);
      const seg = await api.renderSegment(segId, lessonPlan.session_id, lessonPlan.language);
      setCurrentSegment(seg);
      setCurrentSegmentId(segId);
      setIsNavOpen(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSegmentChange = (nextSegId: number) => {
    setCompletedSegmentIds((prev) => 
      prev.includes(currentSegmentId) ? prev : [...prev, currentSegmentId]
    );
    setCurrentSegmentId(nextSegId);
  };

  const handleLessonComplete = () => {
    if (lessonPlan) {
      setCompletedSegmentIds((prev) => 
        prev.includes(currentSegmentId) ? prev : [...prev, currentSegmentId]
      );
      router.push(`/assessment/${lessonPlan.session_id}`);
    }
  };

  const handlePreviousSegment = () => {
    if (currentSegmentId > 1) {
      handleSelectSegment(currentSegmentId - 1);
    }
  };

  const handleNextOrSubmit = () => {
    if (!lessonPlan) return;
    if (currentSegmentId >= lessonPlan.segments.length) {
      handleLessonComplete();
    } else {
      handleSelectSegment(currentSegmentId + 1);
    }
  };

  if (isLoading && !currentSegment) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded bg-[#E9F1FC] text-primary flex items-center justify-center mx-auto animate-pulse">
          <BrainCircuit className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-ink-primary">Loading Adaptive Classroom...</h2>
        <p className="text-xs text-ink-muted max-w-sm mx-auto">
          Preparing curriculum syllabus, visual specs, and interactive checkpoints.
        </p>
      </div>
    );
  }

  if (error || !lessonPlan || !currentSegment) {
    return (
      <div className="py-20 max-w-lg mx-auto text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-[#C21E1E] mx-auto" />
        <h2 className="text-lg font-bold text-ink-primary">Lesson Loading Error</h2>
        <p className="text-xs text-ink-secondary">{error || "Unable to load lesson session."}</p>
        <Link
          href="/topic"
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-black text-white font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Topic Selection</span>
        </Link>
      </div>
    );
  }

  const handleRequestSimplerExplanation = async () => {
    if (!lessonPlan) return;
    try {
      setIsLoading(true);
      const res = await api.requestSimplification(lessonPlan.session_id, currentSegmentId);
      if (res.reteach_segment) {
        setCurrentSegment(res.reteach_segment);
      }
    } catch (err) {
      console.error("Failed to request simplification:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const currentSegmentMeta = lessonPlan.segments.find((s) => s.id === currentSegmentId);
  const isMastered = completedSegmentIds.includes(currentSegmentId);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-white relative">
      {/* Top Workspace Bar */}
      <header className="px-4 py-2.5 bg-white border-b border-border flex items-center justify-between shrink-0 z-20">
        {/* Left: Breadcrumbs & Toggle Sidebar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNavOpen(!isNavOpen)}
            className={`px-2.5 py-1.5 rounded border transition-all text-xs flex items-center gap-1.5 ${
              isNavOpen
                ? "bg-[#E9F1FC] text-primary border-primary/30 font-bold"
                : "bg-white border-border text-ink-secondary hover:text-ink-primary hover:bg-canvas-elevated"
            }`}
            title={isNavOpen ? "Hide Course Syllabus" : "Show Course Syllabus"}
          >
            <Menu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Syllabus</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/5 font-mono">
              {completedSegmentIds.length}/{lessonPlan.segments.length}
            </span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            <Link href="/dashboard" className="text-ink-muted hover:text-primary transition-colors hidden sm:inline">
              Courses
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-border hidden sm:inline" />
            <span className="font-semibold text-ink-primary truncate max-w-[180px] sm:max-w-xs">
              {lessonPlan.topic}
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-border" />
            <span className="text-primary font-bold">
              Part {String(currentSegmentId).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Right: Notes Toggle & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`px-3 py-1.5 rounded border transition-colors text-xs flex items-center gap-1.5 ${
              isBookmarked
                ? "bg-[#FFF1E6] text-accent border-orange-200 font-bold"
                : "bg-white border-border text-ink-secondary hover:text-ink-primary"
            }`}
            title="Bookmark this concept"
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? "fill-current text-accent" : ""}`} />
            <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
          </button>

          <button
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className={`px-3 py-1.5 rounded border transition-colors text-xs flex items-center gap-1.5 ${
              isNotesOpen
                ? "bg-primary text-white border-primary font-bold shadow-2xs"
                : "bg-white border-border text-ink-secondary hover:text-ink-primary hover:bg-canvas-elevated"
            }`}
            title="Toggle Notes & Citations Panel"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Notes & Citations</span>
          </button>
        </div>
      </header>

      {/* Main Stage Body (Sidebar ↔ Main Centered Content ↔ Right Panel) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide-out Handle when Syllabus is closed */}
        {!isNavOpen && (
          <button
            onClick={() => setIsNavOpen(true)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white border border-l-0 border-border shadow-md rounded-r-md py-3 px-1 hover:bg-[#E9F1FC] text-ink-muted hover:text-primary transition-all group"
            title="Slide open syllabus"
            aria-label="Slide open course syllabus"
          >
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform text-primary" />
          </button>
        )}

        {/* 1. Left Sidebar: Syllabus Tree (240–280px) */}
        <CourseNavigationSidebar
          lessonPlan={lessonPlan}
          currentSegmentId={currentSegmentId}
          completedSegmentIds={completedSegmentIds}
          onSelectSegment={handleSelectSegment}
          isOpen={isNavOpen}
          onToggle={() => setIsNavOpen(false)}
        />

        {/* 2. Main Centered Content Area (Spacious reading & large video comfort) */}
        <main className="flex-1 overflow-y-auto bg-white flex flex-col justify-between scrollbar-thin overflow-x-hidden">
          <div className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Top of Every Lesson: Concept Title + Mastery Pill + "Why this matters" */}
            <div className="pb-4 border-b border-border space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  ITEM {String(currentSegmentId).padStart(2, "0")} OF {String(lessonPlan.segments.length).padStart(2, "0")}
                </span>

                {/* Mastery Status Pill */}
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  {isMastered ? (
                    <span className="bg-emerald-50 text-[#0F7B3F] border border-emerald-200 px-2.5 py-0.5 rounded flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Completed
                    </span>
                  ) : currentSegment.is_reteach ? (
                    <span className="bg-[#FFF1E6] text-accent border border-orange-200 px-2.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Adaptive Reteach
                    </span>
                  ) : (
                    <span className="bg-[#E9F1FC] text-primary border border-blue-200 px-2.5 py-0.5 rounded flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" />
                      In Progress ({currentSegmentMeta?.est_minutes || 5} min)
                    </span>
                  )}
                </div>
              </div>

              {/* True Black Large Concept Title */}
              <h1 className="text-2xl font-bold tracking-tight text-black">
                {currentSegmentMeta?.concept || currentSegment.concept}
              </h1>

              {/* "Why This Matters" Line */}
              <p className="text-xs text-ink-muted leading-relaxed flex items-center gap-1.5">
                <span className="font-bold text-ink-primary">Why this matters:</span>
                <span>{currentSegmentMeta?.summary || "Essential foundational building block for deeper analytical problem solving."}</span>
              </p>
            </div>

            {/* Vertical Stack */}
            <div className="space-y-6">
              <TeacherPlayer
                initialSegment={currentSegment}
                totalSegments={lessonPlan.segments.length}
                onLessonComplete={handleLessonComplete}
                onSegmentChange={handleSegmentChange}
              />
            </div>
          </div>

          {/* 3. Coursera Sticky Bottom Bar */}
          <StickyAdaptiveBottomBar
            currentSegmentId={currentSegmentId}
            totalSegments={lessonPlan.segments.length}
            isReteachActive={currentSegment.is_reteach}
            onPrevious={handlePreviousSegment}
            onNextOrSubmit={handleNextOrSubmit}
            onRequestSimplerExplanation={handleRequestSimplerExplanation}
            primaryCtaText={currentSegmentId >= lessonPlan.segments.length ? "Finish Lesson & Take Assessment" : "Next Item"}
          />
        </main>

        {/* 4. Right Sidebar: Contextual Notes, Bookmarks & Citations */}
        <NotesAndResourcesPanel
          segment={currentSegment}
          isOpen={isNotesOpen}
          onToggle={() => setIsNotesOpen(false)}
          isBookmarked={isBookmarked}
          onToggleBookmark={() => setIsBookmarked(!isBookmarked)}
        />
      </div>
    </div>
  );
}
