import { useState, useEffect } from 'react'
import './App.css'
import GraphView from './GraphView'
import CommandPalette from './CommandPalette'

interface Page {
  id: string
  title: string
  slug: string
  updated_at: string
}

function App() {
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPage, setSelectedPage] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isGraphView, setIsGraphView] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isPaletteOpen, setIsPaletteOpen] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

  useEffect(() => {
    fetchPages()

    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsPaletteOpen(prev => !prev)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        setIsSidebarOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleGlobalKeys)
    return () => window.removeEventListener('keydown', handleGlobalKeys)
  }, [])

  const fetchPages = async () => {
    const res = await fetch(`${API_URL}/api/pages`)
    const data = await res.json()
    setPages(data.pages || [])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      await fetch(`${API_URL}/api/sources/upload`, {
        method: 'POST',
        body: formData
      })
      alert('Upload successful! Processing...')
      setFile(null)
      fetchPages()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const selectPage = async (slug: string) => {
    const res = await fetch(`${API_URL}/api/pages/${slug}`)
    const data = await res.json()
    setSelectedPage(data)
    setIsGraphView(false)
    setIsSidebarOpen(false)
  }

  return (
    <div className="container">
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        pages={pages}
        onSelect={selectPage}
      />

      <header className="zen-header">
        <div className="header-top">
          <div className="header-left">
            <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ marginRight: '1rem' }}>
              Menu
            </button>
            <h1>Odyssey LLM Wiki</h1>
          </div>
          <div className="header-right">
            <span style={{ fontSize: '0.7rem', color: '#444', marginRight: '1rem' }}>
              CTRL+K to Search | CTRL+B for Menu
            </span>
            <button className="toggle-btn" onClick={() => setIsGraphView(!isGraphView)}>
              {isGraphView ? 'Wiki View' : 'Graph View'}
            </button>
          </div>
        </div>
      </header>

      <main className="zen-main">
        {isSidebarOpen && <div className="palette-overlay" style={{ background: 'transparent', zIndex: 80 }} onClick={() => setIsSidebarOpen(false)}></div>}
        <aside className={`zen-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <section className="upload-section">
            <h3>Ingest Source</h3>
            <form onSubmit={handleUpload}>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button type="submit" disabled={uploading || !file}>
                {uploading ? 'Processing...' : 'Upload'}
              </button>
            </form>
          </section>

          <section className="pages-section">
            <h3>Wiki Pages</h3>
            <ul>
              {pages.map((p) => (
                <li key={p.id} onClick={() => selectPage(p.slug)} className={selectedPage?.page?.slug === p.slug ? 'active' : ''}>
                  {p.title}
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {isGraphView ? (
          <GraphView onNodeClick={selectPage} apiUrl={API_URL} />
        ) : (
          <article className="zen-content">
            {selectedPage ? (
              <div className="wiki-content">
                <h2>{selectedPage.page.title}</h2>
                <div className="markdown-render">
                  {selectedPage.content}
                </div>
                <footer className="sources-footer">
                  <hr />
                  <h4>Sources:</h4>
                  <ul>
                    {selectedPage.sources.map((s: any) => (
                      <li key={s.id}>{s.name}</li>
                    ))}
                  </ul>
                </footer>
              </div>
            ) : (
              <div className="welcome">
                $ odyssey-llm-wiki --help<br/><br/>
                Press CTRL+K to search your knowledge base.<br/>
                Press CTRL+B to open the ingestion panel.
              </div>
            )}
          </article>
        )}
      </main>
    </div>
  )
}

export default App
