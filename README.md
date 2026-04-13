# Odyssey LLM Wiki

A persistent, compounding LLM knowledge base built on Cloudflare infrastructure, inspired by Andrej Karpathy's architecture.

## Architecture
- **Frontend:** React + TypeScript (Cloudflare Pages)
- **API:** Hono.js (Cloudflare Workers)
- **Ingestion:** Event-driven (Cloudflare Queues + Workers)
- **Maintenance:** Scheduled tasks (Cloudflare Cron Triggers)
- **Storage:** R2 (Files), D1 (Metadata), Vectorize (Search)

## Getting Started

### 1. Provision Cloudflare Resources
Run the following commands using `wrangler` to create the necessary resources:

```bash
# Create D1 Database
npx wrangler d1 create odyssey-llm-wiki-db

# Create R2 Buckets
npx wrangler r2 bucket create odyssey-llm-wiki-raw-sources
npx wrangler r2 bucket create odyssey-llm-wiki-pages

# Create Ingestion Queue
npx wrangler queues create odyssey-llm-wiki-ingestion-queue

# Create Vectorize Index
npx wrangler vectorize create odyssey-llm-wiki-index --dimensions=768 --metric=cosine
```

Update the `database_id` in `apps/api/wrangler.toml` and `apps/ingestor/wrangler.toml` with the ID returned by the D1 create command.

### 2. Initialize Database
Apply the schema to your D1 database:

```bash
npx wrangler d1 execute odyssey-llm-wiki-db --file=packages/shared/src/schema.sql
```

### 3. Local Development
Install dependencies:
```bash
npm install
```

Start the API and Frontend:
```bash
# In separate terminals
npm run dev:api
npm run dev:frontend
```

### 4. Deployment
Deploy each app using wrangler:
```bash
npm run deploy:api
npm run deploy:frontend
npm run deploy:ingestor
```

Don't forget to set your `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` as a secret in the ingestor:
```bash
npx wrangler secret put OPENAI_API_KEY -w apps/ingestor
```

## Core Philosophy
1. **Automated Bookkeeping:** The LLM manages the links and summaries, not the human.
2. **Persistence:** Knowledge compounds over time in structured Markdown files.
3. **Zen Aesthetics:** Minimalist UI to focus on content.
