export default {
    js_report_data: null,
    report_obj: null,
    selected_tab: 0,

    async loadFromFilePicker() {
        try {
            const files = newJSON.files;
            if (!files || files.length === 0) throw new Error('Файл не выбран');
            const file = files[0];
            let base64 = file.data;
            if (base64.includes('base64,')) {
                base64 = base64.split('base64,')[1];
            }
            const base64ToUtf8 = (b64) => {
                const binaryStr = atob(b64);
                const bytes = [];
                for (let i = 0; i < binaryStr.length; i++) {
                    bytes.push(binaryStr.charCodeAt(i));
                }
                const percentEncoded = bytes.map(b => '%' + ('00' + b.toString(16)).slice(-2)).join('');
                return decodeURIComponent(percentEncoded);
            };
            const jsonString = base64ToUtf8(base64);

            const fixedJsonString = jsonString.replace(
                /"metadata_description":\s*"([^"]*(?:\\.[^"]*)*)"/g,
                (match, content) => {
                    const escaped = content.replace(/(?<!\\)"/g, '\\"');
                    return `"metadata_description": "${escaped}"`;
                }
            );

            const parsed = JSON.parse(fixedJsonString);
            this.report_obj = parsed;
            console.log('report_obj успешно загружен:', this.report_obj);
            await this.setActiveTab(0);
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
        }
    },

    async setActiveTab(tabIndex = 0) {
        try {
            console.log('[setActiveTab] tabIndex:', tabIndex);
            if (!this.report_obj || !this.report_obj.tab) {
                console.warn('report_obj ещё не загружен');
                return null;
            }
            const tab = this.report_obj.tab[tabIndex];
            if (!tab) throw new Error(`Вкладка с индексом ${tabIndex} не найдена`);

            this.selected_tab = tabIndex;
            console.log('[setActiveTab] tab:', tab);

            // Данных из БД нет — передаём null, prepareModelFromNewJSON сам создаст пустые строки
            const result = await this.prepareModelFromNewJSON(
                this.report_obj,
                null,
                tabIndex
            );
            console.log('[setActiveTab] результат prepareModelFromNewJSON:', result);

            this.js_report_data = result;
            storeValue('js_report_data', result);
            return result;
        } catch (error) {
            console.error('[setActiveTab] ошибка:', error);
            return null;
        }
    },

    async prepareModelFromNewJSON(newJson, dataArray = null, tabIndex = 0) {
			const tab = newJson.tab?.[tabIndex];
			if (!tab) throw new Error(`Tab ${tabIndex} not found`);

			const rowMetadata = tab.rowMetadata || [];
			const columnMetadata = tab.columnMetadata || [];

			// Если данных нет, создаём строки на основе rowMetadata, подставляя предзаполненные значения
			if (!dataArray) {
					const rowCount = rowMetadata.length || 0;
					const colCount = columnMetadata.length || 0;
					dataArray = Array.from({ length: rowCount }, (_, rowIndex) => {
							const meta = rowMetadata[rowIndex] || {};
							return columnMetadata.map((col, colIndex) => {
									const key = `column${col.column_order}`;
									return meta[key] ?? '';
							});
					});
			}

			const rowMetaByOrder = new Map(
					rowMetadata.map((rowMeta, index) => [
							rowMeta.row_order_id ?? rowMeta.row_id ?? index + 1,
							rowMeta,
					])
			);

			const resultRows = dataArray.map((row, rowIndex) => {
					const rowOrder = rowIndex + 1;
					const meta = rowMetaByOrder.get(rowOrder) ?? rowMetadata[rowIndex] ?? {};
					const columns = row.reduce((acc, cellValue, columnIndex) => {
							acc[`column${columnIndex + 1}`] = cellValue;
							return acc;
					}, {});
					return { ...meta, ...columns };
			});

			const {
					rowMetadata: _rm,
					columnMetadata: _cm,
					cellOverrides,
					span_mass,
					tableStyle,
					canAddRow,
					...tabMetadata
			} = tab;

			return {
					data: resultRows,
					columnMetadata,
					tabMetadata,
					canAddRow: canAddRow ?? tab.can_add_row ?? false,
					tableStyle: tableStyle ?? null,
					userPermissions: tab.userPermissions ?? 'report_edit', // добавлено
					selectedRowsIds: [],
					cellOverrides: cellOverrides ?? {},
					span_mass: span_mass ?? [],
					_tabKey: tabIndex + 1, 
			};
	}
};