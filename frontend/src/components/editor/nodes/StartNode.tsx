import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { StartNodeData } from '@/types/nodes';

type StartNodeType = Node<StartNodeData, 'start'>;

const StartNode = memo(({ data, selected }: NodeProps<StartNodeType>) => (
  <>
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-green-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-500/30" />
        <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Старт</span>
      </div>
      <div className="bot-node-body">
        <div className="text-sm text-gray-200 mb-1.5">{data.label}</div>
        <div className="flex flex-wrap gap-1">
          {data.triggers?.map((t, i) => (
            <span key={i} className="text-[11px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-md border border-green-500/20">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
  </>
));

StartNode.displayName = 'StartNode';
export default StartNode;
