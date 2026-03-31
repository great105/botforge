import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { MediaNodeData } from '@/types/nodes';

type MediaNodeType = Node<MediaNodeData, 'media'>;

const MEDIA_ICONS: Record<string, string> = {
  photo: '\uD83D\uDCF7',
  video: '\uD83C\uDFA5',
  document: '\uD83D\uDCC4',
  sticker: '\uD83C\uDF1F',
  voice: '\uD83C\uDF99\uFE0F',
  audio: '\uD83C\uDFB5',
  animation: '\uD83C\uDF1E',
};

const MEDIA_LABELS: Record<string, string> = {
  photo: 'Фото',
  video: 'Видео',
  document: 'Документ',
  sticker: 'Стикер',
  voice: 'Голосовое',
  audio: 'Аудио',
  animation: 'GIF',
};

const MediaNode = memo(({ data, selected }: NodeProps<MediaNodeType>) => {
  const icon = MEDIA_ICONS[data.media_type] || '\uD83D\uDCF7';
  const mediaLabel = MEDIA_LABELS[data.media_type] || data.media_type;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-teal-500" />

      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        <div className="bot-node-header bg-gradient-to-r from-teal-500/20 to-transparent">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500 ring-2 ring-teal-500/30" />
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Медиа</span>
          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded border border-teal-500/20 bg-teal-500/10 text-teal-400">
            {icon} {mediaLabel}
          </span>
        </div>

        <div className="bot-node-body space-y-2">
          {data.url ? (
            <div className="text-xs text-gray-400 bg-gray-800/50 rounded-lg px-2.5 py-2 font-mono truncate">
              {data.url}
            </div>
          ) : (
            <div className="text-xs text-gray-600 bg-gray-800/30 rounded-lg px-2.5 py-3 text-center border border-dashed border-gray-700">
              {icon} URL или file_id не задан
            </div>
          )}
          {data.caption && (
            <p className="text-sm text-gray-300 line-clamp-2">{data.caption}</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-teal-500" />
    </>
  );
});

MediaNode.displayName = 'MediaNode';
export default MediaNode;
