import React, { useState, useEffect, useRef } from 'react';
import { Profile } from './types';
import Dashboard from './components/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DateTime, Info } from 'luxon';
import { calculateDaysGone, getRiskLevel, calculateFullBalance, getBalanceColor, COLORS } from './core/engine';
import { getT } from './core/i18n';
import { logEvent } from './core/analytics';

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const saved = localStorage.getItem('ritmxoid_db_profiles');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    const saved = localStorage.getItem('ritmxoid_active_id');
    return saved || (profiles.length > 0 ? profiles[0].id : null);
  });

  const [isAuthorized, setIsAuthorized] = useState(() => profiles.length > 0);
  const [tempDate, setTempDate] = useState('1990-01-01T12:00');
  const [tempName, setTempName] = useState('');
  const [nameError, setNameError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profiles.length > 0) {
      localStorage.setItem('ritmxoid_db_profiles', JSON.stringify(profiles));
    } else {
      localStorage.removeItem('ritmxoid_db_profiles');
    }
    
    if (activeProfileId) {
      localStorage.setItem('ritmxoid_active_id', activeProfileId);
    } else {
      localStorage.removeItem('ritmxoid_active_id');
    }
  }, [profiles, activeProfileId]);

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  const handleAuthorize = () => {
    if (profiles.length > 0) {
      setIsAuthorized(true);
      logEvent('Auto Login', 'Session', 'Existing User');
      return;
    }

    if (!tempName) {
      setNameError(true);
      return;
    }
    const master: Profile = {
      id: 'master-' + Date.now(),
      name: tempName,
      birthDate: tempDate,
      isMaster: true
    };
    setProfiles([master]);
    setActiveProfileId(master.id);
    setIsAuthorized(true);
    logEvent('New Login', 'Session', 'New User');
  };

  const handleQuickPdfExport = async () => {
    if (!tempName) {
      setNameError(true);
      return;
    }
    if (!tempDate) {
      alert("Enter Birth Date first.");
      return;
    }
    
    logEvent('Quick PDF Export', 'Conversion', 'Pre-Login');

    const APP_ZONE = 'utc+5';
    const bdate = DateTime.fromISO(tempDate).setZone(APP_ZONE, { keepLocalTime: true });
    const year = DateTime.now().setZone(APP_ZONE).year;
    const monthNames = Info.months('long', { locale: 'en' }); 
    const weekDaysShort = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const accentColor = '#8a2be2';

    // Logo SVG for PDF (unused in simple implementation but kept for logic structure)
    const logoSvgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="2500 600 2100 2200" width="100" height="100">
        <path fill="#2893E3" d="M3071.24 1227.95c77.21,36.66 394.14,6.44 500.67,413.85 27.98,106.99 246.44,-45.6 286.14,-82.73 30.35,-28.37 69.21,-85.54 94.32,-134.48 184.52,-359.58 -201.17,-799.39 -607.75,-616.03 -146.05,65.87 -292.78,240.77 -273.38,419.39z"/>
        <path fill="#FF8F19" d="M4050.99 2202.38c-54.99,-24.24 -316.95,-15.04 -452.91,-265.9 -37.76,-69.68 -36.83,-119.55 -64.11,-181.11 -88.32,-17.74 -196,55.58 -243.26,91.71 -131.25,100.38 -201.88,308.81 -147.79,484.98 25.28,82.35 83.15,172.49 129.24,209.5 224.37,180.21 532.87,158.28 698.49,-82.49 40.24,-58.51 92.8,-162.9 80.34,-256.69z"/>
        <path fill="#A41213" d="M3071.01 2203.53c37.86,-207.93 84.4,-350.26 273.9,-446.34 73.38,-37.21 108.56,-38.88 184.13,-60.35 17.16,-131.38 -120.38,-317.05 -284.86,-380.11 -510.52,-195.72 -877.19,497.76 -426.68,807.9 54.12,37.26 171.94,96.91 253.51,78.9z"/>
        <path fill="#7A3DD9" d="M3589.2 1739c-26.58,128.77 131.79,313.59 286.95,376.47 361.88,146.64 756.06,-235.22 578.82,-629.58 -75.53,-168.05 -289.81,-292.02 -398.74,-262 -30.85,72.31 -21.81,321.3 -284.48,452.37 -65.77,32.82 -119.66,37.82 -182.55,62.74z"/>
      </svg>
    `;
    
    // Stub: PDF Export logic would go here
    alert("PDF Export triggered for: " + tempName);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          setProfiles(imported);
          if (imported.length > 0) setActiveProfileId(imported[0].id);
          setIsAuthorized(true);
        }
      } catch (err) {
        alert("Invalid file format");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddProfile = (name: string, date: string) => {
    const newProfile: Profile = {
      id: Date.now().toString(),
      name,
      birthDate: date,
      isMaster: false
    };
    setProfiles([...profiles, newProfile]);
  };

  const handleUpdateProfile = (id: string, name: string, date: string) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, name, birthDate: date } : p));
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(profiles[0]?.id || null);
  };
  
  const handleGroupProfiles = (ids: string[], groupName: string) => {
    setProfiles(profiles.map(p => ids.includes(p.id) ? { ...p, teamName: groupName } : p));
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    setProfiles(profiles.map(p => p.teamName === oldName ? { ...p, teamName: newName } : p));
  };

  const handleUngroup = (groupName: string) => {
    setProfiles(profiles.map(p => p.teamName === groupName ? { ...p, teamName: undefined } : p));
  };

  const handleMoveToGroup = (id: string, groupName: string | null) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, teamName: groupName || undefined } : p));
  };

  const handleImportProfiles = (imported: Profile[]) => {
    setProfiles(imported);
    if (imported.length > 0) setActiveProfileId(imported[0].id);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-['Roboto']">
        <div className="absolute inset-0 z-0 opacity-30">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/40 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-[#1b2531]/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="2500 600 2100 2200" className="w-full h-full drop-shadow-[0_0_15px_rgba(51,181,229,0.5)]">
                <path fill="#2893E3" d="M3071.24 1227.95c77.21,36.66 394.14,6.44 500.67,413.85 27.98,106.99 246.44,-45.6 286.14,-82.73 30.35,-28.37 69.21,-85.54 94.32,-134.48 184.52,-359.58 -201.17,-799.39 -607.75,-616.03 -146.05,65.87 -292.78,240.77 -273.38,419.39z"/>
                <path fill="#FF8F19" d="M4050.99 2202.38c-54.99,-24.24 -316.95,-15.04 -452.91,-265.9 -37.76,-69.68 -36.83,-119.55 -64.11,-181.11 -88.32,-17.74 -196,55.58 -243.26,91.71 -131.25,100.38 -201.88,308.81 -147.79,484.98 25.28,82.35 83.15,172.49 129.24,209.5 224.37,180.21 532.87,158.28 698.49,-82.49 40.24,-58.51 92.8,-162.9 80.34,-256.69z"/>
                <path fill="#A41213" d="M3071.01 2203.53c37.86,-207.93 84.4,-350.26 273.9,-446.34 73.38,-37.21 108.56,-38.88 184.13,-60.35 17.16,-131.38 -120.38,-317.05 -284.86,-380.11 -510.52,-195.72 -877.19,497.76 -426.68,807.9 54.12,37.26 171.94,96.91 253.51,78.9z"/>
                <path fill="#7A3DD9" d="M3589.2 1739c-26.58,128.77 131.79,313.59 286.95,376.47 361.88,146.64 756.06,-235.22 578.82,-629.58 -75.53,-168.05 -289.81,-292.02 -398.74,-262 -30.85,72.31 -21.81,321.3 -284.48,452.37 -65.77,32.82 -119.66,37.82 -182.55,62.74z"/>
              </svg>
            </div>
            <div className="space-y-1">
              <div className="relative inline-block">
                  <h1 className="text-4xl font-black text-[#33b5e5] tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(51,181,229,0.3)]">RITMXOID</h1>
                  <span className="absolute -top-2 -right-10 text-[9px] font-bold text-[#33b5e5] opacity-50 tracking-widest">v.3.5.4</span>
              </div>
              <p className="text-slate-400 uppercase tracking-[0.2em] text-[10px] font-black opacity-80">Rhythmic Analytics Core</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#33b5e5] transition-colors">
                  <i className="fa-solid fa-file-signature text-sm" />
                </div>
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={e => {
                      setTempName(e.target.value);
                      if (e.target.value) setNameError(false);
                  }}
                  placeholder="Enter name..."
                  className={`w-full bg-black border ${nameError ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'border-white/10'} rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white placeholder:text-slate-800`}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  title="Import contacts from file"
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#33b5e5] hover:bg-[#33b5e5]/10 rounded-xl transition-colors"
                >
                  <i className="fa-solid fa-file-import" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Birth Date</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#33b5e5] transition-colors pointer-events-none">
                  <i className="fa-solid fa-calendar-day text-sm" />
                </div>
                <input 
                  type="datetime-local" 
                  value={tempDate} 
                  onChange={e => setTempDate(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-16 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white color-scheme-dark"
                />
                <button
                  onClick={handleQuickPdfExport}
                  title="Quick Download PDF Calendar"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-red-600 hover:scale-110 active:scale-95 transition-transform"
                >
                  <svg width="28px" height="28px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(255,0,0,0.4)]">
                    <path d="M4 4C4 3.44772 4.44772 3 5 3H14H14.5858C14.851 3 15.1054 3.10536 15.2929 3.29289L19.7071 7.70711C19.8946 7.89464 20 8.149 20 8.41421V20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20 8H15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11.5 13H11V17H11.5C12.6046 17 13.5 16.1046 13.5 15C13.5 13.8954 12.6046 13 11.5 13Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15.5 17V13L17.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 17L7 15.5M7 15.5L7 13L7.75 13C8.44036 13 9 13.5596 9 14.25V14.25C9 14.9404 8.44036 15.5 7.75 15.5H7Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={handleAuthorize}
            className="w-full bg-[#00bfff] py-5 rounded-2xl font-black text-black hover:bg-white transition-all shadow-[0_0_20px_rgba(0,191,255,0.3)] uppercase tracking-widest text-sm active:scale-[0.98]"
          >
            SYNCHRONIZATION
          </button>

          <p className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mt-6">
            All data is stored locally in your browser, but it is highly recommended to save the contact file on your device.
          </p>
        </motion.div>

        <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept=".txt,.json" />
        <style dangerouslySetInnerHTML={{ __html: `
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            filter: invert(1);
            opacity: 0.5;
            cursor: pointer;
          }
          .color-scheme-dark { color-scheme: dark; }
        `}} />
      </div>
    );
  }

  // Ensure activeProfile exists if authorized, though it should by logic
  if (!activeProfile) return null;

  return (
    <Dashboard 
      profile={activeProfile} 
      allProfiles={profiles}
      onAddProfile={handleAddProfile}
      onUpdateProfile={handleUpdateProfile}
      onDeleteProfile={handleDeleteProfile}
      onGroupProfiles={handleGroupProfiles}
      onRenameGroup={handleRenameGroup}
      onUngroup={handleUngroup}
      onMoveToGroup={handleMoveToGroup}
      onSelectProfile={setActiveProfileId}
      onImportProfiles={handleImportProfiles}
      onLogout={() => {
        setProfiles([]);
        setActiveProfileId(null);
        setIsAuthorized(false);
        localStorage.removeItem('ritmxoid_db_profiles');
        localStorage.removeItem('ritmxoid_active_id');
      }}
      onReset={() => {
        if(window.confirm("Delete all data?")) {
           setProfiles([]);
           setActiveProfileId(null);
           setIsAuthorized(false);
           localStorage.removeItem('ritmxoid_db_profiles');
           localStorage.removeItem('ritmxoid_active_id');
        }
      }} 
    />
  );
};

export default App;