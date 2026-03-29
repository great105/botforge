import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { StartNodeData } from '@/types/nodes';

type StartNodeType = Node<StartNodeData, 'start'>;

const StartNode = memo(({ data, selected }: NodeProps<StartNodeType>) => {
  return (
    <>
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs font-semibold text-green-400 uppercase tracking-wide">
            Старт
          </span>
        </div>
        <div className="text-sm text-gray-300">{data.label}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {data.triggers?.map((t, i) => (
            <span key={i} className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </>
  );
});

StartNode.displayName = 'StartNode';
export default StartNode;
