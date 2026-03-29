import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { WebhookNodeData } from '@/types/nodes';

type WebhookNodeType = Node<WebhookNodeData, 'webhook'>;

const WebhookNode = memo(({ data, selected }: NodeProps<WebhookNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-pink-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-pink-500" />
          <span className="text-xs font-semibold text-pink-400 uppercase tracking-wide">
            Webhook
          </span>
        </div>
        <div className="text-xs text-gray-400">{data.method || 'POST'}</div>
        <div className="text-sm text-gray-300 truncate">{data.url || 'URL не указан'}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-pink-500 !w-3 !h-3" />
    </>
  );
});

WebhookNode.displayName = 'WebhookNode';
export default WebhookNode;
