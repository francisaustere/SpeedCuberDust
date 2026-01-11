
import { ISensors } from '../../../types/EnemyTypes';
import { PhysicsEntity, Platform, Point, Rect } from '../../../types';
import { GameWorld } from '../../../engine/core/GameWorld';
import { PlayerController } from '../../components/PlayerController';
import { GameObject } from '../../../engine/core/GameObject';

export class VisionSensor implements ISensors {
    // Interface Config
    public viewRange: number = 350;
    public viewAngle: number = 90; // Degrees
    public viewHeight: number = 100;
    public hearingRadius: number = 100;
    public isCombatMode: boolean = false;
    
    // Debug/Cheat Config
    public cheatMode: boolean = false; // If true, always sees player regardless of walls/distance

    private world: GameWorld;
    private platforms: Platform[];
    private state: PhysicsEntity; // Own state
    private gameObject: GameObject;

    constructor(world: GameWorld, platforms: Platform[], state: PhysicsEntity, gameObject: GameObject) {
        this.world = world;
        this.platforms = platforms;
        this.state = state;
        this.gameObject = gameObject;
    }

    public update(dt: number): void {
        // Passive update if needed
    }

    public canSeePlayer(): boolean {
        if (this.cheatMode) return true;

        const player = this.getPlayer();
        if (!player || player.state.isDead) return false;
        if (player.state.isCrouching) return false; // Basic stealth

        // 1. Distance
        const myCx = this.state.x + this.state.w / 2;
        const myCy = this.state.y + this.state.h / 2;
        const pCx = player.state.x + player.state.w / 2;
        const pCy = player.state.y + player.state.h / 2;

        const dx = Math.abs(pCx - myCx);
        const dy = Math.abs(pCy - myCy);
        const distSq = (pCx - myCx) ** 2 + (pCy - myCy) ** 2;
        const dist = Math.sqrt(distSq);

        // 1. Hearing Check (360 degrees, very close)
        if (dist < this.hearingRadius) {
            return !this.isLineBlocked({ x: myCx, y: myCy - 5 }, { x: pCx, y: pCy });
        }

        // 2. Combat Lockdown (360 degrees awareness if already fighting)
        if (this.isCombatMode) {
            if (dx <= this.viewRange && dy <= this.viewHeight) {
                return !this.isLineBlocked({ x: myCx, y: myCy - 5 }, { x: pCx, y: pCy });
            }
            return false;
        }

        // 3. Directional View (Frontal Cone)
        if (dx <= this.viewRange && dy <= this.viewHeight) {
            const forwardX = Math.cos(this.gameObject.transform.rotation.y);
            const dot = (pCx - myCx) * (forwardX > 0 ? 1 : -1);
            if (dot >= 0) {
                return !this.isLineBlocked({ x: myCx, y: myCy - 5 }, { x: pCx, y: pCy });
            }
        }

        return false;
    }

    public getPlayerPosition(): Point | null {
        if (this.cheatMode) {
            const p = this.getPlayer();
            return p ? { x: p.state.x, y: p.state.y } : null;
        }

        if (this.canSeePlayer()) {
            const p = this.getPlayer()!.state;
            return { x: p.x, y: p.y };
        }
        return null;
    }

    public getLastKnownPlayerPosition(): Point | null {
        // TODO: Implement memory
        return this.getPlayerPosition();
    }

    private getPlayer(): PlayerController | null {
        const pObj = this.world.findObjectByName('Player');
        return pObj ? pObj.getComponent(PlayerController) : null;
    }

    private isLineBlocked(start: Point, end: Point): boolean {
        for (const p of this.platforms) {
            // Intersection Check
            if (this.lineRectIntersect(start, end, p)) return true;
        }
        return false;
    }

    private lineRectIntersect(p1: Point, p2: Point, r: Rect): boolean {
        // Liang-Barsky (Simplified) or just reuse existing Utils
        // Copying simplified check for now
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
            if (c.p === 0) { if (c.q < 0) return false; }
            else {
                const t = c.q / c.p;
                if (c.p < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
                else { if (t < t0) return false; if (t < t1) t1 = t; }
            }
        }
        return t0 <= t1;
    }
}
