import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..database import DBLearningPath, DBQuizAttempt, DBLessonSession
from ..models.schemas import LearningPath, PathNode
from .llm import LLMService

logger = logging.getLogger("sahayak.learning_path")

# Specialized curriculum templates for known subjects & dynamic cognitive synthesis for arbitrary topics
DOMAIN_CURRICULA: Dict[str, Dict[str, Any]] = {
    "quantum-computing": {
        "title": "Quantum Computing & Information Mechanics",
        "description": "Comprehensive Bloom's Taxonomy curriculum spanning qubit state spaces, quantum gates, entanglement, Shor's & Grover's algorithms, and fault-tolerant error correction.",
        "nodes": [
            {
                "id": "node-1",
                "title": "1. Qubits, Superposition & Hilbert Spaces",
                "description": "Bloch sphere geometric representation, Dirac bra-ket notation, state vectors, and complex probability amplitudes.",
                "estimated_hours": 1.5,
                "difficulty": "beginner",
                "prerequisites": []
            },
            {
                "id": "node-2",
                "title": "2. Quantum Logic Gates & Unitary Operators",
                "description": "Pauli-X/Y/Z, Hadamard, Phase Shift, and controlled CNOT matrices maintaining unitary preservation (U†U = I).",
                "estimated_hours": 2.5,
                "difficulty": "beginner",
                "prerequisites": ["node-1"]
            },
            {
                "id": "node-3",
                "title": "3. Quantum Entanglement & Bell State Teleportation",
                "description": "EPR paradox, non-locality, density matrices, tensor product spaces, and quantum teleportation protocols.",
                "estimated_hours": 3.0,
                "difficulty": "intermediate",
                "prerequisites": ["node-2"]
            },
            {
                "id": "node-4",
                "title": "4. Quantum Algorithms: Deutsch-Jozsa & Grover Search",
                "description": "Phase kickback oracles, amplitude amplification, O(√N) database search complexity, and interference manipulation.",
                "estimated_hours": 3.5,
                "difficulty": "intermediate",
                "prerequisites": ["node-3"]
            },
            {
                "id": "node-5",
                "title": "5. Quantum Fourier Transform & Shor's Factorization",
                "description": "Discrete log period finding, modular arithmetic circuits, QFT matrix decomposition, and polynomial-time RSA decryption.",
                "estimated_hours": 4.5,
                "difficulty": "advanced",
                "prerequisites": ["node-4"]
            },
            {
                "id": "node-6",
                "title": "6. Surface Codes & Fault-Tolerant Quantum Architecture",
                "description": "Toric codes, stabilizer formalisms, topological error correction thresholds, and physical transmon superconducting hardware.",
                "estimated_hours": 5.0,
                "difficulty": "advanced",
                "prerequisites": ["node-5"]
            }
        ]
    },
    "linear-algebra": {
        "title": "Linear Algebra & High-Dimensional Geometry",
        "description": "Rigorous progression from vector spaces and matrix transformations to spectral theory, SVD, and modern machine learning applications.",
        "nodes": [
            {
                "id": "node-1",
                "title": "1. Vector Spaces, Spans & Linear Independence",
                "description": "Axiomatic vector space definition, linear combinations, basis vectors, dimension, and subspace closure properties.",
                "estimated_hours": 1.5,
                "difficulty": "beginner",
                "prerequisites": []
            },
            {
                "id": "node-2",
                "title": "2. Matrix Transformations, Rank & Nullity",
                "description": "Linear mappings, row reduction, fundamental theorem of linear algebra: dim(Row) + dim(Null) = n.",
                "estimated_hours": 2.0,
                "difficulty": "beginner",
                "prerequisites": ["node-1"]
            },
            {
                "id": "node-3",
                "title": "3. Orthogonality, Projections & Gram-Schmidt",
                "description": "Inner products, Cauchy-Schwarz inequality, QR factorization, orthogonal complements, and least squares approximations.",
                "estimated_hours": 3.0,
                "difficulty": "intermediate",
                "prerequisites": ["node-2"]
            },
            {
                "id": "node-4",
                "title": "4. Eigenvalues, Eigenvectors & Diagonalization",
                "description": "Characteristic polynomials, algebraic vs geometric multiplicity, similarity transformations, and matrix powers A^k.",
                "estimated_hours": 3.0,
                "difficulty": "intermediate",
                "prerequisites": ["node-3"]
            },
            {
                "id": "node-5",
                "title": "5. Singular Value Decomposition (SVD) & Pseudoinverses",
                "description": "Geometry of SVD: A = UΣV^T, low-rank Eckart-Young approximations, Moore-Penrose inverse, and condition numbers.",
                "estimated_hours": 4.0,
                "difficulty": "advanced",
                "prerequisites": ["node-4"]
            },
            {
                "id": "node-6",
                "title": "6. Spectral Graph Theory & PCA Applications",
                "description": "Principal Component Analysis on covariance matrices, graph Laplacians, spectral clustering, and Google PageRank Markov chains.",
                "estimated_hours": 4.5,
                "difficulty": "advanced",
                "prerequisites": ["node-5"]
            }
        ]
    },
    "neural-networks": {
        "title": "Deep Neural Networks & Representation Learning",
        "description": "Pedagogical track covering perceptrons, backpropagation calculus, CNNs/RNNs, Transformer attention, and loss landscapes.",
        "nodes": [
            {
                "id": "node-1",
                "title": "1. Perceptrons, Activation Functions & Decision Boundaries",
                "description": "Biological inspirations, linear classifiers, Sigmoid, ReLU, GELU non-linearities, and XOR separation limits.",
                "estimated_hours": 1.5,
                "difficulty": "beginner",
                "prerequisites": []
            },
            {
                "id": "node-2",
                "title": "2. Backpropagation Calculus & Computational Graphs",
                "description": "Multivariate chain rule, forward/backward passes, Jacobian-vector products, and gradient descent optimization (Adam, SGD).",
                "estimated_hours": 2.5,
                "difficulty": "beginner",
                "prerequisites": ["node-1"]
            },
            {
                "id": "node-3",
                "title": "3. Convolutional Networks & Spatial Invariance",
                "description": "2D convolution kernels, receptive fields, stride/padding mechanics, ResNet skip connections, and feature map hierarchies.",
                "estimated_hours": 3.0,
                "difficulty": "intermediate",
                "prerequisites": ["node-2"]
            },
            {
                "id": "node-4",
                "title": "4. Sequence Modeling: LSTMs, GRUs & Recurrence",
                "description": "Vanishing gradient problem, hidden state dynamics, forget/input gates, and bidirectional sequence encoding.",
                "estimated_hours": 3.5,
                "difficulty": "intermediate",
                "prerequisites": ["node-3"]
            },
            {
                "id": "node-5",
                "title": "5. Transformer Attention & Scaled Dot-Product",
                "description": "Query-Key-Value projection matrices, multi-head self-attention, rotary positional embeddings (RoPE), and LayerNorm.",
                "estimated_hours": 4.5,
                "difficulty": "advanced",
                "prerequisites": ["node-4"]
            },
            {
                "id": "node-6",
                "title": "6. Loss Landscapes, Regularization & Alignment",
                "description": "Dropout, weight decay, gradient clipping, batch normalization theory, and RLHF alignment mechanics.",
                "estimated_hours": 5.0,
                "difficulty": "advanced",
                "prerequisites": ["node-5"]
            }
        ]
    },
    "cellular-respiration": {
        "title": "Cellular Respiration & Metabolic Bioenergetics",
        "description": "Step-by-step biochemical journey through glycolysis, Krebs cycle, electron transport chains, and chemiosmotic ATP synthesis.",
        "nodes": [
            {
                "id": "node-1",
                "title": "1. Glycolysis & Cytoplasmic Energy Investment",
                "description": "Hexokinase phosphorylation, fructose-1,6-bisphosphate cleavage, substrate-level phosphorylation yielding 2 net ATP + 2 NADH.",
                "estimated_hours": 1.5,
                "difficulty": "beginner",
                "prerequisites": []
            },
            {
                "id": "node-2",
                "title": "2. Pyruvate Oxidation & Acetyl-CoA Formation",
                "description": "Mitochondrial transport, pyruvate dehydrogenase complex, oxidative decarboxylation, and coenzyme A activation.",
                "estimated_hours": 2.0,
                "difficulty": "beginner",
                "prerequisites": ["node-1"]
            },
            {
                "id": "node-3",
                "title": "3. The Citric Acid (Krebs) Cycle",
                "description": "Oxaloacetate condensation to citrate, sequential redox dehydrogenations generating 3 NADH, 1 FADH2, and 1 GTP per turn.",
                "estimated_hours": 2.5,
                "difficulty": "intermediate",
                "prerequisites": ["node-2"]
            },
            {
                "id": "node-4",
                "title": "4. Mitochondrial Electron Transport Chain Complexes",
                "description": "Complexes I through IV electron flow, ubiquinone/cytochrome c shuttles, and intermembrane space proton pumping (ΔpH).",
                "estimated_hours": 3.0,
                "difficulty": "intermediate",
                "prerequisites": ["node-3"]
            },
            {
                "id": "node-5",
                "title": "5. Chemiosmosis & ATP Synthase Molecular Motor",
                "description": "Proton motive force (PMF), F0 rotor rotation, F1 catalytic conformational changes (Open, Loose, Tight) generating ~32 ATP.",
                "estimated_hours": 3.5,
                "difficulty": "advanced",
                "prerequisites": ["node-4"]
            },
            {
                "id": "node-6",
                "title": "6. Anaerobic Fermentation & Metabolic Regulation",
                "description": "Lactate and ethanol pathways for NAD+ regeneration, phosphofructokinase allosteric regulation by ATP/AMP ratios.",
                "estimated_hours": 4.0,
                "difficulty": "advanced",
                "prerequisites": ["node-5"]
            }
        ]
    },
    "industrial-revolution": {
        "title": "The Industrial Revolution & Global Modernity",
        "description": "Historical causality from mechanized steam power and enclosure movements to global trade networks and social transformations.",
        "nodes": [
            {
                "id": "node-1",
                "title": "1. Agrarian Preconditions & Energy Transitions",
                "description": "The British Agricultural Revolution, enclosure acts, capital accumulation, and transition from organic to mineral energy regimes.",
                "estimated_hours": 1.5,
                "difficulty": "beginner",
                "prerequisites": []
            },
            {
                "id": "node-2",
                "title": "2. Steam Power, Metallurgy & Textile Mechanization",
                "description": "Newcomen & Watt steam engines, Cort's puddling process for wrought iron, and Hargreaves' Spinning Jenny factories.",
                "estimated_hours": 2.0,
                "difficulty": "beginner",
                "prerequisites": ["node-1"]
            },
            {
                "id": "node-3",
                "title": "3. Transportation Infrastructure & Urbanization",
                "description": "Canal networks, Stephenson's Rocket railways, rapid rural-to-urban demographic shifts, and factory town sanitation crises.",
                "estimated_hours": 2.5,
                "difficulty": "intermediate",
                "prerequisites": ["node-2"]
            },
            {
                "id": "node-4",
                "title": "4. Labor Movements, Class Formation & Factory Acts",
                "description": "Emergence of the industrial proletariat, Luddite resistance, Chartism, and British legislative limits on child labor.",
                "estimated_hours": 3.0,
                "difficulty": "intermediate",
                "prerequisites": ["node-3"]
            },
            {
                "id": "node-5",
                "title": "5. Second Industrial Revolution: Steel, Electricity & Chemistry",
                "description": "Bessemer process, Edison/Tesla electrical grids, synthetic dye industries, and German/American industrial ascendance.",
                "estimated_hours": 3.5,
                "difficulty": "advanced",
                "prerequisites": ["node-4"]
            },
            {
                "id": "node-6",
                "title": "6. Imperialism, Global Commodity Chains & Modernity",
                "description": "Raw material extraction in colonial peripheries, international gold standard, and environmental legacy of the Anthropocene.",
                "estimated_hours": 4.0,
                "difficulty": "advanced",
                "prerequisites": ["node-5"]
            }
        ]
    }
}

class LearningPathService:
    @classmethod
    async def generate_or_get_learning_path(cls, topic_id: str, user_id: str, db: Session) -> LearningPath:
        # Check if existing path in DB for this user
        db_path = db.query(DBLearningPath).filter(
            DBLearningPath.topic_id == topic_id,
            DBLearningPath.user_id == user_id
        ).first()

        if db_path and db_path.dag_json:
            return LearningPath.model_validate(db_path.dag_json)

        clean_topic = topic_id.replace("-", " ").title()
        
        # Check if domain-specialized curriculum exists
        if topic_id.lower() in DOMAIN_CURRICULA:
            spec: Dict[str, Any] = DOMAIN_CURRICULA[topic_id.lower()]
            spec_nodes: List[Dict[str, Any]] = list(spec.get("nodes", []))
            nodes = [PathNode.model_validate(n) for n in spec_nodes]
            title = str(spec.get("title", clean_topic))
            description = str(spec.get("description", ""))
            edges = [
                {"from": "node-1", "to": "node-2"},
                {"from": "node-2", "to": "node-3"},
                {"from": "node-3", "to": "node-4"},
                {"from": "node-4", "to": "node-5"},
                {"from": "node-5", "to": "node-6"}
            ]
        else:
            # Try LLM to synthesize prerequisite-ordered curriculum DAG
            nodes = []
            edges = []
            title = f"Mastery Curriculum: {clean_topic}"
            description = f"Prerequisite-ordered curriculum DAG for {clean_topic} moving progressively from fundamentals to mastery."
            
            try:
                system_prompt = (
                    "You are an elite curriculum designer and cognitive learning architect. "
                    "Design a rigorous prerequisite-ordered curriculum DAG (5 to 6 nodes) for the given topic. "
                    "Each node must have a clear title, description, estimated_hours (float), difficulty ('beginner', 'intermediate', 'advanced'), and prerequisites array containing previous node IDs."
                )
                user_prompt = f"""Generate a prerequisite learning curriculum DAG for:
Topic: {clean_topic}

JSON output schema:
{{
  "title": "Comprehensive Mastery Path: {clean_topic}",
  "description": "Pedagogical overview of the curriculum DAG",
  "nodes": [
    {{
      "id": "node-1",
      "title": "1. Fundamental First Principles",
      "description": "Key intuition, definitions, and core concepts",
      "estimated_hours": 1.5,
      "difficulty": "beginner",
      "prerequisites": []
    }},
    {{
      "id": "node-2",
      "title": "2. Structural Mechanics & Equations",
      "description": "Governing laws and operations",
      "estimated_hours": 2.5,
      "difficulty": "intermediate",
      "prerequisites": ["node-1"]
    }}
  ]
}}
"""
                llm_dag = await LLMService.generate_json(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    schema_hint='{"title": "...", "description": "...", "nodes": [{"id": "node-1", "title": "...", "description": "...", "estimated_hours": 1.5, "difficulty": "beginner", "prerequisites": []}]}',
                    temperature=0.3
                )
                
                raw_nodes: List[Any] = llm_dag.get("nodes", []) if isinstance(llm_dag, dict) else []
                if raw_nodes and len(raw_nodes) >= 3:
                    for i, n in enumerate(raw_nodes):
                        if isinstance(n, dict):
                            nodes.append(PathNode(
                                id=str(n.get("id") or f"node-{i+1}"),
                                title=str(n.get("title") or f"Unit {i+1}"),
                                description=str(n.get("description") or ""),
                                estimated_hours=float(n.get("estimated_hours") or 2.0),
                                difficulty=str(n.get("difficulty") or "beginner"),
                                prerequisites=[str(p) for p in (n.get("prerequisites") or []) if p],
                                completed=False,
                                score=None
                            ))
                    title = llm_dag.get("title", title)
                    description = llm_dag.get("description", description)
                    
                    # Generate edges from prerequisites
                    for n in nodes:
                        for p in n.prerequisites:
                            edges.append({"from": p, "to": n.id})
                    if not edges:
                        for i in range(len(nodes) - 1):
                            edges.append({"from": nodes[i].id, "to": nodes[i+1].id})
            except Exception as e:
                logger.warning(f"[LearningPathService] LLM DAG generation failed ({e}); using Bloom's Taxonomy template.")

            if not nodes:
                stages: List[Dict[str, Any]] = [
                    {
                        "id": "node-1",
                        "title": "1. Foundations, Core Definitions & Intuition",
                        "description": f"First principles, historical context, fundamental terminology, and conceptual motivation behind {clean_topic}.",
                        "difficulty": "beginner",
                        "estimated_hours": 1.5,
                        "prerequisites": []
                    },
                    {
                        "id": "node-2",
                        "title": f"2. Structural Mechanics & Principles of {clean_topic}",
                        "description": f"Underlying governing laws, core variables, system interactions, and standard formulations in {clean_topic}.",
                        "difficulty": "beginner",
                        "estimated_hours": 2.0,
                        "prerequisites": ["node-1"]
                    },
                    {
                        "id": "node-3",
                        "title": f"3. Applied Techniques & Problem-Solving Routines",
                        "description": f"Step-by-step methodologies, practical executions, and standard problem-solving patterns in {clean_topic}.",
                        "difficulty": "intermediate",
                        "estimated_hours": 3.0,
                        "prerequisites": ["node-2"]
                    },
                    {
                        "id": "node-4",
                        "title": f"4. Experimental Diagnostics & Edge-Case Analysis",
                        "description": f"Analyzing failure modes, diagnostic criteria, boundary conditions, and performance optimization for {clean_topic}.",
                        "difficulty": "intermediate",
                        "estimated_hours": 3.5,
                        "prerequisites": ["node-3"]
                    },
                    {
                        "id": "node-5",
                        "title": f"5. Advanced Theory, Synthesis & Optimization",
                        "description": f"Rigorous comparative models, high-level optimizations, and asymptotic behaviors within {clean_topic}.",
                        "difficulty": "advanced",
                        "estimated_hours": 4.0,
                        "prerequisites": ["node-4"]
                    },
                    {
                        "id": "node-6",
                        "title": f"6. Capstone Integration & Real-World Case Studies",
                        "description": f"End-to-end multi-disciplinary projects, modern research frontiers, and industrial applications of {clean_topic}.",
                        "difficulty": "advanced",
                        "estimated_hours": 5.0,
                        "prerequisites": ["node-5"]
                    }
                ]

                nodes = [PathNode.model_validate(st) for st in stages]
                edges = [
                    {"from": "node-1", "to": "node-2"},
                    {"from": "node-2", "to": "node-3"},
                    {"from": "node-3", "to": "node-4"},
                    {"from": "node-4", "to": "node-5"},
                    {"from": "node-5", "to": "node-6"}
                ]

        path = LearningPath(
            topic_id=topic_id,
            title=title,
            description=description,
            nodes=nodes,
            edges=edges,
            completion_percentage=0.0
        )

        # Save to DB for this specific user
        new_db_path = DBLearningPath(
            id=str(uuid.uuid4()),
            user_id=user_id,
            topic_id=topic_id,
            title=path.title,
            dag_json=path.model_dump(),
            progress_percentage=0.0
        )
        db.add(new_db_path)
        db.commit()

        return path

    @classmethod
    async def toggle_node_completion(cls, topic_id: str, user_id: str, node_id: str, db: Session) -> LearningPath:
        db_path = db.query(DBLearningPath).filter(
            DBLearningPath.topic_id == topic_id,
            DBLearningPath.user_id == user_id
        ).first()

        if not db_path:
            await cls.generate_or_get_learning_path(topic_id, user_id, db)
            db_path = db.query(DBLearningPath).filter(
                DBLearningPath.topic_id == topic_id,
                DBLearningPath.user_id == user_id
            ).first()

        # Look up recent actual score if available for this user/topic
        recent_session = db.query(DBLessonSession).filter(DBLessonSession.user_id == user_id).order_by(DBLessonSession.created_at.desc()).first()
        recent_score = 100.0
        if recent_session:
            recent_attempt = db.query(DBQuizAttempt).filter(DBQuizAttempt.session_id == recent_session.id).order_by(DBQuizAttempt.created_at.desc()).first()
            if recent_attempt and recent_attempt.score_percentage is not None:
                recent_score = float(recent_attempt.score_percentage)

        if not db_path or not db_path.dag_json:
            return await cls.generate_or_get_learning_path(topic_id, user_id, db)

        data = dict(db_path.dag_json) if isinstance(db_path.dag_json, dict) else {}
        nodes = data.get("nodes", [])
        for n in nodes:
            if isinstance(n, dict) and n.get("id") == node_id:
                n["completed"] = not n.get("completed", False)
                if n["completed"] and not n.get("score"):
                    n["score"] = recent_score
                elif not n["completed"]:
                    n["score"] = None
                break

        completed_count = sum(1 for n in nodes if isinstance(n, dict) and n.get("completed", False))
        pct = round((completed_count / len(nodes)) * 100, 1) if nodes else 0.0
        data["completion_percentage"] = pct
        
        db_path.dag_json = data
        db_path.progress_percentage = pct
        db.commit()

        return LearningPath.model_validate(data)
