# How to use Odyssey LLM Wiki

Welcome to your personal Odyssey. This system is designed to be an instruction-driven, compounding knowledge base. Follow this guide to curate and grow your "Brain."

## 1. Setup Your Environment
Ensure your local services are active:
- **API:** `npm run dev:api`
- **Frontend:** `npm run dev`
- **Ingestor:** `npm run dev`

## 2. Program Your "Brain" (Layer 3)
You are the architect. You can re-program your AI agent's personality and reasoning without touching code.
1. Open the app (`http://localhost:5173`).
2. Press **CTRL+K** and search for **"Brain Instructions"**.
3. Click **Edit**.
4. Define your agent's persona. Example: *"You are a concise researcher. Prioritize technical depth and always create [[wikilinks]] for core concepts."*
5. **Save** to apply your new instructions instantly.

## 3. Ingest Your Knowledge (Layer 1)
1. Press **CTRL+B** to open the Ingestion sidebar.
2. Select your raw source file (PDF, text, blog).
3. Click **Upload**.
4. The system will:
    - Apply your **Brain** instructions.
    - Synthesize the content.
    - Automatically create/update pages in the `wiki/` folder.
    - Log the activity in `wiki/log.md`.
    - Update your `wiki/index.md` automatically.

## 4. Curate Your Wiki (Layer 2)
The AI is your bookkeeper; you are the curator.
- **Edit Manually:** Navigate to any page, click **Edit**, and refine the Markdown directly using the built-in dual-pane editor.
- **Use [[Wiki-Links]]:** Manually link concepts inside your pages. The AI will learn these connections and begin linking them automatically on future ingests.
- **Graph View:** Click "Graph View" to visualize how your knowledge is interlinking and growing.

## 5. Maintenance
- **Monitor the Log:** Always check `wiki/log.md` if you need to trace what the system has processed.
- **Manage the Index:** Keep `wiki/index.md` clean to ensure you have a structured map of your evolving knowledge.

---
*Remember: The agent learns from your edits. The more you curate, the smarter your Odyssey becomes.*
