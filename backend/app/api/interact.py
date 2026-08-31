from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.schemas import StudentAnswerRequest, InteractionResponse
from ..services.evaluator import EvaluatorService

router = APIRouter(prefix="/interact", tags=["Interactivity & Misconception Loop"])

@router.post("/answer", response_model=InteractionResponse)
async def evaluate_answer(
    req: StudentAnswerRequest,
    db: Session = Depends(get_db)
):
    try:
        res = await EvaluatorService.evaluate_student_answer(
            session_id=req.session_id,
            segment_id=req.segment_id,
            student_answer=req.student_answer,
            is_demo_mode=req.is_demo_mode,
            force_misconception=req.force_misconception,
            db=db
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interaction evaluation failed: {str(e)}")
