"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Clock 
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      // Use built-in sample document for instant demo experience
      setIsUploading(true);
      setTimeout(() => {
        setIsUploading(false);
        setUploadResult({
          material_id: "demo-rag-sample-101",
          filename: "Classical_Mechanics_and_Energy_Conservation.pdf",
          total_pages_or_sections: 4,
          chunks_count: 8,
          chapters: [
            { title: "Chapter 1: Newton's Laws & Inertial Frames", page: 1, preview: "Every body perseveres in its state of rest or uniform motion unless compelled to change..." },
            { title: "Chapter 2: Conservation of Mechanical Energy", page: 2, preview: "The total mechanical energy in an isolated system remains constant over time..." },
            { title: "Chapter 3: Dynamic Equilibrium & Damping", page: 3, preview: "External frictional forces introduce thermodynamic dissipation proportional to velocity..." },
            { title: "Chapter 4: Harmonic Oscillators & Wave Equations", page: 4, preview: "Restoring forces produce periodic harmonic motion characterized by natural frequencies..." }
          ],
          preview: "Comprehensive textbook excerpt covering fundamental principles of classical mechanics, energy conservation, and system dynamics."
        });
      }, 1200);
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.ingestFile(formData);
      setUploadResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to parse and embed document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleProceedToSetup = () => {
    if (uploadResult?.material_id) {
      router.push(`/setup?materialId=${uploadResult.material_id}&filename=${encodeURIComponent(uploadResult.filename)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Knowledge Ingestion Pipeline
        </span>
        <h1 className="text-3xl font-extrabold text-white mt-1">Upload Learning Material</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload PDF, DOCX, PPTX, or TXT notes. Our semantic chunker indexes your material into pgvector with strict source citation tracking.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      {!uploadResult ? (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 hover:border-brand-500/60 rounded-3xl p-10 text-center glass-panel transition-all bg-slate-950/40 cursor-pointer relative"
          >
            <input
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400 flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-slate-100">
                {file ? file.name : "Drag & drop files here, or browse"}
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Supports PDF, DOCX, PPTX, TXT up to 25MB
              </p>

              {file && (
                <div className="mt-4 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB Selected</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isUploading ? "Parsing Chunks & Vectorizing..." : file ? "Ingest & Vectorize Document" : "Ingest Sample Benchmark PDF"}</span>
            </button>

            <span className="text-xs text-slate-500">
              Zero-Hallucination RAG Grounding Enabled
            </span>
          </div>
        </div>
      ) : (
        /* Ingestion Success & Chunk Outline Visualizer */
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="glass-panel rounded-2xl p-6 border border-emerald-500/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-base text-white">Document Successfully Ingested</h3>
                  <p className="text-xs text-slate-400">{uploadResult.filename}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-300">{uploadResult.chunks_count} Semantic Chunks</span>
                <p className="text-[11px] text-slate-500">{uploadResult.total_pages_or_sections} Detected Sections</p>
              </div>
            </div>

            {/* Document Preview Snippet */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 italic leading-relaxed font-mono">
              "{uploadResult.preview}"
            </div>

            {/* Detected Chapters / Sections Outline */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Detected Chapters & Learning Units:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {uploadResult.chapters.map((ch: any, i: number) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/90">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-200">{ch.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                        Page {ch.page}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{ch.preview}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setUploadResult(null)}
              className="px-5 py-2.5 rounded-xl glass-panel border border-slate-800 text-xs text-slate-300 hover:text-white"
            >
              Upload Different File
            </button>

            <button
              onClick={handleProceedToSetup}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>Configure Adaptive Lesson</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
