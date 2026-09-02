import io
import uuid
import re
from typing import List, Dict, Any, Tuple, Optional
from pypdf import PdfReader
import docx
import pptx
from sqlalchemy.orm import Session
from ..database import DBMaterial, DBMaterialChunk

def clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def chunk_text(text: str, chunk_size_words: int = 250, overlap_words: int = 40) -> List[str]:
    words = text.split()
    chunks = []
    if not words:
        return chunks
    
    start = 0
    while start < len(words):
        end = min(start + chunk_size_words, len(words))
        chunk = " ".join(words[start:end])
        if len(chunk.strip()) > 30:
            chunks.append(chunk)
        if end >= len(words):
            break
        start += chunk_size_words - overlap_words
    return chunks

class IngestionService:
    @staticmethod
    def parse_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_content = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_content.append({
                    "page_number": i + 1,
                    "text": clean_text(text)
                })
        return pages_content

    @staticmethod
    def parse_docx(file_bytes: bytes) -> List[Dict[str, Any]]:
        doc = docx.Document(io.BytesIO(file_bytes))
        sections = []
        current_heading = "Introduction"
        current_text = []
        
        for para in doc.paragraphs:
            style_name = para.style.name if para.style and para.style.name else ""
            if style_name.startswith("Heading"):
                if current_text:
                    sections.append({
                        "heading": current_heading,
                        "text": clean_text(" ".join(current_text))
                    })
                    current_text = []
                current_heading = para.text.strip() or current_heading
            else:
                if para.text.strip():
                    current_text.append(para.text.strip())
                    
        if current_text:
            sections.append({
                "heading": current_heading,
                "text": clean_text(" ".join(current_text))
            })
        return sections

    @staticmethod
    def parse_pptx(file_bytes: bytes) -> List[Dict[str, Any]]:
        prs = pptx.Presentation(io.BytesIO(file_bytes))
        slides = []
        for i, slide in enumerate(prs.slides):
            slide_text = []
            title = f"Slide {i+1}"
            for shape in slide.shapes:
                if getattr(shape, "has_text_frame", False):
                    tf = getattr(shape, "text_frame", None)
                    if tf:
                        for paragraph in tf.paragraphs:
                            if paragraph.text.strip():
                                slide_text.append(paragraph.text.strip())
            if slide.shapes.title and slide.shapes.title.text.strip():
                title = slide.shapes.title.text.strip()
            
            if slide_text:
                slides.append({
                    "slide_number": i + 1,
                    "title": title,
                    "text": clean_text(" ".join(slide_text))
                })
        return slides

    @classmethod
    def process_file(cls, filename: str, content: bytes, db: Session) -> Dict[str, Any]:
        material_id = str(uuid.uuid4())
        ext = filename.split(".")[-1].lower()
        
        raw_chunks_with_meta: List[Dict[str, Any]] = []
        detected_chapters: List[Dict[str, Any]] = []
        all_text = ""
        
        if ext == "pdf":
            pages = cls.parse_pdf(content)
            all_text = "\n".join([p["text"] for p in pages])
            for p in pages:
                sub_chunks = chunk_text(p["text"])
                chapter_name = f"Chapter/Page {p['page_number']}"
                detected_chapters.append({
                    "title": chapter_name,
                    "page": p["page_number"],
                    "preview": p["text"][:150] + "..."
                })
                for idx, chunk in enumerate(sub_chunks):
                    raw_chunks_with_meta.append({
                        "chapter": chapter_name,
                        "page": p["page_number"],
                        "section": f"Section {idx+1}",
                        "content": chunk
                    })
                    
        elif ext in ["docx", "doc"]:
            sections = cls.parse_docx(content)
            all_text = "\n".join([s["text"] for s in sections])
            for i, s in enumerate(sections):
                detected_chapters.append({
                    "title": s["heading"],
                    "page": i + 1,
                    "preview": s["text"][:150] + "..."
                })
                sub_chunks = chunk_text(s["text"])
                for idx, chunk in enumerate(sub_chunks):
                    raw_chunks_with_meta.append({
                        "chapter": s["heading"],
                        "page": i + 1,
                        "section": f"Part {idx+1}",
                        "content": chunk
                    })
                    
        elif ext in ["pptx", "ppt"]:
            slides = cls.parse_pptx(content)
            all_text = "\n".join([s["text"] for s in slides])
            for s in slides:
                detected_chapters.append({
                    "title": s["title"],
                    "page": s["slide_number"],
                    "preview": s["text"][:150] + "..."
                })
                sub_chunks = chunk_text(s["text"])
                for idx, chunk in enumerate(sub_chunks):
                    raw_chunks_with_meta.append({
                        "chapter": s["title"],
                        "page": s["slide_number"],
                        "section": f"Slide {s['slide_number']}",
                        "content": chunk
                    })
                    
        else: # Plain text or fallback
            text = content.decode("utf-8", errors="ignore")
            all_text = text
            sub_chunks = chunk_text(text)
            detected_chapters.append({
                "title": "Document Content",
                "page": 1,
                "preview": text[:150] + "..."
            })
            for idx, chunk in enumerate(sub_chunks):
                raw_chunks_with_meta.append({
                    "chapter": f"Topic Section {idx+1}",
                    "page": 1,
                    "section": f"Section {idx+1}",
                    "content": chunk
                })

        # Save material record
        db_material = DBMaterial(
            id=material_id,
            filename=filename,
            content_type=ext,
            total_sections=len(detected_chapters),
            raw_text=all_text[:50000] # Store preview
        )
        db.add(db_material)

        # Save chunks with semantic vector representation
        from .rag import RAGService
        for item in raw_chunks_with_meta:
            embedding = RAGService.generate_embedding(item["content"])
            db_chunk = DBMaterialChunk(
                id=str(uuid.uuid4()),
                material_id=material_id,
                chapter=item["chapter"],
                page=item.get("page", 1),
                section=item.get("section", ""),
                content=item["content"],
                embedding=embedding,
                token_count=len(item["content"].split())
            )
            db.add(db_chunk)

        db.commit()

        return {
            "material_id": material_id,
            "filename": filename,
            "total_pages_or_sections": len(detected_chapters),
            "chunks_count": len(raw_chunks_with_meta),
            "chapters": detected_chapters[:20],
            "preview": all_text[:300] + "..."
        }
