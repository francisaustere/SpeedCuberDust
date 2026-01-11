
import React from 'react';

interface SettingsMenuProps {
    volume: number;
    isMuted: boolean;
    showGhosts: boolean;
    onVolumeChange: (val: number) => void;
    onToggleMute: () => void;
    onToggleGhosts: () => void;
    onBack?: () => void; // New prop for back button
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
    volume, isMuted, showGhosts, onVolumeChange, onToggleMute, onToggleGhosts, onBack
}) => {
    return (
        <div className="fixed inset-0 z-[400] flex flex-col bg-black text-white pointer-events-auto animate-in fade-in duration-300 overflow-y-auto">
            {/* HEADER */}
            <div className="w-full p-8 border-b border-white/20 flex justify-between items-center">
                <h2 className="text-6xl font-bold tracking-widest" style={{ fontFamily: "'Jersey 15', sans-serif" }}>SETTINGS</h2>
                <button 
                    onClick={onBack}
                    className="w-16 h-16 flex items-center justify-center border border-white/20 hover:bg-white hover:text-black transition-all rounded-full"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col justify-center items-center gap-16 p-8 max-w-4xl mx-auto w-full">
                
                {/* AUDIO */}
                <div className="w-full flex flex-col gap-6">
                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-2xl font-bold tracking-widest font-mono">MASTER VOLUME</span>
                        <span className="text-xl font-mono text-cyan-400">{isMuted ? "MUTED" : `${Math.round(volume * 100)}%`}</span>
                    </div>
                    
                    <div className="flex items-center gap-8">
                        <button 
                            onClick={onToggleMute}
                            className={`w-20 h-20 border-2 flex items-center justify-center transition-all ${isMuted ? 'border-red-500 text-red-500 bg-red-900/10' : 'border-white text-white hover:bg-white/10'}`}
                        >
                            {isMuted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v6a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                            )}
                        </button>
                        
                        <div className="flex-1 h-12 relative flex items-center">
                            <input 
                                type="range" 
                                min="0" max="1" step="0.05"
                                value={volume}
                                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                                disabled={isMuted}
                                className={`w-full h-2 bg-white/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black ${isMuted ? 'opacity-30 pointer-events-none' : ''}`}
                            />
                        </div>
                    </div>
                </div>

                {/* GHOSTS */}
                <div className="w-full flex flex-col gap-6">
                    <div className="flex justify-between items-end border-b border-white/10 pb-2">
                        <span className="text-2xl font-bold tracking-widest font-mono">GHOST REPLAY</span>
                        <span className={`text-xl font-mono ${showGhosts ? "text-cyan-400" : "text-white/40"}`}>{showGhosts ? "ENABLED" : "DISABLED"}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <p className="text-white/50 font-mono max-w-md">
                            Display a transparent replay of your best run in the current level. Helpful for speedrunning.
                        </p>
                        <button 
                            onClick={onToggleGhosts}
                            className={`w-32 h-12 border-2 flex items-center justify-center transition-all font-bold tracking-widest ${showGhosts ? 'border-cyan-400 bg-cyan-900/20 text-cyan-400' : 'border-white/30 text-white/30 hover:border-white hover:text-white'}`}
                        >
                            {showGhosts ? "ON" : "OFF"}
                        </button>
                    </div>
                </div>

            </div>

            {/* FOOTER */}
            <div className="w-full p-8 border-t border-white/20 text-center">
                <button 
                    onClick={onBack}
                    className="px-24 py-4 bg-white text-black font-black tracking-[0.3em] hover:bg-cyan-400 transition-all duration-300 text-xl uppercase"
                >
                    CLOSE
                </button>
                <div className="text-xs text-white/20 mt-8 tracking-widest font-mono">
                    SPEEDCUBER v1.0.5 - ARCHITECTURE FINAL
                </div>
            </div>
        </div>
    );
};
