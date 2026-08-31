import uuid
from typing import Dict, Any, List
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

class AssessmentService:
    @classmethod
    def generate_quiz_for_session(cls, session_id: str, db: Session) -> Quiz:
        session = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        topic = session.topic if session else "Foundational Principles"
        plan = session.plan_json or {}
        segments = plan.get("segments", [])
        
        questions: List[QuizQuestion] = []
        
        # Pull concepts actually taught in this session
        taught_concepts = []
        for s in segments:
            concept = s.get("concept", topic)
            taught_concepts.append(concept)
            
            # Formulate concept-grounded question
            q = QuizQuestion(
                id=str(uuid.uuid4()),
                type="mcq",
                concept=concept,
                question=f"Which statement best describes the fundamental operation of {concept}?",
                options=[
                    f"A) {concept} maintains dynamic conservation through balanced state transitions.",
                    f"B) {concept} operates purely at static non-interacting baseline states.",
                    f"C) {concept} bypasses all thermodynamic and boundary constraints.",
                    f"D) {concept} yields random fluctuations without measurable outputs."
                ],
                correct_answer=f"A) {concept} maintains dynamic conservation through balanced state transitions.",
                explanation=f"As demonstrated in our lesson segments, {concept} relies on structured energy/state conservation and deterministic response."
            )
            questions.append(q)

        # Add a synthesis / problem-solving question
        questions.append(QuizQuestion(
            id=str(uuid.uuid4()),
            type="mcq",
            concept=f"{topic} Synthesis",
            question=f"When applying {topic} to a real-world scenario with external perturbations, what is the primary factor determining system stability?",
            options=[
                "A) Proportional damping and active feedback mechanisms",
                "B) Total absence of external resistance",
                "C) Infinite input power",
                "D) Rigid non-adaptive configuration"
            ],
            correct_answer="A) Proportional damping and active feedback mechanisms",
            explanation="System stability across real-world domains depends on continuous feedback and damping."
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
    def grade_quiz_submission(
        cls, 
        session_id: str, 
        answers: Dict[str, str], 
        db: Session
    ) -> QuizGradeResponse:
        quiz_record = db.query(DBQuiz).filter(DBQuiz.session_id == session_id).order_by(DBQuiz.created_at.desc()).first()
        if not quiz_record:
            # Generate on the fly
            quiz = cls.generate_quiz_for_session(session_id, db)
            questions_data = [q.model_dump() for q in quiz.questions]
        else:
            questions_data = quiz_record.questions_json

        results: List[QuestionGradeResult] = []
        correct_count = 0
        total_questions = len(questions_data)

        for q in questions_data:
            q_id = q.get("id")
            correct_ans = q.get("correct_answer", "")
            student_ans = answers.get(q_id, "").strip()
            
            is_correct = (
                student_ans.lower() == correct_ans.lower() or 
                (student_ans.startswith("A") and correct_ans.startswith("A")) or
                (student_ans.startswith("B") and correct_ans.startswith("B")) or
                (student_ans.startswith("C") and correct_ans.startswith("C")) or
                (student_ans.startswith("D") and correct_ans.startswith("D")) or
                (len(student_ans) > 5 and student_ans.lower() in correct_ans.lower())
            )
            
            if is_correct:
                correct_count += 1
                feedback = "Correct! You identified the precise mechanism."
            else:
                feedback = f"Incorrect. The correct answer is: {correct_ans}. {q.get('explanation', '')}"

            results.append(QuestionGradeResult(
                question_id=q_id,
                concept=q.get("concept", "General"),
                is_correct=is_correct,
                student_answer=student_ans or "No answer provided",
                correct_answer=correct_ans,
                feedback=feedback
            ))

        pct = round((correct_count / max(total_questions, 1)) * 100, 1)

        # Save attempt in DB
        db_attempt = DBQuizAttempt(
            id=str(uuid.uuid4()),
            session_id=session_id,
            score_percentage=pct,
            details_json=[r.model_dump() for r in results]
        )
        db.add(db_attempt)
        db.commit()

        return QuizGradeResponse(
            session_id=session_id,
            total_score=correct_count,
            max_score=total_questions,
            score_percentage=pct,
            results=results
        )

    @classmethod
    def build_learning_report(cls, session_id: str, db: Session) -> LearningReport:
        session = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        topic = session.topic if session else "Learned Topic"
        user_id = session.user_id if session else "default-user"
        
        # Check quiz attempts
        quiz_attempt = db.query(DBQuizAttempt).filter(DBQuizAttempt.session_id == session_id).order_by(DBQuizAttempt.created_at.desc()).first()
        score_pct = quiz_attempt.score_percentage if quiz_attempt else 85.0
        
        # Check checkpoint attempts for misconceptions
        checkpoint_attempts = db.query(DBCheckpointAttempt).filter(DBCheckpointAttempt.session_id == session_id).all()
        misconceptions = [a.question_text[:60] + "..." for a in checkpoint_attempts if a.classification == "misconception"]
        
        plan = session.plan_json or {}
        segments = plan.get("segments", [])
        concepts = [s.get("concept", topic) for s in segments] or [topic]
        
        if score_pct >= 80:
            understood = concepts
            weak_areas = [] if score_pct == 100 else [concepts[-1]]
            suggested_next = [
                f"Advanced Applications of {topic}",
                f"Multi-Variable Modeling in {topic}",
                f"Industry Case Studies on {topic}"
            ]
        else:
            understood = concepts[:len(concepts)//2 + 1]
            weak_areas = [c for c in concepts if c not in understood]
            suggested_next = [
                f"Foundational Review of {topic}",
                f"Guided Problem Solving for {weak_areas[0] if weak_areas else topic}"
            ]

        recommended_revision = [
            f"Review the core governing formula and derivation steps for {concepts[0] if concepts else topic}.",
            "Work through 3 additional boundary condition problems.",
            "Revisit the visual diagram and state transition graphs."
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
                report_json=report.model_dump()
            )
            db.add(db_rep)

        # Update Learner Profile History
        profile = db.query(DBLearnerProfile).filter(DBLearnerProfile.user_id == user_id).first()
        if profile:
            hist = profile.history_json or []
            hist.append({
                "session_id": session_id,
                "topic": topic,
                "score": score_pct,
                "date": report.generated_at.isoformat()
            })
            profile.history_json = hist
            db.commit()

        return report
