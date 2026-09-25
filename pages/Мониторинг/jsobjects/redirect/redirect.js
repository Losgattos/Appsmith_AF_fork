export default {
    openReport() {
      const sessionId = appsmith.store.session_id || appsmith.URL.queryParams.session_id;
      const target = appsmith.mode === 'EDIT' ? '/edit' : '';

      if (!sessionId) {
				showAlert("Нет session_id — войдите заново", "error");
        return;
      }

       
    	const reportId = 105;   

      const REPORT_PAGE_URL = 'page-6aa803cc0ff76f67968af310'; 
			// const url = `http://${appsmith.URL.host}/app/${REPORT_PAGE_URL}${target}` +
            // `?session_id=${sessionId}` +
            // `&report_id=${selectedReport.report_id}` +
            // `&directory_inn_id=${selectedReport.directory_inn_id}`;
			
			const url = `http://${appsmith.URL.host}/app/${REPORT_PAGE_URL}${target}` +
            `?session_id=${sessionId}` +
            `&report_id=105` +
            `&directory_inn_id=1110972`;

        navigateTo(url, {}, 'SAME_WINDOW');
    }
}