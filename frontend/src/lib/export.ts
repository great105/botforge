import type { Node, Edge } from '@xyflow/react';

/**
 * Export bot schema to aiogram 3 Python code.
 * Generates a self-contained bot script.
 */
export function exportToAiogram(nodes: Node[], edges: Edge[]): string {
  const lines: string[] = [];

  lines.push('"""');
  lines.push('Бот сгенерирован в BotForge');
  lines.push('Требуется: pip install aiogram>=3.25');
  lines.push('"""');
  lines.push('');
  lines.push('import asyncio');
  lines.push('from aiogram import Bot, Dispatcher, Router, F');
  lines.push('from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton');
  lines.push('from aiogram.filters import CommandStart');
  lines.push('');
  lines.push('TOKEN = "YOUR_BOT_TOKEN"');
  lines.push('');
  lines.push('bot = Bot(token=TOKEN, default={"parse_mode": "HTML"})');
  lines.push('dp = Dispatcher()');
  lines.push('router = Router()');
  lines.push('dp.include_router(router)');
  lines.push('');
  lines.push('# User state storage (in-memory, use Redis for production)');
  lines.push('user_vars: dict[int, dict] = {}');
  lines.push('');

  // Find start nodes
  const startNodes = nodes.filter((n) => n.type === 'start');

  for (const startNode of startNodes) {
    const data = startNode.data as any;
    const triggers = data.triggers || ['command:/start'];

    for (const trigger of triggers) {
      if (trigger.startsWith('command:')) {
        const cmd = trigger.split(':')[1].replace('/', '');
        if (cmd === 'start') {
          lines.push('@router.message(CommandStart())');
        } else {
          lines.push(`@router.message(F.text == "/${cmd}")`);
        }
        lines.push('async def handle_start(message: Message):');
        lines.push('    chat_id = message.chat.id');

        // Walk the graph from start
        const chain = walkChain(startNode.id, nodes, edges);
        for (const step of chain) {
          const indent = '    ';
          const stepData = step.data as any;

          if (step.type === 'text' || (step.type === 'start' && stepData.text)) {
            const text = (stepData.text || '').replace(/"/g, '\\"');
            lines.push(`${indent}await message.answer("${text}")`);
          } else if (step.type === 'buttons') {
            lines.push(`${indent}kb = InlineKeyboardMarkup(inline_keyboard=[`);
            for (const btn of stepData.buttons || []) {
              lines.push(`${indent}    [InlineKeyboardButton(text="${btn.text}", callback_data="${btn.output_handle}")],`);
            }
            lines.push(`${indent}])`);
            const btnText = (stepData.text || '').replace(/"/g, '\\"');
            lines.push(`${indent}await message.answer("${btnText}", reply_markup=kb)`);
            break; // buttons require callback handling
          }
        }
        lines.push('');
      }
    }
  }

  lines.push('');
  lines.push('async def main():');
  lines.push('    await dp.start_polling(bot)');
  lines.push('');
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    asyncio.run(main())');

  return lines.join('\n');
}

function walkChain(startId: string, nodes: Node[], edges: Edge[]): Node[] {
  const chain: Node[] = [];
  let currentId: string | null = startId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = nodes.find((n) => n.id === currentId);
    if (!node) break;

    // Skip start node itself for text output
    if (node.type !== 'start') {
      chain.push(node);
    }

    // Find next node (default edge, no handle)
    const edge = edges.find((e) => e.source === currentId && !e.sourceHandle);
    currentId = edge?.target || null;
  }

  return chain;
}
