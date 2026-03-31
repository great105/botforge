import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { NotifyNodeData } from '@/types/nodes';

type NotifyNodeType = Node<NotifyNodeData, 'notify'>;

const NotifyNode = memo(({ data, selected }: NodeProps<NotifyNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-rose-500" />

      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="bot-node-header bg-gradient-to-r from-rose-500/20 to-transparent">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 bg-rose-500/30" />
          <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
            Уведомление
          </span>
        </div>

        <div className="bot-node-body space-y-2">
          <div className="flex items-center gap-1.5 text-xs border-rose-500/20 bg-rose-500/10 text-rose-300 border rounded-md px-2 py-1">
            <span className="opacity-60">&#128276;</span>
            <span className="font-mono truncate">{data.chat_id || '???'}</span>
          </div>
          <p className="text-sm text-gray-300 line-clamp-3">
            {data.text || <span className="text-gray-600 italic">Текст уведомления...</span>}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-rose-500" />
    </>
  );
});

NotifyNode.displayName = 'NotifyNode';
export default NotifyNode;
