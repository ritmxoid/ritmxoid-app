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

  useEffect(() => {
    const fetchData = async () => {
      const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
      try {
        const response = await fetch(url);
        const rawData = await response.json();
        const data = rawData.slice(1).slice(-56);

        const labels = data.map((d: any) => d[0]);
        const values = data.map((d: any) => parseFloat(d[1]));

        // Notify parent about current index (last value)
        if (values.length > 0 && onCurrentIndexChange) {
            onCurrentIndexChange(values[values.length - 1]);
        }

        const barColors = values.map((v: number) => {
          if (v > 9) return '#000000';
          if (v >= 7) return '#9933cc'; // Purple (Matches ANALYTICAL)
          if (v >= 5) return '#cc0000'; // Red (Matches PHYSICAL)
          if (v >= 4) return '#ffd600'; // Yellow (Matches MOTOR)
          return '#33b5e5';             // Holo Blue (Matches SENSORY)
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
                  callbacks: { title: (items) => `Time (UTC): ${items[0].label}` }
                }
              },
              scales: {
                y: {
                  position: 'right', // Moved scale to the right
                  min: 0,
                  max: 10, // Ensure full range up to 10
                  ticks: { 
                    stepSize: 1, // Show every integer step
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
                      const dateObj = new Date(labels[index] + ' UTC');
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
                    const date = new Date(l + ' UTC');
                    if (date.getUTCHours() === 0 && i > 0) {
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
                  ctx.fillStyle = '#33b5e5';
                  ctx.font = 'bold 9px Roboto';
                  ctx.textAlign = 'center';
                  ctx.fillText('NOW', xPos, yPos - 12);
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
        console.error("K-Index fetch error:", error);
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
        <div className="w-1.5 h-1.5 rounded-full bg-[#33b5e5] shadow-[0_0_5px_#33b5e5]" />
        <span className="text-[9px] font-black uppercase tracking-widest text-[#33b5e5]">{title}</span>
      </div>
      <canvas ref={chartRef} />
    </div>
  );
};

export default SolarActivityChart;