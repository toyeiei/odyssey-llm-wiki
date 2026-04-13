import React, { useState, useEffect } from 'react'
import MDEditor from '@uiw/react-md-editor'
import { Share2, Save, X, Globe } from 'lucide-react'
import ForceGraph2D from 'react-force-graph-2d'

function App() {
  const [content, setContent] = useState<string>('# Start Scribbling\n\nUse [[wikilinks]] to connect your thoughts.')
  const [title, setTitle] = useState<string>('Untitled Scribble')
  const [showGraph, setShowGraph] = useState(false)
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })

  useEffect(() => {
    // Fetch graph data for the preview
    fetch('http://localhost:8787/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
  }, [])

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:8787/api/scribbles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      })
      const data = await response.json()
      console.log('Saved:', data)
      alert(`Scribble "${title}" saved and linked!`)
    } catch (err) {
      console.error('Save failed:', err)
      alert('Failed to save scribble.')
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [title, content])

  return (
    <div className="flex flex-col h-screen w-full bg-background text-terminal font-mono">
      {/* Ghost Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface">
        <input 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-transparent border-none focus:outline-none text-xl font-bold w-full mr-4 placeholder-surface"
          placeholder="Title your thought..."
        />
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowGraph(!showGraph)}
            className={`p-2 rounded-full transition-colors ${showGraph ? 'bg-accent text-background' : 'hover:bg-surface'}`}
          >
            <Globe size={20} />
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 bg-terminal text-black px-4 py-2 hover:opacity-80 transition-opacity"
          >
            <Save size={18} />
            <span>SAVE</span>
          </button>
        </div>
      </header>

      {/* Zen Editor */}
      <main className="flex-1 overflow-hidden" data-color-mode="dark">
        <MDEditor
          value={content}
          onChange={(val) => setContent(val || '')}
          preview="edit"
          height="100%"
          hideToolbar={true}
        />
      </main>

      {/* Ghost Graph Overlay */}
      {showGraph && (
        <div className="fixed inset-10 z-50 bg-surface border border-accent shadow-2xl flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-accent/20">
            <span className="text-accent text-sm uppercase tracking-widest font-bold">Thought Map</span>
            <button onClick={() => setShowGraph(false)} className="text-accent hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 bg-black">
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="title"
              nodeColor={() => '#64ffda'}
              linkColor={() => '#333'}
              backgroundColor="#000000"
            />
          </div>
        </div>
      )}

      {/* Keyboard Hint Footer */}
      <footer className="px-6 py-2 border-t border-surface flex justify-between text-[10px] text-surface uppercase tracking-tighter">
        <div>ODYSSEY SCRIBBLE v1.0.0</div>
        <div className="flex space-x-4">
          <span>CTRL+S to Save</span>
          <span>[[ to link</span>
        </div>
      </footer>
    </div>
  )
}

export default App
