
import React, { forwardRef, useRef, useEffect, useState } from 'react';
import { Platform } from '../../types';

interface EditorOverlayProps {
  onUpdateDuration?: (id: number, duration: number) => void;
  editingTextId?: number | null;
  onUpdateText?: (id: number, text: string) => void;
  selectedIds: Set<number>;
  platforms: Platform[];
}

export const EditorOverlay = forwardRef<HTMLCanvasElement, EditorOverlayProps>(({ 
  selectedIds, platforms, onUpdateDuration, editingTextId, onUpdateText
}, ref) => {
  
  const localRef = useRef<HTMLCanvasElement>(null);
  
  // Find selected moving platform
  const selectedMovingId = Array.from(selectedIds).find(id => {
      const p = platforms.find(pl => pl.id === id);
      return p && p.moving;
  });
  
  const selectedMovingPlatform = selectedMovingId ? platforms.find(p => p.id === selectedMovingId) : null;
  const [durationValue, setDurationValue] = useState<string>("");

  useEffect(() => {
      if (selectedMovingPlatform && selectedMovingPlatform.moving) {
          setDurationValue(selectedMovingPlatform.moving.duration.toString());
      }
  }, [selectedMovingPlatform]);
  
  // Combine refs (internal + external)
  useEffect(() => {
      if (ref) {
          if (typeof ref === 'function') ref(localRef.current);
          else ref.current = localRef.current;
      }
  }, [ref]);

  // Resize Observer to keep canvas resolution 1:1 with CSS pixels
  useEffect(() => {
      const handleResize = () => {
          if (localRef.current) {
              localRef.current.width = window.innerWidth;
              localRef.current.height = window.innerHeight;
          }
      };
      
      window.addEventListener('resize', handleResize);
      handleResize(); // Init
      
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
        {/* HIGH PERFORMANCE DRAWING LAYER */}
        <canvas 
            ref={localRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-40"
        />

        {/* DOM INPUT LAYER (Static controls) */}
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
            {/* Moving Platform Duration Input */}
            {selectedMovingPlatform && selectedMovingPlatform.moving && (
                <div 
                    className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 bg-black/80 p-2 rounded border border-purple-500/50 backdrop-blur-md shadow-xl"
                    onMouseDown={(e) => e.stopPropagation()} // Prevent deselection
                >
                    <span className="text-white text-[10px] font-bold tracking-widest uppercase text-purple-400">DURATION</span>
                    <input 
                        type="number"
                        step="0.1"
                        value={durationValue}
                        onChange={(e) => setDurationValue(e.target.value)}
                        onBlur={() => {
                            const val = parseFloat(durationValue);
                            if (!isNaN(val) && onUpdateDuration) {
                                onUpdateDuration(selectedMovingPlatform.id, val);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                const val = parseFloat(durationValue);
                                if (!isNaN(val) && onUpdateDuration) {
                                    onUpdateDuration(selectedMovingPlatform.id, val);
                                }
                                (e.target as HTMLInputElement).blur();
                            }
                            e.stopPropagation();
                        }}
                        className="w-16 bg-white/10 text-white text-xs p-1 rounded outline-none border border-white/20 focus:border-purple-400 text-center font-mono"
                    />
                    <span className="text-white/50 text-[10px]">sec</span>
                </div>
            )}

            {/* Text Input is special - it needs focus */}
            {editingTextId !== null && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto">
                    <input
                         type="text"
                         autoFocus
                         placeholder="Enter Text"
                         className="bg-black/80 text-white text-center font-bold border-2 border-cyan-400 outline-none p-2 rounded shadow-lg text-4xl font-mono"
                         onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                                 onUpdateText?.(editingTextId, (e.target as HTMLInputElement).value);
                             }
                             e.stopPropagation(); 
                         }}
                         onBlur={(e) => {
                             onUpdateText?.(editingTextId, e.target.value);
                         }}
                    />
                </div>
            )}
        </div>
    </>
  );
});