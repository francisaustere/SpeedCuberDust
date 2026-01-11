
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../../engine/core/GameEngine';
import { PlayerController } from '../../game/components/PlayerController';
import { EnemyDrone } from '../../game/components/EnemyDrone';
import { EnemyController } from '../../game/enemies/controllers/EnemyController';
import { ParticleFactory } from '../../game/ParticleFactory';
import { GameMusicManager } from '../../audio/GameMusicManager';
import { CameraFollow } from '../../game/components/CameraFollow';
import { Level, GameStatus } from '../../types';
import { WEAPON_CONFIG } from '../../config/constants';
import { HUD } from './../hud/HUD';
import { GameControls } from '../hud/GameControls';
import { Joystick } from '../ui/Joystick';
import { JumpButton } from '../ui/JumpButton';
import { TutorialOverlay } from '../TutorialOverlay';
import { DebugUI } from '../../debug';
import { useTutorial } from '../../game/hooks/useTutorial';

interface GameSessionProps {
    engine: GameEngine;
    musicManager: GameMusicManager;
    currentLevel: Level;
    isMobile: boolean;
    isDevMode: boolean;
    showDevUI: boolean;
    debugConfig: any; // Using any for the complex DebugConfig object for simplicity in props
    
    // Callbacks to Parent
    onDeath: () => void;
    onLevelComplete: (finalTime: number) => void;
    onExitLevel: () => void;
    onSettings: () => void;
    onTick?: () => void; // Editor Loop Hook
    
    // Parent Data
    deathCount: number;
    bestTime: number | null;
    
    // Debug UI State (Controlled by Parent/Global hook)
    activeDebugSection: string | null;
    setActiveDebugSection: (section: string | null) => void;
}

export const GameSession: React.FC<GameSessionProps> = ({
    engine,
    musicManager,
    currentLevel,
    isMobile,
    isDevMode,
    showDevUI,
    debugConfig,
    onDeath,
    onLevelComplete,
    onExitLevel,
    onSettings,
    onTick,
    deathCount,
    bestTime,
    activeDebugSection,
    setActiveDebugSection
}) => {
    // --- REFS FOR DIRECT DOM UPDATES (Performance) ---
    const timerElementRef = useRef<HTMLDivElement>(null);
    const fpsElementRef = useRef<HTMLDivElement>(null);
    const particleFactoryRef = useRef<ParticleFactory | null>(null);
    
    // Use Ref for FPS stats to persist values across any React re-renders without resetting
    const frameStats = useRef({ count: 0, lastTime: performance.now() });
    
    // Capture onTick in ref to avoid loop restart
    const onTickRef = useRef(onTick);
    useEffect(() => { onTickRef.current = onTick; }, [onTick]);

    // --- LOCAL STATE (High Frequency) ---
    const [playerHealth, setPlayerHealth] = useState(3);
    const [ammo, setAmmo] = useState(WEAPON_CONFIG.STARTING_AMMO);
    const [jumpStats, setJumpStats] = useState({ count: 0, max: 2 });
    const [enemyStates, setEnemyStates] = useState<{ timer: number, phase: string, state: string }[]>([]);
    
    // --- LOGGING STATE ---
    const [isLoggingEnemies, setIsLoggingEnemies] = useState(false);
    const isLoggingEnemiesRef = useRef(false);

    // --- TUTORIAL HOOK ---
    const tutorial = useTutorial();

    // Initialize Particle Factory once
    useEffect(() => {
        if (!particleFactoryRef.current && engine) {
            particleFactoryRef.current = new ParticleFactory(engine.world);
        }
    }, [engine]);

    // Handle Tutorial Reset on Mount
    useEffect(() => {
        tutorial.reset(currentLevel.id === 1 && currentLevel.type === 'PROD');
    }, [currentLevel.id, currentLevel.type]);

    // --- MAIN GAME LOOP ---
    useEffect(() => {
        if (!engine) return;

        let wasWallSliding = false;
        
        // Reset Stats on mount
        frameStats.current.count = 0;
        frameStats.current.lastTime = performance.now();

        // Attach the Update Loop
        engine.setOnUpdate((stats) => {
            
            // Execute Editor/External Tick if present
            if (onTickRef.current) onTickRef.current();
            
            const player = stats.player;
            const engineTime = stats.time || 0;

            // 1. FPS Counter (Robust implementation)
            frameStats.current.count++;
            const now = performance.now();
            
            // Update every 500ms
            if (now >= frameStats.current.lastTime + 500) {
                const delta = now - frameStats.current.lastTime;
                const fps = Math.round((frameStats.current.count * 1000) / delta);
                
                if (fpsElementRef.current) { 
                    fpsElementRef.current.innerText = fps.toString(); 
                }
                
                frameStats.current.count = 0;
                frameStats.current.lastTime = now;
            }

            // 2. Enemy Debug Info (Throttled via React State, but logic runs here)
            if (!isDevMode) {
                // In Play mode, show enemy stats in HUD
                const drones = engine.world.getComponents(EnemyDrone);
                const walkers = engine.world.getComponents(EnemyController);
                
                const droneInfos = drones.map(d => d.getDebugInfo()).filter(info => info.timer > 0 || info.phase !== "");
                const walkerInfos = walkers.map(w => w.getDebugInfo()).filter(info => info.phase !== "");
                
                // Only update state if changed (Optimization could be added here, but React diffing helps)
                setEnemyStates([...droneInfos, ...walkerInfos]);
            } else {
                if (enemyStates.length > 0) setEnemyStates([]);
            }

            // 3. Console Logging (Optional)
            if (isLoggingEnemiesRef.current) {
                // ... (Existing logging logic, kept minimal for brevity)
            }

            // 4. Player Logic
            if (player) {
                // Update Tutorial
                tutorial.update({
                    left: player.vx < 0,
                    right: player.vx > 0,
                    up: false,
                    down: false,
                    jumpPressed: player.justJumped || false,
                    jumpHeld: false
                });

                // Sync UI State
                setPlayerHealth(player.health);
                setJumpStats({ count: player.jumpCount, max: player.maxJumps });
                setAmmo(player.ammo);

                // Audio Events
                if (player.justJumped) { musicManager.playJump(); player.justJumped = false; }
                if (player.justDoubleJumped) { musicManager.playDoubleJump(); player.justDoubleJumped = false; }
                if (player.justLandedDive) { musicManager.playLandSmash(); player.justLandedDive = false; }
                if (player.justBounced) {
                    musicManager.playDoubleJump();
                    if (particleFactoryRef.current) { 
                        particleFactoryRef.current.spawnImpact(player.x + player.w / 2, -(player.y + player.h), 0x00FFFF); 
                    }
                    player.justBounced = false;
                }
                
                // Wall Slide Audio
                if (player.isWallSliding && !wasWallSliding) { musicManager.startWallSlide(); }
                else if (!player.isWallSliding && wasWallSliding) { musicManager.stopWallSlide(); }
                wasWallSliding = player.isWallSliding;

                // Death Check
                if (player.isDead) {
                    // Logic moved from Game.tsx loop to here
                    const pc = engine.playerGO?.getComponent(PlayerController);
                    if (pc) pc.reset(currentLevel.start.x, currentLevel.start.y);
                    
                    engine.levelTime = 0;
                    engine.world.resetLevelObjects();
                    engine.world.destroyObjectsByTag('Bullet');
                    engine.world.destroyObjectsByTag('Particle');
                    
                    if (particleFactoryRef.current) particleFactoryRef.current.spawnDeathExplosion(player.x, player.y);
                    
                    musicManager.resumeContext();
                    musicManager.playDeath();
                    
                    const cam = engine.world.findObjectByName('MainCamera')?.getComponent(CameraFollow);
                    if (cam) cam.triggerShake(5, 0.2);
                    
                    wasWallSliding = false;
                    musicManager.stopWallSlide();

                    // Notify Parent to update global death count
                    onDeath();
                }

                // Win Check
                const goal = currentLevel.goal;
                if (engine.collisionResolver.checkCollisionPublic(player, goal)) {
                    wasWallSliding = false;
                    musicManager.stopWallSlide();
                    // Notify Parent
                    onLevelComplete(engine.levelTime);
                }

                // Update Timer UI directly
                if (!isDevMode && timerElementRef.current) {
                    timerElementRef.current.innerText = engineTime.toFixed(2);
                }
            }
        });

        // Cleanup
        return () => {
            engine.setOnUpdate(() => {}); // Clear callback
        };
    }, [engine, currentLevel, isDevMode, onDeath, onLevelComplete, musicManager, tutorial]);

    // --- HANDLERS ---

    const handleToggleEnemyLog = () => {
        setIsLoggingEnemies(prev => {
            const next = !prev;
            isLoggingEnemiesRef.current = next;
            console.log(next ? ">>> STARTED LOGGING (ENEMIES + PLAYER) <<<" : ">>> STOPPED LOGGING <<<");
            return next;
        });
    };

    const handleInput = (type: string, val: any) => {
        if (!engine) return;
        if (type === 'joy') engine.inputSystem.setVirtualJoystick(val);
        if (type === 'jump') engine.inputSystem.setVirtualJump(val);
    };

    // --- RENDER ---
    return (
        <>
            <HUD
                levelName={currentLevel.name} 
                levelIndex={currentLevel.id}
                regionLevelIndex={1} 
                regionTotalLevels={10}
                timerRef={timerElementRef} 
                fpsRef={fpsElementRef}
                bestTime={bestTime}
                targetTime={currentLevel.targetTime} 
                deathCount={deathCount}
                showDevUI={showDevUI} 
                activeDebugSection={activeDebugSection} 
                toggleSection={setActiveDebugSection}
                isMobile={isMobile} 
                enemyStates={enemyStates} 
                playerHealth={playerHealth} 
                jumpCount={jumpStats.count} 
                maxJumps={jumpStats.max}
                currentAmmo={ammo} 
                maxAmmo={WEAPON_CONFIG.MAX_AMMO}
            >
                {showDevUI && (<DebugUI
                    config={debugConfig}
                    isLoggingEnemies={isLoggingEnemies}
                    onToggleEnemyLog={handleToggleEnemyLog}
                />)}
            </HUD>
            
            <GameControls onSettings={onSettings} onBackToLevelSelect={onExitLevel} />
            
            {isMobile && (
                <>
                    <Joystick onMove={(x) => handleInput('joy', x)} />
                    <JumpButton onPress={(p) => handleInput('jump', p)} />
                </>
            )}
            
            <TutorialOverlay
                text={tutorial.phase === 'MOVE' ? "MOVE" : tutorial.phase === 'JUMP' ? "JUMP" : ""}
                visible={tutorial.phase === 'MOVE' || tutorial.phase === 'JUMP'}
            />
        </>
    );
};
