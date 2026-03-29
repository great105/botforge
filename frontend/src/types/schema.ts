import type { Edge, Viewport } from '@xyflow/react';
import type { BotNode } from './nodes';

export interface BotSchema {
  nodes: BotNode[];
  edges: Edge[];
  viewport: Viewport;
}

export interface BotInfo {
  id: string;
  name: string;
  bot_username: string | null;
  status: 'stopped' | 'running' | 'error' | 'sleeping';
  error_message: string | null;
  subscribers_count: number;
  created_at: string;
}

export interface SchemaRecord {
  id: string;
  version: number;
  schema_json: BotSchema;
  is_active: boolean;
}

export interface ValidateResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
