"use client";

import { useEffect, useState } from "react";
import { api, LearnerProfile } from "@/lib/api";
import Link from "next/link";
import { 
  User, 
  Award, 
  History
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
      <div className="py-24 text-center text-ink-muted">Loading Learner Profile...</div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header Profile Card */}
      <div className="bg-white rounded-lg p-6 sm:p-8 border border-border shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-[#E9F1FC] border border-blue-200 flex items-center justify-center">
            <User className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-1 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-bold text-black">{profile.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#E9F1FC] text-primary font-bold capitalize">
                {profile.level} Level
              </span>
            </div>
            <p className="text-xs text-ink-muted font-medium">
              Primary Goal: {profile.goal?.replace("_", " ") || "Understand Concept"} · Preferred Style: {profile.preferred_style || "Visual"}
            </p>
          </div>

          <Link
            href="/topic"
            className="px-5 py-2.5 rounded bg-black hover:bg-neutral-800 text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Start New Lesson
          </Link>
        </div>
      </div>

      {/* Historical Topics & Scores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strong vs Weak Concepts */}
        <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <h3 className="font-bold text-sm text-black flex items-center gap-2">
            <Award className="w-4 h-4 text-[#0F7B3F]" />
            <span>Mastery Diagnostics</span>
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-[#0F7B3F] font-bold block mb-1.5">Strong Concepts:</span>
              <div className="flex flex-wrap gap-2">
                {profile.strong_concepts.map((c, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-[#0F7B3F] font-semibold">
                    {c}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs text-[#B75F00] font-bold block mb-1.5">Concepts Flagged for Revision:</span>
              <div className="flex flex-wrap gap-2">
                {profile.weak_concepts.map((c, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-[#B75F00] font-semibold">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Learning History */}
        <div className="bg-white rounded-lg p-6 border border-border space-y-4 shadow-2xs">
          <h3 className="font-bold text-sm text-black flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <span>Session History</span>
          </h3>

          <div className="space-y-2">
            {profile.scores_history.length > 0 ? (
              profile.scores_history.map((h, i) => (
                <div key={i} className="p-3 rounded bg-canvas-elevated border border-border flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-black">{h.topic}</h4>
                    <span className="text-[10px] text-ink-muted">{h.date}</span>
                  </div>
                  <span className="font-mono font-bold text-[#0F7B3F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {h.score}%
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-ink-muted italic">No past sessions recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
