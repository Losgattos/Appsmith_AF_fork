export default {
	// Константы для путей http://192.168.137.136:7080/app/application-framework/page-6aa803cc0ff76f67968af30d/edit?branch=master ЛК
// http://192.168.137.136:7080/app/application-framework/page-6aa803cc0ff76f67968af30f/edit?branch=master       monitoring

	// Вспомогательный метод для показа модалки с текстом
	showError(message) {
		// Логируем факт отображения ошибки пользователю
		const originalText = TextInfo.text;
		TextInfo.setText(message)
		setTimeout(() => {
			 TextInfo.setText(originalText)
			}, 10000
		) 
	},

	async signIn() {
		try {
			clearStore()
			
			const [user] = await login_get_user_info.run();
			
			if (!user) return this.showError("Пользователь с таким логином не найден!");
      if (user.is_valid_password === false) return this.showError("Неверный пароль!");
			if (!user.is_user_enabled) return this.showError("Учётная запись заблокирована!");
      
			let sessionId;
			
			// ищем активную сиссию для данного пользователя
			const [activeSession] = await get_active_user_session.run({ user_id: user.id });
			
			// если активная сессия для данного пользователя нашлась
			if (activeSession){
				sessionId = activeSession.sessions_id
				await update_user_session.run({session_id: sessionId}); // то обновляем время такой сессии
			} else {
				// если нет или неактивна, то создаем новую
				// Генерирация session_id (UUID)
      	const { v4: uuidv4 } = uuid;
				sessionId = uuidv4();
				
				// cохранение сессии в БД
      	await create_user_session.run({
					session_id: sessionId,
					user_id: user.id
				});	
			}
			//сохранение пользвоателя и сесси в appsmith.store
			await storeValue('user', user);
			await storeValue('session_id', sessionId)
			
			this.handleRedirect(user, sessionId)
		} catch (error) {
			console.error('Ошибка входа:', error);
      showAlert('Сервер БД недоступен. Попробуйте позже.', 'error');
		}
	},
	
	handleRedirect(user, sessionId) {
		const group = user.system_name;
		const PERSONAL_CABINET_URL = "page-6aa803cc0ff76f67968af30d"; 
		const MONITORING_URL = "page-6aa803cc0ff76f67968af30f";
		
		let targetUrl;
		if (group === "ou_employee") {
			targetUrl = PERSONAL_CABINET_URL;
		} else if (['ko_as_iogv_employee', 'iogv_employee', 'controller', 'ko_employee', 'cad_employee'].includes(group)) {
			targetUrl = MONITORING_URL;
		} else {
			showAlert(`Ваша учётная запись не относится ни к одному из разрешённых типов ${group}`)
			return
		}
		
		const modeSuffix = appsmith.mode === 'EDIT' ? '/edit' : '';
		const fullUrl = `http://${appsmith.URL.host}/app/${targetUrl}${modeSuffix}?session_id=${sessionId}`;
		navigateTo(fullUrl, {}, 'SAME_WINDOW');
	}
}	
