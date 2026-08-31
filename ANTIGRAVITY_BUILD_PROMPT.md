# Antigravity Mission Prompt — "Sahayak AI Teacher"

Paste everything between the `=== MISSION START ===` and `=== MISSION END ===`
markers into a new Antigravity Agent task. Attach the PRD.md and .env.example
files from this same folder to the task as context if Antigravity supports
file attachments; otherwise paste PRD.md contents into a second message
right after this one.

---

=== MISSION START ===

You are building a complete, working, hackathon-ready web application called
**"Sahayak AI Teacher"** for the "AI Innovation Hackathon 2026 – AI Teacher"
challenge. Read this entire prompt before writing any code. Work in phases,
show me a plan first, then execute autonomously, testing your own work in the
browser after each phase (use your built-in browser-testing capability).

## 0. Non-negotiable framing
This is NOT a Q&A chatbot with a talking head bolted on. The core deliverable
is a **Teacher Agent state machine** that runs: understand → plan → explain →
demonstrate → question → evaluate → adapt (re-explain on misconception) →
continue → assess → report. Every feature below must serve that loop. If you
ever find yourself building a feature that just answers isolated questions,
stop and re-read this paragraph.

## 1. Tech stack (use exactly this unless a library is genuinely unavailable —
if you substitute something, tell me why in your plan before proceeding)
- Frontend: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI (Python 3.11+)
- Orchestration: a Python state-machine class (LangGraph if available, else
  a hand-rolled FSM — either is fine, but it must be an explicit, inspectable
  state machine, not implicit prompt-chaining)
- LLM: Anthropic API (model + key from env — see .env.example)
- RAG: Postgres + pgvector (Supabase) with a LangChain or LlamaIndex retriever
- TTS: ElevenLabs
- Avatar video: D-ID (primary) with a HeyGen adapter stub for later swap
- STT (optional voice input): OpenAI Whisper API
- DB/Storage: Supabase (Postgres, Storage, Auth)
- Diagram/plot rendering: matplotlib/plotly for math & science, Mermaid for
  concept maps/timelines, a sandboxed Python exec endpoint for code demos
- Deployment target: Vercel (frontend) + Render or Fly.io (backend) — set up
  config files for both even if you don't have credentials to actually deploy

Read every required env var from `.env` (copy `.env.example` → `.env` and
leave real values blank for me to fill in). **Never hardcode any API key
anywhere in source. Add `.env` to `.gitignore` immediately in phase 0.**

## 2. Multi-page routing — build these as real Next.js routes, not modals
| Route | Purpose |
|---|---|
| `/` | Landing: choose "Upload material" or "Teach me a topic" |
| `/upload` | Drag-drop PDF/DOCX/PPTX/TXT; show parsed chapters/sections after ingestion |
| `/topic` | Free-text topic entry |
| `/setup` | Learner profile form: level (beginner/intermediate/advanced), goal, preferred style, language, available time (5m/20m/60m/7-day), depth |
| `/lesson/[sessionId]` | Video/audio player + synced on-screen visual + live transcript + inline checkpoint questions (pauses playback) |
| `/assessment/[sessionId]` | Post-lesson quiz: MCQ, short-answer, problem-solving |
| `/report/[sessionId]` | Score, strengths, weak areas, recommendation, "Revise" / "Next topic" buttons |
| `/learning-path/[topicId]` | Visual DAG of a broad-topic curriculum with per-node completion state |
| `/profile` | Learner history: topics studied, scores over time, weak/strong concepts |
| `/dashboard` | Simple analytics across sessions (build last, only if time remains) |

Every route must be reachable via visible navigation, since a judge will
click through the app non-linearly.

## 3. Backend API surface (FastAPI)
Build these endpoints, each doing real work (no stubs left unimplemented in
the final pass — if something must be mocked for time, mark it clearly with
a `# MOCKED: reason` comment and surface it in "Known limitations" docs):

- `POST /ingest` — accept file upload, parse (PDF/DOCX/PPTX/TXT), chunk
  (semantic, ~500 tokens, keep chapter/page metadata), embed, store in
  pgvector. Return detected chapter/section outline.
- `POST /lesson/plan` — input: {material_ref OR topic, learner_profile}.
  Runs the Teacher Agent's "understand" + "plan" states. Output: LessonPlan
  JSON exactly as specified in PRD §8.2 (objectives, timeBudgetMinutes,
  ordered segments with concept/depth/estMinutes/visualType/checkpointQuestion,
  finalAssessment spec).
- `POST /lesson/segment/{id}/render` — generate spoken script + on-screen
  text + visualSpec for one segment, call TTS, call avatar API, route
  visualSpec to the right renderer (equation/graph, labeled-diagram,
  timeline/map, code+execution). Return a segment payload the frontend can
  play (avatar video URL/audio URL + visual asset + captions timestamps).
- `POST /interact/answer` — input: {sessionId, segmentId, studentAnswer}.
  Runs "evaluate" state: classify as
  correct | partially_correct | misconception(type) | no_understanding.
  If misconception/no_understanding: generate a NEW analogy (must differ
  from the one already used for this concept — track which analogies were
  already shown per session) + a new example + a new checkpoint question,
  and return `action: "reteach"`. Otherwise return `action: "advance"`.
- `POST /lesson/language-switch` — input: {sessionId, targetLanguage}.
  Regenerate the CURRENT segment only, in the new language, preserving all
  session state/progress. Must handle uploaded material in one language
  being taught in another.
- `POST /assess/quiz/{sessionId}` — generate a quiz from the concepts
  actually taught in this session (pull from session's taught-segments log,
  not a generic bank).
- `POST /assess/grade` — grade submitted quiz answers.
- `GET /report/{sessionId}` — build and return the learning report: score %,
  concepts understood, weak areas, incorrect concepts, recommended revision,
  suggested next topic.
- `GET/POST /profile/{userId}` — CRUD learner profile: topics studied,
  progress, scores, weak/strong concepts, history, current learning path.
  Must be read by `/lesson/plan` to personalize future sessions on repeat
  topics (e.g., start harder if they scored well last time).
- `POST /learning-path` — for broad topics, generate an ordered curriculum
  DAG (nodes + prerequisite edges) and persist per-user completion state.

## 4. RAG correctness requirement (do not skip)
Every explanation or quiz question generated from uploaded material MUST be
grounded in retrieved chunks. System-prompt the LLM explicitly: answer only
from the provided context; if the material doesn't cover something, say so
rather than inventing content. Return chunk citations (chapter/page) with
every RAG-grounded explanation and surface them in the `/lesson` UI as small
citation chips under each segment's transcript. This is required by the
brief and is directly checked by the "RAG and Knowledge Grounding" rubric
line (15%).

## 5. Subject-aware visuals (build all four routers, even simple versions)
- Math/Physics → render equations + a plot (matplotlib/plotly) + step-by-step
  solution text
- Biology → a labeled diagram (can be an SVG generated by the LLM or a
  templated diagram component)
- History → a timeline or map component
- Programming → real code block + actual execution output from a sandboxed
  runner (not fabricated output)
The `visualSpec.type` field from the lesson plan determines which router
fires. Document, in the code comments and in the README, how the router
decides which visual type fits a given concept.

## 6. Video generation — avoid the brief's explicit failure mode
The brief states: "simply placing a talking avatar in front of generated
text will not be considered sufficient." So each rendered segment MUST show,
simultaneously: avatar (video) + spoken audio + on-screen text/captions +
the subject-specific visual from step 5 — composited or synced-side-by-side
in the `/lesson` player. If the D-ID/HeyGen call fails or quota is hit, fall
back gracefully to audio + visual + captions (no avatar) rather than
breaking the demo — implement this fallback explicitly, don't leave it to
chance.

## 7. Multilingual — implement for at least English, Hindi, Hinglish
- Language selectable at `/setup`.
- Also detect a natural-language mid-lesson request to switch language
  (e.g., "Ab Hindi mein samjhao", "explain in English now") inside the
  `/interact/answer`-equivalent chat input, and route to
  `/lesson/language-switch` without losing lesson progress.
- TTS voice must actually speak the target language (verify ElevenLabs voice
  supports it, or pick per-language voice IDs from env).

## 8. Misconception demo hook (build this deliberately, it's the top-weighted
rubric item at 20%)
Add a small "Demo mode" toggle in `/lesson` (dev-only, clearly labeled) that
lets a presenter intentionally submit a wrong answer to reliably trigger the
reteach branch during a live demo, without needing to actually know the
subject. Do not let this bypass the real evaluation logic — it should just
make it easy to reach the branch on demand for filming.

## 9. Data model (Postgres) — create migrations for at least:
`users`, `learner_profiles`, `materials` (uploaded files + metadata),
`material_chunks` (with vector embedding column), `lesson_sessions`,
`lesson_segments` (with rendered media URLs + analogies_used array),
`checkpoint_attempts` (question, student answer, classification, timestamp),
`quizzes`, `quiz_attempts`, `learning_reports`, `learning_paths`,
`learning_path_nodes` (with completion state per user).

## 10. Build phases — execute in this order, testing after each phase
1. **Scaffold**: Next.js app + FastAPI app + Supabase schema/migrations +
   `.env.example` → `.env` + `.gitignore`. Confirm both servers boot.
2. **Ingestion + RAG**: `/upload` page + `/ingest` endpoint + pgvector
   retrieval. Test: upload a sample PDF, confirm chunk retrieval works via a
   simple query.
3. **Lesson Planner**: `/topic`, `/setup` pages + `/lesson/plan` endpoint.
   Test: generate a plan for a topic and for an uploaded chapter, at 5-min
   and 20-min budgets, confirm different structure/depth.
4. **Segment rendering pipeline**: TTS + avatar + visual router +
   `/lesson/[sessionId]` player. Test: render one full segment end-to-end
   and play it in-browser.
5. **Interactivity + misconception loop**: checkpoint questions,
   `/interact/answer`, reteach branch, demo-mode toggle. Test: deliberately
   answer wrong, confirm a NEW analogy is used, confirm re-evaluation works.
6. **Multilingual switch**: `/lesson/language-switch`, mid-lesson language
   change without state loss. Test in at least 2 languages.
7. **Assessment + report**: `/assessment/[sessionId]`, `/assess/quiz`,
   `/assess/grade`, `/report/[sessionId]`. Test full flow produces a
   sensible report matching what was actually taught.
8. **Profile + learning path**: `/profile`, `/learning-path/[topicId]`,
   persistence across sessions, personalization on repeat topics.
9. **Polish pass**: error states, loading states, fallback for avatar API
   failure, responsive layout, README + architecture diagram (Mermaid is
   fine) + setup instructions + known-limitations doc.
10. **Advanced features** (only if time remains, do not start these before
    steps 1–9 are solid): revision mode, flashcard generation, automatic
    notes, concept maps, offline/local model fallback, accessibility pass.

After each phase, use your browser tool to actually click through the new
pages and confirm they work before moving to the next phase. Report back to
me with a short status and any blocking issues before starting the next
phase.

## 11. Documentation to generate at the end
Produce a `/docs` folder with: problem statement & solution overview,
architecture diagram (mirror the state-machine + system diagram from the
attached PRD), AI/ML models used, RAG implementation notes, prompt/agent
architecture, personalization approach, assessment methodology, multilingual
implementation, voice/avatar implementation, third-party APIs disclosed,
setup instructions, deployment instructions, known limitations. This
directly satisfies the hackathon's mandatory submission checklist.

## 12. Definition of done
All 12 mandatory requirements from the brief are demonstrable in a single
continuous flow: Upload/Topic → Lesson Planning → AI Teaching Video →
Student Interaction → Adaptation (misconception → reteach, visibly
different from the first explanation) → Assessment → Learning Report. If
any of these breaks, that's the priority fix before touching advanced
features.

Begin by proposing your phase-1 plan and file/folder structure before
writing code.

=== MISSION END ===
