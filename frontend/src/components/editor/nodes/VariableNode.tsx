import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { VariableNodeData } from '@/types/nodes';

type VariableNodeType = Node<VariableNodeData, 'variable'>;

const VariableNode = memo(({ data, selected }: NodeProps<VariableNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
            Переменная
          </span>
        </div>
        <div className="text-sm text-gray-300">
          {data.variable} = {data.action === 'set' ? data.value : `${data.action}(${data.value})`}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3" />
    </>
  );
});

VariableNode.displayName = 'VariableNode';
export default VariableNode;
