export default {
	async initOnPageLoad() {
		// сначалаа получаем из URL id-сесии пользвоателя 
		const sessionId = appsmith.URL.queryParams.session_id;
		
		if (!sessionId) {
      showAlert('Нет активной сессии', 'warning');
			// на этапе зазработки закоментирую, чтобы не мешало 
			// const auth_app_url = 'page-6aa803cc0ff76f67968af30c';
			// const target = appsmith.mode === 'EDIT' ? '/edit' : '';
      // navigateTo(`http://${appsmith.URL.host}/app/${auth_app_url}${target}`, {}, 'SAME_WINDOW');
      // return null; 
    };
		
		// проверяем сессию пользвоателя 
		const [user] = await get_user_session.run({ session_id: sessionId });
		
		if (!user) {
    	showAlert('Сессия истекла или недействительна', 'error');
			// на этапе зазработки закоментирую, чтобы не мешало 
			// const auth_app_url = 'page-6aa803cc0ff76f67968af30c';
			// const target = appsmith.mode === 'EDIT' ? '/edit' : '';
    	// navigateTo(`http://${appsmith.URL.host}/app/${auth_app_url}${target}`, {}, 'SAME_WINDOW');
      // return null;
    };
		
		// Сохраняем в store данные пользователя 
    await storeValue('user', user);
    await storeValue('session_id', sessionId);

		await reports_data.run({ directory_inn_id: user.directory_inn_id });
		await storeValue('report_data', reports_data.data);
		
    return user;
	},
  async logout() {
		try {
			const sessionId = appsmith.store.session_id;
			// в базе заканчиваем сессию (ставим время окончания сессии на время вызода пользователя)
			if (sessionId) {
      	await invalidate_session.run({ session_id: sessionId });
      }
			await clearStore();
			
			const auth_app_url = 'page-6aa803cc0ff76f67968af30c';
			const target = appsmith.mode === 'EDIT' ? '/edit' : '';
      navigateTo(`http://${appsmith.URL.host}/app/${auth_app_url}${target}`, {}, 'SAME_WINDOW');
		} catch (error) {
  		console.error('Ошибка выхода:', error);
      // Даже если запрос упал — всё равно уходим на авторизацию
      await clearStore();
      const auth_app_url = 'page-6aa803cc0ff76f67968af30c';
      const target = appsmith.mode === 'EDIT' ? '/edit' : '';
      navigateTo(`http://${appsmith.URL.host}/app/${auth_app_url}${target}`, {}, 'SAME_WINDOW');
  	}
	}
}