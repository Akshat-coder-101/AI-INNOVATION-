"use client";

import { useState } from "react";
import { LearningPath, PathNode, api } from "@/lib/api";
import { CheckCircle, Circle, ArrowDown, Sparkles, Clock, Award, BookOpen } from "lucide-react";

interface LearningPathDAGProps {
  initialPath: LearningPath;
}

export default function LearningPathDAG({ initialPath }: LearningPathDAGProps) {
  const [path, setPath] = useState<LearningPath>(initialPath);
  const [activeNode, setActiveNode] = useState<PathNode | null>(path.nodes[0] || null);

  const handleToggleNode = async (nodeId: string) => {
    try {
      const updated = await api.togglePathNode(path.topic_id, nodeId);
      setPath(updated);
      const n = updated.nodes.find((item) => item.id === nodeId);
      if (n) setActiveNode(n);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Path Header */}
      <div className="glass-panel rounded-2xl p-6 border border-brand-500/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-bold border border-brand-500/30">
                Curriculum DAG
              </span>
              <span className="text-xs text-slate-400">Bloom's Taxonomy Progression</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{path.title}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">{path.description}</p>
          </div>

          <div className="flex items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">Curriculum Progress</span>
              <span className="text-xl font-extrabold text-cyan-400">{path.completion_percentage}%</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center font-bold text-xs text-cyan-300">
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
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "glass-panel border-brand-400 shadow-xl shadow-brand-500/20 scale-[1.01]"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
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
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          node.completed
                            ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {node.completed ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </button>

                      <div>
                        <h3 className={`text-sm font-bold ${node.completed ? "text-slate-200 line-through opacity-80" : "text-white"}`}>
                          {node.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span className="capitalize">{node.difficulty}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {node.estimated_hours}h
                          </span>
                        </div>
                      </div>
                    </div>

                    {node.score && (
                      <span className="text-xs px-2 py-1 rounded-md bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-bold">
                        {node.score}% Mastery
                      </span>
                    )}
                  </div>
                </div>

                {/* Edge Indicator */}
                {index < path.nodes.length - 1 && (
                  <div className="flex justify-center my-1 text-slate-600">
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
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 sticky top-24 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
                  Node Inspector
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium capitalize">
                  {activeNode.difficulty} Module
                </span>
              </div>

              <h2 className="text-lg font-bold text-white">{activeNode.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed">{activeNode.description}</p>

              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Estimated Duration:</span>
                  <span className="text-slate-200 font-semibold">{activeNode.estimated_hours} Hours</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Prerequisites:</span>
                  <span className="text-cyan-300 font-semibold">
                    {activeNode.prerequisites.length > 0 ? activeNode.prerequisites.join(", ") : "None (Foundational)"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Status:</span>
                  <span className={activeNode.completed ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {activeNode.completed ? "Completed & Mastered" : "In Progress"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleToggleNode(activeNode.id)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                  activeNode.completed
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    : "bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-600/30"
                }`}
              >
                {activeNode.completed ? "Mark Incomplete" : "Mark Node Completed"}
              </button>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">
              <BookOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs">Select any curriculum node to inspect details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
