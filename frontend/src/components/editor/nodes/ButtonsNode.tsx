import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ButtonsNodeData } from '@/types/nodes';

type ButtonsNodeType = Node<ButtonsNodeData, 'buttons'>;

const ButtonsNode = memo(({ data, selected }: NodeProps<ButtonsNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wide">
            Кнопки
          </span>
        </div>
        <div className="text-sm text-gray-300 mb-2 line-clamp-2">{data.text}</div>
        <div className="space-y-1">
          {data.buttons?.map((btn, i) => (
            <div
              key={i}
              className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded border border-purple-800/50 text-center"
            >
              {btn.text}
            </div>
          ))}
        </div>
      </div>
      {data.buttons?.map((btn, i) => (
        <Handle
          key={btn.output_handle}
          type="source"
          position={Position.Bottom}
          id={btn.output_handle}
          className="!bg-purple-500 !w-2.5 !h-2.5"
          style={{ left: `${((i + 1) / (data.buttons.length + 1)) * 100}%` }}
        />
      ))}
    </>
  );
});

ButtonsNode.displayName = 'ButtonsNode';
export default ButtonsNode;
