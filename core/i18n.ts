
export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

export const TRANSLATIONS: Record<string, any> = {
  en: {
    sync: 'SYNCHRONIZATION',
    user_name: 'Username',
    birth_label: 'Date and time of birth',
    name_placeholder: 'Your name...',
    footer_note: 'All data is stored locally in your browser, but it is highly recommended to save the contact file on your device.',
    profiles: 'Contacts', balance: 'Balance', activities: 'Activities', calendar: 'Calendar', maps: 'Maps',
    add: 'Add +', close: 'Close', save: 'Save to Base', status: 'Status',
    passed: 'Passed since birth:', days: 'd.', hours: 'h.', minutes: 'm.',
    risk_index: 'Cumulative Risk Index:', legend_crit: 'Critical', legend_low: 'Low', legend_opt: 'Optimal', legend_high: 'High', legend_super: 'Super High',
    map_atlas: 'Rhythm Atlas', map_return: 'Click to return', active: 'Active', inactive: 'Inactive',
    export: 'Export', import: 'Import', confirm_delete: 'Delete?', confirm_logout: 'Logout?', edit: 'Edit',
    yes: 'Yes', no: 'No', days_abbr: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    current_activities_desc: 'Displaying active windows for various processes.',
    group: 'Group', ungroup: 'Ungroup', group_placeholder: 'Group name...', rename: 'Rename', confirm_ungroup: 'Ungroup all?',
    compatibility: 'Compatibility', resonant: 'Resonant', optimal_compat: 'Optimal', polar: 'Polar',
    arena: 'Arena', arena_total: 'Total Ranking', arena_basic: 'Basic Ranking', arena_reactive: 'Reactive Ranking',
    remove_arena: 'Remove?', members_count: 'members'
  },
  ru: {
    sync: 'СИНХРОНИЗАЦИЯ',
    user_name: 'Имя пользователя',
    birth_label: 'Дата и время рождения',
    name_placeholder: 'Ваше имя...',
    footer_note: 'Все данные сохраняются локально в вашем браузере, но настоятельно рекомендуется сохранять файл контактов у себя на устройстве.',
    profiles: 'Контакты', balance: 'Баланс', activities: 'Актив', calendar: 'Календарь', maps: 'Карты',
    add: 'Добавить +', close: 'Закрыть', save: 'Сохранить в базу', status: 'Статус',
    passed: 'Прошло с рождения:', days: 'д.', hours: 'ч.', minutes: 'м.',
    risk_index: 'Совокупный индекс риска:', legend_crit: 'Критический', legend_low: 'Низкий', legend_opt: 'Оптимальный', legend_high: 'Высокий', legend_super: 'Сверхвысокий',
    map_atlas: 'Атлас ритмов', map_return: 'Кликните для возврата', active: 'Активно', inactive: 'Не активно',
    help_title: 'Инфоцентр', back: 'Назад', toggle_dvig: 'Двигательный', toggle_phys: 'Физический', toggle_sens: 'Сенсорный', toggle_anlt: 'Аналитический',
    help_core_title: 'ЯДРО RITMXOID',
    help_core_desc: 'Основано на алгоритмах Ритмического Ряда (РР). 4 базовых ритма:',
    help_motor_title: 'ДВИГАТЕЛЬНЫЙ (Эмоц.)', help_motor_desc: 'Костно-мышечная, нервная и кровеносная системы. Верхняя фаза — стимулятор активности.',
    help_phys_title: 'ФИЗИЧЕСКИЙ (Физиол.)', help_phys_desc: 'Био-структура, метаболизм и синтез белка.',
    help_sens_title: 'СЕНСОРНЫЙ (Информ.)', help_sens_desc: 'Адаптация и обработка информации.',
    help_anlt_title: 'АНАЛИТИЧЕСКИЙ', help_anlt_desc: 'Контроль и анализ процессов, доступных сознанию.',
    help_levels_title: 'УРОВНИ ЭНЕРГИИ',
    help_crit_desc: 'Пик уязвимости. Низкий фокус. Избегайте перегрузок и конфликтов.',
    help_low_desc: 'Усталость, раздражительность. Снижение самооценки и реакции.',
    help_opt_desc: 'Идеальный баланс. Лучшее время для принятия важных решений.',
    help_high_desc: 'Избыток энергии. Высокая работоспособность. Расходуйте силы равномерно.',
    help_super_desc: 'Нестабильное гипер-состояние. Риск перенапряжения.',
    help_risk_title: 'ФАКТОРЫ РИСКА (⚡)',
    help_risk_desc: '1⚡: Умеренный риск. 2⚡: Обострение хроники. 3⚡: Критический риск.',
    help_arena_title: 'РАНЖИРОВАНИЕ АРЕНЫ',
    help_arena_total: 'ПОЛНОЕ: Глобальное сравнение всех полей. Прогноз доминирования.',
    help_arena_basic: 'БАЗОВОЕ: Сравнение Двигательного + Физического. Лучший прогноз для спорта.',
    help_arena_reactive: 'РЕАКТИВНОЕ: Сенсорный + Аналитический. Для тактики и реакции.',
    help_balance_title: 'ПЛАНИРОВАНИЕ БАЛАНСА',
    help_balance_desc: 'Максимизируйте нагрузку на "пиках" и снижайте в "ямах" соответствующих ритмов.',
    help_activities_title: 'МЕХАНИКА АКТИВНОСТЕЙ',
    help_activities_desc: 'Попадание процессов жизнедеятельности в соответствующие интервалы активности, повышают фактические показатели ритмобаланса, по принципу резонанса.',
    help_maps_title: 'АТЛАС РИТМОВ',
    help_maps_desc: '9 диапазонов от Пульса (Микро 3.5) до Цикла жизни (Макро 3.5).',
    help_compat_title: 'ТИПЫ СОВМЕСТИМОСТИ',
    help_compat_polar: 'ПОЛЯРНАЯ: Эффективна для технических задач и инноваций.',
    help_compat_resonant: 'РЕЗОНАНСНАЯ: Подходит для развлечений и краткого общения.',
    help_compat_optimal: 'ОПТИМАЛЬНАЯ: Идеальна для долгих отношений.',
    export: 'Экспорт', import: 'Импорт', confirm_delete: 'Удалить?', confirm_logout: 'Выйти?', edit: 'Редакт.',
    yes: 'Да', no: 'Нет', days_abbr: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    current_activities_desc: 'Отображение активных окон для различных процессов.',
    group: 'Группа', ungroup: 'Разгруппировать', group_placeholder: 'Имя группы...', rename: 'Переименовать', confirm_ungroup: 'Разгруппировать все?',
    compatibility: 'Совместимость', resonant: 'Резонансная', optimal_compat: 'Оптимальная', polar: 'Полярная',
    arena: 'Арена', arena_total: 'Полное сравнение', arena_basic: 'Базовое сравнение', arena_reactive: 'Реактивное сравнение',
    remove_arena: 'Убрать?', members_count: 'чел.'
  }
};

export function getInitialLanguage(): string {
  const browserLang = navigator.language.split('-')[0];
  return TRANSLATIONS[browserLang] ? browserLang : 'en';
}

export const getT = (lang: string) => (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
