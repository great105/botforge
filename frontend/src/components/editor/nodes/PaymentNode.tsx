import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { PaymentNodeData } from '@/types/nodes';

type PaymentNodeType = Node<PaymentNodeData, 'payment'>;

const PaymentNode = memo(({ data, selected }: NodeProps<PaymentNodeType>) => {
  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3" />
      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
            Оплата
          </span>
        </div>
        <div className="text-sm text-gray-300">{data.title || 'Оплата'}</div>
        <div className="text-xs text-emerald-400 mt-1">
          {data.amount} {data.currency || 'XTR'}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="payment_success"
        className="!bg-emerald-500 !w-3 !h-3"
      />
    </>
  );
});

PaymentNode.displayName = 'PaymentNode';
export default PaymentNode;
