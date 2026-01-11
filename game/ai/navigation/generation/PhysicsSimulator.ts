import { Platform, Point, CollisionLayer, Surface, PhysicsConfig } from '../../../../types';

export class PhysicsSimulator {
    constructor(
        private config: PhysicsConfig,
        private allPlatforms: Platform[]
    ) { }

    /**
     * Calcule la vélocité de saut nécessaire pour atteindre (dx, dy)
     */
    public calculateJumpVelocity(
        dx: number,
        dy: number,
        startX: number,
        startY: number,
        target: Surface
    ): Point | null {
        // Fast method: max speed horizontal
        const timeFast = Math.abs(dx) / this.config.maxSpeed;
        if (timeFast > 0) {
            const frames = timeFast;
            const reqVyFast = (dy - 0.5 * this.config.gravity * frames * frames) / frames;
            if (reqVyFast >= this.config.jumpForce && reqVyFast < 0) {
                const vx = Math.sign(dx) * this.config.maxSpeed;
                if (this.canReachTarget({ x: startX, y: startY }, { x: vx, y: reqVyFast }, frames, target)) {
                    return { x: vx, y: reqVyFast };
                }
            }
        }

        // Try different jump forces
        const steps = 10;
        const stepForce = Math.abs(this.config.jumpForce) / steps;
        for (let i = 0; i < steps; i++) {
            const testVy = this.config.jumpForce + i * stepForce * 0.5;
            const a = 0.5 * this.config.gravity;
            const b = testVy;
            const c = -dy;
            const term = b * b - 4 * a * c;
            if (term < 0) continue;
            const t = (-b + Math.sqrt(term)) / (2 * a);
            if (t <= 0) continue;
            const reqVx = dx / t;
            if (Math.abs(reqVx) <= this.config.maxSpeed) {
                if (this.canReachTarget({ x: startX, y: startY }, { x: reqVx, y: testVy }, t, target)) {
                    return { x: reqVx, y: testVy };
                }
            }
        }
        return null;
    }

    /**
     * Simule une trajectoire simple (jump/fall)
     */
    public canReachTarget(
        start: Point,
        velocity: Point,
        durationFrames: number,
        targetSurf: Surface
    ): boolean {
        if (durationFrames <= 0) {
            const dy = Math.abs(targetSurf.y - start.y);
            const t = Math.sqrt(2 * dy / this.config.gravity);
            durationFrames = t * 60 + 30;
        }

        const steps = Math.ceil(durationFrames) + 10;
        let x = start.x;
        let y = start.y - 2;
        let vx = velocity.x;
        let vy = velocity.y;
        const w = this.config.charW;
        const h = this.config.charH;
        const safetyMargin = 4;

        for (let i = 0; i < steps; i++) {
            const prevY = y;
            x += vx;
            y += vy;
            vy += this.config.gravity;

            // Check landing
            if (vy > 0) {
                const tolerance = 5;
                if (x >= targetSurf.left - tolerance && x <= targetSurf.right + tolerance) {
                    if (y >= targetSurf.y && prevY <= targetSurf.y + 2.0) {
                        return true;
                    }
                }
            }

            // Check collisions
            const charRect = {
                x: x - w / 2 - safetyMargin,
                y: y - h,
                w: w + safetyMargin * 2,
                h: h
            };

            for (const p of this.allPlatforms) {
                if (p.type === 'vanishing' && (p as any).isVanished) continue;
                const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
                if (!(layer & CollisionLayer.SOLID)) continue;

                if (
                    charRect.x < p.x + p.w &&
                    charRect.x + charRect.w > p.x &&
                    charRect.y < p.y + p.h &&
                    charRect.y + charRect.h > p.y
                ) {
                    if (Math.abs(p.y - targetSurf.y) < 2.0) {
                        const charCx = x;
                        const tolerance = 5;
                        if (charCx >= targetSurf.left - tolerance && charCx <= targetSurf.right + tolerance) {
                            if (vy > 0) return true;
                        }
                    }
                    if (vy < 0) {
                        const distToTop = Math.abs(charRect.y - p.y);
                        if (distToTop < 5) continue;
                    }
                    return false;
                }
            }
        }
        return false;
    }

    /**
     * Résout l'équation Y pour un double jump
     */
    public solveDoubleJumpTime(
        dy: number,
        v1y: number,
        delayFrames: number,
        v2y: number
    ): number | null {
        let y = 0;
        let vy = v1y;
        let minY = 0;
        const maxFrames = 300;

        for (let i = 0; i < maxFrames; i++) {
            y += vy;
            vy += this.config.gravity;

            if (y < minY) minY = y;

            if (i === delayFrames) vy = v2y;

            if (i > 5 && vy > 0 && y >= dy) {
                if (dy < 0 && minY > dy) return null;
                return i;
            }
        }
        return null;
    }

    /**
     * Simule un double jump complet
     */
    public simulateDoubleJump(
        startX: number,
        startY: number,
        vx1: number,
        vy1: number,
        delayFrames: number,
        vy2: number,
        vx2: number,
        totalFrames: number,
        targetSurf: Surface
    ): boolean {
        let x = startX;
        let y = startY - 2;
        let vy = vy1;
        let vx = vx1;
        const w = this.config.charW;
        const h = this.config.charH;
        const safetyMargin = 4;

        for (let i = 0; i <= totalFrames + 10; i++) {
            const prevY = y;
            x += vx;
            y += vy;
            vy += this.config.gravity;
            if (i === delayFrames) {
                vy = vy2;
                vx = vx2;
            }

            // Virtual landing check
            if (vy > 0) {
                const tolerance = 5;
                if (x >= targetSurf.left - tolerance && x <= targetSurf.right + tolerance) {
                    if (y >= targetSurf.y && prevY <= targetSurf.y + 2.0) {
                        return true;
                    }
                }
            }

            const charRect = {
                x: x - w / 2 - safetyMargin,
                y: y - h,
                w: w + safetyMargin * 2,
                h: h
            };

            for (const p of this.allPlatforms) {
                if (p.type === 'vanishing' && (p as any).isVanished) continue;
                const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
                if (!(layer & CollisionLayer.SOLID)) continue;

                if (
                    charRect.x < p.x + p.w &&
                    charRect.x + charRect.w > p.x &&
                    charRect.y < p.y + p.h &&
                    charRect.y + charRect.h > p.y
                ) {
                    if (Math.abs(p.y - targetSurf.y) < 2.0 && vy > 0) {
                        const charCx = x;
                        if (charCx >= targetSurf.left - 5 && charCx <= targetSurf.right + 5) return true;
                    }
                    if (vy < 0) {
                        const distToTop = Math.abs(charRect.y - p.y);
                        if (distToTop < 20) continue;
                    }
                    return false;
                }
            }
        }
        return false;
    }
}