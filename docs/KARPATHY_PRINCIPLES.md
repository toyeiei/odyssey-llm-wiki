# Karpathy's LLM Wiki Principles

This document serves as the foundational architectural and philosophical guide for the **Odyssey LLM Wiki**, based on the concept proposed by Andrej Karpathy.

## 1. The Three-Layer Architecture

### Layer 1: Immutable Raw Sources (`sources/`)
- Store the original, raw data (PDFs, transcripts, articles, etc.) in R2.
- **Principle:** Never delete or modify the ground truth. Use it for re-synthesis if the LLM's "thinking" changes.

### Layer 2: Synthesized Wiki Pages (`wiki/`)
- Human-readable, LLM-maintained Markdown files in R2.
- **Principle:** These are the *compounding* knowledge. They are not just summaries; they are a structured, interlinked collection of insights that grow as more sources are ingested.

### Layer 3: Central Schema Document (`schema.md`)
- A single markdown file that defines the wiki's organizational structure, style, and naming conventions.
- **Principle:** This is the "brain's" configuration. The LLM refers to this to decide where new information belongs.

## 2. Automated Bookkeeping (Link Curation)
- Humans are terrible at cross-referencing; LLMs are excellent at it.
- **Principle:** The LLM is responsible for inserting `[[Wiki-Links]]` during ingestion. If a new source mentions a concept already in the wiki, it *must* link to it.

## 3. Recursive Synthesis (Compounding Knowledge)
- Standard RAG has high "repetitive discovery costs."
- **Principle:** Instead of searching raw sources every time, the LLM should primarily query the *Wiki* for answers. Ingestion should **update** existing pages, not just create new ones, to refine and consolidate information.

## 4. The Maintenance Cycle (Linting)
- A wiki naturally drifts into chaos over time.
- **Principle:** A periodic background task ("Linter") reads the wiki and the `schema.md` to:
  - Fix broken links.
  - Merge overlapping pages.
  - Identify missing topics.
  - Ensure consistent naming (e.g., `LLM` vs `Large Language Models`).

## 5. Zen Simplicity
- The UI should focus on the **content**, not the management.
- **Principle:** The human is the **curator**, the LLM is the **bookkeeper**. The interface should be distraction-free and ultrafast.

---
*Derived from: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f*
