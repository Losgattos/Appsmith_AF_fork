---

description: "Task list template for feature implementation"
---

# Tasks: Даты учётных записей (создание/изменение)

**Input**: Design documents from `specs/002-user-created-updated/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Автотестов в проекте нет. Ручная верификация — сценарии `quickstart.md` (двухконтурная: редактор Appsmith + psql). Тестовые задачи записаны как задачи на прогон сценариев в соответствующих фазах.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Проект — Appsmith CE поверх форка; структура нестандартная, реальные пути:

- Форк: `C:\Users\User\Documents\Gramax\default\Appsmith_AF_fork` (правки ассистента разрешены конституцией III; push — пользователь)
- Страница: `pages/Администрирование/` внутри форка: `queries/<запрос>/<запрос>.txt`, `jsobjects/`, `widgets/`
- Редактор Appsmith: правки виджетов ТОЛЬКО через редактор (после Pull), затем Commit & Push
- БД: PostgreSQL, схема `appsmith`, миграция через psql (карточка «Доступ к PostgreSQL (psql).md»)
- Снапшоты БД: `C:\Users\User\Documents\Gramax\default\Appsmith_DB` (коммит «Снапшот <дата>», push copilot делает сам)
- Grammax 51: `C:\Users\User\Documents\Gramax\default\PROCESS_DOC_GITVERSE\pererabotka-appsmith\dannye-i-bd\struktura-bd\_index.md` (push — только по согласованию)
- Obsidian: `C:\Users\User\Documents\Хранилща Obsidian\Obsidian\Задачи\Appsmith\`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Проверка предпосылок фичи (гейты плана G1–G2)

- [x] T001 Проверить доступ к PostgreSQL через psql (гейт G1): соединение с сервером, схема `appsmith` доступна; если недоступен (было 22.09.2026) — сообщить пользователю и остановиться (карточка `Управление/Доступ к PostgreSQL (psql).md`). **Выполнено 23.09.2026: PostgreSQL 16.15, БД `appsmith_2.0`, схемы доступны.**
- [x] T002 Снять снапшот `Appsmith_DB` «до» (гейт G2): выгрузка набора `00_*`–`08_*` в корень `C:\Users\User\Documents\Gramax\default\Appsmith_DB`, коммит «Снапшот <дата>», `git push` (copilot делает сам — решение 22.09.2026). **Выполнено 23.09.2026: коммит `56b21d3`, запушен в GitVerse.**

**Checkpoint**: Гейты пройдены — можно начинать миграцию БД

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Миграция БД — базис, без которого обе пользовательские истории невозможны. **Блокирует все user stories.**

**CRITICAL**: порядок внутри миграции фиксирован (data-model.md, строка «Порядок критичен»): колонки → бэкфилл → функция → триггер (триггер ПОСЛЕ бэкфилла)

- [x] T003 Подготовить SQL-скрипт миграции по `specs/002-user-created-updated/data-model.md`: ALTER TABLE `appsmith.users` ADD COLUMN `created_at timestamp without time zone NOT NULL DEFAULT now()`, ADD COLUMN `updated_at timestamp without time zone NOT NULL DEFAULT now()`; UPDATE бэкфилл `SET created_at = '2026-01-01 00:00:00', updated_at = '2026-01-01 00:00:00'` (решение 23.09.2026); CREATE OR REPLACE FUNCTION `appsmith.set_updated_at()` (plpgsql: `NEW.updated_at := now(); RETURN NEW;`); CREATE TRIGGER `trg_users_updated_at BEFORE UPDATE ON appsmith.users FOR EACH ROW EXECUTE FUNCTION appsmith.set_updated_at()`; всё в одной транзакции. **Выполнено 23.09.2026: `db-migration.sql` в форке (коммит `fbf7573`).**
- [x] T004 Выполнить миграцию через psql (скрипт из T003). **Выполнено 23.09.2026: применено, БД-режим фичи активен.**
- [x] T005 Контроль результата: `\d appsmith.users` — колонки `created_at`/`updated_at` NOT NULL с DEFAULT, триггер `trg_users_updated_at` на месте; `SELECT login, created_at, updated_at FROM appsmith.users ORDER BY id` — у существующих записей даты `2026-01-01 00:00:00`. **Выполнено 23.09.2026: 3647 записей, бэкфилл 0 NULL / 0 не-бэкфилл; повторно подтверждено в прогоне T014.**

**Checkpoint**: Фундамент готов — можно начинать реализацию user stories

---

## Phase 3: User Story 1 - Дата создания и дата изменения видны администратору (Priority: P1) — MVP

**Goal**: Администратор видит колонки «Создан»/«Изменён» в таблице списка учётных записей; у существующих записей — 01.01.2026, у новых — фактические даты.

**Independent Test**: Сценарии quickstart.md 1, 2, 5: бэкфилл в БД (01.01.2026), создание нового пользователя через форму (даты в таблице и в БД), отображение колонок в `usersTable`.

### Implementation for User Story 1

- [x] T006 [US1] Добавить `u.created_at`, `u.updated_at` в SELECT запроса `pages/Администрирование/queries/get_users/get_users.txt` в форке (в конец списка полей, после `u.is_user_enabled`). **Выполнено 23.09.2026: коммит форка `fbf7573`.**
- [x] T007 [US1] Синхронизация форк → редактор: локальный коммит форка + **push (copilot, всегда и без согласования — решение 23.09.2026)**, в редакторе Appsmith **Pull** → **Commit & Push** (`0948bc0` «Мелкие правки интерфейса», втянут в форк 23.09). **Выполнено 23.09.2026.**
- [x] T008 [US1] В редакторе Appsmith добавить колонки «Создан»/«Изменён» в виджет `usersTable` (страница «Администрирование»), формат — дата и время, читаемый; Commit & Push после правки. **Выполнено 23.09.2026: коммит редактора `0948bc0` — колонки `created_at` (label «Создано») и `updated_at` (label «Изменено»), тип date, формат дата+время; скрытая колонка `password` сохранена (регресс-контроль FR-001); втянут в форк.**

**Checkpoint**: Колонки видны, бэкфилл 01.01.2026 подтверждён — US1 работает независимо

---

## Phase 4: User Story 2 - Дата изменения обновляется автоматически (Priority: P1)

**Goal**: `updated_at` обновляется при любой правке записи (через форму и мимо интерфейса), `created_at` не меняется.

**Independent Test**: Сценарии quickstart.md 3, 4: правка через форму (UI + psql до/после), прямой UPDATE через psql (триггер).

**Примечание**: реализация триггера уже выполнена в Phase 2 (T004); US2 требует только верификацию.

- [x] T009 [US2] Прогнать сценарии 3 и 4 из `specs/002-user-created-updated/quickstart.md`: правка пользователя через форму — `updated_at` вырос, `created_at` не изменился; прямой `UPDATE appsmith.users SET is_user_enabled = true` через psql — триггер обновил `updated_at`; результаты зафиксировать в журнал дня. **Выполнено 23.09.2026:** сценарий 4 подтверждён на тестовой записи через psql (транзакция-автокоммит, `updated_at` вырос, `created_at` без изменений); сценарий 3 (правка через форму) — подтверждён пользователем в редакторе после Pull («всё работает, багов не нашёл», журнал 23.09).

**Checkpoint**: Все user stories работают независимо — фича готова к финализации

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Документирование, снапшоты после миграции, регресс, DoD (конституция V)

- [x] T010 [P] Снять снапшот `Appsmith_DB` «после» (набор `00_*`–`08_*` в корень `C:\Users\User\Documents\Gramax\default\Appsmith_DB`), коммит «Снапшот <дата>», `git push` (copilot делает сам). **Выполнено 23.09.2026: коммит `5dd027f`, запушен в GitVerse; diff со снапшотом «до» чистый (только `02_колонки.md` и `08_схема_ddl.sql`).**
- [x] T011 [P] Актуализировать Grammax 51 «Структура БД» (`dannye-i-bd/struktura-bd/_index.md`): в разделах статусов/структуры отметить колонки `created_at`/`updated_at` таблицы `users`; коммит в `PROCESS_DOC_GITVERSE`; **push — только после согласования с пользователем** (решение 19.09.2026); перед правкой — `git pull`. **Выполнено 23.09.2026:** pull выполнен (`8fd4b4f..62967ba`), правка внесена + блок «Изменения структуры по выгрузке 23.09.2026», коммит `f224da5`; **push — на согласовании.**
- [x] T012 [P] Обновить рабочий слой Obsidian: заметка `Разработка/Данные и БД/Схема БД.md` (колонки `created_at`/`updated_at`, функция, триггер). **Выполнено 23.09.2026.**
- [x] T013 [P] Обновить карточку `Разработка/Администрирование (Учётные записи).md`: фича «даты учётных записей» — реализована (ссылка на spec 002); дорожную карту в `Управление/Spec Kit (внедрение).md` — отметить выполнение пункта дат. **Выполнено 23.09.2026.**
- [x] T014 Финальный прогон всех сценариев `specs/002-user-created-updated/quickstart.md` (1–5) + короткий регресс пилота (дубликат логина, вход новым пользователем, блокировка) — отметить результаты в журнале дня. **Выполнено 23.09.2026:** psql-часть — сценарии 1 (3647/0/0), 2 (INSERT → даты от БД) и 4 (триггер на прямой UPDATE) подтверждены; UI-часть (сценарии 3, 5, регресс: создание/редактирование в форме, колонки в таблице) — подтверждена пользователем в редакторе после Pull («всё работает, багов не нашёл»).
- [x] T015 Выполнить DoD (конституция V): коммит форка (get_users.txt + спекулярные артефакты 002), запись в журнал дня `Задачи/Appsmith/Журнал/2026-09-23.md` (или новый день) о внедрении фичи. **Выполнено 23.09.2026: коммиты форка `1f189aa`, `e4727c1`, `fbf7573`; журнал дня дополнен.**
- [x] T016 Проверить конституционные артефакты: обновить `specs/002-user-created-updated/spec.md` → `Status: Implemented` (по факту внедрения), отметить чек-листы (requirements.md, при необходимости создать checklist реализации). **Выполнено 23.09.2026: `Status: Implemented` + честный комментарий в чек-листе.**

**Checkpoint**: DoD закрыт, документация актуальна

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 и US2 выполняются последовательно (US2 — чистка-верификация поверх US1)
- **Polish (Final Phase)**: Depends on all user stories being complete (кроме T011/T012/T013 — частично параллельны)

### User Story Dependencies

- **User Story 1 (P1)**: can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: зависит от US1 (проверка «Изменён» в таблице) и от миграции (триггер создан в Phase 2)

### Within Each User Story

- Миграция (Phase 2) прежде любой работы с данными
- В US1: правка запроса (T006) → синхронизация (T007) → правка редактора (T008)
- Пути задач не пересекаются между user stories — параллельность ограничена процессом (форк → редактор, один воркер)

### Parallel Opportunities

- T002 (снапшот «до») независим от приложения — можно параллельно с T003
- Phase 5: T010–T013 — параллельны (разные репозитории/файлы)
- Фазы 3 и 4 не пересекаются по файлам, но US2 требует проверок в интерфейсе после US1

---

## Parallel Example: User Story 1

```text
# Не зависит ни от чего (после Phase 2):
Task: "T006 [US1] правка pages/Администрирование/queries/get_users/get_users.txt"
# После T006 (последовательность форк → push → Pull → редактор):
Task: "T007 [US1] синхронизация форк → редактор"
Task: "T008 [US1] колонки в usersTable"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (гейты G1–G2)
2. Complete Phase 2: Foundational (миграция БД — критична, блокирует всё)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: прогон сценариев 1, 2, 5 quickstart
5. При необходимости — демо пользователю до US2

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → Deploy/Demo (MVP!)
3. User Story 2 → Test independently (сценарии 3, 4)
4. Polish: снапшоты, документация, регресс, DoD

### Parallel Team Strategy

Проект ведёт один исполнитель (copilot + пользователь в редакторе): параллельность применять осторожно, синхронно по этапам форк → push → Pull → редактор.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Каждая user story независимо проверяема (см. Independent Test в фазе)
- Commit после каждого логического этапа; push по правилам: форк — пользователь, Appsmith_DB — copilot сам, PROCESS_DOC_GITVERSE — по согласованию
- Stop на любом чекпоинте для валидации истории
- Избегать: расплывчатых задач, конфликтов одного файла, кросс-зависимостей, ломающих независимость историй
- Принцип II (конституция): публикация в каркас `Appsmith_AF` — отдельным Pull Request из форка на фазе `/speckit.converge` (в этот tasks.md осознанно не включено; аналог T072 пилота 001, отложенный до merge)