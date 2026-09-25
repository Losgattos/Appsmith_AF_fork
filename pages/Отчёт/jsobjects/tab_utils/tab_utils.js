export default {
   
    _getTabByNumber(tabNumber) {
        if (!DBData.report_obj || !DBData.report_obj.tab) return null;
        const index = tabNumber - 1;
        return DBData.report_obj.tab[index] ?? null;
    },

   
    getTabProperty(tabNumber, property = 'is_visible') {
        const tab = this._getTabByNumber(tabNumber);
        if (!tab) return null;
        if (property === 'full') return tab;
        return tab[property] ?? null;
    },

    
    isTabVisible(tabNumber) {
        const tab = this._getTabByNumber(tabNumber);
        console.log(tab);
        return Boolean(tab?.is_visible ?? false);
    },

    canAddRows() {
				if (appsmith.store.report_editable === false) return false;
			
        const activeTabNumber = appsmith.store.activeTab;
        const userPerm = appsmith.store.user?.user_permissions || "";
    		if (!userPerm) return false; 

        const tab = this._getTabByNumber(activeTabNumber);
        const canAdd = Boolean(tab?.can_add_row ?? false);
        return canAdd && userPerm.includes('report_edit');
    },
		getActiveTabDescription() {
				const activeTabNumber = appsmith.store.activeTab;
				return this.getTabProperty(activeTabNumber, 'description');
		}
};