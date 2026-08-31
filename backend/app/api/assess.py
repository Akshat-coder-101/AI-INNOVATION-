from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.schemas import Quiz, StudentQuizSubmission, QuizGradeResponse
from ..services.assessment import AssessmentService

router = APIRouter(prefix="/assess", tags=["Assessment & Quiz"])

@router.post("/quiz/{session_id}", response_model=Quiz)
def get_or_generate_quiz(
    session_id: str,
    db: Session = Depends(get_db)
):
    try:
        quiz = AssessmentService.generate_quiz_for_session(session_id, db)
        return quiz
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {str(e)}")

@router.post("/grade", response_model=QuizGradeResponse)
def grade_quiz(
    submission: StudentQuizSubmission,
    db: Session = Depends(get_db)
):
    try:
        res = AssessmentService.grade_quiz_submission(
            session_id=submission.session_id,
            answers=submission.answers,
            db=db
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Grading failed: {str(e)}")
