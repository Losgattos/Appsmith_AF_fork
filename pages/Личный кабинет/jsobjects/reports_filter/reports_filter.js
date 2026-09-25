export default {
	// фильтрация и сортировка списка доступных пользователю отчетов
	filterReports() {
		const allReports = reports_data.data || [];
		
		const selectedName   = NameFilter.selectedOptionValue;
    const selectedStatus = StatusFilter.selectedOptionValue;
		
		const filtered = allReports.filter((report) => {
    	const matchesName   = !selectedName   || report.report_name   === selectedName;
      const matchesStatus = !selectedStatus || report.status_name   === selectedStatus;
      return matchesName && matchesStatus;
    });
		
		return filtered.sort((a, b) => {
    	const nameA = (a.report_name || "").toLowerCase();
      const nameB = (b.report_name || "").toLowerCase();
      return nameA.localeCompare(nameB, "ru");
    });
	},
	
	// выбираем все уникальные названия отчётов для отображения в выборе фильтров
	getUniqueNames() {
		const all = reports_data.data || [];
		const unique = [...new Set(all.map(r => r.report_name).filter(Boolean))].sort();
		return unique.map(n => ({ label: n, value: n }));
	},
	
	// выбираем все уникальные статусы для отобраения отчетов в выборе фильтров
	getUniqueStatuses() {
		const all = reports_data.data || [];
    const unique = [...new Set(all.map(r => r.status_name).filter(Boolean))].sort();
    return unique.map(s => ({ label: s, value: s }));
	},
	
	// для кнопки сброса фильтров
	resetFilters() {
		NameFilter.setSelectedOption("");
    StatusFilter.setSelectedOption("");
	},
	
	// так же необходимо для кнопки сброса фильтров (для её активации)
	hasActiveFilters () {
		return !!(NameFilter.selectedOptionValue || StatusFilter.selectedOptionValue);
	},
	
	// cчётчики 
	// общее воличесвто отчетов
	getTotalCount() {
  	return (reports_data.data || []).length;
  },
	// количество отчетов, найденных по заданным фильтрам
	getFilteredCount() {
  	return this.filterReports().length;
  },
	
	// обновление данных по отчетам (не сбрасывает фильтры)
	async refreshButtonAction () {
		RefreshButton.setDisabled(true)
		try {
			showAlert('Обновляем данные', 'info');
      await reports_data.run({
      	directory_inn_id: appsmith.store.user.directory_inn_id
      });
		} catch (error) {
			showAlert(`Ошибка обновления: ${error.message}`, "error");
		} finally {
			RefreshButton.setDisabled(false);
		}
	}
}