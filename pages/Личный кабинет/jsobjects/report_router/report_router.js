export default {
	async viewEditAction () {
		try {
			// получаем из модели выбранный отчет
			const selectedReport = ReportsCardGridWidget?.model?.selectedReport;
			
			if (!selectedReport) {
      	showAlert("Не выбран отчет", "warning");
        return;
      }
			
			// получение данных пользователя и его проверка, а так же проверка его прав
			const user = appsmith.store.user
			const sessionId = appsmith.store.session_id;
			
			if (!user || !sessionId) {
      	showAlert("Сессия не найдена. Войдите заново.", "error");
        return;
      };
			
			const permissions = user.user_permissions || "";
      if (!permissions.includes("report_edit")) {
       showAlert("У вас нет прав на редактирование этого отчета", "warning");
       return;
      }
			
			// определяем URL отчета для перенаправления пользователя на отчет
			const host = appsmith.URL.host;
      let reportAppUrl;
      let protocol;
			
			if (host === "192.168.137.136:7080") {
      	reportAppUrl = selectedReport.report_local_url;
        protocol     = "http://";
      } else if (host === "apps.gkuoa.ru") {
        reportAppUrl = selectedReport.report_prod_url;
        protocol     = "https://";
      } else {
        showAlert("Текущий host неизвестен", "warning");
        return;
      }
			
			if (!reportAppUrl) {
      	showAlert("URL отчёта не определён", "error");
        return;
     	}
			
			// формируем ссылку для перенаправления пользвоателя и включаем в неё report_id и session_id
			const reportId  = selectedReport.report_id;
      const modeSuffix = appsmith.mode === "EDIT" ? "/edit" : "";
      const redirectUrl = `${protocol}${host}/app/${reportAppUrl}${modeSuffix}?session_id=${sessionId}&report_id=${reportId}`;
			
			console.log("Переходим на отчёт:", redirectUrl);
			// переход на сам отчёт
			navigateTo(redirectUrl, {}, "SAME_WINDOW");
			
		} catch (error) {
			console.error("Ошибка перехода к отчету:", error);
      showAlert(error.message || "Не удалось открыть отчёт", "error");
		}
	}
}