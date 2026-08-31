"use client";

import { Sparkles, HelpCircle, ShieldAlert } from "lucide-react";

interface DemoModeToggleProps {
  isDemoMode: boolean;
  onToggle: (val: boolean) => void;
}

export default function DemoModeToggle({ isDemoMode, onToggle }: DemoModeToggleProps) {
  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isDemoMode 
        ? "bg-amber-950/40 border-amber-500/50 shadow-lg shadow-amber-500/10" 
        : "bg-slate-900/60 border-slate-800"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isDemoMode ? "bg-amber-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"
          }`}>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200">Presenter Demo Mode</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                20% Rubric Hook
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {isDemoMode ? "Active: Submitting any answer triggers the adaptive reteach branch." : "Disabled: Standard evaluation mode."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onToggle(!isDemoMode)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isDemoMode ? "bg-amber-500" : "bg-slate-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isDemoMode ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
