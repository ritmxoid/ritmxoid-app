import { DateTime } from 'luxon';
import { ACTIVITY_CONFIG } from './engine';

// The weights for each map level (sum to 100)
const MAP_WEIGHTS = [
  { name: 'Map 0 (Base)', weight: 50, multiplier: 1 },
  { name: 'Map 1 (Macro 1)', weight: 25, multiplier: 14 },
  { name: 'Map 2 (Macro 2)', weight: 12, multiplier: 196 },
  { name: 'Map 3 (Macro 3)', weight: 8, multiplier: 1372 },
  { name: 'Map 3.5 (Global)', weight: 5, multiplier: 1372 * 2 } // Approximation for the highest level
];

export interface MapCompatibility {
  name: string;
  max: number;
  actual: number;
}

export interface ActivityCompatibility {
  total: number;
  maps: MapCompatibility[];
}

export interface CompatibilityResult {
  aerobic: ActivityCompatibility;
  anaerobic: ActivityCompatibility;
  sensory: ActivityCompatibility;
  sexual: ActivityCompatibility;
  analytic: ActivityCompatibility;
}

function calculateOverlapPercentage(diffMillis: number, cycleMillis: number, activeSegments: number[], totalSegments: number = 28): number {
  // Normalize difference to one cycle
  const shift = Math.abs(diffMillis) % cycleMillis;
  const segmentDuration = cycleMillis / totalSegments;
  
  let overlapTime = 0;
  let totalActiveTime = activeSegments.length * segmentDuration;

  // For each active segment of Person A
  for (const segA of activeSegments) {
    const startA = (segA - 1) * segmentDuration;
    const endA = startA + segmentDuration;

    // Check against all active segments of Person B (shifted)
    for (const segB of activeSegments) {
      const startB = ((segB - 1) * segmentDuration + shift) % cycleMillis;
      const endB = startB + segmentDuration;

      // Handle wrap-around for B
      if (startB > endB) {
        // Segment B wraps around the cycle end
        overlapTime += calculateSegmentOverlap(startA, endA, startB, cycleMillis);
        overlapTime += calculateSegmentOverlap(startA, endA, 0, endB);
      } else {
        overlapTime += calculateSegmentOverlap(startA, endA, startB, endB);
      }
    }
  }

  return (overlapTime / totalActiveTime);
}

function calculateSegmentOverlap(start1: number, end1: number, start2: number, end2: number): number {
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);
  return Math.max(0, overlapEnd - overlapStart);
}

function calculateActivityComp(diffMillis: number, configId: string): ActivityCompatibility {
  const config = ACTIVITY_CONFIG[configId as keyof typeof ACTIVITY_CONFIG];
  if (!config) return { total: 0, maps: [] };

  // Determine active segments based on engine.ts logic
  let activeSegments: number[] = [];
  if (configId === 'sexual') {
    // Sexual activity uses the passive phases (odd segments) of the sensory rhythm
    activeSegments = Array.from({length: 14}, (_, i) => (i * 2) + 1); // 1, 3, 5... 27
  } else if (configId === 'anaerobic') {
    activeSegments = [4, 8, 12, 16, 20, 24, 28];
  } else {
    // aerobic, sensory, analytic
    activeSegments = Array.from({length: 14}, (_, i) => (i + 1) * 2); // 2, 4, 6... 28
  }

  const maps: MapCompatibility[] = [];
  let total = 0;

  for (const map of MAP_WEIGHTS) {
    // Scale the cycle length by the map multiplier
    const scaledCycleMillis = config.cycle * map.multiplier;
    
    // Calculate overlap percentage for this scaled cycle
    const overlapRatio = calculateOverlapPercentage(diffMillis, scaledCycleMillis, activeSegments);
    
    const actualScore = overlapRatio * map.weight;
    total += actualScore;

    maps.push({
      name: map.name,
      max: map.weight,
      actual: actualScore
    });
  }

  return { total, maps };
}

export function calculateCompatibility(date1: DateTime, date2: DateTime): CompatibilityResult {
  const diffMillis = Math.abs(date1.diff(date2).as('milliseconds'));

  return {
    aerobic: calculateActivityComp(diffMillis, 'aerobic'),
    anaerobic: calculateActivityComp(diffMillis, 'anaerobic'),
    sensory: calculateActivityComp(diffMillis, 'sensory'),
    sexual: calculateActivityComp(diffMillis, 'sexual'),
    analytic: calculateActivityComp(diffMillis, 'analytic')
  };
}
