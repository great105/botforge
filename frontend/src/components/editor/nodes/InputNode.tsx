import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { InputNodeData } from '@/types/nodes';

type InputNodeType = Node<InputNodeData, 'input'>;

const InputNode = memo(({ data, selected }: NodeProps<InputNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">
            Ввод
          </span>
        </div>
        <div className="text-sm text-gray-300 line-clamp-2">{data.text}</div>
        <div className="mt-1 text-xs text-gray-500">
          → {data.variable}
          {data.validation && (
            <span className="ml-1 text-cyan-600">({data.validation})</span>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3" />
    </>
  );
});

InputNode.displayName = 'InputNode';
export default InputNode;
