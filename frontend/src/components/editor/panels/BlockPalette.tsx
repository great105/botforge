import { useCallback, useState, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useEditorStore } from '@/stores/editorStore';
import { BLOCKS, getDefaultData, type BlockDef } from '@/lib/nodeDefaults';
import type { BotNodeType } from '@/types/nodes';

const DND_TYPE = 'application/botforge-node';

export { DND_TYPE };

// Group blocks by category for better organization
const CATEGORIES: { label: string; types: BotNodeType[] }[] = [
  { label: 'Основные', types: ['message', 'condition', 'delay', 'variable'] },
  { label: 'Интеграции', types: ['gpt', 'knowledge', 'webhook', 'payment'] },
  { label: 'Медиа и проверки', types: ['media', 'check_sub', 'random'] },
  { label: 'Утилиты', types: ['notify', 'note'] },
];

export default function BlockPalette() {
  const addNode = useEditorStore((s) => s.addNode);
  const setSelectedNode = useEditorStore((s) => s.setSelectedNode);
  const { screenToFlowPosition } = useReactFlow();
  const [dragging, setDragging] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;

    const q = search.toLowerCase();
    return CATEGORIES
      .map((cat) => ({
        ...cat,
        types: cat.types.filter((type) => {
          const block = BLOCKS.find((b) => b.type === type);
          if (!block) return false;
          return (
            block.label.toLowerCase().includes(q) ||
            block.description.toLowerCase().includes(q) ||
            block.type.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((cat) => cat.types.length > 0);
  }, [search]);

  const handleDragStart = useCallback(
    (e: React.DragEvent, type: BotNodeType) => {
      e.dataTransfer.setData(DND_TYPE, type);
      e.dataTransfer.effectAllowed = 'move';
      setDragging(type);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDragging(null);
  }, []);

  const handleClick = useCallback(
    (type: BotNodeType) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const id = `node_${Date.now()}`;
      addNode({
        id,
        type,
        position,
        data: getDefaultData(type),
      });
      setSelectedNode(id);
    },
    [addNode, screenToFlowPosition, setSelectedNode],
  );

  return (
    <div className="w-60 bg-gray-900/80 backdrop-blur-sm border-r border-gray-800 flex flex-col overflow-hidden">
      <div className="px-3 pt-3 pb-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
          Блоки
        </h3>
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field !py-1.5 !text-xs"
          placeholder="Поиск блоков..."
        />
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {filteredCategories.map((cat) => (
          <div key={cat.label} className="mb-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1 px-1">
              {cat.label}
            </p>
            <div className="space-y-1">
              {cat.types.map((type) => {
                const block = BLOCKS.find((b) => b.type === type);
                if (!block) return null;
                return (
                  <PaletteItem
                    key={block.type}
                    block={block}
                    isDragging={dragging === block.type}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onClick={handleClick}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-6">
            Ничего не найдено
          </p>
        )}
      </div>
    </div>
  );
}

function PaletteItem({
  block,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  block: BlockDef;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, type: BotNodeType) => void;
  onDragEnd: () => void;
  onClick: (type: BotNodeType) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, block.type)}
      onDragEnd={onDragEnd}
      onClick={() => onClick(block.type)}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing
        border border-transparent
        bg-gradient-to-r ${block.gradient}
        hover:border-gray-700 hover:bg-gray-800/80
        transition-all duration-150 select-none
        ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'}
      `}
    >
      <div
        className={`
          w-8 h-8 rounded-lg ${block.color} bg-opacity-20
          flex items-center justify-center text-sm shrink-0
        `}
      >
        <span className="drop-shadow-sm">{block.icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-gray-200 leading-tight">
          {block.label}
        </div>
        <div className="text-[11px] text-gray-500 leading-tight truncate">
          {block.description}
        </div>
      </div>
    </div>
  );
}
