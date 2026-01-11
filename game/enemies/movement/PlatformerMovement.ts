
import * as THREE from 'three';
import { Component } from '../../../engine/core/Component';
import { IMovement } from '../../../types/EnemyTypes';
import { PhysicsEntity, Platform, Point } from '../../../types';
import { GameObject } from '../../../engine/core/GameObject';
import { EnemyPhysics } from '../physics/EnemyPhysics';
import { PathNavigator } from './PathNavigator';
import { ActionExecutor } from './handlers/ActionExecutor';

// Shared config interface
export interface JumperConfig {
    maxSpeed: number;
    jumpForce: number;
    gravity: number;
    maxFallSpeed: number;

    // Prediction Tuning
    jumpPredictionDrag: number;
    jumpPredictionBuffer: number;

    wallClimbKickOffX: number;
    wallClimbKickOffY: number;
    wallClimbAirAccel: number;
    wallClimbReengageY: number;
}

export class PlatformerMovement extends Component implements IMovement {
    // Interface requirements
    public isMoving: boolean = false;
    public get velocity(): Point { return { x: this.state.vx, y: this.state.vy }; }
    public get position(): Point { return { x: this.state.x, y: this.state.y }; }
    public get isGrounded(): boolean { return this.state.isGrounded; }

    // Configuration (Exposed for EnemyController sync)
    public maxSpeed: number = 3.5;
    public jumpForce: number = -14.0;
    public gravity: number = 0.8;
    public maxFallSpeed: number = 20;

    // Updated defaults to prevent early jumping
    public jumpPredictionDrag: number = 1.0;
    public jumpPredictionBuffer: number = 0;

    public wallClimbKickOffX: number = 6.0;
    public wallClimbKickOffY: number = -14.0;
    public wallClimbAirAccel: number = 0.2;
    public wallClimbReengageY: number = -11.5;

    // Sub-Components
    public physics: EnemyPhysics;
    public navigator: PathNavigator;
    public executor: ActionExecutor;

    private lastRepathTime: number = 0;

    // Internal
    private state: PhysicsEntity;
    private repathTimer: number = 0;
    private targetPosition: Point | null = null; // 🆕 Added to track active target

    // Visual Deformation
    private visualScale: Point = { x: 1, y: 1 };

    constructor(gameObject: GameObject, state: PhysicsEntity, platforms: Platform[]) {
        super(gameObject);
        this.state = state;

        let world = null;
        if ((window as any).engine) {
            world = (window as any).engine.world;
        }

        this.physics = new EnemyPhysics(state, platforms);
        this.navigator = new PathNavigator(this.gravity, this.jumpForce, this.maxSpeed, world);
        this.executor = new ActionExecutor(this.physics, this.navigator, this.getConfig());
    }

    // Accessor for Debug/Controller
    public get surfaceSystem() {
        return this.navigator.surfaceSystem;
    }

    public get path() {
        return this.navigator.path;
    }

    public get pathIndex() {
        return this.navigator.pathIndex;
    }

    private getConfig(): JumperConfig {
        return {
            maxSpeed: this.maxSpeed,
            jumpForce: this.jumpForce,
            gravity: this.gravity,
            maxFallSpeed: this.maxFallSpeed,
            jumpPredictionDrag: this.jumpPredictionDrag,
            jumpPredictionBuffer: this.jumpPredictionBuffer,
            wallClimbKickOffX: this.wallClimbKickOffX,
            wallClimbKickOffY: this.wallClimbKickOffY,
            wallClimbAirAccel: this.wallClimbAirAccel,
            wallClimbReengageY: this.wallClimbReengageY
        };
    }

    public syncPhysicsAndRebuild(gravity: number, jumpForce: number, maxSpeed: number) {
        this.gravity = gravity;
        this.jumpForce = jumpForce;
        this.maxSpeed = maxSpeed;

        this.physics.gravity = gravity;
        this.navigator.syncPhysics(gravity, jumpForce, maxSpeed, this.physics.platforms);
    }

    public update(dt: number): void {
        // 1. Sync Configs
        this.physics.gravity = this.gravity;
        this.executor.updateConfig(this.getConfig());

        // 2. Run Sub-Systems
        this.navigator.update(this.physics.platforms);
        this.executor.update(dt);
        this.physics.update(dt);

        // 3. Update Visuals
        this.updateVisuals();

        // 4. Update Movement Flag
        this.isMoving = Math.abs(this.state.vx) > 0.1 || !this.state.isGrounded;

        // 5. Stuck Detection (existing)
        if (this.navigator.path.length > 0 && !this.executor.isBusy) {
            const target = this.navigator.getCurrentTarget();
            if (target) {
                const dist = Math.sqrt(
                    Math.pow(target.x - (this.physics.state.x + this.physics.state.w / 2), 2) +
                    Math.pow(target.y - (this.physics.state.y + this.physics.state.h), 2)
                );

                if (dist > 100 && Math.abs(this.physics.state.vx) < 0.1) {
                    console.log('🚨 [PlatformerMovement] Potential STUCK state:', {
                        dist: dist.toFixed(1),
                        vx: this.physics.state.vx.toFixed(2),
                        pathIndex: this.navigator.pathIndex,
                        pathLength: this.navigator.path.length,
                        currentPlatformId: this.physics.currentPlatformId
                    });
                }
            }
        }

        // 🆕 6. Auto-repath si path vide
        if (this.navigator.path.length === 0 &&
            !this.executor.isBusy &&
            this.state.isGrounded &&
            this.targetPosition) { // 🆕 Vérifie qu'il y a une cible

            const timeSinceLastRepath = performance.now() / 1000 - this.lastRepathTime;

            if (timeSinceLastRepath > 1.0) { // Cooldown de 1 seconde
                console.log('🔄 [PlatformerMovement] Auto-repath triggered');
                this.lastRepathTime = performance.now() / 1000;

                this.navigator.findPath(
                    { x: this.state.x + this.state.w / 2, y: this.state.y + this.state.h },
                    this.targetPosition,
                    this.physics.currentPlatformId
                );
            }
        }
    }

    public moveTo(x: number, y: number): void {
        this.targetPosition = { x, y }; // 🆕 Save target for auto-repath

        // Prevent pathfinding while executing complex actions
        if (this.executor.isBusy) return;

        let isOnMoving = false;
        // --- LOCAL MOVING PLATFORM CHECK ---
        if (this.state.isGrounded && this.physics.currentPlatformId !== null) {
            const plat = this.physics.platforms.find(p => p.id === this.physics.currentPlatformId);
            if (plat && (plat.type === 'moving' || plat.moving)) {
                isOnMoving = true;
                // Check if target is within the horizontal bounds of this platform
                // Use a generous Y tolerance because player Y might vary slightly
                if (x >= plat.x && x <= plat.x + plat.w && Math.abs(y - plat.y) < 100) {
                    // Local movement on moving platform
                    // Force update every frame (repathTimer = 0) to track moving target relative to moving self
                    this.navigator.path = [{ x, y }];
                    this.navigator.pathIndex = 0;
                    this.repathTimer = 0;
                    return;
                }
            }
        }

        // Check if path is finished/empty
        const isPathComplete = this.navigator.path.length === 0 || this.navigator.pathIndex >= this.navigator.path.length;

        // Only throttle if we have a valid pending path that isn't finished
        if (!isPathComplete) {
            if (this.repathTimer > 0) {
                this.repathTimer -= 0.016;
                return;
            }
        }

        // If we are on a moving platform but target is elsewhere, we need frequent updates
        // because our world position is shifting passively, invalidating the graph plan
        this.repathTimer = isOnMoving ? 0.2 : 1.0;

        const start = {
            x: this.state.x + this.state.w / 2,
            y: this.state.y + this.state.h
        };
        const end = { x, y: y + 40 };

        // Pass current platform ID to help pathfinder recover from moving platforms
        this.navigator.findPath(start, end, this.physics.currentPlatformId);
    }

    public stop(): void {
        this.targetPosition = null; // 🆕 Clear target
        this.executor.stop();
        this.navigator.clearPath();
        this.state.vx = 0;
    }

    public lookAt(x: number, y: number): void {
        const dx = x - this.state.x;
        if (Math.abs(dx) > 1) {
            this.gameObject.transform.rotation.y = dx > 0 ? 0 : Math.PI;
        }
    }

    public getRoamTarget(): Point {
        const surfs = this.surfaceSystem.surfaces;
        if (surfs.length > 0) {
            const s = surfs[Math.floor(Math.random() * surfs.length)];
            return { x: s.midPoint.x, y: s.y - 40 };
        }
        return { x: this.state.x, y: this.state.y };
    }

    private updateVisuals() {
        // Look Direction
        if (Math.abs(this.state.vx) > 0.1) {
            const lookDir = this.state.vx > 0 ? 0 : Math.PI;
            this.gameObject.transform.rotation.y = lookDir;
        }

        // Squash Trigger from Executor
        if (this.executor.isSquashing) {
            this.visualScale.y = 0.6;
            this.visualScale.x = 1.4;
        }

        let targetScaleX = 1.0;
        let targetScaleY = 1.0;

        if (!this.state.isGrounded) {
            targetScaleY = 1.3;
            targetScaleX = 0.7;
        } else if (Math.abs(this.state.vx) > 0.5) {
            const time = performance.now() / 100;
            targetScaleY = 1.0 + Math.sin(time) * 0.1;
            targetScaleX = 1.0 + Math.cos(time) * 0.05;
        }

        this.visualScale.x += (targetScaleX - this.visualScale.x) * 0.2;
        this.visualScale.y += (targetScaleY - this.visualScale.y) * 0.2;

        this.gameObject.transform.scale.set(
            this.state.w * this.visualScale.x,
            this.state.h * this.visualScale.y,
            this.state.w
        );

        this.gameObject.transform.setPosition(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 0);
    }

    public destroy() {
        this.navigator.destroy();
        super.destroy();
    }
}
