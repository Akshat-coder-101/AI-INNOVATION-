# RAG & Grounded Knowledge Pipeline

## 1. Multi-Format Ingestion
Supported formats:
- **PDF** via `pypdf`
- **DOCX** via `python-docx`
- **PPTX** via `python-pptx`
- **TXT / Markdown**

## 2. Semantic Chunking
- Chunks are sized at ~250–300 words with 40-word semantic overlap.
- Chapter headings, slide titles, and page numbers are preserved directly in chunk metadata.

## 3. Strict Citations & Zero-Hallucination UI
Every retrieved chunk is displayed under the live transcript as an interactive `CitationChip`. Evaluators can click to inspect the verbatim source snippet and cosine confidence match.
