import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ConditionNodeData } from '@/types/nodes';

type ConditionNodeType = Node<ConditionNodeData, 'condition'>;

const ConditionNode = memo(({ data, selected }: NodeProps<ConditionNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-yellow-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''} border-yellow-700`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded bg-yellow-500 rotate-45" />
          <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wide">
            Условие
          </span>
        </div>
        <div className="text-sm text-gray-300">
          {data.variable} {data.operator} {data.value}
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-green-400">Да</span>
          <span className="text-red-400">Нет</span>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="handle_yes"
        className="!bg-green-500 !w-2.5 !h-2.5"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="handle_no"
        className="!bg-red-500 !w-2.5 !h-2.5"
        style={{ left: '70%' }}
      />
    </>
  );
});

ConditionNode.displayName = 'ConditionNode';
export default ConditionNode;
