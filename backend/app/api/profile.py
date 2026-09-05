from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..database import get_db, DBLearnerProfile
from ..models.schemas import LearnerProfile, LearnerProfileCreate
from ..services.learner_profile import LearnerProfileService

router = APIRouter(prefix="/profile", tags=["Learner Profile & History"])

@router.get("/{user_id}", response_model=LearnerProfile)
def get_profile(user_id: str, db: Session = Depends(get_db)):
    try:
        return LearnerProfileService.get_full_learner_profile(user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@router.post("/{user_id}", response_model=LearnerProfile)
def update_profile(
    user_id: str,
    update_data: LearnerProfileCreate,
    db: Session = Depends(get_db)
):
    try:
        p = LearnerProfileService.get_or_create_profile(user_id, db)
        p.name = update_data.name
        p.level = update_data.level
        p.goal = update_data.goal
        p.preferred_style = update_data.preferred_style
        p.language = update_data.language
        db.commit()

        return LearnerProfileService.get_full_learner_profile(user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")

@router.get("/{user_id}/learning-history", response_model=List[Dict[str, Any]])
def get_learning_history(user_id: str, db: Session = Depends(get_db)):
    try:
        return LearnerProfileService.get_learning_history(user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch learning history: {str(e)}")
