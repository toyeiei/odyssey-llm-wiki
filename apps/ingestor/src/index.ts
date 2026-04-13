export interface Env {
  DB: D1Database
  RAW_SOURCES: R2Bucket
  WIKI_PAGES: R2Bucket
  VECTORIZE_INDEX: VectorizeIndex
  AI: any
  ANTHROPIC_API_KEY: string
  OPENAI_API_KEY: string
  GEMINI_API_KEY: string
}

async function getEmbedding(text: string, env: Env): Promise<number[]> {
  const result = await env.AI.run('@cf/baai/bge-small-en-v1.5', { text: [text] })
  return result.data[0]
}

async function callAnthropic(prompt: string, env: Env, model: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20240620',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  const data: any = await res.json()
  return data.content[0].text
}

async function callOpenAI(prompt: string, env: Env, model: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4000
    })
  })
  const data: any = await res.json()
  return data.choices[0].message.content
}

async function callGemini(prompt: string, env: Env, model: string): Promise<string> {
  const apiModel = model || 'gemini-1.5-pro'
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4000
      }
    })
  })
  const data: any = await res.json()
  return data.candidates[0].content.parts[0].text
}

async function callLLM(prompt: string, model: string, env: Env): Promise<string> {
  console.log(`Routing request to: ${model}`)
  if (model.includes('claude')) {
    return callAnthropic(prompt, env, model)
  } else if (model.includes('gpt')) {
    return callOpenAI(prompt, env, model)
  } else if (model.includes('gemini')) {
    return callGemini(prompt, env, model)
  }
  // Default to Anthropic if unrecognized
  return callAnthropic(prompt, env, 'claude-3-5-sonnet-20240620')
}

function splitIntoChapters(text: string): string[] {
  // 1. Try to detect obvious chapter headers
  const chapterPattern = /(?:\n|^)(Chapter|CHAPTER|Section|SECTION)\s+([\dIVXLC]+)/g
  const matches = [...text.matchAll(chapterPattern)]
  
  if (matches.length > 1) {
    const chapters: string[] = []
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!
      const end = matches[i + 1] ? matches[i + 1].index : text.length
      chapters.push(text.slice(start, end))
    }
    return chapters
  }

  // 2. Fallback to semantic chunking (15,000 chars with 2,000 char overlap)
  const chunkSize = 15000
  const overlap = 2000
  const chunks: string[] = []
  let offset = 0
  
  while (offset < text.length) {
    const end = Math.min(offset + chunkSize, text.length)
    chunks.push(text.slice(offset, end))
    if (end === text.length) break
    offset += (chunkSize - overlap)
  }
  
  return chunks
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
      const fullText = await r2Object.text()
      await env.DB.prepare('UPDATE sources SET status = "processing" WHERE id = ?').bind(sourceId).run()

      try {
        // 1. Split into Chapters
        const chapters = splitIntoChapters(fullText)
        console.log(`Split source into ${chapters.length} segments.`)

        for (let i = 0; i < chapters.length; i++) {
          const chapterText = chapters[i]
          
          // 2. Fetch Context (Recursive Discovery)
          const brainObj = await env.WIKI_PAGES.get('brain/instruction.md')
          const brainPolicy = brainObj ? await brainObj.text() : 'You are a world-class bookkeeper for the Odyssey LLM Wiki.'
          
          // Parse ActiveModel from brain instructions
          const modelMatch = brainPolicy.match(/^ActiveModel:\s*(.+)$/m)
          const activeModel = modelMatch ? modelMatch[1].trim() : 'claude-3-5-sonnet-20240620'

          const indexObj = await env.WIKI_PAGES.get('wiki/index.md')
          const currentIndex = indexObj ? await indexObj.text() : '# Wiki Index'

          const queryVector = await getEmbedding(chapterText.slice(0, 1000), env)
          const vectorResults = await env.VECTORIZE_INDEX.query(queryVector, { topK: 5 })
          
          const existingPages = await env.DB.prepare('SELECT title, slug FROM wiki_pages').all()
          const pageList = existingPages.results.map((p: any) => `- ${p.title} (slug: ${p.slug})`).join('\n')

          // 3. Synthesize Chapter
          const prompt = `
            ${brainPolicy}

            CONTEXT:
            You are processing Part ${i + 1} of ${chapters.length} from "${sourceKey.split('/').pop()}".

            CURRENT WIKI INDEX:
            ${currentIndex}

            CHAPTER CONTENT:
            "${chapterText}"

            EXISTING WIKI PAGES:
            ${pageList}

            INSTRUCTIONS:
            1. Analyze this segment.
            2. Generate a new Markdown wiki page.
            3. Automatically insert [[Page Title]] syntax for links.
            4. Return ONLY the Markdown content.
          `

          const synthesizedMarkdown = await callLLM(prompt, activeModel, env)
          
          // 4. Storage & D1
          const titleMatch = synthesizedMarkdown.match(/^# (.+)/)
          const title = titleMatch ? titleMatch[1] : `Segment ${i + 1} from ${sourceKey.split('/').pop()}`
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

          // 5. Update Index & Log
          const newIndex = currentIndex + `\n- [[${title}]] (Part ${i + 1} of ${chapters.length})`
          await env.WIKI_PAGES.put('wiki/index.md', newIndex)
          
          const logEntry = `\n[${new Date().toISOString()}] Synthesized [[${title}]] (Segment ${i + 1}/${chapters.length}) from ${sourceKey}`
          const logObj = await env.WIKI_PAGES.get('wiki/log.md')
          const currentLog = logObj ? await logObj.text() : '# Audit Log'
          await env.WIKI_PAGES.put('wiki/log.md', currentLog + logEntry)

          // 6. Link Extraction
          const linkMatches = [...synthesizedMarkdown.matchAll(/\[\[(.+?)\]\]/g)]
          for (const match of linkMatches) {
            const targetTitle = match[1]
            const targetPage = await env.DB.prepare('SELECT id FROM wiki_pages WHERE title = ?').bind(targetTitle).first()
            if (targetPage) {
              await env.DB.prepare('INSERT OR IGNORE INTO wiki_links (from_page_id, to_page_id) VALUES (?, ?)')
                .bind(pageId, (targetPage as any).id).run()
            }
          }

          // 7. Vectorize
          const finalEmbedding = await getEmbedding(synthesizedMarkdown, env)
          await env.VECTORIZE_INDEX.upsert([{ id: pageId, values: finalEmbedding, metadata: { title, slug } }])
        }

        await env.DB.prepare('UPDATE sources SET status = "completed" WHERE id = ?').bind(sourceId).run()

      } catch (err) {
        console.error(`Ingestion failed: ${err}`)
        await env.DB.prepare('UPDATE sources SET status = "failed" WHERE id = ?').bind(sourceId).run()
      }
      
      message.ack()
    }
  },
}
