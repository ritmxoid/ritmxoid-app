import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DateTime } from 'luxon';
import { calculateCompatibility, CompatibilityResult } from '../core/compatibilityEngine';
import { COMPATIBILITY_TEXTS_I18N } from '../core/i18nCompatibility';
import { generateSynthesis, SynthesisProfile } from '../core/synthesisEngine';
import { LANGUAGES, getInitialLanguage, getT } from '../core/i18n';

interface Props {
  initialDate: string;
  initialDate2?: string;
  initialLang?: string;
  onClose: () => void;
}

const CompatibilityChecker: React.FC<Props> = ({ initialDate, initialDate2 = '', initialLang = 'en', onClose }) => {
  const [lang, setLang] = useState(initialLang);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const t = getT(lang);

  const [date1, setDate1] = useState(initialDate);
  const [date2, setDate2] = useState(initialDate2);
  const [results, setResults] = useState<CompatibilityResult | null>(null);
  const [synthesis, setSynthesis] = useState<SynthesisProfile | null>(null);
  const [showSynthesis, setShowSynthesis] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{
    id: string;
    title: string;
    icon: string;
    percentage: number;
    text: string;
    color: string;
    label: string;
  } | null>(null);

  const handleCalculate = () => {
    if (!date1 || !date2) return;
    const d1 = DateTime.fromISO(date1);
    const d2 = DateTime.fromISO(date2);
    if (!d1.isValid || !d2.isValid) return;

    const res = calculateCompatibility(d1, d2);
    setResults(res);
    setSynthesis(generateSynthesis(res, lang));
  };

  useEffect(() => {
    if (results) {
      setSynthesis(generateSynthesis(results, lang));
    }
  }, [lang, results]);

  const getCompatibilityLabel = (percentage: number, isAnaerobic: boolean) => {
    const p = Math.round(percentage);
    if (isAnaerobic) {
      if (p <= 15) return { text: t('compat_very_low'), color: '#44aa00' }; // Green
      if (p <= 21) return { text: t('compat_low'), color: '#33b5e5' };      // Blue
      if (p <= 28) return { text: t('compat_normal'), color: '#ffd600' };   // Yellow
      if (p <= 45) return { text: t('compat_high'), color: '#ff9800' };     // Orange
      return { text: t('compat_very_high'), color: '#ff1744' };             // Red
    } else {
      if (p <= 35) return { text: t('compat_very_low'), color: '#44aa00' };
      if (p <= 46) return { text: t('compat_low'), color: '#33b5e5' };
      if (p <= 54) return { text: t('compat_normal'), color: '#ffd600' };
      if (p <= 69) return { text: t('compat_high'), color: '#ff9800' };
      return { text: t('compat_very_high'), color: '#ff1744' };
    }
  };

  const renderResultCard = (id: string, title: string, icon: string, data: any, isAnaerobic: boolean = false) => {
    if (!data) return null;
    const { text, color } = getCompatibilityLabel(data.total, isAnaerobic);

    const p = Math.round(data.total);
    let levelIndex = 0;
    if (isAnaerobic) {
      if (p <= 15) levelIndex = 0;
      else if (p <= 21) levelIndex = 1;
      else if (p <= 28) levelIndex = 2;
      else if (p <= 45) levelIndex = 3;
      else levelIndex = 4;
    } else {
      if (p <= 35) levelIndex = 0;
      else if (p <= 46) levelIndex = 1;
      else if (p <= 54) levelIndex = 2;
      else if (p <= 69) levelIndex = 3;
      else levelIndex = 4;
    }

    const textsForLang = COMPATIBILITY_TEXTS_I18N[lang] || COMPATIBILITY_TEXTS_I18N['en'];
    const descriptionText = textsForLang[id][levelIndex];

    return (
      <div 
        onClick={() => setSelectedCard({ id, title, icon, percentage: data.total, text: descriptionText, color, label: text })}
        className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/10 hover:scale-[1.02] transition-all active:scale-[0.98]"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: `${color}33`, color: color }}
            >
              <i className={icon} />
            </div>
            <div>
              <h3 className="text-white font-bold uppercase tracking-widest text-sm">{title}</h3>
              <span 
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block" 
                style={{ backgroundColor: `${color}22`, color: color }}
              >
                {text}
              </span>
            </div>
          </div>
          <div className="text-3xl font-black" style={{ color: color }}>{Math.round(data.total)}%</div>
        </div>
        
        <div className="space-y-2 mt-4">
          {data.maps.map((map: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <span className="text-slate-400 uppercase tracking-wider">{map.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: `${(map.actual / map.max) * 100}%`, backgroundColor: color }}
                  />
                </div>
                <span className="font-mono w-8 text-right" style={{ color: color }}>+{Math.round(map.actual)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 font-['Roboto'] text-white">
      <div className="max-w-md mx-auto pt-8">
        <div className="flex justify-between items-center mb-8">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
          >
            <i className="fa-solid fa-arrow-left" /> {t('back')}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} 
              className="px-3 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center gap-2 transition-colors"
            >
              <i className="fa-solid fa-globe text-lg text-[#33b5e5]" />
              <span className="text-xs font-bold text-slate-300 uppercase">{lang}</span>
            </button>
            <AnimatePresence>
              {isLangMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  exit={{ opacity: 0, y: 10 }} 
                  className="absolute top-12 right-0 bg-[#1b2531] border border-white/20 rounded-xl shadow-2xl z-[10000] overflow-hidden w-40 backdrop-blur-md"
                >
                  {LANGUAGES.map(l => (
                    <button 
                      key={l.code} 
                      onClick={() => { setLang(l.code); setIsLangMenuOpen(false); }} 
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-xs font-bold uppercase ${lang === l.code ? 'text-[#33b5e5]' : 'text-slate-300'}`}
                    >
                      <span className="text-lg">{l.flag}</span>{l.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <h1 className="text-2xl font-black uppercase tracking-widest mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-[#33b5e5] to-purple-500">
          {t('compatibility')}
        </h1>

        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('person_a')}</label>
            <input 
              type="datetime-local" 
              value={date1} 
              onChange={e => setDate1(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white color-scheme-dark"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('person_b')}</label>
            <input 
              type="datetime-local" 
              value={date2} 
              onChange={e => setDate2(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-2xl px-4 py-4 focus:outline-none focus:border-[#33b5e5] transition-all text-white color-scheme-dark"
            />
          </div>
          <button 
            onClick={handleCalculate}
            disabled={!date1 || !date2}
            className="w-full bg-[#33b5e5] py-4 rounded-2xl font-black text-black hover:bg-white transition-all shadow-[0_0_20px_rgba(51,181,229,0.3)] uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('calculate')}
          </button>
        </div>

        {results && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pb-20"
          >
            {renderResultCard('aerobic', t('compat_aerobic'), 'fa-solid fa-bicycle', results.aerobic)}
            {renderResultCard('anaerobic', t('compat_anaerobic'), 'fa-solid fa-dumbbell', results.anaerobic, true)}
            {renderResultCard('sensory', t('compat_sensory'), 'fa-solid fa-comment', results.sensory)}
            {renderResultCard('sexual', t('compat_sexual'), 'fa-solid fa-venus-mars', results.sexual)}
            {renderResultCard('analytic', t('compat_analytic'), 'fa-solid fa-brain', results.analytic)}
            
            <button 
              onClick={() => setShowSynthesis(true)}
              className="w-full mt-6 bg-gradient-to-r from-purple-500 to-[#33b5e5] py-5 rounded-2xl font-black text-white hover:opacity-90 transition-all shadow-[0_0_30px_rgba(51,181,229,0.4)] uppercase tracking-widest text-sm active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <i className="fa-solid fa-wand-magic-sparkles" />
              {t('synthesis_btn')}
            </button>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {showSynthesis && synthesis && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSynthesis(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#0a0a0a] border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full relative flex flex-col max-h-[85vh] my-8"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-[#33b5e5]" />
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#33b5e5]/10 blur-[80px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-purple-500/10 blur-[80px] pointer-events-none" />
              
              <button 
                onClick={() => setShowSynthesis(false)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors z-20"
              >
                <i className="fa-solid fa-xmark" />
              </button>

              <div className="relative z-10 overflow-y-auto flex-1 p-6 md:p-8 pb-16">
                <div className="text-center mb-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">
                    {t('synthesis_archetype')}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-[#33b5e5]">
                    {synthesis.title}
                  </h2>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                    <p className="text-slate-200 text-sm md:text-base leading-relaxed font-medium">
                      {synthesis.description}
                    </p>
                  </div>

                  {synthesis.blindSpots.length > 0 && (
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation text-yellow-500" />
                        {t('synthesis_blind_spots')}
                      </h3>
                      <div className="space-y-3">
                        {synthesis.blindSpots.map((spot, idx) => (
                          <div key={idx} className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
                            <p className="text-slate-300 text-sm leading-relaxed">
                              {spot}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-[#33b5e5]/10 to-purple-500/10 border border-[#33b5e5]/20 rounded-2xl p-5 mt-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#33b5e5] mb-2 flex items-center gap-2">
                      <i className="fa-solid fa-lightbulb" />
                      {t('synthesis_advice')}
                    </h3>
                    <p className="text-white text-sm md:text-base leading-relaxed font-medium italic">
                      "{synthesis.conclusion}"
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl max-w-sm w-full relative overflow-y-auto max-h-[85vh] pb-16"
            >
              <div 
                className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none"
                style={{ backgroundColor: selectedCard.color }}
              />
              
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <i className="fa-solid fa-xmark" />
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg" 
                  style={{ backgroundColor: `${selectedCard.color}33`, color: selectedCard.color, boxShadow: `0 0 20px ${selectedCard.color}40` }}
                >
                  <i className={selectedCard.icon} />
                </div>
                <div>
                  <h2 className="text-white font-black uppercase tracking-widest text-lg">{selectedCard.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black" style={{ color: selectedCard.color }}>
                      {Math.round(selectedCard.percentage)}%
                    </span>
                    <span 
                      className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" 
                      style={{ backgroundColor: `${selectedCard.color}22`, color: selectedCard.color }}
                    >
                      {selectedCard.label}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-slate-300 text-sm leading-relaxed font-medium">
                {selectedCard.text}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
};

export default CompatibilityChecker;
