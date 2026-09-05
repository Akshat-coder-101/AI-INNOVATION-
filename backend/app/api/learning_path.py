from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models.schemas import LearningPath, LearningRecommendationResult
from ..services.learning_path import LearningPathService

router = APIRouter(prefix="/learning-path", tags=["Curriculum Learning Path DAG"])

class LearningPathCreateRequest(BaseModel):
    topic: str
    user_id: Optional[str] = "default-user"
    goal: Optional[str] = "understand_concept"
    learner_level: Optional[str] = "beginner"
    force_regenerate: bool = False

@router.post("", response_model=LearningPath)
@router.post("/generate", response_model=LearningPath)
async def create_or_generate_path(
    req: LearningPathCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        topic_id = req.topic.lower().strip().replace(" ", "-")
        return await LearningPathService.generate_or_get_learning_path(
            topic_id=topic_id,
            user_id=req.user_id or "default-user",
            db=db,
            goal=req.goal,
            learner_level=req.learner_level,
            force_regenerate=req.force_regenerate
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate learning path: {str(e)}")

@router.get("/{topic_id}", response_model=LearningPath)
async def get_topic_path(
    topic_id: str,
    user_id: str = Query("default-user"),
    db: Session = Depends(get_db)
):
    try:
        clean_id = topic_id.lower().strip()
        return await LearningPathService.generate_or_get_learning_path(clean_id, user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load learning path: {str(e)}")

@router.get("/{topic_id}/next", response_model=LearningRecommendationResult)
def get_next_topic_recommendation(
    topic_id: str,
    user_id: str = Query("default-user"),
    db: Session = Depends(get_db)
):
    try:
        clean_id = topic_id.lower().strip()
        return LearningPathService.get_next_topic_recommendation(clean_id, user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get next recommendation: {str(e)}")

@router.post("/{topic_id}/regenerate", response_model=LearningPath)
async def regenerate_path(
    topic_id: str,
    req: Optional[LearningPathCreateRequest] = None,
    user_id: str = Query("default-user"),
    db: Session = Depends(get_db)
):
    try:
        clean_id = topic_id.lower().strip()
        eff_user = (req.user_id if req and req.user_id else None) or user_id
        eff_goal = (req.goal if req and req.goal else None) or "understand_concept"
        eff_level = (req.learner_level if req and req.learner_level else None) or "beginner"
        return await LearningPathService.generate_or_get_learning_path(
            topic_id=clean_id,
            user_id=eff_user,
            db=db,
            goal=eff_goal,
            learner_level=eff_level,
            force_regenerate=True
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate learning path: {str(e)}")

@router.post("/{topic_id}/toggle-node/{node_id}", response_model=LearningPath)
async def toggle_node(
    topic_id: str,
    node_id: str,
    user_id: str = Query("default-user"),
    db: Session = Depends(get_db)
):
    try:
        clean_id = topic_id.lower().strip()
        return await LearningPathService.toggle_node_completion(clean_id, user_id, node_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle node: {str(e)}")
