import { DateTime } from 'luxon';

export interface SolarData {
  labels: string[];
  values: number[];
  timestamp: number;
}

const CACHE_KEY = 'ritmxoid_solar_cache';

class SolarDataService {
  private cachedData: SolarData | null = null;
  private fetchPromise: Promise<SolarData> | null = null;

  async getSolarData(): Promise<SolarData> {
    // 1. Check memory cache
    if (this.cachedData) {
      return this.cachedData;
    }

    // 2. Check sessionStorage (persists across refreshes, but not across closing/reopening browser)
    const saved = sessionStorage.getItem(CACHE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SolarData;
        this.cachedData = parsed;
        return parsed;
      } catch (e) {
        console.error('Failed to parse solar cache', e);
      }
    }

    // 3. Fetch if not cached
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
    // If we know we are offline, don't even try to avoid blocking the UI
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('System is offline');
    }

    const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
    const endpoints = [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
      `https://corsproxy.io/?${targetUrl}`, 
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s global timeout

    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        });

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
