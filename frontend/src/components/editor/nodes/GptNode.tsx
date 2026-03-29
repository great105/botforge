import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { GptNodeData } from '@/types/nodes';

type GptNodeType = Node<GptNodeData, 'gpt'>;

const GptNode = memo(({ data, selected }: NodeProps<GptNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-violet-500" />
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-wide">
            GPT
          </span>
        </div>
        <div className="text-sm text-gray-300 line-clamp-2">
          {data.system_prompt || 'AI-ответ'}
        </div>
        <div className="text-xs text-gray-500 mt-1">{data.model}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3" />
    </>
  );
});

GptNode.displayName = 'GptNode';
export default GptNode;
