"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Quiz, QuizGradeResponse } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { recordSessionCompletion } from "@/lib/analytics";
import { 
  GraduationCap, 
  Check, 
  XCircle, 
  ArrowRight, 
  Sparkles
} from "lucide-react";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const sessionId = params.sessionId as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [gradeResult, setGradeResult] = useState<QuizGradeResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchQuiz() {
      try {
        setIsLoading(true);
        const data = await api.getQuiz(sessionId);
        setQuiz(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (sessionId) fetchQuiz();
  }, [sessionId]);

  const handleSelectOption = (questionId: string, option: string) => {
    if (gradeResult) return; // locked after grading
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleGradeQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    setIsSubmitting(true);
    try {
      const res = await api.gradeQuiz({
        session_id: sessionId,
        answers,
      });
      setGradeResult(res);

      // Record this real completed session in learner analytics
      recordSessionCompletion(user?.id || "default-user", {
        topic: quiz.topic,
        score: Math.round(res.score_percentage),
        timeMinutes: 20,
        misconceptionsCount: res.results.filter((r) => !r.is_correct).length,
        status: "Completed",
        date: "Today",
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedToReport = () => {
    router.push(`/report/${sessionId}`);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded bg-[#E9F1FC] text-primary flex items-center justify-center mx-auto animate-pulse">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-black">Generating Targeted Assessment</h2>
        <p className="text-xs text-ink-muted">
          Synthesizing questions based strictly on the concepts taught during this session.
        </p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="py-20 text-center text-ink-muted">
        <p>No active assessment found for this session.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2.5 py-0.5 rounded bg-[#E9F1FC] text-primary font-bold">
            Post-Lesson Assessment
          </span>
          <span className="text-xs text-ink-muted font-medium">Session Evaluation</span>
        </div>
        <h1 className="text-3xl font-extrabold text-black">{quiz.topic}</h1>
        <p className="text-sm text-ink-secondary mt-1 font-medium">
          Test your mastery across the key principles and boundary conditions explored in your lesson.
        </p>
      </div>

      {/* Grade Banner if completed */}
      {gradeResult && (
        <div className="bg-white rounded-lg p-6 border border-emerald-300 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-[#0F7B3F] text-[#0F7B3F] flex items-center justify-center font-black text-xl">
              {gradeResult.score_percentage}%
            </div>
            <div>
              <h3 className="font-bold text-base text-black">Assessment Complete</h3>
              <p className="text-xs text-ink-secondary">
                You answered {gradeResult.total_score} of {gradeResult.max_score} questions correctly.
              </p>
            </div>
          </div>

          <button
            onClick={handleProceedToReport}
            className="flex items-center gap-2 px-6 py-2.5 rounded bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <span>View Learning Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Questions Stack */}
      <form onSubmit={handleGradeQuiz} className="space-y-6">
        {quiz.questions.map((q, idx) => {
          const result = gradeResult?.results.find((r) => r.question_id === q.id);
          const studentAns = answers[q.id];

          return (
            <div
              key={q.id}
              className={`bg-white rounded-lg p-6 border transition-all shadow-2xs ${
                result
                  ? result.is_correct
                    ? "border-emerald-300 bg-emerald-50/20"
                    : "border-rose-300 bg-rose-50/20"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <span className="text-xs font-bold text-primary">
                  Question {idx + 1} · {q.concept}
                </span>
                {result && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    result.is_correct ? "text-[#0F7B3F]" : "text-[#C21E1E]"
                  }`}>
                    {result.is_correct ? <Check className="w-4 h-4 stroke-[3]" /> : <XCircle className="w-4 h-4" />}
                    {result.is_correct ? "Correct" : "Needs Review"}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-black mb-4">{q.question}</p>

              {/* Options */}
              {q.options && (
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = studentAns === opt;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt)}
                        disabled={!!gradeResult}
                        className={`w-full text-left p-3 rounded border text-xs transition-all ${
                          isSelected
                            ? "bg-[#E9F1FC] border-primary text-primary font-bold shadow-2xs"
                            : "bg-white border-border text-ink-secondary hover:border-primary/50 hover:bg-canvas-elevated"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Feedback Item */}
              {result && (
                <div className="mt-4 p-3 rounded bg-canvas-elevated border border-border text-xs text-ink-secondary leading-relaxed">
                  {result.feedback}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit Quiz CTA */}
        {!gradeResult && (
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(answers).length < quiz.questions.length}
              className="flex items-center gap-2 px-8 py-3 rounded bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? "Evaluating Responses..." : "Submit & Grade Assessment"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
