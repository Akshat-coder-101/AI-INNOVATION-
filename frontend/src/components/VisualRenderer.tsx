"use client";

import { useState } from "react";
import { VisualSpec, api } from "@/lib/api";
import { 
  Play, 
  Terminal, 
  Layers, 
  TrendingUp, 
  Calendar, 
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from "recharts";
import katex from "katex";

interface VisualRendererProps {
  visualSpec: VisualSpec;
}

function KaTeXMath({ formula, inline = true }: { formula: string; inline?: boolean }) {
  try {
    const cleanFormula = formula.replace(/^\$+|\$+$/g, "").trim();
    const html = katex.renderToString(cleanFormula, {
      throwOnError: false,
      displayMode: !inline,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span className="font-mono text-xs">{formula}</span>;
  }
}

export default function VisualRenderer({ visualSpec }: VisualRendererProps) {
  const { type, title, payload } = visualSpec;
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [codeOutput, setCodeOutput] = useState<string>(payload?.output || payload?.stdout || "Ready to execute Python script...");
  const [executionSuccess, setExecutionSuccess] = useState<boolean | null>(null);

  // 1. MATH & PHYSICS ROUTER (KaTeX + Real Recharts Coordinate Chart)
  if (type === "equation/graph" || type.includes("math") || type.includes("physics")) {
    const xs = payload?.x_values || [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const ys = payload?.y_values || [16, 9, 4, 1, 0, 1, 4, 9, 16];
    const equations = payload?.equations || ["f(x) = x^2"];
    const steps = payload?.step_by_step || [];

    // Construct valid Recharts data array with true negative & positive values
    const chartData = xs.map((xVal: number, i: number) => ({
      x: xVal,
      y: ys[i] !== undefined ? ys[i] : 0,
    }));

    return (
      <div className="bg-white rounded-lg p-5 border border-border flex flex-col h-full shadow-2xs hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm text-ink-primary">{title}</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-[#E9F1FC] text-primary font-bold border border-blue-200">
            Interactive Visual Model
          </span>
        </div>

        {/* Governing Analytical Formula with KaTeX */}
        <div className="mb-4 p-3 rounded bg-canvas-elevated border border-border">
          <span className="text-[11px] uppercase font-bold text-ink-muted tracking-wider block mb-1.5">
            Governing Analytical Formula (LaTeX Rendered):
          </span>
          <div className="flex flex-wrap gap-2 items-center">
            {equations.map((eq: string, idx: number) => (
              <div 
                key={idx} 
                className="px-3 py-1.5 rounded bg-white text-primary border border-blue-200 shadow-2xs text-sm font-semibold flex items-center"
              >
                <KaTeXMath formula={eq} />
              </div>
            ))}
          </div>
        </div>

        {/* Real Dynamic Recharts Plot Canvas */}
        <div className="relative flex-1 min-h-[220px] rounded bg-white border border-border p-3 flex flex-col justify-center">
          <div className="text-center mb-1">
            <span className="text-xs font-bold text-ink-primary font-mono">{payload?.plot_title || "Dynamic State Trajectory"}</span>
          </div>

          <div className="w-full h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis 
                  dataKey="x" 
                  stroke="#64748B" 
                  fontSize={10} 
                  tickLine={false} 
                  label={{ value: payload?.x_label || "x (Input)", position: "insideBottom", offset: -5, fontSize: 10, fill: "#64748B" }}
                />
                <YAxis 
                  stroke="#64748B" 
                  fontSize={10} 
                  tickLine={false}
                  label={{ value: payload?.y_label || "f(x)", angle: -90, position: "insideLeft", fontSize: 10, fill: "#64748B" }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0F172A", color: "#F8FAFC", borderRadius: "6px", fontSize: "11px", fontWeight: "bold" }}
                  itemStyle={{ color: "#38BDF8" }}
                  formatter={(val: any) => [`${val}`, payload?.y_label || "f(x)"]}
                  labelFormatter={(lbl: any) => `x = ${lbl}`}
                />
                <ReferenceLine y={0} stroke="#94A3B8" strokeWidth={1.5} />
                <ReferenceLine x={0} stroke="#94A3B8" strokeWidth={1.5} />
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke="#0056D2" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: "#0056D2", strokeWidth: 1, stroke: "#FFFFFF" }} 
                  activeDot={{ r: 5, fill: "#F97316" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Step-by-Step Analytical Derivation with KaTeX */}
        {steps.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <span className="text-xs font-bold text-ink-secondary block mb-1.5">Analytical Derivation:</span>
            <ul className="space-y-1.5 text-xs text-ink-secondary">
              {steps.map((st: string, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-primary font-bold mt-0.5">•</span>
                  <span><KaTeXMath formula={st} /></span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // 2. BIOLOGY & LIFE SCIENCES ROUTER
  if (type === "labeled-diagram" || type.includes("bio") || type.includes("diagram")) {
    const labels = payload?.labels || [];

    return (
      <div className="bg-white rounded-lg p-5 border border-border flex flex-col h-full shadow-2xs hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#0F7B3F]" />
            <h3 className="font-bold text-sm text-ink-primary">{title}</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-emerald-50 text-[#0F7B3F] font-bold border border-emerald-200">
            Biology & Life Sciences
          </span>
        </div>

        {/* Interactive SVG Diagram */}
        <div className="relative rounded bg-white border border-border overflow-hidden flex items-center justify-center p-3 min-h-[200px]">
          {payload?.svg_code ? (
            <div 
              className="w-full h-full flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: payload.svg_code }} 
            />
          ) : (
            <div className="text-center p-6 text-ink-muted">
              <Layers className="w-10 h-10 text-[#0F7B3F] mx-auto mb-2 opacity-80" />
              <p className="text-xs font-semibold">Interactive Labeled Structural Model</p>
            </div>
          )}
        </div>

        {/* Interactive Hotspot Pills */}
        {labels.length > 0 && (
          <div className="mt-4">
            <span className="text-xs font-bold text-ink-secondary block mb-2">Structural Components:</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {labels.map((item: any, idx: number) => (
                <div 
                  key={idx}
                  onClick={() => setSelectedHotspot(item)}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-all ${
                    selectedHotspot?.name === item.name
                      ? "bg-emerald-50 border-[#0F7B3F] text-ink-primary shadow-2xs scale-[1.02]"
                      : "bg-white border-border hover:border-emerald-300 text-ink-secondary"
                  }`}
                >
                  <p className="font-bold text-xs text-[#0F7B3F] flex items-center gap-1 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#0F7B3F]"></span>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-ink-muted mt-1 line-clamp-2">{item.role}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. CHRONOLOGY & HISTORY ROUTER
  if (type === "timeline/map" || type.includes("timeline") || type.includes("history")) {
    const events = payload?.events || [];

    return (
      <div className="bg-white rounded-lg p-5 border border-border flex flex-col h-full shadow-2xs hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#B75F00]" />
            <h3 className="font-bold text-sm text-ink-primary">{title}</h3>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded bg-amber-50 text-[#B75F00] font-bold border border-amber-200">
            Chronology & History
          </span>
        </div>

        {/* Timeline Events Stack */}
        <div className="relative flex-1 overflow-y-auto pr-2 space-y-3 pl-4 border-l-2 border-amber-300 ml-2 max-h-[340px]">
          {events.map((ev: any, idx: number) => (
            <div key={idx} className="relative group">
              <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-[#B75F00] border-2 border-white group-hover:scale-125 transition-transform shadow-2xs" />
              
              <div className="p-3 rounded bg-white border border-border group-hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono font-bold text-[#B75F00]">{ev.year}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-[#B75F00] font-bold border border-amber-200">{ev.tag}</span>
                </div>
                <h4 className="font-bold text-xs text-ink-primary">{ev.title}</h4>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{ev.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. COMPUTER SCIENCE & CODE EXECUTION ROUTER
  const code = payload?.code || "# Python Code Demonstration\nimport math\n\ndef compute_kinetic_energy(mass_kg, velocity_mps):\n    return 0.5 * mass_kg * (velocity_mps ** 2)\n\nprint('Kinetic Energy:', compute_kinetic_energy(1200, 25), 'Joules')";
  
  const handleRunCode = async () => {
    setIsExecuting(true);
    setExecutionSuccess(null);
    try {
      const res = await api.runPythonCode(code);
      setExecutionSuccess(res.success);
      setCodeOutput(res.output || res.stdout || res.stderr || "Process completed with 0 outputs.");
    } catch (err: any) {
      setExecutionSuccess(false);
      setCodeOutput(`Execution Error: ${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-border flex flex-col h-full shadow-2xs hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-sm text-ink-primary">{title}</h3>
        </div>
        <button
          onClick={handleRunCode}
          disabled={isExecuting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-primary hover:bg-primary-hover text-white font-mono font-bold text-xs transition-all shadow-2xs hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          {isExecuting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isExecuting ? "Running Sandbox..." : "Run Python"}</span>
        </button>
      </div>

      {/* Code Editor Panel */}
      <div className="rounded bg-canvas-elevated border border-border overflow-hidden mb-3">
        <div className="bg-white px-3 py-1.5 border-b border-border flex items-center justify-between text-[11px] text-ink-muted font-mono">
          <span className="text-primary font-bold">sandbox_execution.py</span>
          <span>Real Python 3 Subprocess Sandbox</span>
        </div>
        <pre className="p-3 text-xs font-mono text-ink-primary overflow-x-auto leading-relaxed max-h-[160px]">
          <code>{code}</code>
        </pre>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 rounded bg-canvas-elevated border border-border p-3 font-mono text-xs text-ink-secondary flex flex-col justify-start">
        <div className="flex items-center justify-between text-[10px] text-ink-muted mb-1 border-b border-border pb-1 font-bold">
          <div className="flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-primary" />
            <span>Captured Standard Output</span>
          </div>
          {executionSuccess !== null && (
            <span className={`flex items-center gap-1 ${executionSuccess ? "text-emerald-600" : "text-rose-600"}`}>
              {executionSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {executionSuccess ? "Exit Code 0" : "Execution Failed"}
            </span>
          )}
        </div>
        <pre className={`text-xs whitespace-pre-wrap font-mono mt-1 font-bold ${
          executionSuccess === false ? "text-rose-600" : "text-primary"
        }`}>
          {codeOutput}
        </pre>
      </div>
    </div>
  );
}
