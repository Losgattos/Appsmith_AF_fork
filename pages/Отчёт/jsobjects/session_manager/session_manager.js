export default {
	async initOnPageLoad () {
		const sessionId = appsmith.URL.queryParams.session_id;
		const auth_app_url = 'page-6aa803cc0ff76f67968af30c';
    const target = appsmith.mode === 'EDIT' ? '/edit' : '';
		
		// закоментирвоано на время разработки 
		// if (!sessionId) {
			// showAlert('Нет активной сессии', 'warning');
      // navigateTo(`http://${appsmith.URL.host}/app/${auth_app_url}${target}`, {}, 'SAME_WINDOW');
      // return null;
		// }
		
		const [user] = await get_user_session.run({ session_id: sessionId });
    // if (!user) {
    	// showAlert('Сессия истекла или недействительна', 'error');
      // navigateTo(`http://${appsmith.URL.host}/app/${auth_app_url}${target}`, {}, 'SAME_WINDOW');
      // return null;
    // }
		
		await storeValue('user', user);
    await storeValue('session_id', sessionId);
		const inn = user.iogv_inn;
		const responsible = iogv_contact_info.getResponsibleByInn(inn);
		await storeValue('iogv_responsible', responsible);
		
		const reportId = appsmith.URL.queryParams.report_id;
		const directoryInnId = appsmith.URL.queryParams.directory_inn_id;
		
    if (!reportId) {
    	showAlert('Отчёт не указан', 'error');
      return null;
    }
		
		const currentOuId = directoryInnId || user.directory_inn_id;
    await storeValue('current_ou_id', currentOuId);
		
		await DBData.getTestModel();

		// Смена статуса: never_login → in_work_ou
		try {
			await this.changeReportStatus('in_work_ou', ['never_login']);
		} catch (error) {
			console.error("Ошибка инициализации статуса:", error);
			// Не блокируем загрузку — просто логируем
		}

		const [statusData] = await get_report_status.run({
				directory_inn_id: currentOuId,
				report_id: reportId
		});
		await storeValue('report_status', statusData || null);
		
		const READONLY_STATUSES = ['sent_for_review', 'under_iogv_review', 'approved', 'send_in_ko'];

		const statusSystemName = statusData?.status_system_name || '';
		const isEditable = !READONLY_STATUSES.includes(statusSystemName);

		await storeValue('report_editable', isEditable);
		
		await ou_report_status_history.run({
			report_shema_name: DBData.report.report_shema_name,
			directory_inn_id: currentOuId
		});
		
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
	},
	
	async changeReportStatus(newStatus, fromStatuses, comment = null) {
    const user = appsmith.store.user;
    const currentOuId = appsmith.store.current_ou_id || user?.directory_inn_id;
    const reportId = appsmith.URL.queryParams.report_id;
    const reportShema = DBData.report?.report_shema_name;

    if (!user || !currentOuId || !reportId || !reportShema) {
    	throw new Error("Не удалось определить пользователя или отчёт");
    }

    return await update_report_status.run({
      new_status_system_name: newStatus,
      from_status_system_names: fromStatuses.join(','),
      directory_inn_id: currentOuId,
      report_id: reportId,
			report_shema_name: reportShema,
      user_id: user.id,
      comment: comment || '' 
   	});
	}
}