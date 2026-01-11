
import React, { useEffect, useRef, useState } from 'react';

interface JoystickProps {
  onMove: (x: number) => void;
  visible?: boolean;
}

export const Joystick: React.FC<JoystickProps> = ({ onMove, visible = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  // Reduced radius to fit smaller container (96px width / 2 = 48px center. 35px radius keeps it contained)
  const MAX_RADIUS = 35;

  const handleTouchStart = (e: React.TouchEvent) => {
    setActive(true);
    updatePosition(e.touches[0]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (active) updatePosition(e.touches[0]);
  };

  const handleTouchEnd = () => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0);
  };

  const updatePosition = (touch: React.Touch) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, MAX_RADIUS);
    
    const angle = Math.atan2(deltaY, deltaX);
    
    const x = Math.cos(angle) * clampedDistance;
    const y = Math.sin(angle) * clampedDistance;

    setPosition({ x, y });
    
    // Normalize X output from -1 to 1
    onMove(x / MAX_RADIUS);
  };

  return (
    <div 
      ref={containerRef}
      // Changed size from w-32 h-32 to w-24 h-24 to match JumpButton
      className={`absolute bottom-8 left-8 w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 touch-none flex items-center justify-center z-50 transition-opacity duration-1000 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="w-10 h-10 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.6)]"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: active ? 'none' : 'transform 0.1s ease-out'
        }}
      />
    </div>
  );
};
