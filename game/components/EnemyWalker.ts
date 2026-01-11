
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { PhysicsEntity, Platform, EnemyData, Rect, Player, CollisionLayer } from '../../types';
import { GameWorld } from '../../engine/core/GameWorld';
import { IEnemyState } from '../enemies/states/IEnemyState';
import { PatrolState } from '../enemies/states/PatrolState';
import { WalkerDyingState } from '../enemies/states/WalkerDyingState';
import { PlayerController } from './PlayerController';
import { ParticleFactory } from '../ParticleFactory';
import { UpdateContext } from '../../engine/core/UpdateContext';
import * as THREE from 'three';

export class EnemyWalker extends Component {
    public state: PhysicsEntity;
    public platforms: Platform[] = []; // Public for State access
    public direction: number = 1;      // Public for State access (1 = Right, -1 = Left)
    public bounds: Rect;               // NEW: Life Bounds

    public currentState: IEnemyState;
    public world: GameWorld; // Need access to world for player lookup

    // Initial State for Reset
    private startX: number;
    private startY: number;

    // Config (Public Readonly for State access - Updated via config)
    public SPEED = 2.0;
    public CHASE_SPEED = 4.5;
    public GRAVITY = 0.8;
    public MAX_FALL = 20;

    // Detection Config
    public viewRange: number = 350;
    public viewHeight: number = 100;

    // Death Threshold
    private IMPACT_THRESHOLD = 6.0;

    // Collision Config
    private COLLISION_PUSH = 20.0; // Player Knockback
    private LAUNCH_FORCE = 60.0;   // Walker Launch Speed
    private LAUNCH_Y = 10.0;       // Walker Launch Pop

    // Debug Visual
    private debugMesh: THREE.Mesh | null = null;
    private debugColliders: THREE.Group | null = null;
    public particleFactory: ParticleFactory;

    constructor(gameObject: GameObject, data: EnemyData, platforms: Platform[], bounds: Rect) {
        super(gameObject);
        this.platforms = platforms;
        this.bounds = bounds;

        this.startX = data.x;
        this.startY = data.y;

        // Initialize State Data with required PhysicsEntity properties
        this.state = {
            x: data.x,
            y: data.y,
            w: data.w,
            h: data.h,
            vx: this.SPEED,
            vy: 0,
            isGrounded: false,
            onWall: false,
            wallDir: 0,
            wallNormal: { x: 0, y: 0 },
            // Added missing properties to satisfy PhysicsEntity interface
            layer: CollisionLayer.ENEMY,
            mask: CollisionLayer.SOLID | CollisionLayer.PLAYER | CollisionLayer.PLAYER_PROJECTILE
        };

        // Initialize FSM
        this.currentState = new PatrolState();
    }

    // Injected manually since we don't have dependency injection
    public setWorld(world: GameWorld) {
        this.world = world;
        this.particleFactory = new ParticleFactory(world);
    }

    public init(): void {
        this.currentState.enter(this);
    }

    public reset(): void {
        this.state.x = this.startX;
        this.state.y = this.startY;
        this.state.vx = this.SPEED;
        this.state.vy = 0;
        this.direction = 1;
        this.state.isGrounded = false;
        this.state.onWall = false;
        this.state.wallNormal = { x: 0, y: 0 };

        // Reset FSM
        this.currentState.exit(this);
        this.currentState = new PatrolState();
        this.currentState.enter(this);

        // Sync Visuals immediately
        this.syncVisuals();
    }

    public update(dt: number, context: UpdateContext): void {
        if (context.isPaused) return;

        // --- SYNC LIVE CONFIG ---
        const config = context.config;
        if (config && config.enemyConfig) {
            const c = config.enemyConfig;
            this.SPEED = c.walkerSpeed;
            this.CHASE_SPEED = c.walkerChaseSpeed;
            this.viewRange = c.walkerViewDist;
            this.viewHeight = c.walkerViewHeight;
            this.IMPACT_THRESHOLD = c.walkerImpactThreshold;
            this.COLLISION_PUSH = c.walkerCollisionPush;
            this.LAUNCH_FORCE = c.walkerLaunchForce;
            this.LAUNCH_Y = c.walkerLaunchY;
        }

        // --- BOUNDS CHECK (DEATH) ---
        if (this.bounds) {
            const s = this.state;
            if (s.x < this.bounds.x || s.x > this.bounds.x + this.bounds.w ||
                s.y < this.bounds.y || s.y > this.bounds.y + this.bounds.h) {
                this.explode();
                return;
            }
        }

        // FSM Update
        const nextState = this.currentState.update(this, dt, config, context.input);
        if (nextState) {
            this.currentState.exit(this);
            this.currentState = nextState;
            this.currentState.enter(this);
        }

        // Visual Sync (Context Responsibility)
        this.syncVisuals();

        // Check for player collision autonomously
        const playerGO = this.world.findObjectByName('Player');
        if (playerGO) {
            const pc = playerGO.getComponent(PlayerController);
            if (pc) this.resolvePlayerCollision(pc);
        }

        // Debug Render (Updated to use specific flag)
        if (config?.drawConfig) {
            if (config.drawConfig.showWalkerViewCones) {
                this.drawViewRange();
            } else {
                if (this.debugMesh) this.debugMesh.visible = false;
            }

            if (config.drawConfig.showWalkerColliders) {
                this.drawDebugColliders();
            } else {
                if (this.debugColliders) this.debugColliders.visible = false;
            }
        }
    }

    public triggerDeath() {
        if (this.currentState.name === 'Dying') return;
        this.currentState.exit(this);
        this.currentState = new WalkerDyingState();
        this.currentState.enter(this);
    }

    private syncVisuals() {
        // If dying, the state handles manual tumble/rotation
        if (this.currentState.name === 'Dying') return;

        this.transform.setPosition(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 0);

        // Rotate based on direction so "Red" (+X face) is forward
        // If moving right (1), rot 0. If moving left (-1), rot PI.
        const targetRotY = this.direction > 0 ? 0 : Math.PI;
        this.transform.rotation.y = targetRotY;
    }

    // --- COLLISION LOGIC ---

    public resolvePlayerCollision(pc: PlayerController) {
        if (this.currentState.name === 'Dying') return; // Ignore collisions if dying

        const pState = pc.state;
        if (pState.isDead) return;

        // Overlap Calculation (AABB)
        const pCx = pState.x + pState.w / 2;
        const pCy = pState.y + pState.h / 2;
        const wCx = this.state.x + this.state.w / 2;
        const wCy = this.state.y + this.state.h / 2;

        const dx = pCx - wCx;
        const dy = pCy - wCy;

        const combinedHalfW = (pState.w + this.state.w) / 2;
        const combinedHalfH = (pState.h + this.state.h) / 2;

        const overlapX = combinedHalfW - Math.abs(dx);
        const overlapY = combinedHalfH - Math.abs(dy);

        // Check AABB Intersection
        if (overlapX > 0 && overlapY > 0) {

            // NEW RULES:
            // 1. Deadly by default.
            // 2. Vulnerable only if Player is Spinning, Diving, or Dashing.

            const isSpinningFast = Math.abs(pState.angularVelocity) > 0.2;
            const isAttacking = pState.isDiving || isSpinningFast;

            if (isAttacking) {
                // WALKER DIES
                this.triggerDeath();

                // BOUNCE PLAYER
                if (pState.isDiving) {
                    pState.vy = -15; // Vertical Bounce
                    pState.isDiving = false;
                } else {
                    // Hit while spinning
                    pState.vy = -10; // Small Hop
                    // Preserve momentum
                }

                this.particleFactory.spawnImpact(wCx, -this.state.y, 0xFF0000); // Red Spark

                // Prevent sticking inside the dying enemy
                // Push player out slightly based on velocity to prevent drag
                if (dx > 0) pState.x += 2;
                else pState.x -= 2;

            } else {
                // PLAYER TAKES DAMAGE
                const kx = dx > 0 ? 1 : -1;
                // Strong horizontal knockback + small hop
                pc.takeDamage(1, { x: kx * this.COLLISION_PUSH, y: -10 });
            }
        }
    }

    public explode() {
        if (this.debugMesh) {
            this.world.scene.remove(this.debugMesh);
            this.debugMesh.geometry.dispose();
            (this.debugMesh.material as THREE.Material).dispose();
        }
        if (this.debugColliders) {
            this.world.scene.remove(this.debugColliders);
        }

        this.particleFactory.spawnDeathExplosion(this.state.x + this.state.w / 2, this.state.y + this.state.h / 2, 0xFF0000);
        this.gameObject.destroy();
    }

    private drawViewRange() {
        if (!this.debugMesh) {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xFF0000,
                opacity: 0.2,
                transparent: true,
                depthTest: false,
                side: THREE.DoubleSide
            });
            this.debugMesh = new THREE.Mesh(geo, mat);
            this.debugMesh.renderOrder = 997;
            this.world.scene.add(this.debugMesh);
        }
        this.debugMesh.visible = true;

        // Center of enemy
        const cx = this.state.x + this.state.w / 2;
        const cy = -(this.state.y + this.state.h / 2);

        // Box stretches in direction
        const width = this.viewRange;
        const height = this.viewHeight * 2;

        this.debugMesh.scale.set(width, height, 1);
        // Offset center: if facing right (1), center of box is at cx + range/2
        const offsetX = (this.direction * width) / 2;

        this.debugMesh.position.set(cx + offsetX, cy, 50);
    }

    private drawDebugColliders() {
        if (!this.debugColliders) {
            this.debugColliders = new THREE.Group();

            // DEADLY (Red) - Entire Body is now deadly (unless attacking)
            const deadlyGeo = new THREE.BoxGeometry(1, 1, 1);
            const deadlyMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, opacity: 0.5, transparent: true, depthTest: false });
            const deadlyMesh = new THREE.Mesh(deadlyGeo, deadlyMat);
            deadlyMesh.name = 'Deadly';

            this.debugColliders.add(deadlyMesh);
            this.debugColliders.renderOrder = 999;
            this.world.scene.add(this.debugColliders);
        }
        this.debugColliders.visible = true;

        const cx = this.state.x + this.state.w / 2;
        const cy = -(this.state.y + this.state.h / 2);

        const deadly = this.debugColliders.getObjectByName('Deadly');
        if (deadly) {
            deadly.scale.set(this.state.w, this.state.h, 20);
            deadly.position.set(cx, cy, 10);
        }
    }

    // --- UTILS ---

    public getPlayer(): Player | null {
        if (!this.world) return null; // Safety check
        const playerGO = this.world.findObjectByName('Player');
        if (playerGO) {
            const pc = playerGO.getComponent(PlayerController);
            return pc ? pc.state : null;
        }
        return null;
    }

    public detectPlayer(ignoreDirection: boolean = false): boolean {
        const player = this.getPlayer();
        if (!player || player.isDead) return false;

        // STEALTH: Ignore player if crouching
        if (player.isCrouching) return false;

        // 1. Check Distance (Box Check for efficiency)
        const dx = Math.abs((player.x + player.w / 2) - (this.state.x + this.state.w / 2));
        const dy = Math.abs((player.y + player.h / 2) - (this.state.y + this.state.h / 2));

        if (dx > this.viewRange || dy > this.viewHeight) return false;

        const pCenterX = player.x + player.w / 2;
        const myCenterX = this.state.x + this.state.w / 2;

        // 2. Check Direction
        if (!ignoreDirection) {
            // Must be in front
            if (this.direction > 0 && pCenterX < myCenterX) return false;
            if (this.direction < 0 && pCenterX > myCenterX) return false;
        }

        // 3. VERTICAL CHECK: Ignore if player is significantly above
        if (player.y < this.state.y - 10) return false;

        // 4. Line of Sight (Raycast Center to Center)
        const start = { x: myCenterX, y: this.state.y + this.state.h / 2 };
        const end = { x: pCenterX, y: player.y + player.h / 2 };

        // We negate because `isLineBlocked` returns true if blocked
        return !this.isLineBlocked(start, end);
    }

    private isLineBlocked(start: { x: number, y: number }, end: { x: number, y: number }): boolean {
        // Simple raycast against platforms
        for (const p of this.platforms) {
            // Vanishing: If vanished, it's transparent. If solid (visible), it blocks sight.
            if (p.type === 'vanishing' && (p as any).isVanished) continue;

            if (this.lineRectIntersect(start, end, p)) {
                return true; // Blocked!
            }
        }
        return false; // Clear
    }

    private lineRectIntersect(p1: { x: number, y: number }, p2: { x: number, y: number }, r: Rect): boolean {
        let t0 = 0.0;
        let t1 = 1.0;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const checks = [
            { p: -dx, q: -(r.x - p1.x) },
            { p: dx, q: (r.x + r.w - p1.x) },
            { p: -dy, q: -(r.y - p1.y) },
            { p: dy, q: (r.y + r.h - p1.y) }
        ];
        for (const c of checks) {
            if (c.p === 0) {
                if (c.q < 0) return false;
            } else {
                const t = c.q / c.p;
                if (c.p < 0) {
                    if (t > t1) return false;
                    if (t > t0) t0 = t;
                } else {
                    if (t < t0) return false;
                    if (t < t1) t1 = t;
                }
            }
        }
        return t0 <= t1;
    }

    public destroy(): void {
        if (this.debugMesh) {
            this.world.scene.remove(this.debugMesh);
            this.debugMesh.geometry.dispose();
            (this.debugMesh.material as THREE.Material).dispose();
        }
        if (this.debugColliders) {
            this.world.scene.remove(this.debugColliders);
        }
        super.destroy();
    }

    // --- PHYSICS HELPERS (Exposed for States) ---

    public resolveCollisions(isX: boolean) {
        this.state.onWall = false;
        this.state.wallNormal = { x: 0, y: 0 };
        if (!isX) this.state.isGrounded = false;

        const prevV = isX ? this.state.vx : this.state.vy;

        for (const p of this.platforms) {
            // Ignore non-solids
            if (!this.isSolid(p)) continue;

            if (this.checkOverlap(this.state, p)) {
                const overlapX = (Math.min(this.state.x + this.state.w, p.x + p.w) - Math.max(this.state.x, p.x));
                const overlapY = (Math.min(this.state.y + this.state.h, p.y + p.h) - Math.max(this.state.y, p.y));

                const isVerticalCollision = overlapX < overlapY;
                const isSignificantVerticalOverlap = overlapY > 2.0;

                if (isX) {
                    if (isVerticalCollision || isSignificantVerticalOverlap) {
                        if (this.state.vx > 0) {
                            this.state.x = p.x - this.state.w;
                            this.state.wallNormal = { x: -1, y: 0 };
                        } else if (this.state.vx < 0) {
                            this.state.x = p.x + p.w;
                            this.state.wallNormal = { x: 1, y: 0 };
                        }
                        this.state.vx = 0;
                        this.state.onWall = true;
                    }
                } else {
                    if (!isVerticalCollision) {
                        if (this.state.vy > 0) {
                            this.state.y = p.y - this.state.h;
                            this.state.isGrounded = true;
                            this.state.vy = 0;
                        } else if (this.state.vy < 0) {
                            this.state.y = p.y + p.h;
                            this.state.vy = 0;
                        }
                    }
                }
            }
        }

        const currentV = isX ? this.state.vx : this.state.vy;
        const deltaV = Math.abs(prevV - currentV);

        if (isX && deltaV > this.IMPACT_THRESHOLD) {
            this.explode();
        }
    }

    public checkOverlap(a: PhysicsEntity, b: Platform): boolean {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    public rectIntersect(r1: Rect, r2: Rect): boolean {
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }

    public isSolid(p: Platform): boolean {
        if (p.type === 'vanishing' && p.isVanished) return false;
        
        // Filter by Layer
        const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
        if ((this.state.mask & layer) === 0) return false;

        return true;
    }
}
