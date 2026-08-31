from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from ..database import get_db, DBLessonSession
from ..models.schemas import (
    LessonPlan, 
    LessonPlanRequest, 
    LessonSegmentRender, 
    LanguageSwitchRequest
)
from ..state_machine.teacher_agent import TeacherAgentStateMachine

router = APIRouter(prefix="/lesson", tags=["Lesson Planning & Rendering"])

class SegmentRenderPayload(BaseModel):
    session_id: Optional[str] = None
    language: Optional[str] = None

@router.post("/plan", response_model=LessonPlan)
def create_lesson_plan(
    req: LessonPlanRequest,
    db: Session = Depends(get_db)
):
    try:
        plan = TeacherAgentStateMachine.generate_lesson_plan(
            topic=req.topic,
            material_id=req.material_id,
            profile=req.learner_profile,
            time_budget_minutes=req.time_budget_minutes or 20,
            language=req.language or "en",
            db=db
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lesson planning failed: {str(e)}")

@router.get("/plan/{session_id}", response_model=LessonPlan)
@router.get("/plan", response_model=LessonPlan)
def get_lesson_plan(
    session_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    if not session_id:
        # Fetch the latest session as fallback
        sess = db.query(DBLessonSession).order_by(DBLessonSession.created_at.desc()).first()
    else:
        sess = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()

    if not sess or not sess.plan_json:
        raise HTTPException(status_code=404, detail="Session not found")
    
    plan_data = sess.plan_json
    if isinstance(plan_data, str):
        import json
        try:
            plan_data = json.loads(plan_data)
        except Exception:
            pass
            
    return LessonPlan.model_validate(plan_data)

@router.api_route("/segment/{segment_id}/render", methods=["GET", "POST"], response_model=LessonSegmentRender)
async def render_segment(
    segment_id: int,
    session_id: Optional[str] = Query(None),
    language: Optional[str] = Query(None),
    body: Optional[SegmentRenderPayload] = Body(None),
    db: Session = Depends(get_db)
):
    try:
        # Extract session_id from query or body
        effective_session_id = session_id or (body.session_id if body else None)
        effective_lang = language or (body.language if body else None)

        if not effective_session_id:
            # Fallback to latest session in DB
            sess = db.query(DBLessonSession).order_by(DBLessonSession.created_at.desc()).first()
            if sess:
                effective_session_id = sess.id
            else:
                # Create a demo session on the fly
                plan = TeacherAgentStateMachine.generate_lesson_plan(
                    topic="Newton's Laws and Mechanical Energy",
                    material_id=None,
                    profile=None,
                    time_budget_minutes=20,
                    language="en",
                    db=db
                )
                effective_session_id = plan.session_id

        segment_payload = await TeacherAgentStateMachine.render_segment(
            session_id=effective_session_id,
            segment_id=segment_id,
            language=effective_lang,
            db=db
        )
        return segment_payload
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Segment rendering failed: {str(e)}")

@router.post("/language-switch", response_model=LessonSegmentRender)
async def switch_language(
    req: LanguageSwitchRequest,
    db: Session = Depends(get_db)
):
    sess = db.query(DBLessonSession).filter(DBLessonSession.id == req.session_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")

    sess.language = req.target_language
    db.commit()

    # Regenerate current segment without losing progress or analogies
    segment_payload = await TeacherAgentStateMachine.render_segment(
        session_id=req.session_id,
        segment_id=req.current_segment_id,
        language=req.target_language,
        db=db
    )
    return segment_payload
