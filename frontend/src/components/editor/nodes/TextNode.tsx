import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { TextNodeData } from '@/types/nodes';

type TextNodeType = Node<TextNodeData, 'text'>;

const TextNode = memo(({ data, selected }: NodeProps<TextNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-blue-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-blue-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Текст</span>
      </div>
      <div className="bot-node-body">
        <p className="text-sm text-gray-300 line-clamp-3">
          {data.text || <span className="text-gray-600 italic">Пустой текст...</span>}
        </p>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
  </>
));

TextNode.displayName = 'TextNode';
export default TextNode;
