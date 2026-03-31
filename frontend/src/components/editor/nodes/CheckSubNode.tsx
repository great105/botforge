import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { CheckSubNodeData } from '@/types/nodes';

type CheckSubNodeType = Node<CheckSubNodeData, 'check_sub'>;

const CheckSubNode = memo(({ data, selected }: NodeProps<CheckSubNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-sky-500" />

    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-sky-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-sky-500 ring-2 ring-sky-500/30" />
        <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">Подписка</span>
      </div>

      <div className="bot-node-body space-y-2">
        <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-2.5 py-1.5 font-mono text-center">
          {data.channel_id || <span className="text-gray-600">@channel</span>}
        </div>
        {data.fail_text && (
          <p className="text-xs text-gray-500 line-clamp-2">{data.fail_text}</p>
        )}
        <div className="flex justify-between mt-1 text-xs font-medium">
          <span className="text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Подписан
          </span>
          <span className="text-red-400 flex items-center gap-1">
            Нет <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </span>
        </div>
      </div>
    </div>

    <Handle type="source" position={Position.Bottom} id="subscribed" className="!bg-green-500" style={{ left: '30%' }} />
    <Handle type="source" position={Position.Bottom} id="not_subscribed" className="!bg-red-500" style={{ left: '70%' }} />
  </>
));

CheckSubNode.displayName = 'CheckSubNode';
export default CheckSubNode;
