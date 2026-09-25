export default {  
	regions: [
		{ inn: "7825660628", name: "Центральный", semanticKey: "central" },
		{ inn: "7814002313", name: "Приморский", semanticKey: "primorsky" },
		{ inn: "7804042349", name: "Калининский", semanticKey: "kalinin" },
		{ inn: "7810435274", name: "Московский", semanticKey: "moskovsky" },
		{ inn: "7813047833", name: "Петроградский", semanticKey: "petrograd" },
		{ inn: "7816053440", name: "Фрунзенский", semanticKey: "frunzensky" },
		{ inn: "7819000990", name: "Петродворцовый", semanticKey: "petrodvorets" },
		{ inn: "7801042446", name: "Василеостровский", semanticKey: "vasileostrov" },
		{ inn: "7806042263", name: "Красногвардейский", semanticKey: "krasnogvardeysky" },
		{ inn: "7818003903", name: "Кронштадтский", semanticKey: "kronshtadt" },
		{ inn: "7809029013", name: "Адмиралтейский", semanticKey: "admiralteysky" },
		{ inn: "7802047944", name: "Выборгский", semanticKey: "vyborg" },
		{ inn: "7805059546", name: "Кировский", semanticKey: "kirov" },
		{ inn: "7820033454", name: "Пушкинский", semanticKey: "pushkin" },
		{ inn: "7821007802", name: "Курортный", semanticKey: "kurort" },
		{ inn: "7811020096", name: "Невский", semanticKey: "nevsky" },
		{ inn: "7817006891", name: "Колпинский", semanticKey: "kolpino" },
		{ inn: "7807018464", name: "Красносельский", semanticKey: "krasnoselsky" },
		{ inn: "test_iogv1", name: "Тестовый", semanticKey: "test" },
		{ inn: "7830002053", name: "Комитет по образованию", semanticKey: "ko"},
		{ inn: "7808043833", name: "Комитет по здравоохранению", semanticKey: "kz"},
		{ inn: "7808025993", name: "Комитет по культуре", semanticKey: "kk"},
		{ inn: "7842005771", name: "Комитет по науке и высшей школе", semanticKey: "knvsh"},
		{ inn: "7825675663", name: "Комитет по социальной политике СПб", semanticKey: "ks"},
		{ inn: "7803050795", name: "Комитет по физической культуре и спорту", semanticKey: "kf"},
	],

    
	responsiblePersons: [
		{
			fio: "Трифонов Валентин Николаевич",
			phone: "---",
			semanticKeys: ["test"]
		},
		{
			fio: "Зайцева Алина Владимировна",
			phone: "88122415182",
			semanticKeys: ["central", "primorsky", "ko", "kz", "kk", "knvsh", "ks", "kf"]
		},
		{
			fio: "Баев Евгений Олегович",
			phone: "88122415183",
			semanticKeys: ["kalinin", "moskovsky", "petrograd"]
		},
		{
			fio: "Михайлова Олеся Васильевна",
			phone: "88122415175",
			semanticKeys: ["frunzensky", "petrodvorets"]
		},
		{
			fio: "Грешных Сергей Геннадьевич",
			phone: "88122461960",
			semanticKeys: ["vasileostrov", "krasnogvardeysky", "kronshtadt"]
		},
		{
			fio: "Маркина Инна Сергеевна",
			phone: "88122467643",
			semanticKeys: ["admiralteysky", "vyborg"]
		},
		{
			fio: "Князева Мария Глебовна",
			phone: "88122461918",
			semanticKeys: ["kirov", "pushkin"]
		},
		{
			fio: "Лифенко Дарья Александровна",
			phone: "88122461959",
			semanticKeys: ["kurort", "nevsky"]
		},
		{
			fio: "Полянина Екатерина Васильевна",
			phone: "88122467636",
			semanticKeys: ["kolpino", "krasnoselsky"]
		}
	],
	
	defaultResponsible: {
  	phone: "88122415182",
		fio: "СПб ГКУ ЦАД"
  },

   formatPhone(phone) {
		 if (!phone || phone === "---") return phone;

     const cleaned = String(phone).replace(/\D/g, '');

        // 11 цифр: 8XXXXXXXXXX или 7XXXXXXXXXX
		 if (cleaned.length === 11 && (cleaned[0] === '8' || cleaned[0] === '7')) {
			 return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9, 11)}`;
     }

        // 10 цифр: городской номер без кода страны
     if (cleaned.length === 10) {
			 return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8, 10)}`;
     }

        // Нестандартный формат — возвращаем как есть
     return phone;
   },

    	
	getResponsibleByInn(inn) {
  	const region = this.regions.find(r => r.inn === inn);

        // Регион не найден — возвращаем СПб ГКУ ЦАД
    if (!region) {
    	return {
      phone: this.formatPhone(this.defaultResponsible.phone),
			fio: this.defaultResponsible.fio
    }
	}
		
		const responsible = this.responsiblePersons.find(p =>
    	p.semanticKeys.includes(region.semanticKey)
    );

        // Ответственный для региона не найден — тоже fallback
    if (!responsible) {
    	return {
    		phone: this.formatPhone(this.defaultResponsible.phone),
      	fio: this.defaultResponsible.fio
      };
    }

    return {
    	phone: this.formatPhone(responsible.phone),
      fio: responsible.fio
   	};
  }
};