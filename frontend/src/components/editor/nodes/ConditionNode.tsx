import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ConditionNodeData } from '@/types/nodes';

type ConditionNodeType = Node<ConditionNodeData, 'condition'>;

const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-yellow-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-yellow-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded bg-yellow-500 rotate-45 ring-2 ring-yellow-500/30" />
        <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Условие</span>
      </div>
      <div className="bot-node-body">
        <div className="text-sm text-gray-300 font-mono bg-gray-800/50 rounded-lg px-2.5 py-1.5 text-center">
          {data.variable || '?'} {data.operator} {data.value || '?'}
        </div>
        <div className="flex justify-between mt-2.5 text-xs font-medium">
          <span className="text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Да
          </span>
          <span className="text-red-400 flex items-center gap-1">
            Нет <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} id="handle_yes" className="!bg-green-500" style={{ left: '30%' }} />
    <Handle type="source" position={Position.Bottom} id="handle_no" className="!bg-red-500" style={{ left: '70%' }} />
  </>
));

ConditionNode.displayName = 'ConditionNode';
export default ConditionNode;
