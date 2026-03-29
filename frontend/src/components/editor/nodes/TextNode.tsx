import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { TextNodeData } from '@/types/nodes';

type TextNodeType = Node<TextNodeData, 'text'>;

const TextNode = memo(({ data, selected }: NodeProps<TextNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
            Текст
          </span>
        </div>
        <div className="text-sm text-gray-300 line-clamp-3">
          {data.text || 'Пустой текст...'}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3" />
    </>
  );
});

TextNode.displayName = 'TextNode';
export default TextNode;
