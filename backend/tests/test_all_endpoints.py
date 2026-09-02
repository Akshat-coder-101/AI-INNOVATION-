import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.database import init_db
from app.services.rag import RAGService
from app.services.llm import LLMService

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    init_db()

def test_root_and_health():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "online"
    
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_lesson_plan_and_rendering():
    # 1. Generate lesson plan
    resp = client.post("/api/lesson/plan", json={
        "topic": "Newton's Laws of Motion",
        "time_budget_minutes": 20,
        "language": "en"
    })
    assert resp.status_code == 200
    plan_data = resp.json()
    assert "session_id" in plan_data
    assert len(plan_data["segments"]) > 0
    session_id = plan_data["session_id"]

    # 2. Render segment 1
    resp = client.post(f"/api/lesson/segment/1/render?session_id={session_id}")
    assert resp.status_code == 200
    seg_data = resp.json()
    assert seg_data["segment_id"] == 1
    assert "visual_spec" in seg_data
    assert "spoken_script" in seg_data
    assert len(seg_data["captions"]) > 0

    # 3. Test Checkpoint Correct Answer
    correct_ans = seg_data["checkpoint_question"]["correct_answer"]
    resp = client.post("/api/interact/answer", json={
        "session_id": session_id,
        "segment_id": 1,
        "student_answer": correct_ans,
        "is_demo_mode": False
    })
    assert resp.status_code == 200
    interact_data = resp.json()
    assert interact_data["action"] == "advance"
    assert interact_data["classification"] == "correct"

    # 4. Test Misconception Loop & Reteach (Deterministic Demo Mode)
    resp = client.post("/api/interact/answer", json={
        "session_id": session_id,
        "segment_id": 1,
        "student_answer": "I think force is stored in a moving body until it runs out.",
        "force_misconception": True
    })
    assert resp.status_code == 200
    reteach_data = resp.json()
    assert reteach_data["action"] == "reteach"
    assert reteach_data["classification"] == "misconception"
    assert reteach_data["misconception_name"] is not None
    assert len(reteach_data["misconception_name"].strip()) > 3
    assert reteach_data["new_analogy"] is not None
    assert reteach_data["reteach_segment"] is not None

def test_time_budget_and_level_variation():
    # 5-minute budget -> 2 segments
    resp_5m = client.post("/api/lesson/plan", json={
        "topic": "Thermodynamics",
        "time_budget_minutes": 5,
        "learner_profile": {"level": "beginner"}
    })
    assert resp_5m.status_code == 200
    plan_5m = resp_5m.json()
    assert len(plan_5m["segments"]) == 2

    # 60-minute budget -> 6 segments
    resp_60m = client.post("/api/lesson/plan", json={
        "topic": "Thermodynamics",
        "time_budget_minutes": 60,
        "learner_profile": {"level": "advanced"}
    })
    assert resp_60m.status_code == 200
    plan_60m = resp_60m.json()
    assert len(plan_60m["segments"]) == 6

def test_multilingual_switch():
    resp = client.post("/api/lesson/plan", json={
        "topic": "Cellular Biology",
        "time_budget_minutes": 20,
        "language": "en"
    })
    session_id = resp.json()["session_id"]

    resp = client.post("/api/lesson/language-switch", json={
        "session_id": session_id,
        "target_language": "hi",
        "current_segment_id": 1
    })
    assert resp.status_code == 200
    assert resp.json()["language"] == "hi"

def test_assessment_and_learning_report():
    resp = client.post("/api/lesson/plan", json={
        "topic": "Machine Learning Foundations",
        "time_budget_minutes": 20,
        "language": "en"
    })
    session_id = resp.json()["session_id"]

    # Generate quiz
    resp = client.post(f"/api/assess/quiz/{session_id}")
    assert resp.status_code == 200
    quiz_data = resp.json()
    assert len(quiz_data["questions"]) >= 4

    # Assert correct answers are NOT all Option A
    correct_options = [q["correct_answer"] for q in quiz_data["questions"]]
    first_letters = [c[0].upper() for c in correct_options if len(c) > 0 and c[0].isalpha()]
    # When 3 or more questions exist, they should span more than just "A"
    if len(quiz_data["questions"]) >= 3:
        assert len(set(first_letters)) >= 2

    # Grade quiz
    answers = {q["id"]: q["correct_answer"] for q in quiz_data["questions"]}
    resp = client.post("/api/assess/grade", json={
        "session_id": session_id,
        "answers": answers
    })
    assert resp.status_code == 200
    grade_data = resp.json()
    assert grade_data["score_percentage"] == 100.0

    # Fetch learning report
    resp = client.get(f"/api/report/{session_id}")
    assert resp.status_code == 200
    report_data = resp.json()
    assert report_data["score_percent"] == 100.0
    assert len(report_data["concepts_understood"]) > 0

def test_learning_path_dag():
    resp = client.get("/api/learning-path/quantum-computing?user_id=test-user")
    assert resp.status_code == 200
    dag_data = resp.json()
    assert len(dag_data["nodes"]) >= 5
    assert len(dag_data["edges"]) >= 4

def test_code_sandbox_execution():
    resp = client.post("/api/sandbox/run", json={
        "code": "print('Python Sandbox Active:', 10 + 25)"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "Python Sandbox Active: 35" in data["stdout"]

def test_rag_deterministic_embedding_stability():
    vec1 = RAGService.generate_embedding("quantum superposition states")
    vec2 = RAGService.generate_embedding("quantum superposition states")
    assert len(vec1) == 768
    assert len(vec2) == 768
    # Exact stability check
    assert vec1 == vec2

def test_request_simplification():
    resp = client.post("/api/lesson/plan", json={
        "topic": "Electromagnetism",
        "time_budget_minutes": 20,
        "language": "en"
    })
    session_id = resp.json()["session_id"]

    resp = client.post("/api/interact/request-simplification", json={
        "session_id": session_id,
        "segment_id": 1,
        "user_query": "Explain this with an intuitive analogy"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["action"] == "reteach"
    assert data["reteach_segment"] is not None

def test_video_endpoint_shape():
    resp = client.post("/api/lesson/plan", json={
        "topic": "Special Relativity",
        "time_budget_minutes": 20,
        "language": "en"
    })
    session_id = resp.json()["session_id"]

    resp = client.post(f"/api/lesson/segment/1/render?session_id={session_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "video_url" in data
    assert "video_status" in data
    if data["video_url"]:
        assert data["video_url"].endswith(".mp4")

def test_health_llm():
    resp = client.get("/health/llm")
    assert resp.status_code == 200
    data = resp.json()
    assert "providers" in data
    assert isinstance(data["providers"], dict)
    assert "embeddings" in data
    assert data["embeddings"] in ["live", "deterministic"]
    assert "media_dir_writable" in data

@pytest.mark.skipif(not os.getenv("GEMINI_API_KEY"), reason="Requires live GEMINI_API_KEY")
def test_llm_live_generation():
    resp = client.post("/api/lesson/plan", json={
        "topic": "Quantum Information and Superconducting Qubits",
        "time_budget_minutes": 20,
        "language": "en"
    })
    assert resp.status_code == 200
    plan_data = resp.json()
    segment_titles = [s["concept"] for s in plan_data["segments"]]
    offline_fallback_titles = [
        "1. Foundations & Intuition of Quantum Information and Superconducting Qubits",
        "2. Mathematical & Formal Derivation",
        "3. Algorithmic Demonstration & Code Runner",
        "4. Historical Context & Real-World Synthesis"
    ]
    # In live generation, titles are dynamically tailored by the LLM
    assert segment_titles != offline_fallback_titles
