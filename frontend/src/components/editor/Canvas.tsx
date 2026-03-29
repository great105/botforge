import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';

import { nodeTypes } from './nodes';
import BotEdge from './edges/BotEdge';
import BlockPalette from './panels/BlockPalette';
import PropertiesPanel from './panels/PropertiesPanel';
import AiPanel from './AiPanel';
import { useEditorStore } from '@/stores/editorStore';
import { schemasApi } from '@/api/client';

const edgeTypes = { default: BotEdge };

function EditorCanvas() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { fitView } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [showAi, setShowAi] = useState(false);

  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
  } = useEditorStore();

  // Load schema on mount
  useEffect(() => {
    if (!botId) return;
    schemasApi.get(botId).then((res) => {
      const schema = res.schema_json as { nodes: any[]; edges: any[]; viewport: any };
      setNodes(schema.nodes || []);
      setEdges(schema.edges || []);
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    });
  }, [botId, setNodes, setEdges, fitView]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode],
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const handleSave = useCallback(async () => {
    if (!botId) return;
    setSaving(true);
    try {
      await schemasApi.save(botId, { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } });
    } finally {
      setSaving(false);
    }
  }, [botId, nodes, edges]);

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← Назад
          </button>
          <span className="text-sm font-semibold text-gray-200">BotForge</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAi(!showAi)}
            className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
          >
            AI
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <BlockPalette />

        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            proOptions={proOptions}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            defaultEdgeOptions={{ type: 'default', animated: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#1e293b" />
            <Controls position="bottom-right" />
            <MiniMap
              nodeStrokeWidth={3}
              pannable
              zoomable
              style={{ backgroundColor: '#111827' }}
            />
          </ReactFlow>

          {/* AI panel overlay */}
          {showAi && (
            <div className="absolute top-2 right-2 z-10">
              <AiPanel botId={botId!} onClose={() => setShowAi(false)} />
            </div>
          )}
        </div>

        <PropertiesPanel />
      </div>
    </div>
  );
}

export default function EditorPage() {
  return (
    <ReactFlowProvider>
      <EditorCanvas />
    </ReactFlowProvider>
  );
}
