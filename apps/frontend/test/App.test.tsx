import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

// Mock the API calls
global.fetch = vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({ pages: [] })
})

describe('Odyssey LLM Wiki Frontend', () => {
  it('should render the app title', async () => {
    render(<App />)
    expect(screen.getByText('Odyssey LLM Wiki')).toBeDefined()
  })

  it('should show the welcome message by default', async () => {
    render(<App />)
    expect(screen.getByText(/\$ odyssey-llm-wiki --help/i)).toBeDefined()
  })

  it('should have a toggle button for graph view', () => {
    render(<App />)
    expect(screen.getByText('Graph View')).toBeDefined()
  })
})
