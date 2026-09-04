const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export interface Citation {
  chunk_id?: string;
  chapter: string;
  page?: number;
  section?: string;
  quote?: string;
  snippet: string;
  confidence: number;
}

export interface SourceCitation {
  chunk_id: string;
  page?: number;
  quote: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  detected_title: string;
  key_topics: string[];
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
  source_citations?: SourceCitation[];
  citations?: Citation[];
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
  document_id?: string;
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
  chunk_id?: string;
  segment_id?: number;
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

export interface GapMapItem {
  concept: string;
  segment_id?: number;
  citation?: Citation;
  recommendation: string;
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
  gap_map?: GapMapItem[];
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

/**
 * Universal response handler that parses canonical backend error shapes:
 * { "error": { "code": string, "message": string, "path": string } }
 */
async function handleApiResponse<T = any>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    let errorMsg = fallbackError;
    try {
      const data = await res.json();
      if (data?.error?.message) {
        errorMsg = data.error.message;
      } else if (typeof data?.detail === "string") {
        errorMsg = data.detail;
      } else if (data?.message) {
        errorMsg = data.message;
      }
    } catch {
      errorMsg = `${fallbackError} (Status ${res.status})`;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Document Upload & RAG Grounded Lessons
  uploadDocument: async (file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: "POST",
      body: formData,
    });
    return handleApiResponse<DocumentUploadResponse>(res, "Failed to upload and vectorize document");
  },

  planLessonFromDocument: async (
    documentId: string,
    opts?: {
      time_budget_minutes?: number;
      language?: string;
      learner_profile?: any;
    }
  ): Promise<LessonPlan> => {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(documentId)}/plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts || {}),
    });
    return handleApiResponse<LessonPlan>(res, "Failed to generate grounded lesson from document");
  },

  // Ingest
  ingestFile: async (formData: FormData) => {
    const res = await fetch(`${API_BASE_URL}/ingest`, {
      method: "POST",
      body: formData,
    });
    return handleApiResponse(res, "Failed to ingest and parse file");
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
    return handleApiResponse<LessonPlan>(res, "Failed to create lesson plan");
  },

  getLessonPlan: async (sessionId: string): Promise<LessonPlan> => {
    const res = await fetch(`${API_BASE_URL}/lesson/plan/${sessionId}`);
    return handleApiResponse<LessonPlan>(res, "Failed to fetch lesson plan");
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
    return handleApiResponse<LessonSegmentRender>(res, "Failed to render lesson segment");
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
    return handleApiResponse<LessonSegmentRender>(res, "Failed to switch audio/video language");
  },

  // Interactivity & Misconceptions
  submitAnswer: async (payload: {
    session_id: string;
    segment_id: number;
    student_answer: string;
    is_demo_mode?: boolean;
    force_misconception?: boolean;
    hints_used?: number;
    confidence_rating?: number;
  }): Promise<InteractionResponse> => {
    const res = await fetch(`${API_BASE_URL}/interact/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleApiResponse<InteractionResponse>(res, "Failed to submit checkpoint answer");
  },

  submitVoiceAnswer: async (formData: FormData): Promise<InteractionResponse> => {
    const res = await fetch(`${API_BASE_URL}/interact/voice-answer`, {
      method: "POST",
      body: formData,
    });
    return handleApiResponse<InteractionResponse>(res, "Failed to evaluate voice answer");
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
    return handleApiResponse<InteractionResponse>(res, "Failed to request adaptive simplification");
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
    return handleApiResponse(res, "Failed to execute Python sandbox code");
  },

  // Assessment & Report
  getQuiz: async (sessionId: string): Promise<Quiz> => {
    const res = await fetch(`${API_BASE_URL}/assess/quiz/${sessionId}`, {
      method: "POST",
    });
    return handleApiResponse<Quiz>(res, "Failed to generate comprehensive quiz");
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
    return handleApiResponse<QuizGradeResponse>(res, "Failed to grade assessment quiz");
  },

  getReport: async (sessionId: string): Promise<LearningReport> => {
    const res = await fetch(`${API_BASE_URL}/report/${sessionId}`);
    return handleApiResponse<LearningReport>(res, "Failed to fetch mastery report");
  },

  // Profile & Path
  getProfile: async (userId: string = "default-user"): Promise<LearnerProfile> => {
    const res = await fetch(`${API_BASE_URL}/profile/${userId}`);
    return handleApiResponse<LearnerProfile>(res, "Failed to fetch learner profile");
  },

  getLearningPath: async (
    topicId: string,
    userId: string = "default-user"
  ): Promise<LearningPath> => {
    const res = await fetch(
      `${API_BASE_URL}/learning-path/${encodeURIComponent(topicId)}?user_id=${userId}`
    );
    return handleApiResponse<LearningPath>(res, "Failed to fetch pedagogical learning path");
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
    return handleApiResponse<LearningPath>(res, "Failed to toggle learning node completion");
  },

  // YouTube Grounded Video Recommendations
  getRelatedVideos: async (
    topic: string,
    language: string = "en",
    opts?: { segment_id?: number; session_id?: string; context?: string }
  ): Promise<RelatedVideosResponse> => {
    const params = new URLSearchParams({
      topic,
      language,
      ...(opts?.segment_id ? { segment_id: String(opts.segment_id) } : {}),
      ...(opts?.session_id ? { session_id: opts.session_id } : {}),
      ...(opts?.context ? { context: opts.context } : {}),
    });
    const res = await fetch(`${API_BASE_URL}/videos/recommend?${params.toString()}`);
    return handleApiResponse<RelatedVideosResponse>(res, "Failed to fetch related educational videos");
  },
};

export interface RelatedVideo {
  video_id: string;
  title: string;
  channel: string;
  thumbnail_url: string;
  embed_url: string;
  watch_url: string;
  duration: string;
}

export interface RelatedVideosResponse {
  source: "youtube" | "cache" | "fallback";
  videos: RelatedVideo[];
  search_url: string;
}

