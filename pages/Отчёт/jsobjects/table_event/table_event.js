export default {
	newTableonDataChange () {
		if (DBData.selected_tab) {
				DBData.tab_data_cache[DBData.selected_tab] = { ...newTable.model };
		}
	}
}