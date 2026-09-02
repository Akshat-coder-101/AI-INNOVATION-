# Sahayak AI Teacher 🎓
### AI Innovation Hackathon 2026 · Adaptive AI Educator Platform

> **"A True Adaptive AI Teacher, Not Just a Chatbot."**

Sahayak AI Teacher is an end-to-end intelligent teaching platform that turns uploaded materials or open topic requests into personalized, interactive, audio/video-delivered lessons driven by an explicit **Teacher Agent State Machine** (`understand` → `plan` → `explain` → `demonstrate` → `question` → `evaluate` → `adapt` → `assess` → `report`).

---

## 🌟 Key Features & AI Capabilities

1. **Genuinely AI-Driven Teaching Engine & Live Streaming:**
   - **Multi-Provider LLM Router:** Configurable fallback pipeline (`gemini-2.5-flash`, `llama-3.3-70b-versatile` on Groq, `claude-3-7-sonnet` on Anthropic) via `LLMService.generate_json` with retry and validation.
   - **Server-Sent Events (SSE) Token Streaming:** Real-time token streaming (`POST /api/lesson/segment/{id}/stream`) for live oral explanations.
   - **Live Health Diagnostics:** `GET /health/llm` verifies configured LLM providers, 768-dim embeddings, and media directory writability in real time with 0 key exposure.
   - **Dynamic Lesson Planning:** Varies segments, depth, and pedagogical approach based on time budget (5m/20m/60m), learner level (beginner/intermediate/advanced), style, and language.
   - **AI Misconception Evaluator:** Semantic analysis of student answers with precise cognitive fault diagnosis, fresh analogy generation, and demo mode triggers.

2. **Real Local Video Generation & Presenter Composite (FFmpeg + Pillow):**
   - Renders genuine **1280x720 H.264 MP4 videos** using local FFmpeg and Matplotlib/Pillow slide composition.
   - Synced TTS audio tracks, burned-in subtitles (`.srt`), and corner presenter avatar overlay.
   - Free HuggingFace SDXL (`stable-diffusion-xl-base-1.0`) teacher portrait generation with disk caching.

3. **Multimodal Media, Speech & Real-Time Voice Q&A Loop:**
   - **Barge-In Voice Q&A:** Voice answering with instant audio barge-in, Deepgram Nova-2 transcription, and synthesized spoken feedback (`audio_url`).
   - **Neural TTS:** ElevenLabs multilingual voice generation saved and served locally via static `/media` routes.
   - **Avatar Presenter:** Support for HuggingFace SDXL, Colossyan, D-ID, HeyGen, or dynamic interactive canvas presenter.

4. **Real Vector RAG & Deterministic Embeddings:**
   - 768-dimensional vector embeddings via Google Gemini `text-embedding-004` (with deterministic SHA-256 fallback for 100% stable offline restarts).
   - Unclamped true cosine similarity scoring with verbatim source citations.

5. **Rich Subject-Aware Visuals & Sandboxing:**
   - 📈 **Math & Physics:** Real KaTeX LaTeX formula rendering + dynamic Recharts coordinate plots handling positive and negative values.
   - 🧬 **Biology & Life Sciences:** Interactive SVG diagrams with structural component hotspots.
   - 📜 **History & Chronology:** Chronological milestone timelines with era tags.
   - 💻 **Computer Science:** Real sandboxed Python 3 execution engine with captured stdout/stderr.

6. **Multilingual (English, Hindi, Hinglish):**
   - Native Hindi and Hinglish script and voice support with mid-lesson in-flight language switching.

---

## 🚀 Quick Start

### 1. Backend (FastAPI + Python 3.9+)
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend (Next.js 15 + React 19)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the comprehensive pytest suite covering all endpoints, LLM JSON generation, time-budget variation, misconception evaluations, quiz grading, and sandboxed Python code execution:
```bash
cd backend
pytest tests/test_all_endpoints.py -v
```

---

## 📁 Repository Structure

```
AI-INNOVATION-/
├── backend/
│   ├── app/
│   │   ├── api/             # REST routes (lesson, interact, assess, report, profile, learning_path, media, sandbox, ingest)
│   │   ├── state_machine/   # Teacher Agent FSM & structured planner
│   │   ├── services/        # LLM, RAG & Embeddings, Evaluator, Assessment, TTS, STT, Avatar, Code Sandbox, Visual Router
│   │   ├── models/          # Pydantic schemas & SQLAlchemy DB models
│   │   ├── config.py        # Settings & environment variable configuration
│   │   └── database.py      # SQLite database & session management
│   ├── tests/               # Pytest integration & unit test suite
│   ├── generated_media/     # Static storage for synthesized MP3 audio
│   └── main.py              # FastAPI application entrypoint & static mount
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js 15 App Router pages (/, /topic, /setup, /lesson, /assessment, /report, /learning-path, /profile, /dashboard, /upload)
│   │   ├── components/      # TeacherPlayer, VisualRenderer (KaTeX + Recharts), MisconceptionModal, CitationChip, DemoModeToggle
│   │   └── lib/             # Typed API client SDK
│   ├── package.json         # React 19, KaTeX, Recharts, Tailwind CSS
│   └── tailwind.config.ts   # Design tokens & themes
└── docs/                    # Complete hackathon architecture & documentation dossier
```
