# Sahayak AI Teacher 🎓
### AI Innovation Hackathon 2026 · Adaptive AI Educator Platform

> **"A True Adaptive AI Teacher, Not Just a Chatbot."**

Sahayak AI Teacher is an end-to-end intelligent teaching platform that turns uploaded materials or open topic requests into personalized, interactive, video-delivered lessons driven by an explicit **Teacher Agent State Machine** (`understand` → `plan` → `explain` → `demonstrate` → `question` → `evaluate` → `adapt` → `assess` → `report`).

---

## 🌟 Key Features

1. **Teacher Agent State Machine (FSM):** Explicit, inspectable state machine executing cognitive pedagogical cycles.
2. **Adaptive Misconception Reteach Loop (20% Rubric Item):** Classifies student errors, tracks analogy freshness per session, and injects brand new analogies on reteach with a dedicated Presenter Demo Mode.
3. **Zero-Hallucination Grounded RAG:** Ingests PDF, DOCX, PPTX, and TXT into pgvector with verbatim citation chips under live transcripts.
4. **Subject-Aware Visual Routers:**
   - 📈 **Math & Physics:** LaTeX formulas + dynamic 2D/3D state plots + step-by-step derivations.
   - 🧬 **Biology & Life Sciences:** Interactive high-res SVG diagrams with component hotspots.
   - 📜 **History & Chronology:** Interactive milestone timelines and era categorizations.
   - 💻 **Computer Science:** Sandboxed Python code editor with real execution stdout.
5. **AI Teaching Video & Speech:** Synced talking avatar, multi-voice TTS, and live captioned transcript.
6. **Multilingual (English, Hindi, Hinglish):** Mid-lesson natural language switching preserving state.
7. **Targeted Assessment & Diagnostics:** Concept-grounded quizzes and comprehensive learning reports.
8. **Curriculum DAG & Progress Tracker:** Visual Bloom's taxonomy roadmap with prerequisite completion tracking.

---

## 🚀 Quick Start

### 1. Backend (FastAPI)
```bash
# From workspace root
pip install -r backend/requirements.txt
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (Next.js 15)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

Run all backend unit & integration tests:
```bash
pytest backend/tests/test_all_endpoints.py -v
```

---

## 📁 Repository Structure

```
ai innovation/
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (ingest, lesson, interact, assess, report, profile)
│   │   ├── state_machine/   # Teacher Agent FSM
│   │   ├── services/        # RAG, Ingestion, Evaluator, Visual Router, TTS, Avatar, Sandbox
│   │   ├── models/          # Schemas and DB models
│   │   └── config.py        # Settings & env
│   ├── tests/               # Pytest suite
│   ├── requirements.txt
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── app/             # Multi-page routes (/, /upload, /topic, /setup, /lesson, /assessment, /report, /learning-path, /profile, /dashboard)
│   │   ├── components/      # TeacherPlayer, VisualRenderer, MisconceptionModal, CitationChip, DemoModeToggle
│   │   └── lib/             # API client & helpers
│   ├── package.json
│   └── tailwind.config.ts
└── docs/                    # Hackathon submission documentation
```
