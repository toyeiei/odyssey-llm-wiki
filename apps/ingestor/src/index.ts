export interface Env {
  DB: D1Database
  RAW_SOURCES: R2Bucket
  WIKI_PAGES: R2Bucket
  VECTORIZE_INDEX: VectorizeIndex
  AI: any
  // External LLM API key would go in secrets
  OPENAI_API_KEY: string
}

export default {
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { sourceId, sourceKey } = message.body
      console.log(`Processing ingestion for source: ${sourceKey}`)
      
      // 1. Fetch from RAW_SOURCES
      const r2Object = await env.RAW_SOURCES.get(sourceKey)
      if (!r2Object) {
        console.error(`Source not found: ${sourceKey}`)
        message.ack()
        continue
      }
      const rawText = await r2Object.text()

      // 2. Update status to 'processing'
      await env.DB.prepare('UPDATE sources SET status = "processing" WHERE id = ?').bind(sourceId).run()

      try {
        // Phase 3: Synthesize wiki page
        // For now, let's create a placeholder wiki page for each source.
        const pageId = crypto.randomUUID()
        const title = `Insight from ${sourceKey.split('/').pop()}`
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const contentKey = `wiki/${pageId}.md`
        const markdown = `# ${title}\n\nSynthesized content from ${sourceKey} would go here.`

        // 3. Save Markdown to WIKI_PAGES
        await env.WIKI_PAGES.put(contentKey, markdown)

        // 4. Register in D1
        await env.DB.prepare(`
          INSERT INTO wiki_pages (id, title, content_key, slug) VALUES (?, ?, ?, ?)
        `).bind(pageId, title, contentKey, slug).run()

        // 5. Map source to wiki page
        await env.DB.prepare(`
          INSERT INTO source_wiki_mapping (source_id, wiki_page_id) VALUES (?, ?)
        `).bind(sourceId, pageId).run()

        // 6. Finalize status
        await env.DB.prepare('UPDATE sources SET status = "completed" WHERE id = ?').bind(sourceId).run()
      } catch (err) {
        console.error(`Ingestion failed: ${err}`)
        await env.DB.prepare('UPDATE sources SET status = "failed" WHERE id = ?').bind(sourceId).run()
      }
      
      message.ack()
    }
  },
}
