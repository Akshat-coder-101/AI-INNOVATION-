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
    DBCheckpointAttempt
)
from ..models.schemas import (
    Quiz, 
    QuizQuestion, 
    QuizGradeResponse, 
    QuestionGradeResult, 
    LearningReport
)
from .llm import LLMService, LLMUnavailable

logger = logging.getLogger("sahayak.assessment")

class AssessmentService:
    @classmethod
    async def generate_quiz_for_session(cls, session_id: str, db: Session) -> Quiz:
        session = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        topic = session.topic if session else "Foundational Principles"
        plan = session.plan_json if session and session.plan_json else {}
        segments = plan.get("segments", []) if isinstance(plan, dict) else []
        
        taught_concepts = [s.get("concept", topic) for s in segments if isinstance(s, dict)]
        if not taught_concepts and session and session.taught_concepts:
            taught_concepts = session.taught_concepts
        if not taught_concepts:
            taught_concepts = [topic]

        questions: List[QuizQuestion] = []

        # 1. Try real LLM Quiz Generation
        try:
            system_prompt = (
                "You are an expert psychometric test designer and AI tutor. "
                "Generate rigorous, concept-grounded assessment questions based EXCLUSIVELY on the concepts taught. "
                "CRITICAL: Randomize the correct answer position across options (do NOT always make option A correct)."
            )

            user_prompt = f"""Generate a 4-question mastery quiz for:
Topic: {topic}
Concepts Covered: {taught_concepts}

JSON format expected:
{{
  "questions": [
    {{
      "concept": "Name of taught concept",
      "type": "mcq",
      "question": "Clear conceptual question testing derivation or application?",
      "options": [
        "A) Choice text",
        "B) Choice text",
        "C) Choice text",
        "D) Choice text"
      ],
      "correct_answer": "B) Choice text (must exactly match the correct option in options array)",
      "explanation": "Detailed pedagogical explanation of why this answer is correct."
    }}
  ]
}}
"""
            llm_quiz = await LLMService.generate_json(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                schema_hint='{"questions": [{"concept": "...", "type": "mcq", "question": "...", "options": ["A) ...", ...], "correct_answer": "...", "explanation": "..."}]}',
                temperature=0.3
            )

            raw_qs = llm_quiz.get("questions", [])
            if raw_qs and len(raw_qs) > 0:
                for q in raw_qs:
                    opts = q.get("options", [])
                    if len(opts) < 2:
                        opts = ["A) Option A", "B) Option B", "C) Option C", "D) Option D"]
                    corr = q.get("correct_answer") or opts[0]
                    questions.append(QuizQuestion(
                        id=str(uuid.uuid4()),
                        type=q.get("type", "mcq"),
                        concept=q.get("concept", topic),
                        question=q.get("question", f"Question on {topic}"),
                        options=opts,
                        correct_answer=corr,
                        explanation=q.get("explanation", f"Correct principle regarding {topic}")
                    ))
                logger.info(f"[AssessmentService] Generated {len(questions)} quiz questions using LLM.")
        except Exception as e:
            logger.warning(f"[AssessmentService] LLM quiz generation failed ({e}); using diversified procedural generator.")

        # 2. Procedural Fallback if LLM failed or offline
        if not questions:
            option_keys = ["A", "B", "C", "D"]
            for idx, concept in enumerate(taught_concepts):
                corr_idx = idx % 4  # Rotate correct answer between A, B, C, D
                
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
                    question=f"Which statement best characterizes the operational principle of {concept}?",
                    options=full_options,
                    correct_answer=correct_option_str,
                    explanation=f"As demonstrated in our lesson, {concept} relies on structured state conservation and predictable response."
                ))

            # Add synthesis question
            synthesis_opts = [
                "A) Rigid non-adaptive configuration",
                "B) Total absence of external resistance",
                "C) Proportional damping and active feedback mechanisms",
                "D) Infinite uncontrolled input power"
            ]
            questions.append(QuizQuestion(
                id=str(uuid.uuid4()),
                type="mcq",
                concept=f"{topic} Synthesis",
                question=f"When applying {topic} to a dynamic system, what is the primary factor determining stability?",
                options=synthesis_opts,
                correct_answer=synthesis_opts[2],  # Option C
                explanation="System stability across dynamic domains depends on continuous feedback and proportional damping."
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
        answers: Dict[str, str], 
        db: Session
    ) -> QuizGradeResponse:
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

            report = LearningReport(
                session_id=session_id,
                user_id=user_id,
                topic=topic,
                score_percent=score_pct,
                time_spent_minutes=session.time_budget if session else 20,
                concepts_understood=llm_rep.get("concepts_understood", concepts),
                weak_areas=llm_rep.get("weak_areas", []),
                misconceptions_encountered=misconceptions,
                recommended_revision=llm_rep.get("recommended_revision", [f"Review core principles of {topic}."]),
                suggested_next_topics=llm_rep.get("suggested_next_topics", [f"Advanced {topic}"])
            )
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
                suggested_next_topics=suggested_next
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
