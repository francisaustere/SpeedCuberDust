
import React, { useState, useRef, useEffect } from 'react';
import { Level } from '../../types';

interface LevelsPanelProps {
  levels: Level[];
  currentLevelIdx: number;
  onSelectLevel: (idx: number) => void;
  onAddLevel: (region: string) => void;
  onSaveLevel: () => void;
  onSaveAll: () => void;
  onCopyGhosts: () => void; // New Prop
  onCopyDebugState?: () => void; // Debug Prop
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRenameLevel: (id: number, name: string) => void;
  onDeleteLevel: (id: number) => void;
}

export const LevelsPanel: React.FC<LevelsPanelProps> = ({
  levels,
  currentLevelIdx,
  onSelectLevel,
  onAddLevel,
  onSaveLevel,
  onSaveAll,
  onCopyGhosts,
  onCopyDebugState,
  onReorder,
  onRenameLevel,
  onDeleteLevel
}) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [activeTab, setActiveTab] = useState<'DEV' | 'PROD'>('PROD');
  const [activeRegion, setActiveRegion] = useState<string>("Tutorial");
  
  // Delete Confirmation State
  const [levelToDelete, setLevelToDelete] = useState<Level | null>(null);
  
  // Drag-Scroll State for Region Tabs
  const regionScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingRegion, setIsDraggingRegion] = useState(false);
  const [regionStartX, setRegionStartX] = useState(0);
  const [regionScrollLeft, setRegionScrollLeft] = useState(0);

  // Extract Regions based on activeTab (dynamically)
  // Map empty strings to "Drafts"
  const regions = Array.from(new Set(
      levels
        .filter(l => l.type === activeTab)
        .map(l => l.region || "Drafts")
  )) as string[];
  
  // Ensure we have at least one region if list is empty or undefined
  if (regions.length === 0) {
      regions.push(activeTab === 'PROD' ? "Tutorial" : "Drafts");
  }

  // Sort Regions Order
  const sortOrder = ["Tutorial", "Beginner", "Intermediate", "Drafts", "AI Generated"];
  regions.sort((a, b) => {
      const ia = sortOrder.indexOf(a);
      const ib = sortOrder.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
  });
  
  // Set default active region if current is invalid for the new tab
  useEffect(() => {
      if (!regions.includes(activeRegion) && regions.length > 0) {
          setActiveRegion(regions[0]);
      }
  }, [regions, activeRegion, activeTab]);

  // SYNC TAB/REGION WITH CURRENT LEVEL SELECTION
  useEffect(() => {
      const currentLevel = levels[currentLevelIdx];
      if (currentLevel) {
          const targetType = currentLevel.type;
          const targetRegion = currentLevel.region || "Drafts";
          
          // Only update if different to avoid side effects
          // Note: We intentionally omit activeTab/activeRegion from deps
          // to allow browsing other regions without snapping back
          setActiveTab(prev => prev !== targetType ? targetType : prev);
          setActiveRegion(prev => prev !== targetRegion ? targetRegion : prev);
      }
  }, [currentLevelIdx, levels]); 

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    // Disable dragging if editing
    if (editingId !== null) {
        e.preventDefault();
        return;
    }
    setDraggedIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', idx.toString());
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;
    
    onReorder(draggedIdx, targetIdx);
    setDraggedIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
  };

  const handleStartEdit = (lvl: Level) => {
      setEditingId(lvl.id);
      setEditName(lvl.name);
  };

  const handleSaveEdit = () => {
      if (editingId !== null && editName.trim() !== "") {
          onRenameLevel(editingId, editName);
      }
      setEditingId(null);
  };

  const handleCancelEdit = () => {
      setEditingId(null);
  };
  
  const handleSkipRegion = () => {
      const currentIdx = sortOrder.indexOf(activeRegion);
      if (currentIdx !== -1 && currentIdx < sortOrder.length - 1) {
          const nextRegion = sortOrder[currentIdx + 1];
          if (regions.includes(nextRegion)) {
              setActiveRegion(nextRegion);
          }
      }
  };

  // Filter levels based on TYPE and REGION
  // We attach originalIdx to allow onSelectLevel/onReorder to work with original array indices
  const filteredLevels = levels
    .map((l, originalIdx) => ({ ...l, originalIdx }))
    .filter(l => {
        if (l.type !== activeTab) return false;
        const regionName = l.region || "Drafts";
        return regionName === activeRegion;
    });
  
  // Region Tab Drag-Scroll Handlers
  const handleRegionMouseDown = (e: React.MouseEvent) => {
      if (!regionScrollRef.current) return;
      setIsDraggingRegion(true);
      setRegionStartX(e.pageX - regionScrollRef.current.offsetLeft);
      setRegionScrollLeft(regionScrollRef.current.scrollLeft);
  };
  
  const handleRegionMouseLeave = () => {
      setIsDraggingRegion(false);
  };
  
  const handleRegionMouseUp = () => {
      setIsDraggingRegion(false);
  };
  
  const handleRegionMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingRegion || !regionScrollRef.current) return;
      e.preventDefault();
      const x = e.pageX - regionScrollRef.current.offsetLeft;
      const walk = (x - regionStartX) * 2; // Scroll speed multiplier
      regionScrollRef.current.scrollLeft = regionScrollLeft - walk;
  };

  return (
    <div 
      className="absolute top-16 left-4 w-64 bg-black/80 border border-white/20 backdrop-blur-md flex flex-col max-h-[80vh] z-50 rounded shadow-2xl font-mono"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
    >
        {/* TABS (DEV / PROD) */}
        <div className="flex border-b border-white/10 shrink-0">
            <button 
                onClick={() => setActiveTab('DEV')}
                className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${activeTab === 'DEV' ? 'bg-cyan-900/50 text-cyan-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
                DEV
            </button>
            <div className="w-[1px] bg-white/10" />
            <button 
                onClick={() => setActiveTab('PROD')}
                className={`flex-1 py-3 text-xs font-bold tracking-wider transition-colors ${activeTab === 'PROD' ? 'bg-cyan-900/50 text-cyan-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
            >
                PROD
            </button>
        </div>

        {/* REGION SUB-TABS (NOW FOR BOTH DEV AND PROD) */}
        <div 
            ref={regionScrollRef}
            className="flex overflow-x-auto scrollbar-hide border-b border-white/10 bg-black/40 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleRegionMouseDown}
            onMouseLeave={handleRegionMouseLeave}
            onMouseUp={handleRegionMouseUp}
            onMouseMove={handleRegionMouseMove}
        >
            {regions.map((region) => (
                <button
                    key={region}
                    onClick={() => !isDraggingRegion && setActiveRegion(region)} // Prevent click if dragging
                    className={`whitespace-nowrap px-4 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors shrink-0 ${
                        activeRegion === region 
                        ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' 
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {region}
                </button>
            ))}
        </div>

      <div className="flex flex-col gap-1 p-4 overflow-y-auto scrollbar-hide flex-1 min-h-0 relative">
        {filteredLevels.map((lvl) => {
            const idx = lvl.originalIdx;
            return (
                <div
                    key={`${lvl.type}_${lvl.id}`}
                    draggable={editingId === null}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative flex items-center transition-all rounded overflow-hidden shrink-0 ${
                    draggedIdx === idx ? 'opacity-50 border-dashed border-2 border-white/30' : ''
                    }`}
                >
                    {/* Drag Handle */}
                    <div className="w-4 h-full absolute left-0 top-0 bottom-0 bg-white/5 flex items-center justify-center cursor-move opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <span className="text-[10px] text-white/40 leading-none">⋮</span>
                    </div>

                    {editingId === lvl.id ? (
                        <input 
                            type="text"
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                                e.stopPropagation(); // Stop keys reaching global listeners
                            }}
                            onMouseDown={(e) => e.stopPropagation()} // Stop Drag
                            className="w-full bg-cyan-900 text-white text-xs font-mono py-2 pl-6 pr-8 border border-cyan-500 outline-none"
                        />
                    ) : (
                        <div className="relative w-full flex">
                            <button
                                onClick={() => onSelectLevel(idx)}
                                onDoubleClick={() => handleStartEdit(lvl)}
                                className={`w-full text-left pl-6 pr-8 py-2 text-xs font-mono transition-colors truncate ${
                                    idx === currentLevelIdx 
                                    ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-700/50' 
                                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                                }`}
                            >
                                {lvl.id}. {lvl.name} <span className="text-white/30 text-[10px] ml-2">({lvl.platforms.length} items)</span>
                            </button>
                            
                            {/* DELETE BUTTON */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); setLevelToDelete(lvl); }}
                                className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center text-white/30 hover:text-red-500 hover:bg-red-500/10 transition-colors z-20"
                                title="Delete Level"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            );
        })}
        
        {filteredLevels.length === 0 && (
             <div className="text-center text-white/30 text-[10px] py-4">No levels in this region</div>
        )}
      </div>

      <div className="p-4 pt-0 flex flex-col gap-2 shrink-0">
        
        {/* LEVEL NAVIGATION */}
        <div className="flex gap-2 mb-2 border-t border-white/10 pt-2">
             <button 
                onClick={() => currentLevelIdx > 0 && onSelectLevel(currentLevelIdx - 1)}
                disabled={currentLevelIdx === 0}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white text-[10px] font-bold tracking-widest rounded transition-colors flex items-center justify-center gap-1 group"
                title="Previous Level"
             >
                 <span className="group-hover:-translate-x-0.5 transition-transform">◄</span> PREV
             </button>
             <button 
                onClick={() => currentLevelIdx < levels.length - 1 && onSelectLevel(currentLevelIdx + 1)}
                disabled={currentLevelIdx === levels.length - 1}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white text-[10px] font-bold tracking-widest rounded transition-colors flex items-center justify-center gap-1 group"
                title="Next Level"
             >
                 NEXT <span className="group-hover:translate-x-0.5 transition-transform">►</span>
             </button>
        </div>

        {/* TUTORIAL SKIP CTA */}
        {activeTab === 'PROD' && activeRegion === 'Tutorial' && (
             <button 
                onClick={handleSkipRegion}
                className="w-full py-2 mb-2 bg-cyan-700 hover:bg-cyan-600 text-white text-[10px] font-bold rounded shadow-[0_0_10px_rgba(0,255,255,0.2)]"
            >
                SKIP TUTORIAL
            </button>
        )}

        <button 
            onClick={() => onAddLevel(activeTab === 'DEV' ? '' : activeRegion)}
            className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded flex items-center justify-center gap-2"
        >
            <span>+</span> NEW LEVEL
        </button>

        <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
            <button 
                onClick={onSaveLevel}
                className="w-full py-2 border border-white/30 hover:bg-white/10 text-white/80 text-[10px] font-bold rounded"
            >
                COPY DISPLAYED LEVEL
            </button>
            <button 
                onClick={onSaveAll}
                className="w-full py-2 bg-cyan-900/50 hover:bg-cyan-800 text-white text-[10px] font-bold rounded"
            >
                COPY FULL LEVELS.TS
            </button>
            <button 
                onClick={onCopyGhosts}
                className="w-full py-2 bg-purple-900/50 hover:bg-purple-800 text-white text-[10px] font-bold rounded"
            >
                COPY BEST GHOSTS
            </button>
            {onCopyDebugState && (
                <button 
                    onClick={onCopyDebugState}
                    className="w-full py-2 bg-yellow-900/50 hover:bg-yellow-800 text-white text-[10px] font-bold rounded"
                >
                    COPY DEBUG STATE
                </button>
            )}
        </div>
      </div>
      
      {/* DELETE CONFIRMATION POPUP */}
      {levelToDelete && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-cyan-900 border border-cyan-500 rounded-lg p-4 w-full text-center shadow-2xl">
                  <h3 className="text-white font-bold text-sm mb-1">Delete Level?</h3>
                  <div className="text-cyan-300 text-xs font-mono mb-4 truncate">{levelToDelete.id}. {levelToDelete.name}</div>
                  
                  <div className="flex gap-2 justify-center">
                      <button 
                          onClick={() => setLevelToDelete(null)}
                          className="flex-1 py-2 bg-black/40 hover:bg-black/60 text-white/70 text-xs font-bold rounded transition-colors"
                      >
                          NO
                      </button>
                      <button 
                          onClick={() => { onDeleteLevel(levelToDelete.id); setLevelToDelete(null); }}
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors shadow-lg"
                      >
                          YES
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
