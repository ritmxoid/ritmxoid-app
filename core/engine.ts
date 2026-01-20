import { DateTime } from 'luxon';

export const COLORS = {
  MOTOR: '#ffd600',    // Яркий желтый
  PHYSICAL: '#cc0000', // Насыщенный красный
  SENSORY: '#33b5e5',  // Holo Blue
  ANALYTICAL: '#9933cc', // Насыщенный фиолетовый
  CRITICAL: '#44aa00', 
  LOW: '#2196f3',      
  OPTIMAL: '#ffd600',  
  HIGH: '#ff9800',     
  SUPERHIGH: '#ff1744' 
};

export const ACTIVITY_CONFIG = {
  digestion: { period: 3085714, cycle: 86400000, name: 'Пищеварение', icon: 'fa-solid fa-utensils' },
  aerobic: { period: 3085714, cycle: 86400000, name: 'Аэробика', icon: 'fa-solid fa-bicycle' },
  anaerobic: { period: 6171428, cycle: 172800000, name: 'Анаэробика', icon: 'fa-solid fa-dumbbell' },
  sensory: { period: 9257142, cycle: 259200000, name: 'Сенсорика', icon: 'fa-solid fa-comment' },
  sexual: { period: 64800000, cycle: 259200000, name: 'Секс', icon: 'fa-solid fa-venus-mars' },
  analytic: { period: 10800000, cycle: 302400000, name: 'Аналитика', icon: 'fa-solid fa-brain' }
};

const MAP_NORMAL = [
  [16, 8, 4, 0, 4, 8, 16, 24, 32, 40, 48, 40, 32, 24],
  [12, 10, 8, 6, 4, 2, 0, 0, 2, 4, 6, 8, 10, 12, 12, 14, 16, 18, 20, 22, 24, 24, 22, 20, 18, 16, 14, 12],
  [8, 7, 6, 5, 4, 3, 2, 1.5, 1, 0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 13.5, 14, 14.5, 15, 15.5, 16, 15.5, 15, 14.5, 14, 13.5, 13, 12, 11, 10, 9],
  [6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6]
];

const MAP_35 = [
  [24, 32, 40, 48, 40, 32, 24, 16, 8, 4, 0, 4, 8, 16],
  [12, 14, 16, 18, 20, 22, 24, 24, 22, 20, 18, 16, 14, 12, 12, 10, 8, 6, 4, 2, 0, 0, 2, 4, 6, 8, 10, 12],
  [9, 10, 11, 12, 13, 13.5, 14, 14.5, 15, 15.5, 16, 15.5, 15, 14.5, 14, 13.5, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1.5, 1, 0.5, 0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8],
  [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]
];

// Fix: Corrected invalid array declaration syntax (was const SUPPERIOD[] = { ... })
const SUPPERIOD: number[] = [1372, 196, 14, 1, 86400, 6171.428, 440.816, 31.486, 2.24];
export const LEVELCELL = [14, 28, 42, 49];
const RITMNUM = [1, 2, 3, 3.5];
const CELLANGLE = [25.71, 12.85, 8.57, 7.34];

export const MAP_NAMES = [
  { id: "3.5", name: 'MACRO 3.5', type: 'MACRO', isMicro: false },
  { id: "3", name: 'MACRO 3', type: 'MACRO', isMicro: false },
  { id: "2", name: 'MACRO 2', type: 'MACRO', isMicro: false },
  { id: "1", name: 'MACRO 1', type: 'MACRO', isMicro: false },
  { id: "0", name: 'ZERO', type: 'ZERO', isMicro: true },
  { id: "1", name: 'MICRO 1', type: 'MICRO', isMicro: true },
  { id: "2", name: 'MICRO 2', type: 'MICRO', isMicro: true },
  { id: "3", name: 'MICRO 3', type: 'MICRO', isMicro: true },
  { id: "3.5", name: 'MICRO 3.5', type: 'MICRO', isMicro: true }
];

export function getBalanceColor(balance: number): string {
  if (balance >= 75) return COLORS.SUPERHIGH;
  if (balance >= 60) return COLORS.HIGH;
  if (balance >= 45) return COLORS.OPTIMAL;
  if (balance >= 30) return COLORS.LOW;
  return COLORS.CRITICAL;
}

export function calculateDaysGone(birthDate: DateTime, currentDate: DateTime): number {
  // Расчет по календарным дням (от полуночи до полуночи), чтобы избежать сдвигов из-за времени рождения
  const startOfBirth = birthDate.startOf('day');
  const startOfTarget = currentDate.startOf('day');
  const diff = Math.floor(startOfTarget.diff(startOfBirth, 'days').days);
  return diff < 0 ? 0 : diff;
}

export function calculateSecondsGone(birthDate: DateTime, currentDate: DateTime): number {
  const diff = Math.floor(currentDate.diff(birthDate, 'seconds').seconds);
  return diff < 0 ? 0 : diff;
}

export function mapCalc(j: number, calcType: number): number[] {
  const energyCell = [0, 0, 0, 0];
  const mapType = (j === 0 || j === 4 || j === 8) ? MAP_35 : MAP_NORMAL;
  for (let n = 0; n <= 3; n++) {
    let idx = 0;
    if (j >= 4) {
      idx = Math.floor(((calcType / (SUPPERIOD[j] * RITMNUM[n])) % 1) * LEVELCELL[n]);
    } else {
      idx = Math.floor((calcType % (SUPPERIOD[j] * LEVELCELL[n])) / SUPPERIOD[j]);
    }
    energyCell[n] = mapType[n][idx] || 0;
  }
  return energyCell;
}

export function calculateFullBalance(daysGone: number): number {
  let sum = 0;
  const balance = [0, 1, 2, 3].map(j => mapCalc(j, daysGone));
  for (let n = 0; n <= 3; n++) {
    sum += (balance[n][0] + balance[n][1] + balance[n][2] + balance[n][3]) / ((4 - n) * 2);
  }
  return Math.round(sum);
}

export function calculateBasicBalance(daysGone: number): number {
  let sum = 0;
  const balance = [0, 1, 2, 3].map(j => mapCalc(j, daysGone));
  for (let n = 0; n <= 3; n++) {
    sum += (balance[n][0] + balance[n][1]) / ((4 - n) * 2);
  }
  return Math.round(sum);
}

export function calculateReactiveBalance(daysGone: number): number {
  let sum = 0;
  const balance = [0, 1, 2, 3].map(j => mapCalc(j, daysGone));
  for (let n = 0; n <= 3; n++) {
    sum += (balance[n][2] + balance[n][3]) / ((4 - n) * 2);
  }
  return Math.round(sum);
}

export function calculateSpecificRhythms(daysGone: number): { motor: number, physical: number, sensory: number, analytical: number } {
  const balance = [0, 1, 2, 3].map(j => mapCalc(j, daysGone));
  const getVal = (n: number) => {
    return Math.round(balance[0][n] * 0.125 + balance[1][n] * 0.166 + balance[2][n] * 0.25 + balance[3][n] * 0.5) * 4;
  };
  return { motor: getVal(0), physical: getVal(1), sensory: getVal(2), analytical: getVal(3) };
}

export function calculateMapAngles(mapIdx: number, val: number): number[] {
  const angles = [0, 0, 0, 0];
  const isMicro = mapIdx >= 4;
  for (let n = 0; n <= 3; n++) {
    let angle = 0;
    if (isMicro) {
      angle = CELLANGLE[n] * Math.floor(((val / (SUPPERIOD[mapIdx] * RITMNUM[n])) % 1) * LEVELCELL[n]);
      if (mapIdx === 4 || mapIdx === 8) angle += 180;
    } else {
      angle = CELLANGLE[n] * Math.floor((val % (SUPPERIOD[mapIdx] * LEVELCELL[n])) / SUPPERIOD[mapIdx]);
      if (mapIdx === 0) angle += 180;
    }
    angles[n] = angle + 90;
  }
  return angles;
}

export function calculateSunAngle(dte: DateTime): number {
  const totalMinutes = dte.hour * 60 + dte.minute + dte.second / 60;
  return (totalMinutes - 760) * 0.25;
}

export function calculateEarthAngle(dte: DateTime): number {
  const daysInYear = dte.daysInYear;
  return (dte.ordinal - 15) * (360 / daysInYear) + 180;
}

export function calculateMoonAngle(dte: DateTime): number {
  const fullMoonRef = DateTime.fromObject({ year: 1996, month: 1, day: 6, hour: 16, minute: 15 }, { zone: 'utc' });
  const lunarPeriodMillis = 29.530588 * 24 * 3600 * 1000;
  const diffMillis = dte.toUTC().diff(fullMoonRef).as('milliseconds');
  const phaseProgress = (diffMillis % lunarPeriodMillis + lunarPeriodMillis) % lunarPeriodMillis;
  return (phaseProgress * 360) / lunarPeriodMillis;
}

export function getRiskLevel(daysGone: number, dte: DateTime): number {
  const COEFF1 = [25, 13, 8, 4], COEFF2 = [15, 7, 5, 3], COEFF3 = [10, 5, 3, 2];
  let lvl = 0;
  for (let n = 0; n <= 3; n++) {
    const c0 = Math.floor((daysGone % (196 * LEVELCELL[n])) / 196);
    const c1 = Math.floor((daysGone % (14 * LEVELCELL[n])) / 14);
    const c2 = Math.floor((daysGone % (1 * LEVELCELL[n])) / 1);
    const lc = LEVELCELL[n] - 1;
    if (c2 === 0 || c2 === lc) lvl += COEFF1[n];
    if (c1 === 0 || c1 === lc) lvl += COEFF2[n];
    if (c0 === 0 || c0 === lc) lvl += COEFF3[n];
  }

  const moonPos = calculateMoonAngle(dte) % 360;
  let md = 0;
  if ((moonPos > 83 && moonPos < 97) || (moonPos > 263 && moonPos < 277) || (moonPos > 353 || moonPos < 7)) {
    md = 10;
  }

  const earthPos = dte.ordinal;
  let dd = 0;
  if ((earthPos >= 73 && earthPos <= 86) || (earthPos >= 258 && earthPos <= 271) || (earthPos >= 168 && earthPos <= 176) || (earthPos >= 351 && earthPos <= 359)) {
    dd = 3;
  }

  return lvl + md + dd;
}

export interface ActivityPeriod {
  start: DateTime;
  end: DateTime;
  isActive: boolean;
}

export function getActivitiesPack(birthDate: DateTime, currentDate: DateTime): Record<string, ActivityPeriod[]> {
  const result: Record<string, ActivityPeriod[]> = {};
  const millisSinceBirth = currentDate.diff(birthDate).as('milliseconds');

  Object.entries(ACTIVITY_CONFIG).forEach(([id, config]) => {
    const periods: ActivityPeriod[] = [];
    const currentCycleStartMillis = Math.floor(millisSinceBirth / config.cycle) * config.cycle;
    const cycleStart = birthDate.plus({ milliseconds: currentCycleStartMillis });
    
    let startTime = cycleStart;
    if (id === 'sexual') startTime = startTime.plus({ milliseconds: config.period * 3 });

    for (let n = 1; n <= 28; n++) {
      let shouldAdd = false;
      if (id === 'digestion') {
        shouldAdd = [3, 7, 11, 15, 19, 23, 27].includes(n);
      } else if (id === 'sexual') {
        shouldAdd = (n === 1);
      } else if (id === 'anaerobic') {
        shouldAdd = (n % 4 === 0);
      } else {
        shouldAdd = (n % 2 === 0);
      }

      if (shouldAdd) {
        const pStart = startTime;
        const pEnd = startTime.plus({ milliseconds: config.period });
        periods.push({
          start: pStart,
          end: pStart.plus({ milliseconds: config.period }),
          isActive: currentDate >= pStart && currentDate <= pEnd
        });
      }
      startTime = startTime.plus({ milliseconds: config.period });
    }
    result[id] = periods;
  });

  return result;
}