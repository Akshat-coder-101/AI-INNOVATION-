from typing import Optional, Any, List, Dict
from sqlalchemy import create_engine, String, Integer, Float, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Mapped, mapped_column
from datetime import datetime, timezone
import json
from .config import settings

class Base(DeclarativeBase):
    pass

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

class DBMaterial(Base):
    __tablename__ = "materials"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    content_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    total_sections: Mapped[int] = mapped_column(Integer, default=1)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)

class DBMaterialChunk(Base):
    __tablename__ = "material_chunks"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    material_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    chapter: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    page: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    token_count: Mapped[int] = mapped_column(Integer, default=0)

class DBLessonSession(Base):
    __tablename__ = "lesson_sessions"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    topic: Mapped[str] = mapped_column(String, nullable=False)
    language: Mapped[str] = mapped_column(String, default="en")
    time_budget: Mapped[int] = mapped_column(Integer, default=20)
    current_segment_id: Mapped[int] = mapped_column(Integer, default=1)
    state: Mapped[str] = mapped_column(String, default="understand")
    plan_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    taught_concepts: Mapped[List[str]] = mapped_column(JSON, default=list)
    analogies_used: Mapped[List[str]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class DBCheckpointAttempt(Base):
    __tablename__ = "checkpoint_attempts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    segment_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    question_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    student_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    classification: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)

class DBQuiz(Base):
    __tablename__ = "quizzes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    topic: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    questions_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)

class DBQuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    score_percentage: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    details_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)

class DBLearningReport(Base):
    __tablename__ = "learning_reports"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True, unique=True, nullable=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    topic: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    score_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    time_spent: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    report_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)

class DBLearnerProfile(Base):
    __tablename__ = "learner_profiles"
    user_id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, default="Learner")
    level: Mapped[str] = mapped_column(String, default="beginner")
    goal: Mapped[str] = mapped_column(String, default="understand_concept")
    preferred_style: Mapped[str] = mapped_column(String, default="visual")
    language: Mapped[str] = mapped_column(String, default="en")
    history_json: Mapped[List[Any]] = mapped_column(JSON, default=list)
    mastery_json: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class DBLearningPath(Base):
    __tablename__ = "learning_paths"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[Optional[str]] = mapped_column(String, index=True, nullable=True)
    topic_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    title: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    dag_json: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    progress_percentage: Mapped[float] = mapped_column(Float, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class DBYouTubeCache(Base):
    __tablename__ = "youtube_cache"
    key: Mapped[str] = mapped_column(String, primary_key=True)
    payload: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)

class DBExportJob(Base):
    __tablename__ = "export_jobs"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    session_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default="queued") # queued, processing, completed, failed
    progress: Mapped[int] = mapped_column(Integer, default=0)
    video_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=get_utc_now, onupdate=get_utc_now)

# Engine initialization
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
