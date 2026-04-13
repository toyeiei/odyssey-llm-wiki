export interface Env {
  DB: D1Database
  RAW_SOURCES: R2Bucket
  WIKI_PAGES: R2Bucket
  VECTORIZE_INDEX: VectorizeIndex
  AI: any
  OPENAI_API_KEY: string
  ANTHROPIC_API_KEY: string
}

async function getEmbedding(text: string, env: Env): Promise<number[]> {
  const result = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [text] })
  return result.data[0]
}

async function callLLM(prompt: string, env: Env): Promise<string> {
  // Using Anthropic as the primary reasoning engine for world-class synthesis
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data: any = await res.json()
  return data.content[0].text
}

export default {
  async queue(batch: MessageBatch<any>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { sourceId, sourceKey } = message.body
      
      const r2Object = await env.RAW_SOURCES.get(sourceKey)
      if (!r2Object) {
        message.ack()
        continue
      }
      const rawText = await r2Object.text()
      await env.DB.prepare('UPDATE sources SET status = "processing" WHERE id = ?').bind(sourceId).run()

      try {
        // 1. Fetch Brain Policy & Wiki State
        const brainObj = await env.WIKI_PAGES.get('brain/instruction.md')
        const brainPolicy = brainObj ? await brainObj.text() : 'You are a world-class bookkeeper for the Odyssey LLM Wiki.'
        
        const indexObj = await env.WIKI_PAGES.get('wiki/index.md')
        const currentIndex = indexObj ? await indexObj.text() : '# Wiki Index'

        // 2. Context Discovery
        const queryVector = await getEmbedding(rawText.slice(0, 1000), env)
        const vectorResults = await env.VECTORIZE_INDEX.query(queryVector, { topK: 5 })
        
        const existingPages = await env.DB.prepare(
          'SELECT title, slug FROM wiki_pages'
        ).all()
        const pageList = existingPages.results.map((p: any) => `- ${p.title} (slug: ${p.slug})`).join('\n')

        // 3. Synthesize with LLM (Instruction-Driven)
        const prompt = `
          ${brainPolicy}

          CURRENT WIKI INDEX:
          ${currentIndex}

          NEW SOURCE CONTENT:
          "${rawText.slice(0, 10000)}"

          EXISTING WIKI PAGES:
          ${pageList}

          INSTRUCTIONS:
          1. Analyze the new source against the current wiki.
          2. Generate a new Markdown document for this insight.
          3. Automatically insert wiki-links using [[Page Title]] syntax.
          4. Return ONLY the Markdown content for the NEW page.
        `

        const synthesizedMarkdown = await callLLM(prompt, env)
        
        // 4. Update Storage
        const titleMatch = synthesizedMarkdown.match(/^# (.+)/)
        const title = titleMatch ? titleMatch[1] : `Untitled Insight ${sourceId.slice(0, 8)}`
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const pageId = crypto.randomUUID()
        const contentKey = `wiki/${pageId}.md`

        await env.WIKI_PAGES.put(contentKey, synthesizedMarkdown)
        await env.DB.prepare(
          'INSERT INTO wiki_pages (id, title, content_key, slug) VALUES (?, ?, ?, ?)'
        ).bind(pageId, title, contentKey, slug).run()
        
        await env.DB.prepare(
          'INSERT INTO source_wiki_mapping (source_id, wiki_page_id) VALUES (?, ?)'
        ).bind(sourceId, pageId).run()

        // 5. Update Index & Log (Programmatic Bookkeeping)
        const newIndex = currentIndex + `\n- [[${title}]] (Added ${new Date().toISOString().split('T')[0]})`
        await env.WIKI_PAGES.put('wiki/index.md', newIndex)
        
        const logEntry = `\n[${new Date().toISOString()}] Synthesized [[${title}]] from ${sourceKey}`
        const logObj = await env.WIKI_PAGES.get('wiki/log.md')
        const currentLog = logObj ? await logObj.text() : '# Audit Log'
        await env.WIKI_PAGES.put('wiki/log.md', currentLog + logEntry)

        // 6. Automatic Link Extraction
        const linkMatches = [...synthesizedMarkdown.matchAll(/\[\[(.+?)\]\]/g)]
        for (const match of linkMatches) {
          const targetTitle = match[1]
          const targetPage = await env.DB.prepare(
            'SELECT id FROM wiki_pages WHERE title = ?'
          ).bind(targetTitle).first()
          
          if (targetPage) {
            await env.DB.prepare(
              'INSERT OR IGNORE INTO wiki_links (from_page_id, to_page_id) VALUES (?, ?)'
            ).bind(pageId, (targetPage as any).id).run()
          }
        }

        // 7. Finalize
        const finalEmbedding = await getEmbedding(synthesizedMarkdown, env)
        await env.VECTORIZE_INDEX.upsert([{ id: pageId, values: finalEmbedding, metadata: { title, slug } }])
        await env.DB.prepare('UPDATE sources SET status = "completed" WHERE id = ?').bind(sourceId).run()

      } catch (err) {
        console.error(`Ingestion failed: ${err}`)
        await env.DB.prepare('UPDATE sources SET status = "failed" WHERE id = ?').bind(sourceId).run()
      }
      
      message.ack()
    }
  },
}
