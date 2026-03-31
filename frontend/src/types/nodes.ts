import type { Node } from '@xyflow/react';

export type BotNodeType =
  | 'message'
  | 'condition'
  | 'delay'
  | 'payment'
  | 'gpt'
  | 'webhook'
  | 'variable'
  | 'media'
  | 'random'
  | 'check_sub'
  | 'notify'
  | 'note'
  | 'knowledge';

// --- Message node (unified: replaces start, text, buttons, input) ---

export interface ButtonItem {
  text: string;
  output_handle: string;
  type?: 'callback' | 'url';
  url?: string;
}

export interface InputConfig {
  variable: string;
  validation?: 'email' | 'phone' | null;
}

export interface MessageNodeData {
  label: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
  triggers?: string[];
  buttons?: ButtonItem[];
  button_layout?: 'vertical' | 'horizontal';
  button_answer_variable?: string;
  input?: InputConfig | null;
}

// --- Separate node types (unchanged) ---

export interface ConditionNodeData {
  label: string;
  variable: string;
  operator: string;
  value: string;
}

export interface DelayNodeData {
  label: string;
  delay_seconds: number;
}

export interface PaymentNodeData {
  label: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  provider_token?: string;
}

export interface GptNodeData {
  label: string;
  system_prompt: string;
  model: string;
  api_key: string;
  max_tokens?: number;
  conversational?: boolean;
}

export interface WebhookNodeData {
  label: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  payload?: Record<string, unknown>;
}

export interface VariableNodeData {
  label: string;
  variable: string;
  action: 'set' | 'increment' | 'decrement' | 'append' | 'delete';
  value: string;
}

// --- Media node ---

export interface MediaNodeData {
  label: string;
  media_type: 'photo' | 'video' | 'document' | 'sticker' | 'voice' | 'audio' | 'animation';
  url: string;
  caption?: string;
  parse_mode?: 'HTML' | 'Markdown';
}

// --- Random node (A/B testing) ---

export interface RandomBranch {
  label: string;
  weight: number;
  output_handle: string;
}

export interface RandomNodeData {
  label: string;
  branches: RandomBranch[];
}

// --- Check subscription node ---

export interface CheckSubNodeData {
  label: string;
  channel_id: string;
  fail_text?: string;
}

// --- Notify node (send message to specific chat_id) ---

export interface NotifyNodeData {
  label: string;
  chat_id: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

// --- Note node (canvas annotation, not executed) ---

export interface NoteNodeData {
  label: string;
  text: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'gray';
}

export type AnyNodeData =
  | MessageNodeData
  | ConditionNodeData
  | DelayNodeData
  | PaymentNodeData
  | GptNodeData
  | WebhookNodeData
  | VariableNodeData
  | MediaNodeData
  | RandomNodeData
  | CheckSubNodeData
  | NotifyNodeData
  | NoteNodeData;

export type BotNode = Node<Record<string, unknown>, BotNodeType>;
