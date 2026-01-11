
import React, { useRef, useEffect, useState } from 'react';

interface LevelCompleteScreenProps {
  time: number;
  deathCount?: number; 
  onRestart: () => void;
  onNext: () => void; 
  onBack?: () => void;
  isLastLevel: boolean;
  isNewRecord: boolean;
  bestTime: number | null; 
  targetTime: number;
  levelName: string;
  levelNumber: number;
  isMobile: boolean;
  allowReplay?: boolean;
  isLastLevelInRegion?: boolean;
  nextRegionName?: string;
  showRegionUnlockPopup?: boolean;
  onCloseRegionUnlockPopup?: () => void;
  isTutorial?: boolean;
  isFirstCompletion?: boolean;
}

// Hook for counting up numbers
const useCountUp = (end: number, duration: number = 1000) => {
    const [value, setValue] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        let animationId: number;

        const animate = (now: number) => {
            if (!startTime) startTime = now;
            const progress = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 4); // Ease out quart
            setValue(end * ease);
            if (progress < 1) animationId = requestAnimationFrame(animate);
        };

        animationId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationId);
    }, [end, duration]);

    return value;
};

export const LevelCompleteScreen: React.FC<LevelCompleteScreenProps> = ({ 
  time, deathCount = 0, onRestart, onNext, onBack, isNewRecord, bestTime, targetTime, levelName, allowReplay = true,
  showRegionUnlockPopup = false, nextRegionName, isFirstCompletion = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const displayTime = useCountUp(time, 1200);

  useEffect(() => {
      if (containerRef.current) {
          containerRef.current.style.opacity = '0';
          setTimeout(() => {
              if (containerRef.current) containerRef.current.style.opacity = '1';
          }, 50);
      }
  }, []);

  const isRunWR = time <= targetTime;
  const effectivePB = isNewRecord ? time : (bestTime ?? Infinity);

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center pointer-events-auto font-sans overflow-hidden">
        
        {/* BLURRED BACKGROUND OVERLAY */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
        
        {/* REGION UNLOCKED POPUP */}
        {showRegionUnlockPopup && (
            <div className="absolute inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-1 rounded-[2rem] shadow-2xl transform rotate-1">
                    <div className="bg-white rounded-[1.8rem] p-12 flex flex-col items-center gap-6 text-center border-4 border-black">
                        <div className="text-6xl animate-bounce">🔓</div>
                        <div className="text-purple-600 text-xl font-black tracking-widest uppercase">
                            REGION UNLOCKED!
                        </div>
                        {nextRegionName && (
                            <h1 className="text-8xl font-normal text-black drop-shadow-sm" style={{ fontFamily: "'Jersey 15', sans-serif" }}>
                                {nextRegionName}
                            </h1>
                        )}
                        <button 
                            onClick={onNext}
                            className="mt-8 px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black border-b-8 border-yellow-600 rounded-full font-bold text-2xl transition-all active:border-b-0 active:translate-y-2"
                            style={{ fontFamily: "'Jersey 15', sans-serif" }}
                        >
                            ENTER REGION &rarr;
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MAIN VICTORY CARD */}
        <div ref={containerRef} className="relative z-10 transition-opacity duration-700 w-full max-w-2xl px-4">
            
            <div className="bg-white rounded-[3rem] border-8 border-black shadow-[15px_15px_0px_rgba(0,0,0,0.25)] overflow-hidden transform -rotate-1">
                
                {/* HEADER BANNER */}
                <div className="bg-yellow-400 border-b-8 border-black p-6 flex flex-col items-center justify-center relative">
                    {/* Decor Stars */}
                    <div className="absolute top-4 left-4 text-white text-4xl animate-spin-slow">★</div>
                    <div className="absolute bottom-4 right-4 text-white text-4xl animate-spin-slow">★</div>
                    
                    <span className="text-xs font-black tracking-[0.4em] bg-black text-yellow-400 px-3 py-1 rounded-full mb-2">
                        LEVEL CLEARED!
                    </span>
                    <h2 className="text-6xl md:text-7xl text-black leading-none drop-shadow-[3px_3px_0_rgba(255,255,255,0.5)]" 
                        style={{ fontFamily: "'Jersey 15', sans-serif", textShadow: '4px 4px 0px #fff' }}>
                        {levelName}
                    </h2>
                </div>

                {/* CONTENT BODY */}
                <div className="p-8 flex flex-col items-center gap-6">
                    
                    {/* TIME DISPLAY */}
                    <div className="flex flex-col items-center">
                        <div className="flex items-baseline gap-2 relative">
                            <span className={`text-[8rem] leading-[0.8] tracking-tighter tabular-nums z-10
                                ${isRunWR ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-500 drop-shadow-[4px_4px_0_#000]' : 'text-black drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)]'}`}
                                style={{ fontFamily: "'Jersey 15', sans-serif" }}
                            >
                                {displayTime.toFixed(2)}
                            </span>
                            <span className="text-4xl font-black text-gray-400 rotate-12">s</span>
                            
                            {/* NEW RECORD STAMP */}
                            {isNewRecord && (
                                <div className="absolute -top-6 -right-12 bg-pink-500 text-white text-xs font-bold px-3 py-1 rotate-12 rounded-full border-2 border-white shadow-lg animate-pulse">
                                    NEW PB!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STATS GRID */}
                    <div className="w-full grid grid-cols-2 gap-4">
                        {/* DEATHS */}
                        <div className="bg-gray-100 rounded-2xl p-4 flex flex-col items-center border-4 border-gray-200">
                            <span className="text-[10px] font-black tracking-widest text-gray-400 mb-1">FAILS</span>
                            <span className="text-3xl font-black text-red-500 font-mono">
                                {deathCount}
                            </span>
                        </div>

                        {/* GOAL / WR */}
                        <div className={`rounded-2xl p-4 flex flex-col items-center border-4 ${isRunWR ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-100 border-gray-200'}`}>
                            <span className="text-[10px] font-black tracking-widest text-gray-400 mb-1">TARGET</span>
                            <div className="flex items-center gap-2">
                                <span className="text-3xl font-black text-gray-700 font-mono">
                                    {targetTime.toFixed(2)}
                                </span>
                                {isRunWR && <span className="text-2xl">🏆</span>}
                            </div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="flex gap-4 w-full mt-4">
                        {allowReplay && (
                            <button 
                                onClick={onRestart}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 border-b-8 border-gray-400 active:border-b-0 active:translate-y-2 rounded-2xl py-4 font-black text-2xl tracking-widest transition-all"
                                style={{ fontFamily: "'Jersey 15', sans-serif" }}
                            >
                                REPLAY
                            </button>
                        )}

                        <button 
                            onClick={onNext}
                            className="flex-[2] bg-cyan-400 hover:bg-cyan-300 text-black border-b-8 border-cyan-600 active:border-b-0 active:translate-y-2 rounded-2xl py-4 font-black text-4xl tracking-widest transition-all shadow-xl"
                            style={{ fontFamily: "'Jersey 15', sans-serif" }}
                        >
                            NEXT LEVEL
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
  );
};
