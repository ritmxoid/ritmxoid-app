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
  const [error, setError] = useState(false);

  useEffect(() => {
    let isActive = true;

    const initChart = (labels: string[], values: number[]) => {
       if (!chartRef.current) return;
       
       if (chartInstance.current) {
         chartInstance.current.destroy();
         chartInstance.current = null;
       }

       const ctx = chartRef.current.getContext('2d');
       if (!ctx) return;

       // Colors
       const barColors = values.map((v: number) => {
          if (v >= 7) return '#9933cc'; 
          if (v >= 5) return '#cc0000'; 
          if (v >= 4) return '#ffd600'; 
          return '#33b5e5';             
        });

       chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: barColors,
              barPercentage: 0.9,
              categoryPercentage: 1.0,
              borderRadius: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 },
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
                displayColors: false,
                callbacks: { 
                    title: (items) => {
                        const dateStr = items[0].label;
                        return dateStr.substring(0, 16).replace(' ', ' T:'); 
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
                grid: { 
                  display: true,
                  color: (context) => {
                     // Strictly check for midnight in the label string
                     const label = labels[context.index];
                     if (label && (label.includes('00:00:00') || label.includes('T00:00:00'))) {
                        return 'rgba(255,255,255,0.2)';
                     }
                     return 'transparent';
                  },
                  drawTicks: false
                },
                ticks: {
                  autoSkip: false,
                  maxRotation: 0,
                  color: '#888',
                  font: { size: 10, weight: 'bold' },
                  callback: function(val, index) {
                    const label = this.getLabelForValue(val as number);
                    // Strictly check for midnight in the label string
                    if (label.includes('00:00:00') || label.includes('T00:00:00')) {
                        const d = new Date(label);
                        const day = d.getDate();
                        const month = d.toLocaleString('en', { month: 'short' });
                        return `${day} ${month}`;
                    }
                    return '';
                  }
                }
              }
            }
          }
       });
    };

    const fetchData = async () => {
      const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
      // Use proxies to bypass CORS since we are on client-side
      const endpoints = [
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`
      ];

      for (const url of endpoints) {
        if (!isActive) return;
        try {
          const response = await fetch(url);
          if (response.ok) {
            const json = await response.json();
            if (Array.isArray(json) && json.length > 1) {
              // Parse Data (NOAA returns [ [time, kp, ...], ... ])
              // Take last 56 entries (7 days * 8 intervals)
              const data = json.slice(1).slice(-56); 
              const labels = data.map((d: any) => d[0]);
              const values = data.map((d: any) => parseFloat(d[1]));
              
              if (onCurrentIndexChange && values.length > 0) {
                 onCurrentIndexChange(values[values.length - 1]);
              }
              
              if (isActive) {
                 initChart(labels, values);
                 setLoading(false);
              }
              return; // Success
            }
          }
        } catch (e) {
           console.warn(`Fetch failed for ${url}`);
        }
      }

      // If all failed
      if (isActive) {
          setLoading(false);
          setError(true);
      }
    };

    fetchData();

    return () => {
      isActive = false;
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-60 bg-black/40 rounded-xl border border-white/5 p-2 relative flex flex-col">
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-[#33b5e5] border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {!loading && error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm rounded-xl">
             <div className="text-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 text-2xl mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Data Unavailable</p>
             </div>
        </div>
      )}
      
      {/* Title */}
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]'}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${error ? 'text-red-500' : 'text-[#33b5e5]'}`}>
            {title}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-0">
          <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default SolarActivityChart;