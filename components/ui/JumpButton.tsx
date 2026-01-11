
import React from 'react';

interface JumpButtonProps {
  onPress: (pressed: boolean) => void;
  visible?: boolean;
}

export const JumpButton: React.FC<JumpButtonProps> = ({ onPress, visible = true }) => {
  return (
    <div 
      className={`absolute bottom-8 right-8 w-24 h-24 rounded-full bg-white/10 border-2 border-white/20 touch-none flex items-center justify-center active:bg-white/30 transition-colors z-50 transition-opacity duration-1000 ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onTouchStart={(e) => { e.preventDefault(); onPress(true); }}
      onTouchEnd={(e) => { e.preventDefault(); onPress(false); }}
    >
      <div className="text-white font-bold text-lg select-none">JUMP</div>
    </div>
  );
};
