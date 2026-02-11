import React, { useState, useEffect, useRef } from 'react';
import { Profile } from './types';
import Dashboard from './components/Dashboard';
import { motion, AnimatePresence } from 'framer-motion';

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

  const handleAuthorize = () => {
    if (profiles.length > 0) {
      setIsAuthorized(true);
      return;
    }

    if (!tempName) {
      alert("Please enter a name.");
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
  };

  const handleAddProfile = (name: string, date: string) => {
    const newP: Profile = {
      id: 'ref-' + Date.now(),
      name: name,
      birthDate: date,
      isMaster: false
    };
    setProfiles(prev => [...prev, newP]);
  };

  const handleUpdateProfile = (id: string, name: string, date: string) => {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, name, birthDate: date } : p));
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.find(p => p.id === id)?.isMaster) return;
    setProfiles(prev => {
      const filtered = prev.filter(p => p.id !== id);
      if (activeProfileId === id && filtered.length > 0) {
        setActiveProfileId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleGroupProfiles = (ids: string[], groupName: string) => {
    setProfiles(prev => prev.map(p => 
      ids.includes(p.id) ? { ...p, teamName: groupName || undefined } : p
    ));
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    setProfiles(prev => prev.map(p => 
      p.teamName === oldName ? { ...p, teamName: newName || undefined } : p
    ));
  };

  const handleUngroup = (groupName: string) => {
    setProfiles(prev => prev.map(p => 
      p.teamName === groupName ? { ...p, teamName: undefined } : p
    ));
  };

  const handleMoveToGroup = (profileId: string, groupName: string | null) => {
    setProfiles(prev => prev.map(p => 
      p.id === profileId ? { ...p, teamName: groupName || undefined } : p
    ));
  };

  const handleImportProfiles = (imported: Profile[]) => {
    setProfiles(prev => {
      const hasNewMaster = imported.some(p => p.isMaster);
      let baseProfiles = prev;
      
      if (hasNewMaster) {
        baseProfiles = prev.map(p => p.isMaster ? { ...p, isMaster: false } : p);
      }

      const existingIds = new Set(baseProfiles.map(p => p.id));
      const newOnes = imported.filter(p => !existingIds.has(p.id));
      const combined = [...baseProfiles, ...newOnes];
      
      const newMaster = combined.find(p => p.isMaster);
      if (newMaster) {
        setActiveProfileId(newMaster.id);
      } else if (!activeProfileId && combined.length > 0) {
        setActiveProfileId(combined[0].id);
      }
      
      return combined;
    });
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
          handleImportProfiles(imported);
          setIsAuthorized(true);
        }
      } catch (err) {
        alert("Error reading contact database file.");
      }
    };
    reader.readAsText(file);
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  if (profiles.length === 0 || !isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-['Roboto'] overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/4 -right-20 w-96 h-96 bg-[#33b5e5]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#33b5e5]/5 rounded-full blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#1b2531] border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col"
        >
          <div className="p-8 space-y-8 flex-1">
            <div className="text-center space-y-4">
              <svg viewBox="2500 600 2100 2200" className="h-20 w-20 mx-auto drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                <path fill="#2893E3" d="M3071.24 1227.95c77.21,36.66 394.14,6.44 500.67,413.85 27.98,106.99 246.44,-45.6 286.14,-82.73 30.35,-28.37 69.21,-85.54 94.32,-134.48 184.52,-359.58 -201.17,-799.39 -607.75,-616.03 -146.05,65.87 -292.78,240.77 -273.38,419.39z"/>
                <path fill="#FF8F19" d="M4050.99 2202.38c-54.99,-24.24 -316.95,-15.04 -452.91,-265.9 -37.76,-69.68 -36.83,-119.55 -64.11,-181.11 -88.32,-17.74 -196,55.58 -243.26,91.71 -131.25,100.38 -201.88,308.81 -147.79,484.98 25.28,82.35 83.15,172.49 129.24,209.5 224.37,180.21 532.87,158.28 698.49,-82.49 40.24,-58.51 92.8,-162.9 80.34,-256.69z"/>
                <path fill="#A41213" d="M3071.01 2203.53c37.86,-207.93 84.4,-350.26 273.9,-446.34 73.38,-37.21 108.56,-38.88 184.13,-60.35 17.16,-131.38 -120.38,-317.05 -284.86,-380.11 -510.52,-195.72 -877.19,497.76 -426.68,807.9 54.12,37.26 171.94,96.91 253.51,78.9z"/>
                <path fill="#7A3DD9" d="M3589.2 1739c-26.58,128.77 131.79,313.59 286.95,376.47 361.88,146.64 756.06,-235.22 578.82,-629.58 -75.53,-168.05 -289.81,-292.02 -398.74,-262 -30.85,72.31 -21.81,321.3 -284.48,452.37 -65.77,32.82 -119.66,37.82 -182.55,62.74z"/>
              </svg>
              <div className="space-y-1">
                <h1 className="text-4xl font-black text-[#33b5e5] tracking-tighter uppercase drop-shadow-[0_0_10px_rgba(51,181,229,0.3)]">RITMXOID</h1>
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
                    onChange={e => setTempName(e.target.value)}
                    placeholder="Enter name..."
                    className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-12 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white placeholder:text-slate-800"
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
                    className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white color-scheme-dark"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={handleAuthorize}
              className="w-full bg-[#00bfff] py-5 rounded-2xl font-black text-black hover:bg-white transition-all shadow-[0_0_20px_rgba(0,191,255,0.3)] uppercase tracking-widest text-sm active:scale-[0.98]"
            >
              SYNCHRONIZATION
            </button>

            <p className="text-center text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
              All data is stored locally in your browser, but it is highly recommended to save the contact file on your device.
            </p>
          </div>

          <input type="file" ref={fileInputRef} onChange={onFileChange} className="hidden" accept=".txt,.json" />
        </motion.div>

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