from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db, DBLearnerProfile
from ..models.schemas import LearnerProfile, LearnerProfileCreate

router = APIRouter(prefix="/profile", tags=["Learner Profile & History"])

@router.get("/{user_id}", response_model=LearnerProfile)
def get_profile(user_id: str, db: Session = Depends(get_db)):
    p = db.query(DBLearnerProfile).filter(DBLearnerProfile.user_id == user_id).first()
    if not p:
        # Create default profile
        p = DBLearnerProfile(
            user_id=user_id,
            name="Learner",
            level="beginner",
            goal="understand_concept",
            preferred_style="visual",
            language="en",
            history_json=[
                {"session_id": "demo-sess-1", "topic": "Introduction to Physics", "score": 92.0, "date": "2026-08-28"}
            ],
            mastery_json={"Physics": 0.88, "Calculus": 0.76}
        )
        db.add(p)
        db.commit()

    return LearnerProfile(
        user_id=p.user_id,
        name=p.name or "Learner",
        level=p.level or "beginner",
        goal=p.goal or "understand_concept",
        preferred_style=p.preferred_style or "visual",
        language=p.language or "en",
        time_budget_minutes=20,
        depth="standard",
        topics_studied=["Physics Foundations", "Calculus & Derivatives", "Cellular Biology"],
        scores_history=p.history_json or [],
        strong_concepts=["Conservation Laws", "Cellular Respiration"],
        weak_concepts=["Vector Matrix Multiplications"]
    )

@router.post("/{user_id}", response_model=LearnerProfile)
def update_profile(
    user_id: str,
    update_data: LearnerProfileCreate,
    db: Session = Depends(get_db)
):
    p = db.query(DBLearnerProfile).filter(DBLearnerProfile.user_id == user_id).first()
    if not p:
        p = DBLearnerProfile(user_id=user_id)
        db.add(p)
        
    p.name = update_data.name
    p.level = update_data.level
    p.goal = update_data.goal
    p.preferred_style = update_data.preferred_style
    p.language = update_data.language
    db.commit()

    return get_profile(user_id, db)
