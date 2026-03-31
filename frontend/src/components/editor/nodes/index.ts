import MessageNode from './MessageNode';
import ConditionNode from './ConditionNode';
import DelayNode from './DelayNode';
import PaymentNode from './PaymentNode';
import GptNode from './GptNode';
import WebhookNode from './WebhookNode';
import VariableNode from './VariableNode';
import MediaNode from './MediaNode';
import RandomNode from './RandomNode';
import CheckSubNode from './CheckSubNode';
import NotifyNode from './NotifyNode';
import NoteNode from './NoteNode';
import KnowledgeNode from './KnowledgeNode';

export const nodeTypes = {
  // Unified message node
  message: MessageNode,
  // Legacy types -> same component (backward compat for unmigrated schemas)
  start: MessageNode,
  text: MessageNode,
  buttons: MessageNode,
  input: MessageNode,
  // Separate node types
  condition: ConditionNode,
  delay: DelayNode,
  payment: PaymentNode,
  gpt: GptNode,
  webhook: WebhookNode,
  variable: VariableNode,
  // New node types
  media: MediaNode,
  random: RandomNode,
  check_sub: CheckSubNode,
  notify: NotifyNode,
  note: NoteNode,
  knowledge: KnowledgeNode,
} as const;
