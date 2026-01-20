
export enum Lane {
  LEFT = 0,
  UP = 1,
  DOWN = 2,
  RIGHT = 3
}

export interface BeatNote {
  id: string;
  time: number; 
  lane: Lane;
  hit: boolean;
  missed: boolean;
}

export interface Profile {
  id: string;
  name: string;
  birthDate: string; // ISO format
  isMaster: boolean;
  teamName?: string; // Поле для группировки
}

export interface RhythmLevel {
  title: string;
  bpm: number;
  duration: number;
  notes: BeatNote[];
  vibe: string;
  color: string;
}

export interface GameState {
  score: number;
  combo: number;
  maxCombo: number;
  health: number;
  isPlaying: boolean;
  currentTime: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface AIResponse {
  title: string;
  bpm: number;
  vibe: string;
  color: string;
  patterns: Array<{
    lane: number;
    timestamp: number;
  }>;
}
