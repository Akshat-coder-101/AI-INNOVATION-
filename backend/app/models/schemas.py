from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone
import uuid

def get_utc_now():
    return datetime.now(timezone.utc)

# --- Learner Profile Schemas ---
class LearnerProfileCreate(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Learner"
    level: str = "beginner" # beginner | intermediate | advanced
    goal: str = "understand_concept" # exam_prep | conceptual | interview | deep_dive
    preferred_style: str = "visual" # visual | analogies | socratic | code
    language: str = "en" # en | hi | hinglish
    time_budget_minutes: int = 20 # 5 | 20 | 60 | 10080 (7-day)
    depth: str = "standard" # quick | standard | comprehensive

class LearnerProfile(LearnerProfileCreate):
    topics_studied: List[str] = []
    scores_history: List[Dict[str, Any]] = []
    strong_concepts: List[str] = []
    weak_concepts: List[str] = []
    created_at: datetime = Field(default_factory=get_utc_now)

# --- Ingestion & RAG Schemas ---
class IngestResponse(BaseModel):
    material_id: str
    filename: str
    total_pages_or_sections: int
    chunks_count: int
    chapters: List[Dict[str, Any]]
    preview: str

class Citation(BaseModel):
    chapter: str = "General"
    page: Optional[int] = None
    section: Optional[str] = None
    snippet: str = ""
    confidence: float = 0.95

# --- Lesson Planner Schemas ---
class CheckpointQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "mcq" # mcq | short_answer | problem_solving
    question: str = ""
    options: Optional[List[str]] = None
    correct_answer: str = ""
    hints: Optional[List[str]] = None
    concept_tested: str = ""

class LessonSegmentPlan(BaseModel):
    id: int
    concept: str
    depth: str = "beginner"
    est_minutes: int = 4
    visual_type: str = "labeled-diagram" # equation/graph | labeled-diagram | timeline/map | code+execution
    checkpoint_question: CheckpointQuestion
    summary: str = ""

class FinalAssessmentSpec(BaseModel):
    type: str = "quiz"
    question_count: int = 4
    difficulty: str = "adaptive"

class LessonPlan(BaseModel):
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    topic: str
    objectives: List[str]
    time_budget_minutes: int
    learner_level: str
    language: str
    segments: List[LessonSegmentPlan]
    final_assessment: FinalAssessmentSpec
    material_id: Optional[str] = None

class LessonPlanRequest(BaseModel):
    topic: Optional[str] = None
    material_id: Optional[str] = None
    learner_profile: Optional[LearnerProfileCreate] = None
    time_budget_minutes: Optional[int] = 20
    language: Optional[str] = "en"

# --- Visual Specs ---
class MathPhysicsPayload(BaseModel):
    equations: List[str]
    plot_type: str = "2d_function"
    plot_title: str
    plot_x_label: str
    plot_y_label: str
    plot_data: Dict[str, Any]
    step_by_step: List[str]

class BiologyDiagramPayload(BaseModel):
    diagram_title: str
    svg_code: str
    labels: List[Dict[str, Any]]
    key_takeaways: List[str]

class HistoryTimelinePayload(BaseModel):
    timeline_title: str
    events: List[Dict[str, Any]]
    map_context: Optional[Dict[str, Any]] = None

class CodeExecutionPayload(BaseModel):
    language: str = "python"
    code: str
    stdin: Optional[str] = ""
    expected_output: Optional[str] = None
    explanation_steps: List[str]

class VisualSpec(BaseModel):
    type: str
    title: str
    payload: Dict[str, Any]

# --- Rendered Segment Schemas ---
class CaptionItem(BaseModel):
    start_sec: float
    end_sec: float
    text: str

class LessonSegmentRender(BaseModel):
    segment_id: int
    session_id: str
    concept: str
    spoken_script: str
    on_screen_text: str
    visual_spec: VisualSpec
    audio_url: Optional[str] = None
    avatar_video_url: Optional[str] = None
    video_url: Optional[str] = None
    video_status: Optional[str] = "unavailable"
    captions: List[CaptionItem] = []
    citations: List[Citation] = []
    checkpoint_question: CheckpointQuestion
    analogies_used: List[str] = []
    language: str = "en"
    is_reteach: bool = False

# --- Interaction & Misconception Schemas ---
class StudentAnswerRequest(BaseModel):
    session_id: str
    segment_id: int
    student_answer: str
    is_demo_mode: bool = False
    force_misconception: bool = False

class InteractionResponse(BaseModel):
    action: str
    classification: str
    feedback: str
    misconception_name: Optional[str] = None
    new_analogy: Optional[str] = None
    new_example: Optional[str] = None
    new_checkpoint_question: Optional[CheckpointQuestion] = None
    reteach_segment: Optional[LessonSegmentRender] = None
    next_segment_id: Optional[int] = None
    transcript: Optional[str] = None
    answer_text: Optional[str] = None
    audio_url: Optional[str] = None

class LanguageSwitchRequest(BaseModel):
    session_id: str
    target_language: str
    current_segment_id: int

# --- Assessment & Report Schemas ---
class QuizQuestion(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "mcq"
    concept: str
    question: str
    options: Optional[List[str]] = None
    correct_answer: str
    explanation: str

class Quiz(BaseModel):
    quiz_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    topic: str
    questions: List[QuizQuestion]

class StudentQuizSubmission(BaseModel):
    session_id: str
    answers: Dict[str, str]

class QuestionGradeResult(BaseModel):
    question_id: str
    concept: str
    is_correct: bool
    student_answer: str
    correct_answer: str
    feedback: str

class QuizGradeResponse(BaseModel):
    session_id: str
    total_score: int
    max_score: int
    score_percentage: float
    results: List[QuestionGradeResult]

class LearningReport(BaseModel):
    session_id: str
    user_id: str
    topic: str
    score_percent: float
    time_spent_minutes: int
    concepts_understood: List[str]
    weak_areas: List[str]
    misconceptions_encountered: List[str]
    recommended_revision: List[str]
    suggested_next_topics: List[str]
    generated_at: datetime = Field(default_factory=get_utc_now)

# --- Learning Path Curriculum DAG ---
class PathNode(BaseModel):
    id: str
    title: str
    description: str
    estimated_hours: float
    difficulty: str
    prerequisites: List[str] = []
    completed: bool = False
    score: Optional[float] = None

class LearningPath(BaseModel):
    topic_id: str
    title: str
    description: str
    nodes: List[PathNode]
    edges: List[Dict[str, str]]
    completion_percentage: float = 0.0
