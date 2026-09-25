export default {
	// здесь находятся все действия для кнопок из меню (назад, обновить, отправить отчёт, вернуть очтет, увтердить отчет и т.д)
	
	//вернуться назад
	goBackButtonAction () {
		const user = appsmith.store.user;
		const sessionId = appsmith.store.session_id || appsmith.URL.queryParams.session_id;
		const target = appsmith.mode === 'EDIT' ? '/edit' : '';
		
		if (!user) {
    	showAlert("Данные о пользователе не загружены", "error");
    	return;
    };
		
		const PERSONAL_CABINET_URL = 'page-6aa803cc0ff76f67968af30d';
    const MONITORING_URL       = 'page-6aa803cc0ff76f67968af30f';
		
		const role = user.role_system_name;
		let targetUrl;
		if (role === 'ou_employee') {
    	targetUrl = PERSONAL_CABINET_URL;
    } else if (['ko_as_iogv_employee', 'iogv_employee', 'controller', 'ko_employee', 'cad_employee'].includes(role)) {
      targetUrl = MONITORING_URL;
    } else {
      showAlert("Тип учетной записи не поддерживается", "error");
      return;
    }
		
		const redirectUrl = `http://${appsmith.URL.host}/app/${targetUrl}${target}?session_id=${sessionId}`;
    navigateTo(redirectUrl, {}, 'SAME_WINDOW');
	},
	
	// утвердить отчёт
	async approveReportButtonAction () {
		const user = appsmith.store.user;
    const sessionId = appsmith.store.session_id || appsmith.URL.queryParams.session_id;
		
		if (!user || !sessionId) {
    	showAlert("Данные о пользователе не загружены", "error");
      return;
    }

    // Проверка права на утверждение
    if (!user.user_permissions?.includes('approve_report')) {
      showAlert("У вас нет прав на утверждение отчёта", "warning");
      return;
    }
		
		const statusSystemName = appsmith.store.report_status?.status_system_name;
		if (!['under_iogv_review', 'sent_for_review'].includes(statusSystemName)) {
      showAlert("Отчёт нельзя утвердить в текущем статусе", "warning");
      return;
    }
		
		try {
			await session_manager.changeReportStatus(
  	    'approved',
				['under_iogv_review', 'sent_for_review']
      );
			
			showAlert(`Отчёт для ИНН: ${user.login} был утверждён`, 'success');
			await this.refreshStatusAndEditability();
			
			const MONITORING_URL = 'page-6aa803cc0ff76f67968af30f';
      const target = appsmith.mode === 'EDIT' ? '/edit' : '';
      const url = `http://${appsmith.URL.host}/app/${MONITORING_URL}${target}?session_id=${sessionId}`;
      navigateTo(url, {}, 'SAME_WINDOW');
		} catch (error){
			console.error("Ошибка при утверждении отчёта:", error);
      showAlert("Не удалось утвердить отчёт", "error");
		}
	},
	
	// обновить
	async refreshButtonAction() {
		const user = appsmith.store.user;
    const currentOuId = appsmith.store.current_ou_id || user?.directory_inn_id;
    const reportId = appsmith.URL.queryParams.report_id;

    if (!user || !currentOuId || !reportId) {
      showAlert("Не удалось определить пользователя или отчёт", "error");
      return;
    }
		
		report_menu_btn_group.setDisabled(true);
		
		try {
			const [statusData] = await get_report_status.run({
        directory_inn_id: currentOuId,
        report_id: reportId
      });
			await storeValue('report_status', statusData || null);
      await DBData.getTestModel();
			showAlert('Данные обновлены', 'success');
		} catch (error) {
			console.error("Ошибка при обновлении:", error);
      showAlert(`Ошибка обновления: ${error.message}`, 'error');
		} finally {
			report_menu_btn_group.setDisabled(false);
		}
	},
	
	// отправить отчет
	async sendRepotrButtonAction () {
		const user = appsmith.store.user;
    const currentOuId = appsmith.store.current_ou_id || user?.directory_inn_id;
    const reportId = appsmith.URL.queryParams.report_id;
		
		if (!user || !currentOuId || !reportId) {
    	showAlert("Не удалось определить пользователя или отчёт", "error");
      return;
    }
		
		if (!(user.user_permissions || '').includes('send_for_review')) {
        showAlert("У вас нет прав на отправку отчёта", "warning");
        return;
    }
		
		const statusSystemName = appsmith.store.report_status?.status_system_name;
    if (!['in_work_ou', 'returned_for_revision', 'never_login'].includes(statusSystemName)) {
      showAlert("Отчёт нельзя отправить в текущем статусе", "warning");
      return;
    }
		
		try {
			await session_manager.changeReportStatus(
      	'sent_for_review',
        ['in_work_ou', 'returned_for_revision', 'never_login']
     	);
			
			await this.refreshStatusAndEditability();
			showAlert('Отчёт отправлен на проверку', 'success');
			
		} catch (error) {
			console.error("Ошибка при отправке отчёта:", error);
      showAlert("Не удалось отправить отчёт", "error");
		} 
	},
	
	async returnForRevisionButtonAction () {
		const user = appsmith.store.user;
    const currentOuId = appsmith.store.current_ou_id || user?.directory_inn_id;
    const reportId = appsmith.URL.queryParams.report_id;
		
		if (!user || !currentOuId || !reportId) {
      showAlert("Не удалось определить пользователя или отчёт", "error");
      return;
    }

    // Проверка права
    if (!(user.user_permissions || '').includes('return_report')) {
      showAlert("У вас нет прав на возврат отчёта", "warning");
      return;
    }
		
		const statusSystemName = appsmith.store.report_status?.status_system_name;
    if (!['under_iogv_review', 'approved', 'send_in_ko', 'sent_for_review'].includes(statusSystemName)) {
      showAlert("Отчёт нельзя вернуть в текущем статусе", "warning");
      return;
    }
		
		try {
			await session_manager.changeReportStatus(
      	'returned_for_revision',
       	['under_iogv_review', 'approved', 'send_in_ko', 'sent_for_review'],
        'Возвращено на доработку'
      );
			
			await this.refreshStatusAndEditability();	

      showAlert('Отчёт возвращён на доработку', 'success');
		} catch (error) {
			console.error("Ошибка при возврате отчёта:", error);
      showAlert("Не удалось вернуть отчёт", "error");
		}
	},
	
	async refreshStatusAndEditability() {
    const currentOuId = appsmith.store.current_ou_id || appsmith.store.user?.directory_inn_id;
    const reportId = appsmith.URL.queryParams.report_id;

    const [statusData] = await get_report_status.run({
        directory_inn_id: currentOuId,
        report_id: reportId
    });
    await storeValue('report_status', statusData || null);

    const READONLY_STATUSES = ['sent_for_review', 'under_iogv_review', 'approved', 'send_in_ko'];
    const isEditable = !READONLY_STATUSES.includes(statusData?.status_system_name || '');
    await storeValue('report_editable', isEditable);

    await DBData.setActiveTab(DBData.selected_tab);
		tab_utils.canAddRows();
	}
}