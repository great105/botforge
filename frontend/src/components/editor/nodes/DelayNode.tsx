import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { DelayNodeData } from '@/types/nodes';

type DelayNodeType = Node<DelayNodeData, 'delay'>;

const DelayNode = memo(({ data, selected }: NodeProps<DelayNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-orange-500" />
          <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">
            Задержка
          </span>
        </div>
        <div className="text-sm text-gray-300">
          {data.delay_seconds} сек.
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3" />
    </>
  );
});

DelayNode.displayName = 'DelayNode';
export default DelayNode;
