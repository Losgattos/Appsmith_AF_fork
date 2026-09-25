# Implementation Plan: Даты учётных записей (создание/изменение)

**Branch**: `002-user-created-updated` | **Date**: 2026-09-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-user-created-updated/spec.md`

## Summary

Учётной записи добавляются даты жизни цикла: **дата создания** и **дата последнего изменения** (FR-001…FR-008). По решению пользователя 23.09.2026 даты ведёт база данных — приложение не пишет и не меняет их:

- `created_at` — значение по умолчанию БД (устанавливается в момент INSERT, никогда не меняется);
- `updated_at` — обновляется триггером БД при любой операции UPDATE записи (включая правки мимо интерфейса);
- существующие записи получают фиксированные даты **01.01.2026** (миграция-бэкфилл);
- в UI: колонки «Создан»/«Изменён» в таблице списка учётных записей (редактор Appsmith) + вывод полей в запросе `get_users` (форк).

Существующий `save_user` (INSERT/UPDATE) не трогаем: INSERT покроет DEFAULT, UPDATE — триггер.

## Technical Context

**Language/Version**: SQL PostgreSQL (DDL/миграция), JSObjects Appsmith (JS), формат git-sync Appsmith CE.

**Primary Dependencies**: Appsmith CE (редактор, публикация через GitVerse); psql — клиент PostgreSQL для миграции и снапшотов (механизм — карточка «Доступ к PostgreSQL (psql).md»).

**Storage**: PostgreSQL, схема `appsmith`, таблица `users` (единственная изменяемая структура в этой фиче).

**Testing**: автотестов в проекте нет; валидация — ручные сценарии из `quickstart.md` (в редакторе Appsmith + прямой контроль через psql). Контроль бэкфилла и триггера — SQL-запросами.

**Target Platform**: веб-приложение Appsmith (каркас `Appsmith_AF`, страница «Администрирование»), раздача через GitVerse.

**Project Type**: low-code web application (Appsmith CE).

**Performance Goals**: N/A — объём данных мал (таблица `users` — десятки строк), триггер на UPDATE одной строки некритичен.

**Constraints**:
- Конституция принципы I–V (см. Constitution Check ниже).
- Доступ к PostgreSQL: 22.09.2026 сервер был недоступен — **Gate**: проверить доступ (psql) до начала миграции.
- Снапшот `Appsmith_DB` **до и после** изменения структуры БД (принцип IV); push снапшотов copilot делает сам.
- Значения времени — `timestamp without time zone` (единообразно с остальной схемой проекта), серверное время.
- Порядок попадания правок в приложение: форк (коммит) → push пользователем → в редакторе **Pull, затем Commit & Push** (принцип III).

**Scale/Scope**: 1 таблица (`users`), +2 колонки, +1 функция, +1 триггер, правка SELECT в 1 запросе форка, +2 колонки в 1 виджете (редактор).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Принцип | Статус | Обоснование |
|---------|--------|-------------|
| I. Один источник правды — каркас | ✅ | Каркас `Appsmith_AF` остаётся источником правды; работа идёт в форке, публикация — через PR (фаза converge). |
| II. Изменения каркаса — только через PR | ✅ | Учтено: фича собирается в форке, в каркас попадает через PR из форка после проверки. «Sync fork»/Pull по циклам. |
| III. Файлы руками не править (кроме форка) | ✅ | Единственная ручная правка файлов — `get_users.txt` (тело SQL-запроса) в **форке** — разрешена. Виджет `usersTable` (колонки) — только через редактор. DDL — через psql, файлы репозиториев не затрагиваются. |
| IV. БД версионируется снапшотами | ✅ | Обязательные шаги плана: снапшот `Appsmith_DB` **до** миграции (этап 1) и **после** (этап 8), отдельные коммиты «Снапшот <дата>», push снапшотов copilot делает сам; актуализация Grammax 51 «Структура БД» (15, коммит; push — по согласованию 19.09.2026). |
| V. Каждая работа — проверка и фиксация | ✅ | DoD: коммит форка (этап 12) + запись в журнал дня (этап 16). |

**Гейты перед миграцией** (WARN, если не выполнены — миграцию не начинать):
- G1: доступ к PostgreSQL подтверждён (psql коннектится).
- G2: снапшот `Appsmith_DB` «до» снят и закоммичен.

## Project Structure

### Documentation (this feature)

```text
specs/002-user-created-updated/
├── spec.md              # Спецификация (/speckit.specify)
├── checklists/requirements.md  # Чек-лист качества спеки
├── plan.md              # Этот план (/speckit.plan)
├── research.md          # Решения Phase 0 (/speckit.plan)
├── data-model.md        # Модель данных Phase 1 (/speckit.plan)
├── quickstart.md        # Сценарии проверки Phase 1 (/speckit.plan)
└── tasks.md             # Phase 2 (/speckit.tasks — создаётся отдельно)
```

### Source Code (фактическая структура Appsmith-форка)

```text
Appsmith_AF_fork/
├── pages/Администрирование/
│   ├── queries/get_users/get_users.txt      # + u.created_at, u.updated_at в SELECT (правка форка)
│   ├── queries/save_user/save_user.txt      # без изменений (покрывается DEFAULT/триггером)
│   └── widgets/usersTable/                  # колонки «Создан»/«Изменён» — только через редактор
└── .specify/feature.json                    # указатель на specs/002-user-created-updated

БД (не репозиторий, миграция через psql):
appsmith.users: + created_at, + updated_at, + функция set_updated_at(), + триггер trg_users_updated_at

Appsmith_DB/: снапшоты 00_*–08_* — до и после миграции (принцип IV)
```

**Structure Decision**: изменений в структуре приложения не требуется — фича ложится в существующий контур «Администрирование» (запрос `get_users` + виджет-таблица). БД-миграция оформляется отдельным скриптом (в теле плана, этапы 5–7) и выполняется через psql; снапшоты снимаются по существующему механизму `Appsmith_DB`.

## Complexity Tracking

> Нарушений конституции нет — таблица не заполняется.