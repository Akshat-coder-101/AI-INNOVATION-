# Sahayak AI Teacher — System Architecture

## 1. High-Level Architecture Overview

Sahayak AI Teacher is built as a state-machine driven educational platform designed for the **AI Innovation Hackathon 2026**.

```mermaid
graph TD
    A[Student / Presenter] -->|Upload Material / Topic| B[Next.js 15 App Router]
    B -->|REST API| C[FastAPI Backend]
    
    subgraph Core Teacher State Machine
        C --> D[1. Understand]
        D --> E[2. Plan Lesson Plan JSON]
        E --> F[3. Explain Audio / Script]
        F --> G[4. Demonstrate 4 Visual Routers]
        G --> H[5. Question Checkpoint Pause]
        H --> I[6. Evaluate Classification]
        I -->|Correct| J[7. Advance Next Concept]
        I -->|Misconception| K[7. Adapt Reteach Fresh Analogy]
        K --> G
        J --> L[8. Assess Quiz Engine]
        L --> M[9. Report Learning Diagnostics]
    end

    subgraph Data & Storage
        C --> N[(PostgreSQL / Supabase / SQLite)]
        C --> O[(pgvector Semantic Embeddings)]
    end
```

---

## 2. Component Breakdown

| Layer | Technology | Primary Role |
|---|---|---|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS | Multi-page judgeable user journey, dynamic synchronized audio/visual player, interactive DAG explorer |
| **Backend** | FastAPI, Python 3.11+ | REST endpoints, Teacher Agent FSM, document parsing, sandboxed code executor |
| **State Machine** | `TeacherAgentStateMachine` | Deterministic state transitions, analogy freshness tracking, adaptive remediation |
| **RAG Engine** | `pypdf`, `python-docx`, `python-pptx`, pgvector / cosine embeddings | Chapter/page citation tracking, zero-hallucination grounding |
| **Visual Routers** | LaTeX, Matplotlib/Plotly, SVG Engine, Subprocess Python Sandbox | Subject-aware visual rendering for Math/Physics, Biology, History, and Computer Science |
