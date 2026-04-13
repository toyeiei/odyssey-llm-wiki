# Odyssey LLM Wiki - Project Context

This project is a persistent, compounding knowledge base built on Cloudflare infrastructure, following the "LLM Wiki" architecture proposed by Andrej Karpathy.

## Tech Stack
- **Frontend:** React + TypeScript (Cloudflare Pages)
- **API:** Hono.js (Cloudflare Workers)
- **Ingestion Pipeline:** Cloudflare Queues + Workers
- **Database:** Cloudflare D1 (SQLite)
- **File Storage:** Cloudflare R2
- **Vector Search:** Cloudflare Vectorize
- **AI:** External APIs (OpenAI/Anthropic) for reasoning, Cloudflare Workers AI for embeddings.

## Core Mandates
- **TDD (Test-Driven Development):** Always write tests for new features. Use Vitest.
- **Zero Technical Debt:** Maintain clean, modular code. Refactor proactively.
- **Zen Aesthetic:** Keep the UI minimalist, focus on content and typography.
- **Automated Bookkeeping:** The LLM should handle link management, summarization, and consistency checks (linting).

## Development Workflows
- **Ingestion Flow:** Raw Source (R2) -> Queue -> Ingestor Worker -> Synthesized Page (R2) + Metadata (D1).
- **Maintenance Flow:** Scheduled Cron -> Maintenance Worker -> Wiki Graph Update / Broken Link Check.

## Key Files
- `packages/shared/src/schema.sql`: D1 Database schema.
- `apps/api/src/index.ts`: API entry point.
- `apps/ingestor/src/index.ts`: Asynchronous ingestion logic.
- `apps/frontend/src/App.tsx`: Zen-style React interface.
