export default {
	// Перезагрузка списка после любых изменений
	async refreshUsers() {
		await user_get_users.run();
	},

	// Поиск учреждения по введённому ИНН (вызывается из onTextChanged поля userINN).
	// Запуск только когда ИНН введён целиком (10 цифр), чтобы не дёргать БД на каждый символ.
	onInnChange() {
		const inn = (userINN.text || '').trim();
		if (inn.length >= 10) {
			return orgn_get_ou_by_inn.run({ inn });
		}
	},

	// Открытие модалки: user = undefined → добавление, user = строка → редактирование.
	// Поля виджетов (userLogin/userPassword/userINN/userRole/userEnabled) заполняются
	// напрямую из usersTable.selectedRow (defaultText/defaultSwitchState), поэтому
	// для добавления сбрасываем выделение и явно очищаем поля: после ручного ввода
	// Appsmith не обновляет текст по defaultText — только setValue/resetWidget
	// гарантируют чистую форму (resetWidget сбрасывает Select к defaultOptionValue).
	openUserModal(user) {
		if (user == null) {
			usersTable.setSelectedRowIndex(-1);
			userLogin.setValue('');
			userPassword.setValue('');
			userINN.setValue('');
			resetWidget('userRole');
			userEnabled.setValue(true);
			storeValue('user_form', { is_user_enabled: true });
		} else {
			storeValue('user_form', user);
		}
		showModal(userModal.name);
	},

	// Сохранение из модалки (добавление или редактирование — решает user_save_user по user_id)
	async saveUser() {
		try {
			const user_id = appsmith.store.user_form?.id ?? null;
			const login = (userLogin.text || '').trim();
			const password = userPassword.text || '';
			if (!login) return showAlert('Укажите логин', 'error');
			// Пароль обязателен и при добавлении, и при редактировании (решение пользователя 22.09.2026)
			if (!password) return showAlert('Укажите пароль', 'error');
			if (!/^[a-zA-Z0-9]{1,11}$/.test(password)) {
				return showAlert('Пароль: 1–11 символов, только латиница и цифры', 'error');
			}
			const role_id = userRole.selectedOptionValue;
			if (!role_id) return showAlert('Выберите роль', 'error');

			// Учреждение по ИНН (кейс A, решение 22.09.2026): точное совпадение,
			// directory_inn_id берём из найденной строки, а не из текста формы
			const inn = (userINN.text || '').trim();
			if (!inn) return showAlert('Укажите ИНН учреждения', 'error');
			await orgn_get_ou_by_inn.run({ inn });
			const ouList = orgn_get_ou_by_inn.data ?? [];
			if (ouList.length === 0) return showAlert(`Учреждение с ИНН ${inn} не найдено`, 'error');
			if (ouList.length > 1) return showAlert(`ИНН ${inn} неоднозначен: найдено ${ouList.length} учреждений`, 'error');
			const directory_inn_id = ouList[0].directory_inn_id;

			// Уникальность логина: без учёта регистра, собственная запись не считается (FR-011, research №5).
			// Точечный запрос user_check_user_login вместо user_get_users.run(): перезагрузка таблицы
			// пересчитывает usersTable.selectedRow, и поля формы очищаются через
			// defaultText/defaultOptionValue/defaultSwitchState (форма должна сохранять ввод).
			await user_check_user_login.run({ login, user_id });
			const duplicate = user_check_user_login.data?.[0];
			if (duplicate) return showAlert('Пользователь с таким логином уже существует', 'error');

			await user_save_user.run({
				user_id: user_id,
				login: login,
				password: password,
				directory_inn_id: directory_inn_id,
				role_id: role_id,
				is_user_enabled: userEnabled.isSwitchedOn ?? true
			});
			showAlert('Сохранено', 'success');
			closeModal(userModal.name);
			removeValue('user_form');
			await this.refreshUsers();
		} catch (error) {
			console.error('Ошибка сохранения:', error);
			const msg = error?.message ?? String(error ?? '');
			showAlert(`Не удалось сохранить пользователя: ${msg}`, 'error');
		}
	},

	// Удаление выбранного пользователя (защита — в SQL; причины отказа — из ответа)
	async deleteUser() {
		const selected = usersTable.selectedRow;
		if (!selected?.id) return showAlert('Выберите пользователя в таблице', 'warning');
		try {
			const res = (await user_delete_user.run({ user_id: selected.id })) ?? [];
			const info = res[0] ?? {};
			if (info.deleted === 1) {
				showAlert(`Пользователь ${selected.login} удалён`, 'success');
				closeModal(userDelModal.name);
			} else {
				const reasons = [];
				if (info.has_sessions) reasons.push('он входил в систему');
				if (info.has_history) reasons.push('у него есть история отчётов');
				showAlert(`Удалить нельзя: ${reasons.join(', ')}`, 'error');
			}
			await this.refreshUsers();
		} catch (error) {
			console.error('Ошибка удаления:', error);
			showAlert('Не удалось удалить пользователя', 'error');
		}
	}
}