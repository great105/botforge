import type { Node, Edge } from '@xyflow/react';

/**
 * Export bot schema to aiogram 3 Python code.
 * Generates a complete, runnable bot script.
 */
export function exportToAiogram(nodes: Node[], edges: Edge[]): string {
  const L: string[] = [];
  const I = '    '; // indent

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function getNext(nodeId: string, handle?: string): string | null {
    const edge = edges.find((e) =>
      e.source === nodeId &&
      (handle ? e.sourceHandle === handle : !e.sourceHandle || e.sourceHandle === 'default')
    );
    return edge?.target || null;
  }

  function esc(s: string): string {
    return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }

  function varInterp(text: string): string {
    // {name} → {v.get("name", "")}
    return text.replace(/\{(\w+)\}/g, (_, k) => `{v.get("${k}", "")}`);
  }

  // Collect all input nodes (they need to be handled by the catch-all handler)
  const inputSteps: { variable: string; nextId: string | null; nodeId: string }[] = [];

  // ─── Header ────────────────────────────────────
  L.push('"""');
  L.push('Бот сгенерирован в BotForge (сделаембот.рф)');
  L.push('pip install aiogram>=3.25 httpx');
  L.push('"""');
  L.push('');
  L.push('import asyncio');
  L.push('import httpx');
  L.push('from aiogram import Bot, Dispatcher, Router, F');
  L.push('from aiogram.types import (');
  L.push('    Message, CallbackQuery, LabeledPrice, PreCheckoutQuery,');
  L.push('    InlineKeyboardMarkup, InlineKeyboardButton,');
  L.push(')');
  L.push('from aiogram.filters import CommandStart');
  L.push('from aiogram.client.default import DefaultBotProperties');
  L.push('');
  L.push('TOKEN = "YOUR_BOT_TOKEN"  # Замените на токен от @BotFather');
  L.push('');
  L.push('bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode="HTML"))');
  L.push('dp = Dispatcher()');
  L.push('router = Router()');
  L.push('dp.include_router(router)');
  L.push('');
  L.push('# Состояние пользователей');
  L.push('user_state: dict[int, str] = {}  # uid -> node_id (ожидание ввода)');
  L.push('user_vars: dict[int, dict] = {}  # uid -> {переменные}');
  L.push('');
  L.push('');

  // ─── Helper: execute node by id ────────────────
  L.push('async def run_node(node_id: str, chat_id: int, uid: int, text: str = ""):');
  L.push(`${I}"""Выполнить блок по ID."""`);
  L.push(`${I}v = user_vars.setdefault(uid, {})`);
  L.push('');

  // Generate if/elif chain for all nodes
  let first = true;
  for (const node of nodes) {
    if (node.type === 'note') continue;
    const d = node.data as any;
    const prefix = first ? 'if' : 'elif';
    first = false;

    L.push(`${I}${prefix} node_id == "${node.id}":`);
    generateNodeBody(node, I + I);
  }

  if (!first) {
    L.push('');
  }
  L.push('');

  // ─── Command handlers ─────────────────────────
  const startNodes = nodes.filter((n) => {
    const d = n.data as any;
    return d.triggers && d.triggers.length > 0;
  });

  for (const sn of startNodes) {
    const d = sn.data as any;
    for (const trigger of d.triggers || []) {
      const fname = `cmd_${sn.id.replace(/\W/g, '_')}`;
      if (trigger.startsWith('command:')) {
        const cmd = trigger.split(':')[1].replace('/', '');
        if (cmd === 'start') {
          L.push('@router.message(CommandStart())');
        } else {
          L.push(`@router.message(F.text == "/${cmd}")`);
        }
      } else if (trigger.startsWith('text:')) {
        const txt = trigger.split(':').slice(1).join(':');
        L.push(`@router.message(F.text.lower() == "${esc(txt.toLowerCase())}")`);
      }
      L.push(`async def ${fname}(message: Message):`);
      L.push(`${I}uid = message.from_user.id`);
      L.push(`${I}user_state.pop(uid, None)`);
      L.push(`${I}await run_node("${sn.id}", message.chat.id, uid, message.text or "")`);
      L.push('');
      L.push('');
    }
  }

  // ─── Callback handler ─────────────────────────
  const buttonNodes = nodes.filter((n) => {
    const d = n.data as any;
    return d.buttons && d.buttons.some((b: any) => b.type !== 'url');
  });

  if (buttonNodes.length > 0) {
    L.push('@router.callback_query()');
    L.push('async def on_callback(callback: CallbackQuery):');
    L.push(`${I}uid = callback.from_user.id`);
    L.push(`${I}chat_id = callback.message.chat.id`);
    L.push(`${I}v = user_vars.setdefault(uid, {})`);
    L.push(`${I}data = callback.data`);
    L.push(`${I}await callback.answer()`);
    L.push('');

    for (const bn of buttonNodes) {
      const bd = bn.data as any;
      for (const btn of bd.buttons || []) {
        if (btn.type === 'url') continue;
        const nextId = getNext(bn.id, btn.output_handle);
        if (!nextId) continue;
        L.push(`${I}if data == "${esc(btn.output_handle)}":`);
        if (bd.button_answer_variable) {
          L.push(`${I}${I}v["${esc(bd.button_answer_variable)}"] = "${esc(btn.text)}"`);
        }
        L.push(`${I}${I}await run_node("${nextId}", chat_id, uid)`);
        L.push(`${I}${I}return`);
      }
    }
    L.push('');
    L.push('');
  }

  // ─── Catch-all message handler (for input) ────
  L.push('@router.message()');
  L.push('async def on_message(message: Message):');
  L.push(`${I}"""Ловит все сообщения — обрабатывает ожидание ввода."""`);
  L.push(`${I}uid = message.from_user.id`);
  L.push(`${I}chat_id = message.chat.id`);
  L.push(`${I}waiting_node = user_state.pop(uid, None)`);
  L.push(`${I}if not waiting_node:`);
  L.push(`${I}${I}return  # Нет ожидания ввода`);
  L.push('');
  L.push(`${I}v = user_vars.setdefault(uid, {})`);
  L.push('');

  // For each input node, save variable and continue chain
  const inputNodes = nodes.filter((n) => {
    const d = n.data as any;
    return d.input && d.input.variable;
  });

  let firstInput = true;
  for (const inp of inputNodes) {
    const d = inp.data as any;
    const prefix = firstInput ? 'if' : 'elif';
    firstInput = false;
    const nextId = getNext(inp.id);
    L.push(`${I}${prefix} waiting_node == "${inp.id}":`);
    L.push(`${I}${I}v["${esc(d.input.variable)}"] = message.text or ""`);
    if (nextId) {
      L.push(`${I}${I}await run_node("${nextId}", chat_id, uid, message.text or "")`);
    }
  }

  L.push('');
  L.push('');

  // ─── Payment handlers ──────────────────────────
  const paymentNodes = nodes.filter((n) => n.type === 'payment');
  if (paymentNodes.length > 0) {
    L.push('# === Обработка оплаты ===');
    L.push('');
    L.push('@router.pre_checkout_query()');
    L.push('async def on_pre_checkout(query: PreCheckoutQuery):');
    L.push(`${I}await query.answer(ok=True)`);
    L.push('');
    L.push('');
    L.push('@router.message(F.successful_payment)');
    L.push('async def on_successful_payment(message: Message):');
    L.push(`${I}uid = message.from_user.id`);
    L.push(`${I}chat_id = message.chat.id`);
    L.push(`${I}payload = message.successful_payment.invoice_payload`);
    L.push('');

    for (const pn of paymentNodes) {
      const nextId = getNext(pn.id, 'payment_success');
      L.push(`${I}if payload == "pay_${pn.id}":`);
      if (nextId) {
        L.push(`${I}${I}await run_node("${nextId}", chat_id, uid)`);
      } else {
        L.push(`${I}${I}await bot.send_message(chat_id, "✅ Оплата прошла!")`);
      }
    }
    L.push('');
    L.push('');
  }

  // ─── Main ─────────────────────────────────────
  L.push('async def main():');
  L.push('    print("Бот запущен!")');
  L.push('    await dp.start_polling(bot)');
  L.push('');
  L.push('');
  L.push('if __name__ == "__main__":');
  L.push('    asyncio.run(main())');

  return L.join('\n');

  // ─── Generate body for a single node ──────────
  function generateNodeBody(node: Node, ind: string) {
    const d = node.data as any;
    const type = node.type || 'message';

    // --- Message (unified: text + buttons + input) ---
    if (['message', 'start', 'text', 'buttons', 'input'].includes(type)) {
      if (d.text) {
        const text = esc(varInterp(d.text));
        const cbs = (d.buttons || []).filter((b: any) => b.type !== 'url');
        const urls = (d.buttons || []).filter((b: any) => b.type === 'url');
        const allBtns = [...cbs, ...urls];

        if (allBtns.length > 0) {
          L.push(`${ind}kb = InlineKeyboardMarkup(inline_keyboard=[`);
          for (const btn of allBtns) {
            if (btn.type === 'url') {
              L.push(`${ind}${I}[InlineKeyboardButton(text="${esc(btn.text)}", url="${esc(btn.url || '')}")],`);
            } else {
              L.push(`${ind}${I}[InlineKeyboardButton(text="${esc(btn.text)}", callback_data="${esc(btn.output_handle)}")],`);
            }
          }
          L.push(`${ind}])`);
          L.push(`${ind}await bot.send_message(chat_id, f"${text}", reply_markup=kb)`);
        } else {
          L.push(`${ind}await bot.send_message(chat_id, f"${text}")`);
        }
      }

      // Input — set waiting state
      if (d.input && d.input.variable) {
        L.push(`${ind}user_state[uid] = "${node.id}"`);
        L.push(`${ind}return`);
        return;
      }

      // Continue chain if no buttons and no input
      if (!d.buttons?.length) {
        const nextId = getNext(node.id);
        if (nextId) {
          L.push(`${ind}await run_node("${nextId}", chat_id, uid)`);
        }
      }
      return;
    }

    // --- Delay ---
    if (type === 'delay') {
      L.push(`${ind}await asyncio.sleep(${d.delay_seconds || 1})`);
      const nextId = getNext(node.id);
      if (nextId) L.push(`${ind}await run_node("${nextId}", chat_id, uid)`);
      return;
    }

    // --- Variable ---
    if (type === 'variable') {
      const vn = esc(d.variable || 'x');
      if (d.action === 'set') L.push(`${ind}v["${vn}"] = "${esc(d.value || '')}"`);
      else if (d.action === 'increment') L.push(`${ind}v["${vn}"] = str(int(v.get("${vn}", "0")) + 1)`);
      else if (d.action === 'decrement') L.push(`${ind}v["${vn}"] = str(int(v.get("${vn}", "0")) - 1)`);
      else if (d.action === 'delete') L.push(`${ind}v.pop("${vn}", None)`);
      const nextId = getNext(node.id);
      if (nextId) L.push(`${ind}await run_node("${nextId}", chat_id, uid)`);
      return;
    }

    // --- Condition ---
    if (type === 'condition') {
      const vn = esc(d.variable || '');
      const val = esc(d.value || '');
      const ops: Record<string, string> = {
        equals: `v.get("${vn}") == "${val}"`,
        not_equals: `v.get("${vn}") != "${val}"`,
        contains: `"${val}" in v.get("${vn}", "")`,
        greater_than: `float(v.get("${vn}", "0")) > float("${val}")`,
        less_than: `float(v.get("${vn}", "0")) < float("${val}")`,
        is_set: `"${vn}" in v and v["${vn}"]`,
        is_not_set: `"${vn}" not in v or not v["${vn}"]`,
        starts_with: `v.get("${vn}", "").startswith("${val}")`,
        ends_with: `v.get("${vn}", "").endswith("${val}")`,
      };
      L.push(`${ind}if ${ops[d.operator] || ops.equals}:`);
      const yesId = getNext(node.id, 'handle_yes');
      if (yesId) L.push(`${ind}${I}await run_node("${yesId}", chat_id, uid)`);
      else L.push(`${ind}${I}pass`);
      L.push(`${ind}else:`);
      const noId = getNext(node.id, 'handle_no');
      if (noId) L.push(`${ind}${I}await run_node("${noId}", chat_id, uid)`);
      else L.push(`${ind}${I}pass`);
      return;
    }

    // --- Notify ---
    if (type === 'notify') {
      const cid = d.chat_id || 'ADMIN_CHAT_ID';
      const text = esc(varInterp(d.text || ''));
      L.push(`${ind}try:`);
      L.push(`${ind}${I}await bot.send_message(${cid}, f"${text}")`);
      L.push(`${ind}except Exception:`);
      L.push(`${ind}${I}pass  # Админ не найден`);
      const nextId = getNext(node.id);
      if (nextId) L.push(`${ind}await run_node("${nextId}", chat_id, uid)`);
      return;
    }

    // --- GPT ---
    if (type === 'gpt') {
      L.push(`${ind}# GPT ответ через OpenRouter`);
      L.push(`${ind}try:`);
      L.push(`${ind}${I}async with httpx.AsyncClient(timeout=60) as _cl:`);
      L.push(`${ind}${I}${I}_r = await _cl.post("https://openrouter.ai/api/v1/chat/completions",`);
      L.push(`${ind}${I}${I}${I}headers={"Authorization": "Bearer YOUR_OPENROUTER_KEY"},`);
      L.push(`${ind}${I}${I}${I}json={"model": "${esc(d.model || 'openai/gpt-4o-mini')}",`);
      L.push(`${ind}${I}${I}${I}${I}"messages": [{"role": "system", "content": "${esc(d.system_prompt || '')}"},`);
      L.push(`${ind}${I}${I}${I}${I}{"role": "user", "content": text}],`);
      L.push(`${ind}${I}${I}${I}${I}"max_tokens": ${d.max_tokens || 1000}})`);
      L.push(`${ind}${I}${I}_gpt = _r.json()["choices"][0]["message"]["content"]`);
      L.push(`${ind}${I}await bot.send_message(chat_id, _gpt)`);
      L.push(`${ind}except Exception as e:`);
      L.push(`${ind}${I}await bot.send_message(chat_id, f"Ошибка AI: {e}")`);
      if (d.conversational) {
        L.push(`${ind}user_state[uid] = "${node.id}"  # Диалоговый режим`);
      }
      return;
    }

    // --- Media ---
    if (type === 'media') {
      const mt = d.media_type || 'photo';
      const url = esc(d.url || 'URL');
      const cap = d.caption ? `, caption=f"${esc(varInterp(d.caption))}"` : '';
      const methods: Record<string, string> = { photo: 'send_photo', video: 'send_video', document: 'send_document', audio: 'send_audio', voice: 'send_voice', sticker: 'send_sticker', animation: 'send_animation' };
      L.push(`${ind}await bot.${methods[mt] || 'send_photo'}(chat_id, "${url}"${cap})`);
      const nextId = getNext(node.id);
      if (nextId) L.push(`${ind}await run_node("${nextId}", chat_id, uid)`);
      return;
    }

    // --- Webhook ---
    if (type === 'webhook') {
      L.push(`${ind}async with httpx.AsyncClient(timeout=30) as _cl:`);
      L.push(`${ind}${I}_wr = await _cl.${(d.method || 'POST').toLowerCase()}("${esc(d.url || '')}", json=dict(v))`);
      if (d.save_response_to) {
        L.push(`${ind}${I}v["${esc(d.save_response_to)}"] = _wr.text`);
      }
      const nextId = getNext(node.id);
      if (nextId) L.push(`${ind}await run_node("${nextId}", chat_id, uid)`);
      return;
    }

    // --- Random ---
    if (type === 'random') {
      L.push(`${ind}import random as _rnd`);
      const branches = d.branches || [];
      const total = branches.reduce((s: number, b: any) => s + (b.weight || 1), 0);
      L.push(`${ind}_roll = _rnd.randint(1, ${total})`);
      let cumulative = 0;
      for (let i = 0; i < branches.length; i++) {
        const b = branches[i];
        cumulative += b.weight || 1;
        const nextId = getNext(node.id, b.output_handle);
        L.push(`${ind}${ i === 0 ? 'if' : 'elif'} _roll <= ${cumulative}:${nextId ? '' : '  pass'}`);
        if (nextId) L.push(`${ind}${I}await run_node("${nextId}", chat_id, uid)`);
      }
      return;
    }

    // --- Check Sub ---
    if (type === 'check_sub') {
      L.push(`${ind}try:`);
      L.push(`${ind}${I}_m = await bot.get_chat_member("${esc(d.channel_id || '@channel')}", uid)`);
      L.push(`${ind}${I}_subscribed = _m.status in ("member", "administrator", "creator")`);
      L.push(`${ind}except Exception:`);
      L.push(`${ind}${I}_subscribed = False`);
      L.push(`${ind}if _subscribed:`);
      const yesId = getNext(node.id, 'subscribed');
      if (yesId) L.push(`${ind}${I}await run_node("${yesId}", chat_id, uid)`);
      else L.push(`${ind}${I}pass`);
      L.push(`${ind}else:`);
      const noId = getNext(node.id, 'not_subscribed');
      if (noId) L.push(`${ind}${I}await run_node("${noId}", chat_id, uid)`);
      else L.push(`${ind}${I}pass`);
      return;
    }

    // --- Payment (Telegram Stars) ---
    if (type === 'payment') {
      const title = esc(d.title || 'Оплата');
      const desc = esc(d.description || d.title || 'Оплата');
      const amount = d.amount || 100;
      const currency = d.currency || 'XTR';
      const nextId = getNext(node.id, 'payment_success');

      if (currency === 'XTR') {
        // Telegram Stars — нативная оплата
        L.push(`${ind}# Оплата Telegram Stars`);
        L.push(`${ind}await bot.send_invoice(`);
        L.push(`${ind}${I}chat_id=chat_id,`);
        L.push(`${ind}${I}title="${title}",`);
        L.push(`${ind}${I}description="${desc}",`);
        L.push(`${ind}${I}payload="pay_${node.id}",`);
        L.push(`${ind}${I}currency="XTR",`);
        L.push(`${ind}${I}prices=[LabeledPrice(label="${title}", amount=${amount})],`);
        L.push(`${ind})`);
        L.push(`${ind}user_state[uid] = "pay_${node.id}"  # Ожидание оплаты`);
      } else {
        // Fiat — через provider token
        L.push(`${ind}# Оплата через платёжного провайдера`);
        L.push(`${ind}await bot.send_invoice(`);
        L.push(`${ind}${I}chat_id=chat_id,`);
        L.push(`${ind}${I}title="${title}",`);
        L.push(`${ind}${I}description="${desc}",`);
        L.push(`${ind}${I}payload="pay_${node.id}",`);
        L.push(`${ind}${I}provider_token="${esc(d.provider_token || 'YOUR_PROVIDER_TOKEN')}",`);
        L.push(`${ind}${I}currency="${currency}",`);
        L.push(`${ind}${I}prices=[LabeledPrice(label="${title}", amount=${amount * 100})],`);
        L.push(`${ind})`);
        L.push(`${ind}user_state[uid] = "pay_${node.id}"  # Ожидание оплаты`);
      }

      // Register payment node for pre_checkout + success handlers
      inputSteps.push({ variable: `_pay_${node.id}`, nextId, nodeId: node.id });
      return;
    }

    // --- Knowledge (RAG) ---
    if (type === 'knowledge') {
      L.push(`${ind}# База знаний (RAG) — используйте OpenRouter + векторный поиск`);
      L.push(`${ind}try:`);
      L.push(`${ind}${I}async with httpx.AsyncClient(timeout=60) as _cl:`);
      L.push(`${ind}${I}${I}_r = await _cl.post("https://openrouter.ai/api/v1/chat/completions",`);
      L.push(`${ind}${I}${I}${I}headers={"Authorization": "Bearer YOUR_OPENROUTER_KEY"},`);
      L.push(`${ind}${I}${I}${I}json={"model": "${esc(d.model || 'openai/gpt-4o-mini')}",`);
      L.push(`${ind}${I}${I}${I}${I}"messages": [{"role": "system", "content": "${esc(d.system_prompt || 'Отвечай по контексту.')}"},`);
      L.push(`${ind}${I}${I}${I}${I}{"role": "user", "content": text}],`);
      L.push(`${ind}${I}${I}${I}${I}"max_tokens": ${d.max_tokens || 1000}})`);
      L.push(`${ind}${I}${I}_ans = _r.json()["choices"][0]["message"]["content"]`);
      L.push(`${ind}${I}await bot.send_message(chat_id, _ans)`);
      L.push(`${ind}except Exception as e:`);
      L.push(`${ind}${I}await bot.send_message(chat_id, f"Ошибка: {e}")`);
      if (d.conversational) {
        L.push(`${ind}user_state[uid] = "${node.id}"`);
      }
      return;
    }

    // --- Fallback ---
    L.push(`${ind}pass  # ${type}: ${esc(d.label || '')}`);
  }
}
