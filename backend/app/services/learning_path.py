import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..database import DBLearningPath
from ..models.schemas import LearningPath, PathNode

class LearningPathService:
    @classmethod
    def generate_or_get_learning_path(cls, topic_id: str, user_id: str, db: Session) -> LearningPath:
        # Check if existing path in DB
        db_path = db.query(DBLearningPath).filter(
            DBLearningPath.topic_id == topic_id,
            DBLearningPath.user_id == user_id
        ).first()

        if db_path and db_path.dag_json:
            return LearningPath.model_validate(db_path.dag_json)

        # Generate topic DAG
        clean_topic = topic_id.replace("-", " ").title()
        
        # Build 6-stage structured DAG
        nodes = [
            PathNode(
                id="node-1",
                title=f"1. Foundations & Intuition: {clean_topic}",
                description="Core definitions, first principles, historical context, and fundamental motivation.",
                estimated_hours=1.5,
                difficulty="beginner",
                prerequisites=[],
                completed=True,
                score=95.0
            ),
            PathNode(
                id="node-2",
                title=f"2. Mathematical & Formal Modeling",
                description="Formal equations, state spaces, boundary conditions, and analytical derivations.",
                estimated_hours=2.0,
                difficulty="intermediate",
                prerequisites=["node-1"],
                completed=True,
                score=88.0
            ),
            PathNode(
                id="node-3",
                title=f"3. Algorithmic & Structural Implementation",
                description="Translating theory into computational routines, data structures, and edge-case handling.",
                estimated_hours=3.0,
                difficulty="intermediate",
                prerequisites=["node-2"],
                completed=False,
                score=None
            ),
            PathNode(
                id="node-4",
                title=f"4. Experimental Evaluation & Diagnostics",
                description="Profiling performance, detecting edge-case failure modes, and debugging bottlenecks.",
                estimated_hours=2.5,
                difficulty="intermediate",
                prerequisites=["node-3"],
                completed=False,
                score=None
            ),
            PathNode(
                id="node-5",
                title=f"5. Advanced Optimization & Scale",
                description="High-performance vectorization, distributed execution, and asymptotic limits.",
                estimated_hours=4.0,
                difficulty="advanced",
                prerequisites=["node-4"],
                completed=False,
                score=None
            ),
            PathNode(
                id="node-6",
                title=f"6. Capstone Synthesis & Real-World Case Studies",
                description="End-to-end architecture design solving complex industrial problems.",
                estimated_hours=5.0,
                difficulty="advanced",
                prerequisites=["node-5"],
                completed=False,
                score=None
            )
        ]

        edges = [
            {"from": "node-1", "to": "node-2"},
            {"from": "node-2", "to": "node-3"},
            {"from": "node-3", "to": "node-4"},
            {"from": "node-4", "to": "node-5"},
            {"from": "node-5", "to": "node-6"}
        ]

        completed_count = sum(1 for n in nodes if n.completed)
        pct = round((completed_count / len(nodes)) * 100, 1)

        path = LearningPath(
            topic_id=topic_id,
            title=f"Mastery Curriculum: {clean_topic}",
            description=f"Structured pedagogical learning path for {clean_topic}, engineered with progressive Bloom's taxonomy depth.",
            nodes=nodes,
            edges=edges,
            completion_percentage=pct
        )

        # Save to DB
        new_db_path = DBLearningPath(
            id=str(uuid.uuid4()),
            user_id=user_id,
            topic_id=topic_id,
            title=path.title,
            dag_json=path.model_dump(),
            progress_percentage=pct
        )
        db.add(new_db_path)
        db.commit()

        return path

    @classmethod
    def toggle_node_completion(cls, topic_id: str, user_id: str, node_id: str, db: Session) -> LearningPath:
        db_path = db.query(DBLearningPath).filter(
            DBLearningPath.topic_id == topic_id,
            DBLearningPath.user_id == user_id
        ).first()

        if not db_path:
            path = cls.generate_or_get_learning_path(topic_id, user_id, db)
            db_path = db.query(DBLearningPath).filter(
                DBLearningPath.topic_id == topic_id,
                DBLearningPath.user_id == user_id
            ).first()

        data = db_path.dag_json
        for n in data.get("nodes", []):
            if n["id"] == node_id:
                n["completed"] = not n.get("completed", False)
                if n["completed"] and not n.get("score"):
                    n["score"] = 90.0
                break

        completed_count = sum(1 for n in data["nodes"] if n.get("completed", False))
        pct = round((completed_count / len(data["nodes"])) * 100, 1)
        data["completion_percentage"] = pct
        
        db_path.dag_json = data
        db_path.progress_percentage = pct
        db.commit()

        return LearningPath.model_validate(data)
