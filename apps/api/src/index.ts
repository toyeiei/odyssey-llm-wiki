import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  RAW_SOURCES: R2Bucket
  WIKI_PAGES: R2Bucket
  INGESTION_QUEUE: Queue
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('*', cors())

app.get('/', (c) => {
  return c.text('Odyssey LLM Wiki API is online.')
})

// Endpoint to list wiki pages from D1
app.get('/api/pages', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM wiki_pages ORDER BY updated_at DESC'
  ).all()
  return c.json({ pages: results })
})

// Endpoint to fetch graph data (nodes and links)
app.get('/api/graph', async (c) => {
  const pages = await c.env.DB.prepare(
    'SELECT id, title as name, slug FROM wiki_pages'
  ).all()
  
  const links = await c.env.DB.prepare(
    'SELECT from_page_id as source, to_page_id as target FROM wiki_links'
  ).all()

  return c.json({
    nodes: pages.results,
    links: links.results
  })
})

// Get single page and its related sources
app.get('/api/pages/:slug', async (c) => {
  const slug = c.req.param('slug')
  const page = await c.env.DB.prepare(
    'SELECT * FROM wiki_pages WHERE slug = ?'
  ).bind(slug).first()
  
  if (!page) return c.json({ error: 'Page not found' }, 404)

  const sources = await c.env.DB.prepare(`
    SELECT s.* FROM sources s
    JOIN source_wiki_mapping m ON s.id = m.source_id
    WHERE m.wiki_page_id = ?
  `).bind(page.id).all()

  // Fetch content from R2
  const r2Object = await c.env.WIKI_PAGES.get(page.content_key)
  if (!r2Object) return c.json({ error: 'Wiki content missing' }, 404)
  const content = await r2Object.text()

  return c.json({ page, sources: sources.results, content })
})

// Endpoint to upload a new raw source to R2 and trigger ingestion queue
app.post('/api/sources/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body.file as File
  if (!file) return c.json({ error: 'No file uploaded' }, 400)

  const id = crypto.randomUUID()
  const key = `sources/${id}/${file.name}`
  
  // 1. Upload to R2
  await c.env.RAW_SOURCES.put(key, file.stream())

  // 2. Register in D1
  await c.env.DB.prepare(
    'INSERT INTO sources (id, key, name, type) VALUES (?, ?, ?, ?)'
  ).bind(id, key, file.name, file.type).run()

  // 3. Send to Queue
  await c.env.INGESTION_QUEUE.send({ sourceId: id, sourceKey: key })

  return c.json({ message: 'Ingestion initiated.', sourceId: id })
})

export default app
