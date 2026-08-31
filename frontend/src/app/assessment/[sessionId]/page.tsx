"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Quiz, QuizGradeResponse } from "@/lib/api";
import { 
  GraduationCap, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  HelpCircle, 
  Sparkles, 
  Award, 
  Clock 
} from "lucide-react";

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
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
        <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white">Generating Targeted Assessment</h2>
        <p className="text-xs text-slate-400">
          Synthesizing questions based strictly on the concepts taught during this session.
        </p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>No active assessment found for this session.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
            Post-Lesson Assessment
          </span>
          <span className="text-xs text-slate-400">Session Evaluation Engine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white">{quiz.topic}</h1>
        <p className="text-sm text-slate-400 mt-1">
          Test your mastery across the key principles and boundary conditions explored in your lesson.
        </p>
      </div>

      {/* Grade Banner if completed */}
      {gradeResult && (
        <div className="glass-panel rounded-2xl p-6 border border-emerald-500/40 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-xl">
              {gradeResult.score_percentage}%
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Assessment Complete</h3>
              <p className="text-xs text-slate-300">
                You answered {gradeResult.total_score} of {gradeResult.max_score} questions correctly.
              </p>
            </div>
          </div>

          <button
            onClick={handleProceedToReport}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>View Full Learning Report</span>
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
              className={`glass-panel rounded-2xl p-6 border transition-all ${
                result
                  ? result.is_correct
                    ? "border-emerald-500/40 bg-emerald-950/10"
                    : "border-rose-500/40 bg-rose-950/10"
                  : "border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-bold text-brand-300">
                  Question {idx + 1} · {q.concept}
                </span>
                {result && (
                  <span className={`text-xs font-bold flex items-center gap-1 ${
                    result.is_correct ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {result.is_correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {result.is_correct ? "Correct" : "Needs Review"}
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-slate-100 mb-4">{q.question}</p>

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
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? "bg-brand-600/30 border-brand-400 text-white font-semibold shadow-md shadow-brand-500/20"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-brand-500/40 hover:bg-slate-800/60"
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
                <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
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
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
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
