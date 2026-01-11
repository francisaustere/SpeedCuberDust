import React from 'react';

interface TutorialOverlayProps {
    text: string;
    subText?: string;
    visible?: boolean;
    colorClass?: string; // e.g. "text-cyan-400"
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ text, subText, visible = true, colorClass = "text-cyan-400" }) => {
    return (
        <div 
            className={`absolute top-[15%] md:top-[20%] left-0 w-full flex flex-col items-center justify-center transition-opacity duration-1000 pointer-events-none z-[15]
            ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
            <div className="flex flex-col items-center gap-4">
                <div className={`font-mono text-center px-4 animate-pulse text-3xl md:text-4xl tracking-[0.2em] font-bold ${colorClass}`} 
                     style={{ textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>
                    {text}
                </div>
                
                {subText && (
                    <div className="px-6 py-2 border-2 border-white/30 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-sm md:text-lg text-white/80 font-mono tracking-widest mt-2">
                        {subText}
                    </div>
                )}
            </div>
        </div>
    );
};