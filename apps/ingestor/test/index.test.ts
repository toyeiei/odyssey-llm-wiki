import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from '../src/index'

describe('Odyssey LLM Wiki Ingestor', () => {
  const mockEnv = {
    DB: {
      prepare: vi.fn().mockReturnThis(),
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({ success: true }),
    },
    RAW_SOURCES: {
      get: vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue('raw content'),
      }),
    },
    WIKI_PAGES: {
      put: vi.fn().mockResolvedValue({}),
    },
    VECTORIZE_INDEX: {},
    AI: {},
    OPENAI_API_KEY: 'test-key',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process a batch of messages', async () => {
    const mockMessage = {
      body: { sourceId: '1', sourceKey: 'test.txt' },
      ack: vi.fn(),
    }
    const mockBatch = {
      messages: [mockMessage],
    }

    await (worker as any).queue(mockBatch as any, mockEnv as any)

    expect(mockEnv.RAW_SOURCES.get).toHaveBeenCalledWith('test.txt')
    expect(mockEnv.DB.run).toHaveBeenCalled() // status update
    expect(mockEnv.WIKI_PAGES.put).toHaveBeenCalled()
    expect(mockMessage.ack).toHaveBeenCalled()
  })

  it('should handle missing source file', async () => {
    mockEnv.RAW_SOURCES.get.mockResolvedValueOnce(null)
    const mockMessage = {
      body: { sourceId: '1', sourceKey: 'missing.txt' },
      ack: vi.fn(),
    }
    const mockBatch = {
      messages: [mockMessage],
    }

    await (worker as any).queue(mockBatch as any, mockEnv as any)

    expect(mockMessage.ack).toHaveBeenCalled()
    expect(mockEnv.WIKI_PAGES.put).not.toHaveBeenCalled()
  })
})
