# API Contract

Краткий контракт для фронтенда full-screen timeline map. Все примеры ниже показывают реальные структуры ответа, но значения сокращены для читаемости.

## Общие правила

- Базовый префикс API: `/api`
- Все тексты от backend приходят на русском языке
- `player_id` сейчас задаётся клиентом как строка
- Для неизвестного периода backend обычно возвращает `404`
- Для невалидного request body FastAPI возвращает `422`
- Для логических ошибок сессии или выбора backend возвращает `400`, `403` или `409`

## Endpoint List

### `GET /api/timeline/periods`
Возвращает все доступные исторические периоды.

Пример ответа:

```json
{
  "periods": [
    {
      "code": "khanate_1465",
      "year_label": "1465",
      "title": "Казахское ханство",
      "sort_order": 1,
      "description": "Период становления Казахского ханства и ранней политической истории степи.",
      "created_at": "2026-04-16T10:00:00+00:00"
    }
  ]
}
```

### `GET /api/timeline/cities/{period_code}`
Возвращает список городов, которые backend считает доступными в выбранном периоде.

Пример ответа:

```json
{
  "cities": [
    {
      "city": "Астана",
      "period_code": "independence_1991",
      "display_name": "Акмола",
      "subtitle": "Историческое название города в 1991 году.",
      "is_available": 1
    }
  ]
}
```

### `GET /api/city-content/{period_code}`
Возвращает lightweight-контент по городам выбранного периода. Подходит для списка карточек/панели выбора.

Пример ответа:

```json
{
  "cities": [
    {
      "city": "Тараз",
      "period_code": "khanate_1465",
      "display_name": "Тараз",
      "subtitle": "Древний город на юге и важный узел караванных путей.",
      "short_description": "Тараз уже был известным городом Южного Казахстана и заметным центром торговли.",
      "quiz_available": 1,
      "fact_challenge_available": 1
    }
  ]
}
```

### `GET /api/city-content/{period_code}/{city}`
Возвращает полную запись контента по одному городу и периоду.

Пример ответа:

```json
{
  "content": {
    "city": "Астана",
    "period_code": "modern_2025",
    "display_name": "Астана",
    "subtitle": "Современная столица Казахстана на реке Ишим.",
    "short_description": "Астана — главный политический центр страны.",
    "history_summary": "Сегодня Астана известна как столица с современными административными зданиями.",
    "interesting_fact": "До современного названия город был известен как Акмола и Нур-Султан.",
    "old_name": "Акмола",
    "importance_reason": "Именно здесь работают основные государственные органы Казахстана.",
    "image_keys": [
      "astana-modern_2025-hero",
      "astana-modern_2025-map",
      "astana-modern_2025-landmark"
    ],
    "quiz_available": 1,
    "fact_challenge_available": 1
  }
}
```

### `POST /api/test/start`
Запускает period-aware тест по городу.

Пример запроса:

```json
{
  "player_id": "player-123",
  "city": "Астана",
  "period_code": "modern_2025",
  "question_count": 5
}
```

Пример ответа:

```json
{
  "test_session_id": "b8d0...",
  "city": "Астана",
  "period_code": "modern_2025",
  "questions": [
    {
      "id": 101,
      "question": "Какой город является столицей Казахстана?",
      "options": ["Астана", "Алматы", "Тараз", "Орал"]
    }
  ]
}
```

### `POST /api/test/submit`
Отправляет ответы на тест. Возвращает итог и только новые достижения из этой попытки.

Пример запроса:

```json
{
  "player_id": "player-123",
  "test_session_id": "b8d0...",
  "answers": [
    { "question_id": 101, "selected_index": 0 }
  ]
}
```

Пример ответа:

```json
{
  "city": "Астана",
  "period_code": "modern_2025",
  "total_questions": 5,
  "correct_answers": 5,
  "score_percent": 100,
  "passed": true,
  "unlocked_achievements": [
    {
      "code": "first_pass",
      "name": "Первый успех",
      "description": "Пройден первый тест по городу.",
      "city": null,
      "period_code": null,
      "threshold": null,
      "unlocked_at": "2026-04-16T10:00:00+00:00"
    }
  ],
  "all_player_achievements_count": 4
}
```

### `GET /api/achievements/{player_id}`
Возвращает все уже открытые достижения игрока.

### `GET /api/progress/{player_id}`
Возвращает прогресс по тестам и по городам.

Пример ответа:

```json
{
  "total_tests_completed": 3,
  "total_passed_tests": 2,
  "distinct_cities_passed": 2,
  "city_progress": [
    {
      "city": "Астана",
      "period_code": "modern_2025",
      "passed_count": 1,
      "best_score": 100,
      "total_attempts": 1,
      "last_completed_at": "2026-04-16T10:00:00+00:00"
    }
  ],
  "total_achievements_unlocked": 5
}
```

### `POST /api/fact-challenge/start`
Запускает режим “угадай город по факту”.

Пример запроса:

```json
{
  "player_id": "player-123",
  "period_code": "modern_2025",
  "candidate_count": 4
}
```

Пример ответа:

```json
{
  "session_id": "8b43...",
  "period_code": "modern_2025",
  "fact_text": "Это столица Казахстана на реке Ишим.",
  "candidate_cities": ["Астана", "Орал", "Тараз", "Актау"]
}
```

Важно:

- правильный город не приходит отдельным полем
- фронт должен хранить только `session_id`, `fact_text` и список кандидатов

### `POST /api/fact-challenge/submit`
Отправляет выбранный город для fact challenge session.

Пример запроса:

```json
{
  "player_id": "player-123",
  "session_id": "8b43...",
  "selected_city": "Астана"
}
```

Пример ответа:

```json
{
  "is_correct": true,
  "correct_city": "Астана",
  "period_code": "modern_2025",
  "fact_text": "Это столица Казахстана на реке Ишим.",
  "unlocked_achievements": [
    {
      "code": "fact_first_correct",
      "name": "Меткий выбор",
      "description": "Правильно угадан первый город по факту.",
      "city": null,
      "period_code": null,
      "threshold": 1,
      "unlocked_at": "2026-04-16T10:05:00+00:00"
    }
  ]
}
```

### `GET /api/fact-challenge/progress/{player_id}`
Возвращает общий прогресс игрока в режиме угадывания города по факту.

Пример ответа:

```json
{
  "total_attempts": 3,
  "total_correct": 2,
  "accuracy_percent": 67,
  "per_period_summary": [
    {
      "period_code": "modern_2025",
      "total_attempts": 2,
      "total_correct": 2,
      "accuracy_percent": 100
    }
  ]
}
```

### `GET /api/app/bootstrap/{player_id}`
Главный init-endpoint для full-screen UI. Должен вызываться один раз при загрузке приложения.

Что возвращает:

- список периодов
- `default_period_code`
- краткую сводку игрока
- preview открытых достижений
- lightweight-список городов для дефолтного периода

Пример ответа:

```json
{
  "periods": [
    {
      "code": "modern_2025",
      "year_label": "2025",
      "title": "Современный Казахстан",
      "sort_order": 7,
      "description": "Современный этап развития Казахстана с актуальной административной картой и городами.",
      "created_at": "2026-04-16T10:00:00+00:00"
    }
  ],
  "default_period_code": "modern_2025",
  "player_summary": {
    "total_tests_completed": 1,
    "total_passed_tests": 1,
    "total_achievements_unlocked": 5,
    "fact_challenge_attempts": 1,
    "fact_challenge_correct": 1
  },
  "achievements_preview": [
    {
      "code": "fact_first_correct",
      "name": "Меткий выбор",
      "description": "Правильно угадан первый город по факту.",
      "city": null,
      "period_code": null,
      "threshold": 1,
      "unlocked_at": "2026-04-16T10:05:00+00:00"
    }
  ],
  "available_cities_for_default_period": [
    {
      "city": "Астана",
      "period_code": "modern_2025",
      "display_name": "Астана",
      "subtitle": "Современная столица Казахстана на реке Ишим.",
      "quiz_available": true,
      "fact_challenge_available": true,
      "has_content": true
    }
  ]
}
```

### `GET /api/map-state/{player_id}/{period_code}`
Главный endpoint для отрисовки карты выбранного периода.

Что возвращает:

- summary по периоду
- список всех доступных городов периода
- для каждого города status-флаги и player-specific состояние

Пример ответа:

```json
{
  "period_code": "modern_2025",
  "summary": {
    "period_code": "modern_2025",
    "total_cities": 15,
    "cities_passed": 1,
    "fact_correct_count": 1,
    "completion_percent": 7
  },
  "cities": [
    {
      "city": "Астана",
      "display_name": "Астана",
      "subtitle": "Современная столица Казахстана на реке Ишим.",
      "quiz_available": true,
      "fact_challenge_available": true,
      "has_content": true,
      "passed_quiz_in_this_period": true,
      "best_score_in_this_period": 100,
      "total_attempts_in_this_period": 1,
      "has_fact_success_in_this_period": false,
      "unlocked_city_achievement": true
    }
  ]
}
```

Примечание:

- `completion_percent` сейчас считается по `cities_passed / total_cities`
- `fact_correct_count` показывает число городов периода, по которым у игрока уже есть хотя бы один успешный fact challenge
- если у города нет `city_period_content`, то `has_content = false`, а `quiz_available` и `fact_challenge_available` тоже будут `false`

## Common Error Responses

### `400 Bad Request`
Логическая ошибка запроса.

Пример:

```json
{
  "detail": "selected_city is not part of the candidate_cities list."
}
```

### `403 Forbidden`
Сессия принадлежит другому игроку.

Пример:

```json
{
  "detail": "This fact challenge session belongs to a different player."
}
```

### `404 Not Found`
Период, контент или session не найдены.

Пример:

```json
{
  "detail": "Timeline period 'unknown_period' was not found."
}
```

### `409 Conflict`
Сессия уже завершена и повторно отправлять её нельзя.

Пример:

```json
{
  "detail": "This fact challenge session has already been completed."
}
```

### `422 Unprocessable Entity`
Невалидная схема request body.

Пример:

```json
{
  "detail": [
    {
      "loc": ["body", "period_code"],
      "msg": "Value error, Unsupported period_code.",
      "type": "value_error"
    }
  ]
}
```

## Frontend Notes

- При старте приложения удобно сначала вызывать `/api/app/bootstrap/{player_id}`
- При переключении периода фронт может вызывать `/api/map-state/{player_id}/{period_code}`
- Для панели города удобно:
  - брать список карточек из `/api/city-content/{period_code}`
  - полную карточку города из `/api/city-content/{period_code}/{city}`
- Для quiz flow фронту достаточно хранить `test_session_id` до submit
- Для fact challenge flow фронту достаточно хранить `session_id` до submit
- Старые endpoints остаются рабочими, но новые `bootstrap` и `map-state` уменьшают объём ручной склейки данных на клиенте
