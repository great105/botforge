import type { BotNodeType } from '@/types/nodes';

export interface BlockDef {
  type: BotNodeType;
  label: string;
  icon: string;
  color: string;
  gradient: string;
  description: string;
}

export const BLOCKS: BlockDef[] = [
  { type: 'message',   label: 'Сообщение',  icon: '\u2709', color: 'bg-blue-500',    gradient: 'from-blue-500/20 to-blue-600/5',    description: 'Текст, кнопки, ввод' },
  { type: 'condition',  label: 'Условие',    icon: '\u2442', color: 'bg-yellow-500',  gradient: 'from-yellow-500/20 to-yellow-600/5',description: 'Ветвление' },
  { type: 'delay',      label: 'Задержка',   icon: '\u23F1', color: 'bg-orange-500',  gradient: 'from-orange-500/20 to-orange-600/5',description: 'Пауза' },
  { type: 'payment',    label: 'Оплата',     icon: '\u2B50', color: 'bg-emerald-500', gradient: 'from-emerald-500/20 to-emerald-600/5', description: 'Приём платежа' },
  { type: 'gpt',        label: 'GPT',        icon: '\u2728', color: 'bg-violet-500',  gradient: 'from-violet-500/20 to-violet-600/5',description: 'AI-ответ' },
  { type: 'webhook',    label: 'Webhook',    icon: '\u21C4', color: 'bg-pink-500',    gradient: 'from-pink-500/20 to-pink-600/5',    description: 'HTTP-запрос' },
  { type: 'variable',   label: 'Переменная', icon: '\u{1D465}', color: 'bg-amber-500', gradient: 'from-amber-500/20 to-amber-600/5', description: 'Установить значение' },
  { type: 'media',      label: 'Медиа',      icon: '\uD83D\uDCF7', color: 'bg-teal-500',  gradient: 'from-teal-500/20 to-teal-600/5',  description: 'Фото, видео, документ' },
  { type: 'random',     label: 'Случайный',  icon: '\uD83C\uDFB2', color: 'bg-indigo-500',gradient: 'from-indigo-500/20 to-indigo-600/5',description: 'A/B тест, рандом' },
  { type: 'check_sub',  label: 'Подписка',   icon: '\uD83D\uDD12', color: 'bg-sky-500',   gradient: 'from-sky-500/20 to-sky-600/5',    description: 'Проверка подписки' },
  { type: 'notify',     label: 'Уведомление', icon: '\uD83D\uDD14', color: 'bg-rose-500',  gradient: 'from-rose-500/20 to-rose-600/5',  description: 'Сообщение админу' },
  { type: 'knowledge',  label: 'База знаний', icon: '\uD83E\uDDE0', color: 'bg-cyan-500',  gradient: 'from-cyan-500/20 to-cyan-600/5',  description: 'RAG: файлы + AI-ответ' },
  { type: 'note',       label: 'Заметка',    icon: '\uD83D\uDCDD', color: 'bg-gray-500',  gradient: 'from-gray-500/20 to-gray-600/5',  description: 'Комментарий на холсте' },
];

export function getDefaultData(type: BotNodeType): Record<string, unknown> {
  const block = BLOCKS.find((b) => b.type === type);
  const data: Record<string, unknown> = {
    label: block?.label ?? type,
  };

  switch (type) {
    case 'message':
      data.text = '';
      data.parse_mode = 'HTML';
      break;
    case 'condition':
      data.variable = '';
      data.operator = 'equals';
      data.value = '';
      break;
    case 'delay':
      data.delay_seconds = 3;
      break;
    case 'payment':
      data.title = 'Оплата';
      data.description = '';
      data.amount = 100;
      data.currency = 'XTR';
      break;
    case 'gpt':
      data.system_prompt = 'Ты полезный ассистент.';
      data.model = 'gpt-4o-mini';
      data.api_key = '';
      break;
    case 'webhook':
      data.url = '';
      data.method = 'POST';
      break;
    case 'variable':
      data.variable = '';
      data.action = 'set';
      data.value = '';
      break;
    case 'media':
      data.media_type = 'photo';
      data.url = '';
      data.caption = '';
      break;
    case 'random':
      data.branches = [
        { label: 'Вариант A', weight: 50, output_handle: 'branch_a' },
        { label: 'Вариант B', weight: 50, output_handle: 'branch_b' },
      ];
      break;
    case 'check_sub':
      data.channel_id = '';
      data.fail_text = 'Подпишитесь на канал, чтобы продолжить!';
      break;
    case 'notify':
      data.chat_id = '';
      data.text = '';
      data.parse_mode = 'HTML';
      break;
    case 'note':
      data.text = '';
      data.color = 'yellow';
      break;
    case 'knowledge':
      data.api_key = '';
      data.model = 'openai/gpt-4o-mini';
      data.embedding_model = 'openai/text-embedding-3-small';
      data.system_prompt = 'Отвечай на вопросы, используя предоставленный контекст из базы знаний. Если информации нет в контексте — скажи об этом.';
      data.max_tokens = 1000;
      data.conversational = true;
      data.files_count = 0;
      break;
  }

  return data;
}
