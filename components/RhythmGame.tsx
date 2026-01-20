
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RhythmLevel, Lane, GameState, BeatNote } from '../types';
import Visualizer from './Visualizer';

interface RhythmGameProps {
  level: RhythmLevel;
  onGameOver: (score: number, maxCombo: number) => void;
}

const NOTE_TRAVEL_TIME = 2.0; // Seconds it takes for a note to cross the screen
const HIT_WINDOW = 0.15; // Acceptance window for hitting notes in seconds

const RhythmGame: React.FC<RhythmGameProps> = ({ level, onGameOver }) => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    combo: 0,
    maxCombo: 0,
    health: 100,
    isPlaying: true,
    currentTime: 0,
    difficulty: 'MEDIUM'
  });

  const [notes, setNotes] = useState<BeatNote[]>(level.notes);
  const startTimeRef = useRef<number>(performance.now());
  // Fix: Provide initial value 0 for requestRef to avoid "Expected 1 arguments, but got 0" error
  const requestRef = useRef<number>(0);
  const activeKeys = useRef<Set<string>>(new Set());

  // Audio Context for sound effects
  const audioCtx = useRef<AudioContext | null>(null);

  const playHitSound = useCallback((frequency: number = 440) => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const osc = audioCtx.current.createOscillator();
    const gain = audioCtx.current.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(frequency, audioCtx.current.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.1);
  }, []);

  const handleKeyPress = useCallback((lane: Lane) => {
    const now = (performance.now() - startTimeRef.current) / 1000;
    
    setNotes(prevNotes => {
      let hitAny = false;
      const updatedNotes = prevNotes.map(note => {
        if (!note.hit && !note.missed && note.lane === lane) {
          const diff = Math.abs(note.time - now);
          if (diff < HIT_WINDOW) {
            hitAny = true;
            return { ...note, hit: true };
          }
        }
        return note;
      });

      if (hitAny) {
        setGameState(s => ({
          ...s,
          score: s.score + (100 * (s.combo + 1)),
          combo: s.combo + 1,
          maxCombo: Math.max(s.maxCombo, s.combo + 1),
          health: Math.min(100, s.health + 2)
        }));
        playHitSound(200 + lane * 100);
      } else {
        // Punish for random clicking? Maybe just health drop
        setGameState(s => ({ ...s, combo: 0, health: s.health - 2 }));
      }

      return updatedNotes;
    });
  }, [playHitSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeKeys.current.has(e.key)) return;
      activeKeys.current.add(e.key);

      switch (e.key) {
        case 'ArrowLeft': handleKeyPress(Lane.LEFT); break;
        case 'ArrowUp': handleKeyPress(Lane.UP); break;
        case 'ArrowDown': handleKeyPress(Lane.DOWN); break;
        case 'ArrowRight': handleKeyPress(Lane.RIGHT); break;
        case 'a': handleKeyPress(Lane.LEFT); break;
        case 'w': handleKeyPress(Lane.UP); break;
        case 's': handleKeyPress(Lane.DOWN); break;
        case 'd': handleKeyPress(Lane.RIGHT); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      activeKeys.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyPress]);

  const update = useCallback((time: number) => {
    const elapsed = (time - startTimeRef.current) / 1000;
    setGameState(s => ({ ...s, currentTime: elapsed }));

    // Check for missed notes
    setNotes(prev => prev.map(note => {
      if (!note.hit && !note.missed && elapsed > note.time + HIT_WINDOW) {
        setGameState(s => ({ ...s, combo: 0, health: s.health - 10 }));
        return { ...note, missed: true };
      }
      return note;
    }));

    if (elapsed < level.duration && gameState.health > 0) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      onGameOver(gameState.score, gameState.maxCombo);
    }
  }, [level.duration, gameState.health, onGameOver, gameState.score, gameState.maxCombo]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  const laneLabels = ['←', '↑', '↓', '→'];
  const laneColors = ['text-cyan-400', 'text-fuchsia-400', 'text-lime-400', 'text-amber-400'];
  const bgColors = ['bg-cyan-500/20', 'bg-fuchsia-500/20', 'bg-lime-500/20', 'bg-amber-500/20'];

  return (
    <div className="relative w-full max-w-4xl mx-auto h-[70vh] flex flex-col items-center bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header Info */}
      <div className="w-full p-6 flex justify-between items-center z-20">
        <div>
          <h2 className="text-2xl font-orbitron font-bold text-white tracking-widest">{level.title}</h2>
          <p className="text-slate-400 text-sm">{level.vibe} | {level.bpm} BPM</p>
        </div>
        <div className="flex gap-8">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase">Score</p>
            <p className="text-2xl font-orbitron text-cyan-400">{gameState.score}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase">Combo</p>
            <p className="text-2xl font-orbitron text-fuchsia-400">{gameState.combo}</p>
          </div>
        </div>
      </div>

      {/* Health Bar */}
      <div className="w-full h-1 bg-slate-800">
        <div 
          className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
          style={{ width: `${gameState.health}%` }}
        />
      </div>

      {/* Game Area */}
      <div className="flex-1 w-full relative overflow-hidden flex justify-center">
        {/* Lanes */}
        <div className="grid grid-cols-4 gap-4 w-full px-8 h-full">
          {[0, 1, 2, 3].map(laneIndex => (
            <div key={laneIndex} className={`relative flex flex-col justify-end items-center h-full border-x border-slate-800/50 ${bgColors[laneIndex]}`}>
              {/* Target Zone */}
              <div className="absolute bottom-16 w-16 h-16 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center">
                <span className={`text-4xl font-bold opacity-20 ${laneColors[laneIndex]}`}>
                  {laneLabels[laneIndex]}
                </span>
              </div>

              {/* Falling Notes */}
              {notes
                .filter(n => n.lane === laneIndex && !n.hit && !n.missed)
                .map(note => {
                  const timeToHit = note.time - gameState.currentTime;
                  const progress = 1 - (timeToHit / NOTE_TRAVEL_TIME);
                  
                  if (progress < 0 || progress > 1.2) return null;

                  return (
                    <div
                      key={note.id}
                      className={`absolute w-14 h-14 rounded-lg shadow-lg flex items-center justify-center border-2 border-white/40
                        ${laneIndex === 0 ? 'bg-cyan-500' : 
                          laneIndex === 1 ? 'bg-fuchsia-500' : 
                          laneIndex === 2 ? 'bg-lime-500' : 'bg-amber-500'}`}
                      style={{ 
                        bottom: `${(progress * 100)}%`,
                        opacity: progress > 0.9 ? 1 - (progress - 0.9) * 10 : 1,
                        transform: `scale(${1 + Math.max(0, (progress - 0.9) * 2)})`
                      }}
                    >
                      <span className="text-2xl font-bold text-white">{laneLabels[laneIndex]}</span>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      <Visualizer color={level.color} intensity={gameState.combo > 5 ? 1.5 : 0.8} />

      {/* Progress */}
      <div className="absolute top-2 left-0 w-full px-8">
        <div className="h-0.5 bg-slate-700 w-full">
          <div 
            className="h-full bg-cyan-400" 
            style={{ width: `${(gameState.currentTime / level.duration) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default RhythmGame;
