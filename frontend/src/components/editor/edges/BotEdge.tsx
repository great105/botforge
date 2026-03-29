import {
  BaseEdge,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

export default function BotEdge(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  });

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      style={{ stroke: '#6366f1', strokeWidth: 2 }}
    />
  );
}
