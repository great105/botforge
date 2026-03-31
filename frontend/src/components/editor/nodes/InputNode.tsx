import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { InputNodeData } from '@/types/nodes';

type InputNodeType = Node<InputNodeData, 'input'>;

const InputNode = memo(({ data, selected }: NodeProps<InputNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-cyan-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-cyan-500/30" />
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Ввод</span>
      </div>
      <div className="bot-node-body space-y-1.5">
        <p className="text-sm text-gray-300 line-clamp-2">{data.text}</p>
        <div className="flex items-center gap-1.5 text-xs text-cyan-400">
          <span className="text-gray-500">&rarr;</span>
          <span className="font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">{data.variable}</span>
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
  </>
));

InputNode.displayName = 'InputNode';
export default InputNode;
