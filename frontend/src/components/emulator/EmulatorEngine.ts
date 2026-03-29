// EmulatorEngine: client-side graph interpreter for live preview
// In a full implementation, this communicates with the backend WebSocket
// For now, it provides a basic local emulation

import type { BotSchema } from '@/types/schema';

interface EmulatorMessage {
  id: string;
  from: 'bot' | 'user';
  text: string;
  buttons?: { text: string; callback_data: string }[];
  timestamp: number;
}

export class EmulatorEngine {
  private schema: BotSchema;
  private currentNodeId: string | null = null;
  private variables: Record<string, unknown> = {};
  private messages: EmulatorMessage[] = [];
  private onUpdate: (messages: EmulatorMessage[]) => void;

  constructor(schema: BotSchema, onUpdate: (messages: EmulatorMessage[]) => void) {
    this.schema = schema;
    this.onUpdate = onUpdate;
  }

  async sendCommand(text: string) {
    this.addMessage('user', text);

    if (!this.currentNodeId) {
      // Find start node
      const startNode = this.schema.nodes.find(
        (n) => n.type === 'start' && (n.data as any).triggers?.some(
          (t: string) => t === `command:${text}` || t === text
        ),
      );
      if (startNode) {
        await this.executeNode(startNode.id);
      }
    } else {
      // Feed input to current node
      const node = this.schema.nodes.find((n) => n.id === this.currentNodeId);
      if (node?.type === 'input') {
        const varName = (node.data as any).variable || 'user_input';
        this.variables[varName] = text;
        const nextId = this.getNextNodeId(node.id);
        if (nextId) {
          await this.executeNode(nextId);
        }
      }
    }
  }

  async clickButton(callbackData: string) {
    if (!this.currentNodeId) return;
    const nextId = this.getNextNodeId(this.currentNodeId, callbackData);
    if (nextId) {
      await this.executeNode(nextId);
    }
  }

  private async executeNode(nodeId: string) {
    const node = this.schema.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const data = node.data as any;

    switch (node.type) {
      case 'start':
      case 'text': {
        const text = this.interpolate(data.text || data.label || '');
        this.addMessage('bot', text);
        this.currentNodeId = null;
        const nextId = this.getNextNodeId(nodeId);
        if (nextId) {
          await this.executeNode(nextId);
        }
        break;
      }
      case 'buttons': {
        const text = this.interpolate(data.text || '');
        const buttons = (data.buttons || []).map((b: any) => ({
          text: b.text,
          callback_data: b.output_handle,
        }));
        this.addMessage('bot', text, buttons);
        this.currentNodeId = nodeId;
        break;
      }
      case 'input': {
        const text = this.interpolate(data.text || 'Введите значение:');
        this.addMessage('bot', text);
        this.currentNodeId = nodeId;
        break;
      }
      case 'condition': {
        const varValue = String(this.variables[data.variable] || '');
        const match = varValue === String(data.value);
        const handle = match ? 'handle_yes' : 'handle_no';
        const nextId = this.getNextNodeId(nodeId, handle);
        if (nextId) {
          await this.executeNode(nextId);
        }
        break;
      }
      case 'variable': {
        if (data.action === 'set') {
          this.variables[data.variable] = data.value;
        }
        const nextId = this.getNextNodeId(nodeId);
        if (nextId) {
          await this.executeNode(nextId);
        }
        break;
      }
      case 'delay': {
        const nextId = this.getNextNodeId(nodeId);
        if (nextId) {
          await this.executeNode(nextId);
        }
        break;
      }
      default: {
        this.addMessage('bot', `[${node.type}: ${data.label}]`);
        const nextId = this.getNextNodeId(nodeId);
        if (nextId) {
          await this.executeNode(nextId);
        }
      }
    }
  }

  private getNextNodeId(sourceId: string, handle?: string): string | null {
    const edge = this.schema.edges.find(
      (e) => e.source === sourceId && (!handle || e.sourceHandle === handle),
    );
    return edge?.target || null;
  }

  private interpolate(text: string): string {
    for (const [key, value] of Object.entries(this.variables)) {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return text;
  }

  private addMessage(from: 'bot' | 'user', text: string, buttons?: any[]) {
    this.messages.push({
      id: `msg_${Date.now()}_${Math.random()}`,
      from,
      text,
      buttons,
      timestamp: Date.now(),
    });
    this.onUpdate([...this.messages]);
  }
}
