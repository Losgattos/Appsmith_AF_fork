export default {
	// Данные строки, выбранной в таблице (для модалки и синхронизации)
	get selectedRow() {
		return organisationTable.selectedRow ?? {};
	},

	// Перезагрузка справочника организаций (страница + общее количество)
	async refreshOrgn() {
		await orgn_get_directory_inn.run();
		await orgn_count_directory_inn.run();
	},

	// Открытие модалки: record = null -> добавление, record = строка -> редактирование.
	// Поля виджетов (orgnINN/orgnShortName/orgnFullName/...) заполняются из
	// organisationTable.selectedRow (defaultText), поэтому для добавления сбрасываем
	// выделение и явно очищаем поля.
	openOrgnModal(record) {
		if (record == null) {
			organisationTable.setSelectedRowIndex(-1);
			orgnINN.setValue('');
			orgnShortName.setValue('');
			orgnFullName.setValue('');
			orgnOgrn.setValue('');
			orgnKpp.setValue('');
			orgnPrintName.setValue('');
			orgnTipOu.setValue('');
			orgnStatusOu.setValue('');
			orgnOpf.setValue('');
			orgnParentShort.setValue('');
			orgnParentPrint.setValue('');
			storeValue('orgn_form', {});
		} else {
			storeValue('orgn_form', record);
		}
		showModal(orgnModal.name);
	},

	// Сбор полей из модалки в плоский объект (для insert/update)
	collectForm() {
		const val = (w) => (w?.text ?? '').trim() || null;
		return {
			inn: (orgnINN.text || '').trim(),
			short_name: (orgnShortName.text || '').trim(),
			full_name: (orgnFullName.text || '').trim() || null,
			ogrn: val(orgnOgrn),
			kpp: val(orgnKpp),
			print_name: val(orgnPrintName),
			tip_ou: val(orgnTipOu),
			status_ou: val(orgnStatusOu),
			opf: val(orgnOpf),
			parent_short_name: val(orgnParentShort),
			parent_print_name: val(orgnParentPrint)
		};
	},

	// Сохранение из модалки (добавление или редактирование — решает наличие directory_inn_id).
	// Правка и удаление допустимы только для строк, добавленных вручную (lsfusion_key IS NULL):
	// на уровне БД это гарантируют orgn_update/orgn_delete, на уровне UI — блокировка кнопок.
	async saveOrgn() {
		try {
			const record = appsmith.store.orgn_form ?? {};
			const editing = record.directory_inn_id != null;

			// Защита от правки синхронизированных строк
			if (editing && record.lsfusion_key != null) {
				return showAlert('Строка синхронизирована с LsFusion — редактирование запрещено', 'error');
			}

			const f = this.collectForm();
			if (!f.inn) return showAlert('Укажите ИНН', 'error');
			if (!/^\d{10}$/.test(f.inn)) return showAlert('ИНН должен содержать 10 цифр', 'error');
			if (!f.short_name) return showAlert('Укажите краткое наименование', 'error');

			// Проверка дубля пары ИНН+КПП до записи (свою строку при редактировании не считаем)
			const existed = (await orgn_inn_exists.run({ inn: f.inn, kpp: f.kpp, exclude_id: editing ? record.directory_inn_id : null }))?.[0];
			if (existed) return showAlert('Организация с таким ИНН и КПП уже есть в справочнике', 'error');

			if (editing) {
				await orgn_update.run({ directory_inn_id: record.directory_inn_id, ...f });
			} else {
				await orgn_insert.run({ ...f });
			}
			showAlert(editing ? 'Изменения сохранены' : 'Организация добавлена', 'success');
			closeModal(orgnModal.name);
			removeValue('orgn_form');
			await this.refreshOrgn();
		} catch (error) {
			console.error('Ошибка сохранения организации:', error);
			const msg = error?.message ?? String(error ?? '');
			if (/дубликат|duplicate|unique|already exists/i.test(msg)) {
				showAlert('Организация с таким ИНН и КПП уже есть в справочнике', 'error');
			} else {
				showAlert('Не удалось сохранить организацию. Проверьте введённые данные', 'error');
			}
		}
	},

	// Удаление выбранной строки справочника (только ручные строки)
	async deleteOrgn() {
		const selected = organisationTable.selectedRow;
		if (!selected?.directory_inn_id) return showAlert('Выберите строку в таблице', 'warning');
		try {
			const res = (await orgn_delete.run({ directory_inn_id: selected.directory_inn_id })) ?? [];
			const info = res[0] ?? {};
			if ((info.deleted ?? 0) > 0) {
				showAlert(`Организация «${selected.short_name}» удалена`, 'success');
				closeModal(orgnDelModal.name);
			} else {
				showAlert('Удалить нельзя: строка синхронизирована с LsFusion', 'error');
			}
			await this.refreshOrgn();
		} catch (error) {
			console.error('Ошибка удаления организации:', error);
			showAlert('Не удалось удалить организацию', 'error');
		}
	},

	// Фильтр справочника по выбранному ИОГВ: показываем только подведомственные учреждения
	// (directory_inn.iogv_inn = ИНН выбранного ИОГВ). Сама строка ИОГВ не показывается.
	async filterByIogv(row) {
		const inn = row?.inn ?? '';
		if (!inn) return this.clearIogvFilter();
		await storeValue('orgn_iogv_filter', inn);
		await resetWidget('organisationTable', false);
		await this.refreshOrgn();
	},

	// Сброс фильтра по ИОГВ — вернуть полный справочник
	async clearIogvFilter() {
		await removeValue('orgn_iogv_filter');
		await resetWidget('organisationTable', false);
		await this.refreshOrgn();
	},

	// ---------- Синхронизация с LsFusion ----------

	// Перечень для синхронизации: включённые ИОГВ (is_enabled) и их прямые дочки.
	// Возвращает { enabledInn:Set, rows:[...из LsFusion, отфильтрованные] }.
	async buildScope() {
		const scope = (await iogv_get.run()) ?? [];
		const enabled = scope.filter((r) => r.is_enabled).map((r) => String(r.inn));
		const enabledSet = new Set(enabled);
		const lsf = (await orgn_get_organizations_lsf.run()) ?? [];
		const rows = lsf.filter((r) => {
			const inn = String(r.inn ?? '');
			const head = String(r.inn_vyshestoyashego ?? '');
			return enabledSet.has(inn) || enabledSet.has(head);
		});
		return { enabledSet, rows };
	},

	// Сопоставление строки LsFusion с текущими данными справочника.
	// current — строки orgn_sync_current (id, inn, kpp, short_name, full_name, lsfusion_key).
	// Возвращает план: { action: 'update'|'backfill'|'insert'|'skip', id?, reason }
	planRow(row, current) {
		const key = row.key == null ? null : Number(row.key);
		const byKey = current.find((c) => c.lsfusion_key === key);
		if (byKey) return { action: 'update', id: byKey.directory_inn_id, reason: 'key' };

		// Кандидаты на сопоставление по ИНН: строки без ключа с таким же ИНН
		const inn = String(row.inn ?? '');
		const cands = current.filter((c) => c.lsfusion_key == null && String(c.inn ?? '') === inn);
		if (cands.length === 1) {
			return { action: 'backfill', id: cands[0].directory_inn_id, reason: 'inn' };
		}
		if (cands.length > 1) {
			// Несколько строк с одним ИНН (например, ГДТЮ и его филиалы): у ключа LsFusion
			// сопоставляем только «головную» — строку, чьё название созвучно с LsFusion-именем.
			const lname = (row.naimenovanie || '').toLowerCase();
			const lfull = (row.polnoe_naimenovanie || '').toLowerCase();
			const lpname = (row.naimenovanie_dlya_pechati || '').toLowerCase();
			const score = (s) => {
				const t = (s || '').toLowerCase();
				if (!lname && !lfull && !lpname) return 0;
				return (lname && t.includes(lname) ? 3 : 0) +
					(lpname && t.includes(lpname) ? 3 : 0) +
					(lfull && t.includes(lfull) ? 3 : 0) +
					(lname && lname.includes(t) ? 1 : 0);
			};
			const best = cands.map((c) => ({ c, s: Math.max(score(c.short_name), score(c.full_name)) }))
				.sort((a, b) => b.s - a.s)[0];
			if (best && best.s > 0) return { action: 'backfill', id: best.c.directory_inn_id, reason: 'inn-head' };
			return { action: 'skip', reason: 'inn-ambiguous' };
		}
		return { action: 'insert', reason: 'new' };
	},

	// Просмотр синхронизации (dry-run): считает, что будет сделано, без записи в БД.
	async syncPreview() {
		try {
			const { enabledSet, rows } = await this.buildScope();
			const current = (await orgn_sync_current.run()) ?? [];

			let ins = 0, upd = 0, bak = 0, skip = 0;
			for (const r of rows) {
				const p = this.planRow(r, current);
				if (p.action === 'insert') ins += 1;
				else if (p.action === 'update') upd += 1;
				else if (p.action === 'backfill') { bak += 1; }
				else skip += 1;
			}
			const syncedUpd = upd + bak;

			storeValue('orgn_sync_preview', {
				scope: enabledSet.size,
				total: rows.length,
				ins,
				syncedUpd,
				skip,
				checkedAt: new Date().toISOString()
			});
			showAlert(
				`L$/проверка: ${rows.length} из перечня (${enabledSet.size} ИОГВ). Добавить: ${ins}, обновить: ${syncedUpd}, пропустить: ${skip}.`,
				'theme'
			);
		} catch (error) {
			console.error('Ошибка проверки синхронизации:', error);
			showAlert('Не удалось выполнить проверку синхронизации', 'error');
		}
	},

	// Применение синхронизации:
	//  1) backfill — заполняем lsfusion_key у строк, сопоставленных по ИНН (lsfusion_key был NULL);
	//  2) UPSERT по lsfusion_key (ON CONFLICT DO UPDATE) — обновляем существующие и добавляем новые.
	// Строки без сопоставления (нет совпадений по ИНН/ключу) в перечне не трогаем.
	async syncApply() {
		try {
			const preview = appsmith.store.orgn_sync_preview;
			if (!preview) return showAlert('Сначала выполните «Проверить»', 'warning');

			const { rows } = await this.buildScope();
			const current = (await orgn_sync_current.run()) ?? [];

			const backfillPairs = [];
			let ins = 0, upd = 0, bak = 0, skip = 0;
			for (const r of rows) {
				const p = this.planRow(r, current);
				if (p.action === 'update') upd += 1;
				else if (p.action === 'backfill') {
					backfillPairs.push({ id: p.id, key: r.key });
					bak += 1;
				} else if (p.action === 'insert') ins += 1;
				else skip += 1;
			}

			// 1) backfill ключей по id
			if (backfillPairs.length) {
				await orgn_sync_backfill.run({ pairs: JSON.stringify(backfillPairs) });
			}
			// 2) UPSERT по lsfusion_key.
			// Строки передаём JSON-строкой: Appsmith подставляет её как $1-параметр,
			// а не инлайнит литерал (иначе в SQL попадает массив "[{...}]" и PostgreSQL
			// даёт "ERROR: syntax error at or near \"[\"").
			// Дедупликация по key: ON CONFLICT DO UPDATE не допускает повторного
			// затронутия одной и той же строки в рамках одного INSERT.
			const seenKeys = new Set();
			const upsertRows = rows.filter((r) => {
				const k = r.key == null ? null : Number(r.key);
				if (k != null) {
					if (seenKeys.has(k)) return false;
					seenKeys.add(k);
				}
				return true;
			});
			await orgn_upsert_sync.run({ rows: JSON.stringify(upsertRows) });

			await this.refreshOrgn();
			showAlert(`Синхронизация применена: добавлено ${ins}, обновлено ${upd + bak} (пропущено ${skip}).`, 'success');
		} catch (error) {
			console.error('Ошибка применения синхронизации:', error);
			// Разворачиваем ошибку Appsmith: текст PostgreSQL может лежать в message
			// либо в JSON-строке message (поле "message" / "originalMessage").
			let msg = error?.message ?? String(error ?? '');
			try {
				const parsed = JSON.parse(msg);
				msg = parsed?.message ?? parsed?.originalMessage ?? msg;
			} catch (e) { /* не JSON — оставляем как есть */ }
			console.error('orgn_upsert_sync failed:', msg);
			if (/unique|duplicate/i.test(msg)) {
				showAlert('Конфликт уникальности: проверьте сопоставление lsfusion_key / ИНН+КПП. Подробности: ' + msg, 'error');
			} else {
				showAlert('Не удалось применить синхронизацию. Подробности: ' + msg, 'error');
			}
		}
	}
}