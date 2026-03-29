import StartNode from './StartNode';
import TextNode from './TextNode';
import ButtonsNode from './ButtonsNode';
import ConditionNode from './ConditionNode';
import InputNode from './InputNode';
import DelayNode from './DelayNode';
import PaymentNode from './PaymentNode';
import GptNode from './GptNode';
import WebhookNode from './WebhookNode';
import VariableNode from './VariableNode';

export const nodeTypes = {
  start: StartNode,
  text: TextNode,
  buttons: ButtonsNode,
  condition: ConditionNode,
  input: InputNode,
  delay: DelayNode,
  payment: PaymentNode,
  gpt: GptNode,
  webhook: WebhookNode,
  variable: VariableNode,
} as const;
