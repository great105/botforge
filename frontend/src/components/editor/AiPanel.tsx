import { useState, useRef } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { streamAiGenerate } from '@/api/client';

interface AiPanelProps {
  botId: string;
  onClose: () => void;
}

export default function AiPanel({ botId, onClose }: AiPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const aiLoading = useEditorStore((s) => s.aiLoading);
  const setAiLoading = useEditorStore((s) => s.setAiLoading);
  const aiProgress = useEditorStore((s) => s.aiProgress);
  const setAiProgress = useEditorStore((s) => s.setAiProgress);

  const handleGenerate = () => {
    if (!prompt.trim() || aiLoading) return;

    setMessages((m) => [...m, { role: 'user', text: prompt }]);
    setAiLoading(true);
    setAiProgress('Запуск AI-агента...');

    // Pass current schema so AI sees existing blocks
    const hasContent = nodes.filter((n) => n.type !== 'note').length > 0;
    const existingSchema = hasContent
      ? { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } }
      : null;

    const controller = streamAiGenerate(prompt, existingSchema, (event) => {
      switch (event.type) {
        case 'tool_start':
          setAiProgress(`Шаг ${event.iteration}: ${event.tool}...`);
          break;
        case 'schema_update': {
          const schema = event.schema as { nodes: any[]; edges: any[] };
          setNodes(schema.nodes);
          setEdges(schema.edges);
          break;
        }
        case 'done':
          setMessages((m) => [...m, { role: 'ai', text: String(event.text) }]);
          setAiLoading(false);
          setAiProgress('');
          break;
        case 'error':
          setMessages((m) => [...m, { role: 'ai', text: `Ошибка: ${event.text}` }]);
          setAiLoading(false);
          setAiProgress('');
          break;
      }
    });

    abortRef.current = controller;
    setPrompt('');
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setAiLoading(false);
    setAiProgress('');
  };

  return (
    <div className="w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col max-h-[500px]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <span className="text-sm font-semibold text-violet-400">AI-генератор</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">
          &times;
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[100px]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-sm p-2 rounded-lg ${
              msg.role === 'user'
                ? 'bg-brand-600/20 text-blue-300 ml-4'
                : 'bg-gray-800 text-gray-300 mr-4'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {aiLoading && (
          <div className="text-xs text-violet-400 animate-pulse">{aiProgress}</div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Опишите бота..."
            className="flex-1 input-field text-sm"
            disabled={aiLoading}
          />
          {aiLoading ? (
            <button
              onClick={handleStop}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg"
            >
              Стоп
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-lg"
            >
              Создать
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
