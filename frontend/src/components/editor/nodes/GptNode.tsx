import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { GptNodeData } from '@/types/nodes';

type GptNodeType = Node<GptNodeData, 'gpt'>;

const GptNode = memo(({ data, selected }: NodeProps<GptNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-violet-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-violet-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-violet-500 ring-2 ring-violet-500/30" />
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">GPT</span>
      </div>
      <div className="bot-node-body space-y-1.5">
        <p className="text-sm text-gray-300 line-clamp-2 italic">
          {data.system_prompt || 'AI-ответ'}
        </p>
        <span className="inline-block text-[11px] font-mono bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded border border-violet-500/20">
          {data.model}
        </span>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-violet-500" />
  </>
));

GptNode.displayName = 'GptNode';
export default GptNode;
