"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, LearningPath } from "@/lib/api";
import LearningPathDAG from "@/components/LearningPathDAG";
import { Compass, AlertCircle } from "lucide-react";

export default function LearningPathPage() {
  const params = useParams();
  const topicId = (params.topicId as string) || "quantum-computing";

  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadPath() {
      try {
        setIsLoading(true);
        const data = await api.getLearningPath(topicId);
        setLearningPath(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    if (topicId) loadPath();
  }, [topicId]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mx-auto animate-pulse">
          <Compass className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-white">Generating Multi-Node Curriculum DAG</h2>
        <p className="text-xs text-slate-400">
          Assembling prerequisite dependencies, difficulty tiers, and mastery nodes.
        </p>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="py-20 text-center text-slate-400">
        <p>Curriculum learning path not found.</p>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <LearningPathDAG initialPath={learningPath} />
    </div>
  );
}
