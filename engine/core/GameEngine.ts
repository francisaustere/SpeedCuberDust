
import * as THREE from 'three';
import { GameWorld } from './GameWorld';
import { Renderer } from '../rendering/Renderer';
import { CollisionResolver } from '../../game/player/systems/CollisionResolver';
import { InputSystem } from '../../game/systems/InputSystem';
import { GhostSystem } from '../../game/systems/GhostSystem';
import { EditorSystem } from '../../game/systems/EditorSystem';
import { SceneBuilder } from './../scene/SceneBuilder';
import { GameLoop } from './GameLoop';
import { PlayerController } from '../../game/components/PlayerController';
import { Level, Camera, Player, GameStatus, Platform } from '../../types';
import { EnemyFactory } from '../../game/EnemyFactory';
import { CameraFollow } from '../../game/components/CameraFollow';
import { GameObject } from './GameObject';
import { calculateBounds } from '../../utils/bounds';
import { SpatialHashGrid } from '../../game/utils/SpatialHashGrid';
import { PlayerVisuals } from '../../game/components/PlayerVisuals';
import { WeaponController } from '../../game/components/WeaponController';
import { UpdateContext } from './UpdateContext';

export class GameEngine {
    public world: GameWorld;
    public renderer: Renderer;

    // Systems
    public collisionResolver: CollisionResolver;
    public inputSystem: InputSystem;
    public ghostSystem: GhostSystem;
    public editorSystem: EditorSystem;
    public sceneBuilder: SceneBuilder;
    public gameLoop: GameLoop;
    public spatialHash: SpatialHashGrid;

    public currentLevel: Level | null = null;
    public playerGO: GameObject | null = null;
    public gameStatus: GameStatus = 'INTRO';

    // Editor Camera Override
    public overrideCamera: Camera | null = null;

    // Engine-Authoritative Timer
    public levelTime: number = 0;

    // Dynamic Objects (Moving Platforms)
    private dynamicPlatforms: Platform[] = [];

    // Callbacks
    private onUpdateCallback: ((stats: any) => void) | null = null;

    // Config Refs (Injected)
    public debugConfig: any;

    constructor(canvas: HTMLCanvasElement, debugConfig: any) {
        const scene = new THREE.Scene();
        this.world = new GameWorld(scene);
        this.renderer = new Renderer(canvas, this.world);
        this.debugConfig = debugConfig;

        // Init Systems
        this.collisionResolver = new CollisionResolver();
        this.inputSystem = new InputSystem();
        this.ghostSystem = new GhostSystem();
        this.editorSystem = new EditorSystem();
        this.sceneBuilder = new SceneBuilder(this.world, this.renderer);
        this.spatialHash = new SpatialHashGrid({ x: 0, y: 0, w: 0, h: 0 });

        // Init GameLoop
        this.gameLoop = new GameLoop(
            (dt) => this.fixedUpdate(dt),
            (dt, alpha) => this.renderVisuals(dt, alpha)
        );

        this.inputSystem.init();

        // Hack for components to find engine systems if needed
        (window as any).engine = this;
    }

    public setOnUpdate(cb: (stats: any) => void) {
        this.onUpdateCallback = cb;
    }

    public setGameStatus(status: GameStatus) {
        this.gameStatus = status;
    }

    public loadLevel(level: Level, configs: any) {
        this.currentLevel = level;
        this.levelTime = 0; 

        // 1. Delegate Scene Construction
        const sceneResult = this.sceneBuilder.load(level, configs);
        
        // 2. Update Engine State
        this.spatialHash = sceneResult.spatialHash;
        this.dynamicPlatforms = sceneResult.dynamicPlatforms;
        this.world.bounds = sceneResult.bounds.level;

        // 3. Renderer Setup
        this.renderer.setLevel(level);

        // 4. Player Setup
        if (!this.playerGO) {
            this.playerGO = this.world.findObjectByName('Player') || null;
        }
        if (this.playerGO && !this.playerGO.getComponent(WeaponController)) {
            this.playerGO.addComponent(WeaponController, this.world);
        }
        if (this.playerGO) {
            const pc = this.playerGO.getComponent(PlayerController);
            if (pc) pc.reset(level.start.x, level.start.y);
        }

        // 5. Camera Reset
        const camGO = this.world.findObjectByName('MainCamera');
        if (camGO) {
            const cam = camGO.getComponent(CameraFollow);
            if (cam) cam.reset();
        }
    }

    public start() {
        this.gameLoop.start();
    }

    public stop() {
        this.gameLoop.stop();
    }

    // --- GAME LOOP CALLBACKS ---

    private fixedUpdate(dt: number) {
        if (!this.currentLevel) return;

        const config = this.debugConfig.current;
        const input = this.inputSystem.getState();
        const isPaused = config.isDevMode;

        // Update Timer
        if (this.gameStatus === 'PLAYING' && !isPaused) {
            this.levelTime += dt;
        }

        // Determine active camera for logic (e.g. mouse interaction)
        const activeCamera = (isPaused && this.overrideCamera) ? this.overrideCamera : this.renderer.cameraInfo;

        // PREPARE CONTEXT
        const bounds = calculateBounds(this.currentLevel);
        const context: UpdateContext = {
            dt: dt,
            input: input,
            collisionResolver: this.collisionResolver,
            spatialHash: this.spatialHash,
            dynamicPlatforms: this.dynamicPlatforms,
            platforms: this.currentLevel.platforms,
            levelBounds: bounds,
            world: this.world,
            renderer: this.renderer,
            physicsConfig: config.physicsConfig,
            deformationConfig: config.deformationConfig,
            vanishingConfig: config.vanishingConfig,
            enemyConfig: config.enemyConfig,
            pathfindingConfig: config.pathfindingConfig,
            drawConfig: config.drawConfig,
            visualConfig: config.visualConfig,
            isPaused: isPaused,
            config: config,
            activeCamera: activeCamera
        };

        // 1. UPDATE WORLD (Propagates context to all components)
        this.world.update(dt, context);

        // 2. GLOBAL STATE CHECKS (Game Over / Win)
        // These are Game Rules, so they stay in the Engine/Session Manager logic
        const physicsActive = !isPaused && (
            this.gameStatus === 'PLAYING' ||
            this.gameStatus === 'LEVEL_TRANSITION' ||
            this.gameStatus === 'LEVEL_COMPLETE');

        if (physicsActive && this.playerGO) {
            const pc = this.playerGO.getComponent(PlayerController);
            if (pc) {
                // Death Check (Player Controller sets the flag, Engine handles the consequence)
                if (pc.state.isDead) {
                    this.world.destroyObjectsByTag('Enemy');
                    if (this.currentLevel.enemies) {
                        this.currentLevel.enemies.forEach(e => {
                            EnemyFactory.create(e, this.world, this.currentLevel!);
                        });
                    }
                }
            }
        }
        
        this.inputSystem.update();
    }

    private renderVisuals(dt: number, alpha: number) {
        if (!this.currentLevel) return;
        const config = this.debugConfig.current;

        // Sync TimeScale from Config to Loop
        this.gameLoop.timeScale = config.timeScale ?? 1.0;

        let playerState: Player | null = null;
        if (this.playerGO) {
            const pc = this.playerGO.getComponent(PlayerController);
            if (pc) playerState = pc.state;
        }

        if (playerState) {
            const isPlaying = this.gameStatus === 'PLAYING';
            this.ghostSystem.update(dt, playerState, isPlaying, true);
            const ghosts = this.ghostSystem.getRenderGhosts(playerState.w, playerState.h);
            const renderCamera = (config.isDevMode && this.overrideCamera)
                ? this.overrideCamera
                : this.renderer.cameraInfo;

            this.renderer.render(
                dt, renderCamera, this.currentLevel, playerState, ghosts,
                {
                    grid: config.gridConfig,
                    visual: config.visualConfig,
                    post: config.postProcessConfig,
                    light: config.lightConfig,

                    vanishing: config.vanishingConfig,
                    showBounds: config.gridConfig.showBounds
                },
                config.isDevMode,
                alpha
            );
            if (this.onUpdateCallback) {
                this.onUpdateCallback({ player: playerState, time: this.levelTime });
            }
        }
    }

    public dispose() {
        this.stop();
        this.renderer.dispose();
        this.inputSystem.cleanup();
        this.world.clear();
    }
}
