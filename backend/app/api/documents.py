from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from ..database import get_db
from ..services.ingestion import IngestionService
from ..models.schemas import (
    DocumentUploadResponse, 
    LessonPlan, 
    LearnerProfileCreate
)
from ..state_machine.teacher_agent import TeacherAgentStateMachine

router = APIRouter(prefix="/documents", tags=["Documents & RAG Grounding"])

class DocumentPlanRequest(BaseModel):
    time_budget_minutes: Optional[int] = 20
    language: Optional[str] = "en"
    learner_profile: Optional[LearnerProfileCreate] = None

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload and ingest PDF, DOCX, PPTX, or TXT documents.
    Enforces maximum upload size (25MB), file type restrictions, non-empty content,
    and safe disk persistence before chunking, embedding, and extracting key topics.
    """
    try:
        content = await file.read()
        filename = file.filename or "uploaded_document.txt"
        
        # Validation and ingestion pipeline
        result = await IngestionService.process_document_upload(
            filename=filename,
            content=content,
            db=db
        )
        return DocumentUploadResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document ingestion failed: {str(e)}"
        )

@router.post("/{document_id}/plan", response_model=LessonPlan)
async def plan_lesson_from_document(
    document_id: str,
    req: DocumentPlanRequest = DocumentPlanRequest(),
    db: Session = Depends(get_db)
):
    """
    Generate a strictly grounded adaptive lesson plan from an ingested document.
    Segments cover representative chunks across the document and contain source citations.
    """
    try:
        plan = await TeacherAgentStateMachine.plan_from_document(
            document_id=document_id,
            time_budget_minutes=req.time_budget_minutes or 20,
            language=req.language or "en",
            learner_profile=req.learner_profile,
            db=db
        )
        return plan
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Grounded lesson planning failed: {str(e)}"
        )
