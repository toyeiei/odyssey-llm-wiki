import { describe, it, expect, vi, beforeEach } from 'vitest'
import app from '../src/index'

describe('Odyssey LLM Wiki API', () => {
  const mockEnv = {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      bind: vi.fn().mockReturnThis(),
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({ success: true }),
    },
    RAW_SOURCES: {
      put: vi.fn().mockResolvedValue({}),
      get: vi.fn().mockResolvedValue(null),
    },
    WIKI_PAGES: {
      get: vi.fn().mockResolvedValue(null),
    },
    INGESTION_QUEUE: {
      send: vi.fn().mockResolvedValue({}),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 for health check', async () => {
    const res = await app.request('/', {}, mockEnv as any)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('Odyssey LLM Wiki API is online.')
  })

  it('should return a list of wiki pages', async () => {
    const mockPages = [{ id: '1', title: 'Test Page', slug: 'test-page' }]
    mockEnv.DB.all.mockResolvedValueOnce({ results: mockPages })

    const res = await app.request('/api/pages', {}, mockEnv as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.pages).toEqual(mockPages)
  })

  it('should return 404 for non-existent page', async () => {
    const res = await app.request('/api/pages/non-existent', {}, mockEnv as any)
    expect(res.status).toBe(404)
  })

  it('should initiate ingestion on source upload', async () => {
    const formData = new FormData()
    formData.append('file', new Blob(['test content'], { type: 'text/plain' }), 'test.txt')

    const res = await app.request('/api/sources/upload', {
      method: 'POST',
      body: formData,
    }, mockEnv as any)

    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toBe('Ingestion initiated.')
    expect(mockEnv.RAW_SOURCES.put).toHaveBeenCalled()
    expect(mockEnv.DB.run).toHaveBeenCalled()
    expect(mockEnv.INGESTION_QUEUE.send).toHaveBeenCalled()
  })

  it('should return graph data', async () => {
    const mockNodes = [{ id: '1', name: 'Node 1', slug: 'node-1' }]
    const mockLinks = [{ source: '1', target: '2' }]
    
    mockEnv.DB.all.mockResolvedValueOnce({ results: mockNodes }) // Nodes
    mockEnv.DB.all.mockResolvedValueOnce({ results: mockLinks }) // Links

    const res = await app.request('/api/graph', {}, mockEnv as any)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.nodes).toEqual(mockNodes)
    expect(body.links).toEqual(mockLinks)
  })
})
