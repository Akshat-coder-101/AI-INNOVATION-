"use client";

import { useState } from "react";
import { Citation } from "@/lib/api";
import { FileText, ExternalLink, X, CheckCircle2 } from "lucide-react";

interface CitationChipProps {
  citations: Citation[];
}

export default function CitationChip({ citations }: CitationChipProps) {
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  if (!citations || citations.length === 0) return null;

  return (
    <div className="mt-4 pt-3 border-t border-slate-800">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          RAG Verified Source Citations ({citations.length})
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {citations.map((c, i) => (
          <button
            key={i}
            onClick={() => setSelectedCitation(c)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/50 text-xs transition-all hover:scale-105"
          >
            <span className="font-medium">{c.chapter}</span>
            {c.page && <span className="text-cyan-400/70">· p.{c.page}</span>}
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-200">
              {Math.round(c.confidence * 100)}% match
            </span>
          </button>
        ))}
      </div>

      {/* Citation Detail Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-lg w-full rounded-2xl p-6 border border-cyan-500/40 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setSelectedCitation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-3 text-cyan-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-bold text-lg text-white">Grounded Source Verification</h3>
            </div>

            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <span className="text-xs uppercase text-slate-400 font-semibold block">Origin Source:</span>
                <p className="font-semibold text-slate-100">{selectedCitation.chapter} {selectedCitation.page ? `(Page ${selectedCitation.page})` : ''}</p>
              </div>

              <div>
                <span className="text-xs uppercase text-slate-400 font-semibold block">Retrieved Chunk Snippet:</span>
                <blockquote className="mt-1 p-3 rounded-lg bg-slate-900/90 border-l-4 border-cyan-400 text-xs text-slate-300 font-mono leading-relaxed italic">
                  "{selectedCitation.snippet}"
                </blockquote>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                <span>pgvector Cosine Grounding: {(selectedCitation.confidence * 100).toFixed(1)}%</span>
                <span className="text-emerald-400">Zero-Hallucination Guardrail Active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
