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
    let isActive = true; // Prevents state updates on unmounted component

    const initChart = (labels: string[], values: number[], isSimulated: boolean) => {
       if (!chartRef.current) return;
       
       // Destroy existing instance to prevent "Canvas is already in use" error
       if (chartInstance.current) {
         chartInstance.current.destroy();
         chartInstance.current = null;
       }

       const ctx = chartRef.current.getContext('2d');
       if (!ctx) return;

       // Define colors based on value
       const barColors = values.map((v: number) => {
          if (v >= 7) return '#9933cc'; // Purple (Strong storm)
          if (v >= 5) return '#cc0000'; // Red (Minor storm)
          if (v >= 4) return '#ffd600'; // Yellow (Disturbance)
          return '#33b5e5';             // Blue (Quiet)
        });

       chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              data: values,
              backgroundColor: barColors,
              barPercentage: 0.8,
              categoryPercentage: 0.9,
              borderRadius: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 }, // Disable animation for stability
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
                  maxTicksLimit: 6,
                  maxRotation: 0,
                  color: '#555',
                  font: { size: 9, weight: 'bold' },
                  callback: function(val, index) {
                    const dateStr = labels[index];
                    try {
                        const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + ' UTC');
                        if (d.getUTCHours() === 0 || index === 0) {
                            return d.getDate() + '/' + (d.getMonth() + 1);
                        }
                    } catch(e) {}
                    return '';
                  }
                }
              }
            }
          }
       });
    };

    const loadMockData = () => {
        if (!isActive) return;
        console.log("Loading mock data...");
        setIsOffline(true);
        const now = new Date();
        const labels = [];
        const values = [];
        
        // Generate last 7 days of 3-hour intervals (approx 56 points)
        for (let i = 55; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
            // Simulate a natural curve
            const val = Math.max(1, Math.min(6, 2 + Math.sin(i / 8) * 2 + Math.random() * 1.5));
            labels.push(date.toISOString());
            values.push(val);
        }

        if (onCurrentIndexChange && values.length > 0) {
            onCurrentIndexChange(values[values.length - 1]);
        }
        initChart(labels, values, true);
        setLoading(false);
    };

    const fetchData = async () => {
      // PROXY STRATEGY
      const targetUrl = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
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
              // Parse Data
              const data = json.slice(1).slice(-56); // Remove header, take last 56
              const labels = data.map((d: any) => d[0]);
              const values = data.map((d: any) => parseFloat(d[1]));
              
              if (onCurrentIndexChange && values.length > 0) {
                 onCurrentIndexChange(values[values.length - 1]);
              }
              
              if (isActive) {
                 initChart(labels, values, false);
                 setLoading(false);
              }
              return; // Success!
            }
          }
        } catch (e) {
           console.warn(`Fetch failed for ${url}`);
        }
      }

      // If we get here, all fetches failed
      loadMockData();
    };

    // Race Condition Handler: If fetch takes too long (> 2s), show mock data so UI isn't empty
    const timeoutId = setTimeout(() => {
        if (loading && isActive) {
            console.warn("Fetch timed out, switching to mock data.");
            loadMockData();
        }
    }, 2000);

    fetchData();

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
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
      
      {/* Title & Status */}
      <div className="absolute top-2 left-3 flex items-center gap-2 z-10 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]'}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${isOffline ? 'text-amber-500' : 'text-[#33b5e5]'}`}>
            {title} {isOffline && '(SIM)'}
        </span>
      </div>

      {/* Canvas Container: Explicitly sized to fill parent flex area */}
      <div className="relative flex-1 w-full min-h-0">
          <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
};

export default SolarActivityChart;