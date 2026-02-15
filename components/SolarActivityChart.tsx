import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface SolarActivityChartProps {
  title: string;
  onCurrentIndexChange?: (value: number) => void;
}

const SolarActivityChart: React.FC<SolarActivityChartProps> = ({ title, onCurrentIndexChange }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
      
      const endpoints = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
      ];

      let rawData = null;
      let success = false;

      // 1. Пытаемся получить данные
      for (const url of endpoints) {
        if (signal.aborted) return;
        try {
          const response = await fetch(url, { signal });
          if (response.ok) {
            const json = await response.json();
            if (Array.isArray(json) && json.length > 1) {
              rawData = json;
              success = true;
              break; 
            }
          }
        } catch (e) {
          // Игнорируем ошибки сети, пробуем следующий прокси
        }
      }

      if (signal.aborted) return;

      // 2. Если данных нет, генерируем заглушку
      if (!success || !rawData) {
        console.warn("Using offline mock data");
        setIsOffline(true);
        const now = new Date();
        rawData = [['time_tag', 'k_index']]; 
        // Генерируем "красивую" волну для демо-режима
        for (let i = 55; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
            const mockValue = Math.max(1, Math.min(6, 2 + Math.sin(i / 5) * 2 + Math.random()));
            rawData.push([date.toISOString(), mockValue]); 
        }
      }

      try {
        // Парсим данные
        const data = rawData.slice(1).slice(-56);
        const labels = data.map((d: any) => d[0]);
        const values = data.map((d: any) => parseFloat(d[1]));

        // Обновляем родительский компонент
        if (values.length > 0 && onCurrentIndexChange) {
            onCurrentIndexChange(values[values.length - 1]);
        }

        const barColors = values.map((v: number) => {
          if (v >= 7) return '#9933cc'; // Purple (Strong storm)
          if (v >= 5) return '#cc0000'; // Red (Minor storm)
          if (v >= 4) return '#ffd600'; // Yellow (Disturbance)
          return '#33b5e5';             // Blue (Quiet)
        });

        if (chartRef.current) {
          if (chartInstance.current) {
            chartInstance.current.destroy();
          }

          const ctx = chartRef.current.getContext('2d');
          if (ctx) {
            chartInstance.current = new Chart(ctx, {
              type: 'bar',
              data: {
                labels: labels,
                datasets: [{
                  data: values,
                  backgroundColor: barColors,
                  barPercentage: 0.85,
                  categoryPercentage: 1.0,
                  borderRadius: 2
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                layout: {
                  padding: { top: 20, bottom: 0, left: 0, right: 10 }
                },
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(27, 37, 49, 0.9)',
                    titleColor: '#33b5e5',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    callbacks: { 
                        title: (items) => {
                            const dateStr = items[0].label;
                            // Пытаемся распарсить дату корректно
                            try {
                                const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + ' UTC');
                                return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                            } catch(e) {
                                return dateStr;
                            }
                        } 
                    }
                  }
                },
                scales: {
                  y: {
                    position: 'right',
                    min: 0,
                    max: 9, 
                    ticks: { 
                      stepSize: 1,
                      color: '#666', 
                      font: { size: 9, weight: 'bold' },
                      padding: 5
                    },
                    grid: { 
                        color: 'rgba(255,255,255,0.05)',
                        drawTicks: false
                    },
                    border: { display: false }
                  },
                  x: {
                    grid: { display: false },
                    ticks: {
                      autoSkip: true,
                      maxTicksLimit: 8,
                      maxRotation: 0,
                      color: '#555',
                      font: { size: 9, weight: 'bold' },
                      callback: function(val, index) {
                        const dateStr = labels[index];
                        try {
                            const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + ' UTC');
                            // Показываем дату только для 00:00 часов
                            if (d.getUTCHours() === 0 || index === 0) {
                                return d.getDate() + '/' + (d.getMonth() + 1);
                            }
                        } catch(e) {}
                        return '';
                      }
                    }
                  }
                }
              },
              plugins: [
                {
                    id: 'customCanvasBackgroundColor',
                    beforeDraw: (chart) => {
                        const ctx = chart.canvas.getContext('2d');
                        if(ctx) {
                            ctx.save();
                            ctx.globalCompositeOperation = 'destination-over';
                            ctx.fillStyle = 'transparent';
                            ctx.fillRect(0, 0, chart.width, chart.height);
                            ctx.restore();
                        }
                    }
                }
              ]
            });
          }
        }
      } catch (error) {
        console.error("Chart build error:", error);
      } finally {
        if (!signal.aborted) {
            setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="w-full h-60 bg-black/40 rounded-xl border border-white/5 p-2 relative overflow-hidden flex flex-col">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#33b5e5] border-t-transparent rounded-full animate-spin" />
            <span className="text-[9px] font-bold text-[#33b5e5] uppercase tracking-widest animate-pulse">Scanning...</span>
          </div>
        </div>
      )}
      
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]'}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${isOffline ? 'text-amber-500' : 'text-[#33b5e5]'}`}>
            {title} {isOffline && '(SIMULATION)'}
        </span>
      </div>

      <div className="flex-1 w-full relative min-h-0">
          <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default SolarActivityChart;