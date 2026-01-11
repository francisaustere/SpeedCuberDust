import React, { useRef, useEffect } from 'react';
import { GameStatus } from '../../types';
import { MenuButton } from '../ui/MenuButton';

interface HomeScreenProps {
  onStart?: () => void;
  isMobile: boolean;
  introPhase: 'LANDING' | 'LOBBY' | 'FALLING' | 'DESCENDING';
  startTime: number;
  duration: number; 
  hasInput: boolean; 
  tutorialPhase: 'MOVE' | 'WAIT_FOR_JUMP' | 'JUMP' | 'DONE' | 'STANDBY';
  gameState: GameStatus;
  
  onPlay?: () => void;
  onLevelSelect?: () => void;
  onSettings?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ 
    introPhase,
    startTime,
    duration,
    hasInput, 
    tutorialPhase,
    gameState,
    isMobile,
    onStart,
    onPlay,
    onLevelSelect,
    onSettings
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startTextRef = useRef<HTMLDivElement>(null);
  const tutorialMoveRef = useRef<HTMLDivElement>(null);
  const tutorialJumpRef = useRef<HTMLDivElement>(null);
  
  const mountTimeRef = useRef<number>(0);

  // Menu Visibility Logic
  const showMenu = (introPhase === 'LOBBY' && gameState !== 'PLAYING' && gameState !== 'LEVEL_SELECTION');

  useEffect(() => {
    if (mountTimeRef.current === 0) {
        mountTimeRef.current = performance.now();
    }
    
    let animationId: number;

    const animate = () => {
      const now = performance.now();
      const timeSinceMount = now - mountTimeRef.current;
      
      let opacity = 0;
      
      // LOGO VISIBILITY LOGIC
      const showLogo = (introPhase === 'LANDING' || introPhase === 'LOBBY') && gameState !== 'LEVEL_SELECTION';
      
      if (gameState === 'PLAYING' || introPhase === 'FALLING' || introPhase === 'DESCENDING') {
          opacity = 0;
      } 
      else if (!showLogo) {
          opacity = 0;
      } else {
          // Faster Fade In (0.5s instead of 2s)
          if (timeSinceMount < 200) {
              opacity = 0;
          } else if (timeSinceMount < 700) {
              opacity = (timeSinceMount - 200) / 500;
          } else {
              opacity = 1;
          }
      }
      
      if (containerRef.current) {
          containerRef.current.style.opacity = opacity.toFixed(3);
      }
      
      // "CLICK TO START" Text Logic (LANDING ONLY)
      if (startTextRef.current) {
          if (introPhase === 'LANDING' && gameState !== 'PLAYING') {
              if (timeSinceMount > 800) { 
                  startTextRef.current.style.opacity = '1';
              } else {
                  startTextRef.current.style.opacity = '0';
              }
          } else {
              startTextRef.current.style.opacity = '0';
          }
      }
      
      // TUTORIAL TEXT LOGIC (Only when playing)
      if (tutorialMoveRef.current) {
          tutorialMoveRef.current.style.opacity = (gameState === 'PLAYING' && tutorialPhase === 'MOVE') ? '1' : '0';
      }

      if (tutorialJumpRef.current) {
          tutorialJumpRef.current.style.opacity = (gameState === 'PLAYING' && tutorialPhase === 'JUMP') ? '1' : '0';
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [introPhase, startTime, duration, gameState, tutorialPhase]);

  const moveText = isMobile ? "JOYSTICK TO MOVE" : "ARROWS TO MOVE";
  const jumpText = isMobile ? "TAP TO JUMP" : "SPACE TO JUMP";
  
  const tutorialTextClass = isMobile 
      ? "text-xs md:text-3xl tracking-[0.15em] md:tracking-[0.2em] font-bold" 
      : "text-2xl tracking-[0.5em] font-bold";

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 select-none pointer-events-none">
        
        {/* LANDING CLICK OVERLAY - Only active during Landing phase */}
        {introPhase === 'LANDING' && (
            <button 
                onClick={() => onStart && onStart()}
                className="absolute inset-0 z-[100] w-full h-full cursor-pointer pointer-events-auto bg-transparent border-none outline-none"
                aria-label="Click to Start"
            />
        )}

        {/* MAIN CONTAINER: LOGO + MENU */}
        <div className="flex flex-col items-center justify-center w-full h-full p-4">
            
            {/* LOGO CONTAINER */}
            <div 
                ref={containerRef}
                className="flex flex-col items-center gap-0 w-full transition-transform duration-700 ease-out flex-shrink-0"
                style={{ opacity: 0, transformOrigin: 'center center', willChange: 'opacity' }} 
            >
                <h1 className="flex flex-col items-center text-white leading-[0.8] tracking-widest w-full text-center text-[18vw] landscape:text-[12vw] lg:text-[120px]" style={{ fontFamily: "'Jersey 15', sans-serif", fontWeight: 'normal' }}>
                    <span className="block text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">SPEED</span>
                    <span className="block text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">CUBER</span>
                </h1>
            </div>

            {/* CLICK TO START TEXT (LANDING) */}
            <div 
                ref={startTextRef}
                className="absolute bottom-[20%] landscape:bottom-[15%] transition-opacity duration-500 pointer-events-none"
                style={{ opacity: 0 }}
            >
                <div className="text-white/80 text-xl tracking-[0.3em] animate-pulse text-center px-4" style={{ fontFamily: "'Jersey 15', sans-serif" }}>
                    CLICK TO START
                </div>
            </div>
            
            {/* MENU BUTTONS (LOBBY) */}
            <div 
                className="flex flex-col landscape:flex-row items-center justify-center gap-6 landscape:gap-12 w-full mt-8 landscape:mt-4 flex-shrink-0"
                style={{ 
                    opacity: showMenu ? 1 : 0,
                    visibility: showMenu ? 'visible' : 'hidden',
                    transition: 'opacity 0.5s ease-out',
                    pointerEvents: showMenu ? 'auto' : 'none'
                }}
            >
                 <MenuButton 
                    text="PLAY" 
                    onClick={() => onPlay && onPlay()} 
                    className="w-72 landscape:w-56"
                    subText="CONTINUE JOURNEY"
                 />
                 <MenuButton 
                    text="LEVELS" 
                    onClick={() => onLevelSelect && onLevelSelect()} 
                    className="w-72 landscape:w-56"
                    subText="SELECT LEVEL"
                 />
            </div>
        </div>
        
        {/* TUTORIAL TEXT: MOVE */}
        <div 
            ref={tutorialMoveRef}
            className="absolute top-[15%] md:top-[20%] transition-opacity duration-1000 w-full"
            style={{ opacity: 0 }}
        >
            <div className="flex flex-col items-center gap-4 md:gap-8">
                <div className={`text-cyan-400 font-mono text-center px-4 animate-pulse ${tutorialTextClass}`}>
                    {moveText}
                </div>
            </div>
        </div>

        {/* TUTORIAL TEXT: JUMP */}
        <div 
            ref={tutorialJumpRef}
            className="absolute top-[15%] md:top-[20%] transition-opacity duration-1000 w-full"
            style={{ opacity: 0 }}
        >
            <div className="flex flex-col items-center gap-4 md:gap-8">
                <div className={`text-yellow-400 font-mono text-center px-4 animate-pulse ${tutorialTextClass}`}>
                    {jumpText}
                </div>
            </div>
        </div>
    </div>
  );
};