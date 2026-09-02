"use client";

import { Citation } from "@/lib/api";
import { ShieldCheck, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface CitationChipProps {
  citations?: Citation[];
}

export default function CitationChip({ citations }: CitationChipProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!citations || citations.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-ink-muted py-1 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>Grounded learning material</span>
      </div>
    );
  }

  const primary = citations[0];

  return (
    <div className="space-y-1.5">
      {/* Coursera-style pill-shaped chip: #E9F1FC background, #0056D2 text, 12px */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E9F1FC] text-primary text-xs font-semibold cursor-pointer hover:bg-blue-100 transition-colors"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>
          Source: {primary.chapter || "Course Material"} (Page {primary.page || 1})
        </span>
        {citations.length > 1 && (
          <span className="text-[10px] px-1.5 py-0.2 bg-blue-200/60 rounded-full font-bold">
            +{citations.length - 1} more
          </span>
        )}
        {isExpanded ? (
          <ChevronUp className="w-3 h-3 text-primary" />
        ) : (
          <ChevronDown className="w-3 h-3 text-primary" />
        )}
      </div>

      {/* Expanded Citations Accordion */}
      {isExpanded && (
        <div className="p-3 rounded-lg bg-white border border-border space-y-2.5 shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-xs font-bold text-primary pb-1 border-b border-border">
            <span>Verified Source Materials</span>
            <span className="text-[10px] font-mono font-normal text-ink-muted">Zero-Hallucination Grounded</span>
          </div>

          {citations.map((cite, index) => (
            <div key={index} className="text-xs space-y-1 bg-canvas-elevated p-2.5 rounded border border-border">
              <div className="flex items-center justify-between text-xs font-medium text-ink-primary">
                <span className="flex items-center gap-1 font-bold text-primary">
                  <FileText className="w-3 h-3" />
                  {cite.chapter || "Document Reference"}
                </span>
                <span className="text-ink-muted text-[11px] font-mono">
                  Page {cite.page || 1} {cite.section ? `• ${cite.section}` : ""}
                </span>
              </div>
              <blockquote className="text-xs text-ink-secondary italic border-l-2 border-primary pl-2 my-1">
                "{cite.snippet}"
              </blockquote>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
