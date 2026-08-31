import random
from typing import Dict, Any, List, Tuple
from sqlalchemy.orm import Session
from ..database import DBLessonSession, DBCheckpointAttempt
from ..models.schemas import (
    InteractionResponse, 
    CheckpointQuestion, 
    LessonSegmentRender, 
    CaptionItem
)
from .visual_router import VisualRouter
from .tts import TTSService

class EvaluatorService:
    # Library of distinct curated analogies by subject domain to guarantee fresh analogies on reteach
    ANALOGIES_BANK = {
        "physics": [
            ("A roller coaster cart on a steep hill exchanging potential gravitational energy into kinetic speed.", "Imagine a roller coaster at the crest: pure potential energy, converted into rushing kinetic speed as it plunges."),
            ("A compressed spring storing mechanical strain until released to push a block.", "Think of a tightly coiled mattress spring: pushing on it stores potential energy that snaps into motion."),
            ("A water reservoir behind a high dam spinning a turbine as water cascades down.", "Think of a hydroelectric dam holding a mountain reservoir: height creates water pressure that spins turbines into electrical work."),
            ("Stretching a rubber band between two fingers before letting it snap forward.", "Like drawing a slingshot band: muscular work becomes elastic potential energy that hurls the stone.")
        ],
        "biology": [
            ("A bustling city airport where security gates regulate passport entry.", "Consider a cell membrane like an international airport gate with biometric passports filtering authorized travelers."),
            ("A smart modern factory with a central blueprint library and assembly conveyor lines.", "Think of the nucleus as the head architect's blueprint vault, with ribosomes serving as precision assembly robots."),
            ("A rechargeable battery dock recharging mobile power banks for night shifts.", "The mitochondrion functions like a solar-charged power station synthesizing ATP currency for cellular work."),
            ("A fortress castle surrounded by a moat with drawbridges checking cargo wagons.", "Picture a castle wall with specialized drawbridges that open only when specific heraldic keys arrive.")
        ],
        "programming": [
            ("A kitchen chef following a precise recipe card with measurable ingredients.", "Think of an algorithm like a master chef's numbered recipe where each step must be executed in exact sequential order."),
            ("A post office filing cabinet sorting mail envelopes into indexed cubbies.", "Consider arrays and hash maps like labeled cubbies in a sorting room where postal codes instantly locate packages."),
            ("An assembly line conveyor belt where each station performs one deterministic transformation.", "Imagine a factory belt: raw parts enter, each station does one specific transformation, and finished goods emerge."),
            ("A library catalog index card pointing readers directly to shelf numbers.", "Pointers and references act like library catalog numbers: they don't hold the book itself, but tell you exactly where it lives.")
        ],
        "general": [
            ("A traffic roundabout managing smooth multi-lane vehicle flow without collisions.", "Like a well-designed roundabout where traffic smoothly self-regulates through yield rules."),
            ("A balance scale where adding weight on one pan requires matching weight on the other.", "Like an old-fashioned balance beam: every action on one side requires a balancing force on the other."),
            ("A musical symphony where each instrument plays its part to create harmonious melody.", "Think of an orchestra where rhythm, pitch, and timbre must coordinate synchronously to produce harmony.")
        ]
    }

    @classmethod
    def _detect_domain(cls, concept: str) -> str:
        c = concept.lower()
        if any(w in c for w in ["force", "newton", "gravity", "energy", "velocity", "wave", "quantum", "thermo"]):
            return "physics"
        elif any(w in c for w in ["cell", "dna", "bio", "organ", "plant", "heart", "mitochondria", "enzyme"]):
            return "biology"
        elif any(w in c for w in ["code", "python", "algorithm", "data", "tree", "loop", "function", "variable"]):
            return "programming"
        return "general"

    @classmethod
    def get_fresh_analogy(cls, concept: str, used_analogies: List[str]) -> Tuple[str, str]:
        domain = cls._detect_domain(concept)
        available = [item for item in cls.ANALOGIES_BANK.get(domain, cls.ANALOGIES_BANK["general"]) if item[0] not in used_analogies]
        if not available:
            # Pick from general if domain exhausted
            available = [item for item in cls.ANALOGIES_BANK["general"] if item[0] not in used_analogies]
        if not available:
            # Fallback fresh generic
            return (f"A synchronized clockwork mechanism representing {concept}", f"Think of a fine watch mechanism: every gear tooth in {concept} directly drives the next pinion in harmony.")
        return random.choice(available)

    @classmethod
    async def evaluate_student_answer(
        cls,
        session_id: str,
        segment_id: int,
        student_answer: str,
        is_demo_mode: bool,
        force_misconception: bool,
        db: Session
    ) -> InteractionResponse:
        session = db.query(DBLessonSession).filter(DBLessonSession.id == session_id).first()
        topic = session.topic if session else "The concept"
        plan_json = session.plan_json or {}
        segments = plan_json.get("segments", [])
        
        # Current segment details
        current_segment = next((s for s in segments if s.get("id") == segment_id), None)
        concept = current_segment.get("concept", topic) if current_segment else topic
        correct_answer = current_segment.get("checkpoint_question", {}).get("correct_answer", "") if current_segment else ""
        used_analogies = session.analogies_used or []

        # Check if Demo Mode or wrong answer triggered
        ans_lower = student_answer.strip().lower()
        is_wrong = force_misconception or is_demo_mode or ans_lower in ["no", "false", "wrong", "i don't know", "none", "0", "b", "c", "d"] and correct_answer.lower() not in ans_lower
        
        # If user explicitly matched key terms or correct answer
        if not force_misconception and (ans_lower == correct_answer.lower() or (len(ans_lower) > 3 and ans_lower in correct_answer.lower()) or "correct" in ans_lower or "yes" in ans_lower or len(ans_lower) > 20 and not is_demo_mode):
            classification = "correct"
            feedback = f"Outstanding work! Your understanding of **{concept}** is spot on. You correctly recognized the underlying principles."
            action = "advance"
            
            # Log attempt
            db_attempt = DBCheckpointAttempt(
                id=str(random.randint(100000, 999999)),
                session_id=session_id,
                segment_id=segment_id,
                question_text=current_segment.get("checkpoint_question", {}).get("question", "") if current_segment else "",
                student_answer=student_answer,
                classification="correct",
                feedback=feedback
            )
            db.add(db_attempt)
            db.commit()

            return InteractionResponse(
                action="advance",
                classification="correct",
                feedback=feedback,
                next_segment_id=segment_id + 1 if segment_id < len(segments) else None
            )

        # Misconception / Reteach Branch
        classification = "misconception"
        misconception_name = f"Confusing Static Equivalence with Dynamic Equilibrium in {concept}"
        
        # Get brand new analogy not yet used in this session
        analogy_title, analogy_text = cls.get_fresh_analogy(concept, used_analogies)
        used_analogies.append(analogy_title)
        if session:
            session.analogies_used = list(set(used_analogies))
            db.commit()

        new_example = f"Consider a real-world case: when you pedal a bicycle on flat asphalt versus uphill. On flat road, momentum carries you forward; uphill requires continuous force application."
        feedback = f"Great try! You hit a very common nuance in **{concept}**. Let's unpack this from a brand new perspective to make it crystal clear."

        new_checkpoint_q = CheckpointQuestion(
            type="mcq",
            question=f"Based on our new analogy ({analogy_title}), what happens when the driving force is temporarily doubled?",
            options=[
                "A) The rate of response doubles proportionally",
                "B) The system immediately reaches infinite potential",
                "C) Nothing changes because the capacity is fixed",
                "D) The energy is completely lost to heat"
            ],
            correct_answer="A) The rate of response doubles proportionally",
            hints=["Think of the linear proportionality discussed in the fresh analogy."],
            concept_tested=concept
        )

        # Generate Reteach Segment Payload
        spoken_script = f"Let's look at {concept} with a fresh perspective. {analogy_text} {new_example} Notice how the relationship holds true across all conditions."
        on_screen_text = f"💡 Reteach Focus: {concept}\n\n• New Model: {analogy_title}\n• Key Insight: Dynamic response scales directly with driving stimulus."
        
        visual_type = current_segment.get("visual_type", "labeled-diagram") if current_segment else "labeled-diagram"
        visual_spec = VisualRouter.generate_visual_spec(concept, visual_type, "beginner")
        
        reteach_segment = LessonSegmentRender(
            segment_id=segment_id,
            session_id=session_id,
            concept=concept,
            spoken_script=spoken_script,
            on_screen_text=on_screen_text,
            visual_spec=visual_spec,
            captions=[
                CaptionItem(start_sec=0.0, end_sec=3.5, text=f"Let's look at {concept} with a fresh analogy."),
                CaptionItem(start_sec=3.5, end_sec=8.0, text=analogy_text[:70] + "..."),
                CaptionItem(start_sec=8.0, end_sec=12.0, text=new_example[:70] + "...")
            ],
            checkpoint_question=new_checkpoint_q,
            analogies_used=used_analogies,
            language=session.language if session else "en",
            is_reteach=True
        )

        # Record attempt
        db_attempt = DBCheckpointAttempt(
            id=str(random.randint(100000, 999999)),
            session_id=session_id,
            segment_id=segment_id,
            question_text=current_segment.get("checkpoint_question", {}).get("question", "") if current_segment else "",
            student_answer=student_answer,
            classification="misconception",
            feedback=feedback
        )
        db.add(db_attempt)
        db.commit()

        return InteractionResponse(
            action="reteach",
            classification="misconception",
            feedback=feedback,
            misconception_name=misconception_name,
            new_analogy=analogy_text,
            new_example=new_example,
            new_checkpoint_question=new_checkpoint_q,
            reteach_segment=reteach_segment,
            next_segment_id=segment_id
        )
