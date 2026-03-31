/**
 * Migrate old v1 schemas (separate start/text/buttons/input nodes)
 * to v2 (unified message nodes). Called on schema load.
 */

interface SchemaNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface BotSchema {
  version?: number;
  nodes: SchemaNode[];
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string }>;
  viewport?: { x: number; y: number; zoom: number };
}

const LEGACY_MESSAGE_TYPES = new Set(['start', 'text', 'buttons', 'input']);

export function migrateSchema(schema: BotSchema): BotSchema {
  const version = schema.version ?? 1;
  if (version >= 2) return schema;

  const newNodes = schema.nodes.map((node) => {
    if (!LEGACY_MESSAGE_TYPES.has(node.type)) return node;

    const data = { ...node.data };

    // Normalize input node: move top-level variable/validation into input object
    if (node.type === 'input') {
      data.input = {
        variable: data.variable ?? 'user_input',
        validation: data.validation ?? null,
      };
      delete data.variable;
      delete data.validation;
    }

    // Normalize button_layout
    if ('layout' in data && !('button_layout' in data)) {
      data.button_layout = data.layout;
      delete data.layout;
    }

    return { ...node, type: 'message', data };
  });

  return { ...schema, version: 2, nodes: newNodes };
}
