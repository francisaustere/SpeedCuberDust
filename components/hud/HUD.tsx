
import React from 'react';
import { Player } from '../../types';

interface HUDProps {
  levelName: string;
  levelIndex: number; // Global Index
  regionLevelIndex: number; // 1-based index within region
  regionTotalLevels: number;
  time?: number; // Optional now, used for static display if needed
  timerRef?: React.RefObject<HTMLDivElement>; // New Ref for direct updates
  fpsRef?: React.RefObject<HTMLDivElement>; // FPS Ref

  bestTime: number | null;
  targetTime?: number;
  deathCount?: number;
  showDevUI: boolean;
  activeDebugSection: string | null;
  toggleSection: (section: string) => void;
  children?: React.ReactNode; // For Debug UI
  showStats?: boolean;
  showTimer?: boolean;
  isMobile?: boolean;

  // Enemy Info: Array of { timer, phase, state }
  enemyStates?: { timer: number, phase: string, state: string }[];

  // Player Stats
  playerHealth?: number;
  currentAmmo?: number;
  maxAmmo?: number;
  jumpCount?: number;
  maxJumps?: number;

  // Kept for compatibility with Game.tsx passing them, but unused
  jumpsRef?: any;
  posRef?: any;
  cameraPosition?: { x: number, y: number, z?: number };
  playerPosition?: { x: number, y: number, z?: number };
  playerState?: Player;
}

export const HUD: React.FC<HUDProps> = ({
  time, timerRef, fpsRef, showDevUI, children, showStats = true, showTimer = true, playerHealth = 3, currentAmmo = 5, maxAmmo = 5, enemyStates = []
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 font-mono">

      {/* TOP CENTER - HEALTH & AMMO */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="relative w-8 h-8">
              {/* Empty Heart Background */}
              <span className="absolute inset-0 text-white/30 text-3xl">♥</span>
              {/* Filled Heart Foreground */}
              {i < playerHealth && (
                <span className="absolute inset-0 text-red-500 text-3xl drop-shadow-md animate-pulse">♥</span>
              )}
            </div>
          ))}
        </div>

        {/* AMMO COUNTER */}
        <div className="flex items-center gap-1 mt-1 text-cyan-400 font-bold drop-shadow-md text-lg">
          <span>🏹</span>
          <span>{currentAmmo} / {maxAmmo}</span>
        </div>
      </div>

      {/* TOP LEFT CONTROLS */}
      <div className="absolute top-4 left-4 flex gap-4 items-start pointer-events-auto">

        {/* FPS COUNTER */}
        {fpsRef && (
          <div className="h-12 flex flex-col items-center justify-center px-4 border border-white/20 bg-black/50 text-white min-w-[60px] shadow-sm backdrop-blur-sm">
            <span className="text-[10px] font-bold tracking-widest opacity-60">FPS</span>
            <div
              ref={fpsRef}
              className="text-2xl font-bold tracking-widest tabular-nums mt-0 leading-none drop-shadow-md"
              style={{ fontFamily: "'Jersey 15', sans-serif" }}
            >
              60
            </div>
          </div>
        )}

        {/* TIMER (Minimalist, Left Aligned) */}
        {showStats && showTimer && (
          <div className="h-12 flex items-center justify-center px-4 border border-white/20 bg-black/50 text-white min-w-[90px] shadow-sm backdrop-blur-sm">
            <div
              ref={timerRef}
              className="text-4xl font-bold tracking-widest tabular-nums mt-1 leading-none drop-shadow-md"
              style={{ fontFamily: "'Jersey 15', sans-serif" }}
            >
              {time ? time.toFixed(2) : "0.00"}
            </div>
          </div>
        )}
      </div>

      {/* DEBUG UI (Positioned below top-left controls) */}
      {showDevUI && (
        <div className="absolute top-24 left-4 pointer-events-auto flex flex-col gap-1 text-left">
          {children}
        </div>
      )}

      {/* TOP RIGHT - ENEMY STATES */}
      {!showDevUI && enemyStates && enemyStates.length > 0 && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
          <div className="text-[10px] font-bold text-red-500/80 tracking-tighter mb-1 uppercase bg-red-950/20 px-2 py-0.5 rounded border border-red-500/10 backdrop-blur-sm">
            Threats Detected: {enemyStates.length}
          </div>
          {enemyStates.slice(0, 5).map((enemy, i) => (
            <div key={i} className="flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-1.5 rounded-sm shadow-lg backdrop-blur-md animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-white/90 leading-none uppercase tracking-wide">
                  {enemy.state}
                </span>
                <span className={`text-[9px] font-bold leading-none mt-1 ${enemy.phase === 'COMBAT' || enemy.phase === 'FIRING' ? 'text-red-400' :
                    enemy.phase === 'ALERTED' ? 'text-yellow-400' : 'text-cyan-400'
                  }`}>
                  {enemy.phase}
                </span>
              </div>
              <div className={`w-1.5 h-6 rounded-full ${enemy.phase === 'COMBAT' || enemy.phase === 'FIRING' ? 'bg-red-500 animate-pulse' :
                  enemy.phase === 'ALERTED' ? 'bg-yellow-500' : 'bg-cyan-500 opacity-50'
                }`} />
            </div>
          ))}
          {enemyStates.length > 5 && (
            <div className="text-[8px] text-white/40 italic pr-2 font-bold tracking-widest mt-1">
              + {enemyStates.length - 5} MORE SIGNALS
            </div>
          )}
        </div>
      )}
    </div>
  );
};