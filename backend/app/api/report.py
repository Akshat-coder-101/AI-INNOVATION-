from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.schemas import LearningReport
from ..services.assessment import AssessmentService

router = APIRouter(prefix="/report", tags=["Learning Report"])

@router.get("/{session_id}", response_model=LearningReport)
async def get_session_report(
    session_id: str,
    db: Session = Depends(get_db)
):
    try:
        report = await AssessmentService.build_learning_report(session_id, db)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report build failed: {str(e)}")
