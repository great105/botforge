import { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useEditorStore } from '@/stores/editorStore';
import { BOT_TEMPLATES, type BotTemplate } from '@/lib/templates';

const COMPLEXITY_LABELS: Record<string, { text: string; cls: string }> = {
  simple: { text: 'Простой', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  medium: { text: 'Средний', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  complex: { text: 'Сложный', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface Props {
  onClose: () => void;
}

export default function TemplateGallery({ onClose }: Props) {
  const [selected, setSelected] = useState<BotTemplate | null>(null);
  const [search, setSearch] = useState('');
  const setNodes = useEditorStore((s) => s.setNodes);
  const setEdges = useEditorStore((s) => s.setEdges);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const nodes = useEditorStore((s) => s.nodes);
  const { fitView } = useReactFlow();

  const filtered = search.trim()
    ? BOT_TEMPLATES.filter((t) => {
        const q = search.toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
        );
      })
    : BOT_TEMPLATES;

  const handleApply = (template: BotTemplate) => {
    const hasExisting = nodes.filter((n) => n.type !== 'note').length > 0;
    if (hasExisting && !confirm('Текущая схема будет заменена шаблоном. Продолжить?')) {
      return;
    }
    pushHistory();
    setNodes(template.nodes.map((n) => ({ ...n, data: { ...n.data } })));
    setEdges(template.edges.map((e) => ({ ...e })));
    setTimeout(() => fitView({ padding: 0.3, duration: 400 }), 50);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[85vh] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-100">Шаблоны ботов</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Выберите готовый шаблон и настройте под себя
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none px-2 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-800/50 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !py-2"
            placeholder="Поиск шаблонов..."
            autoFocus
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {selected ? (
            // Detail view
            <div>
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-gray-400 hover:text-white mb-4 flex items-center gap-1 transition-colors"
              >
                ← Все шаблоны
              </button>

              <div className="flex items-start gap-4 mb-5">
                <div className="text-4xl">{selected.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-100">{selected.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{selected.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selected.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schema preview */}
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 mb-5">
                <p className="text-xs text-gray-500 mb-3 font-medium">Структура бота:</p>
                <div className="space-y-1.5">
                  {selected.nodes
                    .filter((n) => n.type !== 'note')
                    .map((node, i) => {
                      const data = node.data as Record<string, unknown>;
                      const connectedTo = selected.edges
                        .filter((e) => e.source === node.id)
                        .map((e) => {
                          const target = selected.nodes.find((n) => n.id === e.target);
                          return (target?.data as Record<string, unknown>)?.label || e.target;
                        });
                      return (
                        <div key={node.id} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600 w-4 text-right shrink-0">{i + 1}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            nodeTypeColor(node.type as string)
                          }`}>
                            {nodeTypeLabel(node.type as string)}
                          </span>
                          <span className="text-xs text-gray-300 truncate">
                            {String(data.label || '')}
                          </span>
                          {connectedTo.length > 0 && (
                            <span className="text-[10px] text-gray-600 truncate">
                              → {connectedTo.join(', ')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-800 flex gap-4">
                  <span className="text-[10px] text-gray-600">
                    {selected.nodes.filter((n) => n.type !== 'note').length} блоков
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {selected.edges.length} связей
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleApply(selected)}
                className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Применить шаблон
              </button>
            </div>
          ) : (
            // Grid view
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelected(template)}
                  className="text-left bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${COMPLEXITY_LABELS[template.complexity]?.cls}`}>
                          {COMPLEXITY_LABELS[template.complexity]?.text}
                        </span>
                        <span className="text-[10px] text-gray-600">
                          {template.nodes.filter((n) => n.type !== 'note').length} блоков
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="col-span-2 py-12 text-center">
                  <p className="text-sm text-gray-500">Шаблоны не найдены</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!selected && (
          <div className="px-6 py-3 border-t border-gray-800 shrink-0 flex justify-between items-center">
            <span className="text-[10px] text-gray-600">
              {BOT_TEMPLATES.length} шаблонов
            </span>
            <button
              onClick={onClose}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Начать с нуля
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function nodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    message: 'Сообщение',
    condition: 'Условие',
    delay: 'Задержка',
    payment: 'Оплата',
    gpt: 'GPT',
    webhook: 'Webhook',
    variable: 'Переменная',
    media: 'Медиа',
    random: 'Случайный',
    check_sub: 'Подписка',
    notify: 'Уведомление',
    note: 'Заметка',
  };
  return labels[type] || type;
}

function nodeTypeColor(type: string): string {
  const colors: Record<string, string> = {
    message: 'bg-blue-500/20 text-blue-400',
    condition: 'bg-yellow-500/20 text-yellow-400',
    delay: 'bg-orange-500/20 text-orange-400',
    payment: 'bg-emerald-500/20 text-emerald-400',
    gpt: 'bg-violet-500/20 text-violet-400',
    webhook: 'bg-pink-500/20 text-pink-400',
    variable: 'bg-amber-500/20 text-amber-400',
    media: 'bg-teal-500/20 text-teal-400',
    random: 'bg-indigo-500/20 text-indigo-400',
    check_sub: 'bg-sky-500/20 text-sky-400',
    notify: 'bg-rose-500/20 text-rose-400',
    note: 'bg-gray-500/20 text-gray-400',
  };
  return colors[type] || 'bg-gray-500/20 text-gray-400';
}
