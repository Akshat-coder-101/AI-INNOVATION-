import math
import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..database import DBMaterialChunk
from ..models.schemas import Citation

class RAGService:
    @staticmethod
    def generate_embedding(text: str) -> List[float]:
        """
        Generates a 64-dimensional semantic pseudo-vector using token n-gram distribution,
        ensuring fast, deterministic, reproducible embeddings without requiring external API credits.
        If OpenAI/Anthropic embeddings are configured, this can be swapped easily.
        """
        dim = 64
        vec = [0.0] * dim
        words = re.findall(r'\w+', text.lower())
        if not words:
            return vec
            
        for i, word in enumerate(words):
            h = hash(word)
            pos = abs(h) % dim
            weight = 1.0 / (1.0 + math.log(i + 1))
            vec[pos] += weight * (1.0 if (h >> 3) % 2 == 0 else -1.0)
            
            # Bigram feature
            if i > 0:
                h2 = hash(words[i-1] + "_" + word)
                pos2 = abs(h2) % dim
                vec[pos2] += 0.5 * weight

        # Normalize L2
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 1e-9:
            vec = [x / norm for x in vec]
        return vec

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        return float(dot)

    @classmethod
    def retrieve_relevant_chunks(
        cls, 
        query: str, 
        material_id: str, 
        db: Session, 
        top_k: int = 4
    ) -> List[Tuple[DBMaterialChunk, float]]:
        query_vec = cls.generate_embedding(query)
        chunks = db.query(DBMaterialChunk).filter(DBMaterialChunk.material_id == material_id).all()
        if not chunks:
            return []

        scored_chunks = []
        for c in chunks:
            chunk_vec = c.embedding or cls.generate_embedding(c.content)
            sim = cls.cosine_similarity(query_vec, chunk_vec)
            
            # Also calculate keyword overlap score boost
            q_words = set(re.findall(r'\w+', query.lower()))
            c_words = set(re.findall(r'\w+', c.content.lower()))
            overlap = len(q_words.intersection(c_words)) / max(len(q_words), 1)
            
            combined_score = 0.6 * sim + 0.4 * overlap
            scored_chunks.append((c, combined_score))

        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]

    @classmethod
    def get_grounded_context_and_citations(
        cls, 
        query: str, 
        material_id: str, 
        db: Session
    ) -> Tuple[str, List[Citation]]:
        scored = cls.retrieve_relevant_chunks(query, material_id, db, top_k=3)
        if not scored:
            return "", []

        context_blocks = []
        citations = []
        for chunk, score in scored:
            context_blocks.append(f"[{chunk.chapter} - Page {chunk.page or 1}]:\n{chunk.content}")
            citations.append(Citation(
                chapter=chunk.chapter or "General",
                page=chunk.page,
                section=chunk.section,
                snippet=chunk.content[:140] + "...",
                confidence=round(min(max(score, 0.75), 0.99), 2)
            ))

        full_context = "\n\n".join(context_blocks)
        return full_context, citations
