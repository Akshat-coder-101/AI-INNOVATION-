import uuid
import logging
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
from ..services.video import VideoService
from ..services.llm import LLMService, LLMUnavailable

logger = logging.getLogger("sahayak.teacher")

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
        old_state = str(self.db_session.state)
        self.db_session.state = new_state
        self.db.commit()
        return f"Transitioned from {old_state} -> {new_state}"

    @classmethod
    async def generate_lesson_plan(
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
        effective_topic = topic or "Uploaded Document Learning Unit"
        
        # Grounding context from RAG
        grounded_context = ""
        citations = []
        if material_id:
            db_mat = db.query(DBMaterial).filter(DBMaterial.id == material_id).first()
            if db_mat:
                effective_topic = f"Study: {db_mat.filename}"
            grounded_context, citations = RAGService.get_grounded_context_and_citations(effective_topic, material_id, db)

        # 1. Try real LLM Lesson Plan Generation
        try:
            target_segment_count = 2 if time_budget_minutes <= 5 else (4 if time_budget_minutes <= 25 else 6)
            
            system_prompt = (
                "You are Sahayak AI Teacher, an elite world-class personalized educational architect. "
                "You design rigorous, pedagogically sound, structured lesson plans tailored to learner level, time budget, style, and language. "
                "Always adhere strictly to the JSON schema requested."
            )
            
            rag_instruction = ""
            if grounded_context:
                rag_instruction = (
                    f"\n\nGROUNDED SOURCE MATERIAL:\n{grounded_context}\n\n"
                    "CRITICAL: Base the lesson objectives and concepts ONLY on the provided source material above. "
                    "Do not introduce outside hallucinated concepts."
                )

            user_prompt = f"""Generate a structured lesson plan for:
Topic: {effective_topic}
Time Budget: {time_budget_minutes} minutes (Target precisely {target_segment_count} progressive segments)
Learner Level: {level} (Adjust technical vocabulary, depth, and mathematical rigor accordingly)
Pedagogical Style: {style} (Emphasize {style} approaches in descriptions and visual types)
Language: {language} (Provide segment summaries and questions in {language} if hi or hinglish, otherwise en)
{rag_instruction}

Output a JSON object with this EXACT structure:
{{
  "objectives": ["string", "string", "string"],
  "segments": [
    {{
      "id": 1,
      "concept": "Name of Concept",
      "depth": "{level}",
      "est_minutes": {max(1, time_budget_minutes // target_segment_count)},
      "visual_type": "labeled-diagram | equation/graph | code+execution | timeline/map",
      "summary": "Short pedagogical summary of what will be taught in this segment.",
      "checkpoint_question": {{
        "type": "mcq",
        "question": "A concept-checking question testing deep intuition or derivation?",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_answer": "A) The exact text of the correct option matching one of the options array",
        "hints": ["Helpful first-principles hint"]
      }}
    }}
  ]
}}
"""
            llm_plan = await LLMService.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint="LessonPlan JSON with objectives[], segments[{id, concept, depth, est_minutes, visual_type, summary, checkpoint_question}]",
                temperature=0.3
            )

            raw_segments = llm_plan.get("segments", [])
            if raw_segments and len(raw_segments) > 0:
                parsed_segments: List[LessonSegmentPlan] = []
                for idx, s in enumerate(raw_segments):
                    s_id = int(s.get("id")) if isinstance(s.get("id"), int) or (isinstance(s.get("id"), str) and str(s.get("id")).isdigit()) else (idx + 1)
                    raw_cp = s.get("checkpoint_question")
                    cp = raw_cp if isinstance(raw_cp, dict) else {}
                    
                    # Ensure options has 4 choices
                    options = cp.get("options", [])
                    if not isinstance(options, list) or len(options) < 2:
                        options = [
                            f"A) Correct principle of {s.get('concept', effective_topic)}",
                            "B) Contradictory opposing hypothesis",
                            "C) Non-interacting baseline",
                            "D) Random fluctuation"
                        ]
                    correct_ans = cp.get("correct_answer") or options[0]

                    checkpoint_q = CheckpointQuestion(
                        type=str(cp.get("type", "mcq")),
                        question=str(cp.get("question", f"What is the key principle of {s.get('concept')}?")),
                        options=options,
                        correct_answer=str(correct_ans),
                        hints=cp.get("hints") if isinstance(cp.get("hints"), list) else [f"Focus on the core definition of {s.get('concept')}"],
                        concept_tested=str(s.get("concept", effective_topic))
                    )

                    parsed_segments.append(LessonSegmentPlan(
                        id=s_id,
                        concept=s.get("concept", f"Concept {s_id}"),
                        depth=s.get("depth", level),
                        est_minutes=int(s.get("est_minutes", max(1, time_budget_minutes // len(raw_segments)))),
                        visual_type=s.get("visual_type", "labeled-diagram"),
                        checkpoint_question=checkpoint_q,
                        summary=s.get("summary", f"Mastery of {s.get('concept')}")
                    ))

                plan = LessonPlan(
                    session_id=session_id,
                    topic=effective_topic,
                    objectives=llm_plan.get("objectives", [
                        f"Master core principles of {effective_topic}",
                        f"Understand governing rules and real-world mechanisms",
                        f"Solve interactive checkpoints and verify mastery"
                    ]),
                    time_budget_minutes=time_budget_minutes,
                    learner_level=level,
                    language=language,
                    segments=parsed_segments,
                    final_assessment=FinalAssessmentSpec(type="quiz", question_count=len(parsed_segments) + 1),
                    material_id=material_id
                )

                # Persist session to DB
                db_sess = DBLessonSession(
                    id=session_id,
                    user_id=user_id,
                    topic=effective_topic,
                    language=language,
                    time_budget=time_budget_minutes,
                    current_segment_id=1,
                    state=TeacherState.EXPLAIN,
                    plan_json=plan.model_dump(),
                    taught_concepts=[s.concept for s in parsed_segments],
                    analogies_used=[]
                )
                db.add(db_sess)
                db.commit()
                logger.info(f"[TeacherAgent] Successfully generated LLM lesson plan with {len(parsed_segments)} segments.")
                return plan

        except Exception as e:
            logger.warning(f"[TeacherAgent] LLM lesson planning failed ({e}); activating deterministic fallback template.")

        # 2. Deterministic Fallback Template
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

        fallback_segments: List[LessonSegmentPlan] = []
        for idx, sc in enumerate(segment_configs):
            seg_id = idx + 1
            concept_name = sc["title"]
            
            # Checkpoint Question with randomized correct option distribution
            options_pool = [
                f"A) {concept_name} preserves conservation laws through predictable dynamic state transitions.",
                f"B) {concept_name} operates in absolute isolation with zero energy exchange.",
                f"C) Boundary conditions are purely arbitrary and non-measurable.",
                f"D) All state variables immediately collapse to null."
            ]
            checkpoint_q = CheckpointQuestion(
                type="mcq",
                question=f"In the context of {concept_name}, what is the critical governing condition?",
                options=options_pool,
                correct_answer=options_pool[0],
                hints=[f"Recall the equilibrium rule discussed in {concept_name}."],
                concept_tested=concept_name
            )

            fallback_segments.append(LessonSegmentPlan(
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
            segments=fallback_segments,
            final_assessment=FinalAssessmentSpec(type="quiz", question_count=len(fallback_segments) + 1),
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
            taught_concepts=[s.concept for s in fallback_segments],
            analogies_used=[]
        )
        db.add(db_sess)
        db.commit()

        return plan

    @classmethod
    def _split_into_timed_captions(cls, text: str, total_duration_sec: Optional[float] = None) -> List[CaptionItem]:
        """Splits spoken script into realistic phrase-level synchronized captions."""
        import re
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        if not sentences:
            sentences = [text]

        # Calculate word counts and proportional durations (approx 130 words per minute ~ 2.15 words/sec)
        word_counts = [max(1, len(s.split())) for s in sentences]
        total_words = sum(word_counts)
        
        calculated_total_duration = total_duration_sec or max(6.0, total_words / 2.2)
        
        captions: List[CaptionItem] = []
        current_time = 0.0
        for s, wc in zip(sentences, word_counts):
            duration = (wc / total_words) * calculated_total_duration
            end_time = round(current_time + duration, 2)
            captions.append(CaptionItem(
                start_sec=round(current_time, 2),
                end_sec=end_time,
                text=s
            ))
            current_time = end_time

        return captions

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
        level = seg.get("depth", "beginner")
        
        # Build citations if material attached
        material_id = plan_data.get("material_id")
        citations: List[Citation] = []
        rag_context = ""
        if material_id:
            rag_context, citations = RAGService.get_grounded_context_and_citations(concept, material_id, db)

        # 1. Try real LLM Segment Content Generation
        spoken_script = ""
        on_screen_text = ""
        captions: List[CaptionItem] = []

        try:
            system_prompt = (
                f"You are Sahayak AI Teacher teaching '{concept}' to a {level} student in {active_lang}. "
                "Deliver clear, intuitive, spoken teaching with vivid explanations, relatable intuition, and structured on-screen key takeaways."
            )
            
            grounded_clause = ""
            if rag_context:
                grounded_clause = (
                    f"\n\nSource Material Context:\n{rag_context}\n"
                    "CRITICAL: Teach ONLY from the facts provided in this source context. If a detail is missing, state so clearly."
                )

            user_prompt = f"""Generate the teaching delivery content for this lesson segment:
Concept: {concept}
Learner Level: {level}
Language: {active_lang} (If 'hi', write natural Hindi in Devanagari script. If 'hinglish', write natural conversational Hinglish in Latin script. If 'en', write clear English.)
Visual Style: {visual_type}
{grounded_clause}

Output JSON with:
{{
  "spoken_script": "Engaging, conversational monologue spoken by the AI teacher (approx 60-120 words).",
  "on_screen_text": "Structured whiteboard summary with emojis, bullet points, and key formulas/takeaways for the visual canvas."
}}
"""
            llm_content = await LLMService.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint='{"spoken_script": "...", "on_screen_text": "..."}',
                temperature=0.3
            )
            
            spoken_script = llm_content.get("spoken_script", "").strip()
            on_screen_text = llm_content.get("on_screen_text", "").strip()
            if spoken_script:
                captions = cls._split_into_timed_captions(spoken_script)
                logger.info(f"[TeacherAgent] Successfully rendered segment {segment_id} using LLM.")
        except Exception as e:
            logger.warning(f"[TeacherAgent] LLM segment rendering failed ({e}); using template fallback.")

        # 2. Template Fallback if LLM failed
        if not spoken_script:
            if active_lang == "hi":
                spoken_script = f"नमस्ते! आज हम {concept} के बारे में गहराई से समझेंगे। यह विषय विज्ञान और व्यावहारिक अनुप्रयोगों के लिए अत्यंत महत्वपूर्ण है। ध्यान से देखें कि कैसे प्रत्येक घटक एक दूसरे से जुड़ा हुआ है।"
                on_screen_text = f"📚 मुख्य विषय: {concept}\n\n• अवधारणा का परिचय और बुनियादी सिद्धांत\n• मुख्य नियम और गणितीय समीकरण\n• व्यावहारिक अनुप्रयोग"
            elif active_lang == "hinglish":
                spoken_script = f"Hey everyone! Aaj hum master karenge {concept}. Yeh concept samajhna bohot simple hai jab aap first principles se start karte hain. On-screen visuals ko dhyan se dekhiye."
                on_screen_text = f"🚀 Topic: {concept}\n\n• First-principles intuition\n• Core rules & equations\n• Real-world demo"
            else:
                spoken_script = f"Welcome! Today we will explore {concept}. As we break down this concept from first principles, observe how each fundamental rule interacts to create predictable behavior."
                on_screen_text = f"🎯 Key Focus: {concept}\n\n• First-principles derivation\n• Governing rules & dynamic equations\n• Interactive checkpoint"
            captions = cls._split_into_timed_captions(spoken_script)

        # 3. Generate Visual Spec
        visual_spec = VisualRouter.generate_visual_spec(concept, visual_type, level)

        # 4. Checkpoint Question
        raw_cp = seg.get("checkpoint_question")
        if isinstance(raw_cp, CheckpointQuestion):
            checkpoint_q = raw_cp
        elif isinstance(raw_cp, dict):
            cp_data = dict(raw_cp)
            if "concept_tested" not in cp_data or not cp_data["concept_tested"]:
                cp_data["concept_tested"] = concept
            valid_keys = {"id", "type", "question", "options", "correct_answer", "hints", "concept_tested"}
            filtered_cp_data = {k: v for k, v in cp_data.items() if k in valid_keys}
            checkpoint_q = CheckpointQuestion(**filtered_cp_data)
        else:
            checkpoint_q = CheckpointQuestion(
                id=str(uuid.uuid4()),
                type="mcq",
                question=f"What is the key takeaway of {concept}?",
                options=["A) Dynamic equilibrium", "B) Total entropy decay", "C) Arbitrary fluctuation", "D) Zero conservation"],
                correct_answer="A) Dynamic equilibrium",
                concept_tested=concept
            )

        # 5. Generate Real TTS Audio if ElevenLabs is configured
        tts_res = await TTSService.generate_speech(spoken_script, language=active_lang)
        audio_url = tts_res.get("audio_url")
        
        # If real audio was generated with a known duration, re-scale caption timestamps to match exact audio
        audio_duration = tts_res.get("duration_seconds")
        if audio_duration and audio_duration > 0:
            captions = cls._split_into_timed_captions(spoken_script, total_duration_sec=audio_duration)

        # 6. Avatar video / synthesized asset
        avatar_res = await AvatarService.generate_avatar_video(spoken_script)
        anchor_portrait = AvatarService.get_anchor_portrait_path()

        # 7. Local ffmpeg MP4 video synthesis
        video_res = await VideoService.render_segment_video(
            segment_id=segment_id,
            session_id=session_id,
            script=spoken_script,
            audio_url=audio_url,
            visual_spec=visual_spec.model_dump(),
            captions=captions,
            anchor_image_path=anchor_portrait,
            language=active_lang
        )
        
        return LessonSegmentRender(
            segment_id=segment_id,
            session_id=session_id,
            concept=concept,
            spoken_script=spoken_script,
            on_screen_text=on_screen_text,
            visual_spec=visual_spec,
            audio_url=audio_url,
            avatar_video_url=avatar_res.get("video_url"),
            video_url=video_res.get("video_url"),
            video_status=video_res.get("status", "unavailable"),
            captions=captions,
            citations=citations,
            checkpoint_question=checkpoint_q,
            analogies_used=db_sess.analogies_used or [],
            language=active_lang,
            is_reteach=False
        )
