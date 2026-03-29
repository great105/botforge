import type { Node } from '@xyflow/react';

export type BotNodeType =
  | 'start'
  | 'text'
  | 'buttons'
  | 'condition'
  | 'input'
  | 'delay'
  | 'payment'
  | 'gpt'
  | 'webhook'
  | 'variable';

export interface StartNodeData {
  label: string;
  triggers: string[];
}

export interface TextNodeData {
  label: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown';
}

export interface ButtonItem {
  text: string;
  output_handle: string;
}

export interface ButtonsNodeData {
  label: string;
  text: string;
  buttons: ButtonItem[];
  layout?: 'vertical' | 'horizontal';
}

export interface ConditionNodeData {
  label: string;
  variable: string;
  operator: string;
  value: string;
}

export interface InputNodeData {
  label: string;
  text: string;
  variable: string;
  validation?: 'email' | 'phone' | null;
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

export type AnyNodeData =
  | StartNodeData
  | TextNodeData
  | ButtonsNodeData
  | ConditionNodeData
  | InputNodeData
  | DelayNodeData
  | PaymentNodeData
  | GptNodeData
  | WebhookNodeData
  | VariableNodeData;

export type BotNode = Node<Record<string, unknown>, BotNodeType>;
