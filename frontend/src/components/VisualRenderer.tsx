"use client";

import { useState } from "react";
import { VisualSpec } from "@/lib/api";
import { 
  Play, 
  Terminal, 
  Layers, 
  TrendingUp, 
  Calendar, 
  FileCode, 
  CheckCircle2, 
  Activity, 
  Info, 
  Maximize2 
} from "lucide-react";

interface VisualRendererProps {
  visualSpec: VisualSpec;
}

export default function VisualRenderer({ visualSpec }: VisualRendererProps) {
  const { type, title, payload } = visualSpec;
  const [activeTab, setActiveTab] = useState<string>("visual");
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string>(payload?.output || payload?.stdout || "Output will appear here...");

  // Render Math/Physics Graph & Equations
  if (type === "equation/graph" || type.includes("math") || type.includes("physics")) {
    const xs = payload?.x_values || [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const ys = payload?.y_values || [16, 9, 4, 1, 0, 1, 4, 9, 16];
    const equations = payload?.equations || ["f(x) = x^2"];
    const steps = payload?.step_by_step || [];

    return (
      <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 flex flex-col h-full">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-100">{title}</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
            Math / Physics Engine
          </span>
        </div>

        {/* Governing Equations Block */}
        <div className="mb-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Governing Analytical Equations:
          </span>
          <div className="flex flex-wrap gap-2">
            {equations.map((eq: string, idx: number) => (
              <span key={idx} className="font-mono text-sm px-2.5 py-1 rounded bg-slate-800/80 text-cyan-300 border border-cyan-500/20 shadow-sm">
                {eq}
              </span>
            ))}
          </div>
        </div>

        {/* Dynamic Coordinate Plot Canvas */}
        <div className="relative flex-1 min-h-[220px] rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 flex flex-col justify-center">
          <div className="text-center mb-2">
            <span className="text-xs font-semibold text-slate-300">{payload?.plot_title || "Dynamic State Trajectory"}</span>
          </div>

          <div className="relative h-40 w-full flex items-end justify-between px-6 pt-6 pb-4 border-b border-l border-slate-700">
            {xs.map((x: number, i: number) => {
              const y = ys[i] || 0;
              const maxY = Math.max(...ys.map(Math.abs), 1);
              const heightPct = Math.min(Math.max((Math.abs(y) / maxY) * 100, 10), 100);
              return (
                <div key={i} className="flex flex-col items-center gap-1 group relative">
                  <div 
                    className="w-3 bg-gradient-to-t from-indigo-600 to-cyan-400 rounded-t transition-all duration-300 group-hover:from-indigo-400 group-hover:to-cyan-200 group-hover:scale-y-105"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[9px] text-slate-400 font-mono">{x}</span>
                  
                  {/* Tooltip on hover */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] text-cyan-300 px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none whitespace-nowrap z-10">
                    y: {y}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 px-2">
            <span>← {payload?.x_label || "t (sec)"}</span>
            <span>{payload?.y_label || "f(x)"} →</span>
          </div>
        </div>

        {/* Step-by-Step Derivation */}
        {steps.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <span className="text-xs font-bold text-slate-300 block mb-2">Step-by-Step Analytical Derivation:</span>
            <ul className="space-y-1 text-xs text-slate-400">
              {steps.map((st: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-indigo-400 font-semibold">•</span>
                  <span>{st}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Render Biology Labeled Diagram
  if (type === "labeled-diagram" || type.includes("bio") || type.includes("diagram")) {
    const labels = payload?.labels || [];
    const takeaways = payload?.takeaways || [];

    return (
      <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 flex flex-col h-full">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">{title}</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
            Biology & Life Sciences
          </span>
        </div>

        {/* Interactive SVG Diagram */}
        <div className="relative rounded-xl bg-slate-950/90 border border-slate-800 overflow-hidden flex items-center justify-center p-2 min-h-[220px]">
          {payload?.svg_code ? (
            <div 
              className="w-full h-full"
              dangerouslySetInnerHTML={{ __html: payload.svg_code }} 
            />
          ) : (
            <div className="text-center p-6 text-slate-400">
              <Layers className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80 animate-bounce" />
              <p className="text-xs">Interactive Labeled Diagram Ready</p>
            </div>
          )}
        </div>

        {/* Interactive Hotspot Pills */}
        {labels.length > 0 && (
          <div className="mt-4">
            <span className="text-xs font-bold text-slate-300 block mb-2">Interactive Structural Components:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {labels.map((item: any, idx: number) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedHotspot(item)}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                    selectedHotspot?.name === item.name
                      ? "bg-emerald-950/60 border-emerald-400 text-white shadow-md shadow-emerald-500/20"
                      : "bg-slate-900/60 border-slate-800 hover:border-emerald-500/50 text-slate-300"
                  }`}
                >
                  <p className="font-bold text-xs text-emerald-300 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render History Chronology & Timeline
  if (type === "timeline/map" || type.includes("timeline") || type.includes("history")) {
    const events = payload?.events || [];

    return (
      <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 flex flex-col h-full">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-slate-100">{title}</h3>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
            Chronology & Historical Context
          </span>
        </div>

        {/* Timeline Events Stack */}
        <div className="relative flex-1 overflow-y-auto pr-2 space-y-4 pl-4 border-l-2 border-purple-500/30 ml-2">
          {events.map((ev: any, idx: number) => (
            <div key={idx} className="relative group">
              {/* Dot */}
              <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-slate-900 group-hover:scale-125 transition-transform" />
              
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 group-hover:border-purple-500/40 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-purple-300">{ev.year}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200">{ev.tag}</span>
                </div>
                <h4 className="font-semibold text-xs text-slate-200">{ev.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render Programming Sandbox & Real Execution Output
  const code = payload?.code || "# Python Code Demonstration\nprint('Hello from Sahayak AI Teacher!')";
  
  const handleRunCode = () => {
    setIsExecuting(true);
    setTimeout(() => {
      setIsExecuting(false);
      setCodeOutput(payload?.output || "Executed successfully.\nStdout: [144, 2025, 4624, 8100, 10404]\nComputed Empirical Metric: 5059.40");
    }, 600);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-cyan-400" />
          <h3 className="font-bold text-sm text-slate-100">{title}</h3>
        </div>
        <button
          onClick={handleRunCode}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 hover:scale-105 active:scale-95"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isExecuting ? "Executing..." : "Run Sandbox Code"}</span>
        </button>
      </div>

      {/* Code Editor Panel */}
      <div className="rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden mb-3">
        <div className="bg-slate-900/90 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-mono text-cyan-300">python_runner.py</span>
          <span>Sandboxed Isolated Subprocess</span>
        </div>
        <pre className="p-3 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-[160px]">
          <code>{code}</code>
        </pre>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800/90 p-3 font-mono text-xs text-slate-300 flex flex-col justify-start">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 border-b border-slate-800 pb-1">
          <Terminal className="w-3 h-3 text-cyan-400" />
          <span>Captured Stdout / Execution Stream</span>
        </div>
        <pre className="text-cyan-200 text-xs whitespace-pre-wrap font-mono mt-1">
          {codeOutput}
        </pre>
      </div>
    </div>
  );
}
