
import * as THREE from 'three';
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { Platform, ProjectileType, CollisionLayer, Rect, Point } from '../../types';
import { PlayerController } from './PlayerController';
import { EnemyWalker } from './EnemyWalker';
import { EnemyDrone } from './EnemyDrone';
import { GameWorld } from '../../engine/core/GameWorld';
import { ParticleFactory } from '../ParticleFactory';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { EnemyController } from '../enemies/controllers/EnemyController';
import { UpdateContext } from '../../engine/core/UpdateContext';

export interface ProjectileConfig {
    vx: number;
    vy: number;
    speed: number;
    life: number;
    size: number;
    type: ProjectileType;
    damage: number;
    color: number;
    gravity?: number;
    isPlayerOwned?: boolean;
}

export class Projectile extends Component {
    private vx: number;
    private vy: number;
    private life: number;
    private size: number;
    private world: GameWorld;
    private particleFactory: ParticleFactory;

    private gravity: number;
    private isPlayerOwned: boolean;
    private isStuck: boolean = false;
    private stickTimer: number = 0;

    private layer: CollisionLayer;
    private mask: number;

    constructor(
        gameObject: GameObject,
        config: ProjectileConfig,
        platforms: Platform[],
        world: GameWorld,
        particleFactory: ParticleFactory
    ) {
        super(gameObject);
        this.vx = config.vx;
        this.vy = config.vy;
        this.life = config.life;
        this.size = config.size;
        this.world = world;
        this.particleFactory = particleFactory;
        this.gravity = config.gravity || 0;
        this.isPlayerOwned = config.isPlayerOwned || false;

        if (this.isPlayerOwned) {
            this.layer = CollisionLayer.PLAYER_PROJECTILE;
            this.mask = CollisionLayer.SOLID | CollisionLayer.ENEMY;
        } else {
            this.layer = CollisionLayer.ENEMY_PROJECTILE;
            this.mask = CollisionLayer.SOLID | CollisionLayer.PLAYER;
        }
    }

    public update(dt: number, context: UpdateContext): void {
        if (context.isPaused) return;

        if (this.isStuck) {
            this.stickTimer += dt;
            // Check for player pickup
            if (this.isPlayerOwned) {
                const playerGO = this.world.findObjectByName('Player');
                const pc = playerGO?.getComponent(PlayerController);
                if (pc && !pc.state.isDead) {
                    const p = pc.state;
                    // Simple bounding box overlap check with the projectile
                    const projRect = {
                        x: this.transform.position.x - this.size / 2,
                        y: -this.transform.position.y - this.size / 2,
                        w: this.size,
                        h: this.size
                    };

                    if (p.x < projRect.x + projRect.w &&
                        p.x + p.w > projRect.x &&
                        p.y < projRect.y + projRect.h &&
                        p.y + p.h > projRect.y) {

                        pc.addAmmo(1);
                        this.particleFactory.spawnImpact(this.transform.position.x, -this.transform.position.y, 0x00FF00); // Green pickup effect
                        this.gameObject.destroy();
                        return;
                    }
                }
            }

            if (this.stickTimer > 60.0) this.gameObject.destroy(); // 60 seconds life time for stuck arrows
            return;
        }

        this.life -= dt;
        if (this.life <= 0) {
            this.gameObject.destroy();
            return;
        }

        // 1. Position de départ (physique)
        const startPos: Point = {
            x: this.transform.position.x,
            y: -this.transform.position.y
        };

        // Appliquer la gravité
        this.vy += this.gravity;

        // Position d'arrivée théorique pour cette frame
        const endPos: Point = {
            x: startPos.x + this.vx,
            y: startPos.y + this.vy
        };

        // 2. CCD (Continuous Collision Detection) : Recherche de l'impact le plus proche sur le segment
        let closestT = 1.0;
        let hitObject: any = null;

        // A. Test contre les plateformes (Murs, sols)
        const platforms: Platform[] = context.platforms || [];
        for (const p of platforms) {
            if (!(this.mask & (p.layer || CollisionLayer.SOLID))) continue;
            if ((p as any).isVanished) continue;

            const t = this.lineRectIntersectTime(startPos, endPos, p);
            if (t !== null && t < closestT) {
                closestT = t;
                hitObject = p;
            }
        }

        // B. Test contre les entités mobiles
        if (this.isPlayerOwned) {
            const walkers = this.world.getComponents(EnemyWalker);
            for (const w of walkers) {
                const rect = { x: w.state.x, y: w.state.y, w: w.state.w, h: w.state.h };
                const t = this.lineRectIntersectTime(startPos, endPos, rect);
                if (t !== null && t < closestT) {
                    closestT = t;
                    hitObject = w;
                }
            }
            const modEnemies = this.world.getComponents(EnemyController);
            for (const me of modEnemies) {
                // Approximate rect from transform
                const pos = me.gameObject.transform.position;
                const scale = me.gameObject.transform.scale;
                const rect = {
                    x: pos.x - scale.x / 2,
                    y: -pos.y - scale.y / 2,
                    w: scale.x,
                    h: scale.y
                };
                const t = this.lineRectIntersectTime(startPos, endPos, rect);
                if (t !== null && t < closestT) {
                    closestT = t;
                    hitObject = me;
                }
            }
        } else {
            const playerGO = this.world.findObjectByName('Player');
            const pc = playerGO?.getComponent(PlayerController);
            if (pc && !pc.state.isDead) {
                const p = pc.state;
                const rect = { x: p.x, y: p.y, w: p.w, h: p.h };
                const t = this.lineRectIntersectTime(startPos, endPos, rect);
                if (t !== null && t < closestT) {
                    closestT = t;
                    hitObject = pc;
                }
            }
        }

        // 3. Résolution
        if (hitObject) {
            // Impact ! On place la flèche au point exact du contact (closestT)
            const impactX = startPos.x + (endPos.x - startPos.x) * closestT;
            const impactY = startPos.y + (endPos.y - startPos.y) * closestT;

            this.transform.setPosition(impactX, -impactY, 0);

            // FIX: Calculer et fixer l'angle d'arrivée avant d'arrêter le mouvement
            const impactAngle = Math.atan2(-this.vy, this.vx);
            this.transform.setRotation(0, 0, impactAngle);

            if (hitObject instanceof PlayerController) {
                hitObject.takeDamage(1);
                this.gameObject.destroy();
            } else if (hitObject instanceof EnemyWalker || hitObject instanceof EnemyDrone) {
                hitObject.triggerDeath();
                this.gameObject.destroy();
                this.particleFactory.spawnImpact(impactX, impactY, 0xFF0000);
            } else if (hitObject instanceof EnemyController) {
                hitObject.takeDamage(1);
                this.gameObject.destroy();
                this.particleFactory.spawnImpact(impactX, impactY, 0xFF0000);
            } else {
                // C'est un mur
                if (this.isPlayerOwned) {
                    this.isStuck = true;
                    this.vx = 0;
                    this.vy = 0;
                    this.particleFactory.spawnImpact(impactX, impactY, 0xFFFF00);
                } else {
                    // Enemy projectiles just explode on walls
                    this.gameObject.destroy();
                    this.particleFactory.spawnImpact(impactX, impactY, 0xFFFFFF);
                }
            }
        } else {
            // Pas d'obstacle : mouvement fluide et mise à jour de la rotation vers l'avant
            this.transform.setPosition(endPos.x, -endPos.y, 0);
            const angle = Math.atan2(-this.vy, this.vx);
            this.transform.setRotation(0, 0, angle);

            // Notify nearby enemies of "Near Miss"
            if (this.isPlayerOwned) {
                const modEnemies = this.world.getComponents(EnemyController);
                for (const me of modEnemies) {
                    if (me.isDead) continue;
                    const enemyPos = me.gameObject.transform.position;
                    const dist = Math.sqrt((endPos.x - enemyPos.x) ** 2 + (endPos.y + enemyPos.y) ** 2);
                    if (dist < 150) {
                        me.notifySignal(endPos, 'NEAR_MISS');
                    }
                }
            }
        }
    }

    /**
     * Algorithme de Liang-Barsky pour l'intersection Segment-Rectangle.
     * Retourne 't' (0 à 1) représentant le moment de l'impact sur le segment.
     */
    private lineRectIntersectTime(p1: Point, p2: Point, r: Rect): number | null {
        let tmin = 0;
        let tmax = 1;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        const p = [-dx, dx, -dy, dy];
        const q = [p1.x - r.x, (r.x + r.w) - p1.x, p1.y - r.y, (r.y + r.h) - p1.y];

        for (let i = 0; i < 4; i++) {
            if (p[i] === 0) {
                if (q[i] < 0) return null;
            } else {
                const t = q[i] / p[i];
                if (p[i] < 0) {
                    if (t > tmin) tmin = t;
                } else {
                    if (t < tmax) tmax = t;
                }
            }
        }

        if (tmin < tmax && tmin >= 0 && tmin <= 1) {
            return tmin;
        }
        return null;
    }
}
