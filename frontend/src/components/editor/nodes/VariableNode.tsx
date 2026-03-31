import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { VariableNodeData } from '@/types/nodes';

type VariableNodeType = Node<VariableNodeData, 'variable'>;

const ACTIONS: Record<string, string> = {
  set: '=', increment: '+=', decrement: '-=', append: '+', delete: 'del',
};

const VariableNode = memo(({ data, selected }: NodeProps<VariableNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-amber-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-amber-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Переменная</span>
      </div>
      <div className="bot-node-body">
        <div className="text-sm font-mono text-gray-200 bg-gray-800/50 rounded-lg px-2.5 py-1.5 text-center">
          {data.variable || 'var'} {ACTIONS[data.action] || '='} {data.value || '""'}
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
  </>
));

VariableNode.displayName = 'VariableNode';
export default VariableNode;
