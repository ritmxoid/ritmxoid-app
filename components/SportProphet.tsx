import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DateTime } from 'luxon';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, Users, Plus, X, Upload, Download, Trash2, 
  ChevronUp, ChevronDown, Calendar, Crown, Folder,
  UserPlus, ClipboardList, Info, ArrowLeft, Send
} from 'lucide-react';
import { Profile } from '../types';
import { 
  calculateDaysGone, calculateFullBalance, calculateBasicBalance, 
  calculateReactiveBalance, getRiskLevel, getBalanceColor, COLORS 
} from '../core/engine';
import { getT } from '../core/i18n';

// Reusing icons from Dashboard style
const CriticalLevelIcon = () => <div className="w-full h-full rounded-full bg-red-600/20 flex items-center justify-center text-[10px] font-bold text-red-500">C</div>;
const LowLevelIcon = () => <div className="w-full h-full rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-bold text-blue-500">L</div>;
const OptimalLevelIcon = () => <div className="w-full h-full rounded-full bg-yellow-600/20 flex items-center justify-center text-[10px] font-bold text-yellow-500">O</div>;
const HighLevelIcon = () => <div className="w-full h-full rounded-full bg-orange-600/20 flex items-center justify-center text-[10px] font-bold text-orange-500">H</div>;
const SuperHighLevelIcon = () => <div className="w-full h-full rounded-full bg-fuchsia-600/20 flex items-center justify-center text-[10px] font-bold text-fuchsia-500">S</div>;

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
  const [lang] = useState(() => {
    const saved = localStorage.getItem('ritmxoid_lang');
    return saved || 'ru';
  });

  const t = getT(lang);

  useEffect(() => {
    localStorage.setItem('sportprophet_profiles', JSON.stringify(profiles));
  }, [profiles]);

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
      teamName: tName
    }));

    setProfiles([...profiles, ...newProfiles]);
    setTeamText('');
    setTeamName('');
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
      {/* Header */}
      <div className="p-6 bg-[#1b2531]/50 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[#33b5e5]">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="space-y-1">
            <h1 className="text-3xl font-black italic tracking-tighter text-[#33b5e5] uppercase">SportPROphet</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest opacity-80">Rhythmic Team Analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <label className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">{t('target_date')}</label>
              <input 
                type="datetime-local" 
                value={targetDate} 
                onChange={e => setTargetDate(e.target.value)}
                className="bg-black border border-white/20 rounded-lg p-2 text-xs text-white focus:border-[#33b5e5] outline-none color-scheme-dark"
              />
            </div>
            <button 
                onClick={() => profiles.length > 0 && setShowArena(true)}
                disabled={selectedIds.size === 0 && selectedGroups.size === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-sm tracking-widest transition-all ${
                  (selectedIds.size > 0 || selectedGroups.size > 0) 
                  ? 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_20px_rgba(255,0,255,0.3)]' 
                  : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
            >
                <Swords className="w-4 h-4" />
                ARENA
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Welcome / Input Section */}
        <section className="max-w-4xl mx-auto space-y-6">
          <div className="bg-[#1b2531] p-6 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-900/20 rounded-full blur-[100px] pointer-events-none" />
            <h2 className="text-xl font-black uppercase tracking-widest text-[#33b5e5] mb-6 flex items-center gap-3">
              <ClipboardList className="w-6 h-6" />
              CREATE TEAM / LIST
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Team Name</label>
                        <input 
                            type="text" 
                            placeholder="Enter team name..." 
                            value={teamName}
                            onChange={e => setTeamName(e.target.value)}
                            className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-[#33b5e5] text-white"
                        />
                    </div>
                    <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center gap-3 text-[#33b5e5]">
                            <Info className="w-4 h-4 shrink-0" />
                            <p className="text-[10px] font-bold uppercase leading-relaxed text-slate-400">
                                Format: Name - DD.MM.YYYY<br/>One player per line
                            </p>
                        </div>
                        <button 
                            onClick={handleAddTeam}
                            className="w-full bg-[#33b5e5] hover:bg-white text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> ADD PLAYERS
                        </button>
                    </div>
                </div>
                <div className="relative group">
                    <textarea 
                        placeholder="John Doe - 15.05.1995\nJane Smith - 22.08.1990" 
                        value={teamText}
                        onChange={e => setTeamText(e.target.value)}
                        className="w-full h-full min-h-[180px] bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-[#33b5e5] text-white font-mono leading-relaxed"
                    />
                </div>
            </div>
          </div>
        </section>

        {/* Existing Teams / Players Section */}
        <section className="max-w-4xl mx-auto space-y-4 pb-20">
            <h2 className="text-xl font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 px-4">
              <Users className="w-6 h-6" />
              AVAILABLE FOR ARENA
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Groups */}
                {Object.entries(groupedData.groups).map(([gn, members]) => (
                    <div 
                        key={gn}
                        onClick={() => toggleGroupSelect(gn)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between overflow-hidden relative shadow-lg ${
                            selectedGroups.has(gn) ? 'bg-fuchsia-600/20 border-fuchsia-500 ring-1 ring-fuchsia-500' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-fuchsia-900/40 text-fuchsia-400`}>
                                <Folder className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-white text-lg">{gn}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{members.length} MEMBERS</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedGroups.has(gn) ? 'bg-fuchsia-600 border-fuchsia-400' : 'border-white/20'
                        }`}>
                            {selectedGroups.has(gn) && <Swords className="w-3 h-3 text-white" />}
                        </div>
                        {selectedGroups.has(gn) && (
                            <motion.div layoutId={`glow-${gn}`} className="absolute inset-0 bg-fuchsia-500/5 blur-[20px] pointer-events-none" />
                        )}
                    </div>
                ))}

                {/* Individual Profiles */}
                {groupedData.ungrouped.map(p => (
                    <div 
                        key={p.id}
                        onClick={() => toggleSelect(p.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between shadow-lg ${
                            selectedIds.has(p.id) ? 'bg-[#33b5e5]/20 border-[#33b5e5] ring-1 ring-[#33b5e5]' : 'bg-[#0a0a0a] border-white/5 hover:border-white/20'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-slate-900/50 flex items-center justify-center">
                                <Users className="w-6 h-6 text-slate-500" />
                            </div>
                            <div>
                                <h3 className="font-black uppercase tracking-tighter text-white">{p.name}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{DateTime.fromISO(p.birthDate).toFormat('dd.MM.yyyy')}</p>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedIds.has(p.id) ? 'bg-[#33b5e5] border-[#33b5e5]' : 'border-white/20'
                        }`}>
                            {selectedIds.has(p.id) && <Plus className="w-3 h-3 text-black" />}
                        </div>
                    </div>
                ))}

                {profiles.length === 0 && (
                    <div className="md:col-span-2 py-12 text-center space-y-3 opacity-30">
                        <Users className="w-16 h-16 mx-auto mb-4" />
                        <p className="text-sm font-black uppercase tracking-[0.3em]">No players available</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Start by adding players or a team list above</p>
                    </div>
                )}
            </div>
            
            {profiles.length > 0 && (
                <div className="flex justify-center pt-8">
                     <button 
                        onClick={() => {
                            if (window.confirm("Clear all data from SportPROphet?")) {
                                setProfiles([]);
                                setSelectedIds(new Set());
                                setSelectedGroups(new Set());
                            }
                        }}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500/50 hover:text-red-500 transition-colors"
                     >
                        <Trash2 className="w-3 h-3" /> CLEAR ALL DATA
                     </button>
                </div>
            )}
        </section>
      </div>

      {/* Arena Dialog (Full Screen Overlay) */}
      <AnimatePresence>
        {showArena && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex flex-col p-4 sm:p-8 overflow-hidden"
          >
             <div className="flex justify-between items-center mb-8 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                  <Swords className="w-12 h-12 text-fuchsia-500" />
                  <div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white leading-none">ARENA</h2>
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
                    EXIT ARENA
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
