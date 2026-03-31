import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { DelayNodeData } from '@/types/nodes';

type DelayNodeType = Node<DelayNodeData, 'delay'>;

const DelayNode = memo(({ data, selected }: NodeProps<DelayNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-orange-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-orange-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-orange-500/30" />
        <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">Задержка</span>
      </div>
      <div className="bot-node-body">
        <div className="text-2xl font-bold text-orange-300 text-center">
          {data.delay_seconds}<span className="text-sm font-normal text-gray-500 ml-1">сек.</span>
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
  </>
));

DelayNode.displayName = 'DelayNode';
export default DelayNode;
