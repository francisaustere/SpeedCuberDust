
import { Player, Platform, Rect, Point, PhysicsEntity, CollisionLayer } from '../types';
import { PhysicsConfig } from '../config/physics';

export class CollisionResolver {

    private axes = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    private corners = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
    private tempPoint = { x: 0, y: 0 };

    public resolveCollisions(
        player: Player,
        platforms: Platform[],
        bounds: Rect,
        config: PhysicsConfig,
        onCollision: (player: Player, platform: Platform) => void
    ) {
        const wasGrounded = player.isGrounded;
        this.resolveAxis(player, platforms, true, wasGrounded, config, onCollision);
        this.resolveAxis(player, platforms, false, wasGrounded, config, onCollision);

        if (player.x < bounds.x || player.x > bounds.x + bounds.w ||
            player.y < bounds.y || player.y > bounds.y + bounds.h) {
            player.isDead = true;
        }
    }

    public checkCollisionPublic(a: Rect, b: Rect): boolean {
        return this.checkCollision(a, b);
    }

    private checkCollision(a: Rect, b: Rect): boolean {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    private getRotatedAABB(p: Platform): Rect {
        if (!p.rotation) return p;
        const c = Math.abs(Math.cos(p.rotation));
        const s = Math.abs(Math.sin(p.rotation));
        const newW = p.w * c + p.h * s;
        const newH = p.w * s + p.h * c;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
    }

    private getMTV(player: Player, p: Platform, rotation: number): Point | null {
        const pcx = player.x + player.w / 2;
        const pcy = player.y + player.h / 2;
        const plcx = p.x + p.w / 2;
        const plcy = p.y + p.h / 2;
        this.axes[0].x = 1; this.axes[0].y = 0;
        this.axes[1].x = 0; this.axes[1].y = 1;
        const cr = Math.cos(rotation);
        const sr = Math.sin(rotation);
        this.axes[2].x = cr; this.axes[2].y = sr;
        this.axes[3].x = -sr; this.axes[3].y = cr;
        let minOverlap = Infinity;
        let smallestAxis = this.tempPoint;
        smallestAxis.x = 0; smallestAxis.y = 0;
        for (const axis of this.axes) {
            const p1 = this.getProjection(player, axis, pcx, pcy, 0);
            const p2 = this.getProjection(p, axis, plcx, plcy, rotation);
            const overlap = Math.min(p1.max, p2.max) - Math.max(p1.min, p2.min);
            if (overlap < 0) return null;
            if (overlap < minOverlap) {
                minOverlap = overlap;
                smallestAxis.x = axis.x;
                smallestAxis.y = axis.y;
            }
        }
        const dx = pcx - plcx;
        const dy = pcy - plcy;
        if (dx * smallestAxis.x + dy * smallestAxis.y < 0) {
            smallestAxis.x = -smallestAxis.x;
            smallestAxis.y = -smallestAxis.y;
        }
        return { x: smallestAxis.x * minOverlap, y: smallestAxis.y * minOverlap };
    }

    private getProjection(rect: Rect, axis: Point, cx: number, cy: number, rot: number) {
        const hw = rect.w / 2;
        const hh = rect.h / 2;
        this.corners[0].x = -hw; this.corners[0].y = -hh;
        this.corners[1].x = hw; this.corners[1].y = -hh;
        this.corners[2].x = hw; this.corners[2].y = hh;
        this.corners[3].x = -hw; this.corners[3].y = hh;
        const c = Math.cos(rot);
        const s = Math.sin(rot);
        let min = Infinity;
        let max = -Infinity;
        for (const vert of this.corners) {
            const wx = cx + (vert.x * c - vert.y * s);
            const wy = cy + (vert.x * s + vert.y * c);
            const val = wx * axis.x + wy * axis.y;
            if (val < min) min = val;
            if (val > max) max = val;
        }
        return { min, max };
    };

    private resolveAxis(
        player: Player,
        platforms: Platform[],
        isXMove: boolean,
        wasGrounded: boolean,
        config: PhysicsConfig,
        onCollision: (player: Player, platform: Platform) => void
    ) {
        if (!isXMove) player.isGrounded = false;

        for (const p of platforms) {
            // --- BITMASK FILTER ---
            if (!(player.mask & p.layer)) continue;

            if ((p as any).isVanished) continue;

            if (!p.rotation) {
                let checkRect = player;
                if (!isXMove && wasGrounded) {
                    const downwardVel = Math.max(0, p.currentVy || 0);
                    const tolerance = 4.0 + downwardVel * 1.5;
                    checkRect = { ...player, h: player.h + tolerance };
                }

                if (this.checkCollision(checkRect, p)) {
                    onCollision(player, p);
                    if (player.isDead) return;

                    const overlapX = (Math.min(player.x + player.w, p.x + p.w) - Math.max(player.x, p.x));
                    const overlapY = (Math.min(player.y + player.h, p.y + p.h) - Math.max(player.y, p.y));

                    // --- STUTTER FIX: STEP TOLERANCE (Top edge only) ---
                    const isAtTop = Math.abs((player.y + player.h) - p.y) < 2.0;
                    if (isXMove && overlapY < 2.0 && player.vy >= 0 && isAtTop) continue;

                    const pPrevY = p.y - (p.currentVy || 0);
                    const verticalTolerance = wasGrounded ? 4.0 : 0.1;
                    const wasAbove = (player.prevY + player.h) <= (pPrevY + verticalTolerance) || (player.platformId === p.id);

                    if (!isXMove && wasAbove && player.vy >= 0) {
                        const isBouncy = p.type === 'bouncy';
                        if (isBouncy) {
                            player.y = p.y - player.h;
                            let bounceSpeed = Math.abs(player.vy) * config.BOUNCY_BLOCK_RESTITUTION_Y;
                            if (bounceSpeed < config.BOUNCY_MIN_SPEED) bounceSpeed = config.BOUNCY_MIN_SPEED;
                            player.vy = -bounceSpeed;
                            player.isJumping = false;
                            player.justBounced = true;
                            player.scale.x = 1.4;
                            player.scale.y = 0.6;
                            player.scaleVel = { x: 0, y: 0, z: 0 };
                            player.platformId = null;
                            player.jumpCount = player.maxJumps;
                            continue;
                        }
                        player.y = p.y - player.h;
                        player.isGrounded = true;
                        player.wallJumpGraceTimer = 0;
                        if (player.vy > 0) player.vy = 0;
                        player.platformId = p.id;
                    }
                    else if (overlapX < overlapY) {
                        if (isXMove) {
                            if (player.x < p.x) {
                                player.x = p.x - player.w;
                                player.wallNormal = { x: -1, y: 0 };
                            } else {
                                player.x = p.x + p.w;
                                player.wallNormal = { x: 1, y: 0 };
                            }
                            if (p.type === 'bouncy') {
                                player.vx = -player.vx * config.BOUNCY_BLOCK_RESTITUTION_X;
                                player.onWall = false;
                                player.justBounced = true;
                                player.jumpCount = player.maxJumps;
                            } else {
                                player.vx = 0;
                                player.onWall = true;
                            }
                        }
                    } else {
                        if (!isXMove) {
                            if (player.y < p.y) {
                                if (player.vy >= 0) {
                                    if (p.type === 'bouncy') {
                                        player.y = p.y - player.h;
                                        let bounceSpeed = Math.abs(player.vy) * config.BOUNCY_BLOCK_RESTITUTION_Y;
                                        if (bounceSpeed < config.BOUNCY_MIN_SPEED) bounceSpeed = config.BOUNCY_MIN_SPEED;
                                        player.vy = -bounceSpeed;
                                        player.isJumping = false;
                                        player.justBounced = true;
                                        player.jumpCount = player.maxJumps;
                                        continue;
                                    }
                                    player.y = p.y - player.h;
                                    player.isGrounded = true;
                                    player.wallJumpGraceTimer = 0;
                                    if (player.vy > 0) player.vy = 0;
                                    player.platformId = p.id;
                                }
                            } else {
                                player.y = p.y + p.h;
                                if (player.vy < 0) {
                                    if (p.type === 'bouncy') {
                                        let bounceSpeed = Math.abs(player.vy) * config.BOUNCY_BLOCK_RESTITUTION_Y;
                                        if (bounceSpeed < config.BOUNCY_MIN_SPEED) bounceSpeed = config.BOUNCY_MIN_SPEED;
                                        player.vy = bounceSpeed;
                                        player.justBounced = true;
                                        player.jumpCount = player.maxJumps;
                                    } else {
                                        player.vy = 0;
                                        player.justHitCeiling = true;
                                        player.ceilingContactId = p.id;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                const rotatedBounds = this.getRotatedAABB(p);
                if (this.checkCollision(player, rotatedBounds)) {
                    onCollision(player, p);
                    if (player.isDead) return;
                    const mtv = this.getMTV(player, p, p.rotation || 0);
                    if (mtv) {
                        const nx = mtv.x; const ny = mtv.y;
                        const len = Math.sqrt(nx * nx + ny * ny);
                        const normX = nx / len; const normY = ny / len;
                        const isSlope = normY < -0.7;
                        if (isXMove) {
                            if (isSlope && wasGrounded) {
                                const dotUp = normY * -1;
                                if (dotUp > 0.1) {
                                    const lift = len / dotUp;
                                    player.y -= lift;
                                    player.isGrounded = true;
                                    player.platformId = p.id;
                                }
                            } else {
                                if (len < 2.0 && normY < -0.5) continue;
                                player.x += mtv.x;
                                player.y += mtv.y;
                                if (!isSlope) {
                                    if (p.type === 'bouncy') {
                                        const dot = player.vx * normX + player.vy * normY;
                                        player.vx = (player.vx - 2 * dot * normX) * config.BOUNCY_BLOCK_RESTITUTION_X;
                                        player.justBounced = true;
                                        player.jumpCount = player.maxJumps;
                                    } else {
                                        player.onWall = true;
                                        player.wallNormal = { x: normX, y: normY };
                                        const vDotN = player.vx * normX + player.vy * normY;
                                        if (vDotN < 0) { player.vx -= vDotN * normX; player.vy -= vDotN * normY; }
                                    }
                                }
                            }
                        } else {
                            if (isSlope && player.vy >= 0) {
                                if (p.type === 'bouncy') {
                                    player.x += mtv.x; player.y += mtv.y;
                                    const dot = player.vx * normX + player.vy * normY;
                                    player.vx = (player.vx - 2 * dot * normX) * config.BOUNCY_BLOCK_RESTITUTION_X;
                                    player.vy = (player.vy - 2 * dot * normY) * config.BOUNCY_BLOCK_RESTITUTION_Y;
                                    player.isJumping = false; player.justBounced = true;
                                    player.jumpCount = player.maxJumps;
                                } else {
                                    const dotUp = normY * -1;
                                    if (dotUp > 0.1) { player.y -= len / dotUp; } else { player.x += mtv.x; player.y += mtv.y; }
                                    player.isGrounded = true; player.wallJumpGraceTimer = 0;
                                    player.platformId = p.id; if (player.vy > 0) player.vy = 0;
                                }
                            }
                            else if (normY > 0.9) {
                                if (player.vy < 0) {
                                    if (p.type === 'bouncy') {
                                        let bounceSpeed = Math.abs(player.vy) * config.BOUNCY_BLOCK_RESTITUTION_Y;
                                        if (bounceSpeed < config.BOUNCY_MIN_SPEED) bounceSpeed = config.BOUNCY_MIN_SPEED;
                                        player.vy = bounceSpeed; player.justBounced = true;
                                        player.jumpCount = player.maxJumps;
                                    } else {
                                        player.vy = 0; player.justHitCeiling = true; player.ceilingContactId = p.id;
                                    }
                                }
                                player.x += mtv.x; player.y += mtv.y;
                            }
                            else {
                                player.x += mtv.x; player.y += mtv.y;
                                if (!isSlope) {
                                    player.onWall = true; player.wallNormal = { x: normX, y: normY };
                                    const vDotN = player.vx * normX + player.vy * normY;
                                    if (vDotN < 0) { player.vx -= vDotN * normX; player.vy -= vDotN * normY; }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
