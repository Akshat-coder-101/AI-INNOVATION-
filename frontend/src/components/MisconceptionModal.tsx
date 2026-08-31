"use client";

import { InteractionResponse } from "@/lib/api";
import { Sparkles, RefreshCw, Lightbulb, CheckCircle2, ArrowRight } from "lucide-react";

interface MisconceptionModalProps {
  interaction: InteractionResponse;
  onContinueReteach: () => void;
}

export default function MisconceptionModal({
  interaction,
  onContinueReteach,
}: MisconceptionModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="glass-panel max-w-xl w-full rounded-2xl p-6 sm:p-8 border-2 border-amber-500/50 shadow-2xl relative overflow-hidden">
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-brand-500 to-accent-cyan" />

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Lightbulb className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">Adaptive Teacher Intervention</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Misconception Detected
              </span>
            </div>
            <p className="text-xs text-amber-300/80 font-medium">
              {interaction.misconception_name || "Refining Mental Model"}
            </p>
          </div>
        </div>

        {/* Feedback description */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-sm text-slate-300 leading-relaxed mb-4">
          {interaction.feedback}
        </div>

        {/* Brand New Analogy Highlight (Top Rubric Item) */}
        {interaction.new_analogy && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/60 to-brand-950/60 border border-brand-500/40 mb-4">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-300 mb-1.5">
              <Sparkles className="w-4 h-4 text-brand-400" />
              <span>Brand New Analogy (Session Unused):</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-100 italic leading-relaxed">
              "{interaction.new_analogy}"
            </p>
          </div>
        )}

        {/* New Example */}
        {interaction.new_example && (
          <div className="text-xs text-slate-300 mb-6 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <span className="font-bold text-slate-400 block mb-0.5">Concrete Physical Example:</span>
            {interaction.new_example}
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            Switching into adaptive reteach segment
          </span>

          <button
            onClick={onContinueReteach}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-600 hover:from-amber-400 hover:to-brand-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>Begin Adaptive Reteach</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
