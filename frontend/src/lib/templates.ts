import type { Node, Edge } from '@xyflow/react';

export interface BotTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
  nodes: Node[];
  edges: Edge[];
}

export const BOT_TEMPLATES: BotTemplate[] = [
  // ==========================================
  //  ПРОСТЫЕ
  // ==========================================

  {
    id: 'welcome_menu',
    name: 'Бот-визитка',
    description: 'Меню с кнопками: О нас, Услуги, Контакты + форма заявки. Классика для любого бизнеса.',
    icon: '👋',
    tags: ['меню', 'визитка', 'старт'],
    complexity: 'simple',
    nodes: [
      {
        id: 'n1', type: 'message', position: { x: 250, y: 50 },
        data: {
          label: 'Главное меню',
          text: 'Привет! 👋 Добро пожаловать.\n\nВыберите, что вас интересует:',
          parse_mode: 'HTML',
          triggers: ['command:/start'],
          buttons: [
            { text: '🏢 О нас', output_handle: 'btn_about' },
            { text: '⚡ Услуги', output_handle: 'btn_services' },
            { text: '📞 Контакты', output_handle: 'btn_contacts' },
          ],
          button_layout: 'vertical',
        },
      },
      {
        id: 'n2', type: 'message', position: { x: -30, y: 300 },
        data: {
          label: 'О нас',
          text: '🏢 <b>О нашей компании</b>\n\nМы — команда профессионалов. Работаем с 2020 года.\n\nЗдесь напишите о себе.',
          parse_mode: 'HTML',
          buttons: [{ text: '← Меню', output_handle: 'btn_back' }],
        },
      },
      {
        id: 'n3', type: 'message', position: { x: 250, y: 300 },
        data: {
          label: 'Услуги',
          text: '⚡ <b>Наши услуги</b>\n\n• Услуга 1 — от 1 000₽\n• Услуга 2 — от 2 000₽\n• Услуга 3 — от 3 000₽',
          parse_mode: 'HTML',
          buttons: [
            { text: '📝 Оставить заявку', output_handle: 'btn_order' },
            { text: '← Меню', output_handle: 'btn_back' },
          ],
          button_layout: 'vertical',
        },
      },
      {
        id: 'n4', type: 'message', position: { x: 530, y: 300 },
        data: {
          label: 'Контакты',
          text: '📞 <b>Контакты</b>\n\nТелефон: +7 (999) 123-45-67\nEmail: hello@company.ru\nАдрес: г. Москва, ул. Примерная, 1',
          parse_mode: 'HTML',
          buttons: [{ text: '← Меню', output_handle: 'btn_back' }],
        },
      },
      {
        id: 'n5', type: 'message', position: { x: 250, y: 560 },
        data: {
          label: 'Заявка: имя',
          text: 'Как вас зовут?',
          input: { variable: 'name', validation: null },
        },
      },
      {
        id: 'n6', type: 'message', position: { x: 250, y: 720 },
        data: {
          label: 'Заявка: телефон',
          text: '{name}, введите ваш номер телефона:',
          input: { variable: 'phone', validation: 'phone' },
        },
      },
      {
        id: 'n7', type: 'notify', position: { x: 250, y: 890 },
        data: { label: 'Админу', chat_id: '', text: '📥 <b>Заявка!</b>\n\nИмя: {name}\nТел: {phone}', parse_mode: 'HTML' },
      },
      {
        id: 'n8', type: 'message', position: { x: 250, y: 1050 },
        data: {
          label: 'Спасибо',
          text: '✅ Спасибо, {name}! Мы перезвоним вам в ближайшее время.',
          buttons: [{ text: '← В меню', output_handle: 'btn_back' }],
        },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_about' },
      { id: 'e1-3', source: 'n1', target: 'n3', sourceHandle: 'btn_services' },
      { id: 'e1-4', source: 'n1', target: 'n4', sourceHandle: 'btn_contacts' },
      { id: 'e2-1', source: 'n2', target: 'n1', sourceHandle: 'btn_back' },
      { id: 'e3-5', source: 'n3', target: 'n5', sourceHandle: 'btn_order' },
      { id: 'e3-1', source: 'n3', target: 'n1', sourceHandle: 'btn_back' },
      { id: 'e4-1', source: 'n4', target: 'n1', sourceHandle: 'btn_back' },
      { id: 'e5-6', source: 'n5', target: 'n6' },
      { id: 'e6-7', source: 'n6', target: 'n7' },
      { id: 'e7-8', source: 'n7', target: 'n8' },
      { id: 'e8-1', source: 'n8', target: 'n1', sourceHandle: 'btn_back' },
    ],
  },

  {
    id: 'lead_capture',
    name: 'Сбор заявок',
    description: 'Пошагово спрашивает имя, телефон и email. Отправляет заявку админу.',
    icon: '📋',
    tags: ['заявки', 'лиды', 'формы'],
    complexity: 'simple',
    nodes: [
      {
        id: 'n1', type: 'message', position: { x: 250, y: 50 },
        data: { label: 'Приветствие', text: 'Здравствуйте! 👋\n\nОставьте заявку — мы перезвоним вам в течение 15 минут.', triggers: ['command:/start'] },
      },
      {
        id: 'n2', type: 'message', position: { x: 250, y: 220 },
        data: { label: 'Имя', text: 'Как вас зовут?', input: { variable: 'name', validation: null } },
      },
      {
        id: 'n3', type: 'message', position: { x: 250, y: 390 },
        data: { label: 'Телефон', text: 'Отлично, {name}! Введите ваш номер телефона:', input: { variable: 'phone', validation: 'phone' } },
      },
      {
        id: 'n4', type: 'message', position: { x: 250, y: 560 },
        data: { label: 'Email', text: 'И последнее — ваш email:', input: { variable: 'email', validation: 'email' } },
      },
      {
        id: 'n5', type: 'notify', position: { x: 250, y: 730 },
        data: { label: 'Уведомление', chat_id: '', text: '📥 <b>Новая заявка!</b>\n\nИмя: {name}\nТелефон: {phone}\nEmail: {email}', parse_mode: 'HTML' },
      },
      {
        id: 'n6', type: 'message', position: { x: 250, y: 900 },
        data: { label: 'Спасибо', text: 'Спасибо, {name}! ✅\n\nВаша заявка принята. Мы свяжемся с вами по номеру {phone} в ближайшее время.' },
      },
      {
        id: 'note1', type: 'note', position: { x: 530, y: 730 },
        data: { label: 'Подсказка', text: 'Впишите свой Telegram ID в поле "Chat ID" блока Уведомление.\n\nУзнать ID: напишите /start боту @userinfobot', color: 'yellow' },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2' },
      { id: 'e2-3', source: 'n2', target: 'n3' },
      { id: 'e3-4', source: 'n3', target: 'n4' },
      { id: 'e4-5', source: 'n4', target: 'n5' },
      { id: 'e5-6', source: 'n5', target: 'n6' },
    ],
  },

  {
    id: 'gpt_assistant',
    name: 'GPT-помощник',
    description: 'AI-бот с меню: свободный диалог с GPT или FAQ по кнопкам.',
    icon: '🤖',
    tags: ['gpt', 'ai', 'чат'],
    complexity: 'simple',
    nodes: [
      {
        id: 'n1', type: 'message', position: { x: 250, y: 50 },
        data: {
          label: 'Приветствие', triggers: ['command:/start'],
          text: '🤖 Привет! Я AI-помощник.\n\nЧто вас интересует?',
          buttons: [
            { text: '💬 Задать вопрос', output_handle: 'btn_chat' },
            { text: '📖 Частые вопросы', output_handle: 'btn_faq' },
          ],
        },
      },
      {
        id: 'n2', type: 'gpt', position: { x: 50, y: 300 },
        data: {
          label: 'GPT-диалог',
          system_prompt: 'Ты — дружелюбный помощник компании. Отвечай кратко, на русском. Если не знаешь — предложи связаться с менеджером.',
          model: 'gpt-4o-mini', api_key: '', max_tokens: 1000, conversational: true,
        },
      },
      {
        id: 'n3', type: 'message', position: { x: 450, y: 300 },
        data: {
          label: 'FAQ',
          text: '📖 <b>Частые вопросы:</b>',
          parse_mode: 'HTML',
          buttons: [
            { text: '💰 Цены', output_handle: 'btn_prices' },
            { text: '🚚 Доставка', output_handle: 'btn_delivery' },
            { text: '↩️ Возврат', output_handle: 'btn_return' },
            { text: '← Назад', output_handle: 'btn_back' },
          ],
          button_layout: 'vertical',
        },
      },
      {
        id: 'n4', type: 'message', position: { x: 330, y: 560 },
        data: { label: 'Цены', text: '💰 <b>Цены</b>\n\nБазовый — 990₽/мес\nПро — 2 490₽/мес\nБизнес — 4 990₽/мес', parse_mode: 'HTML', buttons: [{ text: '← FAQ', output_handle: 'btn_back' }] },
      },
      {
        id: 'n5', type: 'message', position: { x: 570, y: 560 },
        data: { label: 'Доставка', text: '🚚 <b>Доставка</b>\n\nПо Москве — 1-2 дня\nПо России — 3-7 дней\nСамовывоз — бесплатно', parse_mode: 'HTML', buttons: [{ text: '← FAQ', output_handle: 'btn_back' }] },
      },
      {
        id: 'n6', type: 'message', position: { x: 450, y: 780 },
        data: { label: 'Возврат', text: '↩️ <b>Возврат</b>\n\nВ течение 14 дней без объяснения причин.\nНапишите на support@company.ru', parse_mode: 'HTML', buttons: [{ text: '← FAQ', output_handle: 'btn_back' }] },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_chat' },
      { id: 'e1-3', source: 'n1', target: 'n3', sourceHandle: 'btn_faq' },
      { id: 'e3-4', source: 'n3', target: 'n4', sourceHandle: 'btn_prices' },
      { id: 'e3-5', source: 'n3', target: 'n5', sourceHandle: 'btn_delivery' },
      { id: 'e3-6', source: 'n3', target: 'n6', sourceHandle: 'btn_return' },
      { id: 'e3-1', source: 'n3', target: 'n1', sourceHandle: 'btn_back' },
      { id: 'e4-3', source: 'n4', target: 'n3', sourceHandle: 'btn_back' },
      { id: 'e5-3', source: 'n5', target: 'n3', sourceHandle: 'btn_back' },
      { id: 'e6-3', source: 'n6', target: 'n3', sourceHandle: 'btn_back' },
    ],
  },

  {
    id: 'sub_check',
    name: 'Проверка подписки',
    description: 'Проверяет подписку на канал. Если нет — просит подписаться.',
    icon: '🔐',
    tags: ['подписка', 'канал', 'доступ'],
    complexity: 'simple',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 50 }, data: { label: 'Старт', text: 'Добро пожаловать! 👋\nПроверяем доступ...', triggers: ['command:/start'] } },
      { id: 'n2', type: 'check_sub', position: { x: 250, y: 230 }, data: { label: 'Проверка', channel_id: '@your_channel', fail_text: '' } },
      { id: 'n3', type: 'message', position: { x: 30, y: 440 }, data: { label: 'Доступ открыт', text: '✅ <b>Доступ открыт!</b>\n\nВот ваш эксклюзивный контент:\n\n📎 Ссылка: ...\n📎 Материалы: ...', parse_mode: 'HTML' } },
      { id: 'n4', type: 'message', position: { x: 470, y: 440 }, data: { label: 'Нет подписки', text: '🔒 Для доступа подпишитесь на канал:\n\n👉 @your_channel\n\nПосле подписки нажмите кнопку.', buttons: [{ text: '✅ Я подписался', output_handle: 'btn_check' }] } },
      { id: 'note1', type: 'note', position: { x: 540, y: 230 }, data: { label: 'Подсказка', text: 'Замените @your_channel на свой канал.\nБот должен быть администратором канала!', color: 'yellow' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2' },
      { id: 'e2-3', source: 'n2', target: 'n3', sourceHandle: 'subscribed' },
      { id: 'e2-4', source: 'n2', target: 'n4', sourceHandle: 'not_subscribed' },
      { id: 'e4-2', source: 'n4', target: 'n2', sourceHandle: 'btn_check' },
    ],
  },

  // ==========================================
  //  СРЕДНИЕ
  // ==========================================

  {
    id: 'shop_payment',
    name: 'Магазин с оплатой',
    description: 'Каталог товаров → описание → оплата через Telegram Stars → подтверждение.',
    icon: '🛒',
    tags: ['оплата', 'магазин', 'товары'],
    complexity: 'medium',
    nodes: [
      {
        id: 'n1', type: 'message', position: { x: 250, y: 50 },
        data: {
          label: 'Каталог', triggers: ['command:/start'], parse_mode: 'HTML',
          text: '🛒 <b>Наш магазин</b>\n\nВыберите товар:',
          buttons: [
            { text: '📦 Товар 1 — 100 ⭐', output_handle: 'btn_1' },
            { text: '📦 Товар 2 — 200 ⭐', output_handle: 'btn_2' },
          ],
          button_layout: 'vertical',
        },
      },
      {
        id: 'n2', type: 'message', position: { x: 30, y: 290 },
        data: {
          label: 'Товар 1', parse_mode: 'HTML',
          text: '📦 <b>Товар 1</b>\n\nПодробное описание товара.\n\nЦена: 100 ⭐',
          buttons: [ { text: '💳 Оплатить', output_handle: 'btn_pay' }, { text: '← Каталог', output_handle: 'btn_back' } ],
        },
      },
      {
        id: 'n3', type: 'message', position: { x: 470, y: 290 },
        data: {
          label: 'Товар 2', parse_mode: 'HTML',
          text: '📦 <b>Товар 2</b>\n\nПодробное описание товара.\n\nЦена: 200 ⭐',
          buttons: [ { text: '💳 Оплатить', output_handle: 'btn_pay' }, { text: '← Каталог', output_handle: 'btn_back' } ],
        },
      },
      { id: 'n4', type: 'payment', position: { x: 30, y: 540 }, data: { label: 'Оплата 1', title: 'Товар 1', description: 'Описание товара 1', amount: 100, currency: 'XTR' } },
      { id: 'n5', type: 'payment', position: { x: 470, y: 540 }, data: { label: 'Оплата 2', title: 'Товар 2', description: 'Описание товара 2', amount: 200, currency: 'XTR' } },
      {
        id: 'n6', type: 'notify', position: { x: 250, y: 730 },
        data: { label: 'Уведомление', chat_id: '', text: '💰 <b>Новая покупка!</b>\n\nТовар оплачен.', parse_mode: 'HTML' },
      },
      {
        id: 'n7', type: 'message', position: { x: 250, y: 900 },
        data: { label: 'Успех', text: '✅ <b>Спасибо за покупку!</b>\n\nВаш заказ оформлен.', parse_mode: 'HTML', buttons: [{ text: '🛒 Ещё покупки', output_handle: 'btn_back' }] },
      },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_1' },
      { id: 'e1-3', source: 'n1', target: 'n3', sourceHandle: 'btn_2' },
      { id: 'e2-4', source: 'n2', target: 'n4', sourceHandle: 'btn_pay' },
      { id: 'e2-1', source: 'n2', target: 'n1', sourceHandle: 'btn_back' },
      { id: 'e3-5', source: 'n3', target: 'n5', sourceHandle: 'btn_pay' },
      { id: 'e3-1', source: 'n3', target: 'n1', sourceHandle: 'btn_back' },
      { id: 'e4-6', source: 'n4', target: 'n6', sourceHandle: 'payment_success' },
      { id: 'e5-6', source: 'n5', target: 'n6', sourceHandle: 'payment_success' },
      { id: 'e6-7', source: 'n6', target: 'n7' },
      { id: 'e7-1', source: 'n7', target: 'n1', sourceHandle: 'btn_back' },
    ],
  },

  {
    id: 'quiz',
    name: 'Квиз-воронка',
    description: 'Опрос из 3 вопросов → сбор email → уведомление админу. Квалификация лидов.',
    icon: '❓',
    tags: ['квиз', 'опрос', 'воронка'],
    complexity: 'medium',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 50 }, data: { label: 'Старт квиза', triggers: ['command:/start'], parse_mode: 'HTML', text: '🎯 <b>Подберём решение за 1 минуту!</b>\n\nОтветьте на 3 вопроса.', buttons: [{ text: '🚀 Начать', output_handle: 'btn_go' }] } },
      { id: 'n2', type: 'message', position: { x: 250, y: 260 }, data: { label: 'Вопрос 1', parse_mode: 'HTML', text: '<b>1/3</b> Что вас интересует?', buttons: [ { text: 'Вариант A', output_handle: 'btn_a' }, { text: 'Вариант B', output_handle: 'btn_b' }, { text: 'Вариант C', output_handle: 'btn_c' } ], button_answer_variable: 'q1' } },
      { id: 'n3', type: 'message', position: { x: 250, y: 470 }, data: { label: 'Вопрос 2', parse_mode: 'HTML', text: '<b>2/3</b> Какой бюджет?', buttons: [ { text: 'До 10 000₽', output_handle: 'btn_a' }, { text: '10–50 000₽', output_handle: 'btn_b' }, { text: 'Более 50 000₽', output_handle: 'btn_c' } ], button_answer_variable: 'q2' } },
      { id: 'n4', type: 'message', position: { x: 250, y: 680 }, data: { label: 'Вопрос 3', parse_mode: 'HTML', text: '<b>3/3</b> Когда начать?', buttons: [ { text: 'Сейчас', output_handle: 'btn_a' }, { text: 'На неделе', output_handle: 'btn_b' }, { text: 'Думаю', output_handle: 'btn_c' } ], button_answer_variable: 'q3' } },
      { id: 'n5', type: 'message', position: { x: 250, y: 890 }, data: { label: 'Email', text: '📧 Куда прислать результат?', input: { variable: 'email', validation: 'email' } } },
      { id: 'n6', type: 'notify', position: { x: 250, y: 1060 }, data: { label: 'Админу', chat_id: '', text: '📊 <b>Квиз!</b>\n\n1: {q1}\n2: {q2}\n3: {q3}\nEmail: {email}', parse_mode: 'HTML' } },
      { id: 'n7', type: 'message', position: { x: 250, y: 1230 }, data: { label: 'Результат', text: '✅ Спасибо! Отправим предложение на {email} в течение часа.', parse_mode: 'HTML' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_go' },
      { id: 'e2a', source: 'n2', target: 'n3', sourceHandle: 'btn_a' }, { id: 'e2b', source: 'n2', target: 'n3', sourceHandle: 'btn_b' }, { id: 'e2c', source: 'n2', target: 'n3', sourceHandle: 'btn_c' },
      { id: 'e3a', source: 'n3', target: 'n4', sourceHandle: 'btn_a' }, { id: 'e3b', source: 'n3', target: 'n4', sourceHandle: 'btn_b' }, { id: 'e3c', source: 'n3', target: 'n4', sourceHandle: 'btn_c' },
      { id: 'e4a', source: 'n4', target: 'n5', sourceHandle: 'btn_a' }, { id: 'e4b', source: 'n4', target: 'n5', sourceHandle: 'btn_b' }, { id: 'e4c', source: 'n4', target: 'n5', sourceHandle: 'btn_c' },
      { id: 'e5-6', source: 'n5', target: 'n6' },
      { id: 'e6-7', source: 'n6', target: 'n7' },
    ],
  },

  {
    id: 'appointment',
    name: 'Запись на приём',
    description: 'Выбор услуги → дата → контакты → уведомление админу → подтверждение.',
    icon: '📅',
    tags: ['запись', 'приём', 'услуги'],
    complexity: 'medium',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 50 }, data: { label: 'Услуги', triggers: ['command:/start'], parse_mode: 'HTML', text: '📅 <b>Онлайн-запись</b>\n\nВыберите услугу:', buttons: [ { text: '💇 Стрижка', output_handle: 'btn_1' }, { text: '💆 Массаж', output_handle: 'btn_2' }, { text: '💅 Маникюр', output_handle: 'btn_3' } ], button_layout: 'vertical', button_answer_variable: 'service' } },
      { id: 'n2', type: 'message', position: { x: 250, y: 310 }, data: { label: 'Дата', parse_mode: 'HTML', text: 'Вы выбрали: <b>{service}</b>\n\nНапишите дату и время (напр. 15 апреля, 14:00)', input: { variable: 'date', validation: null } } },
      { id: 'n3', type: 'message', position: { x: 250, y: 500 }, data: { label: 'Имя', text: 'Как вас зовут?', input: { variable: 'name', validation: null } } },
      { id: 'n4', type: 'message', position: { x: 250, y: 670 }, data: { label: 'Телефон', text: '{name}, ваш телефон для подтверждения:', input: { variable: 'phone', validation: 'phone' } } },
      { id: 'n5', type: 'notify', position: { x: 250, y: 840 }, data: { label: 'Админу', chat_id: '', text: '📅 <b>Запись!</b>\n\n{service}\n📅 {date}\n👤 {name}\n📞 {phone}', parse_mode: 'HTML' } },
      { id: 'n6', type: 'message', position: { x: 250, y: 1010 }, data: { label: 'Готово', parse_mode: 'HTML', text: '✅ <b>Вы записаны!</b>\n\n📋 {service}\n📅 {date}\n👤 {name}\n📞 {phone}\n\nДля переноса — /start' } },
    ],
    edges: [
      { id: 'e1a', source: 'n1', target: 'n2', sourceHandle: 'btn_1' }, { id: 'e1b', source: 'n1', target: 'n2', sourceHandle: 'btn_2' }, { id: 'e1c', source: 'n1', target: 'n2', sourceHandle: 'btn_3' },
      { id: 'e2-3', source: 'n2', target: 'n3' }, { id: 'e3-4', source: 'n3', target: 'n4' }, { id: 'e4-5', source: 'n4', target: 'n5' }, { id: 'e5-6', source: 'n5', target: 'n6' },
    ],
  },

  {
    id: 'ab_test',
    name: 'A/B тест',
    description: 'Случайно показывает разные офферы → сбор заказов. Для тестирования текстов.',
    icon: '🎲',
    tags: ['тест', 'рандом', 'маркетинг'],
    complexity: 'medium',
    nodes: [
      { id: 'n1', type: 'message', position: { x: 250, y: 50 }, data: { label: 'Старт', text: 'Привет! У нас для вас предложение 🎁', triggers: ['command:/start'] } },
      { id: 'n2', type: 'random', position: { x: 250, y: 230 }, data: { label: 'A/B тест', branches: [ { label: 'Скидка', weight: 50, output_handle: 'branch_a' }, { label: 'Доставка', weight: 50, output_handle: 'branch_b' } ] } },
      { id: 'n3', type: 'message', position: { x: 30, y: 430 }, data: { label: 'Скидка 30%', parse_mode: 'HTML', text: '🔥 <b>Скидка 30% на всё!</b>\n\nТолько до конца недели.', buttons: [{ text: '🛒 Заказать', output_handle: 'btn_order' }] } },
      { id: 'n4', type: 'message', position: { x: 470, y: 430 }, data: { label: 'Бесплатная доставка', parse_mode: 'HTML', text: '🎁 <b>Бесплатная доставка!</b>\n\nПри заказе от 1000₽.', buttons: [{ text: '🛒 Заказать', output_handle: 'btn_order' }] } },
      { id: 'n5', type: 'message', position: { x: 250, y: 650 }, data: { label: 'Телефон', text: 'Для оформления введите телефон:', input: { variable: 'phone', validation: 'phone' } } },
      { id: 'n6', type: 'notify', position: { x: 250, y: 820 }, data: { label: 'Админу', chat_id: '', text: '🛒 Заказ!\nТел: {phone}', parse_mode: 'HTML' } },
      { id: 'n7', type: 'message', position: { x: 250, y: 990 }, data: { label: 'Спасибо', text: '✅ Заявка принята! Перезвоним.' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2' },
      { id: 'e2a', source: 'n2', target: 'n3', sourceHandle: 'branch_a' }, { id: 'e2b', source: 'n2', target: 'n4', sourceHandle: 'branch_b' },
      { id: 'e3-5', source: 'n3', target: 'n5', sourceHandle: 'btn_order' }, { id: 'e4-5', source: 'n4', target: 'n5', sourceHandle: 'btn_order' },
      { id: 'e5-6', source: 'n5', target: 'n6' }, { id: 'e6-7', source: 'n6', target: 'n7' },
    ],
  },

  // ==========================================
  //  СЛОЖНЫЕ — полноценные боты
  // ==========================================

  {
    id: 'online_school',
    name: 'Онлайн-школа',
    description: 'Полноценный бот: проверка подписки → каталог курсов → оплата → выдача материалов → GPT-поддержка. 15 блоков.',
    icon: '🎓',
    tags: ['школа', 'курсы', 'оплата', 'подписка'],
    complexity: 'complex',
    nodes: [
      // Старт + проверка подписки
      { id: 'n1', type: 'message', position: { x: 300, y: 0 }, data: { label: 'Старт', triggers: ['command:/start'], text: '🎓 <b>Добро пожаловать в Академию!</b>\n\nПроверяем доступ...', parse_mode: 'HTML' } },
      { id: 'n2', type: 'check_sub', position: { x: 300, y: 180 }, data: { label: 'Проверка канала', channel_id: '@your_channel', fail_text: '' } },
      { id: 'n3', type: 'message', position: { x: 580, y: 380 }, data: { label: 'Подпишитесь', text: '🔒 Для доступа подпишитесь на канал:\n\n👉 @your_channel', buttons: [{ text: '✅ Подписался', output_handle: 'btn_retry' }] } },

      // Главное меню
      { id: 'n4', type: 'message', position: { x: 300, y: 380 }, data: { label: 'Меню', parse_mode: 'HTML', text: '📚 <b>Главное меню</b>\n\nВыберите раздел:', buttons: [ { text: '📖 Курсы', output_handle: 'btn_courses' }, { text: '🎁 Бесплатный урок', output_handle: 'btn_free' }, { text: '🤖 Задать вопрос AI', output_handle: 'btn_ai' }, { text: '👤 Мой профиль', output_handle: 'btn_profile' } ], button_layout: 'vertical' } },

      // Каталог курсов
      { id: 'n5', type: 'message', position: { x: 0, y: 650 }, data: { label: 'Курсы', parse_mode: 'HTML', text: '📖 <b>Наши курсы:</b>\n\n🔹 <b>Базовый</b> — основы за 7 дней (50 ⭐)\n🔹 <b>Продвинутый</b> — углублённое изучение (150 ⭐)', buttons: [ { text: '🔹 Базовый — 50 ⭐', output_handle: 'btn_basic' }, { text: '🔹 Продвинутый — 150 ⭐', output_handle: 'btn_pro' }, { text: '← Меню', output_handle: 'btn_menu' } ], button_layout: 'vertical' } },

      // Оплата базового
      { id: 'n6', type: 'payment', position: { x: -100, y: 920 }, data: { label: 'Оплата: Базовый', title: 'Базовый курс', description: 'Основы за 7 дней — 10 уроков', amount: 50, currency: 'XTR' } },
      // Оплата продвинутого
      { id: 'n7', type: 'payment', position: { x: 180, y: 920 }, data: { label: 'Оплата: Про', title: 'Продвинутый курс', description: 'Углублённое изучение — 25 уроков', amount: 150, currency: 'XTR' } },

      // Выдача материалов
      { id: 'n8', type: 'message', position: { x: -100, y: 1130 }, data: { label: 'Материалы: Базовый', parse_mode: 'HTML', text: '✅ <b>Оплата принята!</b>\n\n📚 Ваш курс «Базовый»:\n\n📎 Урок 1: ...\n📎 Урок 2: ...\n📎 Урок 3: ...\n\nОстальные уроки пришлём по расписанию.', buttons: [{ text: '← Меню', output_handle: 'btn_menu' }] } },
      { id: 'n9', type: 'message', position: { x: 180, y: 1130 }, data: { label: 'Материалы: Про', parse_mode: 'HTML', text: '✅ <b>Оплата принята!</b>\n\n📚 Ваш курс «Продвинутый»:\n\n📎 Модуль 1: ...\n📎 Модуль 2: ...\n📎 Бонусные материалы: ...\n\nПолный доступ открыт!', buttons: [{ text: '← Меню', output_handle: 'btn_menu' }] } },

      // Бесплатный урок
      { id: 'n10', type: 'message', position: { x: 300, y: 650 }, data: { label: 'Бесплатный урок', parse_mode: 'HTML', text: '🎁 <b>Бесплатный пробный урок</b>\n\nСмотрите видео и решайте, подходит ли вам:\n\n📹 Ссылка на урок: ...\n\nПонравилось? Переходите к полным курсам!', buttons: [ { text: '📖 Купить курс', output_handle: 'btn_buy' }, { text: '← Меню', output_handle: 'btn_menu' } ] } },

      // AI-помощник
      { id: 'n11', type: 'gpt', position: { x: 600, y: 650 }, data: { label: 'AI-помощник', system_prompt: 'Ты — помощник онлайн-академии. Отвечай на вопросы по курсам, программе обучения и оплате. Отвечай кратко и дружелюбно на русском.', model: 'gpt-4o-mini', api_key: '', max_tokens: 800, conversational: true } },

      // Профиль
      { id: 'n12', type: 'message', position: { x: 600, y: 900 }, data: { label: 'Профиль', parse_mode: 'HTML', text: '👤 <b>Ваш профиль</b>\n\nЧтобы получать уведомления, укажите email:', input: { variable: 'email', validation: 'email' } } },
      { id: 'n13', type: 'message', position: { x: 600, y: 1100 }, data: { label: 'Профиль сохранён', text: '✅ Email {email} сохранён!\n\nБудем отправлять уведомления о новых курсах.', buttons: [{ text: '← Меню', output_handle: 'btn_menu' }] } },

      // Уведомление о покупке
      { id: 'n14', type: 'notify', position: { x: 40, y: 1340 }, data: { label: 'Уведомление о покупке', chat_id: '', text: '💰 <b>Покупка курса!</b>\n\nСтудент оплатил курс.', parse_mode: 'HTML' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2' },
      { id: 'e2-4', source: 'n2', target: 'n4', sourceHandle: 'subscribed' },
      { id: 'e2-3', source: 'n2', target: 'n3', sourceHandle: 'not_subscribed' },
      { id: 'e3-2', source: 'n3', target: 'n2', sourceHandle: 'btn_retry' },
      // Меню → разделы
      { id: 'e4-5', source: 'n4', target: 'n5', sourceHandle: 'btn_courses' },
      { id: 'e4-10', source: 'n4', target: 'n10', sourceHandle: 'btn_free' },
      { id: 'e4-11', source: 'n4', target: 'n11', sourceHandle: 'btn_ai' },
      { id: 'e4-12', source: 'n4', target: 'n12', sourceHandle: 'btn_profile' },
      // Курсы → оплата
      { id: 'e5-6', source: 'n5', target: 'n6', sourceHandle: 'btn_basic' },
      { id: 'e5-7', source: 'n5', target: 'n7', sourceHandle: 'btn_pro' },
      { id: 'e5-4', source: 'n5', target: 'n4', sourceHandle: 'btn_menu' },
      // Оплата → материалы
      { id: 'e6-8', source: 'n6', target: 'n8', sourceHandle: 'payment_success' },
      { id: 'e7-9', source: 'n7', target: 'n9', sourceHandle: 'payment_success' },
      // Материалы → уведомление + меню
      { id: 'e8-14', source: 'n8', target: 'n14' },
      { id: 'e9-14', source: 'n9', target: 'n14' },
      { id: 'e8-4', source: 'n8', target: 'n4', sourceHandle: 'btn_menu' },
      { id: 'e9-4', source: 'n9', target: 'n4', sourceHandle: 'btn_menu' },
      // Бесплатный → курсы
      { id: 'e10-5', source: 'n10', target: 'n5', sourceHandle: 'btn_buy' },
      { id: 'e10-4', source: 'n10', target: 'n4', sourceHandle: 'btn_menu' },
      // Профиль
      { id: 'e12-13', source: 'n12', target: 'n13' },
      { id: 'e13-4', source: 'n13', target: 'n4', sourceHandle: 'btn_menu' },
    ],
  },

  {
    id: 'support_bot',
    name: 'Техподдержка',
    description: 'Полноценная служба поддержки: FAQ по категориям → автоответы → заявка оператору → оценка. 16 блоков.',
    icon: '🛟',
    tags: ['поддержка', 'FAQ', 'тикеты', 'оценка'],
    complexity: 'complex',
    nodes: [
      // Старт
      { id: 'n1', type: 'message', position: { x: 300, y: 0 }, data: { label: 'Старт', triggers: ['command:/start'], parse_mode: 'HTML', text: '🛟 <b>Служба поддержки</b>\n\nЧем можем помочь?', buttons: [ { text: '❓ Частые вопросы', output_handle: 'btn_faq' }, { text: '🆘 Написать оператору', output_handle: 'btn_human' }, { text: '📦 Статус заказа', output_handle: 'btn_order' } ], button_layout: 'vertical' } },

      // FAQ
      { id: 'n2', type: 'message', position: { x: 0, y: 280 }, data: { label: 'FAQ', parse_mode: 'HTML', text: '❓ <b>Выберите тему:</b>', buttons: [ { text: '💳 Оплата и возврат', output_handle: 'btn_pay' }, { text: '🚚 Доставка', output_handle: 'btn_delivery' }, { text: '🔧 Техн. проблемы', output_handle: 'btn_tech' }, { text: '← Назад', output_handle: 'btn_back' } ], button_layout: 'vertical' } },

      // FAQ ответы
      { id: 'n3', type: 'message', position: { x: -250, y: 560 }, data: { label: 'Оплата', parse_mode: 'HTML', text: '💳 <b>Оплата и возврат</b>\n\n• Принимаем карты, СБП, Stars\n• Возврат в течение 14 дней\n• Заявка на возврат: support@co.ru\n\nОстались вопросы?', buttons: [ { text: '🆘 Оператору', output_handle: 'btn_human' }, { text: '← FAQ', output_handle: 'btn_faq' } ] } },
      { id: 'n4', type: 'message', position: { x: 0, y: 560 }, data: { label: 'Доставка', parse_mode: 'HTML', text: '🚚 <b>Доставка</b>\n\n• Москва: 1-2 дня\n• Россия: 3-7 дней\n• Самовывоз: бесплатно\n• Отслеживание: в личном кабинете', buttons: [ { text: '🆘 Оператору', output_handle: 'btn_human' }, { text: '← FAQ', output_handle: 'btn_faq' } ] } },
      { id: 'n5', type: 'message', position: { x: 250, y: 560 }, data: { label: 'Тех. проблемы', parse_mode: 'HTML', text: '🔧 <b>Решение проблем</b>\n\n1. Очистите кэш браузера\n2. Попробуйте другой браузер\n3. Проверьте интернет\n\nНе помогло?', buttons: [ { text: '🆘 Оператору', output_handle: 'btn_human' }, { text: '← FAQ', output_handle: 'btn_faq' } ] } },

      // Статус заказа
      { id: 'n6', type: 'message', position: { x: 580, y: 280 }, data: { label: 'Номер заказа', text: '📦 Введите номер вашего заказа:', input: { variable: 'order_id', validation: null } } },
      { id: 'n7', type: 'webhook', position: { x: 580, y: 470 }, data: { label: 'Запрос статуса', url: 'https://api.example.com/orders/{order_id}', method: 'GET', save_response_to: 'order_status' } },
      { id: 'n8', type: 'message', position: { x: 580, y: 660 }, data: { label: 'Статус заказа', parse_mode: 'HTML', text: '📦 Заказ <b>#{order_id}</b>\n\nСтатус: {order_status}\n\nЕсли нужна помощь:', buttons: [ { text: '🆘 Оператору', output_handle: 'btn_human' }, { text: '← Назад', output_handle: 'btn_back' } ] } },

      // Оператор — сбор данных
      { id: 'n9', type: 'message', position: { x: 300, y: 830 }, data: { label: 'Описание проблемы', text: '🆘 Опишите вашу проблему одним сообщением:', input: { variable: 'problem', validation: null } } },
      { id: 'n10', type: 'message', position: { x: 300, y: 1020 }, data: { label: 'Контакт', text: 'Укажите email или телефон для связи:', input: { variable: 'contact', validation: null } } },
      { id: 'n11', type: 'notify', position: { x: 300, y: 1210 }, data: { label: 'Тикет оператору', chat_id: '', text: '🆘 <b>Новый тикет!</b>\n\nПроблема: {problem}\nКонтакт: {contact}\nЗаказ: {order_id}', parse_mode: 'HTML' } },
      { id: 'n12', type: 'variable', position: { x: 300, y: 1380 }, data: { label: 'Номер тикета', variable: 'ticket', action: 'set', value: 'TK-{order_id}' } },
      { id: 'n13', type: 'message', position: { x: 300, y: 1530 }, data: { label: 'Тикет создан', parse_mode: 'HTML', text: '✅ <b>Заявка принята!</b>\n\nОператор ответит в течение 2 часов.\n\nОцените нашу поддержку:', buttons: [ { text: '⭐⭐⭐⭐⭐ Отлично', output_handle: 'btn_5' }, { text: '⭐⭐⭐ Нормально', output_handle: 'btn_3' }, { text: '⭐ Плохо', output_handle: 'btn_1' } ], button_answer_variable: 'rating' } },

      // Оценка
      { id: 'n14', type: 'notify', position: { x: 300, y: 1770 }, data: { label: 'Оценка', chat_id: '', text: '📊 Оценка поддержки: {rating}\nТикет: {ticket}\nПроблема: {problem}', parse_mode: 'HTML' } },
      { id: 'n15', type: 'message', position: { x: 300, y: 1940 }, data: { label: 'Финал', text: 'Спасибо за обратную связь! 🙏\n\nЕсли понадобится помощь — /start', buttons: [{ text: '← В меню', output_handle: 'btn_back' }] } },

      // Заметки
      { id: 'note1', type: 'note', position: { x: 620, y: 1210 }, data: { label: 'Подсказка', text: 'Впишите Chat ID админа/оператора.\n\nWebhook для статуса заказа — замените URL на ваш API.', color: 'yellow' } },
    ],
    edges: [
      // Меню
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_faq' },
      { id: 'e1-9', source: 'n1', target: 'n9', sourceHandle: 'btn_human' },
      { id: 'e1-6', source: 'n1', target: 'n6', sourceHandle: 'btn_order' },
      // FAQ
      { id: 'e2-3', source: 'n2', target: 'n3', sourceHandle: 'btn_pay' },
      { id: 'e2-4', source: 'n2', target: 'n4', sourceHandle: 'btn_delivery' },
      { id: 'e2-5', source: 'n2', target: 'n5', sourceHandle: 'btn_tech' },
      { id: 'e2-1', source: 'n2', target: 'n1', sourceHandle: 'btn_back' },
      // FAQ → оператор / назад
      { id: 'e3-9', source: 'n3', target: 'n9', sourceHandle: 'btn_human' }, { id: 'e3-2', source: 'n3', target: 'n2', sourceHandle: 'btn_faq' },
      { id: 'e4-9', source: 'n4', target: 'n9', sourceHandle: 'btn_human' }, { id: 'e4-2', source: 'n4', target: 'n2', sourceHandle: 'btn_faq' },
      { id: 'e5-9', source: 'n5', target: 'n9', sourceHandle: 'btn_human' }, { id: 'e5-2', source: 'n5', target: 'n2', sourceHandle: 'btn_faq' },
      // Статус заказа
      { id: 'e6-7', source: 'n6', target: 'n7' },
      { id: 'e7-8', source: 'n7', target: 'n8' },
      { id: 'e8-9', source: 'n8', target: 'n9', sourceHandle: 'btn_human' },
      { id: 'e8-1', source: 'n8', target: 'n1', sourceHandle: 'btn_back' },
      // Оператор flow
      { id: 'e9-10', source: 'n9', target: 'n10' },
      { id: 'e10-11', source: 'n10', target: 'n11' },
      { id: 'e11-12', source: 'n11', target: 'n12' },
      { id: 'e12-13', source: 'n12', target: 'n13' },
      // Оценка
      { id: 'e13a', source: 'n13', target: 'n14', sourceHandle: 'btn_5' },
      { id: 'e13b', source: 'n13', target: 'n14', sourceHandle: 'btn_3' },
      { id: 'e13c', source: 'n13', target: 'n14', sourceHandle: 'btn_1' },
      { id: 'e14-15', source: 'n14', target: 'n15' },
      { id: 'e15-1', source: 'n15', target: 'n1', sourceHandle: 'btn_back' },
    ],
  },

  {
    id: 'sales_funnel',
    name: 'Воронка продаж',
    description: 'Полная воронка: квиз → персональное предложение по условию → скидка по таймеру → оплата → допродажа. 17 блоков.',
    icon: '🚀',
    tags: ['воронка', 'продажи', 'квиз', 'оплата', 'допродажа'],
    complexity: 'complex',
    nodes: [
      // Старт
      { id: 'n1', type: 'message', position: { x: 300, y: 0 }, data: { label: 'Старт', triggers: ['command:/start'], parse_mode: 'HTML', text: '🚀 <b>Найдём идеальное решение за 30 секунд!</b>\n\nОтветьте на пару вопросов — подготовим персональное предложение.', buttons: [{ text: '✨ Начать', output_handle: 'btn_go' }] } },

      // Квиз: ниша
      { id: 'n2', type: 'message', position: { x: 300, y: 230 }, data: { label: 'Ниша', parse_mode: 'HTML', text: '<b>Шаг 1.</b> Ваша сфера?', buttons: [ { text: '🏪 Магазин / e-com', output_handle: 'btn_shop' }, { text: '💼 Услуги / B2B', output_handle: 'btn_b2b' }, { text: '🎓 Обучение', output_handle: 'btn_edu' } ], button_answer_variable: 'niche' } },

      // Квиз: бюджет
      { id: 'n3', type: 'message', position: { x: 300, y: 460 }, data: { label: 'Бюджет', parse_mode: 'HTML', text: '<b>Шаг 2.</b> Бюджет на месяц?', buttons: [ { text: 'До 5 000₽', output_handle: 'btn_low' }, { text: '5–20 000₽', output_handle: 'btn_mid' }, { text: 'Более 20 000₽', output_handle: 'btn_high' } ], button_answer_variable: 'budget' } },

      // Условие: бюджет → разные предложения
      { id: 'n4', type: 'condition', position: { x: 300, y: 680 }, data: { label: 'Бюджет большой?', variable: 'budget', operator: 'equals', value: 'Более 20 000₽' } },

      // Предложение: ПРЕМИУМ (бюджет > 20k)
      { id: 'n5', type: 'message', position: { x: 0, y: 900 }, data: { label: 'Оффер: Премиум', parse_mode: 'HTML', text: '🔥 <b>Персональное предложение</b>\n\nНиша: {niche}\n\nДля вашего бюджета рекомендуем <b>тариф «Премиум»</b>:\n\n✅ Полный функционал\n✅ Персональный менеджер\n✅ Приоритетная поддержка\n\n💰 Цена: <s>9 990₽</s> → <b>6 990₽</b>', buttons: [ { text: '💳 Оплатить 6 990₽', output_handle: 'btn_pay' }, { text: '🤔 Подумаю', output_handle: 'btn_think' } ] } },

      // Предложение: СТАНДАРТ (бюджет ≤ 20k)
      { id: 'n6', type: 'message', position: { x: 600, y: 900 }, data: { label: 'Оффер: Стандарт', parse_mode: 'HTML', text: '✨ <b>Персональное предложение</b>\n\nНиша: {niche}\n\nИдеальный старт — <b>тариф «Стандарт»</b>:\n\n✅ Все основные функции\n✅ Поддержка в чате\n\n💰 Цена: <s>2 990₽</s> → <b>1 990₽</b>', buttons: [ { text: '💳 Оплатить 1 990₽', output_handle: 'btn_pay' }, { text: '🤔 Подумаю', output_handle: 'btn_think' } ] } },

      // "Подумаю" → дожим с таймером
      { id: 'n7', type: 'delay', position: { x: 300, y: 1130 }, data: { label: 'Пауза 5 сек', delay_seconds: 5 } },
      { id: 'n8', type: 'message', position: { x: 300, y: 1300 }, data: { label: 'Дожим', parse_mode: 'HTML', text: '⏰ <b>Подождите!</b>\n\nСпециально для вас — дополнительная скидка <b>20%</b>, но только в течение 10 минут!\n\nНиша: {niche}\nБюджет: {budget}', buttons: [ { text: '🔥 Забрать со скидкой!', output_handle: 'btn_discount' }, { text: '❌ Нет, спасибо', output_handle: 'btn_no' } ] } },

      // Оплата: Премиум
      { id: 'n9', type: 'payment', position: { x: 0, y: 1130 }, data: { label: 'Оплата: Премиум', title: 'Тариф Премиум', description: 'Полный функционал + менеджер', amount: 6990, currency: 'XTR' } },
      // Оплата: Стандарт
      { id: 'n10', type: 'payment', position: { x: 600, y: 1130 }, data: { label: 'Оплата: Стандарт', title: 'Тариф Стандарт', description: 'Все основные функции', amount: 1990, currency: 'XTR' } },

      // После оплаты → допродажа
      { id: 'n11', type: 'notify', position: { x: 300, y: 1520 }, data: { label: 'Уведомление', chat_id: '', text: '💰 <b>ПРОДАЖА!</b>\n\nНиша: {niche}\nБюджет: {budget}', parse_mode: 'HTML' } },
      { id: 'n12', type: 'message', position: { x: 300, y: 1700 }, data: { label: 'Спасибо + допродажа', parse_mode: 'HTML', text: '✅ <b>Оплата прошла!</b>\n\nДоступ откроется в течение 5 минут.\n\n💡 <b>Хотите удвоить результат?</b>\nДобавьте модуль «Аналитика» всего за 490₽:', buttons: [ { text: '📊 Добавить аналитику — 490₽', output_handle: 'btn_upsell' }, { text: '👍 Мне достаточно', output_handle: 'btn_done' } ] } },

      // Допродажа: оплата
      { id: 'n13', type: 'payment', position: { x: 80, y: 1940 }, data: { label: 'Допродажа', title: 'Модуль Аналитика', description: 'Расширенная аналитика', amount: 490, currency: 'XTR' } },

      // Финал
      { id: 'n14', type: 'message', position: { x: 300, y: 2140 }, data: { label: 'Финал', text: '🎉 Добро пожаловать! Всё настроено.\n\nЕсли нужна помощь — /start' } },

      // Отказ
      { id: 'n15', type: 'message', position: { x: 580, y: 1520 }, data: { label: 'Отказ', text: '👋 Хорошо! Если передумаете — мы всегда здесь.\n\nНапишите /start когда будете готовы.' } },

      // Заметка
      { id: 'note1', type: 'note', position: { x: -200, y: 680 }, data: { label: 'Логика', text: 'Условие проверяет бюджет:\n• Более 20 000₽ → Премиум\n• Остальные → Стандарт\n\n"Подумаю" → задержка 5 сек → дожим со скидкой', color: 'blue' } },
    ],
    edges: [
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_go' },
      // Квиз: все ответы → следующий вопрос
      { id: 'e2a', source: 'n2', target: 'n3', sourceHandle: 'btn_shop' }, { id: 'e2b', source: 'n2', target: 'n3', sourceHandle: 'btn_b2b' }, { id: 'e2c', source: 'n2', target: 'n3', sourceHandle: 'btn_edu' },
      { id: 'e3a', source: 'n3', target: 'n4', sourceHandle: 'btn_low' }, { id: 'e3b', source: 'n3', target: 'n4', sourceHandle: 'btn_mid' }, { id: 'e3c', source: 'n3', target: 'n4', sourceHandle: 'btn_high' },
      // Условие → офферы
      { id: 'e4-5', source: 'n4', target: 'n5', sourceHandle: 'handle_yes' },
      { id: 'e4-6', source: 'n4', target: 'n6', sourceHandle: 'handle_no' },
      // Офферы → оплата / подумаю
      { id: 'e5-9', source: 'n5', target: 'n9', sourceHandle: 'btn_pay' },
      { id: 'e5-7', source: 'n5', target: 'n7', sourceHandle: 'btn_think' },
      { id: 'e6-10', source: 'n6', target: 'n10', sourceHandle: 'btn_pay' },
      { id: 'e6-7', source: 'n6', target: 'n7', sourceHandle: 'btn_think' },
      // Подумаю → дожим
      { id: 'e7-8', source: 'n7', target: 'n8' },
      { id: 'e8-9', source: 'n8', target: 'n9', sourceHandle: 'btn_discount' },
      { id: 'e8-15', source: 'n8', target: 'n15', sourceHandle: 'btn_no' },
      // Оплата → уведомление
      { id: 'e9-11', source: 'n9', target: 'n11', sourceHandle: 'payment_success' },
      { id: 'e10-11', source: 'n10', target: 'n11', sourceHandle: 'payment_success' },
      // Уведомление → допродажа
      { id: 'e11-12', source: 'n11', target: 'n12' },
      // Допродажа
      { id: 'e12-13', source: 'n12', target: 'n13', sourceHandle: 'btn_upsell' },
      { id: 'e12-14', source: 'n12', target: 'n14', sourceHandle: 'btn_done' },
      { id: 'e13-14', source: 'n13', target: 'n14', sourceHandle: 'payment_success' },
    ],
  },

  // ==========================================
  //  Бот-консультант (RAG)
  // ==========================================

  {
    id: 'company_consultant',
    name: 'Бот-консультант компании',
    description: 'Клиент задаёт вопрос → бот ищет ответ в базе знаний компании (RAG). Меню: консультация, FAQ, связь с менеджером. Загрузите файлы компании — бот ответит по ним.',
    icon: '🧠',
    tags: ['консультант', 'RAG', 'база знаний', 'поддержка'],
    complexity: 'complex',
    nodes: [
      // Старт + меню
      {
        id: 'n1', type: 'message', position: { x: 300, y: 0 },
        data: {
          label: 'Приветствие', triggers: ['command:/start'], parse_mode: 'HTML',
          text: '👋 <b>Здравствуйте!</b>\n\nЯ — виртуальный консультант компании. Знаю всё о наших продуктах, услугах и условиях работы.\n\nЧем могу помочь?',
          buttons: [
            { text: '💬 Задать вопрос', output_handle: 'btn_ask' },
            { text: '📖 Частые вопросы', output_handle: 'btn_faq' },
            { text: '👤 Связаться с менеджером', output_handle: 'btn_human' },
          ],
          button_layout: 'vertical',
        },
      },

      // База знаний (RAG)
      {
        id: 'n2', type: 'knowledge', position: { x: 0, y: 280 },
        data: {
          label: 'База знаний',
          api_key: '',
          model: 'openai/gpt-4o-mini',
          embedding_model: 'openai/text-embedding-3-small',
          system_prompt: 'Ты — вежливый консультант компании. Отвечай на вопросы клиентов, используя ТОЛЬКО информацию из предоставленного контекста (база знаний компании). Если ответа нет в контексте — скажи: «К сожалению, у меня нет информации по этому вопросу. Хотите связаться с менеджером?». Отвечай кратко, дружелюбно, на русском языке.',
          max_tokens: 1000,
          conversational: true,
          files_count: 0,
        },
      },

      // FAQ
      {
        id: 'n3', type: 'message', position: { x: 350, y: 280 },
        data: {
          label: 'FAQ', parse_mode: 'HTML',
          text: '📖 <b>Частые вопросы:</b>',
          buttons: [
            { text: '💰 Цены и тарифы', output_handle: 'btn_prices' },
            { text: '🚚 Доставка и сроки', output_handle: 'btn_delivery' },
            { text: '↩️ Возврат и гарантия', output_handle: 'btn_return' },
            { text: '📞 Контакты', output_handle: 'btn_contacts' },
            { text: '← Назад', output_handle: 'btn_back' },
          ],
          button_layout: 'vertical',
        },
      },

      // FAQ ответы
      {
        id: 'n4', type: 'message', position: { x: 200, y: 560 },
        data: {
          label: 'Цены', parse_mode: 'HTML',
          text: '💰 <b>Цены и тарифы</b>\n\nЗдесь опишите ваши цены, тарифы, скидки.\n\n• Тариф «Базовый» — от 990₽/мес\n• Тариф «Про» — от 2 490₽/мес\n• Скидка 10% при оплате за год',
          buttons: [{ text: '💬 Уточнить у консультанта', output_handle: 'btn_ask' }, { text: '← FAQ', output_handle: 'btn_faq' }],
        },
      },
      {
        id: 'n5', type: 'message', position: { x: 470, y: 560 },
        data: {
          label: 'Доставка', parse_mode: 'HTML',
          text: '🚚 <b>Доставка и сроки</b>\n\nОпишите условия доставки.\n\n• Москва — 1-2 дня\n• Россия — 3-7 дней\n• Самовывоз — бесплатно',
          buttons: [{ text: '💬 Уточнить у консультанта', output_handle: 'btn_ask' }, { text: '← FAQ', output_handle: 'btn_faq' }],
        },
      },
      {
        id: 'n6', type: 'message', position: { x: 200, y: 810 },
        data: {
          label: 'Возврат', parse_mode: 'HTML',
          text: '↩️ <b>Возврат и гарантия</b>\n\nОпишите условия возврата.\n\n• Возврат в течение 14 дней\n• Гарантия 12 месяцев\n• Заявка: support@company.ru',
          buttons: [{ text: '💬 Уточнить у консультанта', output_handle: 'btn_ask' }, { text: '← FAQ', output_handle: 'btn_faq' }],
        },
      },
      {
        id: 'n7', type: 'message', position: { x: 470, y: 810 },
        data: {
          label: 'Контакты', parse_mode: 'HTML',
          text: '📞 <b>Контакты</b>\n\nТелефон: +7 (999) 123-45-67\nEmail: info@company.ru\nАдрес: г. Москва, ул. Примерная, 1\nРежим работы: Пн-Пт 9:00-18:00',
          buttons: [{ text: '← FAQ', output_handle: 'btn_faq' }],
        },
      },

      // Связь с менеджером
      {
        id: 'n8', type: 'message', position: { x: 650, y: 280 },
        data: {
          label: 'Имя клиента',
          text: '👤 Чтобы связать вас с менеджером, как вас зовут?',
          input: { variable: 'name', validation: null },
        },
      },
      {
        id: 'n9', type: 'message', position: { x: 650, y: 460 },
        data: {
          label: 'Телефон клиента',
          text: '{name}, укажите телефон для связи:',
          input: { variable: 'phone', validation: 'phone' },
        },
      },
      {
        id: 'n10', type: 'message', position: { x: 650, y: 640 },
        data: {
          label: 'Вопрос клиента',
          text: 'Кратко опишите ваш вопрос:',
          input: { variable: 'question', validation: null },
        },
      },
      {
        id: 'n11', type: 'notify', position: { x: 650, y: 820 },
        data: {
          label: 'Заявка менеджеру', chat_id: '', parse_mode: 'HTML',
          text: '📥 <b>Запрос от клиента!</b>\n\n👤 {name}\n📞 {phone}\n💬 {question}',
        },
      },
      {
        id: 'n12', type: 'message', position: { x: 650, y: 1000 },
        data: {
          label: 'Заявка принята',
          text: '✅ Спасибо, {name}! Менеджер свяжется с вами по номеру {phone} в ближайшее время.',
          buttons: [{ text: '← В меню', output_handle: 'btn_back' }],
        },
      },

      // Заметки-подсказки
      {
        id: 'note1', type: 'note', position: { x: -200, y: 280 },
        data: {
          label: 'Как настроить',
          text: '1. Вставьте API Key от openrouter.ai в блок «База знаний»\n2. Загрузите файлы компании: прайс-лист, FAQ, каталог, описание услуг (PDF, DOCX, TXT)\n3. Бот автоматически будет отвечать клиентам по загруженным данным',
          color: 'yellow',
        },
      },
      {
        id: 'note2', type: 'note', position: { x: 880, y: 820 },
        data: {
          label: 'Подсказка',
          text: 'Впишите Chat ID менеджера в блок «Уведомление».\n\nУзнать ID: @userinfobot в Telegram',
          color: 'yellow',
        },
      },
    ],
    edges: [
      // Меню → разделы
      { id: 'e1-2', source: 'n1', target: 'n2', sourceHandle: 'btn_ask' },
      { id: 'e1-3', source: 'n1', target: 'n3', sourceHandle: 'btn_faq' },
      { id: 'e1-8', source: 'n1', target: 'n8', sourceHandle: 'btn_human' },
      // FAQ → ответы
      { id: 'e3-4', source: 'n3', target: 'n4', sourceHandle: 'btn_prices' },
      { id: 'e3-5', source: 'n3', target: 'n5', sourceHandle: 'btn_delivery' },
      { id: 'e3-6', source: 'n3', target: 'n6', sourceHandle: 'btn_return' },
      { id: 'e3-7', source: 'n3', target: 'n7', sourceHandle: 'btn_contacts' },
      { id: 'e3-1', source: 'n3', target: 'n1', sourceHandle: 'btn_back' },
      // FAQ ответы → консультант / назад
      { id: 'e4-2', source: 'n4', target: 'n2', sourceHandle: 'btn_ask' },
      { id: 'e4-3', source: 'n4', target: 'n3', sourceHandle: 'btn_faq' },
      { id: 'e5-2', source: 'n5', target: 'n2', sourceHandle: 'btn_ask' },
      { id: 'e5-3', source: 'n5', target: 'n3', sourceHandle: 'btn_faq' },
      { id: 'e6-2', source: 'n6', target: 'n2', sourceHandle: 'btn_ask' },
      { id: 'e6-3', source: 'n6', target: 'n3', sourceHandle: 'btn_faq' },
      { id: 'e7-3', source: 'n7', target: 'n3', sourceHandle: 'btn_faq' },
      // Менеджер flow
      { id: 'e8-9', source: 'n8', target: 'n9' },
      { id: 'e9-10', source: 'n9', target: 'n10' },
      { id: 'e10-11', source: 'n10', target: 'n11' },
      { id: 'e11-12', source: 'n11', target: 'n12' },
      { id: 'e12-1', source: 'n12', target: 'n1', sourceHandle: 'btn_back' },
    ],
  },
];
