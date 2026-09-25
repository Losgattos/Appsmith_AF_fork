export default {
    // Получить вкладку по номеру (начиная с 1)
    _getTabByNumber(tabNumber) {
        if (!convertJSON.report_obj || !convertJSON.report_obj.tab) return null;
        const index = tabNumber - 1;
        return convertJSON.report_obj.tab[index] ?? null;
    },

    // Получить свойство вкладки
    getTabProperty(tabNumber, property = 'is_visible') {
        const tab = this._getTabByNumber(tabNumber);
        if (!tab) return null;
        if (property === 'full') return tab;
        return tab[property] ?? null;
    },

    // Видимость вкладки
    isTabVisible(tabNumber) {
        const tab = this._getTabByNumber(tabNumber);
        return Boolean(tab?.is_visible ?? false);
    },

    // Можно ли добавлять строки на текущей вкладке (без учёта прав)
    canAddRows() {
        const activeTabNumber = appsmith.store.activeTab;
        const tab = this._getTabByNumber(activeTabNumber);
        return Boolean(tab?.can_add_row ?? false);
    },

    // Описание активной вкладки
    getActiveTabDescription() {
        const activeTabNumber = appsmith.store.activeTab;
        return this.getTabProperty(activeTabNumber, 'description');
    }
};