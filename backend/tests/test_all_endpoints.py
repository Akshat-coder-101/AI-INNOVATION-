import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from app.database import init_db

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

    # 4. Test Misconception Loop & Reteach (Top weighted feature)
    resp = client.post("/api/interact/answer", json={
        "session_id": session_id,
        "segment_id": 1,
        "student_answer": "I think it disappears without any force",
        "force_misconception": True
    })
    assert resp.status_code == 200
    reteach_data = resp.json()
    assert reteach_data["action"] == "reteach"
    assert reteach_data["classification"] == "misconception"
    assert reteach_data["new_analogy"] is not None
    assert reteach_data["reteach_segment"] is not None

def test_multilingual_switch():
    # 1. Create plan
    resp = client.post("/api/lesson/plan", json={
        "topic": "Cellular Biology",
        "time_budget_minutes": 20,
        "language": "en"
    })
    session_id = resp.json()["session_id"]

    # 2. Switch to Hindi
    resp = client.post("/api/lesson/language-switch", json={
        "session_id": session_id,
        "target_language": "hi",
        "current_segment_id": 1
    })
    assert resp.status_code == 200
    assert resp.json()["language"] == "hi"

def test_assessment_and_learning_report():
    # 1. Create plan
    resp = client.post("/api/lesson/plan", json={
        "topic": "Machine Learning Foundations",
        "time_budget_minutes": 20,
        "language": "en"
    })
    session_id = resp.json()["session_id"]

    # 2. Generate quiz
    resp = client.post(f"/api/assess/quiz/{session_id}")
    assert resp.status_code == 200
    quiz_data = resp.json()
    assert len(quiz_data["questions"]) > 0

    # 3. Grade quiz
    answers = {q["id"]: q["correct_answer"] for q in quiz_data["questions"]}
    resp = client.post("/api/assess/grade", json={
        "session_id": session_id,
        "answers": answers
    })
    assert resp.status_code == 200
    grade_data = resp.json()
    assert grade_data["score_percentage"] == 100.0

    # 4. Fetch learning report
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
