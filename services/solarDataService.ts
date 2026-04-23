import { DateTime } from 'luxon';

export interface SolarData {
  labels: string[];
  values: number[];
  timestamp: number;
}

const CACHE_KEY = 'ritmxoid_solar_cache';
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

class SolarDataService {
  private cachedData: SolarData | null = null;
  private fetchPromise: Promise<SolarData> | null = null;

  async getSolarData(): Promise<SolarData> {
    const now = Date.now();

    // 1. Check memory cache
    if (this.cachedData && (now - this.cachedData.timestamp) < CACHE_TTL) {
      return this.cachedData;
    }

    // 2. Check sessionStorage
    const saved = sessionStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SolarData;
        // Check if cached data is still fresh
        if (now - parsed.timestamp < CACHE_TTL) {
          this.cachedData = parsed;
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse solar cache', e);
      }
    }

    // 3. Fetch if not cached or expired
    if (this.fetchPromise) return this.fetchPromise;

    this.fetchPromise = this.fetchNewData();
    try {
      const data = await this.fetchPromise;
      this.cachedData = data;
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      return data;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async fetchNewData(): Promise<SolarData> {
    const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    
    // We try to fetch even if navigator says offline, 
    // because some environments report it incorrectly for local files.
    // But we use a shorter timeout if we think we are offline.
    const isReportedOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    const endpoints = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?${targetUrl}`, 
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
      targetUrl // Try direct fetch as well, some local environments might allow it
    ];

    for (const url of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), isReportedOffline ? 3000 : 8000);

        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json) && json.length > 0) {
            let labels: string[] = [];
            let values: number[] = [];

            if (Array.isArray(json[0])) {
              const data = json.slice(1).slice(-56);
              labels = data.map((d: any) => d[0]);
              values = data.map((d: any) => parseFloat(d[2]));
            } else {
              const data = json.slice(-56);
              labels = data.map((d: any) => d.time_tag || d.time);
              values = data.map((d: any) => parseFloat(d.Kp || d.kp || d.value));
            }

            const validIndices = values.map((v, i) => !isNaN(v) ? i : -1).filter(i => i !== -1);
            const filteredLabels = validIndices.map(i => labels[i]);
            const filteredValues = validIndices.map(i => values[i]);

            if (filteredValues.length > 0) {
              return {
                labels: filteredLabels,
                values: filteredValues,
                timestamp: Date.now()
              };
            }
          }
        }
      } catch (e) {
        console.warn(`Fetch failed for proxy: ${url}`, e);
      }
    }
    throw new Error('All proxies failed');
  }

  clearCache() {
    this.cachedData = null;
    sessionStorage.removeItem(CACHE_KEY);
  }
}

export const solarDataService = new SolarDataService();
