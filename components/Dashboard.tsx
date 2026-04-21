import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DateTime, Info } from 'luxon';
import criticalIcon from '../public/icons/critical.svg';
import lowIcon from '../public/icons/low.svg';
import optimalIcon from '../public/icons/optimal.svg';
import highIcon from '../public/icons/high.svg';
import superIcon from '../public/icons/super.svg';
import { 
  calculateDaysGone, calculateFullBalance, calculateBasicBalance, calculateReactiveBalance, calculateSpecificRhythms, getRiskLevel, 
  COLORS, ACTIVITY_CONFIG, getActivitiesPack, MAP_NAMES, calculateMapAngles, calculateSecondsGone,
  getBalanceColor, calculateMoonAngle, calculateSunAngle, calculateEarthAngle
} from '../core/engine';
import { TRANSLATIONS as GLOBAL_TRANSLATIONS, LANGUAGES as GLOBAL_LANGUAGES, getT } from '../core/i18n';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Check, Swords, Users, FolderPlus, X, Upload, Download, PenTool, Trash2, 
  ChevronUp, ChevronDown, CalendarCheck, Globe, HelpCircle, Power, 
  AlertTriangle, Wand2, Folder, FolderOpen, ChevronLeft, ChevronRight,
  FolderMinus, UserMinus, Crown
} from 'lucide-react';
import { Profile } from '../types';
import { logEvent, logPageView } from '../core/analytics';
import SolarActivityChart from './SolarActivityChart';

interface DashboardProps {
  profile: Profile;
  allProfiles: Profile[];
  onAddProfile: (name: string, date: string) => void;
  onAddTeam: (teamName: string, members: {name: string, date: string}[]) => void;
  onUpdateProfile: (id: string, name: string, date: string) => void;
  onDeleteProfile: (id: string) => void;
  onGroupProfiles: (ids: string[], groupName: string) => void;
  onRenameGroup: (oldName: string, newName: string) => void;
  onUngroup: (groupName: string) => void;
  onMoveToGroup: (id: string, groupName: string | null) => void;
  onSelectProfile: (id: string) => void;
  onReset: () => void;
  onImportProfiles: (profiles: Profile[]) => void;
  onOpenCompatibility?: (date1?: string, date2?: string, lang?: string) => void;
  onLogout: () => void;
}

type Tab = 'PROFILES' | 'BALANCE' | 'ACTIVITIES' | 'CALENDAR' | 'MAPS';
type ListMode = 'NONE' | 'EDIT' | 'DELETE' | 'SELECT';
type ArenaMode = 'TOTAL' | 'BASIC' | 'REACTIVE';

const Dashboard: React.FC<DashboardProps> = ({ 
  profile, allProfiles, onAddProfile, onAddTeam, onUpdateProfile, onDeleteProfile, onGroupProfiles, onRenameGroup, onUngroup, onMoveToGroup, onSelectProfile, onReset, onImportProfiles, onOpenCompatibility, onLogout 
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
  const [addMode, setAddMode] = useState<'SINGLE' | 'TEAM'>('SINGLE');
  const [teamNameImport, setTeamNameImport] = useState('');
  const [teamText, setTeamText] = useState('');
  const [importPreview, setImportPreview] = useState<{name: string, date: string}[]>([]);

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

  const [expandedArenaGroups, setExpandedArenaGroups] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOverGroup, setIsDragOverGroup] = useState<string | null>(null);
  const [isDragOverGeneral, setIsDragOverGeneral] = useState(false);
  const [solarKIndex, setSolarKIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<any>(null);
  const groupLongPressTimer = useRef<any>(null);

  // Analytics: Track tab changes
  useEffect(() => {
    logEvent('Tab Switch', 'Navigation', activeTab);
    logPageView(`Virtual/${activeTab}`);
  }, [activeTab]);

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

  const t = getT(lang);

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
    logEvent('Reset Date', 'Controls', 'Today');
  };

  const handleExport = () => {
    logEvent('Export', 'Data', 'Contacts');
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
    logEvent('Import', 'Data', 'Contacts');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          onImportProfiles(imported);
        }
      } catch (err) {
        // Ошибка импорта
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseTeamText = (text: string) => {
    const lines = text.split('\n');
    const results: {name: string, date: string}[] = [];
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;

      // Regex for "Name - DD.MM.YYYY" or "Name — DD.MM.YYYY"
      // Groups: 1=Name, 2=Day, 3=Month, 4=Year
      const match = cleanLine.match(/^(.*?)\s*[-—]\s*(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
      
      if (match) {
        const name = match[1].trim();
        const d = match[2].padStart(2, '0');
        const m = match[3].padStart(2, '0');
        const y = match[4];
        
        const iso = `${y}-${m}-${d}T12:00`;
        const dt = DateTime.fromISO(iso);
        if (dt.isValid) {
          results.push({ name, date: iso });
        }
      }
    });
    return results;
  };

  const handleExportYearlyCalendar = () => {
    logEvent('Export', 'Data', 'Yearly Calendar');
    const year = targetDate.year;
    const monthNames = Info.months('long', { locale: lang });
    const weekDaysShort = t('days_abbr');
    const accentColor = '#8a2be2'; // Яркий фиолетовый
    
    // Данные для легенды из engine.ts
    const legendData = [
      { color: COLORS.CRITICAL, label: t('legend_crit') },
      { color: COLORS.LOW, label: t('legend_low') },
      { color: COLORS.OPTIMAL, label: t('legend_opt') },
      { color: COLORS.HIGH, label: t('legend_high') },
      { color: COLORS.SUPERHIGH, label: t('legend_super') }
    ];

    let htmlContent = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RITMXOID CALENDAR ${year} - ${profile.name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
        * { box-sizing: border-box; }
        body { 
          font-family: 'Roboto', sans-serif; 
          background: #fff; 
          color: #000; 
          margin: 0; 
          padding: 8px; 
          height: 100vh; 
          display: flex;
          flex-direction: column;
        }
        
        .header { 
          text-align: center; 
          margin-bottom: 8px; 
          border-bottom: 3px solid ${accentColor}; 
          padding-bottom: 4px;
          flex-shrink: 0;
        }
        .header h1 { margin: 0; text-transform: uppercase; font-size: 20px; font-weight: 900; letter-spacing: -1px; color: ${accentColor}; line-height: 1.1; }
        .header h2 { margin: 0; font-size: 14px; font-weight: 700; color: #444; text-transform: uppercase; }
        .header svg { height: 30px; width: 30px; margin-bottom: 2px; }
        
        /* Сетка 3 колонки на 4 ряда */
        .year-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          grid-template-rows: repeat(4, 1fr); 
          gap: 5px; 
          flex: 1;
          min-height: 0; /* Важно для Grid в Flex контейнере */
        }
        
        .month-box { border: 1px solid ${accentColor}; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
        .month-name { text-align: center; font-weight: 900; text-transform: uppercase; font-size: 10px; padding: 2px; background: ${accentColor}; color: #fff; }
        
        .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; background: #eee; gap: 1px; }
        .day-header { text-align: center; font-size: 9px; font-weight: 900; color: ${accentColor}; padding: 1px 0; background: #f8f8f8; text-transform: uppercase; border-bottom: 1px solid #ddd; }
        
        .day-cell { position: relative; background: #fff; display: flex; align-items: stretch; justify-content: stretch; overflow: hidden; }
        .day-num { position: absolute; top: 1px; left: 1px; font-size: 12px; font-weight: 900; color: #333; line-height: 1; z-index: 5; }
        
        .risk-container { position: absolute; top: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 0; z-index: 4; width: 10px; }
        .risk-mark { font-size: 8px; color: #ff0000; font-weight: 900; text-shadow: 1px 1px 0px #fff; line-height: 0.7; }
        
        .footer {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-shrink: 0;
          font-size: 10px;
        }
        
        .legend-section {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .legend-title { font-weight: 900; text-transform: uppercase; color: #555; margin-bottom: 2px; font-size: 9px; }
        .legend-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 3px; }
        .swatch { width: 10px; height: 10px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.1); }
        .risk-icon-demo { color: #ff0000; font-weight: 900; }

        @media print {
          @page { size: A4 portrait; margin: 5mm; }
          body { padding: 0; height: 287mm; } /* Чуть меньше 297 чтобы точно влезло */
        }
      </style>
    </head>
    <body>
      <div class="header">
        <svg viewBox="2500 600 2100 2200" xmlns="http://www.w3.org/2000/svg">
          <polygon fill="#FDFDFD" points="2587.46,2701.55 4560.18,2701.55 4560.18,694.95 2587.46,694.95 "/>
          <path fill="#2893E3" d="M3071.24 1227.95c77.21,36.66 394.14,6.44 500.67,413.85 27.98,106.99 246.44,-45.6 286.14,-82.73 30.35,-28.37 69.21,-85.54 94.32,-134.48 184.52,-359.58 -201.17,-799.39 -607.75,-616.03 -146.05,65.87 -292.78,240.77 -273.38,419.39z"/>
          <path fill="#FF8F19" d="M4050.99 2202.38c-54.99,-24.24 -316.95,-15.04 -452.91,-265.9 -37.76,-69.68 -36.83,-119.55 -64.11,-181.11 -88.32,-17.74 -196,55.58 -243.26,91.71 -131.25,100.38 -201.88,308.81 -147.79,484.98 25.28,82.35 83.15,172.49 129.24,209.5 224.37,180.21 532.87,158.28 698.49,-82.49 40.24,-58.51 92.8,-162.9 80.34,-256.69z"/>
          <path fill="#A41213" d="M3071.01 2203.53c37.86,-207.93 84.4,-350.26 273.9,-446.34 73.38,-37.21 108.56,-38.88 184.13,-60.35 17.16,-131.38 -120.38,-317.05 -284.86,-380.11 -510.52,-195.72 -877.19,497.76 -426.68,807.9 54.12,37.26 171.94,96.91 253.51,78.9z"/>
          <path fill="#7A3DD9" d="M3589.2 1739c-26.58,128.77 131.79,313.59 286.95,376.47 361.88,146.64 756.06,-235.22 578.82,-629.58 -75.53,-168.05 -289.81,-292.02 -398.74,-262 -30.85,72.31 -21.81,321.3 -284.48,452.37 -65.77,32.82 -119.66,37.82 -182.55,62.74z"/>
        </svg>
        <h1>RITMXOID ${year}</h1>
        <h2>${profile.name.toUpperCase()}</h2>
      </div>
      <div class="year-grid">
    `;

    for (let m = 1; m <= 12; m++) {
      const startOfMonth = DateTime.fromObject({ year, month: m, day: 1 }).setZone(APP_ZONE);
      const daysInMonth = startOfMonth.daysInMonth!;
      const firstDayOffset = startOfMonth.weekday - 1; 

      htmlContent += `
        <div class="month-box">
          <div class="month-name">${monthNames[m - 1]}</div>
          <div class="days-grid">
      `;

      weekDaysShort.forEach((d: string) => {
        htmlContent += `<div class="day-header">${d}</div>`;
      });

      for (let i = 0; i < firstDayOffset; i++) {
        htmlContent += `<div class="day-cell" style="background: #fafafa;"></div>`;
      }

      for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = startOfMonth.set({ day: d });
        const dg = calculateDaysGone(bdate, currentDate);
        const bal = calculateFullBalance(dg);
        const risk = getRiskLevel(dg, currentDate);
        const color = getBalanceColor(bal);
        
        let riskHtml = '';
        if (risk >= 25) {
          const count = risk >= 75 ? 3 : risk >= 50 ? 2 : 1;
          riskHtml = `<div class="risk-container">`;
          for(let i = 0; i < count; i++) riskHtml += `<span class="risk-mark">⚡</span>`;
          riskHtml += `</div>`;
        }

        htmlContent += `
          <div class="day-cell" style="background-color: ${color}66;">
            <span class="day-num">${d}</span>
            ${riskHtml}
          </div>
        `;
      }

      htmlContent += `</div></div>`;
    }

    htmlContent += `
      </div>
      <div class="footer">
         <div class="legend-section">
            <div class="legend-title">${t('help_levels_title')}</div>
            <div class="legend-row">
               ${legendData.map(l => `
                 <div class="legend-item">
                    <div class="swatch" style="background-color: ${l.color}"></div>
                    <span>${l.label}</span>
                 </div>
               `).join('')}
            </div>
         </div>
         <div class="legend-section" style="align-items: flex-end;">
            <div class="legend-title">${t('help_risk_title')}</div>
            <div class="legend-row">
               <div class="legend-item"><span class="risk-icon-demo">⚡</span> 1</div>
               <div class="legend-item"><span class="risk-icon-demo">⚡⚡</span> 2</div>
               <div class="legend-item"><span class="risk-icon-demo">⚡⚡⚡</span> 3</div>
            </div>
         </div>
      </div>
    </body>
    </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ritmxoid_calendar_${year}_${profile.name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      logEvent('Group Drop', 'Organization', groupName);
    }
    onDragEndGeneral();
  };

  const onDropOnGeneral = (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('profileId');
    if (id) {
      onMoveToGroup(id, null);
      logEvent('Ungroup Drop', 'Organization');
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

    selectedGroupNames.forEach(gn => {
      const members = allProfiles.filter(p => p.teamName === gn);
      if (members.length === 0) return;

      let sumScore = 0;
      const memberDetails = members.map(m => {
        const mBdate = DateTime.fromISO(m.birthDate).setZone(APP_ZONE, { keepLocalTime: true });
        const mDays = calculateDaysGone(mBdate, targetDate);
        let mScore = 0;
        if (arenaMode === 'TOTAL') mScore = calculateFullBalance(mDays);
        else if (arenaMode === 'BASIC') mScore = calculateBasicBalance(mDays);
        else if (arenaMode === 'REACTIVE') mScore = calculateReactiveBalance(mDays);
        sumScore += mScore;
        const mRisk = getRiskLevel(mDays, targetDate);
        return { ...m, score: mScore, risk: mRisk };
      }).sort((a, b) => b.score - a.score);

      data.push({
        id: `group-${gn}`,
        isGroup: true,
        name: gn,
        memberCount: members.length,
        members: memberDetails,
        score: Math.round(sumScore / members.length)
      });
    });

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
        logEvent('Long Press Select', 'Organization', 'Single');
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
      logEvent('Select Profile', 'Navigation', 'From List');
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
                {isChecked && <Check className="w-2.5 h-2.5 text-black" />}
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
                      onClick={() => { setShowArenaDialog(true); logEvent('Open Arena', 'Features'); }} 
                      title={t('arena')} 
                      className="w-8 h-8 flex items-center justify-center bg-fuchsia-600 text-white border border-fuchsia-400 rounded-lg transition-all active:scale-95 shadow-[0_0_8px_fuchsia]"
                    >
                      <Swords className="w-3 h-3" />
                    </button>
                    {(selectedIds.size === 2 && selectedGroupNames.size === 0) && (
                      <button 
                        onClick={() => { setShowCompatDialog(true); logEvent('Open Compatibility', 'Features'); }} 
                        title={t('compatibility')} 
                        className="w-8 h-8 flex items-center justify-center bg-[#33b5e5] text-black border border-[#33b5e5] rounded-lg transition-all active:scale-95 shadow-[0_0_8px_#33b5e5]"
                      >
                        <Users className="w-3 h-3" />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setShowGroupDialog(true)} title={t('group')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#33b5e5] transition-all active:scale-95"><FolderPlus className="w-3 h-3" /></button>
                <button onClick={() => { setListMode('NONE'); setSelectedIds(new Set()); setSelectedGroupNames(new Set()); setListMode('NONE'); }} title={t('close')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-all active:scale-95"><X className="w-3 h-3" /></button>
              </>
            ) : (
              <>
                <button onClick={() => fileInputRef.current?.click()} title={t('import')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-all active:scale-95"><Upload className="w-2.5 h-2.5" /></button>
                <button onClick={handleExport} title={t('export')} className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 transition-all active:scale-95"><Download className="w-2.5 h-2.5" /></button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                <button onClick={() => setListMode(listMode === 'EDIT' ? 'NONE' : 'EDIT')} title={t('edit')} className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all active:scale-95 ${listMode === 'EDIT' ? 'bg-cyan-400 border-cyan-400 text-black shadow-[0_0_8px_#33b5e5]' : 'bg-white/5 border-white/10 text-slate-400'}`}><PenTool className="w-2.5 h-2.5" /></button>
                <button onClick={() => setListMode(listMode === 'DELETE' ? 'NONE' : 'DELETE')} title={t('delete')} className={`w-8 h-8 flex items-center justify-center border rounded-lg transition-all active:scale-95 ${listMode === 'DELETE' ? 'bg-red-600 border-red-600 text-white shadow-[0_0_10px_red]' : 'bg-white/5 border-white/10 text-slate-400'}`}><Trash2 className="w-2.5 h-2.5" /></button>
                <div className="w-[1px] h-4 bg-white/10 mx-0.5" />
                <button onClick={() => { setShowAddForm(!showAddForm); setListMode('NONE'); }} className="bg-white/5 hover:bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all">{showAddForm ? t('close') : t('add')}</button>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".txt,.json" />
          </div>
        </div>

        <AnimatePresence>
          {(showAddForm || editingProfileId) && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-[#1b2531] p-4 mx-4 rounded-xl border border-white/10 space-y-4 overflow-hidden shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase text-[#33b5e5]">{editingProfileId ? t('edit') : t('add')}</h3>
                <div className="flex items-center gap-2">
                  {!editingProfileId && (
                    <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5">
                      <button onClick={() => setAddMode('SINGLE')} className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${addMode === 'SINGLE' ? 'bg-[#33b5e5] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t('single_contact')}</button>
                      <button onClick={() => setAddMode('TEAM')} className={`px-2 py-1 rounded text-[9px] font-bold uppercase transition-all ${addMode === 'TEAM' ? 'bg-[#33b5e5] text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{t('team_folder')}</button>
                    </div>
                  )}
                  <button onClick={() => { setEditingProfileId(null); setShowAddForm(false); }} className="p-1 text-slate-500 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>

              {addMode === 'SINGLE' || editingProfileId ? (
                <div className="space-y-3">
                  <input type="text" placeholder={t('name_placeholder')} value={newPName} onChange={e => setNewPName(e.target.value)} className="w-full bg-black border border-white/10 p-2 rounded text-sm outline-none focus:border-[#33b5e5] text-white" />
                  <input type="datetime-local" value={newPDate} onChange={e => setNewPDate(e.target.value)} className="w-full bg-black border border-white/10 p-2 rounded text-sm outline-none focus:border-[#33b5e5] color-scheme-dark text-white" />
                  <button onClick={() => {
                    if (editingProfileId) { onUpdateProfile(editingProfileId, newPName, newPDate); setEditingProfileId(null); setListMode('NONE'); logEvent('Update Profile', 'Data'); }
                    else if(newPName) { onAddProfile(newPName, newPDate); setNewPName(''); setShowAddForm(false); logEvent('Add Profile', 'Data'); }
                  }} className="w-full bg-[#33b5e5] text-black font-black py-2 rounded text-xs uppercase shadow-lg active:scale-[0.98] transition-transform">{t('save')}</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 ml-1">{t('team_name_label')}</label>
                      <input type="text" placeholder="Real Madrid..." value={teamNameImport} onChange={e => setTeamNameImport(e.target.value)} className="w-full bg-black border border-white/10 p-2 rounded text-sm outline-none focus:border-[#33b5e5] text-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-end px-1">
                      <label className="text-[8px] font-black uppercase text-slate-500">{t('team_folder')}</label>
                      <button 
                        onClick={async () => {
                          try { const text = await navigator.clipboard.readText(); setTeamText(text); } catch (err) { /* ignore */ }
                        }}
                        className="text-[8px] font-bold text-[#33b5e5] uppercase hover:underline"
                      >Paste</button>
                    </div>
                    <textarea 
                      value={teamText}
                      onChange={e => setTeamText(e.target.value)}
                      placeholder={t('team_list_placeholder')}
                      className="w-full bg-black border border-white/10 p-2 rounded text-xs outline-none focus:border-[#33b5e5] text-white min-h-[120px] font-mono leading-relaxed"
                    />
                  </div>

                  {importPreview.length > 0 && (
                    <div className="bg-black/40 rounded-lg p-2 border border-white/5 max-h-[100px] overflow-y-auto custom-scrollbar">
                      <p className="text-[9px] font-black text-[#33b5e5] uppercase mb-1">{t('parsed_count').replace('{n}', importPreview.length.toString())}</p>
                      <div className="space-y-1">
                        {importPreview.map((p, i) => (
                          <div key={i} className="flex justify-between text-[10px] text-slate-400 font-mono">
                            <span>{p.name}</span>
                            <span className="text-slate-600">{DateTime.fromISO(p.date).toFormat('dd.MM.yyyy')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        const results = parseTeamText(teamText);
                        setImportPreview(results);
                      }}
                      className="bg-white/5 hover:bg-white/10 text-white font-black py-2 rounded text-xs uppercase transition-all"
                    >
                      {t('view_preview')}
                    </button>
                    <button 
                      disabled={importPreview.length === 0}
                      onClick={() => {
                        if (importPreview.length > 0) {
                          onAddTeam(teamNameImport || 'Imported Team', importPreview);
                          setTeamText('');
                          setTeamNameImport('');
                          setImportPreview([]);
                          setShowAddForm(false);
                          logEvent('Import Team', 'Data');
                        }
                      }}
                      className={`font-black py-2 rounded text-xs uppercase shadow-lg transition-all ${importPreview.length > 0 ? 'bg-[#33b5e5] text-black active:scale-[0.98]' : 'bg-white/5 text-slate-600 cursor-not-allowed'}`}
                    >
                      {t('import_all')}
                    </button>
                  </div>
                </div>
              )}
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
          {/* Fix: Explicitly type groupProfiles to avoid 'unknown' type error */}
          {Object.entries(groupedData.groups).map(([groupName, groupProfiles]: [string, any[]]) => {
            const isExpanded = expandedGroups.has(groupName);
            const isContextActive = groupActionActive === groupName;
            const isGroupChecked = selectedGroupNames.has(groupName);
            
            const handleGroupLongPress = () => {
              if (listMode === 'SELECT') return;
              groupLongPressTimer.current = setTimeout(() => {
                setListMode('SELECT');
                setSelectedGroupNames(new Set([groupName]));
                logEvent('Long Press Select Group', 'Organization');
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
                      {isExpanded ? <FolderOpen className="w-3 h-3 text-[#33b5e5]" /> : <Folder className="w-3 h-3 text-[#33b5e5]" />}
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
                             ><PenTool className="w-4 h-4" /></button>
                             <button 
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setGroupToDelete(groupName);
                                setGroupActionActive(null); 
                              }}
                              className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-lg border border-red-500 hover:bg-white hover:text-red-600 transition-colors shadow-lg active:scale-90"
                             ><Trash2 className="w-4 h-4" /></button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {!isContextActive && listMode === 'SELECT' && (
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${isGroupChecked ? 'bg-[#33b5e5] border-[#33b5e5]' : 'border-white/20'}`}>
                           {isGroupChecked && <Check className="w-2.5 h-2.5 text-black" />}
                        </div>
                      )}
                      {!isContextActive && listMode !== 'SELECT' && (
                        isExpanded ? <ChevronUp className="w-2.5 h-2.5 text-slate-600 pointer-events-none" /> : <ChevronDown className="w-2.5 h-2.5 text-slate-600 pointer-events-none" />
                      )}
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
          
          // Solar Impact Logic
          const isSolarActive = solarKIndex >= 4;
          const balanceVal = calculateFullBalance(d);
          const isHammer = isSolarActive && isToday && balanceVal > 45;
          const isMagnet = isSolarActive && isToday && balanceVal <= 45;

          return (
            <motion.div 
              key={i} 
              className={`flex-1 flex flex-col justify-end h-full min-w-[3px] relative ${isToday ? 'bg-white/10 z-10 shadow-[0_0_10px_rgba(51,181,229,0.3)]' : 'opacity-60'}`}
              style={{ originY: 1 }}
              animate={isHammer ? { scaleY: [1, 0.8, 1] } : isMagnet ? { scaleY: [1, 1.2, 1] } : { scaleY: 1 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {isToday && (
                <div className={`absolute inset-0 border-x border-t border-[#33b5e5] ${isSolarActive ? 'opacity-80' : 'opacity-100'}`} />
              )}
              
              {/* Crazy Solar Sun */}
              {(isHammer || isMagnet) && (
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-600 shadow-[0_0_15px_rgba(255,0,0,0.8)] z-50 border border-white/20"
                  style={{ top: -30 }}
                  animate={
                    isHammer 
                      ? { y: [0, 25, 0], scale: [1, 1.2, 1] } // Hammering down
                      : { y: [0, -10, 0], scale: [1, 1.3, 1], boxShadow: ["0 0 15px rgba(255,0,0,0.8)", "0 0 30px rgba(255,0,0,1)", "0 0 15px rgba(255,0,0,0.8)"] } // Magnet pulse
                  }
                  transition={{ duration: 0.8, repeat: Infinity, ease: isHammer ? "circIn" : "easeInOut" }}
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                </motion.div>
              )}

              {visibleRhythms.motor && <div style={{ height: `${r.motor/4}%`, backgroundColor: COLORS.MOTOR }} className="w-full border-t border-black/30" />}
              {visibleRhythms.physical && <div style={{ height: `${r.physical/4}%`, backgroundColor: COLORS.PHYSICAL }} className="w-full border-t border-black/30" />}
              {visibleRhythms.sensory && <div style={{ height: `${r.sensory/4}%`, backgroundColor: COLORS.SENSORY }} className="w-full border-t border-black/30" />}
              {visibleRhythms.analytical && <div style={{ height: `${r.analytical/4}%`, backgroundColor: COLORS.ANALYTICAL }} className="w-full border-t border-black/30" />}
            </motion.div>
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

      <div className="pt-2">
        <SolarActivityChart title={t('solar_monitor_title')} lang={lang} onCurrentIndexChange={setSolarKIndex} />
      </div>

      <div className="pb-12">
        <CosmicEnergyChart targetDate={targetDate} lang={lang} />
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

  const getAstroEvents = (dt: DateTime) => {
    const events = [];
    
    if (dt.month === 3 && dt.day === 20) events.push({ type: 'equinox', icon: '🌱' }); // Vernal Equinox
    if (dt.month === 6 && dt.day === 21) events.push({ type: 'solstice', icon: '☀️' }); // Summer Solstice
    if (dt.month === 9 && dt.day === 22) events.push({ type: 'equinox', icon: '🍂' }); // Autumnal Equinox
    if (dt.month === 12 && dt.day === 21) events.push({ type: 'solstice', icon: '❄️' }); // Winter Solstice

    const fullMoonRef = DateTime.fromObject({ year: 1996, month: 1, day: 6, hour: 16, minute: 15 }, { zone: 'utc' });
    const lunarPeriodMillis = 29.530588 * 24 * 3600 * 1000;
    
    const diffMillisStart = dt.set({hour: 0}).toUTC().diff(fullMoonRef).as('milliseconds');
    const diffMillisEnd = dt.set({hour: 23, minute: 59}).toUTC().diff(fullMoonRef).as('milliseconds');
    
    const angleStart = ((diffMillisStart % lunarPeriodMillis + lunarPeriodMillis) % lunarPeriodMillis * 360) / lunarPeriodMillis;
    const angleEnd = ((diffMillisEnd % lunarPeriodMillis + lunarPeriodMillis) % lunarPeriodMillis * 360) / lunarPeriodMillis;

    if (angleStart > 300 && angleEnd < 60) events.push({ type: 'moon', icon: '🌕' });
    else if (angleStart <= 90 && angleEnd > 90) events.push({ type: 'moon', icon: '🌗' });
    else if (angleStart <= 180 && angleEnd > 180) events.push({ type: 'moon', icon: '🌑' });
    else if (angleStart <= 270 && angleEnd > 270) events.push({ type: 'moon', icon: '🌓' });
    
    return events;
  };

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
        <div className="mb-4 p-3 bg-[#1b2531]/60 border border-white/10 rounded shadow-lg flex justify-between items-center">
           <div className="text-[11px] font-bold text-[#33b5e5] uppercase tracking-widest">
             {t('risk_index')} <span className="text-white ml-2 text-base drop-shadow-[0_0_5px_#fff]">{monthlyRiskIndex}</span>
           </div>
           {targetDate.month === 1 && (
             <button 
                onClick={handleExportYearlyCalendar}
                className="bg-[#33b5e5] text-black px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-white transition-colors active:scale-95 shadow-[0_0_10px_rgba(51,181,229,0.4)]"
             >
                <CalendarCheck className="w-4 h-4" />
                {t('export_year')}
             </button>
           )}
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
            const astroEvts = getAstroEvents(d);
            return (
              <div key={i} className={`aspect-square relative flex flex-col items-center justify-center border border-white/10 transition-all duration-300 ${isCurrentMonth ? 'shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]' : ''}`} style={{ backgroundColor: isCurrentMonth ? `${bgColor}99` : 'transparent', opacity: isCurrentMonth ? 1 : 0.15 }}>
                {isToday && <div className="absolute inset-0 border-2 border-[#33b5e5] z-10 shadow-[0_0_15px_#33b5e5,inset_0_0_10px_#33b5e5]" />}
                <span className={`text-[10px] sm:text-xs md:text-lg lg:text-xl xl:text-3xl font-black absolute top-0.5 left-1 sm:top-1 sm:left-1.5 lg:top-2 lg:left-2.5 ${isCurrentMonth ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`}>{d.day}</span>
                
                {isCurrentMonth && astroEvts.length > 0 && (
                  <div className="absolute bottom-0.5 left-1 sm:bottom-1 sm:left-1.5 lg:bottom-2 lg:left-2.5 flex gap-0.5 md:gap-1.5 z-10">
                    {astroEvts.map((e, ei) => (
                      <span key={ei} className="text-[10px] sm:text-xs md:text-lg lg:text-xl xl:text-3xl drop-shadow-[0_0_3px_rgba(255,255,255,0.5)]" title={e.type}>{e.icon}</span>
                    ))}
                  </div>
                )}

                {isCurrentMonth && riskLvl >= 25 && (
                  <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 lg:top-2 lg:right-2 flex flex-col gap-0 sm:gap-0.5 lg:gap-1">
                    {[...Array(riskLvl >= 75 ? 3 : riskLvl >= 50 ? 2 : 1)].map((_, idx) => (
                      <div key={idx} className="relative w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 xl:w-8 xl:h-8 flex items-center justify-center">
                        <div className="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3.5 md:h-3.5 lg:w-4.5 lg:h-4.5 xl:w-6 xl:h-6 rounded-full bg-red-600/80 blur-[1.5px] md:blur-[2px] lg:blur-[3px] animate-pulse-red" />
                        <span className="text-[10px] sm:text-xs md:text-lg lg:text-xl xl:text-3xl leading-none text-white relative z-10 drop-shadow-sm">⚡</span>
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
    setTargetDate(prev => {
      if (activeTab === 'CALENDAR') {
        return forward ? prev.plus({ months: 1 }) : prev.minus({ months: 1 });
      } else {
        return forward ? prev.plus({ days: 1 }) : prev.minus({ days: 1 });
      }
    });
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
      <header className="bg-[#1b2531] border-b-2 border-black p-3 md:p-6 lg:p-8 flex items-center gap-4 md:gap-8 shadow-lg z-[9999]">
        <div className="w-10 h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center shrink-0">{getBalanceEmoji(balance)}</div>
        <div className="flex-1 min-w-0">
           <div className="text-xl md:text-3xl lg:text-4xl font-black tracking-tighter uppercase leading-none truncate">{profile.name}</div>
           <div className="flex items-center gap-2 mt-1 text-[11px] md:text-base lg:text-lg font-bold uppercase" style={{ color: getBalanceColor(balance) }}>
              <span>{getBalanceLabel(balance)}</span>
              <span className="text-white/20">•</span>
              <div className="flex items-center">
                <span className="text-white tabular-nums">{balance}%</span>
                {currentRiskLvl >= 25 && (
                  <div className="flex items-center gap-0.5 ml-1.5">
                    {[...Array(currentRiskLvl >= 75 ? 3 : currentRiskLvl >= 50 ? 2 : 1)].map((_, idx) => (
                      <div key={idx} className="relative w-3 h-3 md:w-5 md:h-5 flex items-center justify-center">
                        <div className="absolute w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-red-600/80 blur-[1.5px] md:blur-[3px] animate-pulse-red" />
                        <span className="text-[9px] md:text-sm leading-none text-white relative z-10 drop-shadow-sm">⚡</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
           </div>
        </div>
        <div className="flex items-center gap-1 md:gap-3 shrink-0 relative">
          <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><Globe className="w-5 h-5 md:w-7 md:h-7 text-[#33b5e5]" /></button>
          <AnimatePresence>
            {isLangMenuOpen && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full mt-2 right-0 bg-[#1b2531] border border-white/20 rounded-xl shadow-2xl z-[10000] overflow-hidden w-40 md:w-56 backdrop-blur-md">
                {GLOBAL_LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => { setLang(l.code); setIsLangMenuOpen(false); logEvent('Change Language', 'Settings', l.code); }} className={`w-full px-4 py-3 md:py-4 flex items-center gap-3 hover:bg-white/10 transition-colors text-xs md:text-sm font-bold uppercase ${lang === l.code ? 'text-[#33b5e5]' : 'text-slate-300'}`}><span className="text-lg md:text-xl">{l.flag}</span>{l.name}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => { setIsHelpOpen(true); logEvent('Open Help', 'Navigation'); }} className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"><HelpCircle className="w-5 h-5 md:w-7 md:h-7 text-[#33b5e5]" /></button>
          <button onClick={() => setShowLogoutConfirm(true)} className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors" title="Выход"><Power className="w-5 h-5 md:w-7 md:h-7 text-red-500" /></button>
        </div>
      </header>

      <nav className="bg-[#1b2531] flex border-b border-black z-40 shadow-md">
        {(['PROFILES', 'BALANCE', 'ACTIVITIES', 'CALENDAR', 'MAPS'] as Tab[]).map(t_tab => (
          <button key={t_tab} onClick={() => { setActiveTab(t_tab); if(t_tab !== 'PROFILES') setListMode('NONE'); }} className={`flex-1 py-4 md:py-6 lg:py-8 text-[9px] md:text-sm lg:text-base font-black tracking-widest transition-all relative ${activeTab === t_tab ? 'text-white' : 'text-slate-500'}`}>
            {t(t_tab.toLowerCase()).toUpperCase()}
            {activeTab === t_tab && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 w-full h-[3px] md:h-[5px] bg-[#33b5e5] shadow-[0_0_8px_#33b5e5]" />}
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

      <footer className="bg-[#1b2531] p-4 md:p-8 lg:p-10 flex items-center justify-between border-t-2 border-black z-40 shadow-[0_-5px_25px_rgba(0,0,0,0.6)]">
         <button onClick={() => stepDate(false)} className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-black/40 rounded border border-white/5 text-[#33b5e5] active:scale-95 transition-transform"><ChevronLeft className="w-6 h-6 md:w-10 md:h-10" /></button>
         <div onClick={resetToToday} className="flex flex-col items-center cursor-pointer hover:opacity-80 active:scale-95 transition-all group" title="Вернуться к сегодняшнему дню">
            <span className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter text-white uppercase tabular-nums group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
              {activeTab === 'CALENDAR' ? targetDate.toFormat('LLLL yyyy', { locale: lang }) : targetDate.toFormat('dd LLL. yyyy', { locale: lang })}
            </span>
            <span className="text-[10px] md:text-sm lg:text-base font-bold text-[#33b5e5] tabular-nums group-hover:text-white transition-colors">{targetDate.toFormat('HH:mm')}</span>
         </div>
         <button onClick={() => stepDate(true)} className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-black/40 rounded border border-white/5 text-[#33b5e5] active:scale-95 transition-transform"><ChevronRight className="w-6 h-6 md:w-10 md:h-10" /></button>
      </footer>

      <AnimatePresence>
        {showGroupDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-w-sm space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <FolderPlus className="w-10 h-10 text-[#33b5e5]" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">{t('group')}</h2>
              </div>
              <input autoFocus type="text" placeholder={t('group_placeholder')} value={tempGroupName} onChange={e => setTempGroupName(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-[#33b5e5] text-white" />
              <div className="flex gap-3">
                <button onClick={() => { onGroupProfiles(Array.from(selectedIds), tempGroupName); setSelectedIds(new Set()); setSelectedGroupNames(new Set()); setListMode('NONE'); setShowGroupDialog(false); setTempGroupName(''); logEvent('Create Group', 'Organization'); }} className="flex-1 bg-[#33b5e5] text-black font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform">{t('save')}</button>
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
                <PenTool className="w-10 h-10 text-[#33b5e5]" />
                <h2 className="text-2xl font-black uppercase tracking-tighter">{t('rename')}</h2>
              </div>
              <input autoFocus type="text" placeholder={t('group_placeholder')} value={tempGroupName} onChange={e => setTempGroupName(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-[#33b5e5] text-white" />
              <div className="flex gap-3">
                <button onClick={() => { onRenameGroup(showRenameDialog, tempGroupName); setShowRenameDialog(null); setTempGroupName(''); logEvent('Rename Group', 'Organization'); }} className="flex-1 bg-[#33b5e5] text-black font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform">{t('save')}</button>
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
              <button onClick={() => setIsHelpOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white"><X className="w-6 h-6" /></button>
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
                     { icon: <CriticalLevelIcon />, color: '#44aa00', label: 'legend_crit', descKey: 'help_crit_full' },
                     { icon: <LowLevelIcon />, color: '#2196f3', label: 'legend_low', descKey: 'help_low_full' },
                     { icon: <OptimalLevelIcon />, color: '#ffd600', label: 'legend_opt', descKey: 'help_opt_full' },
                     { icon: <HighLevelIcon />, color: '#ff9800', label: 'legend_high', descKey: 'help_high_full' },
                     { icon: <SuperHighLevelIcon />, color: '#ff1744', label: 'legend_super', descKey: 'help_super_full' }
                   ].map(lvl => (
                    <div key={lvl.label} className="bg-white/5 p-4 rounded-xl border-l-4 flex gap-4" style={{ borderColor: lvl.color }}>
                      <div className="w-12 h-12 shrink-0">{lvl.icon}</div>
                      <div>
                        <div className="text-[10px] font-black mb-1 uppercase" style={{ color: lvl.color }}>{t(lvl.label)}</div>
                        <p className="text-xs text-slate-300 leading-snug">{t(lvl.descKey)}</p>
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
                   <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 italic">{t('help_arena_total_desc')}</div>
                   <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 italic">{t('help_arena_basic_desc')}</div>
                   <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 italic">{t('help_arena_reactive_desc')}</div>
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
                   <p className="text-xs text-slate-300"><span className="text-cyan-400 font-bold uppercase">{t('resonant')}:</span> {t('help_compat_resonant_desc')}</p>
                   <p className="text-xs text-slate-300"><span className="text-yellow-400 font-bold uppercase">{t('optimal_compat')}:</span> {t('help_compat_optimal_desc')}</p>
                   <p className="text-xs text-slate-300"><span className="text-red-500 font-bold uppercase">{t('polar')}:</span> {t('help_compat_polar_desc')}</p>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_calendar_year_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed italic">
                   {t('help_calendar_year_desc')}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_solar_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed italic">
                   {t('help_solar_desc')}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_cosmic_energy_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed italic">
                   {t('help_cosmic_energy_desc')}
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-[#ffd600] font-black uppercase text-sm border-b border-white/10 pb-1">{t('help_astro_events_title')}</h3>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-xs text-slate-300 leading-relaxed italic">
                   {t('help_astro_events_desc')}
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-red-600 mb-2"><AlertTriangle className="w-10 h-10 mx-auto" /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('confirm_delete')}</h2>
              <p className="text-slate-400 text-sm font-bold uppercase">{profileToDelete.name}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { onDeleteProfile(profileToDelete.id); setProfileToDelete(null); setListMode('NONE'); logEvent('Delete Profile', 'Data'); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-900/20">{t('yes')}</button>
                <button onClick={() => setProfileToDelete(null)} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {groupToDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-red-600 mb-2"><FolderMinus className="w-10 h-10 mx-auto" /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('ungroup')}</h2>
              <p className="text-slate-300 text-xs font-bold uppercase">{groupToDelete}</p>
              <p className="text-slate-500 text-[10px] italic">{t('confirm_ungroup')}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { onUngroup(groupToDelete); setGroupToDelete(null); setGroupActionActive(null); logEvent('Ungroup', 'Organization'); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-900/20">{t('yes')}</button>
                <button onClick={() => setGroupToDelete(null)} className="flex-1 bg-white/5 text-slate-300 font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform border border-white/10">{t('no')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-red-600 mb-2"><Power className="w-10 h-10 mx-auto" /></div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{t('confirm_logout')}</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{profile.name}</p>
              <div className="flex gap-3 pt-4">
                <button onClick={() => { onLogout(); setShowLogoutConfirm(false); logEvent('Logout', 'Session'); }} className="flex-1 bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-widest active:scale-95 transition-transform shadow-lg shadow-red-900/20">{t('yes')}</button>
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
                 
                 <button 
                   onClick={() => {
                     setShowCompatDialog(false);
                     if (onOpenCompatibility) {
                       const selectedIds = Array.from(totalEffectiveSelected);
                       const p1 = allProfiles.find(p => p.id === selectedIds[0]);
                       const p2 = allProfiles.find(p => p.id === selectedIds[1]);
                       if (p1 && p2) {
                         onOpenCompatibility(p1.birthDate, p2.birthDate, lang);
                       }
                     }
                   }}
                   className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#33b5e5]/50 rounded-xl text-xs text-slate-400 hover:text-white leading-relaxed italic text-center transition-all cursor-pointer group"
                 >
                    {(compatIndex === 0 || compatIndex === 1 || compatIndex === 12 || compatIndex === 13) && t('help_compat_resonant_desc')}
                    {((compatIndex >= 2 && compatIndex <= 4) || (compatIndex >= 9 && compatIndex <= 11)) && t('help_compat_optimal_desc')}
                    {(compatIndex >= 5 && compatIndex <= 8) && t('help_compat_polar_desc')}
                    <div className="mt-2 text-[#33b5e5] text-[10px] uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      <Wand2 className="w-4 h-4 mr-2" />
                      {t('synthesis_btn')}
                    </div>
                 </button>
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
                  <Swords className="w-10 h-10 text-fuchsia-500 mx-auto" />
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">{t('arena')}</h2>
                </div>
                <button onClick={() => setShowArenaDialog(false)} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white"><X className="w-6 h-6" /></button>
             </div>

             <div className="flex gap-1 bg-[#1b2531] p-1 rounded-xl mb-6 shadow-lg border border-white/10">
                {(['TOTAL', 'BASIC', 'REACTIVE'] as ArenaMode[]).map(mode => (
                  <button 
                    key={mode} 
                    onClick={() => { setArenaMode(mode); logEvent('Switch Arena Mode', 'Features', mode); }}
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
                    isExpanded={expandedArenaGroups.has(entity.id)}
                    onToggleExpand={() => {
                      const newSet = new Set(expandedArenaGroups);
                      if (newSet.has(entity.id)) newSet.delete(entity.id);
                      else newSet.add(entity.id);
                      setExpandedArenaGroups(newSet);
                    }}
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
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#1b2531] border border-white/20 p-8 rounded-[2rem] w-full max-sm text-center space-y-6 shadow-2xl">
              <div className="text-4xl text-fuchsia-500 mb-2">{arenaEntityToRemove.isGroup ? <FolderMinus className="w-10 h-10 mx-auto" /> : <UserMinus className="w-10 h-10 mx-auto" />}</div>
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
                  if (arenaData.length <= 1) {
                        setShowArenaDialog(false);
                        setListMode('NONE');
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

// Fix: Use React.FC to properly handle 'key' prop and other implicit props
interface ArenaItemProps {
  p: any;
  idx: number;
  t: any;
  onRemove: (p: any) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const ArenaItem: React.FC<ArenaItemProps> = ({ p, idx, t, onRemove, isExpanded, onToggleExpand }) => {
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
        <Trash2 className="text-white/20 w-8 h-8" />
        <Trash2 className="text-white/20 w-8 h-8" />
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
        onClick={() => p.isGroup && onToggleExpand()}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        className={`flex flex-col rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-xl ${
          isTop3 ? 'bg-white/10 border-fuchsia-500/30' : 'bg-[#0a0a0a] border-white/5'
        }`}
      >
        <div className="p-4 flex items-center">
          {isTop3 && (
            <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: medalColor }} />
          )}
          <div className="w-10 text-xl font-black italic text-slate-600 tabular-nums shrink-0">
            {idx + 1}.
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-lg font-black uppercase text-white truncate">{p.name}</div>
              {p.isGroup && <Folder className={`w-3 h-3 text-[#33b5e5] inline-block mr-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
            </div>
            {p.isGroup ? (
              <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1 flex items-center gap-2">
                TEAM • {p.memberCount} {t('members_count')}
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
            <div className="absolute -right-4 -top-4 opacity-10 text-8xl text-fuchsia-500 pointer-events-none">
                <Crown className="w-4 h-4 text-yellow-500 ml-1" />
            </div>
          )}
        </div>

        {p.isGroup && isExpanded && (
          <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3 bg-black/20">
            {p.members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between group/member">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {getBalanceEmoji(m.score)}
                  </div>
                  <div>
                    <div className="text-[11px] font-black uppercase text-slate-300 truncate max-w-[150px]">{m.name}</div>
                    <div className="text-[8px] text-slate-600 font-bold">{DateTime.fromISO(m.birthDate).toFormat('dd.MM.yyyy')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.risk >= 25 && (
                    <div className="flex items-center gap-0.5">
                       {[...Array(m.risk >= 75 ? 3 : m.risk >= 50 ? 2 : 1)].map((_, idx) => (
                         <div key={idx} className="relative w-4 h-4 flex items-center justify-center">
                           <div className="absolute w-2.5 h-2.5 rounded-full bg-red-600/60 blur-[2px] animate-pulse-red" />
                           <span className="text-xs leading-none text-white relative z-10 drop-shadow-md">⚡</span>
                         </div>
                       ))}
                    </div>
                  )}
                  <div className="flex flex-col items-end">
                    <div className="text-[14px] font-black tabular-nums" style={{ color: getBalanceColor(m.score) }}>{m.score}%</div>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.MOTOR }} />
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.PHYSICAL }} />
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.SENSORY }} />
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.ANALYTICAL }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
            <motion.circle key={i} cx={cx} cy={cy} r={baseR} fill={color} initial={false} animate={{ r: [baseR, pulseR, baseR], opacity: [0.9, 1, 0.9] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} style={{ filter: `drop-shadow(0 0 ${10 / scale}px ${color})` }} />
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

const CosmicEnergyChart = ({ targetDate, lang }: { targetDate: DateTime, lang: string }) => {
  const t = getT(lang);
  const [mode, setMode] = useState<'day' | 'month' | 'quarter' | '12years'>('day');

  const data = useMemo(() => {
    const points = [];
    
    const fullMoonRef = DateTime.fromObject({ year: 1996, month: 1, day: 6, hour: 16, minute: 15 }, { zone: 'utc' });
    const lunarPeriodMillis = 29.530588 * 24 * 3600 * 1000;

    const createPoint = (dt: DateTime, label: string, isNow: boolean = false) => {
        const hourDec = dt.hour + dt.minute / 60;
        const sunScore = ((Math.cos((hourDec - 12) * Math.PI / 12) + 1) / 2) * 50;

        const diffMillis = dt.toUTC().diff(fullMoonRef).as('milliseconds');
        const phaseProgress = (diffMillis % lunarPeriodMillis + lunarPeriodMillis) % lunarPeriodMillis;
        const moonAngle = (phaseProgress * 360) / lunarPeriodMillis;
        const moonScore = ((Math.cos(moonAngle * Math.PI / 180) + 1) / 2) * 25;

        const june21 = DateTime.fromObject({ year: dt.year, month: 6, day: 21 }, { zone: 'utc' });
        const daysSinceJune = dt.toUTC().diff(june21).as('days');
        const earthScore = ((Math.cos(daysSinceJune / 365.2425 * Math.PI * 2) + 1) / 2) * 12;

        const march21_2020 = DateTime.fromObject({ year: 2020, month: 3, day: 21 }, { zone: 'utc' });
        const daysSince2020 = dt.toUTC().diff(march21_2020).as('days');
        const jpScore = ((Math.cos(daysSince2020 / (12 * 365.2425) * Math.PI * 2) + 1) / 2) * 8;

        const dec1_2019 = DateTime.fromObject({ year: 2019, month: 12, day: 1 }, { zone: 'utc' });
        const daysSince2019 = dt.toUTC().diff(dec1_2019).as('days');
        const solarScore = ((-Math.cos(daysSince2019 / (11.1 * 365.2425) * Math.PI * 2) + 1) / 2) * 5;

        return {
            label,
            isNow,
            sun: sunScore,
            moon: moonScore,
            earth: earthScore,
            jp: jpScore,
            sol: solarScore,
            total: sunScore + moonScore + earthScore + jpScore + solarScore
        };
    };

    const now = DateTime.now().setZone(targetDate.zoneName || 'utc');

    if (mode === 'day') {
        const startOfTarget = targetDate.startOf('day');
        for (let i = 0; i < 24; i++) {
            const current = startOfTarget.plus({ hours: i });
            points.push(createPoint(current.plus({ minutes: 30 }), current.toFormat('HH:00'), now.hasSame(current, 'hour')));
        }
    } else if (mode === 'month') {
        const startOfTarget = targetDate.startOf('month');
        const daysInMonth = targetDate.daysInMonth!;
        for (let i = 0; i < daysInMonth; i++) {
            const current = startOfTarget.plus({ days: i });
            points.push(createPoint(current.plus({ hours: 12 }), current.toFormat('dd.MM'), now.hasSame(current, 'day')));
        }
    } else if (mode === 'quarter') {
        const startOfTarget = targetDate.startOf('month');
        const endOfTarget = startOfTarget.plus({ months: 3 });
        let current = startOfTarget;
        while (current < endOfTarget) {
            points.push(createPoint(current.plus({ days: 3, hours: 12 }), current.toFormat('dd.MM'), now >= current && now < current.plus({ weeks: 1 })));
            current = current.plus({ weeks: 1 });
        }
    } else if (mode === '12years') {
        const startOfTarget = targetDate.startOf('year').minus({ years: 6 });
        for (let i = 0; i < 48; i++) {
            const current = startOfTarget.plus({ months: i * 3 });
            points.push(createPoint(current.plus({ months: 1, days: 15 }), current.toFormat('yyyy'), now >= current && now < current.plus({ months: 3 })));
        }
    }

    return points;
  }, [targetDate, mode]);

  const envLabel = t('cosmic_energy');
  const dayLabel = t('cosmic_day');
  const monthLabel = t('cosmic_month');
  const qtLabel = t('cosmic_quarter');
  const y12Label = t('cosmic_12years');
  const totalLabel = t('cosmic_total');
  const isDay = mode === 'day';

  const legend = [
    { key: 'sun', color: '#dc2626', label: t('cosmic_sun') },
    { key: 'moon', color: '#eab308', label: t('cosmic_moon') },
    { key: 'earth', color: '#33b5e5', label: t('cosmic_earth') },
    { key: 'jp', color: '#22c55e', label: t('cosmic_jp') },
    { key: 'sol', color: '#ffffff', label: t('cosmic_sol') },
  ];
  
  const activeLegend = isDay ? legend : legend.filter(l => l.key !== 'sun');

  return (
    <div className="mt-6 bg-[#111] border border-white/10 rounded-xl p-3 flex flex-col gap-3 relative z-10 box-border w-full">
       <div className="flex justify-between items-center flex-wrap gap-2">
         <h3 className="text-sm font-black text-white tracking-widest uppercase">{envLabel}</h3>
         <div className="flex bg-black rounded p-0.5 border border-white/10">
           <button onClick={() => setMode('day')} className={`px-2 py-1 text-[10px] font-black uppercase rounded-sm transition-colors ${mode === 'day' ? 'bg-[#33b5e5] text-black' : 'text-slate-400'}`}>{dayLabel}</button>
           <button onClick={() => setMode('month')} className={`px-2 py-1 text-[10px] font-black uppercase rounded-sm transition-colors ${mode === 'month' ? 'bg-[#33b5e5] text-black' : 'text-slate-400'}`}>{monthLabel}</button>
           <button onClick={() => setMode('quarter')} className={`px-2 py-1 text-[10px] font-black uppercase rounded-sm transition-colors ${mode === 'quarter' ? 'bg-[#33b5e5] text-black' : 'text-slate-400'}`}>{qtLabel}</button>
           <button onClick={() => setMode('12years')} className={`px-2 py-1 text-[10px] font-black uppercase rounded-sm transition-colors ${mode === '12years' ? 'bg-[#33b5e5] text-black' : 'text-slate-400'}`}>{y12Label}</button>
         </div>
       </div>

       <div className="relative h-48 flex items-end justify-between px-1 gap-[2px] border-b border-l border-white/20 mt-2">
         <div className="absolute inset-0 grid grid-rows-4 pointer-events-none">
           {[100, 75, 50, 25].map(v => (
             <div key={v} className="border-t border-white/5 w-full flex items-start">
               <span className="text-[9px] text-slate-600 ml-1 mt-[-6px] font-bold">{isDay ? v : v / 2}%</span>
             </div>
           ))}
         </div>
         {data.map((d, i) => {
            let showLabel = false;
            let isYearStart = false;
            if (mode === 'day' && i % 4 === 0) showLabel = true;
            if (mode === 'month' && i % 5 === 0) showLabel = true;
            if (mode === 'quarter') showLabel = true;
            if (mode === '12years' && i % 4 === 0) {
              showLabel = true;
              isYearStart = true;
            }
           
           const scale = isDay ? 1 : 2;

           return (
           <div key={i} className={`relative flex flex-col justify-end gap-[1px] w-full group h-full ${mode === 'quarter' ? 'w-8' : 'min-w-[2px]'} ${d.isNow ? 'z-20' : 'z-10'} ${isYearStart ? 'border-l border-white/20 ml-1 pl-1' : ''}`}>
             <div 
               style={{ height: `${d.sol * scale}%`, backgroundColor: '#ffffff' }} 
               className={`w-full transition-all group-hover:opacity-100 border-t border-black/30 ${d.isNow ? 'opacity-100 animate-pulse ring-1 ring-white/50 shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'opacity-80'}`} 
             />
             <div 
               style={{ height: `${d.jp * scale}%`, backgroundColor: '#22c55e' }} 
               className={`w-full transition-all group-hover:opacity-100 border-t border-black/30 ${d.isNow ? 'opacity-100 animate-pulse ring-1 ring-white/20' : 'opacity-80'}`} 
             />
             <div 
               style={{ height: `${d.earth * scale}%`, backgroundColor: '#33b5e5' }} 
               className={`w-full transition-all group-hover:opacity-100 border-t border-black/30 ${d.isNow ? 'opacity-100 animate-pulse ring-1 ring-white/20' : 'opacity-80'}`} 
             />
             <div 
               style={{ height: `${d.moon * scale}%`, backgroundColor: '#eab308' }} 
               className={`w-full transition-all group-hover:opacity-100 border-t border-black/30 ${d.isNow ? 'opacity-100 animate-pulse ring-1 ring-white/20' : 'opacity-80'}`} 
             />
             {isDay && (
               <div 
                 style={{ height: `${d.sun * scale}%`, backgroundColor: '#dc2626' }} 
                 className={`w-full transition-all group-hover:opacity-100 border-t border-black/30 ${d.isNow ? 'opacity-100 animate-pulse ring-1 ring-white/20' : 'opacity-80'}`} 
               />
             )}
             
             {showLabel && (
               <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-bold whitespace-nowrap">
                  {d.label}
               </div>
             )}
             
             {/* Tooltip */}
             <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur-md border border-white/20 px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none z-[100] flex flex-col gap-0.5 shadow-[0_0_20px_rgba(0,0,0,0.8)] transition-opacity scale-90 group-hover:scale-100 origin-bottom">
               <div className="text-[10px] text-white font-bold whitespace-nowrap mb-1 border-b border-white/10 pb-0.5 text-center">{d.label}</div>
               {activeLegend.slice().reverse().map(leg => {
                  const val = d[leg.key as keyof typeof d] as number;
                  return (
                    <div key={leg.key} className="flex items-center justify-between gap-3 text-[9px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: leg.color }} />
                        <span className="text-slate-300 font-bold">{leg.label}</span>
                      </div>
                      <span className="text-white font-black tabular-nums">{val.toFixed(1)}%</span>
                    </div>
                  );
               })}
               <div className="border-t border-white/10 mt-1 pt-1 flex justify-between gap-3 text-[10px]">
                 <span className="text-slate-400 font-black">{totalLabel}</span>
                 <span className="text-[#33b5e5] font-black">{Math.round(isDay ? d.total : d.total - d.sun)}%</span>
               </div>
             </div>
           </div>
         )})}
       </div>

       <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-6 pb-2">
         {activeLegend.map(l => (
           <div key={l.key} className="flex items-center gap-1.5">
             <div className="w-2.5 h-2.5 rounded-[2px] shadow-[0_0_5px_rgba(255,255,255,0.1)]" style={{ backgroundColor: l.color }} />
             <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">{l.label}</span>
           </div>
         ))}
       </div>
    </div>
  );
};

const LegendItem = ({ color, label }: { color: string, label: string }) => (
  <div className="flex items-center gap-1.5 bg-[#111] px-2.5 py-1.5 rounded border border-white/10 shadow-sm">
    <div className="w-3 h-3 rounded-sm shadow-[0_0_5px_rgba(255,255,255,0.2)]" style={{ backgroundColor: color }} />
    <span className="text-[9px] font-black text-slate-300 uppercase tracking-tighter">{label}</span>
  </div>
);

const getBalanceEmoji = (val: number) => {
  if (val >= 75) return <SuperHighLevelIcon />;
  if (val >= 60) return <HighLevelIcon />;
  if (val >= 45) return <OptimalLevelIcon />;
  if (val >= 30) return <LowLevelIcon />;
  return <CriticalLevelIcon />;
};

const CriticalLevelIcon = () => (
  <img src={criticalIcon} className="w-full h-full object-contain" alt="Critical" />
);

const LowLevelIcon = () => (
  <img src={lowIcon} className="w-full h-full object-contain" alt="Low" />
);

const OptimalLevelIcon = () => (
  <img src={optimalIcon} className="w-full h-full object-contain" alt="Optimal" />
);

const HighLevelIcon = () => (
  <img src={highIcon} className="w-full h-full object-contain" alt="High" />
);

const SuperHighLevelIcon = () => (
  <img src={superIcon} className="w-full h-full object-contain" alt="Super" />
);


export default Dashboard;
