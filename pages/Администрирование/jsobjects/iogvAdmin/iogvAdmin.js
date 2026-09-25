export default {
	// Перезагрузка списка ИОГВ из перечня
	async refreshIogv() {
		await iogv_get.run();
	},

	// Открытие модалки: record = null -> добавление, record = строка -> редактирование.
	// Поля виджетов (iogvINN/iogvShortName/iogvComment/iogvEnabled) заполняются из
	// iogvTable.selectedRow (defaultText/defaultSwitchState).
	openIogvModal(record) {
		if (record == null) {
			iogvTable.setSelectedRowIndex(-1);
			iogvINN.setValue('');
			iogvShortName.setValue('');
			iogvComment.setValue('');
			iogvEnabled.setValue(true);
			storeValue('iogv_form', { is_enabled: true });
		} else {
			storeValue('iogv_form', record);
		}
		showModal(iogvModal.name);
	},

	// Сохранение из модалки (добавление или редактирование — решает наличие old_inn)
	async saveIogv() {
		try {
			const record = appsmith.store.iogv_form ?? {};
			const editing = !!record.inn;
			const inn = (iogvINN.text || '').trim();
			const short_name = (iogvShortName.text || '').trim();
			if (!inn) return showAlert('Укажите ИНН', 'error');
			if (!/^\d{10}$/.test(inn)) return showAlert('ИНН должен содержать 10 цифр', 'error');
			if (!short_name) return showAlert('Укажите название ИОГВ', 'error');
			const is_enabled = iogvEnabled.isSwitchedOn ?? true;
			const comment = (iogvComment.text || '').trim() || null;

			// Проверка дубля ИНН до записи (свою строку при редактировании не считаем)
			const existed = (await iogv_inn_exists.run({
				inn,
				exclude_inn: editing ? (record.inn ?? null) : null
			}))?.[0];
			if (existed) return showAlert('ИОГВ с таким ИНН уже есть в перечне', 'error');

			if (editing) {
				await iogv_update.run({
					old_inn: record.inn,
					inn,
					short_name,
					is_enabled,
					comment
				});
			} else {
				await iogv_insert.run({ inn, short_name, is_enabled, comment });
			}
			showAlert(editing ? 'Изменения сохранены' : 'ИОГВ добавлен в перечень', 'success');
			closeModal(iogvModal.name);
			removeValue('iogv_form');
			await this.refreshIogv();
		} catch (error) {
			console.error('Ошибка сохранения ИОГВ:', error);
			const msg = error?.message ?? String(error ?? '');
			if (/дубликат|duplicate|unique|already exists/i.test(msg)) {
				showAlert('ИОГВ с таким ИНН уже есть в перечне', 'error');
			} else {
				showAlert('Не удалось сохранить ИОГВ. Проверьте введённые данные', 'error');
			}
		}
	},

	// Удаление выбранной строки перечня
	async deleteIogv() {
		const selected = iogvTable.selectedRow;
		if (!selected?.inn) return showAlert('Выберите строку в таблице', 'warning');
		try {
			const res = (await iogv_delete.run({ inn: selected.inn })) ?? [];
			const info = res[0] ?? {};
			if ((info.deleted ?? 0) > 0) {
				showAlert(`ИОГВ «${selected.short_name}» удалён из перечня`, 'success');
				closeModal(iogvDelModal.name);
			} else {
				showAlert('Удалить не удалось: запись не найдена', 'error');
			}
			await this.refreshIogv();
		} catch (error) {
			console.error('Ошибка удаления ИОГВ:', error);
			showAlert('Не удалось удалить ИОГВ', 'error');
		}
	}
}