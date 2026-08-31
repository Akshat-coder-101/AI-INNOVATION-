import Link from "next/link";
import { BrainCircuit, Heart, Sparkles, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/80 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">Sahayak AI Teacher</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              AI Innovation Hackathon 2026 Submission. An intelligent teacher agent state machine executing pedagogical cycles: understand, plan, explain, demonstrate, question, evaluate, and adaptively reteach.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Pedagogical Flow</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link href="/upload" className="hover:text-brand-300">Document RAG Ingestion</Link></li>
              <li><Link href="/topic" className="hover:text-brand-300">Topic-Based Curriculum</Link></li>
              <li><Link href="/setup" className="hover:text-brand-300">Learner Profile Setup</Link></li>
              <li><Link href="/learning-path/quantum-computing" className="hover:text-brand-300">Curriculum DAG</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">Evaluation Rubric</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Misconception Loop (20%)</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Teacher FSM (15%)</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Grounded RAG (15%)</li>
              <li className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> Multilingual Support (10%)</li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Sahayak AI Teacher · Built for AI Innovation Hackathon</p>
          <div className="flex items-center gap-2">
            <span>Powered by Next.js 15, FastAPI & Claude/GPT</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
