import { memo } from 'react';
import { type NodeProps, type Node } from '@xyflow/react';
import type { NoteNodeData } from '@/types/nodes';

type NoteNodeType = Node<NoteNodeData, 'note'>;

const NOTE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-200' },
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-200' },
  green:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-200' },
  pink:   { bg: 'bg-pink-500/10',   border: 'border-pink-500/30',   text: 'text-pink-200' },
  gray:   { bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-300' },
};

const NoteNode = memo(({ data, selected }: NodeProps<NoteNodeType>) => {
  const c = NOTE_COLORS[data.color] || NOTE_COLORS.yellow;

  return (
    <div
      className={`
        w-56 rounded-lg border-2 border-dashed ${c.border} ${c.bg}
        backdrop-blur-sm p-3 transition-shadow
        ${selected ? 'shadow-lg ring-1 ring-white/10' : ''}
      `}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-xs">📝</span>
        <span className={`text-xs font-semibold ${c.text} uppercase tracking-wider`}>
          {data.label || 'Заметка'}
        </span>
      </div>
      <p className={`text-xs ${c.text} opacity-80 whitespace-pre-wrap line-clamp-6`}>
        {data.text || 'Пустая заметка...'}
      </p>
    </div>
  );
});

NoteNode.displayName = 'NoteNode';
export default NoteNode;
