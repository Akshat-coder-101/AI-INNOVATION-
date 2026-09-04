"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, DocumentUploadResponse } from "@/lib/api";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  FileCheck, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  Clock,
  BookOpen,
  Tag,
  Loader2,
  ShieldCheck
} from "lucide-react";
import { useToast } from "@/context/ToastContext";

const MAX_FILE_SIZE_MB = 25;
const ALLOWED_EXTENSIONS = ["pdf", "docx", "pptx", "txt", "doc", "ppt"];

export default function UploadPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingLesson, setIsGeneratingLesson] = useState(false);
  const [uploadResult, setUploadResult] = useState<DocumentUploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateSelectedFile = (selectedFile: File): boolean => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const msg = `Unsupported file type ".${ext}". Please upload a PDF, DOCX, PPTX, or TXT file.`;
      setError(msg);
      showError(msg);
      return false;
    }
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      const msg = `File exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`;
      setError(msg);
      showError(msg);
      return false;
    }
    if (selectedFile.size === 0) {
      const msg = "Selected file is empty.";
      setError(msg);
      showError(msg);
      return false;
    }
    setError(null);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      if (validateSelectedFile(f)) {
        setFile(f);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const f = e.dataTransfer.files[0];
      if (validateSelectedFile(f)) {
        setFile(f);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a valid document to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const res = await api.uploadDocument(file);
      setUploadResult(res);
      showSuccess(`Successfully ingested "${res.filename}" with ${res.chunk_count} semantic chunks.`);
    } catch (err: any) {
      const msg = err.message || "Failed to parse and vectorize document";
      setError(msg);
      showError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateLesson = async () => {
    if (!uploadResult?.document_id) return;
    setIsGeneratingLesson(true);
    setError(null);
    try {
      const plan = await api.planLessonFromDocument(uploadResult.document_id, {
        time_budget_minutes: 20,
        language: "en"
      });
      showSuccess(`Grounded lesson generated with ${plan.segments.length} progressive segments.`);
      router.push(`/lesson/${plan.session_id}`);
    } catch (err: any) {
      const msg = err.message || "Failed to generate grounded lesson plan";
      setError(msg);
      showError(msg);
      setIsGeneratingLesson(false);
    }
  };

  const handleProceedToSetup = () => {
    if (uploadResult?.document_id) {
      router.push(`/setup?materialId=${uploadResult.document_id}&filename=${encodeURIComponent(uploadResult.filename)}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            RAG Ingestion Pipeline
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-[#0F7B3F] font-mono font-bold border border-emerald-200">
            Zero-Hallucination Grounded
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-black mt-1">Upload Learning Material</h1>
        <p className="text-sm text-ink-secondary mt-1 font-medium">
          Upload PDF, DOCX, PPTX, or TXT notes. Our semantic chunker indexes your material into vector storage with strict chunk-level citations.
        </p>
      </div>

      {/* Drag & Drop Upload Zone */}
      {!uploadResult ? (
        <div className="space-y-6">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-border hover:border-primary rounded-xl p-10 text-center bg-white transition-all cursor-pointer relative shadow-2xs hover:shadow-md"
          >
            <input
              type="file"
              accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />

            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-xl bg-[#E9F1FC] text-primary flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-black">
                {file ? file.name : "Drag & drop files here, or click to browse"}
              </h3>
              <p className="text-xs text-ink-muted mt-1.5 font-medium">
                Supports PDF, DOCX, PPTX, TXT up to 25MB
              </p>

              {file && (
                <div className="mt-4 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#0F7B3F] text-xs font-bold flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[#0F7B3F]" />
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB Selected</span>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-[#C21E1E] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#C21E1E] flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleUpload}
              disabled={isUploading || !file}
              className="w-full sm:w-auto px-7 py-3 rounded bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chunking & Vectorizing Document...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ingest & Vectorize Document</span>
                </>
              )}
            </button>

            <span className="text-xs text-ink-muted font-medium flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Strict Anti-Hallucination Grounding Enforced
            </span>
          </div>
        </div>
      ) : (
        /* Ingestion Success & Document Outline Visualizer */
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg p-6 border border-border space-y-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#0F7B3F]" />
                <div>
                  <h3 className="font-bold text-base text-black">{uploadResult.detected_title}</h3>
                  <p className="text-xs text-ink-muted flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    {uploadResult.filename}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-[#0F7B3F] block">{uploadResult.chunk_count} Semantic Chunks</span>
                <p className="text-[11px] text-ink-muted">{uploadResult.page_count} Pages / Sections</p>
              </div>
            </div>

            {/* Key Topics Detected */}
            {uploadResult.key_topics && uploadResult.key_topics.length > 0 && (
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted block mb-2.5">
                  Detected Core Topics & Learning Units:
                </span>
                <div className="flex flex-wrap gap-2">
                  {uploadResult.key_topics.map((topic, i) => (
                    <div key={i} className="px-3 py-1.5 rounded-lg bg-[#E9F1FC] text-primary text-xs font-semibold flex items-center gap-1.5 border border-primary/20">
                      <Tag className="w-3 h-3 text-primary" />
                      <span>{topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Grounding Notice */}
            <div className="p-3.5 rounded bg-emerald-50/50 border border-emerald-200 text-xs text-ink-secondary flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0F7B3F] mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <strong className="text-[#0F7B3F] font-bold">Grounded Pipeline Ready:</strong> All planned segments, video explanations, interactive checkpoints, and final quizzes will be generated exclusively from this document's verified content with chunk-level citations.
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-xs text-[#C21E1E] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#C21E1E] flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              onClick={() => {
                setUploadResult(null);
                setFile(null);
              }}
              disabled={isGeneratingLesson}
              className="px-5 py-2.5 rounded border border-border bg-white text-xs font-semibold text-ink-secondary hover:text-black hover:bg-canvas-elevated cursor-pointer"
            >
              Upload Different File
            </button>

            <button
              onClick={handleProceedToSetup}
              disabled={isGeneratingLesson}
              className="px-5 py-2.5 rounded border border-border bg-white text-xs font-semibold text-ink-primary hover:bg-canvas-elevated cursor-pointer"
            >
              Custom Setup
            </button>

            <button
              onClick={handleGenerateLesson}
              disabled={isGeneratingLesson}
              className="flex items-center justify-center gap-2 px-7 py-2.5 rounded bg-black hover:bg-neutral-800 text-white font-bold text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isGeneratingLesson ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Grounded Lesson...</span>
                </>
              ) : (
                <>
                  <span>Generate Grounded Lesson</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
