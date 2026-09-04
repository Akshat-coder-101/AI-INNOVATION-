"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LearningPath, PathNode, api } from "@/lib/api";
import { Check, Circle, ArrowDown, Sparkles, Clock, Award, BookOpen, PlayCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface LearningPathDAGProps {
  initialPath: LearningPath;
}

export default function LearningPathDAG({ initialPath }: LearningPathDAGProps) {
  const router = useRouter();
  const { user } = useAuth();
  
  const [path, setPath] = useState<LearningPath>(initialPath);
  const [activeNode, setActiveNode] = useState<PathNode | null>(path.nodes[0] || null);

  const handleToggleNode = async (nodeId: string) => {
    try {
      const updated = await api.togglePathNode(path.topic_id, nodeId, user?.id || "default-user");
      setPath(updated);
      const n = updated.nodes.find((item) => item.id === nodeId);
      if (n) setActiveNode(n);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLaunchLesson = (node: PathNode) => {
    router.push(`/setup?topic=${encodeURIComponent(node.title.replace(/^\d+\.\s*/, ""))}`);
  };

  return (
    <div className="space-y-6">
      {/* Path Header */}
      <div className="bg-white rounded-lg p-6 border border-border shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E9F1FC] text-primary font-bold">
                Bloom's Taxonomy Progression
              </span>
              <span className="text-xs text-ink-muted">6-Stage Cognitive Depth</span>
            </div>
            <h1 className="text-2xl font-bold text-black tracking-tight">{path.title}</h1>
            <p className="text-xs text-ink-secondary mt-1 max-w-2xl leading-relaxed font-medium">{path.description}</p>
          </div>

          <div className="flex items-center gap-4 bg-canvas-elevated p-4 rounded-lg border border-border">
            <div className="text-right">
              <span className="text-xs text-ink-muted block font-medium">Curriculum Progress</span>
              <span className="text-xl font-extrabold text-primary">{path.completion_percentage}%</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#E9F1FC] border-2 border-primary flex items-center justify-center font-bold text-xs text-primary">
              {path.nodes.filter((n) => n.completed).length}/{path.nodes.length}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive DAG Nodes Graph & Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Nodes Timeline Column (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {path.nodes.map((node, index) => {
            const isSelected = activeNode?.id === node.id;
            return (
              <div key={node.id} className="relative">
                {/* Node Card */}
                <div
                  onClick={() => setActiveNode(node)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-white border-primary shadow-md scale-[1.01]"
                      : "bg-white border-border hover:border-primary/60 hover:bg-canvas-elevated"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleNode(node.id);
                        }}
                        className={`w-11 h-11 rounded flex items-center justify-center transition-all shrink-0 ${
                          node.completed
                            ? "bg-[#0F7B3F] text-white shadow-2xs"
                            : "bg-canvas-elevated text-ink-muted hover:bg-white border border-border"
                        }`}
                        title={node.completed ? "Mark as Incomplete" : "Mark as Completed"}
                        aria-label={node.completed ? `Mark ${node.title} as incomplete` : `Mark ${node.title} as completed`}
                      >
                        {node.completed ? (
                          <Check className="w-5 h-5 stroke-[3]" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <h3 className={`text-sm font-bold ${node.completed ? "text-ink-muted line-through" : "text-black"}`}>
                          {node.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
                          <span className="capitalize font-medium">{node.difficulty}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {node.estimated_hours}h
                          </span>
                        </div>
                      </div>
                    </div>

                    {node.score && (
                      <span className="text-xs px-2 py-1 rounded bg-emerald-50 text-[#0F7B3F] font-bold border border-emerald-200">
                        {node.score}% Mastery
                      </span>
                    )}
                  </div>
                </div>

                {/* Edge Indicator */}
                {index < path.nodes.length - 1 && (
                  <div className="flex justify-center my-1 text-ink-muted">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Node Deep Dive (5 cols) */}
        <div className="lg:col-span-5">
          {activeNode ? (
            <div className="bg-white rounded-lg p-6 border border-border sticky top-24 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Node Inspector
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded bg-canvas-elevated text-ink-secondary font-semibold capitalize border border-border">
                  {activeNode.difficulty} Module
                </span>
              </div>

              <h2 className="text-lg font-bold text-black">{activeNode.title}</h2>
              <p className="text-xs text-ink-secondary leading-relaxed font-medium">{activeNode.description}</p>

              <div className="p-3.5 rounded bg-canvas-elevated border border-border space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Estimated Duration:</span>
                  <span className="text-black font-semibold">{activeNode.estimated_hours} Hours</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Prerequisites:</span>
                  <span className="text-primary font-semibold">
                    {activeNode.prerequisites.length > 0 ? activeNode.prerequisites.join(", ") : "None (Foundational)"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">Status:</span>
                  <span className={activeNode.completed ? "text-[#0F7B3F] font-bold" : "text-accent font-bold"}>
                    {activeNode.completed ? "Completed & Mastered" : "Not Started / In Progress"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handleLaunchLesson(activeNode)}
                  className="w-full py-2.5 rounded bg-black hover:bg-neutral-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-2xs transition-colors"
                >
                  <PlayCircle className="w-4 h-4 text-accent" />
                  <span>Launch AI Lesson on this Concept</span>
                </button>

                <button
                  onClick={() => handleToggleNode(activeNode.id)}
                  className={`w-full py-2 rounded font-semibold text-xs border transition-colors ${
                    activeNode.completed
                      ? "bg-white hover:bg-canvas-elevated text-ink-secondary border-border"
                      : "bg-emerald-50 hover:bg-emerald-100 text-[#0F7B3F] border-emerald-300 font-bold"
                  }`}
                >
                  {activeNode.completed ? "Mark as Incomplete" : "Mark as Completed"}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-8 text-center text-ink-muted border border-border">
              <BookOpen className="w-8 h-8 text-ink-muted mx-auto mb-2" />
              <p className="text-xs font-medium">Select any curriculum node to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
