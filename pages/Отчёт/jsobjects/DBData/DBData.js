export default {

	js_report_data: null,
	report_obj: null,
	report:null,
	selected_tab:0,
	directory_inn:0,
	report_id:0,
	default_data:null,
	
	// необходимо для кэширования данных 
	tab_data_cache: {},   // ключ – номер вкладки (начиная с 1), значение – модель таблицы

	async getTestModel() {
		DBData.tab_data_cache = {};
		
		DBData.report_id = Number(appsmith.URL.queryParams.report_id);
    if (!DBData.report_id) {
    	throw new Error("report_id не найде");
    }
		
		DBData.directory_inn = appsmith.store.current_ou_id || appsmith.store.user?.directory_inn_id;
    if (!DBData.directory_inn) {
    	throw new Error("directory_inn_id не найден");
    }

		const report = (await DBData.getReport(DBData.report_id))[0]
		DBData.report = report
		const report_obj = JSON.parse(DBData.report.table_meta)
		DBData.report_obj = report_obj
		
		let reportJson = {};
		try {
				reportJson = JSON.parse(DBData.report.default_report_data_json || '{}');
		} catch (e) {
				console.error('Ошибка парсинга default_report_data_json', e);
		}

		await storeValue('report_info', {
				report_id: DBData.report.report_id,
				report_name: reportJson.report_name || 'Без названия',
				report_system_name: reportJson.report_system_name || '',
				report_description: reportJson.report_description || '',
				report_period_from: reportJson.report_period_from || null,
				report_period_to: reportJson.report_period_to || null
		});

		const result = await DBData.setActiveTab(1)
		return result
	},
	

	async setActiveTab(tabNumber = 1){
		
		const tabIndex = tabNumber - 1;
    const previousTabNumber = DBData.selected_tab; // сохраняем предыдущий номер

    DBData.selected_tab = tabNumber; // храним номер вкладки (1-based)

    const tab = DBData.report_obj.tab?.[tabIndex];
    if (!tab) throw new Error(`Вкладка ${tabNumber} не найдена`);

    // Сохраняем модель предыдущей вкладки в кэш (если была открыта)
    if (previousTabNumber && previousTabNumber !== tabNumber && typeof newTable !== 'undefined' && newTable?.model) {
        DBData.tab_data_cache[previousTabNumber] = { ...newTable.model };
    }

    // Используем tab_number вместо tab.id
    const tab_id = tab.id;

    let data = (await DBData.getReportData(
        DBData.report.report_shema_name,
        DBData.directory_inn,
        tab_id,
        DBData.report_id
    ))[0];

    console.log('Загружаем вкладку', tabNumber, 'tab_id =', tab_id);
    console.log('data from DB:', data);
		
		if (!data) {
				data = { report_data: JSON.stringify({ data: [] }) };
		}

    let data_obj;
    try {
        data_obj = JSON.parse(data.report_data);
        console.log('data_obj:', data_obj);
    } catch (e) {
        console.error('Ошибка парсинга report_data', e);
        data_obj = { data: [] };
    }
		
		let result = await DBData.mergeTableJson(DBData.report_obj, data_obj, tabIndex);
    DBData.js_report_data = result;
    DBData.tab_data_cache[tabNumber] = { ...result };
		storeValue('activeTab', tabNumber);

    return result;
},
	async changeTab(tabNumber) {
    await DBData.setActiveTab(tabNumber);
    storeValue('activeTab', tabNumber);
},

	mergeTableJson(metaJson, dataJson, tabIndex = 0) {
    const tab = metaJson.tab?.[tabIndex];
    if (!tab) throw new Error(`Не найден tab с индексом ${tabIndex}`);

    let rows = dataJson.data ?? [];
    const rowMetadata = tab.rowMetadata ?? [];
    const columnMetadata = tab.columnMetadata ?? [];

    // Если данных из БД нет, но есть предзаполненные строки в rowMetadata – используем их
    if (rows.length === 0 && rowMetadata.length > 0) {
        rows = rowMetadata.map(meta => {
            // Для каждой колонки ищем значение в meta по имени columnN
            return columnMetadata.map(col => meta[`column${col.column_order}`] ?? '');
        });
    }

    const rowMetaByOrder = new Map(
        rowMetadata.map((rowMeta, index) => [
            rowMeta.row_order_id ?? rowMeta.row_id ?? index + 1,
            rowMeta,
        ])
    );

    const resultRows = rows.map((row, rowIndex) => {
        const rowOrder = rowIndex + 1;
        const meta = rowMetaByOrder.get(rowOrder) ?? rowMetadata[rowIndex] ?? {};

        const fullMeta = {
            row_id: meta.row_id ?? rowOrder,
            is_editable: meta.is_editable ?? true,
            is_visible: meta.is_visible ?? true,
            row_background_color: meta.row_background_color ?? null,
            row_text_color: meta.row_text_color ?? null,
            span_row: meta.span_row ?? null,
            span_from: meta.span_from ?? null,
            row_order_id: meta.row_order_id ?? rowOrder,
            row_height: meta.row_height ?? null,
            ...(meta.is_user_added !== undefined && { is_user_added: meta.is_user_added }),
        };

        const columns = row.reduce((acc, cellValue, columnIndex) => {
            acc[`column${columnIndex + 1}`] = cellValue;
            return acc;
        }, {});

        return {
            ...fullMeta,
            ...columns,
        };
    });

    // Извлекаем cellOverrides и остальные поля из вкладки
    const {
        columnMetadata: _columnMetadata,
        rowMetadata: _rowMetadata,
        cellOverrides,
        ...tabMetadata
    } = tab;

    return {
        data: resultRows,
        columnMetadata,
        tabMetadata,
				canAddRow: appsmith.store.report_editable === false
        	? false
        	: (tab.canAddRow ?? tab.can_add_row ?? false),
        tableStyle: tab.tableStyle ?? null,
        userPermissions: appsmith.store.report_editable ? (tab.userPermissions ?? 'report_edit') : 'report_view',
        selectedRowsIds: tab.selectedRowsIds ?? [],
        cellOverrides: cellOverrides ?? {},
        span_mass: tab.span_mass ?? [],   // берём из вкладки
				_tabKey: tabIndex + 1,
    };
},

	async getReport(report_id){
		if (get_report.data != undefined && get_report.data.report_id === report_id)
			return get_report.data
		return await get_report.run({report_id: report_id})
	},

	async getReportData(report_shema_name, directory_inn, tab_id, report_id){
    const result = await get_report_data.run({
        report_shema_name: report_shema_name,
        directory_inn: directory_inn,
        tab_id: tab_id,
        report_id: report_id
    });
    // Если run() вернул объект с data, берём data, иначе сам массив
    return Array.isArray(result) ? result : result.data;
},

	async saveTestModel() {
		if (appsmith.store.report_editable === false) {
      showAlert('Отчёт находится на проверке или утверждён. Редактирование недоступно.', 'warning');
      return;
    }
    const report_shema_name = DBData.report.report_shema_name;
    const directory_inn = DBData.directory_inn;
    const status_id = 1;
    const tabs = DBData.report_obj.tab || [];

    for (let i = 0; i < tabs.length; i++) {
        const tabNumber = i + 1;
        const tab = tabs[i];
        if (!tab) continue;

        let model;
        if (tabNumber === DBData.selected_tab) {
            // Для активной вкладки всегда берём свежую модель из виджета
            if (typeof newTable !== 'undefined' && newTable?.model) {
                model = newTable.model;
            } else {
                console.warn('Не удалось получить модель активной вкладки из newTable');
                continue;
            }
        } else {
            model = DBData.tab_data_cache[tabNumber];
        }

        if (!model || !model.data) {
            console.warn(`Вкладка ${tabNumber} не открывалась, пропускаем`);
            continue;
        }

        const newData = await DBData.modelToData(model);
        const tab_id = tab.id; // используем tab_number

        console.log(`Сохранение вкладки ${tabNumber}, tab_id=${tab_id}`, newData);

        try {
            await DBData.saveReportData(
                report_shema_name,
                directory_inn,
                tab_id,
                DBData.report_id,
                status_id,
                JSON.stringify(newData)
            );
        } catch (e) {
            console.error(`Ошибка сохранения вкладки ${tabNumber}:`, e);
            showAlert(`Ошибка сохранения: ${e.message}`, 'error');
            return;
        }
    }

    showAlert('Все данные успешно сохранены', 'success');
},

	async modelToData(model){
		const newData = model.data.map(item => {
			const columnKeys = Object.keys(item)
			.filter(key => key.startsWith('column'))
			.sort((a, b) => {
				const numA = parseInt(a.replace('column', ''), 10);
				const numB = parseInt(b.replace('column', ''), 10);
				return numA - numB;
			});

			return columnKeys.map(key => item[key]);
		});
		return { data: newData };
	},

	async saveReportData(report_shema_name, directory_inn, tab_id, report_id, status_id, report_data) {
    await save_report_data.run({
        report_shema_name,
        directory_inn,
        tab_id,
        report_id,
        status_id,
        report_data
    });
	}	

};

//{{ DBData.js_report_data}}