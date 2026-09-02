const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export interface Citation {
  chapter: string;
  page?: number;
  section?: string;
  snippet: string;
  confidence: number;
}

export interface CheckpointQuestion {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correct_answer: string;
  hints?: string[];
  concept_tested: string;
}

export interface LessonSegmentPlan {
  id: number;
  concept: string;
  depth: string;
  est_minutes: number;
  visual_type: string;
  checkpoint_question: CheckpointQuestion;
  summary: string;
}

export interface LessonPlan {
  session_id: string;
  topic: string;
  objectives: string[];
  time_budget_minutes: number;
  learner_level: string;
  language: string;
  segments: LessonSegmentPlan[];
  final_assessment: {
    type: string;
    question_count: number;
  };
  material_id?: string;
}

export interface VisualSpec {
  type: string;
  title: string;
  payload: any;
}

export interface CaptionItem {
  start_sec: number;
  end_sec: number;
  text: string;
}

export interface LessonSegmentRender {
  segment_id: number;
  session_id: string;
  concept: string;
  spoken_script: string;
  on_screen_text: string;
  visual_spec: VisualSpec;
  audio_url?: string;
  avatar_video_url?: string;
  video_url?: string;
  captions: CaptionItem[];
  citations: Citation[];
  checkpoint_question: CheckpointQuestion;
  analogies_used: string[];
  language: string;
  is_reteach: boolean;
}

export interface InteractionResponse {
  action: "advance" | "reteach";
  classification: "correct" | "partially_correct" | "misconception" | "no_understanding";
  feedback: string;
  misconception_name?: string;
  new_analogy?: string;
  new_example?: string;
  new_checkpoint_question?: CheckpointQuestion;
  reteach_segment?: LessonSegmentRender;
  next_segment_id?: number;
  transcript?: string;
  answer_text?: string;
  audio_url?: string;
}

export interface QuizQuestion {
  id: string;
  type: string;
  concept: string;
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

export interface Quiz {
  quiz_id: string;
  session_id: string;
  topic: string;
  questions: QuizQuestion[];
}

export interface QuestionGradeResult {
  question_id: string;
  concept: string;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
  feedback: string;
}

export interface QuizGradeResponse {
  session_id: string;
  total_score: number;
  max_score: number;
  score_percentage: number;
  results: QuestionGradeResult[];
}

export interface LearningReport {
  session_id: string;
  user_id: string;
  topic: string;
  score_percent: number;
  time_spent_minutes: number;
  concepts_understood: string[];
  weak_areas: string[];
  misconceptions_encountered: string[];
  recommended_revision: string[];
  suggested_next_topics: string[];
  generated_at: string;
}

export interface PathNode {
  id: string;
  title: string;
  description: string;
  estimated_hours: number;
  difficulty: string;
  prerequisites: string[];
  completed: boolean;
  score?: number;
}

export interface LearningPath {
  topic_id: string;
  title: string;
  description: string;
  nodes: PathNode[];
  edges: { from: string; to: string }[];
  completion_percentage: number;
}

export interface LearnerProfile {
  user_id: string;
  name: string;
  level: string;
  goal: string;
  preferred_style: string;
  language: string;
  time_budget_minutes: number;
  depth: string;
  topics_studied: string[];
  scores_history: any[];
  strong_concepts: string[];
  weak_concepts: string[];
}

export const api = {
  // Ingest
  ingestFile: async (formData: FormData) => {
    const res = await fetch(`${API_BASE_URL}/ingest`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to ingest file");
    return res.json();
  },

  // Lesson
  createLessonPlan: async (payload: {
    topic?: string;
    material_id?: string;
    learner_profile?: any;
    time_budget_minutes?: number;
    language?: string;
  }): Promise<LessonPlan> => {
    const res = await fetch(`${API_BASE_URL}/lesson/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create lesson plan");
    return res.json();
  },

  getLessonPlan: async (sessionId: string): Promise<LessonPlan> => {
    const res = await fetch(`${API_BASE_URL}/lesson/plan/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch lesson plan");
    return res.json();
  },

  renderSegment: async (
    segmentId: number,
    sessionId: string,
    language?: string
  ): Promise<LessonSegmentRender> => {
    const langParam = language ? `&language=${encodeURIComponent(language)}` : "";
    const res = await fetch(
      `${API_BASE_URL}/lesson/segment/${segmentId}/render?session_id=${sessionId}${langParam}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to render segment");
    return res.json();
  },

  switchLanguage: async (payload: {
    session_id: string;
    target_language: string;
    current_segment_id: number;
  }): Promise<LessonSegmentRender> => {
    const res = await fetch(`${API_BASE_URL}/lesson/language-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to switch language");
    return res.json();
  },

  // Interactivity & Misconceptions
  submitAnswer: async (payload: {
    session_id: string;
    segment_id: number;
    student_answer: string;
    is_demo_mode?: boolean;
    force_misconception?: boolean;
  }): Promise<InteractionResponse> => {
    const res = await fetch(`${API_BASE_URL}/interact/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit answer");
    return res.json();
  },

  submitVoiceAnswer: async (formData: FormData): Promise<InteractionResponse> => {
    const res = await fetch(`${API_BASE_URL}/interact/voice-answer`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to evaluate voice answer");
    return res.json();
  },

  requestSimplification: async (
    sessionId: string,
    segmentId: number,
    query?: string
  ): Promise<InteractionResponse> => {
    const res = await fetch(`${API_BASE_URL}/interact/request-simplification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        segment_id: segmentId,
        user_query: query || "Can you explain this more simply with another analogy?",
      }),
    });
    if (!res.ok) throw new Error("Failed to request simplification");
    return res.json();
  },

  runPythonCode: async (
    code: string,
    timeoutSeconds: number = 5
  ): Promise<{ success: boolean; output?: string; stdout?: string; stderr?: string }> => {
    const res = await fetch(`${API_BASE_URL}/sandbox/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, timeout_seconds: timeoutSeconds }),
    });
    if (!res.ok) throw new Error("Failed to execute code in sandbox");
    return res.json();
  },

  // Assessment & Report
  getQuiz: async (sessionId: string): Promise<Quiz> => {
    const res = await fetch(`${API_BASE_URL}/assess/quiz/${sessionId}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to generate quiz");
    return res.json();
  },

  gradeQuiz: async (payload: {
    session_id: string;
    answers: Record<string, string>;
  }): Promise<QuizGradeResponse> => {
    const res = await fetch(`${API_BASE_URL}/assess/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to grade quiz");
    return res.json();
  },

  getReport: async (sessionId: string): Promise<LearningReport> => {
    const res = await fetch(`${API_BASE_URL}/report/${sessionId}`);
    if (!res.ok) throw new Error("Failed to fetch report");
    return res.json();
  },

  // Profile & Path
  getProfile: async (userId: string = "default-user"): Promise<LearnerProfile> => {
    const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },

  getLearningPath: async (
    topicId: string,
    userId: string = "default-user"
  ): Promise<LearningPath> => {
    const res = await fetch(
      `${API_BASE_URL}/learning-path/${encodeURIComponent(topicId)}?user_id=${userId}`
    );
    if (!res.ok) throw new Error("Failed to fetch learning path");
    return res.json();
  },

  togglePathNode: async (
    topicId: string,
    nodeId: string,
    userId: string = "default-user"
  ): Promise<LearningPath> => {
    const res = await fetch(
      `${API_BASE_URL}/learning-path/${encodeURIComponent(
        topicId
      )}/toggle-node/${nodeId}?user_id=${userId}`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to toggle node");
    return res.json();
  },
};
