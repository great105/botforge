import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { ButtonsNodeData } from '@/types/nodes';

type ButtonsNodeType = Node<ButtonsNodeData, 'buttons'>;

const ButtonsNode = memo(({ data, selected }: NodeProps<ButtonsNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-purple-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-purple-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-500/30" />
        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Кнопки</span>
      </div>
      <div className="bot-node-body space-y-2">
        <p className="text-sm text-gray-300 line-clamp-2">{data.text}</p>
        <div className="space-y-1">
          {data.buttons?.map((btn, i) => (
            <div
              key={i}
              className="text-xs bg-purple-500/10 text-purple-300 px-2.5 py-1.5 rounded-lg border border-purple-500/20 text-center font-medium"
            >
              {btn.text}
            </div>
          ))}
        </div>
      </div>
    </div>
    {data.buttons?.map((btn, i) => (
      <Handle
        key={btn.output_handle}
        type="source"
        position={Position.Bottom}
        id={btn.output_handle}
        className="!bg-purple-500"
        style={{ left: `${((i + 1) / (data.buttons.length + 1)) * 100}%` }}
      />
    ))}
  </>
));

ButtonsNode.displayName = 'ButtonsNode';
export default ButtonsNode;
