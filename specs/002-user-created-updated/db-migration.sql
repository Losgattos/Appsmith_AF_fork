-- ============================================================================
-- Миграция: users + created_at/updated_at (фича 002-user-created-updated)
-- Дата: 2026-09-23 | Решение пользователя 23.09.2026 (Вариант 3: даты ведёт БД)
-- Порядок критичен: колонки -> бэкфилл -> функция -> триггер (триггер ПОСЛЕ бэкфилла,
-- иначе триггер перезапишет updated_at значением now() во время бэкфилла).
-- Выполняется в одной транзакции через psql.
-- ============================================================================

BEGIN;

-- 1. Колонки (существующие строки получат DEFAULT = момент миграции)
ALTER TABLE appsmith.users
    ADD COLUMN created_at timestamp without time zone NOT NULL DEFAULT now(),
    ADD COLUMN updated_at timestamp without time zone NOT NULL DEFAULT now();

-- 2. Бэкфилл существующих записей (решение 23.09.2026: 01.01.2026)
UPDATE appsmith.users
SET created_at = '2026-01-01 00:00:00',
    updated_at = '2026-01-01 00:00:00';

-- 3. Функция (общая, переиспользуема для будущих таблиц)
CREATE OR REPLACE FUNCTION appsmith.set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер (после бэкфилла)
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON appsmith.users
    FOR EACH ROW
    EXECUTE FUNCTION appsmith.set_updated_at();

COMMIT;

-- ============================================================================
-- Корректировка 23.09.2026 (вечер, решение пользователя): "Изменено" заполняется
-- только при реальном изменении записи. updated_at: без DEFAULT, nullable,
-- при INSERT = NULL; существующим записям бэкфилл updated_at сброшен в NULL.
-- Отдельная транзакция от основной миграции.
-- Снапшоты Appsmith_DB: 8b00d7e (до) / ddde1d3 (после).
-- ============================================================================

BEGIN;

-- 1. Убрать DEFAULT now() и NOT NULL -> при INSERT updated_at = NULL
ALTER TABLE appsmith.users ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE appsmith.users ALTER COLUMN updated_at DROP NOT NULL;

-- 2. Обнулить существующие (триггер временно отключён, иначе он заполнит now())
ALTER TABLE appsmith.users DISABLE TRIGGER trg_users_updated_at;
UPDATE appsmith.users SET updated_at = NULL WHERE updated_at IS NOT NULL;
ALTER TABLE appsmith.users ENABLE TRIGGER trg_users_updated_at;

COMMIT;

-- ============================================================================
-- Корректировка 23.09.2026 (день, решение пользователя): все timestamp-значения
-- проекта хранятся в МОСКОВСКОМ времени явно. Причина: JDBC-соединение Appsmith
-- задаёт свой часовой пояс (GMT), игнорируя server timezone PostgreSQL; смена
-- timezone сервера на Europe/Moscow на Appsmith не влияет (проверено фактом:
-- сессия Appsmith пишет GMT при server timezone = Europe/Moscow).
-- Решение: везде now() заменено на (now() AT TIME ZONE 'Europe/Moscow') —
-- в DEFAULT, триггер-функции и SQL-телах запросов (запись И сравнения).
-- Это вариант 1 из консультации («писать МСК в БД»), применённый глобально
-- по решению пользователя («так будем делать везде во всём проекте»).
-- Снапшоты Appsmith_DB: d2cf892 (до) / 817a990 (после).
-- ============================================================================

BEGIN;

-- 1. Триггер-функция: писать московское время, а не пояс сессии
CREATE OR REPLACE FUNCTION appsmith.set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at := (now() AT TIME ZONE 'Europe/Moscow');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. DEFAULT created_at — тоже московское время
ALTER TABLE appsmith.users
    ALTER COLUMN created_at SET DEFAULT ((now() AT TIME ZONE 'Europe/Moscow'));

-- 3. Пересчёт существующих GMT-значений (+3 ч; updated_at-пересчёт — при
--    отключённом триггере, иначе триггер поставит текущее время вместо +3 ч)
ALTER TABLE appsmith.users DISABLE TRIGGER trg_users_updated_at;
UPDATE appsmith.users
   SET created_at = created_at + interval '3 hours',
       updated_at = updated_at + interval '3 hours'
 WHERE created_at <> '2026-01-01 00:00:00'
    OR updated_at <> '2026-01-01 00:00:00';
ALTER TABLE appsmith.users ENABLE TRIGGER trg_users_updated_at;

-- 4. Сессии: существующие end_time (GMT) -> +3 ч; новые записываются
--    Московским временем из запросов create/update_user_session
UPDATE appsmith.user_sessions SET end_time = end_time + interval '3 hours';

COMMIT;

-- ============================================================================
-- Согласованные правки SQL-тел запросов приложения (форк Appsmith_AF_fork):
-- Авторизация/create_user_session:   now() + interval '1 day'              -> (now() AT TIME ZONE 'Europe/Moscow') + interval '1 day'
-- Авторизация/update_user_session:   same
-- Авторизация/get_active_user_session: end_time > now()                   -> end_time > (now() AT TIME ZONE 'Europe/Moscow')
-- Отчёт/get_user_session:            s.end_time > now()                   -> s.end_time > (now() AT TIME ZONE 'Europe/Moscow')
-- Личный кабинет/get_user_session:   same
-- Личный кабинет/reports_data:       from_date/to_date vs now()           -> vs (now() AT TIME ZONE 'Europe/Moscow')
-- Личный кабинет/invalidate_session: SET end_time = now()                 -> SET end_time = (now() AT TIME ZONE 'Europe/Moscow')
-- Отчёт/invalidate_session:          same
-- Администрирование/save_user:       end_time = now(); end_time > now()   -> МСК-версии
-- ВАЖНО: пересчёт существующих значений обязателен одновременно с правкой
-- запросов, иначе старые GMT-записи останутся на -3 часа от новых МСК-записей.
-- ============================================================================