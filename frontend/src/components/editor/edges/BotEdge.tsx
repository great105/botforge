import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

export default function BotEdge(props: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  return (
    <>
      {/* Glow effect under the edge */}
      <BaseEdge
        id={`${props.id}-glow`}
        path={edgePath}
        style={{
          stroke: '#6366f1',
          strokeWidth: 6,
          opacity: 0.15,
          filter: 'blur(3px)',
        }}
      />
      {/* Main edge */}
      <BaseEdge
        id={props.id}
        path={edgePath}
        style={{
          stroke: props.selected ? '#818cf8' : '#6366f1',
          strokeWidth: 2,
        }}
      />
      {/* Animated flow dot */}
      <circle r="3" fill="#a5b4fc" opacity={0.8}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      {/* Delete button on select */}
      {props.selected && (
        <EdgeLabelRenderer>
          <button
            className="pointer-events-auto absolute flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white transition-colors text-xs"
            style={{
              transform: `translate(${labelX}px, ${labelY}px) translate(-50%, -50%)`,
            }}
            onClick={() => setEdges((edges) => edges.filter((e) => e.id !== props.id))}
          >
            &times;
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
