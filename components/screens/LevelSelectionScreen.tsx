
import React, { useState, useEffect } from 'react';
import { Level } from '../../types';

interface LevelSelectionScreenProps {
  levels: Level[];
  onSelectLevel: (index: number) => void;
  onBack: () => void;
  bestTimes: Record<string, number>; // Full dictionary of best times
  initialRegion?: string; // New prop to pre-select a region
}

export const LevelSelectionScreen: React.FC<LevelSelectionScreenProps> = ({ 
  levels, onSelectLevel, onBack, bestTimes, initialRegion 
}) => {
  // Ordered List of Regions (Tutorial removed from selectable tabs)
  const REGION_ORDER = ["Beginner", "Intermediate"];
  
  // State for unlocked regions logic
  // Beginner is the entry point for selection, so it is always unlocked here
  const [unlockedRegions, setUnlockedRegions] = useState<Set<string>>(new Set(["Beginner"]));
  
  // Initialize with initialRegion if provided and valid, otherwise "Beginner"
  const [activeRegion, setActiveRegion] = useState<string>(() => {
      if (initialRegion && REGION_ORDER.includes(initialRegion)) return initialRegion;
      return "Beginner";
  });
  
  // Compute unlocked status on mount/update
  useEffect(() => {
      const unlocked = new Set<string>(["Beginner"]); 
      
      for (let i = 0; i < REGION_ORDER.length - 1; i++) {
          const currentRegionName = REGION_ORDER[i];
          const nextRegionName = REGION_ORDER[i+1];
          
          // Get all PROD levels in current region
          const regionLevels = levels.filter(l => l.type === 'PROD' && l.region === currentRegionName);
          
          if (regionLevels.length === 0) {
              unlocked.add(nextRegionName); // Empty region? Auto unlock next (fallback)
              continue;
          }
          
          // Check if ALL levels in the region are completed
          const allCompleted = regionLevels.every(l => {
              const key = `${l.type}_${l.id}`;
              return bestTimes[key] !== undefined;
          });
          
          if (allCompleted) {
              unlocked.add(nextRegionName);
          } else {
              break; // Stop unlocking chain if one fails
          }
      }
      
      setUnlockedRegions(unlocked);
      
  }, [levels, bestTimes]);

  const filteredLevels = levels
    .map((l, idx) => ({ ...l, originalIdx: idx }))
    .filter(l => l.type === 'PROD' && (l.region || "Drafts") === activeRegion)
    .sort((a, b) => a.id - b.id); // Sort by ID to determine order

  const getLockInfo = (regionName: string) => {
      if (unlockedRegions.has(regionName)) return null;
      
      const prevIndex = REGION_ORDER.indexOf(regionName) - 1;
      if (prevIndex < 0) return null;
      
      const prevRegion = REGION_ORDER[prevIndex];
      const prevLevels = levels.filter(l => l.type === 'PROD' && l.region === prevRegion);
      const needed = prevLevels.length;
      
      let current = 0;
      prevLevels.forEach(l => {
          if (bestTimes[`${l.type}_${l.id}`] !== undefined) current++;
      });
      
      return { current, needed, prevRegion };
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center z-50 pt-12 pb-8 pointer-events-auto overflow-hidden">
        
        {/* BACKGROUND */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-[-1]"></div>
        <div className="absolute inset-0 opacity-20 pointer-events-none z-[-1]" 
             style={{ backgroundImage: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '30px 30px' }}>
        </div>

        {/* HEADER */}
        <div className="flex flex-col items-center mb-8 gap-2 shrink-0 w-full max-w-4xl relative">
            <button 
                onClick={onBack}
                className="absolute left-4 top-2 w-12 h-12 bg-white rounded-full border-4 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.3)] hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center text-black font-bold text-xl z-20"
            >
                ←
            </button>
            
            <h2 className="text-6xl md:text-8xl text-white tracking-widest relative transform -rotate-2 drop-shadow-[6px_6px_0px_rgba(0,0,0,0.5)]" 
                style={{ fontFamily: "'Jersey 15', sans-serif", textShadow: '4px 4px 0px #000' }}>
                SELECT LEVEL
            </h2>
        </div>

        {/* REGION TABS (PILL SHAPE) */}
        <div className="flex flex-wrap justify-center gap-4 mb-8 w-full max-w-5xl px-4 shrink-0">
            {REGION_ORDER.map((region) => {
                const isActive = activeRegion === region;
                const isLocked = !unlockedRegions.has(region);
                const lockInfo = isLocked ? getLockInfo(region) : null;
                
                return (
                    <button
                        key={region}
                        onClick={() => !isLocked && setActiveRegion(region)}
                        disabled={isLocked}
                        className={`relative px-8 py-3 rounded-full font-bold tracking-widest uppercase transition-all duration-200 border-4 border-black
                            ${isActive 
                                ? 'bg-yellow-400 text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] -translate-y-1' 
                                : isLocked 
                                    ? 'bg-gray-800 text-gray-500 border-gray-600 cursor-not-allowed' 
                                    : 'bg-white text-black hover:bg-gray-100 hover:-translate-y-1 hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                            }
                        `}
                    >
                        <div className="flex items-center justify-center gap-2" style={{ fontFamily: "'Jersey 15', sans-serif", fontSize: '1.5rem' }}>
                            {isLocked && <span>🔒</span>}
                            {region}
                        </div>
                        
                        {/* Lock Tooltip */}
                        {isLocked && lockInfo && (
                            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-max bg-black text-white text-[10px] font-mono p-2 rounded shadow-lg z-50 pointer-events-none">
                                NEED {Math.max(0, lockInfo.needed - lockInfo.current)} MORE IN {lockInfo.prevRegion.toUpperCase()}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>

        {/* LEVELS GRID */}
        <div className="flex-1 w-full max-w-6xl overflow-y-auto scrollbar-hide px-4 pb-20">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
                {filteredLevels.map((lvl, index) => {
                    const bestTime = bestTimes[`${lvl.type}_${lvl.id}`];
                    const isCompleted = bestTime !== undefined;
                    const targetTime = lvl.targetTime || 9999;
                    const isGold = isCompleted && bestTime <= targetTime;
                    
                    // Locking Logic
                    let isLevelLocked = false;
                    if (index > 0) {
                        const prevLvl = filteredLevels[index - 1];
                        const isPrevCompleted = bestTimes[`${prevLvl.type}_${prevLvl.id}`] !== undefined;
                        if (!isPrevCompleted) isLevelLocked = true;
                    }

                    // Card Styles
                    let cardBg = "bg-white";
                    let cardBorder = "border-black";
                    let rotation = index % 2 === 0 ? "rotate-1" : "-rotate-1";
                    
                    if (isLevelLocked) {
                        cardBg = "bg-gray-300";
                        cardBorder = "border-gray-500";
                    } else if (isGold) {
                        cardBg = "bg-yellow-300";
                    } else if (isCompleted) {
                        cardBg = "bg-cyan-200";
                    }

                    return (
                        <button
                            key={lvl.id}
                            onClick={() => !isLevelLocked && onSelectLevel(lvl.originalIdx)}
                            disabled={isLevelLocked}
                            className={`relative group flex flex-col p-4 border-4 rounded-3xl transition-all duration-200 min-h-[160px]
                                ${cardBg} ${cardBorder} shadow-[6px_6px_0px_rgba(0,0,0,0.2)]
                                ${!isLevelLocked ? 'hover:scale-105 hover:z-10 hover:shadow-[8px_8px_0px_rgba(0,0,0,0.3)] cursor-pointer ' + rotation : 'cursor-not-allowed opacity-80'}
                            `}
                        >
                            {isLevelLocked ? (
                                <div className="flex flex-col items-center justify-center h-full w-full gap-2 opacity-50">
                                    <div className="text-4xl">🔒</div>
                                    <span className="font-bold text-black/50 font-mono tracking-widest">LOCKED</span>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full w-full">
                                    {/* Header Row */}
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="bg-black text-white px-2 py-1 rounded font-mono text-xs font-bold shadow-sm">
                                            LVL {lvl.id}
                                        </div>
                                        
                                        {isGold && (
                                            <div className="absolute -top-3 -right-3 text-3xl animate-bounce drop-shadow-md">
                                                ⭐
                                            </div>
                                        )}
                                        {isCompleted && !isGold && (
                                            <div className="bg-cyan-500 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-sm border-2 border-white">
                                                DONE
                                            </div>
                                        )}
                                        {!isCompleted && (
                                            <div className="bg-pink-500 text-white px-2 py-1 rounded-full text-[10px] font-bold shadow-sm animate-pulse border-2 border-white">
                                                NEW!
                                            </div>
                                        )}
                                    </div>

                                    {/* Level Name */}
                                    <div className="flex-1 flex items-center justify-center">
                                        <h3 className="text-3xl text-center leading-none text-black drop-shadow-sm" 
                                            style={{ fontFamily: "'Jersey 15', sans-serif" }}>
                                            {lvl.name}
                                        </h3>
                                    </div>
                                    
                                    {/* Footer Stats */}
                                    <div className="mt-3 bg-black/10 rounded-lg p-2 flex justify-between items-center text-xs font-mono font-bold text-black/70">
                                        <div className="flex flex-col items-start">
                                            <span className="text-[9px] uppercase opacity-60">BEST</span>
                                            <span className={isGold ? "text-red-600" : ""}>{isCompleted ? bestTime.toFixed(2) : "--.--"}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[9px] uppercase opacity-60">GOAL</span>
                                            <span>{targetTime.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
  );
};
