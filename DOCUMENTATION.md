# Sahayak AI Teacher — Project Documentation

> An adaptive, document‑grounded AI teacher that **teaches through video, voice, and visuals** — plans a lesson, explains it as a narrated video with diagrams, checks understanding, diagnoses misconceptions, re‑teaches, and produces a personalized learning report. Multilingual (English / Hindi / Hinglish and more), grounded in the learner's own uploaded material via RAG.

**Version:** 1.0.0 · **Stack:** FastAPI + SQLAlchemy (backend) · Next.js 15 / React 19 (frontend) · **License/Use:** hackathon project.

---

## Table of Contents
1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Key Features](#3-key-features)
4. [System Architecture](#4-system-architecture)
5. [AI/ML Models Used](#5-aiml-models-used)
6. [RAG Implementation](#6-rag-implementation)
7. [Prompt / Agent Architecture](#7-prompt--agent-architecture)
8. [Personalization Approach](#8-personalization-approach)
9. [Assessment Methodology](#9-assessment-methodology)
10. [Multilingual Implementation](#10-multilingual-implementation)
11. [Voice Implementation](#11-voice-implementation)
12. [Avatar / Video Generation Approach](#12-avatar--video-generation-approach)
13. [APIs and Third‑Party Services](#13-apis-and-third-party-services)
14. [Setup Instructions](#14-setup-instructions)
15. [Deployment Instructions](#15-deployment-instructions)
16. [Known Limitations](#16-known-limitations)
17. [Hackathon Demo Video Script & Walkthrough (3–7 Minutes)](#17-hackathon-demo-video-script--walkthrough-37-minutes)

---

## 1. Problem Statement

Learners — especially in multilingual, resource‑constrained settings — rarely get a patient one‑on‑one tutor who:

- **teaches from *their* material** (a textbook chapter, lecture PDF, slide deck), not a generic web answer;
- **adapts** to what they already know and where they're confused, instead of a fixed script;
- **explains visually and aloud**, the way a real teacher uses a whiteboard and voice — not a wall of text;
- works in **the learner's language** (English, Hindi, Hinglish, and regional languages), keeping technical terms intact;
- **checks understanding, catches misconceptions, and re‑teaches**, then reports on progress.

Static video courses don't adapt; chatbots don't teach visually or track mastery; most "AI tutors" are ungrounded and hallucinate. The gap is a teacher that is **adaptive, grounded, multimodal, and multilingual** at once.

## 2. Solution Overview

Sahayak AI Teacher is a full‑stack application that turns a topic or an uploaded document into an **interactive, narrated, adaptive video lesson**.

A learner picks a topic (or uploads a PDF/DOCX/PPTX) and states an instruction in natural language ("teach me photosynthesis in Hindi in 15 minutes, simple examples"). The backend:

1. **Understands & plans** — parses the instruction, retrieves the most relevant passages from the document (RAG), and builds a multi‑segment lesson plan grounded in cited source chunks.
2. **Explains & demonstrates** — for each segment it generates a narration script, routes to the best **visual type** (labeled diagram, equation/graph, code+execution, timeline/map), synthesizes **voice**, renders an **MP4 explainer video** (animated slides + charts + subtitles + Ken Burns motion), and can display a **talking‑head avatar** when a paid avatar provider is configured.
3. **Questions & evaluates** — poses checkpoint questions, classifies the answer (correct / partial / **misconception**), and gives targeted feedback.
4. **Adapts** — on a misconception it re‑teaches with a **fresh analogy** and a different visual, then re‑checks.
5. **Assesses & reports** — runs a formal quiz (MCQ + open‑ended, LLM‑graded against a rubric with partial credit) and produces a **learning report** with concept‑level mastery and next steps, feeding a persistent **learner profile** and a **learning‑path DAG**.
6. **Closes the loop** — mastery results and resolved misconceptions feed directly back into future planning:
   $$\text{Upload/Topic} \longrightarrow \text{Planning} \longrightarrow \text{Video Teaching} \longrightarrow \text{Interaction} \longrightarrow \text{Adaptive Reteach} \longrightarrow \text{Assessment} \longrightarrow \text{Learner Profile Update} \longrightarrow \text{Next Lesson}$$

The system is **provider‑resilient**: every AI capability has a graceful fallback, so the app runs end‑to‑end even with no API keys (using deterministic embeddings and local rendering), and upgrades automatically as keys are added.

## 3. Key Features

- **Document‑grounded adaptive lessons (flagship).** Upload PDF/DOCX/PPTX/TXT/MD → ingested, chunked, embedded → lesson plan strictly grounded in cited passages.
- **AI‑generated narrated video.** Real local **ffmpeg** pipeline: progressive‑reveal slides (Pillow), data charts (matplotlib), SRT **subtitles**, Ken Burns `zoompan` motion, `libx264/aac` MP4 — per segment and as a stitched **full‑lesson export**.
- **Interactive teaching loop.** A 10‑state teacher agent (understand → plan → explain → demonstrate → question → evaluate → adapt → continue → assess → report).
- **Misconception diagnosis + re‑teach.** Answers are classified; misconceptions are named and dispelled with fresh analogies and alternate visuals.
- **Multimodal visuals.** Automatic visual routing to labeled diagrams, equations/graphs, **runnable code demos**, and timelines/maps.
- **Voice in and out.** ElevenLabs / local neural TTS narration; Deepgram speech‑to‑text for spoken answers; browser fallbacks.
- **Multilingual.** First‑class English, Hindi (Devanagari), and Hinglish; additional languages via LLM language instruction.
- **Personalization.** Persistent learner profile with concept‑level mastery, misconception history, and a visual **learning‑path DAG**.
- **Formal assessment.** Mixed MCQ + conceptual + short‑answer quizzes, LLM‑graded with rubric and partial credit, producing a learning report.
- **YouTube enrichment.** LLM‑synthesized search queries → **real, validated, embeddable** YouTube videos (never invented URLs), SQLite‑cached.
- **Study tools.** Flashcards, study notes, homework, exam‑prep plans, analytics, and 4 selectable teacher personalities.
- **Resilient by design.** Provider failover + deterministic fallbacks for LLM, embeddings, voice, and avatar.

## 4. System Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                     FRONTEND — Next.js 15 / React 19                    │
│  Pages: home · login · setup · topic · upload · lesson · assessment ·   │
│         report · profile · dashboard · learning-path                    │
│  Components: TeacherPlayer · AudioReactiveAvatar · VisualRenderer ·      │
│    LearningPathDAG · RelatedVideos · CitationChip · MisconceptionModal…  │
│  Tailwind + DaisyUI · framer-motion · recharts · KaTeX · lucide-react   │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │  fetch  NEXT_PUBLIC_API_BASE_URL (/api)
┌───────────────────────────────▼───────────────────────────────────────┐
│                        BACKEND — FastAPI (main.py)                      │
│  CORS · canonical error handlers · routers mounted at /api AND root     │
│                                                                         │
│  API routers (app/api/*):                                               │
│    ingest · documents · lesson · interact · assess · report ·           │
│    profile · learning_path · study_tools · videos · media · sandbox ·   │
│    health                                                               │
│                                                                         │
│  Orchestration:  app/state_machine/teacher_agent.py  (10-state agent)   │
│                                                                         │
│  Services (app/services/*):                                             │
│    llm  ── Gemini / Groq / Anthropic (REST, failover, JSON+retry, SSE)  │
│    rag  ── Gemini text-embedding-004 + SHA-256 fallback, hybrid search  │
│    ingestion ── pypdf / python-docx / python-pptx, chunk + metadata     │
│    evaluator ── answer classification, misconception, fresh analogy     │
│    assessment ── quiz blueprint, generation, rubric grading             │
│    learner_profile ── mastery map, misconceptions, context injection    │
│    learning_path ── prerequisite DAG                                    │
│    visual_router ── choose diagram/equation/code/timeline               │
│    video ── ffmpeg slides+charts+subtitles+Ken Burns (+ export jobs)    │
│    tts ── ElevenLabs → Piper (local) → Web Speech   │  stt ── Deepgram   │
│    avatar ── D-ID/HeyGen/Synthesia/Tavus/Colossyan/Replicate → canvas   │
│    youtube ── Data API v3 query synth + embeddable validation + cache   │
│    code_sandbox ── subprocess Python execution (timeout)                │
└───────────────────────────────┬───────────────────────────────────────┘
                                 │ SQLAlchemy
┌───────────────────────────────▼───────────────────────────────────────┐
│  DATA:  SQLite (default)  ──  DBMaterial, DBMaterialChunk (+embeddings), │
│    DBLessonSession, DBCheckpointAttempt, DBQuiz, DBQuizAttempt,          │
│    DBLearningReport, DBLearnerProfile, DBLearningPath, DBYouTubeCache,   │
│    DBExportJob                                                          │
│  MEDIA: generated_media/ (MP4/audio)   DOCS: uploaded_docs/             │
│  OPTIONAL: Pinecone (vector), Supabase (object storage)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

**Notes**
- **All external AI calls use raw `httpx` REST** — no vendor SDKs — which keeps the dependency surface small and makes failover explicit.
- Routers are registered **twice** (at `/api/...` and at root `/...`), so both path styles work.
- Tables and media/doc directories are **created automatically on startup** (`init_db()` in the FastAPI lifespan); no migration step is required for SQLite.
- Default persistence is **SQLite + local filesystem**; Pinecone/Supabase are optional and wired through config but are **not** the default retrieval/storage path.

## 5. AI/ML Models Used

| Capability | Model / Engine | Default | Notes |
|---|---|---|---|
| Text generation (primary) | **Google Gemini 2.5 Flash** (`gemini-2.5-flash`) | ✅ | `generateContent` + streaming `streamGenerateContent` (SSE) |
| Text generation (failover 1) | **Groq `llama-3.3-70b-versatile`** | ✅ | OpenAI‑compatible chat completions |
| Text generation (failover 2) | **Anthropic `claude-3-7-sonnet`** | optional | Messages API |
| Text embeddings | **Gemini `text-embedding-004`** (768‑dim) | ✅ | with deterministic **SHA‑256** fallback embedding |
| Text‑to‑speech | **ElevenLabs** (voice `21m00Tcm4TlvDq8ikWAM`) → **Piper** local neural (`en_US-lessac-medium`) → browser Web Speech | ElevenLabs when keyed | Piper is optional (downloaded on demand) |
| Speech‑to‑text | **Deepgram `nova-2`** | optional | browser STT fallback |
| Talking‑head avatar | **D‑ID / HeyGen / Synthesia / Tavus / Colossyan / Replicate / Hedra / HuggingFace** | `free_avatar` | paid; falls back to portrait + canvas avatar |

Provider order for text generation is configurable via `LLM_PROVIDER_ORDER` (default `gemini,groq,anthropic`). If a provider is unconfigured or fails, the next is tried; if all fail, an `LLMUnavailable` error is raised and callers fall back to safe defaults.

## 6. RAG Implementation

**Ingestion** (`app/services/ingestion.py`)
- Accepts `pdf, docx, pptx, txt, doc, ppt, md, markdown`; enforces a max upload size (`MAX_UPLOAD_MB`, default 25 MB), type checks, and non‑empty content.
- Parses text with **pypdf / python‑docx / python‑pptx**, preserving **page / chapter / section** metadata.
- **Chunking:** ~250‑word chunks with **40‑word overlap** (`chunk_text`), discarding trivial fragments.
- Each chunk is embedded and persisted in `DBMaterialChunk` (content + metadata + embedding).

**Embeddings** (`app/services/rag.py`, `EmbeddingService`)
- Primary: **Gemini `text-embedding-004`** (768‑dim) via REST.
- Fallback: a **deterministic SHA‑256 embedding** — token → hashed dimension with log‑decayed positional weight, sign bit, **bigram features**, and **L2 normalization**. It is stable across restarts and lets retrieval work fully offline and reproducibly (unlike Python's salted `hash()`).

**Retrieval & grounding** (`RAGService`)
- **Hybrid ranking:** `score = 0.7 · cosine_similarity + 0.3 · keyword_overlap`, returning top‑k chunks. The keyword term keeps ranking sane even if a query and stored chunk were embedded by different backends.
- `get_grounded_context_and_citations()` returns the assembled context blocks *and* structured **`Citation`** objects (chapter, page, section, snippet, and a bounded confidence = the hybrid score).
- The lesson planner injects the retrieved context and **requires each lesson segment to list the exact cited chunk IDs**, and a grounding guardrail instructs the model to teach only from the source material.

## 7. Prompt / Agent Architecture

**The teacher agent** (`app/state_machine/teacher_agent.py`) is a persistent state machine over `DBLessonSession`, with states:

```
UNDERSTAND → PLAN → EXPLAIN → DEMONSTRATE → QUESTION → EVALUATE → ADAPT → CONTINUE → ASSESS → REPORT
```

Session state (current state, `taught_concepts`, `analogies_used`) is stored in the database so lessons are resumable and the agent never repeats an analogy.

**Key agent operations**
- `parse_student_instruction()` — turns a natural‑language instruction into structured parameters (target chapter, time budget, language, learner level, pedagogical style, "simple examples" flag).
- `plan_from_document()` — the grounded planner. It partitions retrieved chunks across a **time‑budget‑driven** number of segments (≤5 min → 2, ≤25 → 4, else 6), builds per‑segment grounded material summaries, injects personalized learner context (see §8), and asks the LLM for a structured plan following a pedagogical order: *Prerequisite → Core Concept → Intuition → Relatable Example → Knowledge Check → Application*.
- `render_segment()` — produces the narration script, routes the visual (§visuals), synthesizes voice, and renders the segment video.

**Reliable structured output** (`app/services/llm.py`, `generate_json`)
- Injects a strict "output only RFC8259 JSON" instruction plus an optional schema hint.
- Strips markdown fences and isolates the outermost `{...}`/`[...]`.
- On a JSON parse failure, **retries once** at lower temperature, feeding the malformed output back with a correction instruction; raises `LLMUnavailable` only if the retry also fails.

**Streaming** — `stream_response()` yields token deltas via Gemini SSE or Groq streaming for a "teacher typing live" feel, with a single‑shot fallback.

**Study personas** (`app/services/study_tools.py`) — four selectable teacher personalities (Socratic Guide, Friendly Mentor, Strict Exam Coach, Visual Architect) that shift tone, question frequency, and explanation style.

## 8. Personalization Approach

Personalization is driven by a persistent **learner profile** (`app/services/learner_profile.py`, `DBLearnerProfile`):

- **Concept‑level mastery map** (`mastery_json`): per concept, a mastery state (e.g., *developing / misunderstood / mastered*) plus a list of identified **misconceptions**.
- **Score history** (`history_json`) across sessions.
- `get_full_learner_profile()` aggregates mastery, active curriculum paths, history, and recommended next actions.
- `get_relevant_learner_context()` produces **pedagogical instructions** and a list of **misconceptions to dispel**, which are injected directly into the lesson‑planning prompt so new lessons pre‑empt the learner's known weak points.
- `update_profile_from_assessment()` writes back mastery and misconceptions after each quiz/checkpoint.
- A **learning‑path DAG** (`app/services/learning_path.py`, `DBLearningPath`, rendered by `LearningPathDAG.tsx`) sequences prerequisites and visualizes progress.

The planner also adapts to explicit parameters (level, preferred style, time budget, language, "simple examples first") parsed from the learner's instruction.

## 9. Assessment Methodology

Two complementary layers:

**A. In‑lesson checkpoints** (`app/services/evaluator.py`)
- After a segment, the agent poses a checkpoint question and calls `evaluate_student_answer()`.
- The answer is classified as **`correct` / `partially_correct` / `misconception` / `no_understanding`**, with: encouraging feedback, a precise **`misconception_name`**, a **`why_wrong`** explanation, and — for the ADAPT loop — a **fresh analogy**, a new concrete example, and a follow‑up question.
- Analogies and visual types are deliberately varied (`get_fresh_analogy`, `_get_distinct_visual_type`) so re‑teaching never repeats itself.

**B. Formal quizzes** (`app/services/assessment.py`)
- `create_assessment_blueprint()` sets difficulty from the learner level.
- `generate_quiz_for_session()` generates a **mixed quiz**: MCQ + conceptual + short‑answer, each with **rubric criteria**, expected concepts, and hints.
- `grade_quiz_submission()` grades per item: **MCQs deterministically**; **open‑ended answers via the LLM against the rubric**, awarding **partial credit** (1.0 / 0.5–0.75 / 0.0) and **diagnosing misconceptions**.
- Results roll up into a **learning report** (`DBLearningReport`) and update the learner profile.

## 10. Multilingual Implementation

- Supported languages (`SUPPORTED_LANGUAGES`, default): **`en, hi, hinglish, ta, te, bn, es`** (English, Hindi, Hinglish, Tamil, Telugu, Bengali, Spanish).
- **First‑class handling** for English, **Hindi**, and **Hinglish**: the planner adds tailored language clauses — e.g., *"Explain in natural Hindi in Devanagari script while keeping domain technical terms in English"* and a conversational Hinglish variant. This keeps technical vocabulary intact while making explanations natural.
- Other languages are supported by passing the language instruction to the LLM (less specialized than the three above).
- Language can be chosen up front or switched mid‑lesson (`/lesson/language-switch`), and voice narration follows the lesson language where the TTS engine supports it.

## 11. Voice Implementation

**Output (TTS)** — `app/services/tts.py`, a three‑tier cascade:
1. **ElevenLabs** cloud TTS (primary when `ELEVENLABS_API_KEY` is set; default voice `21m00Tcm4TlvDq8ikWAM`).
2. **Piper** local neural voice (`en_US-lessac-medium`, downloaded on demand from HuggingFace) — optional, self‑hosted, no per‑call cost. *(Requires the `piper-tts` package, which is not in `requirements.txt` by default; the tier is skipped if unavailable.)*
3. **Browser Web Speech API** metadata fallback on the frontend, so narration still plays with no keys and no local model.

Generated audio is saved under the media directory and referenced by the segment/video pipeline.

**Input (STT)** — `app/services/stt.py`: **Deepgram `nova-2`** (`/v1/listen?smart_format=true`) transcribes spoken answers, with a browser STT fallback. This lets learners answer checkpoint questions by voice.

## 12. Avatar / Video Generation Approach

There are two distinct layers; understanding the split matters:

**1. Narrated explainer video (always available, the default).** `app/services/video.py` is a real, local **ffmpeg** pipeline:
- 2–4 progressive‑reveal **1280×720 scene slides** rendered with **Pillow**;
- **matplotlib** data charts where the visual type calls for it;
- **SRT subtitles** burned in;
- **Ken Burns** motion via `zoompan`, scenes concatenated with a single `filter_complex`;
- encoded `libx264` + `aac`, `+faststart` for web streaming.
- A static **teacher portrait** (`avatar.py`) can anchor the frame, and the frontend adds an **audio‑reactive canvas avatar** (`AudioReactiveAvatar.tsx`) that animates to the narration.
- `export_full_lesson_video()` stitches all segments into one downloadable MP4, tracked as a background **export job** (`DBExportJob`) with progress.
- **Requires `ffmpeg` on `PATH`.** If absent, video endpoints return `{"status": "unavailable", "video_url": null}` and the rest of the app is unaffected.

**2. Talking‑head avatar (optional, paid).** `app/services/avatar.py` implements a provider cascade — **D‑ID, HeyGen, Synthesia, Tavus, Colossyan, Replicate** (plus Hedra/HuggingFace hooks). Each branch activates only when its API key is present **and** `AVATAR_PROVIDER` selects it. Without a paid key, the system uses the portrait + canvas avatar over the ffmpeg video rather than a lip‑synced talking head.

> Design note: for a teacher that *reads a specific script*, talking‑head APIs (or the local slide pipeline) are the right tool. Generative text‑to‑video models are intentionally **not** used to "act out" lessons, to avoid ungrounded/hallucinated visuals.

## 13. APIs and Third‑Party Services

All calls are made over REST with `httpx` (no vendor SDKs).

**Core AI**
- **Google Gemini** — `generateContent`, `streamGenerateContent` (SSE), `text-embedding-004`.
- **Groq** — OpenAI‑compatible chat completions (`llama-3.3-70b-versatile`).
- **Anthropic** — Messages API (`claude-3-7-sonnet`).

**Voice**
- **ElevenLabs** — text‑to‑speech.
- **Piper** — local neural TTS (models from HuggingFace).
- **Deepgram** — speech‑to‑text (`nova-2`).

**Media / Enrichment**
- **YouTube Data API v3** — `search.list` + `videos.list` (embeddable validation); the LLM only synthesizes queries and re‑ranks, never invents URLs; results cached in SQLite.
- **Avatar providers** — D‑ID, HeyGen, Synthesia, Tavus, Colossyan, Replicate, Hedra, HuggingFace (all optional/paid).

**Infrastructure (optional)**
- **Pinecone** — managed vector index (optional; default retrieval is in‑process over SQLite).
- **Supabase** — object storage for media (optional; default is local filesystem).

**Local tooling**
- **ffmpeg** (libx264/aac) for video; **matplotlib/Pillow/numpy** for visuals.

## 14. Setup Instructions

**Prerequisites**
- Python **3.9+**, Node.js **18+** (for Next.js 15).
- **ffmpeg** on `PATH` (required only for MP4 video): `brew install ffmpeg` (macOS) / `sudo apt-get install -y ffmpeg` (Debian/Ubuntu).

**1) Backend**
```bash
cd backend
python3 -m venv ../venv
source ../venv/bin/activate         # Windows: ..\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then fill in the keys you have (all optional)
uvicorn main:app --reload --port 8000
```
The API is served at `http://localhost:8000` (also `http://localhost:8000/api`). Interactive docs at `http://localhost:8000/docs`. On startup a **provider diagnostic banner** prints which providers are active vs. running on fallback.

> The app runs with **zero API keys** — LLM calls degrade to safe defaults, embeddings use the deterministic SHA‑256 fallback, TTS uses the browser voice, and the avatar uses the canvas fallback. Add keys to `.env` to unlock full quality.

**2) Frontend**
```bash
cd frontend
npm install
# point the UI at the backend (default shown):
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api' > .env.local
npm run dev                          # http://localhost:3000
```

**3) Environment variables (backend `.env`)** — all optional; add what you have:

| Variable | Purpose | Default |
|---|---|---|
| `GEMINI_API_KEY` | Gemini text + embeddings | — |
| `GEMINI_MODEL` | Gemini model id | `gemini-2.5-flash` |
| `GROQ_API_KEY` / `GROQ_MODEL` | Groq failover | `llama-3.3-70b-versatile` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Anthropic failover | `claude-3-7-sonnet-20250219` |
| `LLM_PROVIDER_ORDER` | Failover order | `gemini,groq,anthropic` |
| `EMBEDDING_PROVIDER` | `gemini` or `deterministic` | `gemini` |
| `ELEVENLABS_API_KEY` / `ELEVENLABS_DEFAULT_VOICE_ID` | TTS | — / `21m00Tcm4TlvDq8ikWAM` |
| `DEEPGRAM_API_KEY` / `DEEPGRAM_MODEL` | STT | — / `nova-2` |
| `AVATAR_PROVIDER` + provider key (`DID_API_KEY`, `HEYGEN_API_KEY`, …) | Talking‑head avatar | `free_avatar` |
| `YOUTUBE_API_KEY` / `YOUTUBE_MAX_RESULTS` | Related videos | — / `3` |
| `DATABASE_URL` | DB connection | local SQLite |
| `MEDIA_DIR` / `DOC_STORAGE_DIR` | Storage dirs | `generated_media` / `uploaded_docs` |
| `SUPPORTED_LANGUAGES` / `DEFAULT_LANGUAGE` | Languages | `en,hi,hinglish,ta,te,bn,es` / `en` |
| `MAX_UPLOAD_MB` | Upload limit | `25` |
| `PINECONE_API_KEY` / `SUPABASE_*` | Optional vector/storage | — |

**4) Tests**
```bash
cd backend
../venv/bin/python -m pytest -q
# expected: 65 passed, 2 skipped (the 2 skips require live GEMINI_API_KEY / YOUTUBE_API_KEY)
```

## 15. Deployment Instructions

**Option A — Docker (recommended; bundles ffmpeg + fonts)**

A `backend/Dockerfile`, a matching `backend/pyproject.toml` (dependency manifest), and a `backend/.dockerignore` are provided. The image is Python 3.9‑slim with **ffmpeg + libx264 + DejaVu fonts**, installs dependencies from `pyproject.toml`, starts with `uvicorn main:app`, and includes a `/health` container healthcheck.

```bash
# build context is the backend/ directory (run from the repo root):
docker build -t sahayak-backend backend/

docker run -p 8000:8000 --env-file backend/.env \
  -v "$PWD/backend/data:/app/data" \
  sahayak-backend
```
A single `/app/data` volume persists the SQLite database, uploaded documents, and generated media across restarts — the container sets `DATABASE_URL=sqlite:////app/data/sahayak.db`, `MEDIA_DIR=data/media`, and `DOC_STORAGE_DIR=data/docs`. `.dockerignore` keeps `.env`, local databases, and generated content out of the image.

**Frontend**
```bash
cd frontend
npm run build && npm run start      # or deploy to Vercel / a Node host
```
Set `NEXT_PUBLIC_API_BASE_URL` to the public backend URL and add that origin to the backend CORS allow‑list.

**Production notes**
- Set the AI keys you want active; the startup banner confirms what's live.
- For scale, move from SQLite → Postgres (via `DATABASE_URL`) and consider Pinecone + Supabase for vectors/media.
- Serve behind HTTPS; put the backend behind an auth layer before exposing publicly (see §16).

## 16. Known Limitations

- **ffmpeg dependency for video.** Without ffmpeg on `PATH`, video endpoints return `status: "unavailable"`. Everything else works. Use Docker or install ffmpeg locally.
- **Talking‑head avatar requires a paid provider key.** The default experience is a narrated slide video with a portrait + audio‑reactive canvas avatar, not lip‑synced video.
- **Local TTS tier is optional.** Piper only activates if the `piper-tts` package is installed; otherwise the cascade is ElevenLabs → browser Web Speech.
- **Embedding‑space consistency.** Retrieval mixes Gemini embeddings and the SHA‑256 fallback only sensibly when used consistently; if stored vectors and a query vector come from different backends, cosine degrades and ranking leans on the keyword‑overlap term. Keep `EMBEDDING_PROVIDER` consistent for a given corpus.
- **Groq completion cap.** The Groq calls use a fixed `max_tokens`; on failover, a large multi‑segment lesson‑plan JSON can be truncated. *(A reliability patch raising this to 4096 is recommended if not already applied.)*
- **Documents API error detail.** The `documents` endpoints currently include raw exception text in 500 responses; they should log server‑side and return a sanitized message (a fix is recommended; the global handler already sanitizes uncaught errors).
- **Code sandbox is not a hardened jail.** `code_sandbox.py` runs Python in a subprocess with a timeout — adequate for teaching demos, **not** a security boundary for untrusted code. Do not expose it to arbitrary public input without OS‑level isolation.
- **Single‑node persistence by default.** SQLite + local filesystem is fine for a demo/single instance; use Postgres + object storage for concurrency/scale.
- **No server‑side authentication.** The login page is a client‑side gate; API endpoints are open. Add auth (and rate limiting) before public deployment.
- **Regional‑language depth varies.** English/Hindi/Hinglish are tuned with dedicated prompt clauses; Tamil/Telugu/Bengali/Spanish rely on generic LLM language instruction and are less specialized.
- **API costs & quotas.** Cloud providers (Gemini, ElevenLabs, Deepgram, YouTube, avatar vendors) have rate limits and costs; the YouTube cache and provider fallbacks mitigate but don't eliminate this.

---

## 17. Hackathon Demo Video Script & Walkthrough (3–7 Minutes)

> **Format:** Split-column script with exact timing, on-screen actions, and word-for-word spoken narration.
> **Total Length:** ~5 minutes (within the 3–7 minute requirement).

### Timing Breakdown

| Segment | Timing | Topic | Key Deliverable Shown |
|---|---|---|---|
| **1. Hook & Problem** | `0:00 – 0:45` | The flaw with AI chatbots in education | Home Page / Mission statement |
| **2. Document Ingestion & RAG** | `0:45 – 1:30` | Uploading material & planning | Upload flow, chunking, citation generation |
| **3. Theater-Mode Lesson & Video** | `1:30 – 2:30` | Multimodal teaching experience | 16:9 stage, audio narration, subtitles, visual router |
| **4. Checkpoint & The Adaptive Loop** | `2:30 – 3:30` | Catching misconceptions & re-teaching | Voice/text answer, misconception diagnosis, fresh analogy |
| **5. Multilingual & Study Tools** | `3:30 – 4:15` | Mid-lesson Hindi switch & study tools | Mid-lesson language toggle, flashcards/quiz |
| **6. Learning Report & Closing** | `4:15 – 5:00` | Profile DAG & Architectural resilience | Learning Path DAG, summary, call to action |

---

### Scene-by-Scene Script

#### Scene 1: The Problem & The Vision (0:00 – 0:45)
* **What to Show on Screen:**
  - Start on the Sahayak Landing Page (`http://localhost:3000`).
  - Scroll smoothly down past the hero banner showing the tagline: *"An adaptive, document-grounded AI teacher that teaches through video, voice, and visuals."*
  - Briefly contrast with standard AI chatbots dumping walls of text.
* **What to Say (Narration):**
  > "Most AI education tools today are just thin wrappers around a chatbot. They dump walls of text into a chat box. But real teaching isn't text retrieval. A real human educator diagnoses what a student knows, plans a progression, explains out loud, draws on a board, pauses to check understanding, catches misconceptions, and reteaches with fresh analogies. Welcome to Sahayak AI Teacher — an end-to-end autonomous educator driven by an explicit 10-state cognitive engine that teaches through video, voice, and adaptive visuals, grounded directly in your textbooks."

#### Scene 2: Grounded Ingestion & Personalized Planning (0:45 – 1:30)
* **What to Show on Screen:**
  - Click **"Start Learning"** or navigate to `/upload`.
  - Drag and drop a sample PDF (e.g., `photosynthesis_chapter.pdf`).
  - Enter the prompt: *"Teach me this chapter in 15 minutes, focus on intuitive examples."*
  - Show the ingestion pipeline: parsing pages, 250-word chunking, 768-dim embeddings, and hybrid retrieval.
  - Show the generated structured syllabus with segment breakdown and citation chips (`[Ch. 3, Page 12]`).
* **What to Say (Narration):**
  > "Let's upload a textbook chapter. Instead of hallucinating general knowledge, Sahayak's ingestion pipeline extracts text, retains chapter and page metadata, and embeds passages into 768-dimensional vectors. Our hybrid retrieval engine combines cosine similarity with lexical keyword overlap to ensure zero source degradation. Based on our time budget and learner profile, the Teacher Agent plans a structured, multi-segment lesson with verified source citations, ensuring strict academic grounding."

#### Scene 3: Multimodal Theater-Mode Player (1:30 – 2:30)
* **What to Show on Screen:**
  - Enter the **Theater Mode Player** (`/lesson/...`).
  - Show the 16:9 stage: dynamic slide with Ken Burns motion, rendered charts/diagrams, burned-in subtitles, and the audio-reactive canvas avatar pulsing to speech.
  - Hover over a **Citation Chip** to reveal the source snippet and confidence score modal.
* **What to Say (Narration):**
  > "Here is our Theater Player. Notice that this is not a static text screen or a generic avatar reading a script. Sahayak synthesizes a synchronized video locally using ffmpeg, Pillow, and neural TTS. It dynamically renders subject-specific visuals: mathematical equations via KaTeX, data plots with Recharts, interactive Python sandboxes for programming, or diagrams for biology. In the corner, our audio-reactive avatar syncs in real time to the voice narration, while students can inspect verbatim citations at any moment."

#### Scene 4: Checkpoint & Adaptive Re-teaching (2:30 – 3:30)
* **What to Show on Screen:**
  - Segment 1 concludes; the player enters the **QUESTION** state.
  - Checkpoint question appears: *"Why do plants appear green?"*
  - Click the **Microphone** icon (Deepgram STT) or type a deliberate common misconception: *"Because chlorophyll absorbs green light."*
  - Submit answer and show the **Misconception Modal**:
    - Status: `Misconception Detected`
    - Diagnosis: *"Confusing absorption with reflection."*
    - Transition to **ADAPT** state with a brand new analogy and alternate visual representation.
* **What to Say (Narration):**
  > "This is where Sahayak truly mirrors a master teacher: the closed adaptive loop. After each segment, the agent pauses with a checkpoint question. I'll provide a very common student misconception: 'Plants are green because they absorb green light.' Watch the Evaluator in action: instead of a generic 'Wrong, try again', it semantically diagnoses the exact cognitive error: confusing absorption with reflection. Instantly, the agent branches into the ADAPT state. It injects an adaptive reteach segment with a fresh analogy and alternate visual so the student actually builds intuition."

#### Scene 5: Multilingual Switch & Study Tools (3:30 – 4:15)
* **What to Show on Screen:**
  - In player controls, toggle language from **English** to **Hindi** (or Hinglish).
  - Show player immediately updating: narration voice switches to natural Hindi/Hinglish, Devanagari subtitles appear, technical terms remain clear in English.
  - Briefly show the **Study Tools** tab: flashcards, notes, and quiz.
* **What to Say (Narration):**
  > "India has hundreds of millions of learners whose primary learning language is not English. Sahayak natively supports mid-lesson multilingual switching between English, Hindi, and Hinglish. When we toggle to Hindi, the agent preserves core technical terminology while re-synthesizing natural conversational explanations and Devanagari subtitles. Alongside video lessons, Sahayak automatically creates interactive study tools: flashcards, downloadable summaries, and rubric-graded quizzes."

#### Scene 6: Assessment, Learner Profile DAG & Architecture (4:15 – 5:00)
* **What to Show on Screen:**
  - Navigate to **Learning Path Dashboard** (`/learning-path` and `/report`).
  - Show the **Prerequisite DAG**: nodes showing *Mastered*, *Developing*, and *Misconceptions Remedied*.
  - Show the backend architecture resilience: multi-LLM failover (Gemini → Groq → Anthropic) and offline fallbacks.
  - Conclude on the Sahayak title card.
* **What to Say (Narration):**
  > "Finally, the session concludes with a formal rubric-graded assessment. The results feed straight back into the student's persistent Learner Profile DAG. The misconceptions we resolved today are recorded so future lessons never repeat past confusion. Architecturally, Sahayak is built with full provider resilience: multi-LLM failover across Gemini, Groq, and Anthropic, with zero-cost offline fallbacks for embeddings and local ffmpeg video rendering. Sahayak AI Teacher transforms passive video watching into active, personalized, human-like mastery. Thank you!"

---

*This document describes the system as implemented in the repository (backend FastAPI services + Next.js frontend). Where a capability depends on an external key or binary, the default fallback behavior is stated explicitly.*
