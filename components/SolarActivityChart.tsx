import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [timer, setTimer] = useState(0);

  // Timer logic
  useEffect(() => {
    let interval: any;
    if (loading) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setTimer((Date.now() - startTime) / 1000);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const initChart = useCallback((labels: string[], values: number[], isMock: boolean = false) => {
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
          plugins: [
            {
              id: 'nowMarker',
              afterDatasetsDraw(chart) {
                // Don't draw marker on mock data
                if (isMock) return;

                const { ctx } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta.data.length) return;
                
                const lastBar = meta.data[meta.data.length - 1];
                
                ctx.save();
                // Position above the bar
                ctx.translate(lastBar.x, lastBar.y - 8);
                
                // Glow
                ctx.shadowColor = '#33b5e5';
                ctx.shadowBlur = 10;
                
                // Triangle
                ctx.fillStyle = '#33b5e5';
                ctx.beginPath();
                ctx.moveTo(0, 0); // Tip
                ctx.lineTo(-4, -6);
                ctx.lineTo(4, -6);
                ctx.closePath();
                ctx.fill();
                
                // Text
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px Roboto';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText('NOW', 0, -8);
                
                ctx.restore();
              }
            }
          ],
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: isMock ? 0 : 500 },
            layout: {
              padding: { top: 20, bottom: 0, left: 0, right: 10 }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                enabled: !isMock, // Disable tooltip for mock data
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
  }, []);

  useEffect(() => {
    let isActive = true;

    // 1. Initialize Mock Chart immediately to show the "Scale"
    const now = new Date();
    const mockLabels: string[] = [];
    const mockValues: number[] = [];
    // Generate 56 points (7 days * 8 intervals) backwards
    for (let i = 55; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
        // Format roughly as expected ISO-ish string for the scale callback to work
        // e.g. "2023-10-27 00:00:00"
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hour = String(d.getHours()).padStart(2, '0');
        mockLabels.push(`${year}-${month}-${day} ${hour}:00:00`);
        mockValues.push(0); // Empty values
    }
    initChart(mockLabels, mockValues, true);

    const fetchData = async () => {
      const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
      
      const endpoints = [
        `https://corsproxy.io/?${targetUrl}`, 
        `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
      ];

      for (const url of endpoints) {
        if (!isActive) return;
        try {
          const fetchOptions: RequestInit = {
            method: 'GET',
            cache: 'no-store'
          };
          
          const response = await fetch(url, fetchOptions);
          if (response.ok) {
            const json = await response.json();
            
            if (Array.isArray(json) && json.length > 1) {
              const data = json.slice(1).slice(-56); 
              const labels = data.map((d: any) => d[0]);
              const values = data.map((d: any) => parseFloat(d[1]));
              
              if (onCurrentIndexChange && values.length > 0) {
                 onCurrentIndexChange(values[values.length - 1]);
              }
              
              if (isActive) {
                 initChart(labels, values, false);
                 setLoading(false);
              }
              return; 
            }
          }
        } catch (e) {
           console.warn(`Fetch failed for proxy: ${url}`, e);
        }
      }

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
  }, [initChart, onCurrentIndexChange]);

  return (
    <div className="w-full h-60 bg-black/40 rounded-xl border border-white/5 p-2 relative flex flex-col">
      {/* Title - Lifted z-index to be above loading overlay */}
      <div className="absolute top-2 left-3 flex items-center gap-2 z-30 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]'}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${error ? 'text-red-500' : 'text-[#33b5e5]'}`}>
            {title}
        </span>
      </div>

      {/* Loading Overlay - Semi-transparent to show grid underneath */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 rounded-xl bg-black/20 backdrop-blur-[1px]">
          <div className="relative flex items-center justify-center">
             {/* Spinner Ring */}
             <div className="w-12 h-12 border-4 border-[#33b5e5]/30 border-t-[#33b5e5] rounded-full animate-spin" />
             {/* Stopwatch inside */}
             <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[#33b5e5] tabular-nums">
                {timer.toFixed(1)}s
             </div>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {!loading && error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20 backdrop-blur-sm rounded-xl">
             <div className="text-center">
                <i className="fa-solid fa-triangle-exclamation text-amber-500 text-2xl mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Data Unavailable</p>
                <p className="text-[8px] text-slate-600 mt-1">Check Connection</p>
             </div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative flex-1 w-full min-h-0">
          <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default SolarActivityChart;