import { CompatibilityResult } from './compatibilityEngine';
import { SYNTHESIS_TEXTS_I18N } from './i18nSynthesis';

export interface SynthesisProfile {
  archetype: string;
  title: string;
  description: string;
  blindSpots: string[];
  conclusion: string;
}

export function generateSynthesis(results: CompatibilityResult, lang: string = 'ru'): SynthesisProfile {
  const texts = SYNTHESIS_TEXTS_I18N[lang] || SYNTHESIS_TEXTS_I18N['en'];
  
  // 1. Определяем уровни каждого ритма
  const getLevel = (val: number, isAnaerobic: boolean = false) => {
    if (isAnaerobic) {
      if (val <= 21) return 'LOW';
      if (val >= 29) return 'HIGH';
      return 'MID';
    } else {
      if (val <= 46) return 'LOW';
      if (val >= 55) return 'HIGH';
      return 'MID';
    }
  };

  const aerobic = getLevel(results.aerobic.total);
  const anaerobic = getLevel(results.anaerobic.total, true);
  const sensory = getLevel(results.sensory.total);
  const sexual = getLevel(results.sexual.total);
  const analytic = getLevel(results.analytic.total);

  const levels = { aerobic, anaerobic, sensory, sexual, analytic };
  const highs = Object.values(levels).filter(l => l === 'HIGH').length;
  const lows = Object.values(levels).filter(l => l === 'LOW').length;

  let archetype = '';

  // 2. Формируем Архетип (Фундамент)
  if (highs === 5) {
    archetype = 'absolute_resonance';
  } else if (lows >= 4) {
    archetype = 'perfect_balancer';
  } else if (sensory === 'HIGH' && sexual === 'HIGH') {
    archetype = 'sensual_typhoon';
  } else if (aerobic === 'HIGH' && analytic === 'HIGH') {
    archetype = 'achievers_union';
  } else if (analytic === 'HIGH' && sensory === 'HIGH') {
    archetype = 'intellectual_empathy';
  } else if (aerobic === 'HIGH' && sexual === 'HIGH') {
    archetype = 'tireless_seekers';
  } else if (anaerobic === 'HIGH') {
    archetype = 'brothers_in_arms';
  } else {
    archetype = 'harmonious_union';
  }

  const title = texts.archetypes[archetype].title;
  const description = texts.archetypes[archetype].description;

  // 3. Выявляем Слепые зоны (Противофазы)
  const blindSpots: string[] = [];
  
  if (analytic === 'LOW') {
    blindSpots.push(texts.blindSpots.analytic);
  }
  if (anaerobic === 'LOW') {
    blindSpots.push(texts.blindSpots.anaerobic);
  }
  if (sensory === 'LOW') {
    blindSpots.push(texts.blindSpots.sensory);
  }
  if (sexual === 'LOW') {
    blindSpots.push(texts.blindSpots.sexual);
  }
  if (aerobic === 'LOW') {
    blindSpots.push(texts.blindSpots.aerobic);
  }

  // 4. Золотой совет (Вывод)
  let conclusion = '';
  if (archetype === 'absolute_resonance') {
    conclusion = texts.conclusions.absolute_resonance;
  } else if (archetype === 'perfect_balancer') {
    conclusion = texts.conclusions.perfect_balancer;
  } else if (archetype === 'sensual_typhoon' && analytic === 'LOW') {
    conclusion = texts.conclusions.sensual_typhoon_analytic_low;
  } else if (blindSpots.length > 0) {
    conclusion = texts.conclusions.blind_spots;
  } else {
    conclusion = texts.conclusions.default;
  }

  return {
    archetype,
    title,
    description,
    blindSpots,
    conclusion
  };
}
