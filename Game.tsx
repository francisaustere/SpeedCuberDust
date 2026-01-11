
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GameEngine } from './engine/core/GameEngine';
import { GameObject } from './engine/core/GameObject';
import { MeshRenderer } from './engine/components/MeshRenderer';
import { PlayerController } from './game/components/PlayerController';
import { PlayerVisuals } from './game/components/PlayerVisuals';
import { CameraFollow } from './game/components/CameraFollow';
import { GameMusicManager, MusicState } from './audio/GameMusicManager';
import { GameStatus, Camera } from './types';
import { WEAPON_CONFIG } from './config/constants';
import { useDebugConfig } from './debug';
import {
    HomeScreen, LevelCompleteScreen, LevelSelectionScreen, SettingsMenu, GameSession
} from './components';
import { LevelsPanel, AddItemsPanel, EditorOverlay, EditorInputLayer } from './components/editor';
import { useEditor } from './game/hooks/useEditor';
import { useLevelManager, cleanLevel } from './game/hooks/useLevelManager';

interface IntroState {
    phase: 'LANDING' | 'LOBBY' | 'FALLING' | 'DESCENDING';
    startTime: number;
    duration: number;
}

export default function Game() {
    const debugConfig = useDebugConfig();
    const debugConfigRef = useRef(debugConfig);
    useEffect(() => { debugConfigRef.current = debugConfig; }, [debugConfig]);

    const { isDevMode, setIsDevMode, showDevUI, setShowDevUI, activeDebugSection, setActiveDebugSection } = debugConfig;

    // --- LEVEL MANAGER HOOK ---
    const levelManager = useLevelManager();
    const { 
        currentLevel, 
        currentLevelIdx, 
        activeLevels, 
        bestTimes, 
        selectLevel, 
        nextLevel, 
        saveTime, 
        updateCurrentLevel 
    } = levelManager;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const editorCanvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const musicRef = useRef<GameMusicManager>(null!);
    if (!musicRef.current) {
        musicRef.current = new GameMusicManager();
    }

    const editorCameraRef = useRef<Camera>({ x: 0, y: 0, w: 1000, h: 800, z: 1000 });

    const [gameState, setGameState] = useState<GameStatus>('INTRO');
    const [intro, setIntro] = useState<IntroState>({ phase: 'LANDING', startTime: 0, duration: 2000 });
    const [isMobile, setIsMobile] = useState(false);

    // Persisted Session State (Passed to GameSession)
    const [finalTime, setFinalTime] = useState(0);
    const [isNewRecord, setIsNewRecord] = useState(false);
    const [deathCount, setDeathCount] = useState(0);

    const [showSettings, setShowSettings] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [masterVolume, setMasterVolume] = useState(1.0);
    const [showGhosts, setShowGhosts] = useState(true);

    const gameWorldRef = useRef<any>(null);
    const rendererRef = useRef<any>(null);
    const editorSysRef = useRef<any>(null);

    const editor = useEditor({
        isDevMode,
        currentLevel,
        setCurrentLevel: updateCurrentLevel,
        gameWorldRef,
        rendererRef,
        editorSystemRef: editorSysRef,
        configs: {
            visual: debugConfig.visualConfig,
            enemy: debugConfig.enemyConfig,
            vanishing: debugConfig.vanishingConfig
        }
    });

    useEffect(() => {
        if (!canvasRef.current) return;
        const checkMobile = () => {
            const isMob = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 800;
            setIsMobile(isMob);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        const engine = new GameEngine(canvasRef.current, debugConfigRef);
        engineRef.current = engine;
        gameWorldRef.current = engine.world;
        rendererRef.current = engine.renderer;
        editorSysRef.current = engine.editorSystem;
        
        const playerGO = new GameObject(new THREE.Group(), 'Player', 'Player');
        playerGO.addComponent(MeshRenderer, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, metalness: 0.1 }));
        playerGO.addComponent(PlayerController);
        playerGO.addComponent(PlayerVisuals);
        engine.world.addGameObject(playerGO);
        engine.playerGO = playerGO;
        const cameraGO = new GameObject(new THREE.Group(), 'MainCamera', 'Camera');
        cameraGO.addComponent(CameraFollow, engine.renderer.cameraInfo, engine.world);
        engine.world.addGameObject(cameraGO);
        
        const handleKeys = (e: KeyboardEvent) => {
            if (e.code === 'KeyE') {
                setIsDevMode(prev => {
                    const next = !prev;
                    if (next && engineRef.current) {
                        const gameCam = engineRef.current.renderer.cameraInfo;
                        editorCameraRef.current.x = gameCam.x;
                        editorCameraRef.current.y = gameCam.y;
                        editorCameraRef.current.w = gameCam.w;
                        editorCameraRef.current.h = gameCam.h;
                        engineRef.current.overrideCamera = editorCameraRef.current;
                        engineRef.current.world.resetLevelObjects();
                    }
                    return next;
                });
            }
            if (e.code === 'KeyT') setShowDevUI(prev => !prev);
        };
        const handleWheel = (e: WheelEvent) => {
            if (debugConfigRef.current.isDevMode) {
                const camInfo = editorCameraRef.current;
                const aspect = camInfo.w / camInfo.h;
                const zoomAmount = e.deltaY * 1.5;
                const minW = 400; const maxW = 10000;
                const oldW = camInfo.w;
                let newW = oldW + zoomAmount;
                newW = Math.max(minW, Math.min(maxW, newW));
                const newH = newW / aspect;
                const mouseXRatio = e.clientX / window.innerWidth;
                const mouseYRatio = e.clientY / window.innerHeight;
                const dW = oldW - newW;
                camInfo.w = newW;
                camInfo.h = newH;
                camInfo.x += dW * mouseXRatio;
                camInfo.y += (oldW / aspect - newH) * mouseYRatio;
            }
        };
        window.addEventListener('keydown', handleKeys);
        window.addEventListener('wheel', handleWheel, { passive: true });
        const onResize = () => engine.renderer.resize();
        window.addEventListener('resize', onResize);
        
        // NOTE: We do NOT start the engine here anymore. 
        // It is controlled by the gameState effect below to optimize resources in menus.
        
        return () => {
            engine.dispose();
            window.removeEventListener('keydown', handleKeys);
            window.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('resize', checkMobile);
            musicRef.current.dispose();
        };
    }, []);

    // --- ENGINE LOOP CONTROL ---
    // Start/Stop engine based on Game State to save battery/GPU in menus
    useEffect(() => {
        if (!engineRef.current) return;
        const engine = engineRef.current;

        const shouldRun = 
            gameState === 'INTRO' || // FIXED: Run during intro for background visuals
            gameState === 'PLAYING' || 
            gameState === 'LEVEL_COMPLETE' || 
            gameState === 'LEVEL_TRANSITION' ||
            isDevMode; // Always run in dev mode

        if (shouldRun) {
            engine.start();
            console.log("🟢 Engine STARTED");
        } else {
            engine.stop();
            console.log("🔴 Engine STOPPED");
        }
    }, [gameState, isDevMode]);

    useEffect(() => {
        if (engineRef.current) {
            const configs = {
                visual: debugConfig.visualConfig,
                enemy: debugConfig.enemyConfig,
                vanishing: debugConfig.vanishingConfig
            };
            engineRef.current.loadLevel(currentLevel, configs);
            
            // Reset gameplay state
            setDeathCount(0);
            
            if (engineRef.current) {
                engineRef.current.ghostSystem.startLevel(`${currentLevel.type}_${currentLevel.id}`, !!bestTimes[`${currentLevel.type}_${currentLevel.id}`]);
            }
        }
    }, [currentLevel]); 

    useEffect(() => {
        if (!engineRef.current) return;
        const engine = engineRef.current;
        engine.setGameStatus(gameState);
        if (engine.playerGO && engine.playerGO.object3D) {
            const isHidden = (gameState === 'INTRO' && intro.phase === 'LANDING') ||
                gameState === 'LEVEL_SELECTION';
            engine.playerGO.object3D.visible = !isHidden;
        }
        if (!isDevMode) {
            engine.overrideCamera = null;
        } else {
            engine.overrideCamera = editorCameraRef.current;
        }
    }, [gameState, intro.phase, isDevMode]);

    // EDITOR RENDER LOGIC (Passed to GameSession)
    const handleGameTick = useCallback(() => {
        if (isDevMode && editorCanvasRef.current && engineRef.current) {
             const engine = engineRef.current;
             const mouse = engine.inputSystem.getMousePosition();
             const { shift, alt } = editor.modifiers.current;
             const { w, h } = engine.renderer.getDimensions();
             const activeCamera = editorCameraRef.current;
             engine.overrideCamera = activeCamera;
             const res = engine.editorSystem.handleMouseMove(mouse.x, mouse.y, activeCamera, shift, alt, w, h, currentLevel);
             if (res.cameraChange) { activeCamera.x = res.cameraChange.x; activeCamera.y = res.cameraChange.y; }

             engine.editorSystem.render(
                 editorCanvasRef.current,
                 currentLevel,
                 activeCamera,
                 debugConfigRef.current.drawConfig.showPlatformIds
             );
        }
    }, [isDevMode, currentLevel, editor]);

    const handlePlayerDeath = () => {
        setDeathCount(prev => prev + 1);
    };

    const handleLevelComplete = (runTime: number) => {
        setFinalTime(runTime);
        setGameState('LEVEL_COMPLETE');
        musicRef.current.setState(MusicState.LEVEL_COMPLETE);
        musicRef.current.playVictory();
        if (engineRef.current) {
            engineRef.current.ghostSystem.stopRecording(true);
            engineRef.current.ghostSystem.pruneNonBestGhosts();
        }
        
        const isPB = saveTime(runTime);
        setIsNewRecord(isPB); 
    };

    const handleNextLevel = () => {
        const hasNext = nextLevel();
        if (hasNext) {
            setGameState('PLAYING');
            setFinalTime(0);
            setIsNewRecord(false);
        } else {
            setGameState('LEVEL_SELECTION');
        }
    };

    const onStartClick = () => {
        setIntro({ ...intro, phase: 'LOBBY' });
        musicRef.current.resumeContext();
        musicRef.current.start();
    };

    const onLevelSelect = (idx: number) => {
        selectLevel(idx);
        setGameState('PLAYING');
        setFinalTime(0);
        setIsNewRecord(false);
        setDeathCount(0);
    };

    const handleUpdateDuration = (id: number, duration: number) => {
        updateCurrentLevel(prev => ({
            ...prev,
            platforms: prev.platforms.map(p => {
                if (p.id === id && p.moving) {
                    return { ...p, moving: { ...p.moving, duration } };
                }
                return p;
            })
        }));
    };

    const handleSaveLevel = () => {
        const clean = cleanLevel(currentLevel);
        navigator.clipboard.writeText(JSON.stringify(clean, null, 2)).then(() => alert("Level copied!"));
    };

    const handleSaveAll = () => {
        const data = levelManager.getCleanLevelsData();
        navigator.clipboard.writeText(data).then(() => alert("Full Data copied!"));
    };

    const handleCopyDebugState = () => {
        if (!engineRef.current) return;
        alert("Debug Info Copied (stub)");
    };

    return (
        <div className="w-full h-full bg-black relative overflow-hidden select-none">
            <canvas ref={canvasRef} className="block w-full h-full outline-none" />
            
            {gameState === 'INTRO' && (
                <HomeScreen
                    introPhase={intro.phase} startTime={intro.startTime} duration={intro.duration}
                    hasInput={false} tutorialPhase={'STANDBY'} gameState={gameState} isMobile={isMobile}
                    onStart={onStartClick} onPlay={() => setGameState('LEVEL_SELECTION')} onLevelSelect={() => setGameState('LEVEL_SELECTION')}
                    onSettings={() => setShowSettings(true)}
                />
            )}
            
            {gameState === 'LEVEL_SELECTION' && (
                <LevelSelectionScreen
                    levels={activeLevels} onSelectLevel={onLevelSelect}
                    onBack={() => setGameState('INTRO')} bestTimes={bestTimes}
                />
            )}
            
            {/* GAME SESSION - ACTIVE LOOP */}
            {gameState === 'PLAYING' && engineRef.current && (
                <GameSession 
                    engine={engineRef.current}
                    musicManager={musicRef.current}
                    currentLevel={currentLevel}
                    isMobile={isMobile}
                    isDevMode={isDevMode}
                    showDevUI={showDevUI}
                    debugConfig={debugConfig}
                    deathCount={deathCount}
                    bestTime={bestTimes[`${currentLevel.type}_${currentLevel.id}`] || null}
                    onDeath={handlePlayerDeath}
                    onLevelComplete={handleLevelComplete}
                    onExitLevel={() => setGameState('LEVEL_SELECTION')}
                    onSettings={() => setShowSettings(true)}
                    activeDebugSection={activeDebugSection}
                    setActiveDebugSection={setActiveDebugSection}
                    onTick={handleGameTick}
                />
            )}
            
            {gameState === 'LEVEL_COMPLETE' && (
                <LevelCompleteScreen
                    time={finalTime} deathCount={deathCount}
                    onRestart={() => onLevelSelect(currentLevelIdx)}
                    onNext={handleNextLevel} 
                    onBack={() => setGameState('LEVEL_SELECTION')}
                    isLastLevel={currentLevelIdx === activeLevels.length - 1}
                    isNewRecord={isNewRecord} 
                    bestTime={bestTimes[`${currentLevel.type}_${currentLevel.id}`] || null}
                    targetTime={currentLevel.targetTime || 9999}
                    levelName={currentLevel.name} levelNumber={currentLevel.id} isMobile={isMobile}
                />
            )}
            
            {showSettings && (
                <SettingsMenu
                    volume={masterVolume} isMuted={isMuted} showGhosts={showGhosts}
                    onVolumeChange={(v) => { setMasterVolume(v); musicRef.current.setMasterSettings(v, isMuted); }}
                    onToggleMute={() => { setIsMuted(!isMuted); musicRef.current.setMasterSettings(masterVolume, !isMuted); }}
                    onToggleGhosts={() => setShowGhosts(!showGhosts)}
                    onBack={() => setShowSettings(false)}
                />
            )}
            
            {isDevMode && gameState === 'PLAYING' && engineRef.current && (
                <>
                    <EditorInputLayer 
                        engine={engineRef.current}
                        cameraRef={editorCameraRef}
                        currentLevel={currentLevel}
                        updateCurrentLevel={updateCurrentLevel}
                        editor={editor}
                    />
                    <EditorOverlay
                        ref={editorCanvasRef} selectedIds={editor.selection.selectedIds}
                        platforms={currentLevel.platforms} editingTextId={editor.editingTextId}
                        onUpdateText={(id, txt) => {
                            updateCurrentLevel(prev => ({
                                ...prev,
                                platforms: prev.platforms.map(p => p.id === id ? { ...p, text: txt } : p)
                            }));
                            editor.setEditingTextId(null);
                        }}
                        onUpdateDuration={handleUpdateDuration}
                    />
                    <LevelsPanel
                        levels={activeLevels} currentLevelIdx={currentLevelIdx}
                        onSelectLevel={onLevelSelect} onAddLevel={() => { }}
                        onSaveLevel={handleSaveLevel} onSaveAll={handleSaveAll}
                        onCopyGhosts={() => { }}
                        onCopyDebugState={handleCopyDebugState}
                        onReorder={() => { }} onRenameLevel={() => { }} onDeleteLevel={() => { }}
                    />
                    <AddItemsPanel onAddPlatform={(w, h, type, extra) => editor.handleAddPlatform(w, h, type, extra, editorCameraRef.current)} />
                </>
            )}
        </div>
    );
}
