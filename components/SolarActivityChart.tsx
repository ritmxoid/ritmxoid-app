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
    const fetchData = async () => {
      const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
      
      // Список прокси-серверов. Браузер будет пробовать их по очереди.
      const endpoints = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${targetUrl}`
      ];

      let rawData = null;
      let success = false;

      // 1. Пытаемся получить реальные данные
      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            rawData = await response.json();
            // Проверка, что данные не пустые и это массив
            if (Array.isArray(rawData) && rawData.length > 1) {
              success = true;
              break; 
            }
          }
        } catch (e) {
          console.warn(`Proxy failed: ${url}`);
        }
      }

      // 2. Если все прокси отказали, генерируем "Фейковые" данные, чтобы не было дыры в дизайне
      if (!success || !rawData) {
        console.warn("All proxies failed. Using mock data.");
        setIsOffline(true);
        // Генерируем данные за последние 7 дней (8 измерений в день = 56 точек)
        const now = new Date();
        rawData = [['time_tag', 'k_index']]; // Header
        for (let i = 55; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
            // Случайный индекс от 1 до 3 (спокойное солнце)
            rawData.push([date.toISOString(), Math.floor(Math.random() * 3) + 1]); 
        }
      }

      try {
        // Обработка данных (NOAA возвращает массив массивов, убираем заголовок)
        const data = rawData.slice(1).slice(-56);

        const labels = data.map((d: any) => d[0]);
        const values = data.map((d: any) => parseFloat(d[1]));

        // Сообщаем родителю текущий индекс (последнее значение)
        if (values.length > 0 && onCurrentIndexChange) {
            onCurrentIndexChange(values[values.length - 1]);
        }

        const barColors = values.map((v: number) => {
          if (v > 9) return '#000000';
          if (v >= 7) return '#9933cc'; // Фиолетовый (Сильная буря)
          if (v >= 5) return '#cc0000'; // Красный (Буря)
          if (v >= 4) return '#ffd600'; // Желтый (Возмущение)
          return '#33b5e5';             // Голубой (Спокойно)
        });

        if (chartRef.current) {
          if (chartInstance.current) {
            chartInstance.current.destroy();
          }

          const ctx = chartRef.current.getContext('2d');
          if (!ctx) return;

          chartInstance.current = new Chart(ctx, {
            type: 'bar',
            data: {
              labels: labels,
              datasets: [{
                data: values,
                backgroundColor: barColors,
                barPercentage: 0.85,
                categoryPercentage: 1.0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              animation: false, // Отключаем анимацию при инициализации для скорости
              layout: {
                padding: { top: 25, bottom: 5 }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: '#1b2531',
                  titleColor: '#33b5e5',
                  bodyColor: '#fff',
                  borderColor: '#33b5e5',
                  borderWidth: 1,
                  callbacks: { title: (items) => `UTC: ${items[0].label}` }
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
                    font: { size: 9, weight: 'bold' } 
                  },
                  grid: { color: 'rgba(255,255,255,0.05)' },
                  border: { display: false }
                },
                x: {
                  grid: { display: false },
                  ticks: {
                    autoSkip: false,
                    maxRotation: 0,
                    color: '#666',
                    font: { size: 8, weight: 'bold' },
                    callback: function(val, index) {
                      const dateString = labels[index];
                      // Проверяем формат даты (ISO или простой)
                      const dateObj = new Date(dateString.includes('T') ? dateString : dateString + ' UTC');
                      
                      if (dateObj.getUTCHours() === 0) {
                        return dateObj.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }).toUpperCase();
                      }
                      return '';
                    }
                  }
                }
              }
            },
            plugins: [
              {
                id: 'daySeparator',
                beforeDraw: (chart) => {
                  const {ctx, chartArea: {top, bottom}, scales: {x}} = chart;
                  ctx.save();
                  ctx.setLineDash([4, 4]);
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                  labels.forEach((l: string, i: number) => {
                    const dateObj = new Date(l.includes('T') ? l : l + ' UTC');
                    if (dateObj.getUTCHours() === 0 && i > 0) {
                      const xPos = x.getPixelForValue(i) - (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2;
                      ctx.beginPath(); ctx.moveTo(xPos, top); ctx.lineTo(xPos, bottom); ctx.stroke();
                    }
                  });
                  ctx.restore();
                }
              },
              {
                id: 'nowMarker',
                afterDraw: (chart) => {
                  const {ctx, scales: {x, y}} = chart;
                  const lastIndex = values.length - 1;
                  const xPos = x.getPixelForValue(lastIndex);
                  const yVal = values[lastIndex];
                  const yPos = y.getPixelForValue(yVal) - 5;

                  ctx.save();
                  ctx.fillStyle = isOffline ? '#666' : '#33b5e5';
                  ctx.font = 'bold 9px Roboto';
                  ctx.textAlign = 'center';
                  ctx.fillText(isOffline ? 'SIM' : 'NOW', xPos, yPos - 12);
                  ctx.beginPath();
                  ctx.moveTo(xPos, yPos);
                  ctx.lineTo(xPos - 4, yPos - 8);
                  ctx.lineTo(xPos + 4, yPos - 8);
                  ctx.closePath();
                  ctx.fill();
                  ctx.restore();
                }
              }
            ]
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Chart Render Error:", error);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="w-full h-60 bg-black/40 rounded-xl border border-white/5 p-2 relative overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="w-5 h-5 border-2 border-[#33b5e5] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <div className="absolute top-2 left-3 flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-slate-500' : 'bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]'}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${isOffline ? 'text-slate-500' : 'text-[#33b5e5]'}`}>
            {title} {isOffline && '(OFFLINE)'}
        </span>
      </div>
      <canvas ref={chartRef} />
    </div>
  );
};

export default SolarActivityChart;