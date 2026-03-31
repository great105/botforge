import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { PaymentNodeData } from '@/types/nodes';

type PaymentNodeType = Node<PaymentNodeData, 'payment'>;

const PaymentNode = memo(({ data, selected }: NodeProps<PaymentNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-emerald-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-emerald-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Оплата</span>
      </div>
      <div className="bot-node-body">
        <div className="text-sm text-gray-200 mb-1">{data.title || 'Оплата'}</div>
        <div className="text-xl font-bold text-emerald-300 text-center bg-emerald-500/10 rounded-lg py-2 border border-emerald-500/20">
          {data.amount} {data.currency}
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} id="payment_success" className="!bg-emerald-500" />
  </>
));

PaymentNode.displayName = 'PaymentNode';
export default PaymentNode;
