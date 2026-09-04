import uuid
import random
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..database import (
    DBLessonSession, 
    DBQuiz, 
    DBQuizAttempt, 
    DBLearningReport, 
    DBLearnerProfile,
    DBCheckpointAttempt,
    DBMaterialChunk
)
from ..models.schemas import (
    Quiz, 
    QuizQuestion, 
    QuizGradeResponse, 
    QuestionGradeResult, 
    LearningReport,
    GapMapItem,
    Citation
)
from .llm import LLMService, LLMUnavailable

logger = logging.getLogger("sahayak.assessment")

GROUNDING_GUARDRAIL_PROMPT = (
    "Teach and test ONLY from the provided source material. Cite it. "
    "If the student asks about something not covered by these sources, "
    "say it is outside this document — do not invent it."
)

class AssessmentService:
    @classmethod
    async def generate_quiz_for_session(cls, session_id: str, db: Session) -> Quiz:
        session = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        topic = session.topic if session else "Foundational Principles"
        plan = session.plan_json if session and session.plan_json else {}
        segments = plan.get("segments", []) if isinstance(plan, dict) else []
        material_id = plan.get("material_id") or plan.get("document_id") if isinstance(plan, dict) else None
        
        # Build segment mapping and chunk references
        segment_chunk_map: Dict[int, Dict[str, Any]] = {}
        for s in segments:
            if isinstance(s, dict):
                s_id = s.get("id", 1)
                s_cites = s.get("source_citations", []) or s.get("citations", [])
                c_id = None
                if s_cites and len(s_cites) > 0:
                    first_cite = s_cites[0]
                    c_id = first_cite.get("chunk_id") if isinstance(first_cite, dict) else getattr(first_cite, "chunk_id", None)
                segment_chunk_map[s_id] = {
                    "concept": s.get("concept", topic),
                    "chunk_id": c_id,
                    "summary": s.get("summary", "")
                }

        taught_concepts = [s.get("concept", topic) for s in segments if isinstance(s, dict)]
        if not taught_concepts and session and session.taught_concepts:
            taught_concepts = session.taught_concepts
        if not taught_concepts:
            taught_concepts = [topic]

        # Fetch sample chunks if material_id attached
        doc_chunks = []
        if material_id:
            doc_chunks = db.query(DBMaterialChunk).filter(DBMaterialChunk.material_id == material_id).limit(8).all()

        questions: List[QuizQuestion] = []

        # 1. Try real LLM Quiz Generation
        try:
            chunk_excerpts = ""
            if doc_chunks:
                chunk_excerpts = "\n\nDOCUMENT SOURCE EXCERPTS:\n" + "\n".join([
                    f"[Chunk {c.id}, Page {c.page or 1}, Section {c.chapter}]: {c.content[:200]}"
                    for c in doc_chunks
                ])

            system_prompt = (
                "You are an expert psychometric test designer and AI tutor. "
                f"{GROUNDING_GUARDRAIL_PROMPT} "
                "Generate rigorous, concept-grounded assessment questions based EXCLUSIVELY on the concepts and source excerpts provided. "
                "CRITICAL: Randomize the correct answer position across options (do NOT always make option A correct)."
            )

            user_prompt = f"""Generate a 4-question mastery quiz for:
Topic: {topic}
Concepts Covered: {taught_concepts}
{chunk_excerpts}

CRITICAL: {GROUNDING_GUARDRAIL_PROMPT}
Map each question to its corresponding taught concept and cited chunk ID if present.

JSON format expected:
{{
  "questions": [
    {{
      "concept": "Name of taught concept",
      "type": "mcq",
      "question": "Clear conceptual question testing derivation or application from source document?",
      "options": [
        "A) Choice text",
        "B) Choice text",
        "C) Choice text",
        "D) Choice text"
      ],
      "correct_answer": "B) Choice text (must exactly match the correct option in options array)",
      "explanation": "Detailed pedagogical explanation of why this answer is correct according to the document.",
      "chunk_id": "chunk_id_if_applicable"
    }}
  ]
}}
"""
            llm_quiz = await LLMService.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint='{"questions": [{"concept": "...", "type": "mcq", "question": "...", "options": ["A) ...", ...], "correct_answer": "...", "explanation": "...", "chunk_id": "..."}]}',
                temperature=0.3
            )

            raw_qs = llm_quiz.get("questions", [])
            if raw_qs and len(raw_qs) > 0:
                for idx, q in enumerate(raw_qs):
                    opts = q.get("options", [])
                    if len(opts) < 2:
                        opts = ["A) Option A", "B) Option B", "C) Option C", "D) Option D"]
                    corr = q.get("correct_answer") or opts[0]
                    q_concept = q.get("concept", topic)
                    
                    # Associate with segment_id and chunk_id
                    assigned_seg_id = idx + 1
                    assigned_chunk_id = q.get("chunk_id")
                    if not assigned_chunk_id and assigned_seg_id in segment_chunk_map:
                        assigned_chunk_id = segment_chunk_map[assigned_seg_id].get("chunk_id")
                    if not assigned_chunk_id and doc_chunks:
                        assigned_chunk_id = doc_chunks[min(idx, len(doc_chunks) - 1)].id

                    questions.append(QuizQuestion(
                        id=str(uuid.uuid4()),
                        type=q.get("type", "mcq"),
                        concept=q_concept,
                        question=q.get("question", f"Question on {q_concept}"),
                        options=opts,
                        correct_answer=corr,
                        explanation=q.get("explanation", f"Correct principle regarding {q_concept}"),
                        chunk_id=assigned_chunk_id,
                        segment_id=assigned_seg_id
                    ))
                logger.info(f"[AssessmentService] Generated {len(questions)} grounded quiz questions using LLM.")
        except Exception as e:
            logger.warning(f"[AssessmentService] LLM quiz generation failed ({e}); using diversified procedural generator.")

        # 2. Procedural Fallback if LLM failed or offline
        if not questions:
            option_keys = ["A", "B", "C", "D"]
            for idx, concept in enumerate(taught_concepts[:4] if len(taught_concepts) >= 4 else taught_concepts):
                corr_idx = idx % 4  # Rotate correct answer between A, B, C, D
                seg_id = idx + 1
                assigned_chunk_id = segment_chunk_map.get(seg_id, {}).get("chunk_id")
                if not assigned_chunk_id and doc_chunks:
                    assigned_chunk_id = doc_chunks[min(idx, len(doc_chunks) - 1)].id
                
                distractors = [
                    f"{concept} operates in isolated static equilibrium without work exchange.",
                    f"{concept} bypasses thermodynamic and boundary conservation rules.",
                    f"{concept} generates arbitrary non-deterministic oscillations without measurable output."
                ]
                correct_text = f"{concept} maintains dynamic conservation through balanced state transitions."
                
                # Assemble 4 options
                full_options = []
                d_idx = 0
                for opt_i in range(4):
                    prefix = f"{option_keys[opt_i]}) "
                    if opt_i == corr_idx:
                        full_options.append(prefix + correct_text)
                    else:
                        full_options.append(prefix + distractors[d_idx])
                        d_idx += 1

                correct_option_str = full_options[corr_idx]

                questions.append(QuizQuestion(
                    id=str(uuid.uuid4()),
                    type="mcq",
                    concept=concept,
                    question=f"Which statement best characterizes the verified operational principle of {concept}?",
                    options=full_options,
                    correct_answer=correct_option_str,
                    explanation=f"As demonstrated in the source material, {concept} relies on structured state conservation and predictable response.",
                    chunk_id=assigned_chunk_id,
                    segment_id=seg_id
                ))

            # Add synthesis question if less than 4
            while len(questions) < 4:
                idx = len(questions)
                corr_idx = idx % 4
                synthesis_opts = [
                    "A) Rigid non-adaptive configuration",
                    "B) Total absence of external resistance",
                    "C) Proportional damping and active feedback mechanisms",
                    "D) Infinite uncontrolled input power"
                ]
                synth_chunk_id = doc_chunks[0].id if doc_chunks else None
                questions.append(QuizQuestion(
                    id=str(uuid.uuid4()),
                    type="mcq",
                    concept=f"{topic} System Synthesis",
                    question="Which design constraint guarantees holistic dynamic stability across the entire system?",
                    options=synthesis_opts,
                    correct_answer=synthesis_opts[2],
                    explanation="Holistic system stability requires active feedback compensation and damping to avoid unbounded resonance.",
                    chunk_id=synth_chunk_id,
                    segment_id=len(questions) + 1
                ))

        # Store quiz in DB
        db_quiz = DBQuiz(
            id=str(uuid.uuid4()),
            session_id=session_id,
            topic=topic,
            questions_json=[q.model_dump() for q in questions]
        )
        db.add(db_quiz)
        db.commit()

        return Quiz(
            quiz_id=db_quiz.id,
            session_id=session_id,
            topic=topic,
            questions=questions
        )

    @classmethod
    async def grade_quiz_submission(
        cls, 
        session_id: str, 
        answers: Any, 
        db: Session
    ) -> QuizGradeResponse:
        # Normalize answers to Dict[str, str] whether provided as dict or list
        normalized_answers: Dict[str, str] = {}
        if isinstance(answers, list):
            for item in answers:
                if isinstance(item, dict):
                    qid = str(item.get("question_id") or item.get("id") or "")
                    ans = str(item.get("selected_option") or item.get("answer") or item.get("student_answer") or "")
                    if qid:
                        normalized_answers[qid] = ans
        elif isinstance(answers, dict):
            normalized_answers = {str(k): str(v) for k, v in answers.items()}
        answers = normalized_answers

        quiz_record = db.query(DBQuiz).filter(DBQuiz.session_id == session_id).order_by(DBQuiz.created_at.desc()).first()
        if not quiz_record or not quiz_record.questions_json:
            quiz = await cls.generate_quiz_for_session(session_id, db)
            questions_data = [q.model_dump() for q in quiz.questions]
        else:
            questions_data = list(quiz_record.questions_json) if isinstance(quiz_record.questions_json, list) else []

        results: List[QuestionGradeResult] = []
        correct_count = 0

        for q in questions_data:
            q_id = q["id"]
            user_ans = answers.get(q_id, "").strip()
            correct_ans = q.get("correct_answer", "").strip()
            q_type = q.get("type", "mcq")
            concept = q.get("concept", "Concept")
            explanation = q.get("explanation", "")

            is_correct = False
            feedback = ""

            if q_type == "mcq":
                # Check exact string match or option letter match (e.g. 'A' vs 'A) ...')
                if user_ans == correct_ans:
                    is_correct = True
                elif len(user_ans) > 0 and len(correct_ans) > 0 and user_ans[0].upper() == correct_ans[0].upper():
                    is_correct = True
                elif len(user_ans) > 3 and user_ans.lower() in correct_ans.lower():
                    is_correct = True
                
                feedback = f"Correct! {explanation}" if is_correct else f"Incorrect. Correct answer was {correct_ans}. {explanation}"
            else:
                # Short Answer: Semantic grading via LLM
                try:
                    eval_prompt = f"""Grade this short-answer submission:
Question: {q.get('question')}
Expected Ideal Concept: {correct_ans}
Student's Response: "{user_ans}"

Output JSON:
{{
  "is_correct": true | false,
  "feedback": "Short constructive evaluation of the answer."
}}
"""
                    res = await LLMService.generate_json(
                        system_prompt="You are an expert grading assistant. Evaluate student short-answer conceptual correctness.",
                        user_prompt=eval_prompt,
                        schema_hint='{"is_correct": true, "feedback": "..."}'
                    )
                    is_correct = res.get("is_correct", False)
                    feedback = res.get("feedback", explanation)
                except Exception:
                    is_correct = len(user_ans) > 5 and any(w in user_ans.lower() for w in correct_ans.lower().split() if len(w) > 3)
                    feedback = explanation

            if is_correct:
                correct_count += 1

            results.append(QuestionGradeResult(
                question_id=q_id,
                concept=concept,
                is_correct=is_correct,
                student_answer=user_ans if user_ans else "No answer provided",
                correct_answer=correct_ans,
                feedback=feedback
            ))

        total_questions = len(questions_data)
        score_pct = round((correct_count / total_questions * 100), 1) if total_questions > 0 else 0.0

        # Save Attempt
        attempt = DBQuizAttempt(
            id=str(uuid.uuid4()),
            session_id=session_id,
            score_percentage=score_pct,
            details_json=[r.model_dump() for r in results]
        )
        db.add(attempt)
        db.commit()

        return QuizGradeResponse(
            session_id=session_id,
            total_score=correct_count,
            max_score=total_questions,
            score_percentage=score_pct,
            results=results
        )

    @classmethod
    async def build_learning_report(cls, session_id: str, db: Session) -> LearningReport:
        session = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        topic = session.topic if session else "General Topic"
        user_id = session.user_id if session and session.user_id else "default-user"

        latest_attempt = db.query(DBQuizAttempt).filter(DBQuizAttempt.session_id == session_id).order_by(DBQuizAttempt.created_at.desc()).first()
        
        # Checkpoint attempts
        ck_attempts = db.query(DBCheckpointAttempt).filter(DBCheckpointAttempt.session_id == session_id).all()
        misconceptions = [
            c.classification for c in ck_attempts 
            if c.classification and c.classification != "correct"
        ]

        plan = session.plan_json if session and session.plan_json else {}
        segments = plan.get("segments", []) if isinstance(plan, dict) else []
        concepts = [s.get("concept", topic) for s in segments if isinstance(s, dict)] or [topic]

        # Handle score status honestly
        has_attempts = latest_attempt is not None or len(ck_attempts) > 0
        if latest_attempt and latest_attempt.score_percentage is not None:
            score_pct = float(latest_attempt.score_percentage)
        elif len(ck_attempts) > 0:
            correct_cks = sum(1 for c in ck_attempts if c.classification == "correct")
            score_pct = round((correct_cks / len(ck_attempts)) * 100, 1)
        else:
            score_pct = 0.0

        # 1. Try real LLM Learning Report Synthesis
        try:
            system_prompt = (
                "You are an expert diagnostic learning evaluator. "
                "Synthesize a personalized, comprehensive, honest learning report for a student based on their quiz and checkpoint performance."
            )
            user_prompt = f"""Generate a personalized learning report for:
Topic: {topic}
Overall Mastery Score: {score_pct if has_attempts else 'Not yet assessed'}%
Concepts Taught: {concepts}
Misconceptions Encountered: {misconceptions}
Has Completed Assessments: {has_attempts}

Output JSON schema:
{{
  "concepts_understood": ["Concept 1", "Concept 2"],
  "weak_areas": ["Area needing revision"],
  "recommended_revision": [
    "Specific revision action step 1",
    "Specific derivation or problem to practice 2"
  ],
  "suggested_next_topics": [
    "Next advanced or foundational topic 1",
    "Next topic 2"
  ]
}}
"""
            llm_rep = await LLMService.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint='{"concepts_understood": [...], "weak_areas": [...], "recommended_revision": [...], "suggested_next_topics": [...]}',
                temperature=0.3
            )

            understood = llm_rep.get("concepts_understood", concepts)
            weak_areas = llm_rep.get("weak_areas", [])
            recommended_revision = llm_rep.get("recommended_revision", [f"Review core principles of {topic}."])
            suggested_next = llm_rep.get("suggested_next_topics", [f"Advanced {topic}"])
            logger.info(f"[AssessmentService] Synthesized LLM learning report for session {session_id}.")
        except Exception as e:
            logger.warning(f"[AssessmentService] LLM report synthesis failed ({e}); using procedural synthesis.")
            
            if not has_attempts:
                understood = []
                weak_areas = concepts
                recommended_revision = ["Complete checkpoint exercises and the final quiz to receive personalized diagnostic feedback."]
                suggested_next = [f"Complete lesson segments for {topic}"]
            elif score_pct >= 80:
                understood = concepts
                weak_areas = [] if score_pct == 100 else [concepts[-1]]
                suggested_next = [
                    f"Advanced Applications of {topic}",
                    f"Multi-Variable Modeling in {topic}",
                    f"Industry Case Studies on {topic}"
                ]
                recommended_revision = [
                    f"Review the core governing formula and derivation steps for {concepts[0] if concepts else topic}.",
                    "Work through additional boundary condition problems.",
                    "Revisit the visual diagram and state transition graphs."
                ]
            else:
                understood = concepts[:len(concepts)//2 + 1]
                weak_areas = [c for c in concepts if c not in understood]
                suggested_next = [
                    f"Foundational Review of {topic}",
                    f"Guided Problem Solving for {weak_areas[0] if weak_areas else topic}"
                ]
                recommended_revision = [
                    f"Review the fundamental mechanisms of {weak_areas[0] if weak_areas else topic}.",
                    "Review the interactive visual diagrams and practice checkpoint quizzes."
                ]

        # Synthesize Diagnostic Gap Map
        gap_map: List[GapMapItem] = []
        if latest_attempt and isinstance(latest_attempt.details_json, list):
            for res in latest_attempt.details_json:
                if isinstance(res, dict) and not res.get("is_correct", False):
                    q_concept = res.get("concept", topic)
                    matched_seg = next((s for s in segments if isinstance(s, dict) and s.get("concept") == q_concept), None)
                    seg_id = matched_seg.get("id") if matched_seg else 1
                    
                    cite_obj = None
                    if matched_seg:
                        s_cites = matched_seg.get("source_citations", []) or matched_seg.get("citations", [])
                        if s_cites and len(s_cites) > 0:
                            fc = s_cites[0]
                            cite_obj = Citation(
                                chunk_id=fc.get("chunk_id") if isinstance(fc, dict) else getattr(fc, "chunk_id", None),
                                chapter=fc.get("chapter", "Document Section") if isinstance(fc, dict) else getattr(fc, "chapter", "Document Section"),
                                page=fc.get("page", 1) if isinstance(fc, dict) else getattr(fc, "page", 1),
                                quote=fc.get("quote", "") if isinstance(fc, dict) else getattr(fc, "quote", ""),
                                snippet=fc.get("snippet", "") if isinstance(fc, dict) else getattr(fc, "snippet", "")
                            )
                    if not cite_obj:
                        cite_obj = Citation(chapter=topic, page=1, quote=f"Review verified principles for {q_concept}.", snippet=f"Review {q_concept}.")
                    
                    gap_map.append(GapMapItem(
                        concept=q_concept,
                        segment_id=seg_id,
                        citation=cite_obj,
                        recommendation=f"Revisit Segment {seg_id} on '{q_concept}' and review source excerpt on Page {cite_obj.page or 1}."
                    ))

        if not gap_map and (weak_areas or (has_attempts and score_pct < 100)):
            target_weaks = weak_areas if weak_areas else (concepts[-1:] if concepts else [topic])
            for w in target_weaks:
                matched_seg = next((s for s in segments if isinstance(s, dict) and s.get("concept") == w), None)
                seg_id = matched_seg.get("id", 1) if matched_seg else 1
                cite_obj = None
                if matched_seg:
                    s_cites = matched_seg.get("source_citations", []) or matched_seg.get("citations", [])
                    if s_cites and len(s_cites) > 0:
                        fc = s_cites[0]
                        cite_obj = Citation(
                            chunk_id=fc.get("chunk_id") if isinstance(fc, dict) else getattr(fc, "chunk_id", None),
                            chapter=fc.get("chapter", "Document Section") if isinstance(fc, dict) else getattr(fc, "chapter", "Document Section"),
                            page=fc.get("page", 1) if isinstance(fc, dict) else getattr(fc, "page", 1),
                            quote=fc.get("quote", "") if isinstance(fc, dict) else getattr(fc, "quote", ""),
                            snippet=fc.get("snippet", "") if isinstance(fc, dict) else getattr(fc, "snippet", "")
                        )
                if not cite_obj:
                    cite_obj = Citation(chapter=topic, page=1, quote=f"Review foundations for {w}.", snippet=f"Review {w}.")
                gap_map.append(GapMapItem(
                    concept=w,
                    segment_id=seg_id,
                    citation=cite_obj,
                    recommendation=f"Reinforce conceptual understanding of '{w}' in Segment {seg_id}."
                ))

        report = LearningReport(
            session_id=session_id,
            user_id=user_id,
            topic=topic,
            score_percent=score_pct,
            time_spent_minutes=session.time_budget if session else 20,
            concepts_understood=understood,
            weak_areas=weak_areas,
            misconceptions_encountered=misconceptions,
            recommended_revision=recommended_revision,
            suggested_next_topics=suggested_next,
            gap_map=gap_map
        )

        # Persist report
        existing_rep = db.query(DBLearningReport).filter(DBLearningReport.session_id == session_id).first()
        if not existing_rep:
            db_rep = DBLearningReport(
                id=str(uuid.uuid4()),
                session_id=session_id,
                user_id=user_id,
                topic=topic,
                score_percent=score_pct,
                time_spent=session.time_budget if session else 20,
                report_json=report.model_dump(mode="json")
            )
            db.add(db_rep)
            db.commit()

        # Update Learner Profile History
        profile = db.query(DBLearnerProfile).filter(DBLearnerProfile.user_id == user_id).first()
        if profile:
            hist = profile.history_json or []
            hist.append({
                "session_id": session_id,
                "topic": topic,
                "score": score_pct,
                "date": report.generated_at.isoformat() if hasattr(report.generated_at, "isoformat") else str(report.generated_at)
            })
            profile.history_json = hist
            db.commit()

        return report
