import { useState, useEffect } from 'react'
import './App.css'
import GraphView from './GraphView'
import CommandPalette from './CommandPalette'
import MDEditor from '@uiw/react-md-editor'

interface Page {
  id: string
  title: string
  slug: string
  updated_at: string
}

function App() {
  const [pages, setPages] = useState<Page[]>([])
  const [selectedPage, setSelectedPage] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState<string | undefined>('')
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
    setEditContent(data.content)
    setIsEditing(false)
    setIsGraphView(false)
    setIsSidebarOpen(false)
  }

  const handleSave = async () => {
    if (!selectedPage || !editContent) return
    
    try {
      const res = await fetch(`${API_URL}/api/pages/${selectedPage.page.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent })
      })
      
      if (res.ok) {
        setSelectedPage({ ...selectedPage, content: editContent })
        setIsEditing(false)
        fetchPages()
      }
    } catch (err) {
      console.error(err)
      alert('Failed to save page.')
    }
  }

  return (
    <div className="container" data-color-mode="dark">
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
          <section className="control-center">
            <h3 style={{ color: 'var(--accent)', fontSize: '0.7rem', letterSpacing: '0.1rem' }}>CONTROL CENTER</h3>
            <ul>
              <li onClick={() => selectPage('brain-instruction')} className={selectedPage?.page?.slug === 'brain-instruction' ? 'active' : ''}>
                Brain Instructions
              </li>
              <li onClick={() => selectPage('wiki-index')} className={selectedPage?.page?.slug === 'wiki-index' ? 'active' : ''}>
                Wiki Index
              </li>
              <li onClick={() => selectPage('wiki-log')} className={selectedPage?.page?.slug === 'wiki-log' ? 'active' : ''}>
                Audit Log
              </li>
            </ul>
          </section>

          <section className="upload-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.7rem', letterSpacing: '0.1rem' }}>INGEST SOURCE</h3>
            <form onSubmit={handleUpload}>
              <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button type="submit" disabled={uploading || !file}>
                {uploading ? 'Processing...' : 'Upload'}
              </button>
            </form>
          </section>

          <section className="pages-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '0.7rem', letterSpacing: '0.1rem' }}>WIKI PAGES</h3>
            <ul>
              {pages
                .filter(p => !['brain-instruction', 'wiki-index', 'wiki-log'].includes(p.slug))
                .map((p) => (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h2 style={{ margin: 0 }}>{selectedPage.page.title}</h2>
                  <div>
                    {!isEditing ? (
                      <button className="toggle-btn" onClick={() => setIsEditing(true)}>Edit</button>
                    ) : (
                      <>
                        <button className="toggle-btn" onClick={handleSave} style={{ color: 'var(--code-fg)', borderColor: 'var(--code-fg)', marginRight: '0.5rem' }}>Save</button>
                        <button className="toggle-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="editor-container">
                    <MDEditor
                      value={editContent}
                      onChange={setEditContent}
                      preview="edit"
                      height={500}
                    />
                  </div>
                ) : (
                  <div className="markdown-render">
                    <MDEditor.Markdown source={selectedPage.content} />
                  </div>
                )}

                {!isEditing && (
                  <footer className="sources-footer">
                    <hr />
                    <h4>Sources:</h4>
                    <ul>
                      {selectedPage.sources.map((s: any) => (
                        <li key={s.id}>{s.name}</li>
                      ))}
                    </ul>
                  </footer>
                )}
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
