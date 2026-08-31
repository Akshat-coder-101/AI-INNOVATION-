from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from ..database import get_db
from ..models.schemas import LearningPath
from ..services.learning_path import LearningPathService

router = APIRouter(prefix="/learning-path", tags=["Curriculum Learning Path DAG"])

class LearningPathCreateRequest(BaseModel):
    topic: str
    user_id: Optional[str] = "default-user"

@router.post("", response_model=LearningPath)
def create_or_generate_path(
    req: LearningPathCreateRequest,
    db: Session = Depends(get_db)
):
    try:
        topic_id = req.topic.lower().replace(" ", "-")
        return LearningPathService.generate_or_get_learning_path(topic_id, req.user_id or "default-user", db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate learning path: {str(e)}")

@router.get("/{topic_id}", response_model=LearningPath)
def get_topic_path(
    topic_id: str,
    user_id: str = Query("default-user"),
    db: Session = Depends(get_db)
):
    try:
        return LearningPathService.generate_or_get_learning_path(topic_id, user_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load learning path: {str(e)}")

@router.post("/{topic_id}/toggle-node/{node_id}", response_model=LearningPath)
def toggle_node(
    topic_id: str,
    node_id: str,
    user_id: str = Query("default-user"),
    db: Session = Depends(get_db)
):
    try:
        return LearningPathService.toggle_node_completion(topic_id, user_id, node_id, db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle node: {str(e)}")
