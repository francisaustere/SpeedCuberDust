import { Point, Platform, Rect } from '../../../types';
import { EnemyPhysics } from '../physics/EnemyPhysics';
import { PathNavigator } from './PathNavigator';
import { JumperConfig } from './PlatformerMovement';

export class BallisticSolver {
    private physics: EnemyPhysics;
    private navigator: PathNavigator;
    private config: JumperConfig;

    constructor(physics: EnemyPhysics, navigator: PathNavigator, config: JumperConfig) {
        this.physics = physics;
        this.navigator = navigator;
        this.config = config;
    }

    public updateConfig(config: JumperConfig) {
        this.config = config;
    }

    /**
     * Recalcule la vélocité de saut pour atteindre une cible
     * Prend en compte la gravité et la force de saut
     * 🆕 AVEC PRÉDICTION DE MOVING PLATFORM
     */
    public recalculateJump(start: Point, end: Point, targetPlatformId?: number): Point | null {
        const g = this.config.gravity;
        const vy = this.config.jumpForce;

        // 🆕 PRÉDICTION DE LA POSITION DE LA MOVING PLATFORM
        let finalTarget = { ...end };

        if (targetPlatformId) {
            const platform = this.physics.platforms.find(p => p.id === targetPlatformId);

            if (platform && platform.type === 'moving' && platform.currentVx !== undefined) {
                // Calcul rapide du temps de vol (approximation)
                const dx = end.x - start.x;
                const dy = end.y - start.y;

                // Estimation du temps de vol basée sur la distance horizontale
                const estimatedVx = Math.max(Math.abs(dx) / 30, this.config.maxSpeed);
                const estimatedTime = Math.abs(dx / estimatedVx) / 60; // secondes (60fps)

                // Prédiction de la position de la plateforme
                const platformVxPerSec = (platform.velocityX || 0) * Math.sign(platform.currentVx || -1);
                const predictedOffset = platformVxPerSec * estimatedTime;

                finalTarget.x += predictedOffset;

                console.log('🎯 [BallisticSolver] Moving platform prediction:', {
                    originalX: end.x.toFixed(1),
                    predictedX: finalTarget.x.toFixed(1),
                    offset: predictedOffset.toFixed(1),
                    platformVx: platformVxPerSec.toFixed(2),
                    estimatedTime: estimatedTime.toFixed(2)
                });
            }
        }

        const dx = finalTarget.x - start.x;
        const dy = finalTarget.y - start.y;

        // Résolution de l'équation du mouvement parabolique
        // y = y0 + vy*t - 0.5*g*t^2
        const a = 0.5 * g;
        const b = vy;
        const c = -dy;

        const delta = b * b - 4 * a * c;

        if (delta < 0) return null; // Pas de solution réelle

        const t1 = (-b + Math.sqrt(delta)) / (2 * a);
        const t2 = (-b - Math.sqrt(delta)) / (2 * a);

        const t = t1 > 0 ? t1 : t2;

        if (t <= 0) return null; // Temps négatif = impossible

        const vx = dx / t;

        // 🆕 LOG pour debug
        console.log('🧮 [BallisticSolver] Jump calculation:', {
            dx: dx.toFixed(1),
            dy: dy.toFixed(1),
            timeOfFlight: t.toFixed(2),
            requiredVx: vx.toFixed(2),
            maxSpeed: this.config.maxSpeed,
            oldLimit: (this.config.maxSpeed * 2.0).toFixed(2),
            willBeRejected: Math.abs(vx) > this.config.maxSpeed * 2.0
        });

        // 🆕 Pas de limite de vitesse pour les intercepts de moving platforms
        // La physique appliquera la vélocité telle quelle
        return { x: vx, y: vy };
    }

    /**
     * Prédit la position future d'une plateforme mobile
     * Simule l'interpolation smoothstep
     */
    public predictPlatformPosition(plat: Platform, futureTime: number): Rect {
        if (!plat.moving || plat.movingTimer === undefined) {
            return { x: plat.x, y: plat.y, w: plat.w, h: plat.h };
        }

        const { start, end, duration } = plat.moving;
        const cycleTime = 2 * duration;
        const tFuture = (plat.movingTimer + futureTime) % cycleTime;

        let alpha = tFuture / duration;
        if (alpha > 1.0) alpha = 2.0 - alpha; // Ping-pong

        // Smoothstep easing
        const ease = alpha * alpha * (3 - 2 * alpha);

        const predX = start.x + (end.x - start.x) * ease;
        const predY = start.y + (end.y - start.y) * ease;

        return {
            x: predX,
            y: predY,
            w: plat.w,
            h: plat.h
        };
    }

    /**
     * Vérifie si la plateforme cible est prête pour l'action
     * Gère la tolérance adaptative pour les plateformes rapides
     */
    public isTargetPlatformReady(
        surfaceId: number | undefined,
        meta: any,
        targetX: number,
        plat?: Platform | null
    ): boolean {
        if (surfaceId === undefined) return true;

        const surf = this.navigator.surfaceSystem.surfaces.find(s => s.id === surfaceId);
        if (!surf) return true;

        if (!surf.isMovingStation) return true;

        if (!plat) {
            plat = this.physics.platforms.find(p => p.id === surf.originalPlatformId);
        }
        if (!plat) return false;

        // Shortcut: already on the platform
        if (this.physics.currentPlatformId === plat.id) return true;

        // [FIX #1] TOLÉRANCE ADAPTATIVE pour WALK
        if (meta.type === 'WALK') {
            const platSpeedX = this.getPlatformVelocityX(plat);
            const tolerance = Math.max(10, Math.abs(platSpeedX) * 5);

            const xAligned = Math.abs(plat.x - surf.left) < tolerance;
            const yAligned = Math.abs(plat.y - surf.y) < tolerance;

            return xAligned && yAligned;
        }

        // Prediction logic for jumps
        const myCx = this.physics.state.x + this.physics.state.w / 2;
        const platCx = plat.x + plat.w / 2;

        let futureX = platCx;
        if (plat.currentVx && Math.abs(plat.currentVx) > 0.1) {
            const tGuess = 1.0;
            futureX = platCx + plat.currentVx * tGuess;
        }

        const dx = Math.abs(futureX - targetX);
        const dy = Math.abs(plat.y - surf.y);

        return dx < 50 && dy < 50;
    }

    /**
     * Récupère la vélocité X d'une plateforme
     */
    private getPlatformVelocityX(plat: Platform): number {
        return plat.currentVx || 0;
    }

    /**
     * Résout un intercept jump vers une plateforme mobile
     * Essaie plusieurs timings et choisit le meilleur
     */
    public solveInterceptJump(
        start: Point,
        targetPlatform: Platform,
        estimatedAirtime: number
    ): { velocity: Point; score: number } | null {
        const solutions: Array<{ velocity: Point; score: number }> = [];

        // Scan temporel: essayer plusieurs prédictions
        for (let t = 0.05; t <= 2.0; t += 0.05) {
            const pred = this.predictPlatformPosition(targetPlatform, t);
            const targetCenter = { x: pred.x + pred.w / 2, y: pred.y };

            const jumpVel = this.recalculateJump(start, targetCenter);
            if (!jumpVel) continue;

            // Score basé sur la proximité du timing estimé
            const timeDiff = Math.abs(t - estimatedAirtime);
            const score = 1.0 / (1.0 + timeDiff);

            solutions.push({ velocity: jumpVel, score });
        }

        if (solutions.length === 0) return null;

        // Trier par score décroissant
        solutions.sort((a, b) => b.score - a.score);

        return solutions[0];
    }

    /**
     * Vérifie si un saut intercept est safe
     * (pas de collision en mid-air, landing zone valide)
     */
    public isInterceptSafe(
        start: Point,
        velocity: Point,
        targetPlatform: Platform,
        airtime: number
    ): boolean {
        // TODO: Implémenter ray-casting pour vérifier obstacles
        // Pour l'instant, on trust le pathfinding
        return true;
    }
}