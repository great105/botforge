import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { RandomNodeData } from '@/types/nodes';

type RandomNodeType = Node<RandomNodeData, 'random'>;

const RandomNode = memo(({ data, selected }: NodeProps<RandomNodeType>) => {
  const branches = data.branches || [];
  const totalWeight = branches.reduce((sum, b) => sum + b.weight, 0) || 1;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-indigo-500" />

      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="bot-node-header bg-gradient-to-r from-indigo-500/20 to-transparent">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30" />
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Случайный</span>
          <span className="ml-auto text-[10px] text-indigo-400/60">{branches.length} ветки</span>
        </div>

        <div className="bot-node-body space-y-1.5">
          {branches.map((branch, i) => {
            const pct = Math.round((branch.weight / totalWeight) * 100);
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 text-xs bg-indigo-500/10 text-indigo-300 px-2.5 py-1.5 rounded-lg border border-indigo-500/20">
                  {branch.label}
                </div>
                <div className="text-[10px] text-indigo-400/70 font-mono w-8 text-right shrink-0">
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {branches.map((branch, i) => (
        <Handle
          key={branch.output_handle}
          type="source"
          position={Position.Bottom}
          id={branch.output_handle}
          className="!bg-indigo-500"
          style={{ left: `${((i + 1) / (branches.length + 1)) * 100}%` }}
        />
      ))}
    </>
  );
});

RandomNode.displayName = 'RandomNode';
export default RandomNode;
