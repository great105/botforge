import { useEditorStore } from '@/stores/editorStore';

export default function PropertiesPanel() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const nodes = useEditorStore((s) => s.nodes);
  const updateNodeData = useEditorStore((s) => s.updateNodeData);
  const deleteNode = useEditorStore((s) => s.deleteNode);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 flex items-center justify-center">
        <p className="text-gray-500 text-sm text-center">
          Выберите блок для редактирования
        </p>
      </div>
    );
  }

  const data = node.data as Record<string, unknown>;

  const handleChange = (key: string, value: unknown) => {
    updateNodeData(node.id, { [key]: value });
  };

  return (
    <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">
          {String(data.label || node.type)}
        </h3>
        <button
          onClick={() => deleteNode(node.id)}
          className="text-xs text-red-400 hover:text-red-300"
        >
          Удалить
        </button>
      </div>

      <div className="space-y-3">
        {/* Label */}
        <Field label="Название">
          <input
            type="text"
            value={String(data.label || '')}
            onChange={(e) => handleChange('label', e.target.value)}
            className="input-field"
          />
        </Field>

        {/* Type-specific fields */}
        {(node.type === 'text' || node.type === 'start') && (
          <Field label="Текст сообщения">
            <textarea
              value={String(data.text || '')}
              onChange={(e) => handleChange('text', e.target.value)}
              className="input-field min-h-[80px] resize-y"
              rows={3}
            />
          </Field>
        )}

        {node.type === 'start' && (
          <Field label="Триггеры (через запятую)">
            <input
              type="text"
              value={Array.isArray(data.triggers) ? (data.triggers as string[]).join(', ') : ''}
              onChange={(e) =>
                handleChange(
                  'triggers',
                  e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                )
              }
              className="input-field"
              placeholder="command:/start, text:привет"
            />
          </Field>
        )}

        {node.type === 'input' && (
          <>
            <Field label="Текст запроса">
              <textarea
                value={String(data.text || '')}
                onChange={(e) => handleChange('text', e.target.value)}
                className="input-field min-h-[60px]"
                rows={2}
              />
            </Field>
            <Field label="Переменная">
              <input
                type="text"
                value={String(data.variable || '')}
                onChange={(e) => handleChange('variable', e.target.value)}
                className="input-field"
              />
            </Field>
          </>
        )}

        {node.type === 'condition' && (
          <>
            <Field label="Переменная">
              <input
                type="text"
                value={String(data.variable || '')}
                onChange={(e) => handleChange('variable', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Оператор">
              <select
                value={String(data.operator || 'equals')}
                onChange={(e) => handleChange('operator', e.target.value)}
                className="input-field"
              >
                <option value="equals">Равно</option>
                <option value="not_equals">Не равно</option>
                <option value="contains">Содержит</option>
                <option value="greater_than">Больше</option>
                <option value="less_than">Меньше</option>
                <option value="is_set">Задано</option>
                <option value="is_not_set">Не задано</option>
              </select>
            </Field>
            <Field label="Значение">
              <input
                type="text"
                value={String(data.value || '')}
                onChange={(e) => handleChange('value', e.target.value)}
                className="input-field"
              />
            </Field>
          </>
        )}

        {node.type === 'delay' && (
          <Field label="Задержка (секунды)">
            <input
              type="number"
              value={Number(data.delay_seconds || 1)}
              onChange={(e) => handleChange('delay_seconds', parseInt(e.target.value) || 1)}
              className="input-field"
              min={1}
              max={300}
            />
          </Field>
        )}

        {node.type === 'payment' && (
          <>
            <Field label="Название">
              <input
                type="text"
                value={String(data.title || '')}
                onChange={(e) => handleChange('title', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Сумма">
              <input
                type="number"
                value={Number(data.amount || 100)}
                onChange={(e) => handleChange('amount', parseInt(e.target.value) || 100)}
                className="input-field"
              />
            </Field>
            <Field label="Валюта">
              <select
                value={String(data.currency || 'XTR')}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="input-field"
              >
                <option value="XTR">Telegram Stars</option>
                <option value="RUB">RUB</option>
                <option value="USD">USD</option>
              </select>
            </Field>
          </>
        )}

        {node.type === 'variable' && (
          <>
            <Field label="Переменная">
              <input
                type="text"
                value={String(data.variable || '')}
                onChange={(e) => handleChange('variable', e.target.value)}
                className="input-field"
              />
            </Field>
            <Field label="Действие">
              <select
                value={String(data.action || 'set')}
                onChange={(e) => handleChange('action', e.target.value)}
                className="input-field"
              >
                <option value="set">Установить</option>
                <option value="increment">Увеличить</option>
                <option value="decrement">Уменьшить</option>
                <option value="append">Добавить в список</option>
                <option value="delete">Удалить</option>
              </select>
            </Field>
            <Field label="Значение">
              <input
                type="text"
                value={String(data.value || '')}
                onChange={(e) => handleChange('value', e.target.value)}
                className="input-field"
              />
            </Field>
          </>
        )}

        {/* Node ID info */}
        <div className="pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-600">ID: {node.id}</p>
          <p className="text-xs text-gray-600">Тип: {node.type}</p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
