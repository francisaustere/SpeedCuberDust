
import { IMovement } from '../../../types/EnemyTypes';
import { PhysicsEntity, Platform, Point, CollisionLayer } from '../../../types';
import { GameObject } from '../../../engine/GameObject';

export class GroundMovement implements IMovement {
    // Interface requirements
    public isMoving: boolean = false;
    public velocity: Point = { x: 0, y: 0 };
    public position: Point = { x: 0, y: 0 };
    public isGrounded: boolean = false;

    // Config
    public maxSpeed: number = 2.0;
    public gravity: number = 0.8;
    public maxFallSpeed: number = 20;

    // Internal
    private gameObject: GameObject;
    private state: PhysicsEntity;
    private platforms: Platform[];

    // Internal State
    private targetX: number | null = null;
    private direction: number = 0;

    constructor(gameObject: GameObject, state: PhysicsEntity, platforms: Platform[]) {
        this.gameObject = gameObject;
        this.state = state;
        this.platforms = platforms;
        this.position.x = state.x;
        this.position.y = state.y;
    }

    public update(dt: number): void {
        // 1. Logic (Move to Target)
        if (this.targetX !== null) {
            const dx = this.targetX - this.state.x;
            if (Math.abs(dx) < 5) {
                this.stop();
            } else {
                this.direction = Math.sign(dx);

                // --- EDGE DETECTION ---
                // If we are grounded and there's no floor ahead, stop to avoid falling
                if (this.isGrounded && !this.checkFloorAhead(this.direction)) {
                    this.stop();
                } else {
                    this.state.vx = this.direction * this.maxSpeed;
                    this.isMoving = true;
                }
            }
        } else {
            // Friction/Stop
            this.state.vx = 0;
            this.isMoving = false;
        }

        // 2. Physics (Gravity)
        this.state.vy += this.gravity;
        if (this.state.vy > this.maxFallSpeed) this.state.vy = this.maxFallSpeed;

        // 3. Collision Resolution
        // X Axis
        this.state.x += this.state.vx;
        this.resolveCollisions(true);

        // Y Axis
        this.state.y += this.state.vy;
        this.resolveCollisions(false);

        // Sync public props
        this.velocity.x = this.state.vx;
        this.velocity.y = this.state.vy;
        this.position.x = this.state.x;
        this.position.y = this.state.y;
        this.isGrounded = this.state.isGrounded;

        // Visual Rotation (Helper)
        if (this.state.vx !== 0) {
            const lookDir = this.state.vx > 0 ? 0 : Math.PI;
            this.gameObject.transform.rotation.y = lookDir;
        }

        // Sync Transform
        this.gameObject.transform.setPosition(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 0);
    }

    public moveTo(x: number, y: number): void {
        this.targetX = x;
        // Y is ignored for simple ground walker unless jumping
    }

    public stop(): void {
        this.targetX = null;
        this.state.vx = 0;
        this.isMoving = false;
    }

    public lookAt(x: number, y: number): void {
        const dx = x - this.state.x;
        if (dx !== 0) {
            const rot = dx > 0 ? 0 : Math.PI;
            this.gameObject.transform.rotation.y = rot;
        }
    }

    public getRoamTarget(): Point {
        // Pick a point nearby on the same horizontal level
        const roamRange = 200;
        const dir = Math.random() > 0.5 ? 1 : -1;
        return {
            x: this.state.x + dir * (100 + Math.random() * roamRange),
            y: this.state.y
        };
    }

    private checkFloorAhead(dir: number): boolean {
        // Raycast-like check: look for a platform slightly ahead and below our feet
        const checkX = this.state.x + (dir > 0 ? this.state.w + 10 : -10);
        const checkY = this.state.y + this.state.h + 5;

        for (const p of this.platforms) {
            if (!this.isSolid(p)) continue;

            // If the point is within this platform's bounds
            if (checkX >= p.x && checkX <= p.x + p.w &&
                checkY >= p.y && checkY <= p.y + p.h) {
                return true;
            }
        }
        return false;
    }

    // --- Physics Helpers (Extracted from EnemyWalker) ---
    private resolveCollisions(isX: boolean) {
        if (!isX) this.state.isGrounded = false;
        this.state.onWall = false;

        for (const p of this.platforms) {
            if (!this.isSolid(p)) continue;

            if (this.checkOverlap(this.state, p)) {
                const overlapX = (Math.min(this.state.x + this.state.w, p.x + p.w) - Math.max(this.state.x, p.x));
                const overlapY = (Math.min(this.state.y + this.state.h, p.y + p.h) - Math.max(this.state.y, p.y));

                // Simple AABB resolution
                const isVerticalCollision = overlapX < overlapY;
                const isSignificantVerticalOverlap = overlapY > 2.0;

                if (isX) {
                    if (isVerticalCollision || isSignificantVerticalOverlap) {
                        if (this.state.vx > 0) this.state.x = p.x - this.state.w;
                        else if (this.state.vx < 0) this.state.x = p.x + p.w;
                        this.state.vx = 0;
                        this.state.onWall = true;

                        // Stop trying to move if hit wall
                        if (this.targetX !== null) {
                            this.stop();
                        }
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
    }

    private checkOverlap(a: PhysicsEntity, b: Platform): boolean {
        return (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y);
    }

    private isSolid(p: Platform): boolean {
        if (p.type === 'vanishing' && (p as any).isVanished) return false;

        // Filter by Layer
        const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
        if ((this.state.mask & layer) === 0) return false;

        return true;
    }
}
