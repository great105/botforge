import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

type KnowledgeData = {
  label: string;
  api_key?: string;
  model?: string;
  embedding_model?: string;
  system_prompt?: string;
  files_count?: number;
};

type KnowledgeNodeType = Node<KnowledgeData, 'knowledge'>;

const KnowledgeNode = memo(({ data, selected }: NodeProps<KnowledgeNodeType>) => (
  <>
    <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
    <div className={`bot-node ${selected ? 'selected' : ''}`}>
      <div className="bot-node-header bg-gradient-to-r from-cyan-500/20 to-transparent">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 ring-2 ring-cyan-500/30" />
        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">База знаний</span>
      </div>
      <div className="bot-node-body space-y-2">
        {data.system_prompt && (
          <p className="text-xs text-gray-400 line-clamp-2 italic">{data.system_prompt}</p>
        )}
        {data.model && (
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
            {data.model}
          </span>
        )}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <span>📄</span>
            <span>{data.files_count || 0} файлов</span>
          </div>
          {!data.api_key && (
            <span className="text-[10px] text-amber-400">нет ключа</span>
          )}
        </div>
      </div>
    </div>
    <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
  </>
));

KnowledgeNode.displayName = 'KnowledgeNode';
export default KnowledgeNode;
