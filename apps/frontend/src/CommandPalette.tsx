import React, { useState, useEffect, useRef } from 'react'

interface Page {
  id: string
  title: string
  slug: string
}

interface CommandPaletteProps {
  isOpen: boolean
  onClose: () => void
  pages: Page[]
  onSelect: (slug: string) => void
}

const CommandPalette = ({ isOpen, onClose, pages, onSelect }: CommandPaletteProps) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredPages = pages.filter(p => 
    p.title.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % filteredPages.length)
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + filteredPages.length) % filteredPages.length)
      }
      if (e.key === 'Enter' && filteredPages[selectedIndex]) {
        onSelect(filteredPages[selectedIndex].slug)
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredPages, selectedIndex, onSelect, onClose])

  if (!isOpen) return null

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette-modal" onClick={e => e.stopPropagation()}>
        <div className="palette-header">
          <span className="prompt">$ search_wiki --query </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="..."
          />
        </div>
        <div className="palette-results">
          {filteredPages.map((p, i) => (
            <div
              key={p.id}
              className={`palette-item ${i === selectedIndex ? 'active' : ''}`}
              onMouseEnter={() => setSelectedIndex(i)}
              onClick={() => {
                onSelect(p.slug)
                onClose()
              }}
            >
              <span className="file-icon">[[ </span>
              {p.title}
              <span className="file-icon"> ]]</span>
              {i === selectedIndex && <span className="cursor">█</span>}
            </div>
          ))}
          {filteredPages.length === 0 && query && (
            <div className="palette-empty">No entries found for "{query}"</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
