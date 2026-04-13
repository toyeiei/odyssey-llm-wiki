import { useEffect, useState, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

interface Node {
  id: string
  name: string
  slug: string
  x?: number
  y?: number
}

interface Link {
  source: string
  target: string
}

interface GraphData {
  nodes: Node[]
  links: Link[]
}

interface GraphViewProps {
  onNodeClick: (slug: string) => void
  apiUrl: string
}

const GraphView = ({ onNodeClick, apiUrl }: GraphViewProps) => {
  const [data, setData] = useState<GraphData>({ nodes: [], links: [] })
  const fgRef = useRef<any>()

  useEffect(() => {
    const fetchGraph = async () => {
      const res = await fetch(`${apiUrl}/api/graph`)
      const graphData = await res.json()
      setData(graphData)
    }
    fetchGraph()
  }, [apiUrl])

  return (
    <div className="graph-container">
      <ForceGraph2D
        ref={fgRef}
        graphData={data}
        nodeLabel="name"
        onNodeClick={(node: any) => onNodeClick(node.slug)}
        nodeAutoColorBy="id"
        linkDirectionalArrowLength={3.5}
        linkDirectionalArrowRelPos={1}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name
          const fontSize = 12 / globalScale
          ctx.font = `${fontSize}px Sans-Serif`
          const textWidth = ctx.measureText(label).width
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2) as [number, number]

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
          ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1])

          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = node.color
          ctx.fillText(label, node.x, node.y)

          node.__bckgDimensions = bckgDimensions // to use in nodePointerAreaPaint
        }}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          ctx.fillStyle = color
          const bckgDimensions = node.__bckgDimensions
          bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1])
        }}
      />
    </div>
  )
}

export default GraphView
