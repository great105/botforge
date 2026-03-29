import type { Node, Edge } from '@xyflow/react';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Check 1: start node exists
  const starts = nodes.filter((n) => n.type === 'start');
  if (starts.length === 0) {
    errors.push('Нет стартового блока');
  }

  // Check 2: dangling edges
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Ребро: источник ${edge.source} не существует`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Ребро: цель ${edge.target} не существует`);
    }
  }

  // Check 3: reachability
  if (starts.length > 0) {
    const reachable = new Set<string>();
    const queue = starts.map((s) => s.id);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachable.has(current)) continue;
      reachable.add(current);
      for (const edge of edges) {
        if (edge.source === current && !reachable.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }
    const unreachable = nodes.filter((n) => !reachable.has(n.id));
    if (unreachable.length > 0) {
      warnings.push(`Недостижимые блоки: ${unreachable.map((n) => (n.data as any).label || n.id).join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
