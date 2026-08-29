# Chonchetrip

Персональное mobile-first приключение по Японии для iPhone: главы путешествия, полевые загадки, достижения, travel passport, side quests и локальный дневник воспоминаний.

## Локальный запуск

```bash
npm ci
npm run dev -- --host 0.0.0.0
```

Обычный режим использует текущую дату в часовом поясе `Asia/Tokyo`. Каждая глава открывается в `00:00` по местному японскому времени.

Во время разработки конкретный день можно открыть параметром `preview`:

```text
http://localhost:5173/?preview=2026-10-05
```

В production-сборке `preview` отключён. Тестовый и настоящий прогресс используют разные ключи `localStorage`, поэтому локальные проверки не попадут в рабочее путешествие.

## Проверка

```bash
npm run check
```

Команда запускает линтер, TypeScript и production-сборку Vite.

## Публикация на Cloudflare Pages

Подключи GitHub-репозиторий в **Workers & Pages → Create application → Pages** и укажи:

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Environment variables: не требуются

Версия Node зафиксирована файлом `.node-version` на Node 22. После подключения Cloudflare будет собирать новый deploy из каждого push в production-ветку.

## Данные и сохранения

- Маршрут, загадки, side quests и достижения: `src/tripData.ts`
- Интерфейс и игровая логика: `src/App.tsx`
- Визуальные стили: `src/App.css` и `src/index.css`
- Прогресс и фотографии сохраняются только в `localStorage` Safari на этом устройстве
- При очистке данных Safari или смене телефона локальный прогресс пропадёт
- Fuji можно перенести с 9 на 11 октября в разделе «Паспорт»; маршрут и награда переедут вместе

## Новые бейджи без финальных ассетов

Пока используются встроенные печати-заглушки. Ожидаемые имена будущих PNG-файлов:

- `field-researcher.png`
- `keen-eye.png`
- `kitsus-equal.png`
- `side-quest-accepted.png`
- `manhole-hunter.png`
- `capsule-of-fate.png`
- `fortune-found.png`
- `wandering-legend.png`
