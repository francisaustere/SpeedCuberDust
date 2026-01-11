
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { Player, Platform, CollisionLayer } from '../../types';
import { GAME_Config, WEAPON_CONFIG } from '../../config/constants';
import { PhysicsConfig, DEFAULT_PHYSICS_CONFIG } from '../../config/physics';
import { PlayerDeformationConfig } from './PlayerVisuals';
import { IPlayerState } from '../player/IPlayerState';
import { AirborneState } from '../player/AirborneState';
import { UpdateContext } from '../../engine/core/UpdateContext';
import { Deadly } from './Deadly';

export class PlayerController extends Component {
    public state: Player;

    // EXPOSED FOR STATES
    public lastGrounded: boolean = false;
    public lastAirVelocity: number = 0;
    public lastFrameOnWall: boolean = false; // New tracker for transition logic

    private currentState: IPlayerState;

    constructor(gameObject: GameObject) {
        super(gameObject);

        // Initialize default player state
        this.state = {
            x: 0, y: 0, w: GAME_Config.PLAYER_SIZE, h: GAME_Config.PLAYER_SIZE,
            vx: 0, vy: 0, z: 0,

            layer: CollisionLayer.PLAYER,
            mask: CollisionLayer.SOLID | CollisionLayer.ENEMY | CollisionLayer.ENEMY_PROJECTILE | CollisionLayer.GOAL,

            // Health
            health: 3,
            maxHealth: 3,
            ammo: WEAPON_CONFIG.STARTING_AMMO,
            invulnerabilityTimer: 0,

            prevX: 0, prevY: 0,
            isGrounded: false, onWall: false, isWallSliding: false,
            jumpCount: 0, maxJumps: 2,
            isJumping: false,
            facingRight: true,
            wallNormal: { x: 0, y: 0 }, wallDir: 0,
            coyoteTimer: 0, wallCoyoteTimer: 0, jumpBufferTimer: 0,
            crouchLockoutTimer: 0,

            isDead: false,
            platformId: null,
            ceilingContactId: null,
            wallJumpGraceTimer: 0,
            wallJumpNormalX: 0, lastWallNormalX: 0,
            wallJumpRefillLocked: false,
            scale: { x: 1, y: 1, z: 1 },
            targetScale: { x: 1, y: 1, z: 1 },
            scaleVel: { x: 0, y: 0, z: 0 },
            scaleAnchor: -1, // Default Bottom
            prevVy: 0,
            visualRotation: 0, angularVelocity: 0, spinDir: 0, spinDelayTimer: 0,
            spinEffectTime: 0,
            isDiving: false,
            isCrouching: false,
            isHanging: false,
            justHitCeiling: false,
            forceStand: false,
        };

        this.currentState = new AirborneState();
    }

    public reset(x?: number, y?: number) {
        const s = this.state;
        if (x !== undefined) s.x = x;
        if (y !== undefined) s.y = y;
        if (x !== undefined) s.prevX = x; // Reset History
        if (y !== undefined) s.prevY = y;

        s.vx = 0;
        s.vy = 0;

        s.health = s.maxHealth;
        s.ammo = WEAPON_CONFIG.STARTING_AMMO;
        s.invulnerabilityTimer = 0;
        s.isDead = false;

        s.jumpCount = 0;
        s.isJumping = false;
        s.scale = { x: 1, y: 1, z: 1 };
        s.targetScale = { x: 1, y: 1, z: 1 };
        s.scaleAnchor = -1;
        s.visualRotation = 0;
        s.angularVelocity = 0;
        s.spinEffectTime = 0; // Reset
        s.platformId = null;
        s.ceilingContactId = null;
        s.isGrounded = false;
        s.onWall = false;
        s.isDiving = false;
        s.isCrouching = false;
        s.isHanging = false;
        s.wallJumpRefillLocked = false;
        s.justHitCeiling = false;
        s.crouchLockoutTimer = 0;
        s.forceStand = false;
        this.lastGrounded = false;
        this.lastAirVelocity = 0;

        // Reset to Airborne State
        this.currentState = new AirborneState();
        this.currentState.enter(this);
    }

    public takeDamage(amount: number, knockback?: { x: number, y: number }) {
        if (this.state.isDead || this.state.invulnerabilityTimer > 0) return;

        this.state.health -= amount;

        if (this.state.health <= 0) {
            this.state.health = 0;
            this.state.isDead = true;
        } else {
            this.state.invulnerabilityTimer = 120;

            if (knockback) {
                this.state.vx = knockback.x;
                this.state.vy = knockback.y;
            } else {
                this.state.vy = -10;
                this.state.vx = -Math.sign(this.state.vx || 1) * 10;
            }

            this.state.isGrounded = false;
            this.state.onWall = false;
            this.state.isDiving = false;
            this.state.isCrouching = false;
            this.state.isHanging = false;
            this.state.spinEffectTime = 0;

            this.currentState = new AirborneState();
            this.currentState.enter(this);
        }
    }

    public forceStandUp() {
        if (this.state.isCrouching) {
            this.state.forceStand = true;
        }
    }

    public addAmmo(amount: number) {
        this.state.ammo = Math.min(this.state.ammo + amount, WEAPON_CONFIG.MAX_AMMO);
    }

    public update(dt: number, context: UpdateContext): void {
        if (context.isPaused) return;

        const player = this.state;
        const input = context.input;
        const physConfig = context.physicsConfig || DEFAULT_PHYSICS_CONFIG;

        // --- UPDATE TIMERS ---
        if (input.jumpPressed) {
            player.jumpBufferTimer = physConfig.JUMP_BUFFER;
        }

        player.prevVy = player.vy;
        if (player.spinDelayTimer > 0) player.spinDelayTimer -= dt;
        if (player.jumpBufferTimer > 0) player.jumpBufferTimer--;
        if (player.crouchLockoutTimer > 0) player.crouchLockoutTimer--;

        if (player.invulnerabilityTimer > 0) {
            player.invulnerabilityTimer--;
        }

        this.lastFrameOnWall = player.onWall;

        player.onWall = false;
        player.wallDir = 0;
        player.wallNormal = { x: 0, y: 0 };

        player.prevX = player.x;
        player.prevY = player.y;

        // --- FSM UPDATE ---
        // Pass context to state so it has access to everything
        const nextState = this.currentState.update(this, dt, input, context);

        if (nextState) {
            this.currentState.exit(this);
            this.currentState = nextState;
            this.currentState.enter(this, context);
        }

        // --- PHYSICS RESOLUTION (Autonomous) ---
        const staticCandidates = context.spatialHash.query(player);
        const nearbyPlatforms = [...staticCandidates, ...context.dynamicPlatforms];

        const onCollision = (player: Player, p: Platform) => {
            if (p.type === 'vanishing') {
                const vp = p as any;
                if (!vp.isVanishing && !vp.isVanished) {
                    vp.isVanishing = true;
                    vp.vanishTimer = context.vanishingConfig.duration;
                }
            }
        };

        context.collisionResolver.resolveCollisions(
            player,
            nearbyPlatforms,
            context.levelBounds.life,
            physConfig,
            onCollision
        );

        // --- DEADLY OBJECTS CHECK ---
        const deadlyObjects = context.world.getComponents(Deadly);
        for (const deadly of deadlyObjects) {
            const enemyRect = deadly.gameObject.transform;
            const pos = enemyRect.position;
            const scale = enemyRect.scale;
            // Center-based scale to top-left rect conversion
            const ex = pos.x - scale.x / 2;
            const ey = -pos.y - scale.y / 2;
            
            if (context.collisionResolver.checkCollisionPublic(player, { x: ex, y: ey, w: scale.x, h: scale.y })) {
                this.takeDamage(1);
            }
        }

        // --- VISUAL TRANSFORM UPDATE ---
        const cx = player.x + player.w / 2;
        const cy = player.y + player.h / 2;
        this.transform.setPosition(cx, -cy, player.z);

        this.lastGrounded = player.isGrounded;
        if (!player.isGrounded) {
            this.lastAirVelocity = player.vy;
        }

        player.justHitCeiling = false;
    }

    public updatePlayerDeformation(player: Player, config: PhysicsConfig, defConfig?: PlayerDeformationConfig) {
        if (player.justHitCeiling) {
            player.scale.y = 0.6;
            player.scale.x = 1.4;
            player.scale.z = 1.4;
            player.scaleVel = { x: 0, y: 0, z: 0 };
            player.targetScale = { x: 1, y: 1, z: 1 };
            player.scaleAnchor = 1;
            return;
        }

        if (player.scaleAnchor === 1 && Math.abs(player.scale.y - 1) < 0.1 && !player.isHanging) {
            player.scaleAnchor = -1;
        }

        if (player.isHanging) {
            player.scaleAnchor = 1;
        } else if (player.isGrounded || player.justJumped) {
            player.scaleAnchor = -1;
        }

        const runStretch = defConfig ? defConfig.runStretchAmount : 0.2;
        const fallStretch = defConfig ? defConfig.fallStretchAmount : 0.3;
        const spinFallStretch = defConfig?.spinFallStretchAmount ?? fallStretch;
        const stiffness = defConfig ? defConfig.stiffness : 0.1;
        const damping = defConfig ? defConfig.damping : 0.5;
        const minScale = defConfig ? defConfig.minScale : 0.1;
        const maxScale = defConfig ? defConfig.maxScale : 3.0;
        const maxFallStretch = defConfig?.maxFallStretch ?? 10.0;
        const shapeMorphSpeed = defConfig?.shapeMorphSpeed ?? 1.0;

        const idealTarget = { x: 1, y: 1, z: 1 };

        if (player.isGrounded) {
            idealTarget.x = 1;
            idealTarget.y = 1;
            idealTarget.z = 1;
        } else if (player.isHanging) {
            idealTarget.x = 1.1;
            idealTarget.y = 0.9;
            idealTarget.z = 1.0;
        } else {
            if (Math.abs(player.vy) < 5) {
                idealTarget.y = 0.9;
                idealTarget.x = 1.05;
                idealTarget.z = 1.05;
            } else {
                const verticalSpeedFactor = Math.min(Math.abs(player.vy) / config.MAX_FALL_VELOCITY, 1.0);
                const isSpinningFast = Math.abs(player.angularVelocity) > 0.2;
                const activeStretch = isSpinningFast ? spinFallStretch : fallStretch;
                const stretch = verticalSpeedFactor * activeStretch;

                if (isSpinningFast) {
                    idealTarget.y = 1 + stretch;
                    idealTarget.x = 1 - stretch * 0.5;
                } else {
                    const uprightFactor = Math.abs(Math.cos(player.visualRotation));
                    const sidewaysFactor = 1.0 - uprightFactor;
                    const stretchValue = 1 + stretch;
                    const squashValue = 1 - stretch * 0.5;

                    idealTarget.y = stretchValue * uprightFactor + squashValue * sidewaysFactor;
                    idealTarget.x = squashValue * uprightFactor + stretchValue * sidewaysFactor;
                }

                if (idealTarget.y > 1) idealTarget.y = Math.min(idealTarget.y, 1 + maxFallStretch);
                if (idealTarget.x > 1) idealTarget.x = Math.min(idealTarget.x, 1 + maxFallStretch);
                idealTarget.z = 1 - stretch * 0.5;
            }
        }

        player.targetScale.x += (idealTarget.x - player.targetScale.x) * shapeMorphSpeed;
        player.targetScale.y += (idealTarget.y - player.targetScale.y) * shapeMorphSpeed;
        player.targetScale.z += (idealTarget.z - player.targetScale.z) * shapeMorphSpeed;

        const updateAxis = (axis: 'x' | 'y' | 'z') => {
            const displacement = player.targetScale[axis] - player.scale[axis];
            const force = displacement * stiffness;
            player.scaleVel[axis] += force;
            player.scaleVel[axis] *= damping;
            player.scale[axis] += player.scaleVel[axis];
        };

        updateAxis('x');
        updateAxis('y');
        updateAxis('z');

        player.scale.x = Math.max(minScale, Math.min(maxScale, player.scale.x));
        player.scale.y = Math.max(minScale, Math.min(maxScale, player.scale.y));
        player.scale.z = Math.max(minScale, Math.min(maxScale, player.scale.z));

        if (isNaN(player.scale.x)) player.scale.x = 1;
        if (isNaN(player.scale.y)) player.scale.y = 1;
        if (isNaN(player.scale.z)) player.scale.z = 1;
    }
}
