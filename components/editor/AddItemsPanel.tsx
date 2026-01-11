
import React, { useRef, useState } from 'react';

interface AddItemsPanelProps {
    onAddPlatform: (w: number, h: number, type?: 'static' | 'moving' | 'platform' | 'wall' | 'cube' | 'floor' | 'vanishing' | 'walker' | 'drone' | 'bouncy', extra?: any) => void;
}

export const AddItemsPanel: React.FC<AddItemsPanelProps> = ({ onAddPlatform }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [startScrollTop, setStartScrollTop] = useState(0);
    const [isDragScroll, setIsDragScroll] = useState(false);

    const [activeTab, setActiveTab] = useState<'BLOCKS' | 'ENEMIES'>('BLOCKS');

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (containerRef.current) {
            setIsDragging(true);
            setStartY(e.clientY);
            setStartScrollTop(containerRef.current.scrollTop);
            setIsDragScroll(false);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDragging || !containerRef.current) return;
        const deltaY = e.clientY - startY;
        if (Math.abs(deltaY) > 5) {
            setIsDragScroll(true);
        }
        containerRef.current.scrollTop = startScrollTop - deltaY;
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(false);
        setTimeout(() => setIsDragScroll(false), 50);
    };

    const handleItemClick = (w: number, h: number, type: any, extra: any) => {
        if (!isDragScroll) {
            onAddPlatform(w, h, type, extra);
        }
    };

    const blockSections = [
        {
            title: "BOUNCY",
            items: [
                { label: "STATIC", w: 100, h: 40, icon: "w-8 h-4 border-2 border-green-400 bg-pink-500", type: 'bouncy' },
            ]
        },
        {
            title: "PLATFORMS",
            items: [
                { label: "SMALL", w: 180, h: 20, icon: "w-8 h-1", type: 'platform' },
                { label: "MEDIUM", w: 360, h: 20, icon: "w-12 h-1", type: 'platform' },
                { label: "BIG", w: 720, h: 20, icon: "w-16 h-1", type: 'platform' },
                { label: "VANISH S", w: 120, h: 20, icon: "w-6 h-1 border-dashed border-orange-500", type: 'vanishing' },
                { label: "VANISH M", w: 240, h: 20, icon: "w-10 h-1 border-dashed border-orange-500", type: 'vanishing' },
                { label: "VANISH L", w: 480, h: 20, icon: "w-14 h-1 border-dashed border-orange-500", type: 'vanishing' },
            ]
        },
        {
            title: "FLOOR",
            items: [
                { label: "SMALL", w: 180, h: 40, icon: "w-8 h-2", type: 'floor' },
                { label: "MEDIUM", w: 360, h: 40, icon: "w-12 h-2", type: 'floor' },
                { label: "BIG", w: 720, h: 40, icon: "w-16 h-2", type: 'floor' },
            ]
        },
        {
            title: "WALLS",
            items: [
                { label: "SMALL", w: 20, h: 180, icon: "w-2 h-8", type: 'wall' },
                { label: "MEDIUM", w: 20, h: 360, icon: "w-2 h-12", type: 'wall' },
                { label: "BIG", w: 20, h: 720, icon: "w-2 h-16", type: 'wall' },
            ]
        },
        {
            title: "CUBES",
            items: [
                { label: "SMALL", w: 40, h: 40, icon: "w-4 h-4", type: 'cube' },
                { label: "MEDIUM", w: 120, h: 120, icon: "w-8 h-8", type: 'cube' },
                { label: "BIG", w: 180, h: 180, icon: "w-12 h-12", type: 'cube' },
            ]
        },
        {
            title: "MOVING",
            items: [
                { label: "SMALL", w: 40, h: 20, icon: "w-4 h-2 border-dashed border-purple-500", type: 'moving', extra: { moving: { duration: 2.0 } } },
                { label: "MEDIUM", w: 120, h: 20, icon: "w-8 h-2 border-dashed border-purple-500", type: 'moving', extra: { moving: { duration: 2.0 } } },
                { label: "BIG", w: 180, h: 20, icon: "w-12 h-2 border-dashed border-purple-500", type: 'moving', extra: { moving: { duration: 2.0 } } },
            ]
        },


    ];

    const enemySections = [
        {
            title: "ENEMIES",
            items: [
                { label: "WALKER", w: 40, h: 40, icon: "w-4 h-4 bg-red-600 border border-red-400", type: 'walker' },
                { label: "WALKER (SHOOTER)", w: 40, h: 40, icon: "w-4 h-4 bg-red-600 border border-yellow-400", type: 'walker', extra: { shooter: { type: 'aim', fireRate: 2.0, bulletSpeed: 6, bulletSize: 10 } } },
                { label: "DRONE", w: 30, h: 30, icon: "w-4 h-4 bg-yellow-500 border border-yellow-300 rounded-full", type: 'drone' },
                { label: "DRONE (SHOOTER)", w: 30, h: 30, icon: "w-4 h-4 bg-yellow-500 border border-red-500 rounded-full", type: 'drone', extra: { shooter: { type: 'aim', fireRate: 1.5, bulletSpeed: 5, bulletSize: 10 } } },
                { label: "NEW WALKER", w: 40, h: 40, icon: "w-4 h-4 bg-cyan-600 border border-cyan-400", type: 'new_walker' },
                { label: "JUMPER", w: 40, h: 40, icon: "w-4 h-4 bg-purple-600 border border-purple-400", type: 'jumper' }
            ]
        }
    ];

    const sections = activeTab === 'BLOCKS' ? blockSections : enemySections;

    return (
        <div
            className={`absolute top-16 right-4 w-52 bg-black/80 border border-white/20 backdrop-blur-md flex flex-col z-50 rounded shadow-2xl max-h-[80vh] font-mono`}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* TABS */}
            <div className="flex border-b border-white/10 shrink-0">
                <button
                    onClick={() => setActiveTab('BLOCKS')}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors ${activeTab === 'BLOCKS' ? 'bg-cyan-900/50 text-cyan-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    BLOCKS
                </button>
                <div className="w-[1px] bg-white/10" />
                <button
                    onClick={() => setActiveTab('ENEMIES')}
                    className={`flex-1 py-2 text-[10px] font-bold tracking-wider transition-colors ${activeTab === 'ENEMIES' ? 'bg-red-900/50 text-red-400' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                >
                    ENEMIES
                </button>
            </div>

            <div
                ref={containerRef}
                className={`flex-1 p-4 flex flex-col gap-4 overflow-y-auto scrollbar-hide select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={(e) => e.stopPropagation()}
            >
                {sections.map((section, sIdx) => (
                    <div key={sIdx} className="flex flex-col gap-2">
                        <h4 className="text-[10px] text-white/40 font-bold tracking-widest uppercase">{section.title}</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {section.items.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleItemClick(item.w, item.h, item.type as any, (item as any).extra)}
                                    className="w-full aspect-square bg-white/5 hover:bg-white/10 border border-dashed border-white/20 hover:border-cyan-500/50 rounded flex flex-col items-center justify-center gap-2 transition-all group p-2 relative overflow-hidden active:scale-95"
                                >

                                    <div className={`bg-white/20 group-hover:bg-cyan-400/50 rounded-sm ${item.icon}`}></div>

                                    <span className="text-[9px] text-white/50 group-hover:text-cyan-300 text-center leading-tight">{item.label}</span>
                                    {item.type === 'moving' && (
                                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                    )}
                                    {((item as any).extra?.isVanishing || item.type === 'vanishing') && (
                                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-orange-500 animate-ping" />
                                    )}



                                    {item.type === 'drone' && (
                                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 animate-bounce" />
                                    )}
                                    {item.type === 'bouncy' && (
                                        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-pink-500 animate-bounce" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};