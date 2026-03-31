import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
  ConnectionMode,
  type NodeMouseHandler,
  type IsValidConnection,
  BackgroundVariant,
} from '@xyflow/react';

import { nodeTypes } from './nodes';
import BotEdge from './edges/BotEdge';
import BlockPalette, { DND_TYPE } from './panels/BlockPalette';
import PropertiesPanel from './panels/PropertiesPanel';
import AiPanel from './AiPanel';
import TemplateGallery from './TemplateGallery';
import { useEditorStore } from '@/stores/editorStore';
import { schemasApi } from '@/api/client';
import { getDefaultData } from '@/lib/nodeDefaults';
import { migrateSchema } from '@/lib/schemaMigration';
import { exportToAiogram } from '@/lib/export';
import type { BotNodeType } from '@/types/nodes';

const edgeTypes = { default: BotEdge };

// Collect all variables used in the graph
function collectVariables(nodes: any[]): { name: string; source: string }[] {
  const vars: { name: string; source: string }[] = [];
  const seen = new Set<string>();

  for (const n of nodes) {
    const d = n.data || {};
    // Input variables
    if (d.input?.variable && !seen.has(d.input.variable)) {
      seen.add(d.input.variable);
      vars.push({ name: d.input.variable, source: d.label || n.id });
    }
    // Variable node
    if (n.type === 'variable' && d.variable && !seen.has(d.variable)) {
      seen.add(d.variable);
      vars.push({ name: d.variable, source: d.label || n.id });
    }
    // GPT saves to variable
    if (n.type === 'gpt' && !seen.has('gpt_response')) {
      seen.add('gpt_response');
      vars.push({ name: 'gpt_response', source: d.label || n.id });
    }
    // Webhook response
    if (n.type === 'webhook' && !seen.has('webhook_response')) {
      seen.add('webhook_response');
      vars.push({ name: 'webhook_response', source: d.label || n.id });
    }
    // Payment
    if (n.type === 'payment' && !seen.has('payment_status')) {
      seen.add('payment_status');
      vars.push({ name: 'payment_status', source: d.label || n.id });
    }
  }
  return vars;
}

// Simple validation
function validateGraph(nodes: any[], edges: any[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set(nodes.map((n: any) => n.id));

  // Check start node
  const starts = nodes.filter((n: any) => {
    if (n.type === 'start') return true;
    if (n.type === 'message' && n.data?.triggers?.length) return true;
    return false;
  });
  if (starts.length === 0) errors.push('Нет стартового блока (с триггерами)');

  // Dangling edges
  for (const e of edges) {
    if (!nodeIds.has(e.source)) errors.push(`Связь ${e.id}: источник не найден`);
    if (!nodeIds.has(e.target)) errors.push(`Связь ${e.id}: цель не найдена`);
  }

  // Reachability
  if (starts.length > 0) {
    const reachable = new Set<string>();
    const queue = starts.map((s: any) => s.id);
    while (queue.length) {
      const cur = queue.shift()!;
      if (reachable.has(cur)) continue;
      reachable.add(cur);
      for (const e of edges) {
        if (e.source === cur && !reachable.has(e.target)) queue.push(e.target);
      }
    }
    const unreachable = nodes.filter((n: any) => !reachable.has(n.id) && n.type !== 'note');
    if (unreachable.length > 0) {
      warnings.push(`Недостижимые блоки: ${unreachable.map((n: any) => n.data?.label || n.id).join(', ')}`);
    }
  }

  // Condition nodes without both outputs
  for (const n of nodes) {
    if (n.type === 'condition') {
      const handles = new Set(edges.filter((e: any) => e.source === n.id).map((e: any) => e.sourceHandle));
      if (!handles.has('handle_yes')) warnings.push(`"${n.data?.label}": нет выхода "Да"`);
      if (!handles.has('handle_no')) warnings.push(`"${n.data?.label}": нет выхода "Нет"`);
    }
    if (n.type === 'check_sub') {
      const handles = new Set(edges.filter((e: any) => e.source === n.id).map((e: any) => e.sourceHandle));
      if (!handles.has('subscribed')) warnings.push(`"${n.data?.label}": нет выхода "Подписан"`);
      if (!handles.has('not_subscribed')) warnings.push(`"${n.data?.label}": нет выхода "Не подписан"`);
    }
  }

  // Orphan nodes (no connections at all, excluding note)
  for (const n of nodes) {
    if (n.type === 'note') continue;
    const hasEdge = edges.some((e: any) => e.source === n.id || e.target === n.id);
    const isStart = n.type === 'start' || (n.type === 'message' && n.data?.triggers?.length);
    if (!hasEdge && !isStart && nodes.length > 1) {
      warnings.push(`"${n.data?.label || n.id}" не подключён ни к чему`);
    }
  }

  return { errors, warnings };
}

function EditorCanvas() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const { fitView, screenToFlowPosition } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [showVars, setShowVars] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportCode, setExportCode] = useState('');
  const [schemaLoaded, setSchemaLoaded] = useState(false);
  const [validationResult, setValidationResult] = useState<{ errors: string[]; warnings: string[] } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const dirty = useEditorStore((s) => s.dirty);
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const onNodesChange = useEditorStore((s) => s.onNodesChange);
  const onEdgesChange = useEditorStore((s) => s.onEdgesChange);
  const onConnect = useEditorStore((s) => s.onConnect);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const addNode = useEditorStore((s) => s.addNode);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const markClean = useEditorStore((s) => s.markClean);

  // Load schema on mount
  useEffect(() => {
    if (!botId) return;
    schemasApi.get(botId).then((res) => {
      const raw = res.schema_json as { nodes: any[]; edges: any[]; viewport: any };
      const schema = migrateSchema(raw);
      setNodes(schema.nodes || []);
      setEdges(schema.edges || []);
      markClean();
      setSchemaLoaded(true);
      // Show template gallery if schema is empty
      const realNodes = (schema.nodes || []).filter((n: any) => n.type !== 'note');
      if (realNodes.length === 0) {
        setShowTemplates(true);
      } else {
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      }
    });
  }, [botId, setNodes, setEdges, fitView, markClean]);

  // Native DOM drag-and-drop listeners
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer?.getData(DND_TYPE) as BotNodeType;
      if (!type) return;

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const id = `node_${Date.now()}`;
      addNode({ id, type, position, data: getDefaultData(type) });
      setSelectedNode(id);
    };

    wrapper.addEventListener('dragover', handleDragOver);
    wrapper.addEventListener('drop', handleDrop);
    return () => {
      wrapper.removeEventListener('dragover', handleDragOver);
      wrapper.removeEventListener('drop', handleDrop);
    };
  }, [screenToFlowPosition, addNode, setSelectedNode]);

  // Auto-save with debounce (3 seconds after last change)
  useEffect(() => {
    if (!dirty || !botId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await schemasApi.save(botId, { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } });
        markClean();
      } catch {
        // Silently fail — user can still manual save
      }
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [dirty, nodes, edges, botId, markClean]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Ctrl+Z — Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Ctrl+Y or Ctrl+Shift+Z — Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      // Ctrl+S — Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      // Ctrl+D — Duplicate selected node
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !isInput) {
        e.preventDefault();
        if (selectedNodeId) duplicateNode(selectedNodeId);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedNodeId, duplicateNode]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_, node) => setSelectedNode(node.id),
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
      markClean();
    } finally {
      setSaving(false);
    }
  }, [botId, nodes, edges, markClean]);

  const handleValidate = useCallback(() => {
    const result = validateGraph(nodes, edges);
    setValidationResult(result);
    setShowValidation(true);
  }, [nodes, edges]);

  // Connection validation: prevent self-connections and duplicate edges
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false;
      // Prevent duplicate edges (same source + target + handle)
      const exists = edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle,
      );
      return !exists;
    },
    [edges],
  );

  const proOptions = useMemo(() => ({ hideAttribution: true }), []);
  const connectionLineStyle = useMemo(() => ({ stroke: '#6366f1', strokeWidth: 2 }), []);

  const variables = useMemo(() => collectVariables(nodes), [nodes]);

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top bar */}
      <header className="h-12 bg-gray-900 border-b border-gray-800 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Назад
          </button>
          <span className="text-sm font-semibold text-gray-200">BotForge</span>
          <span className="text-[10px] text-gray-600 hidden sm:inline">
            {nodes.filter(n => n.type !== 'note').length} блоков · {edges.length} связей
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            className="toolbar-btn"
            title="Отменить (Ctrl+Z)"
          >
            ↶
          </button>
          <button
            onClick={redo}
            className="toolbar-btn"
            title="Повторить (Ctrl+Y)"
          >
            ↷
          </button>

          <div className="w-px h-5 bg-gray-700 mx-1" />

          {/* Variables panel */}
          <button
            onClick={() => setShowVars(!showVars)}
            className={`toolbar-btn ${showVars ? 'toolbar-btn-active' : ''}`}
            title="Переменные"
          >
            {'{x}'}
          </button>

          {/* Validate */}
          <button
            onClick={handleValidate}
            className={`toolbar-btn ${showValidation ? 'toolbar-btn-active' : ''}`}
            title="Проверить схему"
          >
            ✓
          </button>

          {/* Fit view */}
          <button
            onClick={() => fitView({ padding: 0.2, duration: 300 })}
            className="toolbar-btn"
            title="Вместить всё"
          >
            ⊞
          </button>

          <div className="w-px h-5 bg-gray-700 mx-1" />

          {/* Export */}
          <button
            onClick={() => {
              const code = exportToAiogram(nodes, edges);
              setExportCode(code);
              setShowExport(true);
            }}
            className="toolbar-btn"
            title="Экспорт в Python-код"
          >
            {'</>'}
          </button>

          {/* Templates */}
          <button
            onClick={() => setShowTemplates(true)}
            className="px-3 py-1.5 text-xs rounded-lg transition-colors bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
          >
            Шаблоны
          </button>

          {/* AI */}
          <button
            onClick={() => setShowAi(!showAi)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              showAi
                ? 'bg-violet-500 text-white'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            AI
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? '...' : dirty ? 'Сохранить*' : 'Сохранено'}
          </button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        <BlockPalette />

        <div className="flex-1 relative" ref={wrapperRef}>
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
            isValidConnection={isValidConnection}
            connectionMode={ConnectionMode.Loose}
            connectionRadius={30}
            proOptions={proOptions}
            connectionLineStyle={connectionLineStyle}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ type: 'default', animated: true }}
            deleteKeyCode={['Backspace', 'Delete']}
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

          {/* Variables panel overlay */}
          {showVars && (
            <div className="absolute top-2 left-2 z-10 w-64 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                <span className="text-xs font-semibold text-gray-300">Переменные</span>
                <button onClick={() => setShowVars(false)} className="text-gray-500 hover:text-gray-300 text-xs">&times;</button>
              </div>
              <div className="p-2 max-h-64 overflow-y-auto">
                {variables.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-3">
                    Нет переменных. Добавьте блок ввода или переменную.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {variables.map((v) => (
                      <div key={v.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-800">
                        <code className="text-xs text-amber-400 font-mono">{'{' + v.name + '}'}</code>
                        <span className="text-[10px] text-gray-500 truncate ml-2 max-w-[100px]">{v.source}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-gray-600 mt-2 px-1">
                  Используйте {'{имя}'} в текстах сообщений для подстановки.
                </p>
              </div>
            </div>
          )}

          {/* Validation panel overlay */}
          {showValidation && validationResult && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10 w-96 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                <span className="text-xs font-semibold text-gray-300">
                  Проверка схемы
                  {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                    <span className="ml-2 text-green-400">— всё отлично!</span>
                  )}
                </span>
                <button onClick={() => setShowValidation(false)} className="text-gray-500 hover:text-gray-300 text-xs">&times;</button>
              </div>
              <div className="p-2 max-h-48 overflow-y-auto space-y-1">
                {validationResult.errors.map((err, i) => (
                  <div key={`e${i}`} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <span className="text-red-400 text-xs shrink-0 mt-0.5">●</span>
                    <span className="text-xs text-red-300">{err}</span>
                  </div>
                ))}
                {validationResult.warnings.map((warn, i) => (
                  <div key={`w${i}`} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <span className="text-yellow-400 text-xs shrink-0 mt-0.5">▲</span>
                    <span className="text-xs text-yellow-300">{warn}</span>
                  </div>
                ))}
                {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                  <div className="flex items-center gap-2 px-2 py-3 justify-center">
                    <span className="text-green-400 text-sm">✓</span>
                    <span className="text-xs text-green-300">Схема корректна и готова к запуску</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="absolute bottom-2 left-2 z-10 text-[10px] text-gray-600 space-x-3 hidden lg:flex">
            <span>Ctrl+Z — отмена</span>
            <span>Ctrl+D — дублировать</span>
            <span>Ctrl+S — сохранить</span>
            <span>Del — удалить</span>
          </div>

          {/* Template gallery */}
          {showTemplates && (
            <TemplateGallery onClose={() => setShowTemplates(false)} />
          )}

          {/* Export modal */}
          {showExport && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-full max-w-2xl max-h-[80vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-bold text-gray-200">Экспорт в Python</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">Бесплатно</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportCode);
                      }}
                      className="px-3 py-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-lg"
                    >
                      Копировать
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([exportCode], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'bot.py';
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
                    >
                      Скачать .py
                    </button>
                    <button
                      onClick={() => setShowExport(false)}
                      className="text-gray-500 hover:text-white text-lg leading-none px-1"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-xs text-gray-300 font-mono whitespace-pre leading-relaxed bg-gray-950 rounded-xl p-4 border border-gray-800">
                    {exportCode}
                  </pre>
                </div>
                <div className="px-5 py-3 border-t border-gray-800 shrink-0">
                  <p className="text-[10px] text-gray-500">
                    Замените TOKEN на токен вашего бота. Запуск: <code className="text-gray-400">python bot.py</code>
                  </p>
                </div>
              </div>
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
