# Sprachschul-Manager — ERP для языковых школ

## Стек
Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Supabase (БД и Auth), next-intl (DE/EN/RU), recharts.

## Правила бизнеса
- Модель: Месячный абонемент. 
- Роли: Admin (владелец) и Teacher (видит только `/my-portal`).
- Отмены: Late-cancellation (поздняя отмена).
- Кабинеты: Запрет на пересечение времени.

## Правила кода (ВАЖНО!)
1. Весь текст только через i18n (`t('key')`), файлы переводов: de.json, en.json, ru.json. Никакого хардкода.
2. Обязательная поддержка темной темы (`dark:bg-slate-900`, `dark:text-white`).
3. Иконки только `lucide-react` (outline, strokeWidth 1.5 или 2).
4. Все таблицы на мобильных должны превращаться в карточки.
