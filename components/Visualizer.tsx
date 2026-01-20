
import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  color: string;
  intensity: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ color, intensity }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bars = 64;
    const barWidth = canvas.width / bars;
    const dataArray = new Uint8Array(bars);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      for (let i = 0; i < bars; i++) {
        // Create synthetic visualization data based on intensity
        const value = Math.random() * 50 * intensity + (Math.sin(Date.now() / 200 + i) * 20);
        const barHeight = Math.max(10, value);
        
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, '#ffffff');

        ctx.fillStyle = gradient;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 2, barHeight);
      }
      
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [color, intensity]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={150} 
      className="w-full h-32 opacity-40 absolute bottom-0 pointer-events-none"
    />
  );
};

export default Visualizer;
