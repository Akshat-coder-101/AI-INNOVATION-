from sqlalchemy import create_engine, Column, String, Integer, Float, Text, Boolean, DateTime, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime, timezone
import json
from .config import settings

Base = declarative_base()

def get_utc_now():
    return datetime.now(timezone.utc)

class DBMaterial(Base):
    __tablename__ = "materials"
    id = Column(String, primary_key=True)
    filename = Column(String, nullable=False)
    content_type = Column(String)
    total_sections = Column(Integer, default=1)
    raw_text = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)

class DBMaterialChunk(Base):
    __tablename__ = "material_chunks"
    id = Column(String, primary_key=True)
    material_id = Column(String, index=True)
    chapter = Column(String)
    page = Column(Integer, nullable=True)
    section = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(JSON)
    token_count = Column(Integer, default=0)

class DBLessonSession(Base):
    __tablename__ = "lesson_sessions"
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    topic = Column(String, nullable=False)
    language = Column(String, default="en")
    time_budget = Column(Integer, default=20)
    current_segment_id = Column(Integer, default=1)
    state = Column(String, default="understand")
    plan_json = Column(JSON)
    taught_concepts = Column(JSON, default=list)
    analogies_used = Column(JSON, default=list)
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class DBCheckpointAttempt(Base):
    __tablename__ = "checkpoint_attempts"
    id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    segment_id = Column(Integer)
    question_text = Column(Text)
    student_answer = Column(Text)
    classification = Column(String)
    feedback = Column(Text)
    created_at = Column(DateTime, default=get_utc_now)

class DBQuiz(Base):
    __tablename__ = "quizzes"
    id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    topic = Column(String)
    questions_json = Column(JSON)
    created_at = Column(DateTime, default=get_utc_now)

class DBQuizAttempt(Base):
    __tablename__ = "quiz_attempts"
    id = Column(String, primary_key=True)
    session_id = Column(String, index=True)
    score_percentage = Column(Float)
    details_json = Column(JSON)
    created_at = Column(DateTime, default=get_utc_now)

class DBLearningReport(Base):
    __tablename__ = "learning_reports"
    id = Column(String, primary_key=True)
    session_id = Column(String, index=True, unique=True)
    user_id = Column(String, index=True)
    topic = Column(String)
    score_percent = Column(Float)
    time_spent = Column(Integer)
    report_json = Column(JSON)
    created_at = Column(DateTime, default=get_utc_now)

class DBLearnerProfile(Base):
    __tablename__ = "learner_profiles"
    user_id = Column(String, primary_key=True)
    name = Column(String, default="Learner")
    level = Column(String, default="beginner")
    goal = Column(String, default="understand_concept")
    preferred_style = Column(String, default="visual")
    language = Column(String, default="en")
    history_json = Column(JSON, default=list)
    mastery_json = Column(JSON, default=dict)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

class DBLearningPath(Base):
    __tablename__ = "learning_paths"
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    topic_id = Column(String)
    title = Column(String)
    dag_json = Column(JSON)
    progress_percentage = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

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
