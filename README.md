---
title: Appsmith_AF
---

![Appsmith](https://raw.githubusercontent.com/appsmithorg/appsmith/release/static/appsmith_logo_primary.png)

Внутренняя система мониторинга и отчётности: авторизация, личный кабинет, мониторинг, отчёт, CRUD справочников и администрирование учётных записей.

-  **Стек:** Appsmith CE + PostgreSQL

-  **Схема данных:** см. снапшоты БД `Appsmith_DB` (`00_*`–`08_*`)

-  **Документация:** Grammax, страницы 40–46

Приложение: [открыть](http://192.168.137.136:7080/applications/6aa803cc0ff76f67968af306/pages/6aa803cc0ff76f67968af30c) · [редактор](http://192.168.137.136:7080/applications/6aa803cc0ff76f67968af306/pages/6aa803cc0ff76f67968af30c/edit)

## Разработка

Схема «основной репозиторий + форк»:

-  `**Appsmith_AF**` -- источник правды (ветка `main`); рядовые правки -- в `main`, крупные изменения -- через PR из форка.

-  `**Appsmith_AF_fork**` (этот репозиторий) -- рабочая ветка: правки только через PR в основной. Внешние правки ассистента -- только здесь (SQL, JSObjects, metadata), файлы репозиториев напрямую не правятся.

-  Синхронизация: **Sync fork -> Pull** до и после работы; перед push -- актуальный `master`.

Подробности: карточка разработки в Obsidian (`Задачи/Appsmith/Управление/Регламент совместной разработки`), документация в Grammax (страницы 40–46), **Конституция проекта** -- `.specify/memory/constitution.md`.

Изменения схемы БД -- только со снапшотами до/после.

## Spec Kit (SDD)

Процессы **Spec-Driven Development** (фичи), **bug-fixing** и **idea assessment** от [github/spec-kit](https://github.com/github/spec-kit).

-  `.specify/` -- конституция (`.specify/memory/constitution.md`), шаблоны, скрипты, `feature.json` (активная фича).

-  `.opencode/commands/speckit.*.md` -- команды агента (`/speckit-specify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge` и др.) -- исполняются в Obsidian Copilot (движок opencode) или CLI `opencode`.

-  `specs/<номер>-<имя>/` -- артефакты фич: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `tasks.md`, `quickstart.md`, `checklists/`.

Активная фича: `specs/001-admin-user-accounts/` -- «Администрирование -- управление учётными записями».

## История изменений

{% table header="row" %}

---

*  {% colwidth=[118] %}

   Дата

*  {% colwidth=[231] %}

   Коммит

*  {% colwidth=[567] %}

   Что отправлено

---

*  {% colwidth=[118] %}

   20\.09.2026

*  {% colwidth=[231] %}

   `8cc92a6`, `e889491`, `ac9b519`

*  {% colwidth=[567] %}

   Пилот Spec Kit: init (`.specify/`, конституция v1.0.0, команды `/speckit.*`), спека + план + tasks фичи «Администрирование»; README

---

*  {% colwidth=[118] %}

   18\.09.2026

*  {% colwidth=[231] %}

   `526cdd8`, `b952f67`, `8b5c2a4`

*  {% colwidth=[567] %}

   Страница «Администрирование», итерации 1–2 (save_user/delete_user, userAdmin, справочник ИНН); форма редактирования пользователей

---

*  {% colwidth=[118] %}

   18\.09.2026

*  {% colwidth=[231] %}

   `0e24800`, `3ea1ae2`

*  {% colwidth=[567] %}

   ЛК: доступные пользователю отчёты, статус отчёта, загрузка данных

---

*  {% colwidth=[118] %}

   16\.09.2026

*  {% colwidth=[231] %}

   `475c06d`, `d47aba0`, `f8a0ee1`

*  {% colwidth=[567] %}

   Механизм авторизации (UUID, выход), данные пользователя в ЛК

---

*  {% colwidth=[118] %}

   14\.09.2026

*  {% colwidth=[231] %}

   `4a833ec`

*  {% colwidth=[567] %}

   Initial commit

{% /table %}

Каждая строка таблицы дописывается перед push (механизм пуша из «Грамакса» срабатывает по изменённым файлам).