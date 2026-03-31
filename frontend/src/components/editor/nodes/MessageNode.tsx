import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import type { MessageNodeData } from '@/types/nodes';

type MessageNodeType = Node<MessageNodeData, 'message'>;

const MessageNode = memo(({ data, selected }: NodeProps<MessageNodeType>) => {
  const isStart = Boolean(data.triggers?.length);
  const hasButtons = Boolean(data.buttons?.length);
  const hasInput = data.input != null;

  // Determine color theme based on node "role"
  const color = isStart ? 'green' : hasButtons ? 'purple' : hasInput ? 'cyan' : 'blue';

  const colors: Record<string, { dot: string; text: string; grad: string; handle: string; accent: string }> = {
    green:  { dot: 'bg-green-500',  text: 'text-green-400',  grad: 'from-green-500/20',  handle: '!bg-green-500',  accent: 'border-green-500/20 bg-green-500/10 text-green-400' },
    blue:   { dot: 'bg-blue-500',   text: 'text-blue-400',   grad: 'from-blue-500/20',   handle: '!bg-blue-500',   accent: 'border-blue-500/20 bg-blue-500/10 text-blue-400' },
    purple: { dot: 'bg-purple-500', text: 'text-purple-400', grad: 'from-purple-500/20', handle: '!bg-purple-500', accent: 'border-purple-500/20 bg-purple-500/10 text-purple-300' },
    cyan:   { dot: 'bg-cyan-500',   text: 'text-cyan-400',   grad: 'from-cyan-500/20',   handle: '!bg-cyan-500',   accent: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400' },
  };
  const c = colors[color];

  const typeLabel = isStart ? 'Старт' : hasButtons ? 'Сообщение' : hasInput ? 'Ввод' : 'Сообщение';

  // Separate callback buttons (with handles) from URL buttons (no handles)
  const callbackButtons = hasButtons ? data.buttons!.filter((b) => b.type !== 'url') : [];
  const hasCallbackButtons = callbackButtons.length > 0;

  return (
    <>
      {/* Target handle — hidden for start nodes */}
      {!isStart && <Handle type="target" position={Position.Top} className={c.handle} />}

      <div className={`bot-node ${selected ? 'selected' : ''}`}>
        {/* Header */}
        <div className={`bot-node-header bg-gradient-to-r ${c.grad} to-transparent`}>
          <div className={`w-2.5 h-2.5 rounded-full ${c.dot} ring-2 ${c.dot}/30`} />
          <span className={`text-xs font-bold ${c.text} uppercase tracking-wider`}>{typeLabel}</span>
          {isStart && (
            <div className="ml-auto flex gap-1">
              {data.triggers!.map((t, i) => (
                <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded border ${c.accent}`}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="bot-node-body space-y-2">
          {/* Text content */}
          <p className="text-sm text-gray-300 line-clamp-3">
            {data.text || <span className="text-gray-600 italic">Пустой текст...</span>}
          </p>

          {/* Input indicator */}
          {hasInput && (
            <div className={`flex items-center gap-1.5 text-xs ${c.accent} border rounded-md px-2 py-1`}>
              <span className="text-gray-500">&rarr;</span>
              <span className="font-mono">{data.input!.variable}</span>
            </div>
          )}

          {/* Buttons */}
          {hasButtons && (
            <div className="space-y-1">
              {data.buttons!.map((btn, i) => {
                const cbIdx = btn.type !== 'url' ? callbackButtons.indexOf(btn) : -1;
                return (
                  <div
                    key={i}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 ${
                      btn.type === 'url'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/20 justify-center'
                        : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                    }`}
                  >
                    {btn.type === 'url' ? (
                      <span className="opacity-60">&#8599;</span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-purple-500/30 text-purple-200 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {cbIdx + 1}
                      </span>
                    )}
                    <span className="flex-1 text-center">{btn.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Answer variable indicator */}
          {hasButtons && data.button_answer_variable && (
            <div className="flex items-center gap-1.5 text-xs border-purple-500/20 bg-purple-500/10 text-purple-400 border rounded-md px-2 py-1">
              <span className="text-gray-500">&rarr;</span>
              <span className="font-mono">{data.button_answer_variable}</span>
            </div>
          )}
        </div>
      </div>

      {/* Source handles */}
      {hasCallbackButtons ? (
        <div className="relative">
          {callbackButtons.map((btn, i) => {
            const leftPct = ((i + 1) / (callbackButtons.length + 2)) * 100;
            return (
              <div key={btn.output_handle}>
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={btn.output_handle}
                  className="!bg-purple-500"
                  style={{ left: `${leftPct}%` }}
                />
                <div
                  className="absolute text-[8px] font-bold text-purple-400 pointer-events-none select-none nodrag"
                  style={{ left: `${leftPct}%`, bottom: '-18px', transform: 'translateX(-50%)' }}
                >
                  {i + 1}
                </div>
              </div>
            );
          })}
          {/* Default output */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="default"
            className="!bg-gray-400"
            style={{ left: `${((callbackButtons.length + 1) / (callbackButtons.length + 2)) * 100}%` }}
          />
        </div>
      ) : (
        <Handle type="source" position={Position.Bottom} className={c.handle} />
      )}
    </>
  );
});

MessageNode.displayName = 'MessageNode';
export default MessageNode;
