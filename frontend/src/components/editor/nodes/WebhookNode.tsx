import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { WebhookNodeData } from '@/types/nodes';

type WebhookNodeType = Node<WebhookNodeData, 'webhook'>;

const WebhookNode = memo(({ data, selected }: NodeProps<WebhookNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-pink-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-pink-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-pink-500 ring-2 ring-pink-500/30" />
        <span className="text-xs font-bold text-pink-400 uppercase tracking-wider">Webhook</span>
      </div>
      <div className="bot-node-body space-y-1.5">
        <span className="inline-block text-[11px] font-bold bg-pink-500/10 text-pink-400 px-2 py-0.5 rounded border border-pink-500/20">
          {data.method || 'POST'}
        </span>
        <p className="text-sm text-gray-400 font-mono truncate">{data.url || 'URL...'}</p>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-pink-500" />
  </>
));

WebhookNode.displayName = 'WebhookNode';
export default WebhookNode;
