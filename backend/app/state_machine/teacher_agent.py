import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..database import DBLessonSession, DBMaterial, DBMaterialChunk, DBLearnerProfile
from ..models.schemas import (
    LessonPlan, 
    LessonSegmentPlan, 
    FinalAssessmentSpec, 
    CheckpointQuestion,
    LessonSegmentRender,
    CaptionItem,
    Citation,
    LearnerProfileCreate
)
from ..services.rag import RAGService
from ..services.visual_router import VisualRouter
from ..services.tts import TTSService
from ..services.avatar import AvatarService

class TeacherState:
    UNDERSTAND = "understand"
    PLAN = "plan"
    EXPLAIN = "explain"
    DEMONSTRATE = "demonstrate"
    QUESTION = "question"
    EVALUATE = "evaluate"
    ADAPT = "adapt"
    CONTINUE = "continue"
    ASSESS = "assess"
    REPORT = "report"

class TeacherAgentStateMachine:
    def __init__(self, session_id: str, db: Session):
        self.session_id = session_id
        self.db = db
        self.db_session = self._get_or_create_session()

    def _get_or_create_session(self) -> DBLessonSession:
        s = self.db.query(DBLessonSession).filter(DBLessonSession.id == self.session_id).first()
        if not s:
            s = DBLessonSession(
                id=self.session_id,
                user_id="default-user",
                topic="AI Education",
                state=TeacherState.UNDERSTAND,
                taught_concepts=[],
                analogies_used=[]
            )
            self.db.add(s)
            self.db.commit()
        return s

    def transition_to(self, new_state: str) -> str:
        old_state = self.db_session.state
        self.db_session.state = new_state
        self.db.commit()
        return f"Transitioned from {old_state} -> {new_state}"

    @classmethod
    def generate_lesson_plan(
        cls, 
        topic: Optional[str], 
        material_id: Optional[str], 
        profile: Optional[LearnerProfileCreate], 
        time_budget_minutes: int, 
        language: str, 
        db: Session
    ) -> LessonPlan:
        session_id = str(uuid.uuid4())
        user_id = profile.user_id if profile else "default-user"
        level = profile.level if profile else "beginner"
        style = profile.preferred_style if profile else "visual"
        
        # Grounding check if material_id provided
        effective_topic = topic or "Uploaded Document Learning Unit"
        grounded_context = ""
        citations = []
        if material_id:
            db_mat = db.query(DBMaterial).filter(DBMaterial.id == material_id).first()
            if db_mat:
                effective_topic = f"Study: {db_mat.filename}"
                grounded_context, citations = RAGService.get_grounded_context_and_citations(effective_topic, material_id, db)

        # Structure segments based on time budget per PRD §8.2
        # 5m -> 2 core concepts; 20m -> 4 structured concepts; 60m -> 6 comprehensive concepts
        if time_budget_minutes <= 5:
            segment_configs = [
                {"title": f"Core Principle of {effective_topic}", "depth": level, "est": 2, "visual": "labeled-diagram"},
                {"title": f"Practical Application & Edge Cases", "depth": level, "est": 3, "visual": "equation/graph"}
            ]
        elif time_budget_minutes <= 25:
            segment_configs = [
                {"title": f"1. Foundations & Intuition of {effective_topic}", "depth": level, "est": 4, "visual": "labeled-diagram"},
                {"title": f"2. Mathematical & Formal Derivation", "depth": level, "est": 5, "visual": "equation/graph"},
                {"title": f"3. Algorithmic Demonstration & Code Runner", "depth": level, "est": 6, "visual": "code+execution"},
                {"title": f"4. Historical Context & Real-World Synthesis", "depth": level, "est": 5, "visual": "timeline/map"}
            ]
        else: # 60 min or multi-session
            segment_configs = [
                {"title": f"1. First Principles & Motivation", "depth": level, "est": 8, "visual": "labeled-diagram"},
                {"title": f"2. Formal Axioms & Equations", "depth": level, "est": 10, "visual": "equation/graph"},
                {"title": f"3. System Architecture & Component Interactions", "depth": level, "est": 12, "visual": "labeled-diagram"},
                {"title": f"4. Computational Implementation & Sandbox", "depth": level, "est": 12, "visual": "code+execution"},
                {"title": f"5. Evolution, History & Paradigms", "depth": level, "est": 10, "visual": "timeline/map"},
                {"title": f"6. Mastery Synthesis & Complex Edge Cases", "depth": level, "est": 8, "visual": "equation/graph"}
            ]

        segments: List[LessonSegmentPlan] = []
        for idx, sc in enumerate(segment_configs):
            seg_id = idx + 1
            concept_name = sc["title"]
            
            # Checkpoint Question
            checkpoint_q = CheckpointQuestion(
                type="mcq",
                question=f"In the context of {concept_name}, what is the critical determining condition?",
                options=[
                    f"A) The system maintains dynamic conservation and predictable state transitions.",
                    f"B) The process occurs in complete isolation without energy exchange.",
                    f"C) Boundary values are purely arbitrary and non-measurable.",
                    f"D) All state variables decay immediately to zero."
                ],
                correct_answer=f"A) The system maintains dynamic conservation and predictable state transitions.",
                hints=[f"Recall the equilibrium rule discussed in {concept_name}."],
                concept_tested=concept_name
            )

            segments.append(LessonSegmentPlan(
                id=seg_id,
                concept=concept_name,
                depth=sc["depth"],
                est_minutes=sc["est"],
                visual_type=sc["visual"],
                checkpoint_question=checkpoint_q,
                summary=f"In this segment, we systematically examine {concept_name} tailored for {level} level learners."
            ))

        objectives = [
            f"Master core intuitive mental models of {effective_topic}",
            f"Derive mathematical and computational rules governing the system",
            f"Identify failure modes, misconceptions, and solve interactive checkpoints"
        ]

        plan = LessonPlan(
            session_id=session_id,
            topic=effective_topic,
            objectives=objectives,
            time_budget_minutes=time_budget_minutes,
            learner_level=level,
            language=language,
            segments=segments,
            final_assessment=FinalAssessmentSpec(type="quiz", question_count=len(segments) + 1),
            material_id=material_id
        )

        # Persist session
        db_sess = DBLessonSession(
            id=session_id,
            user_id=user_id,
            topic=effective_topic,
            language=language,
            time_budget=time_budget_minutes,
            current_segment_id=1,
            state=TeacherState.EXPLAIN,
            plan_json=plan.model_dump(),
            taught_concepts=[s.concept for s in segments],
            analogies_used=[]
        )
        db.add(db_sess)
        db.commit()

        return plan

    @classmethod
    async def render_segment(
        cls, 
        session_id: str, 
        segment_id: int, 
        language: Optional[str], 
        db: Session
    ) -> LessonSegmentRender:
        db_sess = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        if not db_sess:
            raise ValueError(f"Session {session_id} not found")

        plan_data = db_sess.plan_json or {}
        segments = plan_data.get("segments", [])
        seg = next((s for s in segments if s.get("id") == segment_id), None)
        if not seg:
            seg = segments[0] if segments else {"id": 1, "concept": db_sess.topic, "visual_type": "labeled-diagram"}

        concept = seg.get("concept", db_sess.topic)
        visual_type = seg.get("visual_type", "labeled-diagram")
        active_lang = language or db_sess.language or "en"
        
        # Build citations if material attached
        material_id = plan_data.get("material_id")
        citations = []
        if material_id:
            _, citations = RAGService.get_grounded_context_and_citations(concept, material_id, db)

        # Multilingual Script Generation
        if active_lang == "hi":
            spoken_script = f"नमस्ते! आज हम {concept} के बारे में गहराई से समझेंगे। यह विषय विज्ञान और व्यावहारिक अनुप्रयोगों के लिए अत्यंत महत्वपूर्ण है। ध्यान से देखें कि कैसे प्रत्येक घटक एक दूसरे से जुड़ा हुआ है।"
            on_screen_text = f"📚 मुख्य विषय: {concept}\n\n• अवधारणा का परिचय और बुनियादी सिद्धांत\n• मुख्य नियम और गणितीय समीकरण\n• व्यावहारिक अनुप्रयोग"
        elif active_lang == "hinglish":
            spoken_script = f"Hey everyone! Aaj hum master karenge {concept}. Yeh concept samajhna bohot simple hai jab aap first principles se start karte hain. On-screen visuals ko dhyan se dekhiye."
            on_screen_text = f"🚀 Topic: {concept}\n\n• First-principles intuition\n• Core rules & equations\n• Real-world demo"
        else:
            spoken_script = f"Welcome! Today we will explore {concept}. As we break down this concept from first principles, observe how each fundamental rule interacts to create predictable behavior."
            on_screen_text = f"🎯 Key Focus: {concept}\n\n• First-principles derivation\n• Governing rules & dynamic equations\n• Interactive checkpoint"

        # Generate Visual Spec
        visual_spec = VisualRouter.generate_visual_spec(concept, visual_type, seg.get("depth", "beginner"))

        # Captions with timestamps
        captions = [
            CaptionItem(start_sec=0.0, end_sec=3.5, text=f"Welcome! Let's explore {concept}."),
            CaptionItem(start_sec=3.5, end_sec=8.0, text="Observe the interactive visual on the right carefully."),
            CaptionItem(start_sec=8.0, end_sec=13.0, text="Notice how each state variable changes dynamically over time.")
        ]

        checkpoint_q_data = seg.get("checkpoint_question") or {
            "id": str(uuid.uuid4()),
            "type": "mcq",
            "question": f"What is the key takeaway of {concept}?",
            "options": ["A) Dynamic equilibrium", "B) Total entropy decay", "C) Arbitrary fluctuation", "D) Zero conservation"],
            "correct_answer": "A) Dynamic equilibrium",
            "concept_tested": concept
        }
        checkpoint_q = CheckpointQuestion(**checkpoint_q_data)

        # Avatar video / synthesized asset
        avatar_res = await AvatarService.generate_avatar_video(spoken_script)
        
        return LessonSegmentRender(
            segment_id=segment_id,
            session_id=session_id,
            concept=concept,
            spoken_script=spoken_script,
            on_screen_text=on_screen_text,
            visual_spec=visual_spec,
            avatar_video_url=avatar_res.get("video_url"),
            captions=captions,
            citations=citations,
            checkpoint_question=checkpoint_q,
            analogies_used=db_sess.analogies_used or [],
            language=active_lang,
            is_reteach=False
        )
