# PRD — "Sahayak AI Teacher"
### AI Innovation Hackathon 2026 · Round 2 · Human-Like AI Educator Platform

Version 1.0 · Prepared for build in Google Antigravity (agent-first IDE)

---

## 1. Product Summary

Sahayak AI Teacher is a web application that turns any uploaded learning material (or a plain topic request) into a personalized, interactive, video-delivered teaching session. It plans a lesson like a human tutor — understand → plan → explain → demonstrate → question → evaluate → adapt → continue — instead of answering isolated questions like a chatbot.

**Primary judged capability:** genuine adaptive teaching behavior, not a scripted avatar reading generated text.

---

## 2. Goals & Non-Goals

**Goals**
- Cover all 12 Mandatory Requirements (§17 of the brief) end-to-end in one working prototype.
- Make the "human-like adaptation" loop visibly demonstrable in the demo video (it's 20% of the score, the single largest line item).
- Support upload-based (RAG-grounded) and topic-based teaching from one unified pipeline.
- Ship an AI teaching video (avatar + voice + on-screen visuals), not just TTS-over-slides.
- Support at least 3 languages (English, Hindi, Hinglish) end-to-end, including mid-lesson switching.

**Non-Goals (v1)**
- Production-grade auth, billing, multi-tenant scaling.
- Perfect avatar lip-sync fidelity — "good enough to demonstrate the concept" per rubric note in §9.
- Full mobile app — responsive web is sufficient for a hackathon demo.

---

## 3. Personas

| Persona | Need |
|---|---|
| Beginner student | Simple language, analogies, frequent check-ins |
| Intermediate student | Technical explanation + practical examples |
| Advanced student | Depth, math/implementation detail, fewer interruptions |
| Judge/evaluator | Needs to *see* the adapt loop trigger live, in ≤7 min |

---

## 4. End-to-End User Journey (maps to brief §2, §20 demo flow)

```
Upload/Topic → Learner Profile → Lesson Plan (AI) → Teaching Video (avatar+voice+visuals)
   → Interactive Q&A (mid-lesson) → Misconception Detection → Adaptive Re-explain
   → Final Assessment/Quiz → Learning Report → Recommended Next Topic → Profile updates
```

---

## 5. Requirement Traceability Matrix

Every row below **must** be demonstrably true in the shipped prototype — this is the acceptance checklist and doubles as the demo-video shot list.

| # | Brief Requirement | Section | Product Feature | Status Gate |
|---|---|---|---|---|
| 1 | Learn from uploaded material | §3 | File ingestion + chunking + RAG index | Mandatory |
| 2 | Topic-based teaching (no upload) | §4 | Topic → outline generator | Mandatory |
| 3 | AI-generated lesson structure | §2, §7 | LessonPlan JSON: objectives, sequence, timing | Mandatory |
| 4 | Personalized teaching (level/goal/style) | §6 | Learner profile form feeds every prompt | Mandatory |
| 5 | Time-based adaptation (5m/20m/60m/7-day) | §7 | Time-budget allocator in planner | Mandatory |
| 6 | Multilingual + mid-lesson switch, cross-language material | §8 | i18n pipeline, language-aware prompts, context carry-over | Mandatory |
| 7 | AI teaching video: avatar + voice + on-screen text + visuals | §9 | Video generation pipeline | Mandatory |
| 8 | Subject-aware visuals (math/physics/bio/history/code) | §10 | Visual-type router (equation/diagram/timeline/code-exec) | Mandatory |
| 9 | Interactive questioning during lesson | §11 | Scripted checkpoints + free-text/MCQ input | Mandatory |
| 10 | Misconception detection + re-explain with new analogy | §12 | Evaluate→branch node in lesson graph | Mandatory |
| 11 | Assessment + learning report (score, strengths, weak areas, recommendation) | §13 | Post-lesson quiz engine + report generator | Mandatory |
| 12 | Learner profile persisted across sessions | §14 | DB-backed profile, used to personalize next session | Mandatory |
| 13 | AI-generated learning path for broad topics | §15 | Path/DAG generator + progress tracker | Advanced (do if time) |
| 14 | Working end-to-end prototype | §17.12 | Deployed demo | Mandatory |

---

## 6. System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 15 App Router, multi-page routing)             │
│  / , /upload , /topic , /setup , /lesson/[id] , /assessment/[id]  │
│  /report/[id] , /profile , /learning-path/[id] , /dashboard        │
└───────────────┬──────────────────────────────────────────────────┘
                │ REST/JSON (typed via zod)
┌───────────────▼──────────────────────────────────────────────────┐
│  BACKEND (FastAPI, Python)                                        │
│  ├─ /ingest        → parse file, chunk, embed, store (RAG)        │
│  ├─ /lesson/plan    → Orchestrator Agent → LessonPlan JSON        │
│  ├─ /lesson/segment → generate script+visual spec per segment     │
│  ├─ /media/tts      → ElevenLabs / Azure Speech                   │
│  ├─ /media/avatar   → D-ID / HeyGen (talking-head video)          │
│  ├─ /media/visual   → routes to: LaTeX/plot, Mermaid, code-exec   │
│  ├─ /interact/answer→ evaluate student response, detect misconcept│
│  ├─ /assess/quiz    → generate + grade quiz                       │
│  ├─ /report         → build learning report                       │
│  └─ /profile        → CRUD learner profile & history              │
└───────────────┬──────────────────────────────────────────────────┘
                │
┌───────────────▼──────────────────────────────────────────────────┐
│  DATA LAYER                                                       │
│  Postgres (Supabase) — users, sessions, lessons, attempts, reports│
│  pgvector — chunk embeddings for RAG                              │
│  Object storage (Supabase Storage/S3) — uploaded docs, generated  │
│  videos, generated images                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Orchestration pattern:** a single LLM-driven "Teacher Agent" state machine per lesson session, not a bag of independent endpoints. State: `understand → plan → explain[i] → question[i] → evaluate[i] → (branch: continue | reteach) → assess → report`. This state machine *is* the human-like-teaching feature and should be the centerpiece of the architecture diagram in documentation, since it's the top-weighted rubric item.

---

## 7. Page / Route Map (multi-page for judge readability & routing clarity)

| Route | Purpose |
|---|---|
| `/` | Landing + "Upload material" vs "Teach me a topic" choice |
| `/upload` | Drag-drop PDF/DOCX/PPTX/notes → shows detected chapters/sections |
| `/topic` | Free-text topic input ("Teach me Newton's Laws for Class 8") |
| `/setup` | Learner profile form: level, goal, style, language, time budget |
| `/lesson/[sessionId]` | Video player + live transcript + inline question prompts + chat |
| `/assessment/[sessionId]` | Post-lesson quiz (MCQ/short-answer/problem) |
| `/report/[sessionId]` | Score, strengths, weak areas, recommendation, "revise" / "next topic" CTA |
| `/learning-path/[topicId]` | Visual DAG of a broad-topic curriculum + progress |
| `/profile` | Learner history: topics studied, scores, weak concepts over time |
| `/dashboard` | (optional/advanced) analytics across sessions |

Each route is a distinct page (not a single-page modal flow) specifically so a judge can navigate the journey non-linearly during evaluation — this also makes independent testing/demo recording easier.

---

## 8. Core Feature Specs

### 8.1 Ingestion & RAG (brief §3)
- Accept PDF, DOCX, PPTX, TXT.
- Parse → chunk (semantic, ~500 tokens, chapter/section aware) → embed → store in pgvector with metadata (chapter, page, source).
- Retrieval is **mandatory** before any explanation or quiz question is generated from uploaded material — prompt must instruct the LLM to answer only from retrieved context and explicitly say "not covered in the material" rather than hallucinate, addressing the brief's "minimize unsupported/hallucinated information" requirement.
- Show citations (chapter/page) under each explanation segment as a hallucination-mitigation UI affordance and evaluator-visible RAG proof.

### 8.2 Lesson Planner (brief §2, §6, §7)
Input: material/topic + learner profile (level, goal, style, language, time, depth) →
Output: `LessonPlan` JSON:
```json
{
  "objectives": ["..."],
  "timeBudgetMinutes": 20,
  "segments": [
    {"id":1, "concept":"...", "depth":"beginner", "estMinutes":4,
     "visualType":"diagram", "checkpointQuestion": {...} }
  ],
  "finalAssessment": {"type":"quiz","questionCount":5}
}
```
- Time-budget allocator: 5 min → top 1–2 concepts only; 20 min → structured lesson w/ examples; 60 min → full lesson + multiple checkpoints + assessment; 7 days → multi-day revision plan (calendar-style, stored as a `LearningPath`).

### 8.3 Video Generation (brief §9, §10)
Per segment:
1. LLM writes spoken script + on-screen text + a `visualSpec` (type + payload).
2. `visualSpec` routes to a renderer:
   - `equation/graph` → matplotlib/Manim or plot.ly → math/physics
   - `labeled-diagram` → SVG/generated diagram → biology
   - `timeline/map` → generated timeline component → history
   - `code+execution` → sandboxed code runner, captures stdout → programming
3. TTS renders the script in the chosen language.
4. Avatar API (D-ID/HeyGen) combines audio + a talking-head avatar.
5. Segment renderer composites avatar video + on-screen visual + captions into one clip (ffmpeg) and concatenates segments into the lesson video, OR the frontend plays avatar-video + visual side-by-side synced by timestamp (cheaper, faster to build — recommended for hackathon timeline).
- This directly answers the brief's explicit warning: *"simply placing a talking avatar in front of generated text will not be considered sufficient."*

### 8.4 Interactivity, Misconception Detection, Adaptation (brief §11, §12)
- At each `checkpointQuestion`, pause the video, show question (MCQ / short-answer / "explain in your own words" / problem-solving).
- Student answer → Evaluator Agent classifies: `correct | partially_correct | misconception(type) | no_understanding`.
- On misconception: (1) name the misconception, (2) re-explain with a **different analogy** than the first pass, (3) offer a new example, (4) re-ask a variant question, (5) only advance once re-evaluation passes or student opts to move on.
- This branch must be visibly triggerable in the demo (e.g., seed a wrong-answer scenario) — treat it as the single most important scripted demo moment given it's the top-weighted rubric criterion.

### 8.5 Assessment & Report (brief §13)
- End-of-lesson quiz generated from actual taught segments (not generic).
- Report: score %, concepts understood, weak areas, incorrect concepts, recommended revision, suggested next topic — rendered on `/report/[sessionId]` and stored to profile.

### 8.6 Learner Profile & Learning Path (brief §14, §15)
- Persist: topics studied, scores, weak/strong concepts, history, current path.
- Use profile to auto-adjust difficulty on the *next* session for the same topic.
- For broad topics, generate an ordered curriculum DAG (e.g., ML: Python → Math → Data → Supervised → Unsupervised → Eval → NN → Advanced) and track completion per node.

### 8.7 Multilingual (brief §8)
- Language selectable at `/setup` and via natural-language mid-lesson request ("Ab Hindi mein samjhao").
- Teacher Agent must detect the language-switch intent, regenerate current segment in the new language, and preserve lesson state/progress — do not restart the lesson.
- Support cross-language material (English PDF → Hindi teaching) by keeping retrieval language-agnostic (embed in source language, generate answer in target language).

---

## 9. Non-Functional Requirements
- Response latency: lesson-plan generation < 15s; each video segment < 60s (parallelize TTS+visual+avatar render where possible).
- Hallucination guardrail: RAG answers must cite source chunk; if retrieval confidence is low, say so rather than invent facts.
- All third-party API keys via `.env`, never hardcoded (see §12).
- Graceful degradation: if avatar API quota fails, fall back to TTS-audio + on-screen visuals only (still watchable, keeps demo alive).

---

## 10. Tech Stack (recommended, adjust to team familiarity)

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui |
| Backend | FastAPI (Python) |
| Orchestration | LangGraph (state-machine Teacher Agent) or a custom finite-state orchestrator |
| LLM | Anthropic Claude (reasoning/planning/evaluation) — swappable via one env var |
| RAG | pgvector (Supabase) + LlamaIndex/LangChain retriever |
| TTS | ElevenLabs (multilingual) |
| STT (optional voice input) | OpenAI Whisper API |
| Avatar/Video | D-ID or HeyGen |
| DB/Storage | Supabase (Postgres + Storage + Auth) |
| Diagrams/plots | Matplotlib/Plotly (math/science), Mermaid (concept maps), sandboxed Python exec (code demos) |
| Deployment | Vercel (frontend) + Render/Fly.io (backend) |

---

## 11. Evaluation-Criteria Alignment (self-check against §19 weightage)

| Criterion | Weight | Where it's earned in this PRD |
|---|---|---|
| Human-Like Teaching & Adaptation | 20 | §8.4 misconception loop, §6 state machine |
| AI/ML & LLM Implementation | 15 | §6 Teacher Agent orchestration |
| RAG & Knowledge Grounding | 15 | §8.1, citations UI |
| AI Teaching Video Generation | 15 | §8.3 |
| Multilingual Capability | 10 | §8.7 |
| Voice and AI Avatar | 10 | §8.3 |
| Innovation & Originality | 5 | Cross-language teaching, learning-path DAG |
| UX/UI | 5 | §7 dedicated pages, live transcript/citations |
| Documentation | 5 | §13 deliverables checklist |

---

## 12. Environment Variables (`.env`)

See companion `.env.example` — never commit real keys. Required at minimum: one LLM key, one TTS key, one avatar key, DB connection string.

---

## 13. Documentation Deliverables Checklist (brief §20)
- [ ] Problem statement & solution overview
- [ ] Architecture diagram (use the diagram in §6)
- [ ] AI/ML models used + prompt/agent architecture (Teacher Agent state machine)
- [ ] RAG implementation details
- [ ] Personalization approach
- [ ] Assessment methodology
- [ ] Multilingual implementation
- [ ] Voice + avatar implementation
- [ ] Third-party APIs/services disclosed
- [ ] Setup & deployment instructions
- [ ] Known limitations
- [ ] Demo video (3–7 min) following: Upload/Topic → Planning → Video → Interaction → Adaptation → Assessment → Feedback

---

## 14. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Avatar API cost/latency kills demo | Fallback to audio+visual mode (§9); cache a pre-rendered demo clip as backup |
| Hallucinated answers from uploaded material | Strict RAG-only prompting + citation UI + "not found in material" response |
| Judges see a static video, not adaptive behavior | Script the demo to deliberately trigger a wrong answer → show re-teach branch live |
| Scope too large for hackathon time | Build in phases (see build prompt); mandatory 12 items first, advanced features only if time remains |
