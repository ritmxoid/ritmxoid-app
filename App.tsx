import React, { useState, useEffect, useRef } from 'react';
import { Profile } from './types';
import Dashboard from './components/Dashboard';
import CompatibilityChecker from './components/CompatibilityChecker';
import SportProphet from './components/SportProphet';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Download, Calendar, Plus, Swords, Users, UserPlus } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DateTime, Info } from 'luxon';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}
import { calculateDaysGone, getRiskLevel, calculateFullBalance, getBalanceColor, COLORS, getAstroEvents } from './core/engine';
import { getT, getInitialLanguage, LANGUAGES as GLOBAL_LANGUAGES } from './core/i18n';
import { logEvent } from './core/analytics';
import { solarDataService } from './services/solarDataService';

const App: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    try {
      const saved = localStorage.getItem('ritmxoid_db_profiles');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse profiles from localStorage', e);
      return [];
    }
  });

  const [activeProfileId, setActiveProfileId] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('ritmxoid_active_id');
      return saved || (profiles.length > 0 ? profiles[0].id : null);
    } catch (e) {
      return null;
    }
  });

  const [isAuthorized, setIsAuthorized] = useState(() => profiles.length > 0);
  const [currentApp, setCurrentApp] = useState<'RITMXOID' | 'SPORT'>(() => {
    return (window.location.search.includes('app=sport') || window.location.pathname.includes('sportprophet')) ? 'SPORT' : 'RITMXOID';
  });
  const [showCompatibility, setShowCompatibility] = useState(false);
  const [compatDate1, setCompatDate1] = useState('');
  const [compatDate2, setCompatDate2] = useState('');
  const [lang, setLang] = useState(() => localStorage.getItem('ritmxoid_lang') || getInitialLanguage());
  const [compatLang, setCompatLang] = useState(() => localStorage.getItem('ritmxoid_lang') || getInitialLanguage());
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const t = getT(lang);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    logEvent('PWA Install', 'Engagement', outcome);
    setDeferredPrompt(null);
  };

  const changeLang = (newLang: string) => {
    setLang(newLang);
    setCompatLang(newLang);
    localStorage.setItem('ritmxoid_lang', newLang);
    logEvent('Change Language', 'Settings', newLang);
  };
  const [tempDate, setTempDate] = useState('1990-01-01T12:00');
  const [tempName, setTempName] = useState('');
  const [nameError, setNameError] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fetch solar data on app start
  useEffect(() => {
    solarDataService.getSolarData().catch(err => console.warn('Early solar fetch failed', err));
  }, []);

  const [groups, setGroups] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ritmxoid_db_groups');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    // Sync groups state with actual profile team names to ensure none are missing
    const profileGroups = Array.from(new Set(profiles.map(p => p.teamName).filter((n): n is string => !!n)));
    setGroups(prev => {
      const merged = Array.from(new Set([...prev, ...profileGroups]));
      if (merged.length !== prev.length) return merged;
      return prev;
    });
  }, [profiles]);

  useEffect(() => {
    if (profiles.length > 0 || groups.length > 0) {
      localStorage.setItem('ritmxoid_db_profiles', JSON.stringify(profiles));
      localStorage.setItem('ritmxoid_db_groups', JSON.stringify(groups));
    } else {
      localStorage.removeItem('ritmxoid_db_profiles');
      localStorage.removeItem('ritmxoid_db_groups');
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
    logEvent('Registration', 'Onboarding', 'Master Profile Created');
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
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '794px'; // A4 width at 96 DPI
    container.style.height = '1123px'; // A4 height at 96 DPI
    container.style.backgroundColor = '#ffffff';
    
    let html = `
      <style>
        * { box-sizing: border-box; }
        .calendar-wrapper { 
          font-family: 'Arial Narrow', Arial, sans-serif; 
          background: #fff; 
          color: #000; 
          margin: 0; 
          padding: 8px 16px; 
          height: 100%; 
          display: flex;
          flex-direction: column;
        }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 3px solid #8a2be2; padding-bottom: 8px; flex-shrink: 0; }
        .header-left { display: flex; align-items: center; gap: 10px; }
        .header h1 { margin: 0; text-transform: uppercase; font-size: 30px; font-weight: bold; letter-spacing: -1px; color: #8a2be2; line-height: 1; }
        .header h2 { margin: 0; font-size: 16px; font-weight: bold; color: #444; text-transform: uppercase; line-height: 1; }
        .header img.logo { height: 30px; width: 30px; margin: 0; display: block; }
        .header-right { font-size: 12px; font-weight: bold; color: #888; }
        .year-grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(4, 1fr); gap: 5px; flex: 1; min-height: 0; }
        .month-box { border: 1px solid #8a2be2; display: flex; flex-direction: column; background: #fff; overflow: hidden; }
        .month-name { display: block; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 15px; background: #8a2be2; color: #fff; margin: 0; padding: 2px 0 8px 0; line-height: 1; }
        .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-template-rows: max-content; grid-auto-rows: 1fr; flex: 1; background: #eee; gap: 1px; }
        .day-header { text-align: center; font-size: 9px; font-weight: bold; color: #8a2be2; padding: 1px 0; background: #f8f8f8; text-transform: uppercase; border-bottom: 1px solid #ddd; }
        .day-cell { position: relative; background: #fff; overflow: hidden; }
        .top-left-content { position: absolute; top: 1px; left: 1px; display: flex; flex-direction: column; align-items: flex-start; z-index: 5; gap: 3px; }
        .day-num { font-size: 11px; font-weight: bold; color: #333; line-height: 0.8; margin: 0; padding: 0; display: block; }
        .astro-icons { display: flex; gap: 1px; font-size: 9px; line-height: 1; margin: 0; padding: 0; }
        .risk-container { position: absolute; top: 1px; right: 1px; display: flex; flex-direction: column; align-items: center; gap: 0; z-index: 4; width: 10px; }
        .risk-mark { font-size: 8px; color: #ff0000; font-weight: 400; text-shadow: 1px 1px 0px #fff; line-height: 0.8; }
        .footer { margin-top: 8px; padding-top: 6px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: flex-start; flex-shrink: 0; font-size: 10px; }
        .legend-section { display: flex; flex-direction: column; gap: 3px; }
        .legend-title { font-weight: 400; text-transform: uppercase; color: #555; margin-bottom: 2px; font-size: 9px; }
        .legend-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 3px; }
        .swatch { width: 10px; height: 10px; border-radius: 2px; border: 1px solid rgba(0,0,0,0.1); }
        .risk-icon-demo { color: #ff0000; font-weight: 400; }
      </style>
      <div class="calendar-wrapper">
        <div class="header">
          <div class="header-left">
            <img class="logo" src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjEwMCIgaGVpZ2h0PSIyMjAwIiB2aWV3Qm94PSIyNTAwIDYwMCAyMTAwIDIyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBvbHlnb24gZmlsbD0iI0ZERkRGRCIgcG9pbnRzPSIyNTg3LjQ2LDI3MDEuNTUgNDU2MC4xOCwyNzAxLjU1IDQ1NjAuMTgsNjk0Ljk1IDI1ODcuNDYsNjk0Ljk1ICIvPjxwYXRoIGZpbGw9IiMyODkzRTMiIGQ9Ik0zMDcxLjI0IDEyMjcuOTVjNzcuMjEsMzYuNjYgMzk0LjE0LDYuNDQgNTAwLjY3LDQxMy44NSAyNy45OCwxMDYuOTkgMjQ2LjQ0LC00NS42IDI4Ni4xNCwtODIuNzMgMzAuMzUsLTI4LjM3IDY5LjIxLC04NS41NCA5NC4zMiwtMTM0LjQ4IDE4NC41MiwtMzU5LjU4IC0yMDEuMTcsLTc5OS4zOSAtNjA3Ljc1LC02MTYuMDMgLTE0Ni4wNSw2NS44NyAtMjkyLjc4LDI0MC43NyAtMjczLjM4LDQxOS4zOXoiLz48cGF0aCBmaWxsPSIjRkY4RjE5IiBkPSJNNDA1MC45OSAyMjAyLjM4Yy01NC45OSwtMjQuMjQgLTMxNi45NSwtMTUuMDQgLTQ1Mi45MSwtMjY1LjkgLTM3Ljc2LC02OS42OCAtMzYuODMsLTExOS41NSAtNjQuMTEsLTE4MS4xMSAtODguMzIsLTE3Ljc0IC0xOTYsNTUuNTggLTI0My4yNiw5MS43MSAtMTMxLjI1LDEwMC4zOCAtMjAxLjg4LDMwOC44MSAtMTQ3Ljc5LDQ4NC45OCAyNS4yOCw4Mi4zNSA4My4xNSwxNzIuNDkgMTI5LjI0LDIwOS41IDIyNC4zNywxODAuMjEgNTMyLjg3LDE1OC4yOCA2OTguNDksLTgyLjQ5IDQwLjI0LC01OC41MSA5Mi44LC0xNjIuOSA4MC4zNCwtMjU2LjY5eiIvPjxwYXRoIGZpbGw9IiNBNDEyMTMiIGQ9Ik0zMDcxLjAxIDIyMDMuNTNjMzcuODYsLTIwNy45MyA4NC40LC0zNTAuMjYgMjczLjksLTQ0Ni4zNCA3My4zOCwtMzcuMjEgMTA4LjU2LC0zOC44OCAxODQuMTMsLTYwLjM1IDE3LjE2LC0xMzEuMzggLTEyMC4zOCwtMzE3LjA1IC0yODQuODYsLTM4MC4xMSAtNTEwLjUyLC0xOTUuNzIgLTg3Ny4xOSw0OTcuNzYgLTQyNi42OCw4MDcuOSA1NC4xMiwzNy4yNiAxNzEuOTQsOTYuOTEgMjUzLjUxLDc4Ljl6Ii8+PHBhdGggZmlsbD0iIzdBM0REOSIgZD0iTTM1ODkuMiAxNzM5Yy0yNi41OCwxMjguNzcgMTMxLjc5LDMxMy41OSAyODYuOTUsMzc2LjQ3IDM2MS44OCwxNDYuNjQgNzU2LjA2LC0yMzUuMjIgNTc4LjgyLC02MjkuNTggLTc1LjUzLC0xNjguMDUgLTI4OS44MSwtMjkyLjAyIC0zOTguNzQsLTI2MiAtMzAuODUsNzIuMzEgLTIxLjgxLDMyMS4zIC0yODQuNDgsNDUyLjM3IC02NS43NywzMi44MiAtMTE5LjY2LDM3LjgyIC0xODIuNTUsNjIuNzR6Ii8+PC9zdmc+" />
            <h1>RITMXOID ${year}</h1>
            <h2>${tempName}</h2>
          </div>
          <div class="header-right">www.ritmxoid.com</div>
        </div>
        <div class="year-grid">
    `;

    const monthNames = [...Array(12)].map((_, i) => DateTime.fromObject({ month: i + 1 }).setLocale(lang).toFormat('LLLL').toUpperCase());
    const daysAbbr = t('days_abbr') as string[];

    for (let m = 1; m <= 12; m++) {
      html += `<div class="month-box">`;
      html += `<div class="month-name">${monthNames[m-1]}</div>`;
      html += `<div class="days-grid">`;
      
      daysAbbr.forEach(wd => {
        html += `<div class="day-header">${wd}</div>`;
      });

      const firstDay = DateTime.local(year, m, 1).setZone(APP_ZONE);
      const daysInMonth = firstDay.daysInMonth || 31;
      let startDay = firstDay.weekday - 1;
      
      for (let i = 0; i < startDay; i++) {
        html += `<div class="day-cell" style="background: #fafafa;"></div>`;
      }
      
      for (let d = 1; d <= daysInMonth; d++) {
        const currentDate = DateTime.local(year, m, d).setZone(APP_ZONE);
        const daysGone = calculateDaysGone(bdate, currentDate);
        const balance = calculateFullBalance(daysGone);
        const color = getBalanceColor(balance);
        const riskScore = getRiskLevel(daysGone, currentDate);
        const astroEvts = getAstroEvents(currentDate);
        
        let riskHtml = '';
        if (riskScore >= 25) {
          const count = riskScore >= 75 ? 3 : riskScore >= 50 ? 2 : 1;
          riskHtml = `<div class="risk-container">`;
          for(let r=0; r<count; r++) riskHtml += `<span class="risk-mark">⚡</span>`;
          riskHtml += `</div>`;
        }

        let astroHtml = '';
        if (astroEvts.length > 0) {
          astroHtml = `<div class="astro-icons">`;
          astroEvts.forEach(e => astroHtml += `<span>${e.icon}</span>`);
          astroHtml += `</div>`;
        }
        
        html += `
          <div class="day-cell" style="background-color: ${color}66;">
            <div class="top-left-content">
              <span class="day-num">${d}</span>
              ${astroHtml}
            </div>
            ${riskHtml}
          </div>
        `;
      }
      
      html += `</div></div>`;
    }
    
    html += `
        </div>
        <div class="footer">
           <div class="legend-section">
              <div class="legend-title">${t('help_levels_title')}</div>
              <div class="legend-row">
                 <div class="legend-item">
                    <div class="swatch" style="background-color: #44aa00"></div>
                    <span>${t('legend_crit')}</span>
                 </div>
                 <div class="legend-item">
                    <div class="swatch" style="background-color: #2196f3"></div>
                    <span>${t('legend_low')}</span>
                 </div>
                 <div class="legend-item">
                    <div class="swatch" style="background-color: #ffd600"></div>
                    <span>${t('legend_opt')}</span>
                 </div>
                 <div class="legend-item">
                    <div class="swatch" style="background-color: #ff9800"></div>
                    <span>${t('legend_high')}</span>
                 </div>
                 <div class="legend-item">
                    <div class="swatch" style="background-color: #ff1744"></div>
                    <span>${t('legend_super')}</span>
                 </div>
              </div>
           </div>
           <div class="legend-section" style="align-items: flex-end;">
              <div class="legend-title">${t('help_risk_title')} & ${t('help_astro_events_title')}</div>
              <div class="legend-row">
                 <div class="legend-item"><span class="risk-icon-demo">⚡</span> 1</div>
                 <div class="legend-item"><span class="risk-icon-demo">⚡⚡</span> 2</div>
                 <div class="legend-item"><span class="risk-icon-demo">⚡⚡⚡</span> 3</div>
                 <div class="legend-item"><span class="risk-icon-demo">☀️/❄️</span> ${t('solstice')}</div>
                 <div class="legend-item"><span class="risk-icon-demo">🌱/🍂</span> ${t('equinox')}</div>
                 <div class="legend-item"><span class="risk-icon-demo">🌑🌓🌕🌗</span> ${t('moon_phases')}</div>
              </div>
           </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    document.body.appendChild(container);
    
    try {
      // Wait briefly for fonts to load
      await new Promise(resolve => setTimeout(resolve, 300));
      const canvas = await html2canvas(container, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`RitmXoid_${tempName}_${year}.pdf`);
    } catch (e) {
      console.error('PDF generation failed', e);
      alert('Failed to generate PDF.');
    } finally {
      document.body.removeChild(container);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        logEvent('Database Import', 'Sync', 'File');
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

  const handleAddProfile = (name: string, date: string, teamName?: string | null) => {
    const newProfile: Profile = {
      id: Date.now().toString(),
      name,
      birthDate: date,
      isMaster: false,
      teamName: teamName || null
    };
    setProfiles([...profiles, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const handleAddTeam = (teamName: string, members: {name: string, date: string}[]) => {
    if (teamName && !groups.includes(teamName)) {
      setGroups(prev => [...prev, teamName]);
    }
    const now = Date.now();
    const newProfiles: Profile[] = members.map((m, idx) => ({
      id: (now + idx).toString(),
      name: m.name,
      birthDate: m.date,
      isMaster: false,
      teamName: teamName
    }));
    setProfiles([...profiles, ...newProfiles]);
  };

  const handleUpdateProfile = (id: string, name: string, date: string, teamName?: string | null) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, name, birthDate: date, teamName: teamName !== undefined ? teamName : p.teamName } : p));
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter(p => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(profiles[0]?.id || null);
  };
  
  const handleGroupProfiles = (ids: string[], groupName: string) => {
    if (groupName && !groups.includes(groupName)) {
      setGroups(prev => [...prev, groupName]);
    }
    setProfiles(profiles.map(p => ids.includes(p.id) ? { ...p, teamName: groupName || null } : p));
  };

  const handleRenameGroup = (oldName: string, newName: string) => {
    if (newName && !groups.includes(newName)) {
      setGroups(prev => prev.map(g => g === oldName ? newName : g));
    }
    setProfiles(profiles.map(p => p.teamName === oldName ? { ...p, teamName: newName } : p));
  };

  const handleUngroup = (groupName: string) => {
    setProfiles(profiles.map(p => p.teamName === groupName ? { ...p, teamName: undefined } : p));
  };

  const handleMoveToGroup = (id: string, groupName: string | null) => {
    setProfiles(profiles.map(p => p.id === id ? { ...p, teamName: groupName || undefined } : p));
  };

  const handleImportProfiles = (imported: Profile[]) => {
    // Extract unique group names from imported profiles
    const importedGroups = Array.from(new Set(imported.map(p => p.teamName).filter((name): name is string => !!name)));
    setGroups(importedGroups);
    setProfiles(imported);
    if (imported.length > 0) setActiveProfileId(imported[0].id);
  };

  if (currentApp === 'SPORT') {
    return <SportProphet onBack={() => {
        logEvent('App Switch', 'Navigation', 'Return to RitmXoid');
        window.history.replaceState({}, '', window.location.pathname);
        setCurrentApp('RITMXOID');
    }} />;
  }

  if (showCompatibility) {
    return (
      <CompatibilityChecker 
        initialDate={compatDate1 || (isAuthorized && activeProfile ? activeProfile.birthDate : tempDate)} 
        initialDate2={compatDate2}
        initialLang={compatLang}
        onClose={() => {
          setShowCompatibility(false);
          setCompatDate1('');
          setCompatDate2('');
        }} 
      />
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
        
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-[#1b2531]/80 backdrop-blur-xl px-8 pt-4 pb-3 rounded-[2.5rem] border border-white/10 shadow-2xl relative z-10 overflow-hidden">
        <div className="absolute top-4 left-4 z-[60]">
          <AnimatePresence>
            {deferredPrompt && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  boxShadow: ['0 0 10px rgba(51,181,229,0.2)', '0 0 20px rgba(51,181,229,0.5)', '0 0 10px rgba(51,181,229,0.2)']
                }}
                transition={{
                  boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="w-12 h-12 rounded-full bg-[#1b2531] border-2 border-[#33b5e5]/50 flex items-center justify-center hover:bg-white/10 transition-all active:scale-95 group relative overflow-hidden"
                onClick={handleInstallClick}
                title={t('install_app')}
              >
                <Download className="w-6 h-6 text-[#33b5e5] animate-bounce" />
                <span className="absolute bottom-[-2px] text-[8px] font-black text-[#33b5e5] uppercase bg-[#1b2531] px-1">PWA</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute top-4 right-4 z-[60]">
          <div className="relative">
            <button 
              className="w-12 h-12 rounded-full bg-[#1b2531] border-2 border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:border-[#33b5e5]/50 active:scale-95"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            >
              <span className="text-[14px] font-bold text-white/60 tracking-wider">
                {lang.toUpperCase()}
              </span>
            </button>
            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  className="absolute top-12 right-0 bg-[#1b2531] border border-white/20 rounded-2xl shadow-2xl overflow-hidden min-w-[180px] backdrop-blur-2xl z-[70]"
                >
                  {GLOBAL_LANGUAGES.map(l => (
                    <button 
                      key={l.code}
                      onClick={() => {
                        changeLang(l.code);
                        setIsLangMenuOpen(false);
                      }}
                      className={`w-full px-4 py-[8px] flex items-center gap-3 hover:bg-white/10 transition-colors text-[12px] font-normal tracking-widest ${lang === l.code ? 'text-[#33b5e5]/80' : 'text-white/40'}`}
                    >
                      <span className="text-xl">{l.flag}</span>
                      {l.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex flex-col items-center mb-3">
            <motion.div 
              className="w-20 h-20 mb-4 relative"
              animate={{ 
                filter: [
                  'drop-shadow(0 0 15px rgba(51,181,229,0.5))',
                  'drop-shadow(0 0 25px rgba(138,43,226,0.8))',
                  'drop-shadow(0 0 15px rgba(51,181,229,0.5))'
                ],
                scale: [1, 1.05, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="2500 600 2100 2200" className="w-full h-full relative z-10">
                <path fill="#2893E3" d="M3071.24 1227.95c77.21,36.66 394.14,6.44 500.67,413.85 27.98,106.99 246.44,-45.6 286.14,-82.73 30.35,-28.37 69.21,-85.54 94.32,-134.48 184.52,-359.58 -201.17,-799.39 -607.75,-616.03 -146.05,65.87 -292.78,240.77 -273.38,419.39z"/>
                <path fill="#FF8F19" d="M4050.99 2202.38c-54.99,-24.24 -316.95,-15.04 -452.91,-265.9 -37.76,-69.68 -36.83,-119.55 -64.11,-181.11 -88.32,-17.74 -196,55.58 -243.26,91.71 -131.25,100.38 -201.88,308.81 -147.79,484.98 25.28,82.35 83.15,172.49 129.24,209.5 224.37,180.21 532.87,158.28 698.49,-82.49 40.24,-58.51 92.8,-162.9 80.34,-256.69z"/>
                <path fill="#A41213" d="M3071.01 2203.53c37.86,-207.93 84.4,-350.26 273.9,-446.34 73.38,-37.21 108.56,-38.88 184.13,-60.35 17.16,-131.38 -120.38,-317.05 -284.86,-380.11 -510.52,-195.72 -877.19,497.76 -426.68,807.9 54.12,37.26 171.94,96.91 253.51,78.9z"/>
                <path fill="#7A3DD9" d="M3589.2 1739c-26.58,128.77 131.79,313.59 286.95,376.47 361.88,146.64 756.06,-235.22 578.82,-629.58 -75.53,-168.05 -289.81,-292.02 -398.74,-262 -30.85,72.31 -21.81,321.3 -284.48,452.37 -65.77,32.82 -119.66,37.82 -182.55,62.74z"/>
              </svg>
            </motion.div>
            <div className="space-y-0 text-center">
              <div className="relative inline-block">
                  <h1 className="text-5xl font-black text-[#33b5e5] tracking-[0.05em] uppercase drop-shadow-[0_0_15px_rgba(51,181,229,0.4)]" style={{ fontFamily: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' }}>RITMXOID</h1>
                  <span className="absolute -top-3 right-0 text-[13px] font-black text-[#33b5e5] opacity-40">v.3.5.12</span>
              </div>
              <p className="text-slate-400 uppercase tracking-[0.05em] text-[11.5px] font-black opacity-70 block -mt-1" style={{ fontFamily: 'Calibri, Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif' }}>
                {t('app_tagline')}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('user_name')}</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#33b5e5] transition-colors hidden sm:block">
                  <PenTool className="w-4 h-4" />
                </div>
                <input 
                  type="text" 
                  value={tempName} 
                  onChange={e => {
                      setTempName(e.target.value);
                      if (e.target.value) setNameError(false);
                  }}
                  placeholder={t('name_placeholder')}
                  className={`w-full bg-black border ${nameError ? 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'border-white/10'} rounded-2xl pl-4 sm:pl-12 pr-14 py-3 focus:outline-none focus:border-[#33b5e5] transition-all text-white placeholder:text-slate-800`}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  title={t('import')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#33b5e5] hover:bg-[#33b5e5]/10 rounded-xl transition-colors"
                >
                  <Download className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-0.5">
              <label className="text-[9px] sm:text-[8px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('birth_label')}</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-[#33b5e5] transition-colors pointer-events-none hidden sm:block">
                  <Calendar className="w-4 h-4" />
                </div>
                <input 
                  type="datetime-local" 
                  value={tempDate} 
                  onChange={e => setTempDate(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl pl-4 sm:pl-12 pr-14 py-3 focus:outline-none focus:border-[#33b5e5] transition-all text-white color-scheme-dark text-[17px] sm:text-[22px] tracking-normal font-normal"
                />
                <button
                  onClick={handleQuickPdfExport}
                  title={t('quick_pdf')}
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

          <div className="space-y-1 mt-1">
            <button 
              onClick={handleAuthorize}
              className="w-full bg-[#33b5e5] py-2.5 rounded-2xl font-black text-black hover:bg-white transition-all shadow-[0_0_20px_rgba(51,181,229,0.3)] uppercase tracking-widest text-sm active:scale-[0.98]"
            >
              {t('sync')}
            </button>

            <motion.button 
              onClick={() => setShowCompatibility(true)}
              className="w-full bg-slate-700/40 border border-slate-500/30 py-2.5 rounded-2xl font-black transition-all uppercase tracking-widest text-sm active:scale-[0.98] relative overflow-hidden group"
              animate={{ 
                borderColor: ['rgba(100,116,139,0.3)', 'rgba(51,181,229,0.6)', 'rgba(100,116,139,0.3)'],
                boxShadow: [
                  '0 0 0px rgba(51,181,229,0)',
                  '0 0 15px rgba(51,181,229,0.2)',
                  '0 0 0px rgba(51,181,229,0)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div 
                className="relative z-10 flex items-center justify-center gap-2"
                animate={{ 
                  color: ['#cbd5e1', '#33b5e5', '#cbd5e1'],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                 {t('compatibility')}
              </motion.div>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full"
                animate={{ x: ['100%', '-100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />
            </motion.button>

            <button 
              onClick={() => {
                  window.history.replaceState({}, '', '?app=sport');
                  setCurrentApp('SPORT');
              }}
              className="w-full bg-fuchsia-600/20 border border-fuchsia-500/30 py-2.5 rounded-2xl font-black text-fuchsia-400 hover:bg-fuchsia-600 hover:text-white transition-all uppercase tracking-widest text-sm active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {t('switch_sport')}
            </button>
          </div>
          <p className="text-center text-[9px] text-slate-500 font-normal uppercase tracking-widest leading-relaxed mt-1">
            {t('footer_note')}
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
      lang={lang}
      onLanguageChange={changeLang}
      onAddProfile={handleAddProfile}
      onUpdateProfile={handleUpdateProfile}
      onDeleteProfile={handleDeleteProfile}
      onGroupProfiles={handleGroupProfiles}
      onRenameGroup={handleRenameGroup}
      onUngroup={handleUngroup}
      onMoveToGroup={handleMoveToGroup}
      onSelectProfile={setActiveProfileId}
      onAddTeam={handleAddTeam}
      onImportProfiles={handleImportProfiles}
      groups={groups}
      onAddGroup={(name) => {
        if (!groups.includes(name)) setGroups([...groups, name]);
      }}
      onDeleteGroup={(name) => {
        setGroups(groups.filter(g => g !== name));
      }}
      onBulkDelete={(ids, groupNames) => {
        logEvent('Bulk Delete', 'Data', `${ids.length} profiles, ${groupNames.length} groups`);
        
        if (groupNames.length > 0) {
          setGroups(prev => prev.filter(g => !groupNames.includes(g)));
        }

        setProfiles(prev => {
          // If a group name is specified, we delete all contacts in that group
          const groupsToDelete = new Set(groupNames);
          const idsToDelete = new Set(ids);
          
          const filtered = prev.filter(p => {
            if (p.isMaster) return true; // Never delete master
            if (idsToDelete.has(p.id)) return false;
            if (p.teamName && groupsToDelete.has(p.teamName)) return false;
            return true;
          });

          // Check if active profile was deleted
          if (activeProfileId && !filtered.find(p => p.id === activeProfileId)) {
            setActiveProfileId(filtered[0]?.id || null);
          }
          
          return filtered;
        });
      }}
      onOpenCompatibility={(date1, date2, lang) => {
        logEvent('Compatibility Open', 'Navigation', 'From Dashboard');
        if (date1) setCompatDate1(date1);
        if (date2) setCompatDate2(date2);
        if (lang) setCompatLang(lang);
        setShowCompatibility(true);
      }}
      onOpenSport={() => {
        logEvent('Sport Open', 'Navigation', 'From Dashboard');
        window.history.replaceState({}, '', '?app=sport');
        setCurrentApp('SPORT');
      }}
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