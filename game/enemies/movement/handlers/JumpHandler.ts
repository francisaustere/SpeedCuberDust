
import { Point } from '../../../../types';
import { EnemyPhysics } from '../../physics/EnemyPhysics';
import { JumperConfig } from '../PlatformerMovement';
import { ActionExecutor } from './ActionExecutor';

export class JumpHandler {
    private physics: EnemyPhysics;
    private config: JumperConfig;
    private executor: ActionExecutor;

    private doubleJumpPending: boolean = false;
    private doubleJumpTimer: number = 0;
    private doubleJumpVelocity: Point | null = null;

    constructor(physics: EnemyPhysics, config: JumperConfig, executor: ActionExecutor) {
        this.physics = physics;
        this.config = config;
        this.executor = executor;
    }

    public updateConfig(config: JumperConfig) {
        this.config = config;
    }

    public get isActive(): boolean {
        return this.doubleJumpPending;
    }

    public stop() {
        this.doubleJumpPending = false;
    }

    public performJump(vel: Point) {
        this.executor.performJump(vel);
    }

    public performDoubleJump(meta: any) {
        this.executor.performJump(meta.velocity);
        this.doubleJumpPending = true;

        // ✅ CORRIGÉ : Utilise secondJumpDelay en FRAMES, puis convertit en secondes
        const delayFrames = meta.secondJumpDelay || 15;  // 15 frames par défaut
        this.doubleJumpTimer = delayFrames / 60;  // Convertir en secondes (60 FPS)

        this.doubleJumpVelocity = meta.secondVelocity || { x: meta.velocity.x, y: this.config.jumpForce };

        console.log('⏱️ [JumpHandler] Double jump scheduled:', {
            delayFrames,
            delaySeconds: this.doubleJumpTimer.toFixed(3),
            secondVelocity: this.doubleJumpVelocity
        });
    }

    public update(dt: number): boolean {
        const state = this.physics.state;

        // Double Jump Pending
        if (this.doubleJumpPending) {
            this.doubleJumpTimer -= dt;
            if (this.doubleJumpTimer <= 0) {
                if (this.doubleJumpVelocity) {
                    state.vx = this.doubleJumpVelocity.x;
                    state.vy = this.doubleJumpVelocity.y;
                    this.executor.currentJumpVelocityX = this.doubleJumpVelocity.x;

                    state.y -= 4.0;
                    state.isGrounded = false;
                    this.executor.isSquashing = true;
                }
                this.doubleJumpPending = false;
                this.doubleJumpVelocity = null;
            }
            return true;
        }

        return false;
    }
}
