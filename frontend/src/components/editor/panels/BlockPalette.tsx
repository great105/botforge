import { useCallback } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import type { BotNodeType } from '@/types/nodes';

const BLOCKS: { type: BotNodeType; label: string; color: string; description: string }[] = [
  { type: 'start', label: 'Старт', color: 'bg-green-500', description: 'Точка входа' },
  { type: 'text', label: 'Текст', color: 'bg-blue-500', description: 'Отправить сообщение' },
  { type: 'buttons', label: 'Кнопки', color: 'bg-purple-500', description: 'Инлайн-кнопки' },
  { type: 'condition', label: 'Условие', color: 'bg-yellow-500', description: 'Ветвление' },
  { type: 'input', label: 'Ввод', color: 'bg-cyan-500', description: 'Запрос данных' },
  { type: 'delay', label: 'Задержка', color: 'bg-orange-500', description: 'Пауза' },
  { type: 'payment', label: 'Оплата', color: 'bg-emerald-500', description: 'Приём платежа' },
  { type: 'gpt', label: 'GPT', color: 'bg-violet-500', description: 'AI-ответ' },
  { type: 'webhook', label: 'Webhook', color: 'bg-pink-500', description: 'HTTP-запрос' },
  { type: 'variable', label: 'Переменная', color: 'bg-amber-500', description: 'Установить значение' },
];

export default function BlockPalette() {
  const addNode = useEditorStore((s) => s.addNode);
  const nodes = useEditorStore((s) => s.nodes);

  const handleAdd = useCallback(
    (type: BotNodeType) => {
      const id = `node_${Date.now()}`;
      const y = nodes.length * 150 + 50;

      const defaultData: Record<string, unknown> = { label: type.charAt(0).toUpperCase() + type.slice(1) };

      switch (type) {
        case 'start':
          defaultData.triggers = ['command:/start'];
          break;
        case 'text':
          defaultData.text = '';
          defaultData.parse_mode = 'HTML';
          break;
        case 'buttons':
          defaultData.text = 'Выберите:';
          defaultData.buttons = [{ text: 'Кнопка 1', output_handle: 'btn_1' }];
          defaultData.layout = 'vertical';
          break;
        case 'condition':
          defaultData.variable = '';
          defaultData.operator = 'equals';
          defaultData.value = '';
          break;
        case 'input':
          defaultData.text = 'Введите значение:';
          defaultData.variable = 'user_input';
          break;
        case 'delay':
          defaultData.delay_seconds = 3;
          break;
        case 'payment':
          defaultData.title = 'Оплата';
          defaultData.description = '';
          defaultData.amount = 100;
          defaultData.currency = 'XTR';
          break;
        case 'gpt':
          defaultData.system_prompt = 'Ты полезный ассистент.';
          defaultData.model = 'gpt-4o-mini';
          defaultData.api_key = '';
          break;
        case 'webhook':
          defaultData.url = '';
          defaultData.method = 'POST';
          break;
        case 'variable':
          defaultData.variable = '';
          defaultData.action = 'set';
          defaultData.value = '';
          break;
      }

      addNode({
        id,
        type,
        position: { x: 250, y },
        data: defaultData,
      });
    },
    [addNode, nodes.length],
  );

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 p-3 overflow-y-auto">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Блоки
      </h3>
      <div className="space-y-1.5">
        {BLOCKS.map((block) => (
          <button
            key={block.type}
            onClick={() => handleAdd(block.type)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left group"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${block.color} shrink-0`} />
            <div>
              <div className="text-sm text-gray-200 group-hover:text-white">{block.label}</div>
              <div className="text-xs text-gray-500">{block.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
