import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Chart, registerables } from 'chart.js';
import { DateTime } from 'luxon';
import { AlertTriangle } from 'lucide-react';
import { solarDataService } from '../services/solarDataService';

Chart.register(...registerables);

interface SolarActivityChartProps {
  title: string;
  lang?: string;
  onCurrentIndexChange?: (value: number) => void;
}

const SolarActivityChart: React.FC<SolarActivityChartProps> = ({ title, lang = 'en', onCurrentIndexChange }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const requestRef = useRef<number | null>(null);
  
  const labelsRef = useRef<string[]>([]);
  const valuesRef = useRef<number[]>([]);
  const isMockRef = useRef<boolean>(true);

  const [hasDangerValues, setHasDangerValues] = useState(false);

  useEffect(() => {
    // If any value is 9, we need to continuously redraw for the shimmer effect
    if (hasDangerValues) {
       const frame = () => {
          chartInstance.current?.draw();
          requestRef.current = requestAnimationFrame(frame);
       };
       requestRef.current = requestAnimationFrame(frame);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    }
    return () => {
       if (requestRef.current) {
         cancelAnimationFrame(requestRef.current);
         requestRef.current = null;
       }
    }
  }, [hasDangerValues]);
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
       setHasDangerValues(values.some(v => v > 7));

       // Colors
       const barColors = values.map((v: number) => {
          if (v > 8) return '#9933cc'; 
          if (v > 6) return '#9933cc'; 
          if (v > 4) return '#ff1744'; 
          if (v > 3) return '#ffd600'; 
          return '#44aa00';             
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
              id: 'daySeparators',
              afterDraw(chart) {
                const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
                const labels = (chart.data.labels || []) as string[];
                ctx.save();
                
                labels.forEach((label, i) => {
                   let dt = DateTime.fromSQL(label, { zone: 'utc' });
                   if (!dt.isValid) dt = DateTime.fromISO(label, { zone: 'utc' });
                   dt = dt.setZone('utc+5');
                   
                   let isDayStart = false;
                   if (i === 0) {
                     isDayStart = true;
                   } else {
                     let prevLabel = labels[i-1];
                     let prevDt = DateTime.fromSQL(prevLabel, { zone: 'utc' });
                     if (!prevDt.isValid) prevDt = DateTime.fromISO(prevLabel, { zone: 'utc' });
                     prevDt = prevDt.setZone('utc+5');
                     if (dt.day !== prevDt.day) isDayStart = true;
                   }

                   if (isDayStart) {
                      const xPos = x.getPixelForValue(i);
                      
                      // 1. Draw vertical line
                      ctx.beginPath();
                      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                      ctx.lineWidth = 1;
                      ctx.moveTo(xPos, top);
                      ctx.lineTo(xPos, bottom);
                      ctx.stroke();

                      // 2. Draw label
                      ctx.fillStyle = '#fff';
                      const fontSize = Math.max(11, Math.min(15, Math.floor(chart.width / 45)));
                      ctx.font = `${fontSize}px "Arial Narrow", Arial, sans-serif`;
                      ctx.textAlign = 'left';
                      ctx.textBaseline = 'top';
                      
                      const month = dt.toFormat('LLL', { locale: lang }).toLowerCase().replace('.', '');
                      const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
                      const text = `${capitalizedMonth}.${dt.day}`;
                      
                      ctx.fillText(text, xPos + 2, bottom + 4);
                   }
                });
                ctx.restore();
              }
            },
            {
               id: 'dangerPeakEffect',
               afterDatasetsDraw(chart) {
                   const { ctx } = chart;
                   const meta = chart.getDatasetMeta(0);
                   const time = Date.now() / 1000;
                   
                   meta.data.forEach((bar, index) => {
                       const val = (chart.data.datasets[0].data[index] as number);
                       if (val > 8) {
                           ctx.save();
                           const { x, y, base } = bar.getProps(['x', 'y', 'base'], true);
                           const width = (bar as any).width || 4;
                           
                           // 1. Pulsing Outer Glow
                           const pulse = Math.sin(time * 10) * 0.5 + 0.5;
                           ctx.shadowColor = '#fff';
                           ctx.shadowBlur = 5 + pulse * 10;
                           
                           // 2. Shimmering Overlay
                           const gradient = ctx.createLinearGradient(x - width, y, x + width, base);
                           const offset = (time * 1.5) % 3 - 1; // Faster shimmer
                           
                           gradient.addColorStop(Math.max(0, offset), 'rgba(255,255,255,0)');
                           gradient.addColorStop(Math.min(1, Math.max(0, offset + 0.2)), `rgba(255,255,255,${0.3 + pulse * 0.4})`);
                           gradient.addColorStop(Math.min(1, Math.max(0, offset + 0.4)), 'rgba(255,255,255,0)');
                           
                           ctx.fillStyle = gradient;
                           ctx.fillRect(x - width/2, y, width, base - y);
                           
                           ctx.restore();
                       }
                   });
               }
            },
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
                ctx.font = 'bold 8px "Arial Narrow", Arial, sans-serif';
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
              padding: { top: 20, bottom: 25, left: 10, right: 10 }
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
                        const label = items[0].label;
                        const dt = DateTime.fromSQL(label, { zone: 'utc' }).setZone('utc+5');
                        return dt.toFormat('dd.MM HH:mm');
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
                    display: false 
                },
                ticks: {
                    display: false
                }
              }
            }
          }
       });
  }, [lang, onCurrentIndexChange]);

  // Re-initialize chart when lang changes using cached data
  useEffect(() => {
    if (labelsRef.current.length > 0) {
      initChart(labelsRef.current, valuesRef.current, isMockRef.current);
    }
  }, [lang, initChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    // 1. Initialize Mock Chart immediately to show the "Scale"
    const now = DateTime.now().setZone('utc');
    const mockLabels: string[] = [];
    const mockValues: number[] = [];
    // Generate 56 points (7 days * 8 intervals) backwards
    for (let i = 55; i >= 0; i--) {
        const dt = now.minus({ hours: i * 3 });
        mockLabels.push(dt.toFormat('yyyy-MM-dd HH:00:00'));
        mockValues.push(0); // Empty values
    }
    
    labelsRef.current = mockLabels;
    valuesRef.current = mockValues;
    isMockRef.current = true;
    initChart(mockLabels, mockValues, true);

    const fetchData = async () => {
      try {
        const data = await solarDataService.getSolarData();
        if (isActive) {
          labelsRef.current = data.labels;
          valuesRef.current = data.values;
          isMockRef.current = false;
          
          if (onCurrentIndexChange && data.values.length > 0) {
            onCurrentIndexChange(data.values[data.values.length - 1]);
          }
          initChart(data.labels, data.values, false);
          setLoading(false);
          setError(false);
        }
      } catch (e) {
        if (isActive) {
          console.error('Failed to fetch solar data', e);
          setLoading(false);
          setError(true);
        }
      }
    };

    fetchData();

    return () => {
      isActive = false;
    };
  }, [initChart, onCurrentIndexChange]);

  return (
    <div className="w-full h-60 bg-black/40 rounded-xl border border-white/5 p-2 relative flex flex-col">
      {/* Title - Lifted z-index to be above loading overlay */}
      <div className="absolute top-2 left-3 flex items-center gap-2 z-30 pointer-events-none">
        <div className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-500' : 'bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]'}`} />
        <span className={`text-[9px] font-bold uppercase tracking-widest ${error ? 'text-red-500' : 'text-[#33b5e5]'}`}>
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
             <div className="text-center p-4">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <p className="text-[10px] text-slate-400 font-bold uppercase">Data Unavailable</p>
                <p className="text-[8px] text-slate-600 mt-1 mb-3">Check Connection</p>
                <button 
                  onClick={() => {
                    solarDataService.clearCache();
                    setLoading(true);
                    setError(false);
                    setTimer(0);
                    // The useEffect will trigger fetchData again because of the dependency on initChart/onCurrentIndexChange
                    // but we need a way to force it. Let's just reload the page or use a state to trigger.
                    window.location.reload();
                  }}
                  className="px-3 py-1 bg-[#33b5e5]/20 hover:bg-[#33b5e5]/40 text-[#33b5e5] text-[9px] font-bold uppercase rounded transition-colors"
                >
                  Retry
                </button>
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