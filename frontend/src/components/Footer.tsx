import { GraduationCap, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-canvas-surface py-10 mt-auto text-ink-secondary text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <span className="font-heading text-sm font-bold text-ink-primary">
              Sahayak AI Teacher
            </span>
            <p className="text-[11px] text-ink-muted">
              AI Innovation Hackathon 2026 · Adaptive AI Educator Platform
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-[11px] text-ink-secondary">
          <span className="flex items-center gap-1 text-primary font-mono font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Hallucination Grounded RAG
          </span>
          <span>•</span>
          <span className="font-mono">FSM Cognitive Cycles</span>
          <span>•</span>
          <span>English · हिंदी · Hinglish</span>
        </div>

        <div className="text-[11px] text-ink-muted font-mono">
          © 2026 Sahayak AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
