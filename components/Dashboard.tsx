
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DateTime, Info } from 'luxon';
import { 
  calculateDaysGone, calculateFullBalance, calculateBasicBalance, calculateReactiveBalance, calculateSpecificRhythms, getRiskLevel, 
  COLORS, ACTIVITY_CONFIG, getActivitiesPack, MAP_NAMES, calculateMapAngles, calculateSecondsGone,
  getBalanceColor, calculateMoonAngle, calculateSunAngle, calculateEarthAngle
} from '../core/engine';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Profile } from '../types';

interface DashboardProps {
  profile: Profile;
  allProfiles: Profile[];
  onAddProfile: (name: string, date: string) => void;
  onUpdateProfile: (id: string, name: string, date: string) => void;
  onDeleteProfile: (id: string) => void;
  onGroupProfiles: (ids: string[], groupName: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onUngroup: (groupName: string) => void;
  onMoveToGroup: (id: string, groupName: string | null) => void;
  onSelectProfile: (id: string) => void;
  onReset: () => void;
  onImportProfiles: (profiles: Profile[]) => void;
  onLogout: () => void;
}

type Tab = 'PROFILES' | 'BALANCE' | 'ACTIVITIES' | 'CALENDAR' | 'MAPS';
type ListMode = 'NONE' | 'EDIT' | 'DELETE' | 'SELECT';
type ArenaMode = 'TOTAL' | 'BASIC' | 'REACTIVE';

const LANGUAGES = [
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

const TRANSLATIONS: Record<string, any> = {
  en: {
    profiles: 'Contacts', balance: 'Balance', activities: 'Activities', calendar: 'Calendar', maps: 'Maps',
    add: 'Add +', close: 'Close', save: 'Save to Base', name_placeholder: 'Name...', status: 'Status',
    passed: 'Passed since birth:', days: 'd.', hours: 'h.', minutes: 'm.',
    risk_index: 'Cumulative Risk Index:', legend_crit: 'Critical', legend_low: 'Low', legend_opt: 'Optimal', legend_high: 'High', legend_super: 'Super High',
    map_atlas: 'Rhythm Atlas', map_return: 'Click to return', active: 'Active', inactive: 'Inactive',
    help_title: 'Information Center', back: 'Back', toggle_dvig: 'Motor', toggle_phys: 'Physical', toggle_sens: 'Sensory', toggle_anlt: 'Analytic',
    help_core_title: 'RITMXOID CORE',
    help_core_desc: 'Assessment of current and predicted states of basic human rhythmic fields based on the Rhythmic Series (RS) concept. 4 core rhythms:',
    help_motor_title: 'MOTOR (Emotional)', help_motor_desc: 'Muscular, nervous and circulatory systems. High phase stims muscular activity.',
    help_phys_title: 'PHYSICAL (Physiological)', help_phys_desc: 'Bio-structure and metabolism. High phase activates thyroid hormones.',
    help_sens_title: 'SENSORY (Informational)', help_sens_desc: 'Adaptation and info processing via endocrine and immune systems.',
    help_anlt_title: 'ANALYTICAL', help_anlt_desc: 'Conscious and subconscious control. Only high phase is initialized.',
    help_levels_title: 'ENERGY LEVELS',
    help_crit_desc: 'Peak vulnerability. Avoid extreme stress and conflicts.',
    help_low_desc: 'Fatigue, irritability. Reduced reaction and self-esteem.',
    help_opt_desc: 'Perfect balance. Best time for important decisions.',
    help_high_desc: 'Energy surplus. High work capacity. Spend energy evenly.',
    help_super_desc: 'Unstable hyper-state. High risk of overstrain.',
    help_risk_title: 'RISK FACTORS (⚡)',
    help_risk_desc: '1⚡: Moderate. 2⚡: Chronic flare-up risk. 3⚡: Critical risk, avoid travel.',
    help_arena_title: 'ARENA RANKING',
    help_arena_total: 'TOTAL RANK: Global comparison of all fields. Domination forecast.',
    help_arena_basic: 'BASIC RANK: Motor + Physical rhythms. Best for sports and labor.',
    help_arena_reactive: 'REACTIVE RANK: Sensory + Analytical. For tactics and reaction.',
    help_balance_title: 'BALANCE PLANNING',
    help_balance_desc: 'Increase load during "peaks" and reduce it during "pits" of corresponding rhythms.',
    help_activities_title: 'ACTIVITIES MECHANISM',
    help_activities_desc: 'Biological processes falling into the corresponding activity intervals increase the actual rhythm-balance indicators, based on the resonance principle.',
    help_maps_title: 'RHYTHM ATLAS',
    help_maps_desc: '9 fractal ranges from Pulse (Micro 3.5) to Life Cycle (Macro 3.5).',
    help_compat_title: 'COMPATIBILITY TYPES',
    help_compat_polar: 'POLAR: Effective for technical tasks and innovation.',
    help_compat_resonant: 'RESONANT: Good for short interaction and fun.',
    help_compat_optimal: 'OPTIMAL: Best for long-term (family) relations.',
    export: 'Export', import: 'Import', confirm_delete: 'Delete?', confirm_logout: 'Logout?', edit: 'Edit',
    yes: 'Yes', no: 'No', days_abbr: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    current_activities_desc: 'Displaying active windows for various processes.',
    group: 'Group', ungroup: 'Ungroup', group_placeholder: 'Group name...', rename: 'Rename', confirm_ungroup: 'Ungroup all?',
    compatibility: 'Compatibility', resonant: 'Resonant', optimal_compat: 'Optimal', polar: 'Polar',
    arena: 'Arena', arena_total: 'Total Ranking', arena_basic: 'Basic Ranking', arena_reactive: 'Reactive Ranking',
    remove_arena: 'Remove?', members_count: 'members'
  },
  ru: {
    profiles: 'Контакты', balance: 'Баланс', activities: 'Актив', calendar: 'Календарь', maps: 'Карты',
    add: 'Добавить +', close: 'Закрыть', save: 'Сохранить в базу', name_placeholder: 'Имя...', status: 'Статус',
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
  },
  es: {
    profiles: 'Contactos', balance: 'Equilibrio', activities: 'Actividad', calendar: 'Calendario', maps: 'Mapas',
    add: 'Añadir +', close: 'Cerrar', save: 'Guardar', name_placeholder: 'Nombre...', status: 'Estado',
    passed: 'Desde el nacimiento:', days: 'd.', hours: 'h.', minutes: 'm.',
    risk_index: 'Índice de Riesgo:', legend_crit: 'Crítico', legend_low: 'Bajo', legend_opt: 'Óptimo', legend_high: 'Alto', legend_super: 'Muy Alto',
    map_atlas: 'Atlas rítmico', map_return: 'Clic para volver', active: 'Activo', inactive: 'Inactivo',
    help_title: 'Centro de Info', back: 'Atrás', toggle_dvig: 'Motor', toggle_phys: 'Físico', toggle_sens: 'Sensorial', toggle_anlt: 'Analítico',
    help_core_title: 'NÚCLEO RITMXOID',
    help_core_desc: 'Evaluación de estados rítmicos basada en la Serie Rítmica. 4 ritmos:',
    help_motor_title: 'MOTOR (Emocional)', help_motor_desc: 'Sistemas muscular y circulatorio. Fase alta estimula actividad física.',
    help_phys_title: 'FÍSICO (Fisiológico)', help_phys_desc: 'Bioestructura y metabolismo.',
    help_sens_title: 'SENSORIAL', help_sens_desc: 'Adaptación y procesamiento de información.',
    help_anlt_title: 'ANALÍTICO', help_anlt_desc: 'Control consciente. Solo fase alta inicializada.',
    help_levels_title: 'NIVELES DE ENERGÍA',
    help_crit_desc: 'Vulnerabilidad máxima. Evite el estrés extremo.',
    help_low_desc: 'Fatiga e irritabilidad.',
    help_opt_desc: 'Equilibrio perfecto. Ideal para decisiones.',
    help_high_desc: 'Exceso de energía.',
    help_super_desc: 'Hiperestado inestable.',
    help_risk_title: 'FACTORES DE RIESGO',
    help_risk_desc: '1⚡: Moderado. 2⚡: Riesgo crónico. 3⚡: Crítico.',
    help_arena_title: 'RANGO DE ARENA',
    help_arena_total: 'TOTAL: Comparación global de campos.',
    help_arena_basic: 'BÁSICO: Ritmos Motor y Físico.',
    help_arena_reactive: 'REACTIVO: Sensorial y Analítico.',
    help_balance_title: 'PLANIFICACIÓN',
    help_balance_desc: 'Aumente carga en picos y reduzca en valles.',
    help_activities_title: 'ACTIVIDADES',
    help_activities_desc: 'Procesos biológicos en intervalos específicos aumentan el equilibrio por resonancia.',
    help_maps_title: 'ATLAS RÍTMICO',
    help_maps_desc: '9 rangos fractales desde Pulso hasta Ciclo de Vida.',
    help_compat_title: 'COMPATIBILIDAD',
    help_compat_polar: 'POLAR: Eficaz para innovación.',
    help_compat_resonant: 'RESONANTE: Para interacción corta.',
    help_compat_optimal: 'ÓPTIMA: Para relaciones largas.',
    export: 'Exportar', import: 'Importar', confirm_delete: '¿Borrar?', confirm_logout: '¿Salir?', edit: 'Edit.',
    yes: 'Sí', no: 'No', days_abbr: ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'],
    current_activities_desc: 'Ventanas activas para varios procesos.',
    group: 'Grupo', ungroup: 'Desagrupar', group_placeholder: 'Nombre del grupo...', rename: 'Renombrar', confirm_ungroup: '¿Desagrupar todo?',
    compatibility: 'Compatibilidad', resonant: 'Resonante', optimal_compat: 'Óptima', polar: 'Polar',
    arena: 'Arena', arena_total: 'Total', arena_basic: 'Básico', arena_reactive: 'Reactivo',
    remove_arena: '¿Quitar?', members_count: 'miembros'
  },
  de: {
    profiles: 'Kontakte', balance: 'Bilanz', activities: 'Aktivität', calendar: 'Kalender', maps: 'Karten',
    add: 'Neu +', close: 'Schließen', save: 'Speichern', name_placeholder: 'Name...', status: 'Status',
    passed: 'Seit Geburt:', days: 'T.', hours: 'Std.', minutes: 'Min.',
    risk_index: 'Risiko-Index:', legend_crit: 'Kritisch', legend_low: 'Niedrig', legend_opt: 'Optimal', legend_high: 'Hoch', legend_super: 'Sehr Hoch',
    map_atlas: 'Rhythmus-Atlas', map_return: 'Klicken zum Zurückkehren', active: 'Aktiv', inactive: 'Inaktiv',
    help_title: 'Info-Zentrum', back: 'Zurück', toggle_dvig: 'Motorisch', toggle_phys: 'Physisch', toggle_sens: 'Sensorisch', toggle_anlt: 'Analytisch',
    help_core_title: 'RITMXOID KERN',
    help_core_desc: 'Bewertung rst-basierter rhythmischer Felder. 4 Kernrhythmen:',
    help_motor_title: 'MOTORISCH', help_motor_desc: 'Muskel- und Kreislaufsystem.',
    help_phys_title: 'PHYSISCH', help_phys_desc: 'Stoffwechsel und Biostruktur.',
    help_sens_title: 'SENSORISCH', help_sens_desc: 'Info-Verarbeitung.',
    help_anlt_title: 'ANALYTISCH', help_anlt_desc: 'Bewusste Kontrolle.',
    help_levels_title: 'ENERGIENIVEAUS',
    help_crit_desc: 'Höchste Verletzlichkeit.',
    help_low_desc: 'Müdigkeit und Reizbarkeit.',
    help_opt_desc: 'Perfekte Balance.',
    help_high_desc: 'Energieüberschuss.',
    help_super_desc: 'Instabiler Hyperzustand.',
    help_risk_title: 'RISIKOFAKTOREN',
    help_risk_desc: '1⚡: Moderat. 2⚡: Chronisch. 3⚡: Kritisch.',
    help_arena_title: 'ARENA RANKING',
    help_arena_total: 'TOTAL: Globaler Vergleich.',
    help_arena_basic: 'BASIS: Motorisch + Physisch.',
    help_arena_reactive: 'REAKTIV: Sensorisch + Analytisch.',
    help_balance_title: 'PLANUNG',
    help_balance_desc: 'Last in Peaks erhöhen, in Tiefs senken.',
    help_activities_title: 'AKTIVITÄTEN',
    help_activities_desc: 'Biologische Prozesse im Resonanzprinzip.',
    help_maps_title: 'RHYTHMUS-ATLAS',
    help_maps_desc: '9 fraktale Bereiche.',
    help_compat_title: 'KOMPATIBILITÄT',
    help_compat_polar: 'POLAR: Für Innovation.',
    help_compat_resonant: 'RESONANT: Für kurze Treffen.',
    help_compat_optimal: 'OPTIMAL: Für lange Beziehungen.',
    export: 'Export', import: 'Import', confirm_delete: 'Löschen?', confirm_logout: 'Logout?', edit: 'Edit.',
    yes: 'Ja', no: 'Nein', days_abbr: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'],
    current_activities_desc: 'Aktive Fenster für Prozesse.',
    group: 'Gruppe', ungroup: 'Auflösen', group_placeholder: 'Gruppenname...', rename: 'Umbenennen', confirm_ungroup: 'Alle auflösen?',
    compatibility: 'Kompatibilität', resonant: 'Resonant', optimal_compat: 'Optimal', polar: 'Polar',
    arena: 'Arena', arena_total: 'Gesamt', arena_basic: 'Basis', arena_reactive: 'Reaktiv',
    remove_arena: 'Entfernen?', members_count: 'mitglieder'
  },
  fr: {
    profiles: 'Contacts', balance: 'Équilibre', activities: 'Activités', calendar: 'Calendrier', maps: 'Cartes',
    add: 'Ajouter +', close: 'Fermer', save: 'Enregistrer', name_placeholder: 'Nom...', status: 'Statut',
    passed: 'Depuis la naissance :', days: 'j.', hours: 'h.', minutes: 'm.',
    risk_index: 'Indice de risque :', legend_crit: 'Critique', legend_low: 'Bas', legend_opt: 'Optimal', legend_high: 'Haut', legend_super: 'Très Haut',
    map_atlas: 'Atlas rythmique', map_return: 'Cliquer pour retour', active: 'Actif', inactive: 'Inactif',
    help_title: 'Centre d\'Info', back: 'Retour', toggle_dvig: 'Moteur', toggle_phys: 'Physique', toggle_sens: 'Sensoriel', toggle_anlt: 'Analytique',
    help_core_title: 'CŒUR RITMXOID',
    help_core_desc: 'Évaluation des états rythmiques humains. 4 rythmes :',
    help_motor_title: 'MOTEUR', help_motor_desc: 'Systèmes musculaire et nerveux.',
    help_phys_title: 'PHYSIQUE', help_phys_desc: 'Métabolisme et biostructure.',
    help_sens_title: 'SENSORIEL', help_sens_desc: 'Traitement de l\'info.',
    help_anlt_title: 'ANALYTIQUE', help_anlt_desc: 'Contrôle conscient.',
    help_levels_title: 'NIVEAUX D\'ÉNERGIE',
    help_crit_desc: 'Vulnérabilité maximale.',
    help_low_desc: 'Fatigue, irritabilité.',
    help_opt_desc: 'Équilibre parfait.',
    help_high_desc: 'Surplus d\'énergie.',
    help_super_desc: 'Hyper-état instable.',
    help_risk_title: 'FACTEURS DE RISQUE',
    help_risk_desc: '1⚡: Modéré. 2⚡: Chronique. 3⚡: Critique.',
    help_arena_title: 'CLASSEMENT ARENA',
    help_arena_total: 'TOTAL : Comparaison globale.',
    help_arena_basic: 'BASIQUE : Moteur + Physique.',
    help_arena_reactive: 'RÉACTIF : Sensoriel + Analytique.',
    help_balance_title: 'PLANIFICATION',
    help_balance_desc: 'Augmenter la charge aux pics.',
    help_activities_title: 'MÉCANISME',
    help_activities_desc: 'Principe de résonance biologique.',
    help_maps_title: 'ATLAS RYTHMIQUE',
    help_maps_desc: '9 plages fractales.',
    help_compat_title: 'COMPATIBILITÉ',
    help_compat_polar: 'POLAIRE : Pour l\'innovation.',
    help_compat_resonant: 'RÉSONANTE : Interaction courte.',
    help_compat_optimal: 'OPTIMALE : Long terme.',
    export: 'Exporter', import: 'Importer', confirm_delete: 'Supprimer ?', confirm_logout: 'Quitter ?', edit: 'Edit.',
    yes: 'Oui', no: 'Non', days_abbr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
    current_activities_desc: 'Fenêtres actives pour les processus.',
    group: 'Groupe', ungroup: 'Dégrouper', group_placeholder: 'Nom du groupe...', rename: 'Renommer', confirm_ungroup: 'Tout dégrouper ?',
    compatibility: 'Compatibilité', resonant: 'Résonante', optimal_compat: 'Optimale', polar: 'Polaire',
    arena: 'Arena', arena_total: 'Total', arena_basic: 'Basique', arena_reactive: 'Réactif',
    remove_arena: 'Enlever ?', members_count: 'membres'
  },
  pt: {
    profiles: 'Contactos', balance: 'Equilíbrio', activities: 'Atividades', calendar: 'Calendário', maps: 'Mapas',
    add: 'Novo +', close: 'Fechar', save: 'Salvar', name_placeholder: 'Nome...', status: 'Estado',
    passed: 'Desde o nascimento:', days: 'd.', hours: 'h.', minutes: 'm.',
    risk_index: 'Índice de Risco:', legend_crit: 'Crítico', legend_low: 'Baixo', legend_opt: 'Ótimo', legend_high: 'Alto', legend_super: 'Super Alto',
    map_atlas: 'Atlas Rítmico', map_return: 'Clique para voltar', active: 'Ativo', inactive: 'Inativo',
    help_title: 'Centro de Info', back: 'Voltar', toggle_dvig: 'Motor', toggle_phys: 'Físico', toggle_sens: 'Sensorial', toggle_anlt: 'Analítico',
    help_core_title: 'NÚCLEO RITMXOID',
    help_core_desc: 'Avaliação rítmica humana. 4 ritmos principais:',
    help_motor_title: 'MOTOR', help_motor_desc: 'Sistemas muscular e nervoso.',
    help_phys_title: 'FÍSICO', help_phys_desc: 'Metabolismo e estrutura.',
    help_sens_title: 'SENSORIAL', help_sens_desc: 'Processamento de info.',
    help_anlt_title: 'ANALÍTICO', help_anlt_desc: 'Controle consciente.',
    help_levels_title: 'NÍVEIS DE ENERGIA',
    help_crit_desc: 'Vulnerabilidade máxima.',
    help_low_desc: 'Fadiga e irritação.',
    help_opt_desc: 'Equilíbrio perfeito.',
    help_high_desc: 'Excesso de energia.',
    help_super_desc: 'Estado inestável.',
    help_risk_title: 'RISCOS',
    help_risk_desc: '1⚡: Moderado. 2⚡: Crônico. 3⚡: Crítico.',
    help_arena_title: 'ARENA',
    help_arena_total: 'TOTAL: Comparação global.',
    help_arena_basic: 'BÁSICO: Motor + Físico.',
    help_arena_reactive: 'REATIVO: Sensorial + Analítico.',
    help_balance_title: 'PLANEAMENTO',
    help_balance_desc: 'Carga nos picos, repouso nos vales.',
    help_activities_title: 'MECANISMO',
    help_activities_desc: 'Ressonância biológica.',
    help_maps_title: 'ATLAS RÍTMICO',
    help_maps_desc: '9 faixas fractais.',
    help_compat_title: 'COMPATIBILIDADE',
    help_compat_polar: 'POLAR: Para inovação.',
    help_compat_resonant: 'RESSONANTE: Lazer.',
    help_compat_optimal: 'OPTIMAL: Longo prazo.',
    export: 'Exportar', import: 'Importar', confirm_delete: 'Excluir?', confirm_logout: 'Sair?', edit: 'Edit.',
    yes: 'Sim', no: 'Não', days_abbr: ['Se', 'Te', 'Qu', 'Qu', 'Se', 'Sá', 'Do'],
    current_activities_desc: 'Janelas ativas de processos.',
    group: 'Grupo', ungroup: 'Desagrupar', group_placeholder: 'Nome do grupo...', rename: 'Renombrar', confirm_ungroup: 'Desagrupar tudo?',
    compatibility: 'Compatibilidade', resonant: 'Ressonante', optimal_compat: 'Ótima', polar: 'Polar',
    arena: 'Arena', arena_total: 'Total', arena_basic: 'Básico', arena_reactive: 'Reativo',
    remove_arena: 'Remover?', members_count: 'membros'
  },
  zh: {
    profiles: '联系人', balance: '平衡', activities: '活动', calendar: '日历', maps: '图表',
    add: '添加 +', close: '关闭', save: '保存到库', name_placeholder: '姓名...', status: '状态',
    passed: '出生以来已过:', days: '天', hours: '时', minutes: '分',
    risk_index: '累积风险指数:', legend_crit: '临界', legend_low: '低', legend_opt: '理想', legend_high: '高', legend_super: '极高',
    map_atlas: '节奏地图', map_return: '点击返回', active: '活动', inactive: '不活动',
    help_title: '信息中心', back: '返回', toggle_dvig: '动力', toggle_phys: '身体', toggle_sens: '感官', toggle_anlt: '分析',
    help_core_title: 'RITMXOID 核心',
    help_core_desc: '基于节奏系列（RS）概念的人体节奏场评估。4大核心节奏：',
    help_motor_title: '动力 (情绪)', help_motor_desc: '肌肉、神经和循环系统。高相位刺激肌肉活动。',
    help_phys_title: '身体 (生理)', help_phys_desc: '生物结构和新陈代谢。',
    help_sens_title: '感官 (信息)', help_sens_desc: '通过内分泌和免疫系统进行信息处理。',
    help_anlt_title: '分析', help_anlt_desc: '意识和潜意识控制。仅初始化高相位。',
    help_levels_title: '能量水平',
    help_crit_desc: '巅峰脆弱期。避免极端压力和冲突。',
    help_low_desc: '疲劳，易怒。反应力下降。',
    help_opt_desc: '完美平衡。重大决策的最佳时机。',
    help_high_desc: '能量充沛。高工作效率。',
    help_super_desc: '不稳定的过度状态。高应激风险。',
    help_risk_title: '风险因素 (⚡)',
    help_risk_desc: '1⚡: 中度。2⚡: 慢性病发作风险。3⚡: 临界风险，避免旅行。',
    help_arena_title: '竞技场排名',
    help_arena_total: '总排名：所有领域的全球对比。',
    help_arena_basic: '基础排名：动力 + 身体节奏。适用于运动和体力劳动。',
    help_arena_reactive: '反应排名：感官 + 分析。适用于战术和反应。',
    help_balance_title: '平衡规划',
    help_balance_desc: '在“高峰”期间增加负荷，在“低谷”期间减少负荷。',
    help_activities_title: '活动机制',
    help_activities_desc: '符合节奏间隔的生物过程会通过共振原理提高平衡指标。',
    help_maps_title: '节奏地图',
    help_maps_desc: '从脉搏（微观3.5）到生命周期（宏观3.5）的9个分形范围。',
    help_compat_title: '兼容性类型',
    help_compat_polar: '极性：对于技术任务和创新非常有效。',
    help_compat_resonant: '共振：适合短期互动和娱乐。',
    help_compat_optimal: '理想：最适合长期（家庭）关系。',
    export: '导出', import: '导入', confirm_delete: '删除？', confirm_logout: '注销？', edit: '编辑',
    yes: '是', no: '否', days_abbr: ['一', '二', '三', '四', '五', '六', '日'],
    current_activities_desc: '显示各种过程的活动窗口。',
    group: '分组', ungroup: '解散', group_placeholder: '组名...', rename: '重命名', confirm_ungroup: '解散所有组？',
    compatibility: '兼容性', resonant: '共振型', optimal_compat: '理想型', polar: '极性型',
    arena: '竞技场', arena_total: '总排名', arena_basic: '基础排名', arena_reactive: '反应排名',
    remove_arena: '移除？', members_count: '成员'
  },
  ja: {
    profiles: '連絡先', balance: 'バランス', activities: '活動', calendar: 'カレンダー', maps: 'マップ',
    add: '追加 +', close: '閉じる', save: '保存', name_placeholder: '名前...', status: 'ステータス',
    passed: '生後経過:', days: '日', hours: '時間', minutes: '分',
    risk_index: '累計リスク指数:', legend_crit: '臨界', legend_low: '低', legend_opt: '最適', legend_high: '高', legend_super: '極高',
    map_atlas: 'リズム図譜', map_return: '戻る', active: 'アクティブ', inactive: '非アクティブ',
    help_title: '情報センター', back: '戻る', toggle_dvig: '運動', toggle_phys: '身体', toggle_sens: '感覚', toggle_anlt: '分析',
    help_core_title: 'RITMXOID コア',
    help_core_desc: 'リズムシリーズ（RS）概念に基づくリズム場評価。4つの核心リズム：',
    help_motor_title: '運動 (情緒)', help_motor_desc: '筋肉、循環器系。高相は身体活動を刺激。',
    help_phys_title: '身体 (生理)', help_phys_desc: '生体構造と代謝。',
    help_sens_title: '感覚 (情報)', help_sens_desc: '情報の適応と処理。',
    help_anlt_title: '分析', help_anlt_desc: '意識的制御。高相のみ。',
    help_levels_title: 'エネルギーレベル',
    help_crit_desc: '脆弱性のピーク。極度のストレスを避けてください。',
    help_low_desc: '疲労、苛立ち。',
    help_opt_desc: '完璧なバランス。意思決定に最適。',
    help_high_desc: 'エネルギー過剰。高い作業能力。',
    help_super_desc: '不安定な過緊張状態。',
    help_risk_title: 'リスク要因 (⚡)',
    help_risk_desc: '1⚡: 中程度。2⚡: 慢性リスク。3⚡: 臨界リスク。',
    help_arena_title: 'アリーナ・ランキング',
    help_arena_total: '総合ランク: 全分野の比較。',
    help_arena_basic: '基本ランク: 運動 + 身体。',
    help_arena_reactive: '反応ランク: 感覚 + 分析。',
    help_balance_title: 'バランス計画',
    help_balance_desc: 'ピーク時に負荷を上げ、ピット時に下げます。',
    help_activities_title: '活動メカニズム',
    help_activities_desc: '共鳴의 原理に基づき、特定の間隔で活動を行うとバランスが向上します。',
    help_maps_title: 'リズム図譜',
    help_maps_desc: 'パルスからライフサイクルまで。',
    help_compat_title: '相性タイプ',
    help_compat_polar: '極性: 技術的課題や革新に効果的。',
    help_compat_resonant: '共鳴: 短期の交流や娯楽に。',
    help_compat_optimal: '最適: 長期（家族）関係に最良。',
    export: 'エクスポート', import: 'インポート', confirm_delete: '削除しますか？', confirm_logout: 'ログアウトしますか？', edit: '編集',
    yes: 'はい', no: 'いいえ', days_abbr: ['月', '火', '水', '木', '金', '土', '日'],
    current_activities_desc: '各プロセスの活動中ウィンドウ。',
    group: 'グループ', ungroup: '解除', group_placeholder: 'グループ名...', rename: '名前変更', confirm_ungroup: 'すべて解除しますか？',
    compatibility: '相性', resonant: '共鳴型', optimal_compat: '最適型', polar: '極性型',
    arena: 'アリーナ', arena_total: '総合', arena_basic: '基本', arena_reactive: '反応',
    remove_arena: '削除？', members_count: '名'
  },
  ar: {
    profiles: 'جهات الاتصال', balance: 'التوازن', activities: 'الأنشطة', calendar: 'التقويم', maps: 'الخرائط',
    add: 'إضافة +', close: 'إغلاق', save: 'حفظ', name_placeholder: 'الاسم...', status: 'الحالة',
    passed: 'منذ الولادة:', days: 'يوم', hours: 'ساعة', minutes: 'دقيقة',
    risk_index: 'مؤشر المخاطر:', legend_crit: 'حرِج', legend_low: 'منخفض', legend_opt: 'مثالي', legend_high: 'مرتفع', legend_super: 'مرتفع جداً',
    map_atlas: 'أطلس الإيقاع', map_return: 'اضغط للعودة', active: 'نشط', inactive: 'خامل',
    help_title: 'مركز المعلومات', back: 'عودة', toggle_dvig: 'حركي', toggle_phys: 'جسدي', toggle_sens: 'حسي', toggle_anlt: 'تحليلي',
    help_core_title: 'جوهر RITMXOID',
    help_core_desc: 'تقييم الحقول الإيقاعية بناءً على السلسلة الإيقاعية (RS). 4 إيقاعات:',
    help_motor_title: 'حركي (عاطفي)', help_motor_desc: 'العضلات والدورة الدموية.',
    help_phys_title: 'جسدي (فسيولوجي)', help_phys_desc: 'التمثيل الغذائي وهيكل الجسم.',
    help_sens_title: 'حسي (معلوماتي)', help_sens_desc: 'معالجة المعلومات والتكيف.',
    help_anlt_title: 'تحليلي', help_anlt_desc: 'السيطرة الواعية.',
    help_levels_title: 'مستويات الطاقة',
    help_crit_desc: 'ذروة الضعف. تجنب الإجهاد والنزاعات.',
    help_low_desc: 'تعب وسرعة غضب.',
    help_opt_desc: 'توازن مثالي. الأفضل للقرارات.',
    help_high_desc: 'فائض في الطاقة.',
    help_super_desc: 'حالة غير مستقرة.',
    help_risk_title: 'عوامل الخطر (⚡)',
    help_risk_desc: '1⚡: معتدل. 2⚡: خطر مزمن. 3⚡: خطر حرِج.',
    help_arena_title: 'تصنيف الحلبة',
    help_arena_total: 'تصنيف عام لجميع الحقول.',
    help_arena_basic: 'تصنيف أساسي: حركي + جسدي.',
    help_arena_reactive: 'تصنيف تفاعلي: حسي + تحليلي.',
    help_balance_title: 'تخطيط التوازن',
    help_balance_desc: 'زيادة الأحمال عند "القمم".',
    help_activities_title: 'آلية الأنشطة',
    help_activities_desc: 'العمليات البيولوجية في فترات محددة تزيد التوازن بمبدأ الرنين.',
    help_maps_title: 'أطلس الإيقاع',
    help_maps_desc: '9 نطاقات من النبض إلى دورة الحياة.',
    help_compat_title: 'أنواع التوافق',
    help_compat_polar: 'قطبي: فعال للمهام التقنية والابتكار.',
    help_compat_resonant: 'رنيني: للتفاعل القصير والمرح.',
    help_compat_optimal: 'مثالي: للعلاقات طويلة الأمد (العائلة).',
    export: 'تصدير', import: 'استيراد', confirm_delete: 'حذف؟', confirm_logout: 'خروج؟', edit: 'تعديل',
    yes: 'نعم', no: 'لا', days_abbr: ['اث', 'ثلاث', 'اربع', 'خمس', 'جمعة', 'سبت', 'احد'],
    current_activities_desc: 'عرض النوافذ النشطة لمختلف العمليات.',
    group: 'مجموعة', ungroup: 'فك المجموعة', group_placeholder: 'اسم المجموعة...', rename: 'تغيير الاسم', confirm_ungroup: 'فك الجميع؟',
    compatibility: 'التوافق', resonant: 'رنيني', optimal_compat: 'مثالي', polar: 'قطبي',
    arena: 'الحلبة', arena_total: 'إجمالي', arena_basic: 'أساسي', arena_reactive: 'تفاعلي',
    remove_arena: 'إزالة؟', members_count: 'أعضاء'
  },
  hi: {
    profiles: 'संपर्क', balance: 'संतुलन', activities: 'गतिविधियां', calendar: 'कैलेंडर', maps: 'मानचित्र',
    add: 'जोड़ें +', close: 'बंद करें', save: 'सुरक्षित करें', name_placeholder: 'नाम...', status: 'स्थिति',
    passed: 'जन्म के बाद से:', days: 'दिन', hours: 'घंटे', minutes: 'मिनट',
    risk_index: 'कुल जोखिम सूचकांक:', legend_crit: 'नाजुक', legend_low: 'कम', legend_opt: 'इष्टतम', legend_high: 'उच्च', legend_super: 'अत्यधिक उच्च',
    map_atlas: 'लय एटलस', map_return: 'वापसी के लिए क्लिक करें', active: 'सक्रिय', inactive: 'निष्क्रिय',
    help_title: 'सूचना केंद्र', back: 'पीछे', toggle_dvig: 'मोटर', toggle_phys: 'शारीरिक', toggle_sens: 'संवेदी', toggle_anlt: 'विश्लेषणात्मक',
    help_core_title: 'RITMXOID कोर',
    help_core_desc: 'रिदमिक सीरीज (RS) अवधारणा पर आधारित मानवीय लय क्षेत्रों का मूल्यांकन। 4 मुख्य लय:',
    help_motor_title: 'मोटर (भावनात्मक)', help_motor_desc: 'मांसपेशियों और संचार प्रणाली। उच्च चरण सक्रियता को बढ़ाता है।',
    help_phys_title: 'शारीरिक (फिजियोलॉजिकल)', help_phys_desc: 'शरीर संरचना और चयापचय।',
    help_sens_title: 'संवेदी (सूचनात्मक)', help_sens_desc: 'अनुकूलन और सूचना प्रसंस्करण।',
    help_anlt_title: 'विश्लेषणात्मक', help_anlt_desc: 'सचेत नियंत्रण। केवल उच्च चरण प्रारंभ।',
    help_levels_title: 'ऊर्जा स्तर',
    help_crit_desc: 'चरम संवेदनशीलता। तनाव और संघर्ष से बचें।',
    help_low_desc: 'थकान, चिड़चिड़ापन। प्रतिक्रिया में कमी।',
    help_opt_desc: 'पूर्ण संतुलन। महत्वपूर्ण निर्णयों का समय।',
    help_high_desc: 'अतिरिक्त ऊर्जा। उच्च कार्य क्षमता।',
    help_super_desc: 'अस्थिर स्थिति। अत्यधिक तनाव का जोखिम।',
    help_risk_title: 'जोखिम कारक (⚡)',
    help_risk_desc: '1⚡: मध्यम। 2⚡: पुरानी बीमारी जोखिम। 3⚡: गंभीर जोखिम, यात्रा से बचें।',
    help_arena_title: 'अखाड़ा रैंकिंग',
    help_arena_total: 'कुल रैंक: सभी क्षेत्रों की तुलना।',
    help_arena_basic: 'मूल रैंक: मोटर + शारीरिक। खेल के लिए सर्वोत्तम।',
    help_arena_reactive: 'प्रतिक्रियाशील रैंक: संवेदी + विश्लेषणात्मक। रणनीति के लिए।',
    help_balance_title: 'संतुलन योजना',
    help_balance_desc: 'पिक के दौरान भार बढ़ाएं और पिट के दौरान कम करें।',
    help_activities_title: 'गतिविधि तंत्र',
    help_activities_desc: 'विशिष्ट अंतरालों में होने वाली जैविक प्रक्रियाएं अनुनाद द्वारा संतुलन बढ़ाती हैं।',
    help_maps_title: 'लय एटलс',
    help_maps_desc: '9 फ्रैक्टल रेंज।',
    help_compat_title: 'अनुकूलता प्रकार',
    help_compat_polar: 'ध्रुवीय: नवाचार और तकनीकी कार्यों के लिए प्रभावी।',
    help_compat_resonant: 'अनुनादक: मनोरंजन के लिए अच्छा।',
    help_compat_optimal: 'इष्टतम: दीर्घकालिक (पारिवारिक) संबंधों के लिए सर्वोत्तम।',
    export: 'निर्यात', import: 'आयात', confirm_delete: 'हटाएं?', confirm_logout: 'लॉगआउट?', edit: 'संपादन',
    yes: 'हाँ', no: 'नहीं', days_abbr: ['सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि', 'रवि'],
    current_activities_desc: 'विभिन्न प्रक्रियाओं के सक्रिय विंडो।',
    group: 'समूह', ungroup: 'समूह हटाएँ', group_placeholder: 'समूह का नाम...', rename: 'नाम बदलें', confirm_ungroup: 'सभी हटाएँ?',
    compatibility: 'अनुकूलता', resonant: 'अनुनादक', optimal_compat: 'इष्टतम', polar: 'ध्रुवीय',
    arena: 'अखाड़ा', arena_total: 'कुल', arena_basic: 'मूल', arena_reactive: 'प्रतिक्रियाशील',
    remove_arena: 'निकालें?', members_count: 'सदस्य'
  }
};

const Dashboard: React.FC<DashboardProps> = ({ 
  profile, allProfiles, onAddProfile, onUpdateProfile, onDeleteProfile, onGroupProfiles, onRenameGroup, onUngroup, onMoveToGroup, onSelectProfile, onReset, onImportProfiles, onLogout 
}) => {
  const APP_ZONE = 'utc+5';

  const [targetDate, setTargetDate] = useState(DateTime.now().setZone(APP_ZONE));
  const [activeTab, setActiveTab] = useState<Tab>('PROFILES');
  const [selectedDaysMode, setSelectedDaysMode] = useState(14);
  const [visibleRhythms, setVisibleRhythms] = useState({ motor: true, physical: true, sensory: true, analytical: true });
  const [selectedMapIdx, setSelectedMapIdx] = useState(3);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [lang, setLang] = useState('ru');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  const [newPName, setNewPName] = useState('');
  const [newPDate, setNewPDate] = useState('1990-01-01T12:00');
  const [showAddForm, setShowAddForm] = useState(false);
  const [listMode, setListMode] = useState<ListMode>('NONE');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCompatDialog, setShowCompatDialog] = useState(false);
  const [showArenaDialog, setShowArenaDialog] = useState(false);
  const [arenaMode, setArenaMode] = useState<ArenaMode>('TOTAL');
  const [arenaEntityToRemove, setArenaEntityToRemove] = useState<any | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroupNames, setSelectedGroupNames] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [tempGroupName, setTempGroupName] = useState('');
  const [groupActionActive, setGroupActionActive] = useState<string | null>(null);
  const [showRenameDialog, setShowRenameDialog] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isDragOverGroup, setIsDragOverGroup] = useState<string | null>(null);
  const [isDragOverGeneral, setIsDragOverGeneral] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);
  const groupLongPressTimer = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = DateTime.now().setZone(APP_ZONE);
      setTargetDate(prev => {
        const isToday = prev.hasSame(now, 'day');
        return isToday ? now : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;

  const bdate = useMemo(() => {
    return DateTime.fromISO(profile.birthDate).setZone(APP_ZONE, { keepLocalTime: true });
  }, [profile.birthDate]);
  
  const daysGone = useMemo(() => calculateDaysGone(bdate, targetDate), [targetDate, bdate]);
  const secondsGone = useMemo(() => calculateSecondsGone(bdate, targetDate), [targetDate, bdate]);
  const balance = useMemo(() => calculateFullBalance(daysGone), [daysGone]);
  const activities = useMemo(() => getActivitiesPack(bdate, targetDate), [bdate, targetDate]);
  const currentRiskLvl = useMemo(() => getRiskLevel(daysGone, targetDate), [daysGone, targetDate]);

  const getBalanceEmoji = (val: number): React.ReactNode => {
    if (val >= 75) return <SuperHighLevelIcon />;
    if (val >= 60) return <HighLevelIcon />;
    if (val >= 45) return <OptimalLevelIcon />;
    if (val >= 30) return <LowLevelIcon />;
    return <CriticalLevelIcon />;
  };

  const getBalanceLabel = (val: number): string => {
    if (val >= 75) return t('legend_super');
    if (val >= 60) return t('legend_high');
    if (val >= 45) return t('legend_opt');
    if (val >= 30) return t('legend_low');
    return t('legend_crit');
  };

  const timePassedString = useMemo(() => {
    const diff = targetDate.diff(bdate, ['days', 'hours', 'minutes']).toObject();
    return `${Math.floor(diff.days || 0)}${t('days')} ${Math.floor(diff.hours || 0)}${t('hours')} ${Math.floor(diff.minutes || 0)}${t('minutes')}`;
  }, [bdate, targetDate, lang]);

  const groupedData = useMemo(() => {
    const profiles = allProfiles.map(p => {
      const pBdate = DateTime.fromISO(p.birthDate).setZone(APP_ZONE, { keepLocalTime: true });
      const pDays = calculateDaysGone(pBdate, targetDate);
      return {
        ...p,
        currentBalance: calculateFullBalance(pDays),
        currentRisk: getRiskLevel(pDays, targetDate)
      };
    });

    const groups: Record<string, any[]> = {};
    const ungrouped: any[] = [];

    profiles.forEach(p => {
      if (p.teamName) {
        if (!groups[p.teamName]) groups[p.teamName] = [];
        groups[p.teamName].push(p);
      } else {
        ungrouped.push(p);
      }
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => b.currentBalance - a.currentBalance);
    });
    ungrouped.sort((a, b) => b.currentBalance - a.currentBalance);

    return { groups, ungrouped };
  }, [allProfiles, targetDate]);

  const resetToToday = () => {
    setTargetDate(DateTime.now().setZone(APP_ZONE));
  };

  const handleExport = () => {
    const master = allProfiles.find(p => p.isMaster);
    const masterName = master ? master.name : 'base';
    const dataStr = JSON.stringify(allProfiles, null, 2);
    const blob = new Blob([dataStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ritmxoid_${masterName}_contacts_${DateTime.now().toFormat('yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          onImportProfiles(imported);
        }
      } catch (err) {}
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('profileId', id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const onDragEndGeneral = () => {
    setIsDragging(false);
    setIsDragOverGroup(null);
    setIsDragOverGeneral(false);
  };

  const onDropOnGroup = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('profileId');
    if (id) {
      onMoveToGroup(id, groupName);
    }
    onDragEndGeneral();
  };

  const onDropOnGeneral = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('profileId');
    if (id) {
      onMoveToGroup(id, null);
    }
    onDragEndGeneral();
  };

  const totalEffectiveSelected = useMemo(() => {
    const ids = new Set(selectedIds);
    selectedGroupNames.forEach(gn => {
      allProfiles.forEach(p => {
        if (p.teamName === gn) ids.add(p.id);
      });
    });
    return ids;
  }, [selectedIds, selectedGroupNames, allProfiles]);

  const compatIndex = useMemo(() => {
    if (totalEffectiveSelected.size !== 2) return null;
    const ids = Array.from(totalEffectiveSelected);
    const p1 = allProfiles.find(p => p.id === ids[0]);
    const p2 = allProfiles.find(p => p.id === ids[1]);
    if (!p1 || !p2) return null;
    
    const d1 = calculateDaysGone(DateTime.fromISO(p1.birthDate), targetDate);
    const d2 = calculateDaysGone(DateTime.fromISO(p2.birthDate), targetDate);
    return Math.abs(d1 - d2) % 14;
  }, [totalEffectiveSelected, allProfiles, targetDate]);

  const arenaData = useMemo(() => {
    if (!showArenaDialog) return [];
    const data: any[] = [];

    // Обработка выбранных ГРУПП (как команд)
    selectedGroupNames.forEach(gn => {
      const members = allProfiles.filter(p => p.teamName === gn);
      if (members.length === 0) return;

      let sumScore = 0;
      members.forEach(m => {
        const mBdate = DateTime.fromISO(m.birthDate).setZone(APP_ZONE, { keepLocalTime: true });
        const mDays = calculateDaysGone(mBdate, targetDate);
        if (arenaMode === 'TOTAL') sumScore += calculateFullBalance(mDays);
        else if (arenaMode === 'BASIC') sumScore += calculateBasicBalance(mDays);
        else if (arenaMode === 'REACTIVE') sumScore += calculateReactiveBalance(mDays);
      });

      data.push({
        id: `group-${gn}`,
        isGroup: true,
        name: gn,
        memberCount: members.length,
        score: Math.round(sumScore / members.length)
      });
    });

    // Обработка индивидуально выбранных профилей (которые НЕ входят в выбранные группы)
    selectedIds.forEach(id => {
      const p = allProfiles.find(x => x.id === id);
      if (!p || (p.teamName && selectedGroupNames.has(p.teamName))) return;

      const pBdate = DateTime.fromISO(p.birthDate).setZone(APP_ZONE, { keepLocalTime: true });
      const pDays = calculateDaysGone(pBdate, targetDate);
      let score = 0;
      if (arenaMode === 'TOTAL') score = calculateFullBalance(pDays);
      else if (arenaMode === 'BASIC') score = calculateBasicBalance(pDays);
      else if (arenaMode === 'REACTIVE') score = calculateReactiveBalance(pDays);
      
      data.push({ ...p, score, isGroup: false });
    });

    return data.sort((a, b) => b.score - a.score);
  }, [showArenaDialog, selectedGroupNames, selectedIds, allProfiles, arenaMode, targetDate]);

  const renderProfileItem = (p: any) => {
    const isSelected = profile.id === p.id;
    const isChecked = selectedIds.has(p.id) || (p.teamName && selectedGroupNames.has(p.teamName));
    const isDeleteMode = listMode === 'DELETE';
    const isEditMode = listMode === 'EDIT';
    const isSelectMode = listMode === 'SELECT';

    const handleTouchStart = () => {
      if (isDeleteMode || isEditMode || isSelectMode) return;
      longPressTimer.current = setTimeout(() => {
        setListMode('SELECT');
        setSelectedIds(new Set([p.id]));
      }, 600);
    };

    const handleTouchEnd = () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isSelectMode) {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(p.id)) newSelected.delete(p.id);
        else newSelected.add(p.id);
        setSelectedIds(newSelected);
        if (newSelected.size === 0 && selectedGroupNames.size === 0) setListMode('NONE');
        return;
      }
      if (isDeleteMode) {
        if (!p.isMaster) setProfileToDelete(p);
        return;
      }
      if (isEditMode) {
        setEditingProfileId(p.id);
        setNewPName(p.name);
        setNewPDate(p.birthDate);
        return;
      }
      onSelectProfile(p.id);
      setActiveTab('BALANCE');
    };

    return (
      <div 
        key={p.id}
        draggable={listMode === 'NONE'}
        onDragStart={(e) => onDragStart(e, p.id)}
        onDragEnd={onDragEndGeneral}
        onClick={handleClick}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] ${
          isSelected && listMode === 'NONE'
            ? 'bg-white/10 border-[#33b5e5] shadow-[0_0_15px_rgba(51,181,229,0.2)]' 
            : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
        } ${isChecked ? 'ring-2 ring-[#33b5e5] border-[#33b5e5] bg-[#33b5e5]/10' : ''} ${isDeleteMode && !p.isMaster ? 'ring-2 ring-red-600 border-red-600 shadow-[0_0_10px_rgba(255,0,0,0.3)]' : ''} ${isEditMode ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-[0_0_10px_rgba(51,181,229,0.3)]' : ''}`}
      >
        <div className="w-10 h-10 flex items-center justify-center text-2xl mr-2 pointer-events-none">
          {getBalanceEmoji(p.currentBalance)}
        </div>
        <div className="flex-1 min-w-0 pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="font-black uppercase tracking-tighter text-white truncate max-w-[150px]">{p.name}</span>
            {p.isMaster && <span className="text-[9px] bg-[#33b5e5] text-black px-1 font-bold rounded">MASTER</span>}
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase">{DateTime.fromISO(p.birthDate).toFormat('dd.MM.yyyy')}</div>
        </div>
        <div className="text-right shrink-0 pointer-events-none">
          <div className="flex items-center justify-end">
             {p.currentRisk >= 25 && (
               <div className="flex items-center gap-0.5 mr-1.5 h-6">
                  {[...Array(p.currentRisk >= 75 ? 3 : p.currentRisk >= 50 ? 2 : 1)].map((_, idx) => (
                    <div key={idx} className="relative w-6 h-6 flex items-center justify-center">
                      <div className="absolute w-3.5 h-3.5 rounded-full bg-red-600/80 blur-[3px] animate-pulse-red" />
                      <span className="text-xl leading-none text-white relative z-10 drop-shadow-md">⚡</span>
                    </div>
                  ))}
               </div>
             )}
             <div className="text-2xl font-black tabular-nums" style={{ color: getBalanceColor(p.currentBalance) }}>
               {p.currentBalance}%
             </div>
          </div>
          <div className="text-[8px] font-bold uppercase text-slate-600">{t('balance')}</div>
        </div>
        {isSelectMode && (
          <div className="absolute top-2 left-2">
             <div className={`w-4 h-4 rounded border flex items-center justify-center ${isChecked ? 'bg-[#33b5e5] border-[#33b5e5]' : 'border-white/20'}`}>
                {isChecked && <i className="fa-solid fa-check text-[10px] text-black" />}
             </div>
          </div>
        )}
      </div>
    );
  };

  const renderProfiles = () => (
    <div className="flex flex-col h-full bg-black relative">
      <div className="sticky top-0 z-[100] bg-black border-b border-white/5 pb-2">
        <div className="p-4 flex justify-between items-center bg-black">
          <h2 className="text-sm font-black text-[#33b5e5] uppercase italic">
            {listMode === 'SELECT' ? `${selectedIds.size + selectedGroupNames.size} SELECTED` : t('profiles')}
          </h2>
          <div className="flex items-center gap-1.5">
            {listMode === 'SELECT' ? (
              <>
                {(selectedIds.size + selectedGroupNames.size) >= 2 && (
                  <>
                    <button 
                      onClick={() => setShowArenaDialog(true)} 
                      title={t('arena')} 
                      className="w-8 h-8 flex items-center justify-center bg-fuchsia-600 text-white border border-fuchsia-400 rounded-lg transition-all active:scale-95 shadow-[0_0_8px_fuchsia]"
                    >
                      <i className="fa-solid fa-khanda text-[12px]" />
                    </button>
                    {(selectedIds.size + selectedGroupNames.size) === 2 && (
                      <button 
                        onClick={() => setShowCompatDialog(true)} 
                        title={t('compatibility')} 
                        className="w-8 h-8 flex items-center justify-center bg-[#33b5e5] text-black border border-[#33b5e5] rounded-lg transition-all active:scale-95 shadow-[0_0_8px_#33b5e5]"
                      >
                        <i className="fa-solid fa-people-arrows text-[12px]" />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setShowGroupDialog(true)} title={t('group')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#33b5e5] transition-all active:scale-95"><i className="fa-solid fa-folder-plus text-[12px]" /></button>
                <button onClick={() => { setListMode('NONE'); setSelectedIds(new Set()); setSelectedGroupNames(new Set()); }} title={t('close')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-all active:scale-95"><i className="fa-solid fa-xmark text-[12px]" /></button>
              </>
            ) : (
              <>
                <button onClick={() => fileInputRef.current?.click()} title={t('import')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-all active:scale-95"><i className="fa-solid fa-upload text-[10px]" /></button>
                <button onClick={handleExport} title={t('export')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-all active:scale-95"><i className="fa-solid fa-download text-[10px]" /></button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                <button onClick={() => setListMode(listMode === 'EDIT' ? 'NONE' : 'EDIT')} title={t('edit')} className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all active:scale-95 ${listMode === 'EDIT' ? 'bg-cyan-400 border-cyan-400 text-black shadow-[0_0_8px_#33b5e5]' : 'bg-white/5 border-white/10 text-slate-400'}`}><i className="fa-solid fa-pen text-[10px]" /></button>
                <button onClick={() => setListMode(listMode === 'DELETE' ? 'NONE' : 'DELETE')} title={t('delete')} className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all active:scale-95 ${listMode === 'DELETE' ? 'bg-red-600 border-red-600 text-white shadow-[0_0_10px_red]' : 'bg-white/5 border-white/10 text-slate-400'}`}><i className="fa-solid fa-trash text-[10px]" /></button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                <button onClick={() => { setShowAddForm(!showAddForm); setListMode('NONE'); }} className="bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">{showAddForm ? t('close') : t('add')}</button>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".txt,.json" />
          </div>
        </div>

        <AnimatePresence>
          {(showAddForm || editingProfileId) && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#1b2531] p-4 mx-4 rounded-xl border border-white/10 space-y-3 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-[#33b5e5]">{editingProfileId ? t('edit') : t('add')}</h3>
                <button onClick={() => { setEditingProfileId(null); setShowAddForm(false); }} className="text-slate-500 hover:text-white"><i className="fa-solid fa-xmark text-xs" /></button>
              </div>
              <input type="text" placeholder={t('name_placeholder')} value={newPName} onChange={e => setNewPName(e.target.value)} className="w-full bg-black border border-white/10 p-2 rounded text-sm outline-none focus:border-[#33b5e5] text-white" />
              <input type="datetime-local" value={newPDate} onChange={e => setNewPDate(e.target.value)} className="w-full bg-black border border-white/10 p-2 rounded text-sm outline-none focus:border-[#33b5e5] color-scheme-dark text-white" />
              <button onClick={() => {
                if (editingProfileId) { onUpdateProfile(editingProfileId, newPName, newPDate); setEditingProfileId(null); setListMode('NONE'); }
                else if(newPName) { onAddProfile(newPName, newPDate); setNewPName(''); setShowAddForm(false); }
              }} className="w-full bg-[#33b5e5] text-black font-black py-2 rounded text-xs uppercase shadow-lg active:scale-[0.98] transition-transform">{t('save')}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div 
        className={`p-4 flex-1 overflow-y-auto custom-scrollbar transition-colors ${isDragOverGeneral ? 'bg-[#33b5e5]/10 shadow-[inset_0_0_40px_rgba(51,181,229,0.2)]' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (!isDragOverGeneral) setIsDragOverGeneral(true); }}
        onDragLeave={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          if (e.clientX <= rect.left || e.clientX >= rect.right || e.clientY <= rect.top || e.clientY >= rect.bottom) {
            setIsDragOverGeneral(false);
          }
        }}
        onDrop={onDropOnGeneral}
      >
        <div className="space-y-2">
          {Object.entries(groupedData.groups).map(([groupName, groupProfiles]) => {
            const isExpanded = expandedGroups.has(groupName);
            const isContextActive = groupActionActive === groupName;
            const isGroupChecked = selectedGroupNames.has(groupName);
            
            const handleGroupLongPress = () => {
              groupLongPressTimer.current = setTimeout(() => {
                setGroupActionActive(groupName);
              }, 600);
            };

            const handleHeaderClick = () => {
              if(groupActionActive) { setGroupActionActive(null); return; }
              if (listMode === 'SELECT') {
                const newGroups = new Set(selectedGroupNames);
                if (newGroups.has(groupName)) newGroups.delete(groupName);
                else newGroups.add(groupName);
                setSelectedGroupNames(newGroups);
                return;
              }
              const newExpanded = new Set(expandedGroups);
              if (isExpanded) newExpanded.delete(groupName);
              else newExpanded.add(groupName);
              setExpandedGroups(newExpanded);
            };

            return (
              <div 
                key={groupName} 
                className={`space-y-1 rounded-xl transition-all ${isDragOverGroup === groupName ? 'ring-4 ring-[#33b5e5] bg-[#33b5e5]/10 scale-[1.02] shadow-[0_0_20px_#33b5e5]' : ''}`}
                onDragOver={(e) => { e.preventDefault(); if (isDragOverGroup !== groupName) setIsDragOverGroup(groupName); }}
                onDragLeave={() => setIsDragOverGroup(null)}
                onDrop={(e) => onDropOnGroup(e, groupName)}
              >
                 <div 
                  onClick={handleHeaderClick}
                  onMouseDown={handleGroupLongPress}
                  onMouseUp={() => clearTimeout(groupLongPressTimer.current)}
                  onTouchStart={handleGroupLongPress}
                  onTouchEnd={() => clearTimeout(groupLongPressTimer.current)}
                  className={`group p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all relative ${
                    isGroupChecked ? 'ring-2 ring-[#33b5e5] border-[#33b5e5] bg-[#33b5e5]/20 shadow-[0_0_15px_rgba(51,181,229,0.2)]' :
                    isContextActive ? 'bg-[#33b5e5]/20 border-[#33b5e5] z-50 ring-2 ring-[#33b5e5]' : 'bg-[#1b2531]/50 border border-white/5 hover:bg-[#1b2531]'
                  }`}
                 >
                    <div className={`flex items-center gap-2 ${isDragging ? 'pointer-events-none' : ''}`}>
                      <i className={`fa-solid fa-folder${isExpanded ? '-open' : ''} text-[#33b5e5]`} />
                      <span className="text-[11px] font-black uppercase text-slate-300">{groupName}</span>
                      <span className="text-[9px] bg-white/5 px-1.5 rounded-full text-slate-500 font-bold">{groupProfiles.length}</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <AnimatePresence>
                        {isContextActive && (
                          <motion.div 
                            initial={{ opacity: 0, x: 10 }} 
                            animate={{ opacity: 1, x: 0 }} 
                            exit={{ opacity: 0, x: 10 }} 
                            className="flex gap-2 relative z-[100]"
                          >
                             <button 
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setTempGroupName(groupName); 
                                setShowRenameDialog(groupName); 
                                setGroupActionActive(null); 
                              }}
                              className="w-10 h-10 flex items-center justify-center bg-cyan-500 text-black rounded-lg border border-cyan-400 hover:bg-white transition-colors shadow-lg active:scale-90"
                             ><i className="fa-solid fa-pen text-[14px]" /></button>
                             <button 
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setGroupToDelete(groupName);
                                setGroupActionActive(null); 
                              }}
                              className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-lg border border-red-500 hover:bg-white hover:text-red-600 transition-colors shadow-lg active:scale-90"
                             ><i className="fa-solid fa-trash-can text-[14px]" /></button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {!isContextActive && listMode === 'SELECT' && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isGroupChecked ? 'bg-[#33b5e5] border-[#33b5e5]' : 'border-white/20'}`}>
                           {isGroupChecked && <i className="fa-solid fa-check text-[10px] text-black" />}
                        </div>
                      )}
                      {!isContextActive && listMode !== 'SELECT' && <i className={`fa-solid fa-chevron-${isExpanded ? 'up' : 'down'} text-[10px] text-slate-600 pointer-events-none`} />}
                    </div>
                 </div>
                 <AnimatePresence>
                   {isExpanded && (
                     <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-1 pl-4 border-l border-white/10">
                        {groupProfiles.map(p => renderProfileItem(p))}
                     </motion.div>
                   )}
                 </AnimatePresence>
              </div>
            );
          })}
          {groupedData.ungrouped.map(p => renderProfileItem(p))}
        </div>
      </div>
      {groupActionActive && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={() => setGroupActionActive(null)} />}
    </div>
  );

  const renderBalance = () => (
    <div className="p-4 space-y-4 h-full overflow-y-auto custom-scrollbar">
      <div className="text-sm font-bold text-white uppercase tracking-tighter">{t('passed')} <span className="ml-2 font-normal text-slate-400">{timePassedString}</span></div>
      
      <div className="relative h-60 w-full border-b border-l border-white/20 flex items-end justify-between px-1 gap-[2px] overflow-hidden bg-black shadow-inner">
        <div className="absolute inset-0 grid grid-rows-4 pointer-events-none">
          {[90, 70, 50, 30].map(v => (
            <div key={v} className="border-t border-white/5 w-full flex items-start">
              <span className="text-[9px] text-slate-600 ml-1 mt-[-6px] font-bold">{v}</span>
            </div>
          ))}
        </div>
        {[...Array(selectedDaysMode)].map((_, i) => {
          const offset = i - Math.floor(selectedDaysMode / 2);
          const d = daysGone + offset;
          const r = calculateSpecificRhythms(d);
          const isToday = offset === 0;
          return (
            <div key={i} className={`flex-1 flex flex-col justify-end h-full min-w-[3px] ${isToday ? 'bg-white/10 ring-1 ring-[#33b5e5] z-10 shadow-[0_0_10px_rgba(51,181,229,0.3)]' : 'opacity-60'}`}>
              {visibleRhythms.motor && <div style={{ height: `${r.motor/4}%`, backgroundColor: COLORS.MOTOR }} className="w-full border-t border-black/30" />}
              {visibleRhythms.physical && <div style={{ height: `${r.physical/4}%`, backgroundColor: COLORS.PHYSICAL }} className="w-full border-t border-black/30" />}
              {visibleRhythms.sensory && <div style={{ height: `${r.sensory/4}%`, backgroundColor: COLORS.SENSORY }} className="w-full border-t border-black/30" />}
              {visibleRhythms.analytical && <div style={{ height: `${r.analytical/4}%`, backgroundColor: COLORS.ANALYTICAL }} className="w-full border-t border-black/30" />}
            </div>
          );
        })}
      </div>

      <div className="flex justify-around py-3 bg-[#111] rounded border border-white/5">
        {[14, 28, 42, 49].map(m => (
          <label key={m} className="flex items-center gap-2 cursor-pointer">
            <input type="radio" checked={selectedDaysMode === m} onChange={() => setSelectedDaysMode(m)} className="w-4 h-4 accent-[#33b5e5]" />
            <span className={`text-[10px] font-black ${selectedDaysMode === m ? 'text-[#33b5e5]' : 'text-slate-600'}`}>{m}{t('days').toUpperCase()}</span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ToggleButton label={t('toggle_dvig')} active={visibleRhythms.motor} color={COLORS.MOTOR} onClick={() => setVisibleRhythms(v => ({...v, motor: !v.motor}))} />
        <ToggleButton label={t('toggle_phys')} active={visibleRhythms.physical} color={COLORS.PHYSICAL} onClick={() => setVisibleRhythms(v => ({...v, physical: !v.physical}))} />
        <ToggleButton label={t('toggle_sens')} active={visibleRhythms.sensory} color={COLORS.SENSORY} onClick={() => setVisibleRhythms(v => ({...v, sensory: !v.sensory}))} />
        <ToggleButton label={t('toggle_anlt')} active={visibleRhythms.analytical} color={COLORS.ANALYTICAL} onClick={() => setVisibleRhythms(v => ({...v, analytical: !v.analytical}))} />
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="flex flex-col h-full bg-black">
      <div className="p-3 mx-4 my-2 bg-[#1b2531]/40 border border-white/5 rounded text-[11px] text-slate-400 leading-tight italic">
        {t('current_activities_desc')}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {Object.entries(ACTIVITY_CONFIG).map(([id, config]) => {
          const periods = activities[id] || [];
          const activePeriod = periods.find(p => p.isActive);
          const isExpanded = expandedActivity === id;
          return (
            <div key={id} className="border-b border-white/5">
              <div onClick={() => setExpandedActivity(isExpanded ? null : id)} className="p-4 flex items-center gap-4 cursor-pointer active:bg-white/5 transition-colors">
                <div className={`w-10 flex justify-center text-3xl transition-opacity ${activePeriod ? 'text-white' : 'text-slate-700 opacity-30'}`}><i className={config.icon} /></div>
                <div className="flex-1">
                  {activePeriod ? (
                    <div className="flex flex-col">
                      <div className="text-3xl font-black tracking-tighter text-white uppercase tabular-nums">{activePeriod.start.toFormat('HH:mm')} - {activePeriod.end.toFormat('HH:mm')}</div>
                      <div className="h-[3px] bg-[#33b5e5] w-32 mt-1 shadow-[0_0_8px_#33b5e5]" />
                    </div>
                  ) : (
                    <div className="text-2xl font-black tracking-tighter text-slate-800 uppercase italic">{t('inactive')}</div>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-[#0a0a0a]">
                    {periods.slice().reverse().map((p, i) => (
                      <div key={i} className="flex items-center px-4 py-3 border-t border-white/[0.02] gap-2">
                        <div className="w-8 flex justify-center text-[#33b5e5] text-sm shrink-0">{p.isActive ? '►' : ''}</div>
                        <div className="flex-1 flex justify-between items-center tabular-nums overflow-hidden">
                          <div className="text-slate-500 text-[10px] w-14 shrink-0 uppercase font-bold">{p.start.toFormat('dd LLL.', { locale: lang })}</div>
                          <div className="text-[19px] text-white font-black px-2 flex-1 text-center whitespace-nowrap tracking-tighter">{p.start.toFormat('HH:mm')} — {p.end.toFormat('HH:mm')}</div>
                          <div className="text-slate-500 text-[10px] w-14 shrink-0 text-right uppercase font-bold">{p.end.toFormat('dd LLL.', { locale: lang })}</div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCalendar = () => {
    const startOfMonth = targetDate.startOf('month');
    const firstDayOfWeek = startOfMonth.weekday; 
    const days: DateTime[] = [];
    const calendarStart = startOfMonth.minus({ days: firstDayOfWeek - 1 });
    for (let i = 0; i < 42; i++) days.push(calendarStart.plus({ days: i }));

    let monthlyRiskIndex = 0;
    for (let i = 1; i <= targetDate.daysInMonth!; i++) {
        const d = startOfMonth.plus({ days: i - 1 });
        const dg = calculateDaysGone(bdate, d);
        const r = getRiskLevel(dg, d);
        if (r >= 75) monthlyRiskIndex += 3;
        else if (r >= 50) monthlyRiskIndex += 2;
        else if (r >= 25) monthlyRiskIndex += 1;
    }

    return (
      <div className="p-4 flex flex-col h-full bg-black overflow-y-auto custom-scrollbar">
        <div className="mb-4 p-3 bg-[#1b2531]/60 border border-white/10 rounded shadow-lg">
           <div className="text-[11px] font-bold text-[#33b5e5] uppercase tracking-widest">
             {t('risk_index')} <span className="text-white ml-2 text-base drop-shadow-[0_0_5px_#fff]">{monthlyRiskIndex}</span>
           </div>
        </div>
        <div className="grid grid-cols-7 gap-[3px] bg-white/5 p-[2px] border border-white/10 flex-shrink-0 rounded-sm">
          {t('days_abbr').map((h: string, idx: number) => (
            <div key={idx} className="text-[11px] font-black text-slate-400 py-3 text-center bg-black/70 uppercase border-b border-white/5">{h}</div>
          ))}
          {days.map((d, i) => {
            const isCurrentMonth = d.month === targetDate.month;
            const dg = calculateDaysGone(bdate, d);
            const bal = calculateFullBalance(dg);
            const bgColor = isCurrentMonth ? getBalanceColor(bal) : 'transparent';
            const riskLvl = getRiskLevel(dg, d);
            const isToday = d.hasSame(DateTime.now().setZone(APP_ZONE), 'day');
            return (
              <div key={i} className={`aspect-square relative flex flex-col items-center justify-center border border-white/10 transition-all duration-300 ${isCurrentMonth ? 'shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]' : ''}`} style={{ backgroundColor: isCurrentMonth ? `${bgColor}99` : 'transparent', opacity: isCurrentMonth ? 1 : 0.15 }}>
                {isToday && <div className="absolute inset-0 border-2 border-[#33b5e5] z-10 shadow-[0_0_15px_#33b5e5,inset_0_0_10px_#33b5e5]" />}
                <span className={`text-[13px] font-black absolute top-1 left-1.5 ${isCurrentMonth ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`}>{d.day}</span>
                {isCurrentMonth && riskLvl >= 25 && (
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                    {[...Array(riskLvl >= 75 ? 3 : riskLvl >= 50 ? 2 : 1)].map((_, idx) => (
                      <div key={idx} className="relative w-3.5 h-3.5 flex items-center justify-center">
                        <div className="absolute w-2 h-2 rounded-full bg-red-600/80 blur-[2px] animate-pulse-red" />
                        <span className="text-[10px] leading-none text-white relative z-10 drop-shadow-sm">⚡</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap gap-2.5 justify-center">
            <LegendItem color={COLORS.CRITICAL} label={t('legend_crit')} />
            <LegendItem color={COLORS.LOW} label={t('legend_low')} />
            <LegendItem color={COLORS.OPTIMAL} label={t('legend_opt')} />
            <LegendItem color={COLORS.HIGH} label={t('legend_high')} />
            <LegendItem color={COLORS.SUPERHIGH} label={t('legend_super')} />
        </div>
      </div>
    );
  };

  const renderMaps = () => {
    if (activeTab !== 'MAPS') return null;
    const map = MAP_NAMES[selectedMapIdx];
    const val = map.isMicro ? secondsGone : daysGone;
    const angles = calculateMapAngles(selectedMapIdx, val);
    return (
      <div className="p-4 flex flex-col items-center gap-6 h-full overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-3 gap-1 w-full max-w-sm z-50">
          {MAP_NAMES.map((m, idx) => (
            <button key={idx} onClick={() => setSelectedMapIdx(idx)} className={`py-2 text-[9px] font-black uppercase tracking-tighter border transition-all ${selectedMapIdx === idx ? 'bg-[#33b5e5] text-black border-[#33b5e5]' : 'bg-[#050505] text-slate-600 border-white/5'}`}>{m.name}</button>
          ))}
        </div>
        <div className="relative w-80 h-80 rounded-full flex items-center justify-center overflow-hidden border-[6px] border-[#1b2531] shadow-2xl bg-black flex-shrink-0">
           {[...Array(24)].map((_, i) => (<div key={i} className="absolute w-full h-[0.5px] bg-white/5 z-0" style={{ transform: `rotate(${i * 15}deg)` }} />))}
           <OrbitRing size="79%" scale={0.79} cells={49} color={COLORS.ANALYTICAL} activeAngle={angles[3]} />
           <OrbitRing size="62%" scale={0.62} cells={42} color={COLORS.SENSORY} activeAngle={angles[2]} />
           <OrbitRing size="45%" scale={0.45} cells={28} color={COLORS.PHYSICAL} activeAngle={angles[1]} />
           <OrbitRing size="30%" scale={0.30} cells={14} color={COLORS.MOTOR} activeAngle={angles[0]} />
           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-[2px] bg-[#44aa00] shadow-[0_0_12px_#44aa00] z-[60]" />
           <div className="absolute w-16 h-16 rounded-full bg-black border-2 border-[#33b5e5] flex flex-col items-center justify-center z-[100] shadow-[0_0_25px_rgba(51,181,229,0.6)]">
              <div className="absolute inset-0 rounded-full bg-[#33b5e5]/10 animate-pulse" />
              <span className="text-2xl font-black text-white tracking-tighter relative z-10 tabular-nums">{map.id}</span>
              <span className="text-[8px] text-[#33b5e5] font-black uppercase tracking-widest mt-0.5 relative z-10">{map.type}</span>
           </div>
           <div className="absolute inset-0 z-40 pointer-events-none">
              {selectedMapIdx === 3 && <RadarMarker angle={calculateMoonAngle(targetDate)} color="#ffffff" radius={92} label="☾" glowColor="#ffffff" />}
              {selectedMapIdx === 4 && <RadarMarker angle={calculateSunAngle(targetDate)} color="#ffd600" radius={92} label="☀" glowColor="#ffaa00" />}
              {selectedMapIdx === 2 && <RadarMarker angle={calculateEarthAngle(targetDate)} color="#33b5e5" radius={92} label="♁" glowColor="#33b5e5" />}
           </div>
        </div>
      </div>
    );
  };

  const stepDate = (forward: boolean) => {
    if (forward) setTargetDate(targetDate.plus({ days: 1 }));
    else setTargetDate(targetDate.minus({ days: 1 }));
  };

  const getCompatProgress = (idx: number) => {
    const mapping: Record<number, number> = {
      0: 0, 13: 0,
      1: 15, 12: 15,
      2: 35, 11: 35,
      3: 50, 10: 50,
      4: 65, 9: 65,
      5: 85, 8: 85,
      6: 100, 7: 100
    };
    return mapping[idx] ?? 50;
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-white select-none overflow-hidden font-['Roboto']">
      <header className="bg-[#1b2531] border-b-2 border-black p-3 flex items-center gap-4 shadow-lg z-[9999]">
        <div className="w-10 h-10 flex items-center justify-center shrink-0">{getBalanceEmoji(balance)}</div>
        <div className="flex-1 min-w-0">
           <div className="text-xl font-black tracking-tighter uppercase leading-none truncate">{profile.name}</div>
           <div className="flex items-center gap-2 mt-1 text-[11px] font-bold uppercase" style={{ color: getBalanceColor(balance) }}>
              <span>{getBalanceLabel(balance)}</span>
              <span className="text-white/20">•</span>
              <div className="flex items-center">
                <span className="text-white tabular-nums">{balance}%</span>
                {currentRiskLvl >= 25 && (
                  <div className="flex items-center gap-0.5 ml-1.5">
                    {[...Array(currentRiskLvl >= 75 ? 3 : currentRiskLvl >= 50 ? 2 : 1)].map((_, idx) => (
                      <div key={idx} className="relative w-3 h-3 flex items-center justify-center">
                        <div className="absolute w-1.5 h-1.5 rounded-full bg-red-600/80 blur-[1.5px] animate-pulse-red" />
                        <span className="text-[9px] leading-none text-white relative z-10 drop-shadow-sm">⚡</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 relative">
          <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-globe text-lg text-[#33b5e5]" /></button>
          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-12 right-0 bg-[#1b2531] border border-white/20 rounded-xl shadow-2xl z-[10000] overflow-hidden w-40 backdrop-blur-md">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setIsLangMenuOpen(false); }} className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-xs font-bold uppercase ${lang === l.code ? 'text-[#33b5e5]' : 'text-slate-300'}`}><span className="text-lg">{l.flag}</span>{l.name}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setIsHelpOpen(true)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><i className="fa-solid fa-circle-question text-lg text-[#33b5e5]" /></button>
          <button onClick={() => setShowLogoutConfirm(true)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors" title="Выход"><i className="fa-solid fa-power-off text-lg text-red-500" /></button>
        </div>
      </header>

      <nav className="bg-[#1b2531] flex border-b border-black z-40 shadow-md">
        {(['PROFILES', 'BALANCE', 'ACTIVITIES', 'CALENDAR', 'MAPS'] as Tab[]).map(t_tab => (
          <button key={t_tab} onClick={() => { setActiveTab(t_tab); if(t_tab !== 'PROFILES') setListMode('NONE'); }} className={`flex-1 py-4 text-[9px] font-black tracking-widest transition-all relative ${activeTab === t_tab ? 'text-white' : 'text-slate-500'}`}>
            {t(t_tab.toLowerCase()).toUpperCase()}
            {activeTab === t_tab && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 w-full h-[3px] bg-[#33b5e5] shadow-[0_0_8px_#33b5e5]" />}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-hidden relative bg-black">
         {activeTab === 'PROFILES' && renderProfiles()}
         {activeTab === 'BALANCE' && renderBalance()}
         {activeTab === 'ACTIVITIES' && renderActivities()}
         {activeTab === 'CALENDAR' && renderCalendar()}
         {activeTab === 'MAPS' && renderMaps()}
      </main>

      <footer className="bg-[#1b2531] p-4 flex items-center justify-between border-t-2 border-black z-40 shadow-[0_-5px_25px_rgba(0,0,0,0.6)]">
         <button onClick={() => stepDate(false)} className="w-12 h-12 flex items-center justify-center bg-black/40 rounded border border-white/5 text-[#33b5e5] active:scale-95 transition-transform"><i className="fa-solid fa-chevron-left text-xl" /></button>
         <div onClick={resetToToday} className="flex flex-col items-center cursor-pointer hover:opacity-80 active:scale-95 transition-all group" title="Вернуться к сегодняшнему дню">
            <span className="text-2xl font-black tracking-tighter text-white uppercase tabular-nums group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              {activeTab === 'CALENDAR' ? targetDate.toFormat('LLLL yyyy', { locale: lang }) : targetDate.toFormat('dd LLL. yyyy', { locale: lang })}
            </span>
            <span className="text-[10px] font-bold text-[#33b5e5] tabular-nums group-hover:text-white transition-colors">{targetDate.toFormat('HH:mm')}</span>
         </div>
         <button onClick={() => stepDate(true)} className="w-12 h-12 flex items-center justify-center bg-black/40 rounded border border-white/5 text-[#33b5e5] active:scale-95 transition-transform"><i className="fa-solid fa-chevron-right text-xl" /></button>
      </footer>

      <AnimatePresence>
        {showGroupDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <i className="fa-solid fa-folder-plus text-4xl text-[#33b5e5]" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">{t('group')}</h2>
              </div>
              <input autoFocus type="text" placeholder={t('group_placeholder')} value={tempGroupName} onChange={e => setTempGroupName(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-[#33b5e5] text-white" />
              <div className="flex gap-3">
                <button onClick={() => { onGroupProfiles(Array.from(selectedIds), tempGroupName); setSelectedIds(new Set()); setSelectedGroupNames(new Set()); setListMode('NONE'); setShowGroupDialog(false); setTempGroupName(''); }} className="flex-1 bg-[#33b5e5] text-black font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform">{t('save')}</button>
                <button onClick={() => { setShowGroupDialog(false); setTempGroupName(''); }} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRenameDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <i className="fa-solid fa-pen text-4xl text-[#33b5e5]" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">{t('rename')}</h2>
              </div>
              <input autoFocus type="text" placeholder={t('group_placeholder')} value={tempGroupName} onChange={e => setTempGroupName(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-[#33b5e5] text-white" />
              <div className="flex gap-3">
                <button onClick={() => { onRenameGroup(showRenameDialog, tempGroupName); setShowRenameDialog(null); setTempGroupName(''); }} className="flex-1 bg-[#33b5e5] text-black font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform">{t('save')}</button>
                <button onClick={() => { setShowRenameDialog(null); setTempGroupName(''); }} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isHelpOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-xl flex flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-[#33b5e5]/30 pb-4">
              <h2 className="text-2xl font-black text-[#33b5e5] uppercase italic tracking-tighter">{t('help_title')}</h2>
              <button onClick={() => setIsHelpOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white"><i className="fa-solid fa-xmark text-xl" /></button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-10 pr-2 pb-12">
              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_core_title')}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{t('help_core_desc')}</p>
                <div className="grid gap-3">
                  <HelpCard color={COLORS.MOTOR} title={t('toggle_dvig')} desc={t('help_motor_desc')} />
                  <HelpCard color={COLORS.PHYSICAL} title={t('toggle_phys')} desc={t('help_phys_desc')} />
                  <HelpCard color={COLORS.SENSORY} title={t('toggle_sens')} desc={t('help_sens_desc')} />
                  <HelpCard color={COLORS.ANALYTICAL} title={t('toggle_anlt')} desc={t('help_anlt_desc')} />
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_levels_title')}</h3>
                <div className="space-y-2">
                   {[
                     { icon: <CriticalLevelIcon />, color: '#44aa00', label: 'legend_crit', desc: 'help_crit_desc' },
                     { icon: <LowLevelIcon />, color: '#2196f3', label: 'legend_low', desc: 'help_low_desc' },
                     { icon: <OptimalLevelIcon />, color: '#ffd600', label: 'legend_opt', desc: 'help_opt_desc' },
                     { icon: <HighLevelIcon />, color: '#ff9800', label: 'legend_high', desc: 'help_high_desc' },
                     { icon: <SuperHighLevelIcon />, color: '#ff1744', label: 'legend_super', desc: 'help_super_desc' }
                   ].map(lvl => (
                    <div key={lvl.label} className="bg-white/5 p-4 rounded-xl border-l-4 flex gap-4" style={{ borderColor: lvl.color }}>
                      <div className="w-12 h-12 shrink-0">{lvl.icon}</div>
                      <div>
                        <div className="text-[10px] font-black mb-1 uppercase" style={{ color: lvl.color }}>{t(lvl.label)}</div>
                        <p className="text-xs text-slate-300 leading-snug">{t(lvl.desc)}</p>
                      </div>
                    </div>
                   ))}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_risk_title')}</h3>
                <div className="bg-[#cc0000]/10 border border-[#cc0000]/30 p-5 rounded-xl flex gap-4 items-start relative overflow-hidden">
                  <span className="text-3xl relative z-10">⚡</span>
                  <p className="text-xs text-slate-200 italic leading-relaxed relative z-10">{t('help_risk_desc')}</p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_arena_title')}</h3>
                <div className="space-y-3">
                   <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 italic">{t('help_arena_total')}</div>
                   <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 italic">{t('help_arena_basic')}</div>
                   <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 italic">{t('help_arena_reactive')}</div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_balance_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed">
                   {t('help_balance_desc')}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_activities_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed italic">
                   {t('help_activities_desc')}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_maps_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 space-y-2">
                   <p className="italic">{t('help_maps_desc')}</p>
                   <div className="grid grid-cols-2 gap-2 mt-2">
                      {['Micro 3.5 (0.32s)', 'Micro 3 (2.25s)', 'Micro 2 (31s)', 'Micro 1 (7m)', 'Zero (1.7h)', 'Macro 1 (24h)', 'Macro 2 (14d)', 'Macro 3 (196d)', 'Macro 3.5 (1372d)'].map(m => (
                        <div key={m} className="text-[9px] bg-black/50 p-1 text-center border border-white/5 rounded">{m}</div>
                      ))}
                   </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_compat_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                   <p className="text-xs text-slate-300"><span className="text-cyan-400 font-bold uppercase">{t('resonant')}:</span> {t('help_compat_resonant')}</p>
                   <p className="text-xs text-slate-300"><span className="text-yellow-400 font-bold uppercase">{t('optimal_compat')}:</span> {t('help_compat_optimal')}</p>
                   <p className="text-xs text-slate-300"><span className="text-red-500 font-bold uppercase">{t('polar')}:</span> {t('help_compat_polar')}</p>
                </div>
              </section>
            </div>
            <button onClick={() => setIsHelpOpen(false)} className="mt-4 w-full bg-[#33b5e5] text-black font-black py-4 rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-transform">{t('back')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {profileToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-red-600 mb-2"><i className="fa-solid fa-triangle-exclamation" /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('confirm_delete')}</h2>
              <p className="text-slate-400 text-sm font-bold uppercase">{profileToDelete.name}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { onDeleteProfile(profileToDelete.id); setProfileToDelete(null); setListMode('NONE'); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-900/20">{t('yes')}</button>
                <button onClick={() => setProfileToDelete(null)} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {groupToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-red-600 mb-2"><i className="fa-solid fa-folder-minus" /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('ungroup')}</h2>
              <p className="text-slate-300 text-xs font-bold uppercase">{groupToDelete}</p>
              <p className="text-slate-500 text-[10px] italic">{t('confirm_ungroup')}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { onUngroup(groupToDelete); setGroupToDelete(null); setGroupActionActive(null); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-900/20">{t('yes')}</button>
                <button onClick={() => setGroupToDelete(null)} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-red-600 mb-2"><i className="fa-solid fa-power-off" /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('confirm_logout')}</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{profile.name}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { onLogout(); setShowLogoutConfirm(false); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-900/20">{t('yes')}</button>
                <button onClick={() => setShowLogoutConfirm(false)} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCompatDialog && compatIndex !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm space-y-8 shadow-2xl">
               <div className="text-center space-y-2">
                 <h2 className="text-2xl font-black uppercase tracking-tighter text-[#33b5e5] italic">{t('compatibility')}</h2>
                 <div className="flex justify-center gap-4 text-slate-500 font-bold uppercase text-[10px]">
                    {Array.from(totalEffectiveSelected).map(id => allProfiles.find(p => p.id === id)?.name).join(' + ')}
                 </div>
               </div>
               
               <div className="space-y-4">
                 <div className="relative h-20 bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col justify-center px-4">
                    <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-2">
                       <span className={compatIndex === 0 || compatIndex === 1 || compatIndex === 12 || compatIndex === 13 ? 'text-cyan-400 shadow-[0_0_8px_cyan]' : 'text-slate-700'}>{t('resonant')}</span>
                       <span className={(compatIndex >= 2 && compatIndex <= 4) || (compatIndex >= 9 && compatIndex <= 11) ? 'text-yellow-400 shadow-[0_0_8px_yellow]' : 'text-slate-700'}>{t('optimal_compat')}</span>
                       <span className={compatIndex >= 5 && compatIndex <= 8 ? 'text-red-500 shadow-[0_0_8px_red]' : 'text-slate-700'}>{t('polar')}</span>
                    </div>
                    <div className="relative h-2 bg-slate-800 rounded-full">
                       <motion.div 
                        initial={false}
                        animate={{ left: `${getCompatProgress(compatIndex)}%` }}
                        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-[#33b5e5] rounded-full border-2 border-white shadow-[0_0_15px_#33b5e5]"
                       />
                    </div>
                 </div>
                 
                 <div className="p-4 bg-white/5 border border-white/5 rounded-xl text-xs text-slate-400 leading-relaxed italic text-center">
                    {(compatIndex === 0 || compatIndex === 12 || compatIndex === 13 || compatIndex === 1) && "Хорошо для краткосрочного общения и развлечений. Возможны конфликты при длительном контакте."}
                    {(compatIndex === 6 || compatIndex === 7 || compatIndex === 5 || compatIndex === 8) && "Идеально для технического взаимодействия и совместных инноваций. Последовательное движение к цели."}
                    {(compatIndex === 3 || compatIndex === 10 || compatIndex === 2 || compatIndex === 4 || compatIndex === 9 || compatIndex === 11) && "Лучший тип для длительных (семейных) отношений. Взаимная терпимость и устойчивость."}
                 </div>
               </div>

               <button onClick={() => setShowCompatDialog(false)} className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all border border-white/10 shadow-lg">{t('close')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArenaDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/95 backdrop-blur-xl flex flex-col p-4">
             <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-khanda text-3xl text-fuchsia-500" />
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{t('arena')}</h2>
                </div>
                <button onClick={() => setShowArenaDialog(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><i className="fa-solid fa-xmark text-2xl" /></button>
             </div>

             <div className="flex gap-1 bg-[#1b2531] p-1 rounded-xl mb-6 shadow-lg border border-white/10">
                {(['TOTAL', 'BASIC', 'REACTIVE'] as ArenaMode[]).map(mode => (
                  <button 
                    key={mode} 
                    onClick={() => setArenaMode(mode)}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-tighter rounded-lg transition-all ${
                      arenaMode === mode ? 'bg-fuchsia-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {t(`arena_${mode.toLowerCase()}`)}
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
                {arenaData.map((entity, idx) => (
                  <ArenaItem 
                    key={entity.id} 
                    p={entity} 
                    idx={idx} 
                    t={t} 
                    onRemove={(e) => setArenaEntityToRemove(e)} 
                  />
                ))}
             </div>

             <button onClick={() => setShowArenaDialog(false)} className="mt-6 w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-xl uppercase tracking-widest border border-white/10">{t('close')}</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {arenaEntityToRemove && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-fuchsia-500 mb-2"><i className={arenaEntityToRemove.isGroup ? "fa-solid fa-folder-minus" : "fa-solid fa-user-minus"} /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('remove_arena')}</h2>
              <p className="text-slate-400 text-sm font-bold uppercase">{arenaEntityToRemove.name}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { 
                  if (arenaEntityToRemove.isGroup) {
                    const newSelectedGroups = new Set(selectedGroupNames);
                    newSelectedGroups.delete(arenaEntityToRemove.name);
                    setSelectedGroupNames(newSelectedGroups);
                  } else {
                    const newSelectedIds = new Set(selectedIds);
                    newSelectedIds.delete(arenaEntityToRemove.id);
                    setSelectedIds(newSelectedIds);
                  }
                  
                  setArenaEntityToRemove(null);
                  // Если ничего не осталось, закрываем арину
                  if ((selectedIds.size + selectedGroupNames.size) <= 1) {
                     // Мы проверяем размеры СТАРЫХ сетов, так как стейт еще не обновился.
                     // Но в данном контексте надежнее проверить количество элементов в arenaData после фильтрации.
                     if (arenaData.length <= 1) {
                        setShowArenaDialog(false);
                        setListMode('NONE');
                     }
                  }
                }} className="flex-1 bg-fuchsia-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg">{t('yes')}</button>
                <button onClick={() => setArenaEntityToRemove(null)} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1b2531; border-radius: 10px; }
        .color-scheme-dark { color-scheme: dark; }
        @keyframes animate-pulse-red {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-pulse-red {
          animation: animate-pulse-red 1.5s ease-in-out infinite;
        }
      `}} />
    </div>
  );
};

const ArenaItem = ({ p, idx, t, onRemove }: { p: any, idx: number, t: any, onRemove: (p: any) => void }) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-150, 0, 150], [0, 1, 0]);
  const bgOpacity = useTransform(x, [-100, 0, 100], [1, 0, 1]); 
  const isTop3 = idx < 3;
  const medalColor = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'transparent';

  return (
    <div className="relative group">
      <motion.div 
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 bg-red-600/20 rounded-2xl flex items-center justify-between px-6 pointer-events-none"
      >
        <i className="fa-solid fa-trash-can text-white/20 text-xl" />
        <i className="fa-solid fa-trash-can text-white/20 text-xl" />
      </motion.div>
      <motion.div 
        layout
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        style={{ x, opacity }}
        onDragEnd={(_, info) => {
          if (Math.abs(info.offset.x) > 100) {
            onRemove(p);
          }
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className={`flex items-center p-4 rounded-2xl border cursor-grab active:cursor-grabbing ${
          isTop3 ? 'bg-white/10 border-fuchsia-500/30' : 'bg-[#0a0a0a] border-white/5'
        } relative overflow-hidden shadow-xl`}
      >
        {isTop3 && (
          <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: medalColor }} />
        )}
        <div className="w-10 text-xl font-black italic text-slate-600 tabular-nums shrink-0">
          {idx + 1}.
        </div>
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2">
             <div className="text-lg font-black uppercase text-white truncate">{p.name}</div>
             {p.isGroup && <i className="fa-solid fa-folder text-[#33b5e5] text-xs" />}
           </div>
           {p.isGroup ? (
             <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">
               TEAM • {p.memberCount} {t('members_count')}
             </div>
           ) : (
             <div className="flex gap-2 mt-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.MOTOR }} title="Motor" />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.PHYSICAL }} title="Physical" />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.SENSORY }} title="Sensory" />
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.ANALYTICAL }} title="Analytical" />
             </div>
           )}
        </div>
        <div className="text-right">
           <div className="text-3xl font-black tabular-nums tracking-tighter" style={{ color: getBalanceColor(p.score) }}>
             {p.score}%
           </div>
           <div className="text-[9px] font-bold uppercase text-slate-500 tracking-widest">{t('balance')}</div>
        </div>
        {idx === 0 && (
          <div className="absolute -right-4 -top-4 opacity-10 text-8xl text-fuchsia-500">
             <i className="fa-solid fa-crown" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

const HelpCard = ({ color, title, desc }: { color: string, title: string, desc: string }) => (
  <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex flex-col gap-1" style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>
    <span className="text-[10px] font-black tracking-widest uppercase" style={{ color }}>{title}</span>
    <p className="text-[11px] text-slate-400 leading-snug">{desc}</p>
  </div>
);

const OrbitRing = ({ size, scale, cells, color, activeAngle }: { size: string, scale: number, cells: number, color: string, activeAngle: number }) => {
  const normalizedActive = (activeAngle - 90 + 360) % 360;
  const baseR = (0.45 * 6.5) / scale;
  const pulseR = baseR * 1.15;
  return (
    <div className="absolute rounded-full pointer-events-none" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border border-white/10" style={{ borderColor: `${color}66`, boxShadow: `0 0 15px ${color}22` }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
        <circle cx="50" cy="50" r="50" fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
        {[...Array(cells)].map((_, i) => {
          const nodeAngle = (i * 360) / cells;
          const rad = (nodeAngle * Math.PI) / 180;
          const cx = 50 + 50 * Math.cos(rad);
          const cy = 50 + 50 * Math.sin(rad);
          const isHighlight = Math.abs(nodeAngle - normalizedActive) < (360 / (cells * 2));
          return isHighlight ? (
            <motion.circle key={i} cx={cx} cy={cy} r={baseR} fill={color} initial={false} animate={{ r: [baseR, pulseR, baseR], opacity: [0.9, 1, 0.9], fill: color }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} style={{ filter: `drop-shadow(0 0 ${10 / scale}px ${color})` }} />
          ) : (
            <circle key={i} cx={cx} cy={cy} r="1.2" fill={color} fillOpacity="0.5" className="drop-shadow-[0_0_2px_rgba(255,255,255,0.3)]" />
          );
        })}
      </svg>
    </div>
  );
};

const ToggleButton = ({ label, active, onClick, color }: { label: string, active: boolean, onClick: () => void, color: string }) => (
  <button onClick={onClick} className={`py-3 rounded text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${active ? 'bg-[#1b2531] border-[#33b5e5]/40 text-white' : 'bg-[#030303] border-white/5 text-slate-700'}`} style={active ? { borderLeftColor: color, borderLeftWidth: '6px' } : {}}>{label}</button>
);

const RadarMarker = ({ angle, color, radius, label, glowColor }: { angle: number, color: string, radius: number, label: string, glowColor: string }) => (
  <motion.div animate={{ rotate: angle }} transition={{ type: 'spring', stiffness: 60, damping: 15 }} className="absolute w-full h-full pointer-events-none z-50">
    <motion.div animate={{ scale: [1, 1.15, 1], boxShadow: [`0 0 10px ${glowColor}66`, `0 0 25px ${glowColor}aa`, `0 0 10px ${glowColor}66`] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="rounded-full border border-white/30 absolute left-1/2 flex items-center justify-center overflow-hidden" style={{ width: 14, height: 14, backgroundColor: color, top: `${50 - radius/2}%`, transform: 'translate(-50%, -50%)', boxShadow: `0 0 15px ${glowColor}aa` }}>
      <span className="text-[9px] font-black text-black leading-none pb-0.5">{label}</span>
    </motion.div>
  </motion.div>
);

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-1.5 bg-[#111] px-2.5 py-1.5 rounded border border-white/10 shadow-sm">
    <div className="w-3 h-3 rounded-sm shadow-[0_0_5px_rgba(255,255,255,0.2)]" style={{ backgroundColor: color }} />
    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{label}</span>
  </div>
);

const CriticalLevelIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 496.79 496.78" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <style type="text/css">{`
      .crit_str1 {stroke:#606062;stroke-width:15.73;stroke-miterlimit:10;fill:none}
      .crit_str0 {stroke:#606062;stroke-width:11.8;stroke-miterlimit:10;fill:none}
      .crit_fil2 {fill:#B2D573;fill-rule:nonzero}
      .crit_fil0 {fill:#9EC46A;fill-rule:nonzero}
      .crit_fil1 {fill:#8DC85E;fill-rule:nonzero}
      .crit_fil3 {fill:#7EAD50;fill-rule:nonzero}
    `}</style>
    <g id="crit_layer1">
      <path className="crit_fil0" d="M460.64 119.43c71.23,117.22 33.93,269.99 -83.29,341.21 -117.22,71.22 -269.98,33.93 -341.21,-83.29 -71.22,-117.22 -33.93,-269.99 83.29,-341.21 117.22,-71.23 269.99,-33.93 341.21,83.29z"/>
      <path className="crit_fil1" d="M460.64 119.43c71.23,117.22 33.93,269.99 -83.29,341.21 -117.22,71.22 -269.98,33.93 -341.21,-83.29 -71.22,-117.22 -33.93,-269.99 83.29,-341.21 117.22,-71.23 269.99,-33.93 341.21,83.29z"/>
      <path className="crit_fil2" d="M391.97 76.74c-48.18,-57.57 -151.51,-75.89 -230.8,-40.91 -79.3,34.98 -104.52,110.01 -56.34,167.58 48.18,57.57 151.51,75.89 230.81,40.91 79.29,-34.98 104.52,-110 56.34,-167.58z"/>
      <path className="crit_fil3" d="M365.5 328.79c-105.16,63.89 -242.19,30.44 -306.08,-74.72 -12.27,-20.2 -20.94,-41.58 -26.21,-63.38 -15.19,56.69 -8.09,119.26 24.79,173.38 63.89,105.15 200.93,138.6 306.08,74.71 84.95,-51.62 123.09,-150.98 100.93,-242.7 -14.33,53.46 -48.47,101.69 -99.5,132.7z"/>
      <path className="crit_str0" d="M80.76 283.55c3.88,18.51 10.92,36.68 21.29,53.76 49.11,80.82 154.44,106.53 235.26,57.42 40.41,-24.55 67.04,-63.16 77.43,-105.73"/>
      <path className="crit_str0" d="M396.2 277.67c0,0 15.23,18.78 40.6,8.88"/>
      <path className="crit_str0" d="M100.6 277.67c0,0 -15.23,18.78 -40.6,8.88"/>
      <line className="crit_str1" x1="132.5" y1="145.34" x2="217.33" y2="258.77" />
      <line className="crit_str1" x1="217.33" y1="145.34" x2="132.5" y2="258.77" />
      <line className="crit_str1" x1="283.33" y1="145.34" x2="368.16" y2="258.77" />
      <line className="crit_str1" x1="368.16" y1="145.34" x2="283.33" y2="258.77" />
    </g>
  </svg>
);

const LowLevelIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 497.17 497.17" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <style type="text/css">{`
      .low_str0 {stroke:#606062;stroke-width:11.81;stroke-miterlimit:10;fill:none}
      .low_fil5 {fill:#606062}
      .low_fil2 {fill:#BAE4ED;fill-rule:nonzero}
      .low_fil0 {fill:#9EC46A;fill-rule:nonzero}
      .low_fil1 {fill:#61CAE3;fill-rule:nonzero}
      .low_fil3 {fill:#22C1E5;fill-rule:nonzero}
    `}</style>
    <g id="low_layer1">
      <path className="low_fil0" d="M461 119.52c71.28,117.31 33.96,270.2 -83.35,341.47 -117.31,71.28 -270.2,33.96 -341.47,-83.35 -71.28,-117.31 -33.96,-270.19 83.35,-341.47 117.31,-71.27 270.19,-33.96 341.47,83.35z"/>
      <path className="low_fil1" d="M461 119.52c71.28,117.31 33.96,270.2 -83.35,341.47 -117.31,71.28 -270.2,33.96 -341.47,-83.35 -71.28,-117.31 -33.96,-270.19 83.35,-341.47 117.31,-71.27 270.19,-33.96 341.47,83.35z"/>
      <path className="low_fil2" d="M392.27 76.81c-48.22,-57.62 -151.64,-75.95 -230.99,-40.94 -79.35,35.01 -104.6,110.09 -56.38,167.71 48.22,57.61 151.63,75.95 230.99,40.94 79.36,-35 104.6,-110.09 56.39,-167.7z"/>
      <path className="low_fil3" d="M365.78 329.05c-105.23,63.93 -242.38,30.46 -306.32,-74.77 -12.28,-20.21 -20.95,-41.61 -26.23,-63.44 -15.21,56.74 -8.11,119.35 24.8,173.51 63.94,105.24 201.09,138.71 306.32,74.77 85.02,-51.66 123.19,-151.09 101,-242.89 -14.34,53.5 -48.5,101.77 -99.58,132.81z"/>
      <path className="low_str0" d="M80.82 283.77c3.88,18.52 10.92,36.71 21.31,53.8 49.14,80.88 154.55,106.61 235.43,57.47 40.45,-24.57 67.1,-63.21 77.5,-105.82"/>
      <path className="low_str0" d="M396.5 277.88c0,0 15.24,18.79 40.63,8.88"/>
      <path className="low_str0" d="M100.67 277.88c0,0 -15.24,18.79 -40.64,8.88"/>
      <path className="low_fil5" d="M162.48 189.24c-1.82,8.11 -2.86,17.22 -2.86,26.9 0,33.38 12.14,60.44 27.11,60.44 13.13,0 24.07,-20.8 26.57,-48.43l-50.82 -38.91z"/>
      <path className="low_fil5" d="M280.31 227.22c2.34,28.08 13.36,49.36 26.64,49.36 14.97,0 27.11,-27.06 27.11,-60.44 0,-10.01 -1.11,-19.43 -3.04,-27.75l-50.7 38.83z"/>
    </g>
  </svg>
);

const OptimalLevelIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 391.05 391.05" version="1.1" xmlns="http://www.get.org/2000/svg">
    <style type="text/css">{`
      .opt_str0 {stroke:#727376;stroke-width:9.29;stroke-miterlimit:10;fill:none}
      .opt_fil4 {fill:#727376}
      .opt_fil3 {fill:#FFFBD6}
      .opt_fil1 {fill:#FFF688}
      .opt_fil2 {fill:#F8EC22}
      .opt_fil0 {fill:#9EC46A}
    `}</style>
    <g id="opt_layer1">
      <path className="opt_fil0" d="M362.6 94.01c56.06,92.27 26.71,212.52 -65.56,268.59 -92.27,56.06 -212.52,26.71 -268.58,-65.56 -56.06,-92.27 -26.71,-212.52 65.56,-268.58 92.27,-56.07 212.52,-26.71 268.58,65.56z"/>
      <path className="opt_fil1" d="M362.6 94.01c-56.07,-92.27 -176.31,-121.62 -268.58,-65.56 -92.27,56.06 -121.62,176.31 -65.56,268.58 56.06,92.27 176.31,121.62 268.58,65.56 92.27,-56.06 121.62,-176.31 65.56,-268.59z"/>
      <path className="opt_fil2" d="M287.71 258.81c-82.77,50.29 -190.64,23.96 -240.93,-58.81 -9.66,-15.9 -16.48,-32.73 -20.63,-49.89 -11.96,44.63 -6.37,93.87 19.51,136.47 50.29,82.77 158.16,109.1 240.93,58.81 66.87,-40.63 96.89,-118.84 79.44,-191.04 -11.28,42.08 -38.15,80.05 -78.32,104.46z"/>
      <path className="opt_fil3" d="M308.54 60.41c-37.93,-45.32 -119.27,-59.74 -181.68,-32.2 -62.42,27.53 -82.27,86.59 -44.35,131.91 37.92,45.32 119.26,59.74 181.68,32.2 62.42,-27.53 82.27,-86.59 44.35,-131.91z"/>
      <path className="opt_fil4" d="M148.24 121.19c-11.78,0 -21.32,21.29 -21.32,47.54 0,26.26 9.55,47.54 21.32,47.54 11.77,0 21.32,-21.29 21.32,-47.54 0,-26.26 -9.55,-47.54 -21.32,-47.54z"/>
      <path className="opt_fil4" d="M242.8 121.19c-11.77,0 -21.32,21.29 -21.32,47.54 0,26.26 9.55,47.54 21.32,47.54 11.78,0 21.32,-21.29 21.32,-47.54 0,-26.26 -9.55,-47.54 -21.32,-47.54z"/>
      <path className="opt_str0" d="M63.57 223.2c3.06,14.57 8.59,28.87 16.76,42.32 38.66,63.62 121.56,83.86 185.18,45.2 31.81,-19.33 52.77,-49.72 60.96,-83.23"/>
      <path className="opt_str0" d="M311.87 218.57c0,0 11.98,14.78 31.96,6.99"/>
      <path className="opt_str0" d="M79.18 218.57c0,0 -11.99,14.78 -31.96,6.99"/>
    </g>
  </svg>
);

const HighLevelIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 322.43 322.43" version="1.1" xmlns="http://www.get.org/2000/svg">
    <style type="text/css">{`
      .high_str1 {stroke:#606062;stroke-width:10.21;stroke-miterlimit:10;fill:none}
      .high_str0 {stroke:#606062;stroke-width:7.66;stroke-miterlimit:10;fill:none}
      .high_fil2 {fill:#FECA66;fill-rule:nonzero}
      .high_fil1 {fill:#FBB24E;fill-rule:nonzero}
      .high_fil3 {fill:#F89B4B;fill-rule:nonzero}
      .high_fil0 {fill:#9EC46A}
    `}</style>
    <g id="high_layer1">
      <path className="high_fil0" d="M298.97 77.51c46.22,76.08 22.02,175.23 -54.06,221.45 -76.08,46.23 -175.23,22.02 -221.45,-54.06 -46.23,-76.08 -22.02,-175.23 54.06,-221.45 76.08,-46.23 175.23,-22.02 221.45,54.06z"/>
      <path className="high_fil1" d="M298.97 77.51c46.22,76.08 22.02,175.23 -54.06,221.45 -76.08,46.23 -175.23,22.02 -221.45,-54.06 -46.23,-76.08 -22.02,-175.23 54.06,-221.45 76.08,-46.23 175.23,-22.02 221.45,54.06z"/>
      <path className="high_fil2" d="M254.4 49.81c-31.27,-37.37 -98.34,-49.25 -149.8,-26.55 -51.46,22.7 -67.84,71.4 -36.57,108.76 31.27,37.37 98.34,49.25 149.8,26.55 51.47,-22.7 67.83,-71.4 36.57,-108.76z"/>
      <path className="high_fil3" d="M237.22 213.39c-68.25,41.47 -157.19,19.76 -198.65,-48.49 -7.97,-13.11 -13.59,-26.98 -17.01,-41.14 -9.86,36.79 -5.26,77.4 16.09,112.52 41.47,68.25 130.41,89.96 198.65,48.49 55.14,-33.5 79.89,-97.99 65.5,-157.52 -9.3,34.7 -31.46,66 -64.58,86.13z"/>
      <path className="high_str0" d="M52.41 184.03c2.52,12.01 7.09,23.81 13.82,34.89 31.87,52.45 100.23,69.14 152.69,37.27 26.23,-15.94 43.51,-40.99 50.26,-68.63"/>
      <path className="high_str0" d="M257.14 180.21c0,0 9.88,12.19 26.35,5.76"/>
      <path className="high_str0" d="M65.28 180.21c0,0 -9.88,12.19 -26.35,5.76"/>
      <polyline className="high_str1" points="99.03,106.57 139.81,140.33 99.03,170.09 "/>
      <polyline className="high_str1" points="223.39,106.57 182.61,140.33 223.39,170.09 "/>
    </g>
  </svg>
);

const SuperHighLevelIcon = () => (
  <svg className="w-full h-full" viewBox="0 0 391.05 391.05" version="1.1" xmlns="http://www.get.org/2000/svg">
    <style type="text/css">{`
      .super_str0 {stroke:#606062;stroke-width:9.29;stroke-miterlimit:10;fill:none}
      .super_fil5 {fill:#606062}
      .super_fil2 {fill:#F69889;fill-rule:nonzero}
      .super_fil1 {fill:#F4846B;fill-rule:nonzero}
      .super_fil3 {fill:#F16657;fill-rule:nonzero}
      .super_fil0 {fill:#9EC46A}
    `}</style>
    <g id="super_layer1">
      <path className="super_fil0" d="M362.6 94.01c56.06,92.27 26.71,212.52 -65.56,268.58 -92.27,56.07 -212.52,26.71 -268.58,-65.56 -56.06,-92.27 -26.71,-212.52 65.56,-268.58 92.27,-56.06 212.52,-26.71 268.58,65.56z"/>
      <path className="super_fil1" d="M362.6 94.01c56.06,92.27 26.71,212.52 -65.56,268.58 -92.27,56.07 -212.52,26.71 -268.58,-65.56 -56.06,-92.27 -26.71,-212.52 65.56,-268.58 92.27,-56.06 212.52,-26.71 268.58,65.56z"/>
      <path className="super_fil2" d="M308.54 60.41c-37.93,-45.32 -119.27,-59.74 -181.68,-32.2 -62.42,27.53 -82.27,86.59 -44.35,131.91 37.92,45.32 119.26,59.74 181.68,32.2 62.42,-27.53 82.27,-86.59 44.35,-131.91z"/>
      <path className="super_fil3" d="M287.71 258.81c-82.77,50.29 -190.64,23.96 -240.93,-58.81 -9.66,-15.9 -16.48,-32.73 -20.63,-49.89 -11.96,44.62 -6.37,93.88 19.51,136.47 50.29,82.77 158.16,109.11 240.93,58.81 66.87,-40.63 96.89,-118.84 79.44,-191.04 -11.28,42.08 -38.15,80.05 -78.32,104.46z"/>
      <path className="super_str0" d="M63.57 223.19c3.06,14.57 8.59,28.88 16.76,42.32 38.66,63.62 121.56,83.86 185.18,45.2 31.81,-19.33 52.77,-49.72 60.96,-83.23"/>
      <path className="super_str0" d="M311.87 218.56c0,0 11.98,14.78 31.96,6.99"/>
      <path className="super_str0" d="M79.18 218.56c0,0 -11.99,14.78 -31.96,6.99"/>
      <polygon className="super_fil5" points="147.33,148.64 138.81,111.46 118.61,143.82 80.61,140.43 105.15,169.64 90.18,204.73 125.54,190.42 154.29,215.5 151.61,177.45 184.34,157.86 "/>
      <polygon className="super_fil5" points="310.44,140.43 272.44,143.82 252.24,111.46 243.72,148.64 206.7,157.86 239.44,177.45 236.76,215.5 265.5,190.42 300.87,204.73 285.9,169.64 "/>
    </g>
  </svg>
);

export default Dashboard;
