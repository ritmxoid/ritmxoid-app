import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DateTime } from 'luxon';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Users, Plus, X, Upload, Download, Trash2, 
  ChevronUp, ChevronDown, Calendar, Crown, Folder,
  UserPlus, ClipboardList, Info, ArrowLeft, Send, Globe
} from 'lucide-react';
import { Profile } from '../types';
import { 
  calculateDaysGone, calculateFullBalance, calculateBasicBalance, 
  calculateReactiveBalance, getRiskLevel, getBalanceColor, COLORS 
} from '../core/engine';
import { getT, LANGUAGES } from '../core/i18n';
import { logEvent, logPageView } from '../core/analytics';
import criticalIcon from '../public/icons/critical.svg';
import lowIcon from '../public/icons/low.svg';
import optimalIcon from '../public/icons/optimal.svg';
import highIcon from '../public/icons/high.svg';
import superIcon from '../public/icons/super.svg';

// Reusing icons from Dashboard style
const CriticalLevelIcon = () => <img src={criticalIcon} className="w-full h-full object-contain" alt="C" />;
const LowLevelIcon = () => <img src={lowIcon} className="w-full h-full object-contain" alt="L" />;
const OptimalLevelIcon = () => <img src={optimalIcon} className="w-full h-full object-contain" alt="O" />;
const HighLevelIcon = () => <img src={highIcon} className="w-full h-full object-contain" alt="H" />;
const SuperHighLevelIcon = () => <img src={superIcon} className="w-full h-full object-contain" alt="S" />;

const getBalanceEmoji = (val: number) => {
  if (val >= 75) return <SuperHighLevelIcon />;
  if (val >= 60) return <HighLevelIcon />;
  if (val >= 45) return <OptimalLevelIcon />;
  if (val >= 30) return <LowLevelIcon />;
  return <CriticalLevelIcon />;
};

interface SportProphetProps {
  onBack: () => void;
}

type ArenaMode = 'TOTAL' | 'BASIC' | 'REACTIVE';

const SportProphet: React.FC<SportProphetProps> = ({ onBack }) => {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('sportprophet_profiles');
    return saved ? JSON.parse(saved) : [];
  });
  const [arenaMode, setArenaMode] = useState<ArenaMode>('TOTAL');
  const [targetDate, setTargetDate] = useState(DateTime.now().toFormat("yyyy-MM-dd'T'HH:mm"));
  const [teamText, setTeamText] = useState('');
  const [teamName, setTeamName] = useState('');
  const [showArena, setShowArena] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('ritmxoid_lang');
    return saved || 'ru';
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const t = getT(lang);

  useEffect(() => {
    logPageView('SportProphet');
  }, []);

  useEffect(() => {
    localStorage.setItem('sportprophet_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('ritmxoid_lang', lang);
  }, [lang]);

  const targetDt = useMemo(() => {
    const dt = DateTime.fromISO(targetDate);
    return dt.isValid ? dt : DateTime.now();
  }, [targetDate]);

  const groupedData = useMemo(() => {
    const groups: Record<string, Profile[]> = {};
    const ungrouped: Profile[] = [];

    profiles.forEach(p => {
      if (p.teamName) {
        if (!groups[p.teamName]) groups[p.teamName] = [];
        groups[p.teamName].push(p);
      } else {
        ungrouped.push(p);
      }
    });

    return { groups, ungrouped };
  }, [profiles]);

  const parseTeamText = (text: string) => {
    const lines = text.split('\n');
    const results: {name: string, date: string}[] = [];
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;
      const match = cleanLine.match(/^(.*?)\s*[-—]\s*(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})$/);
      if (match) {
        const name = match[1].trim();
        const d = match[2].padStart(2, '0');
        const m = match[3].padStart(2, '0');
        const y = match[4];
        const iso = `${y}-${m}-${d}T12:00`;
        if (DateTime.fromISO(iso).isValid) results.push({ name, date: iso });
      }
    });
    return results;
  };

  const handleAddTeam = () => {
    const results = parseTeamText(teamText);
    if (results.length === 0) return;

    const tName = teamName || `Team ${Date.now()}`;
    const newProfiles: Profile[] = results.map((r, idx) => ({
      id: `sp-${Date.now()}-${idx}`,
      name: r.name,
      birthDate: r.date,
      teamName: tName,
      isMaster: false
    }));

    setProfiles([...profiles, ...newProfiles]);
    setTeamText('');
    setTeamName('');
    logEvent('SportProphet Team Add', 'Features', tName);
  };

  const arenaData = useMemo(() => {
    if (!showArena) return [];
    const data: any[] = [];

    selectedGroups.forEach(gn => {
      const members = profiles.filter(p => p.teamName === gn);
      if (members.length === 0) return;

      let sumScore = 0;
      const memberDetails = members.map(m => {
        const bdate = DateTime.fromISO(m.birthDate);
        const days = calculateDaysGone(bdate, targetDt);
        let score = 0;
        if (arenaMode === 'TOTAL') score = calculateFullBalance(days);
        else if (arenaMode === 'BASIC') score = calculateBasicBalance(days);
        else if (arenaMode === 'REACTIVE') score = calculateReactiveBalance(days);
        sumScore += score;
        return { ...m, score, risk: getRiskLevel(days, targetDt) };
      }).sort((a, b) => b.score - a.score);

      data.push({
        id: `group-${gn}`,
        isGroup: true,
        name: gn,
        members: memberDetails,
        score: Math.round(sumScore / members.length)
      });
    });

    selectedIds.forEach(id => {
      const p = profiles.find(x => x.id === id);
      if (!p || (p.teamName && selectedGroups.has(p.teamName))) return;
      const bdate = DateTime.fromISO(p.birthDate);
      const days = calculateDaysGone(bdate, targetDt);
      let score = 0;
      if (arenaMode === 'TOTAL') score = calculateFullBalance(days);
      else if (arenaMode === 'BASIC') score = calculateBasicBalance(days);
      else if (arenaMode === 'REACTIVE') score = calculateReactiveBalance(days);
      data.push({ ...p, score, isGroup: false });
    });

    return data.sort((a, b) => b.score - a.score);
  }, [showArena, profiles, selectedGroups, selectedIds, arenaMode, targetDt]);

  useEffect(() => {
    if (showArena) {
        logPageView('Arena (SportProphet)');
        logEvent('Arena Mode', 'Features', arenaMode);
    }
  }, [showArena, arenaMode]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleGroupSelect = (gn: string) => {
    const next = new Set(selectedGroups);
    if (next.has(gn)) next.delete(gn);
    else next.add(gn);
    setSelectedGroups(next);
  };

  return (
    <div className="min-h-screen bg-black text-white font-['Roboto'] overflow-hidden flex flex-col">
      {/* Header - Logo Only */}
      <div className="p-6 bg-[#1b2531]/50 backdrop-blur-xl border-b border-white/10 flex justify-center">
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-4xl font-black italic tracking-tighter text-[#33b5e5] uppercase">SportPROphet</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] opacity-80">Rhythmic Team Analytics</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
        {/* Step 1: Input Section */}
        <section className="max-w-xl mx-auto space-y-4">
          <div className="bg-[#1b2531] p-6 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#33b5e5]/10 rounded-full blur-[80px] pointer-events-none" />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
                <h2 className="text-sm font-black uppercase tracking-widest text-[#33b5e5] flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    {t('select_team').toUpperCase()}
                </h2>

                <div className="relative">
                    <button 
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className="flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-black/60 transition-colors"
                    >
                        <Globe className="w-3.5 h-3.5 text-[#33b5e5]" />
                        <span className="text-[10px] font-black uppercase text-white">{lang}</span>
                    </button>

                    <AnimatePresence>
                        {isLangMenuOpen && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-32 bg-[#1b2531] border border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
                            >
                                {LANGUAGES.map(l => (
                                    <button 
                                        key={l.code}
                                        onClick={() => {
                                            setLang(l.code);
                                            setIsLangMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors ${lang === l.code ? 'bg-[#33b5e5]/10' : ''}`}
                                    >
                                        <span className="text-sm">{l.flag}</span>
                                        <span className={`text-[10px] font-black uppercase ${lang === l.code ? 'text-[#33b5e5]' : 'text-slate-400'}`}>{l.code}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            
            <div className="space-y-4">
                <input 
                    type="text" 
                    placeholder={t('team_name_input')} 
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-[#33b5e5] text-white transition-all"
                />
                <textarea 
                    placeholder={t('team_list_hint')} 
                    value={teamText}
                    onChange={e => setTeamText(e.target.value)}
                    className="w-full min-h-[120px] bg-black/50 border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-[#33b5e5] text-white font-mono leading-loose"
                />
                <button 
                    onClick={handleAddTeam}
                    disabled={!teamText.trim()}
                    className="w-full bg-[#33b5e5] hover:bg-white text-black font-black py-4 rounded-2xl text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-20 disabled:grayscale"
                >
                    <Plus className="w-4 h-4" /> {t('add_team_btn')}
                </button>
            </div>
          </div>
        </section>

        {/* Step 2: Available Content */}
        <section className="max-w-xl mx-auto space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2 px-2">
              <Users className="w-4 h-4" />
              {t('select_players').toUpperCase()}
            </h2>

            <div className="grid grid-cols-1 gap-3">
                {/* Groups */}
                {Object.entries(groupedData.groups).map(([gn, members]: [string, any]) => (
                    <div 
                        key={gn}
                        onClick={() => toggleGroupSelect(gn)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between relative overflow-hidden ${
                            selectedGroups.has(gn) ? 'bg-fuchsia-600/20 border-fuchsia-500 ring-1 ring-fuchsia-500' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedGroups.has(gn) ? 'bg-fuchsia-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                <Folder className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-white">{gn}</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{members.length} {t('members_count')}</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedGroups.has(gn) ? 'bg-fuchsia-600 border-fuchsia-400' : 'border-white/10'
                        }`}>
                            {selectedGroups.has(gn) && <Swords className="w-3 h-3 text-white" />}
                        </div>
                    </div>
                ))}

                {/* Individual Profiles */}
                {groupedData.ungrouped.map(p => (
                    <div 
                        key={p.id}
                        onClick={() => toggleSelect(p.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                            selectedIds.has(p.id) ? 'bg-[#33b5e5]/20 border-[#33b5e5] ring-1 ring-[#33b5e5]' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                                <Users className="w-5 h-5 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-white">{p.name}</h3>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{DateTime.fromISO(p.birthDate).toFormat('dd.MM.yyyy')}</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedIds.has(p.id) ? 'bg-[#33b5e5] border-[#33b5e5]' : 'border-white/10'
                        }`}>
                            {selectedIds.has(p.id) && <Plus className="w-3 h-3 text-black" />}
                        </div>
                    </div>
                ))}
            </div>
            
            {profiles.length > 0 && (
                <button 
                   onClick={() => window.confirm(t('confirm_delete')) && setProfiles([])}
                   className="w-full py-4 text-[9px] font-black uppercase tracking-widest text-red-500/30 hover:text-red-500 transition-colors"
                >
                   <Trash2 className="w-3 h-3 inline mr-1" /> {t('clear_data_btn')}
                </button>
            )}
        </section>

        {/* Step 3: Global Action Block */}
        <section className="max-w-xl mx-auto pb-10">
            <div className="bg-[#1b2531]/80 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-6">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-black text-[#33b5e5] uppercase mb-2 tracking-[0.3em] flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {t('calendar').toUpperCase()}
                  </label>
                  <input 
                    type="datetime-local" 
                    value={targetDate} 
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-center text-white focus:border-fuchsia-500 outline-none color-scheme-dark"
                  />
                </div>

                <button 
                    onClick={() => profiles.length > 0 && setShowArena(true)}
                    disabled={selectedIds.size === 0 && selectedGroups.size === 0}
                    className={`w-full py-6 rounded-[2rem] font-black uppercase text-base tracking-[0.3em] transition-all flex items-center justify-center gap-4 ${
                      (selectedIds.size > 0 || selectedGroups.size > 0) 
                      ? 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_30px_rgba(255,0,255,0.4)] text-white scale-105' 
                      : 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5'
                    }`}
                >
                    <Swords className="w-6 h-6" />
                    {t('arena').toUpperCase()}
                </button>
            </div>

            <div className="mt-8 flex justify-center">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900/50 hover:bg-slate-800 text-slate-500 hover:text-[#33b5e5] text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 hover:border-[#33b5e5]/20 group"
                >
                    <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
                    {t('back')} RitmXoid
                </button>
            </div>
        </section>
      </div>

      <AnimatePresence>
        {showArena && (
          <motion.div 
            initial={{ opacity: 0, scale: 1.1 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-8 overflow-hidden"
          >
             <div className="flex justify-between items-center mb-8 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                  <Swords className="w-12 h-12 text-fuchsia-500" />
                  <div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">{t('arena').toUpperCase()}</h2>
                    <p className="text-[10px] font-bold text-fuchsia-500/70 uppercase tracking-[0.3em] mt-1">{targetDt.toFormat('dd.MM.yyyy HH:mm')}</p>
                  </div>
                </div>
                <button 
                    onClick={() => setShowArena(false)} 
                    className="w-14 h-14 rounded-2xl bg-white/5 hover:bg-white/10 hover:rotate-90 transition-all flex items-center justify-center text-white border border-white/10"
                >
                    <X className="w-8 h-8" />
                </button>
             </div>

             <div className="flex gap-2 p-1 bg-[#1b2531] rounded-[1.25rem] mb-8 shadow-2xl border border-white/10 max-w-xl mx-auto w-full shrink-0">
                {(['TOTAL', 'BASIC', 'REACTIVE'] as ArenaMode[]).map(mode => (
                  <button 
                    key={mode} 
                    onClick={() => setArenaMode(mode)}
                    className={`flex-1 py-4 text-[11px] font-black uppercase tracking-tighter rounded-xl transition-all ${
                      arenaMode === mode ? 'bg-fuchsia-600 text-white shadow-[0_0_15px_rgba(255,0,255,0.4)]' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {t(`arena_${mode.toLowerCase()}`)}
                  </button>
                ))}
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 max-w-5xl mx-auto w-full pb-10">
                {arenaData.map((p, idx) => {
                  const isTop3 = idx < 3;
                  const medalColor = idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'transparent';
                  const isGroup = p.isGroup;
                  const isExpanded = expandedGroups.has(p.id);

                  return (
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={p.id}
                        className="relative"
                    >
                        <div 
                            onClick={() => isGroup && setExpandedGroups(prev => {
                                const next = new Set(prev);
                                if (next.has(p.id)) next.delete(p.id);
                                else next.add(p.id);
                                return next;
                            })}
                            className={`flex flex-col rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden shadow-2xl ${
                                isTop3 ? 'bg-white/10 border-fuchsia-500/40' : 'bg-[#0a0a0a] border-white/5'
                            }`}
                        >
                            <div className="p-6 flex items-center">
                                {isTop3 && (
                                    <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: medalColor }} />
                                )}
                                <div className="w-14 text-2xl font-black italic text-slate-700 shrink-0 tabular-nums">
                                    {idx + 1}.
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl font-black uppercase text-white truncate tracking-tighter">{p.name}</div>
                                        {isGroup && <div className="p-1 px-2 text-[9px] font-black bg-[#33b5e5] text-black rounded-lg">TEAM</div>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                            {isGroup ? `${p.members.length} PLAYERS` : DateTime.fromISO(p.birthDate).toFormat('dd.MM.yyyy')}
                                        </div>
                                        {isGroup && (
                                            <div className="flex items-center text-fuchsia-500 text-[10px] font-black uppercase animate-pulse">
                                                {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                                                {isExpanded ? 'Hide' : 'Show Details'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-black tabular-nums tracking-tighter" style={{ color: getBalanceColor(p.score) }}>
                                        {p.score}%
                                    </div>
                                    <div className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em]">{t('balance')}</div>
                                </div>
                                {idx === 0 && (
                                    <div className="absolute -right-4 -top-6 opacity-10 text-9xl text-yellow-500 pointer-events-none rotate-12">
                                        <Crown className="w-32 h-32" />
                                    </div>
                                )}
                            </div>

                            {/* Sub-profiles for Teams */}
                            <AnimatePresence>
                                {isGroup && isExpanded && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-6 pb-6 space-y-3 border-t border-white/5 pt-4 bg-black/40"
                                    >
                                        {p.members.map((m: any, mIdx: number) => (
                                            <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 shrink-0">
                                                        {getBalanceEmoji(m.score)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black uppercase text-white truncate max-w-[150px]">{m.name}</div>
                                                        <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest">{DateTime.fromISO(m.birthDate).toFormat('dd.MM.yyyy')}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                     {m.risk >= 25 && (
                                                        <div className="flex items-center gap-1">
                                                           {[...Array(m.risk >= 75 ? 3 : m.risk >= 50 ? 2 : 1)].map((_, i) => (
                                                              <span key={i} className="text-xl text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.6)]">⚡</span>
                                                           ))}
                                                        </div>
                                                     )}
                                                     <div className="text-right">
                                                         <div className="text-xl font-black tabular-nums tracking-tighter" style={{ color: getBalanceColor(m.score) }}>{m.score}%</div>
                                                         <div className="flex gap-1 mt-0.5 justify-end">
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.MOTOR }} />
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.PHYSICAL }} />
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.SENSORY }} />
                                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS.ANALYTICAL }} />
                                                         </div>
                                                     </div>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                  );
                })}

                {arenaData.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                         <Swords className="w-20 h-20 text-slate-800 mx-auto" />
                         <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-800">Arena is Empty</p>
                    </div>
                )}
             </div>

             <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-xs sm:max-w-md px-4">
                <button 
                    onClick={() => setShowArena(false)} 
                    className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-5 rounded-[2rem] uppercase tracking-widest text-sm transition-all border border-white/10 shadow-2xl active:scale-95"
                >
                    {t('exit_arena').toUpperCase()}
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #33b5e533; border-radius: 10px; }
        .color-scheme-dark { color-scheme: dark; }
      `}} />
    </div>
  );
};

export default SportProphet;
