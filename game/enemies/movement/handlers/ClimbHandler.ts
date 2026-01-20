import { Point } from '../../../../types';
import { EnemyPhysics } from '../../physics/EnemyPhysics';
import { JumperConfig } from '../PlatformerMovement';
import { ActionExecutor } from './ActionExecutor';

export class ClimbHandler {
    private physics: EnemyPhysics;
    private config: JumperConfig;
    private executor: ActionExecutor;

    public state: 'NONE' | 'APPROACH' | 'CLIMBING' | 'FINISHING' = 'NONE';
    public justFinished: boolean = false;

    private targetY: number = 0;
    private wallX: number = 0;
    private direction: number = 0;
    private timeout: number = 0;
    private finishTimer: number = 0;

    // 🆕 Solution B : Calcul de la durée de steering
    private steeringFramesRemaining: number = 0;
    private initialDistToWall: number = 0;

    // 🆕 Solution D : Configuration des vitesses adaptatives
    private readonly SPEED_PRECISE: number = 0.5;   // < 10px : très lent
    private readonly SPEED_SLOW: number = 1.5;      // < 30px : lent
    private readonly SPEED_NORMAL: number = 3.5;    // < 60px : normal
    // Au-delà de 60px : maxSpeed du config

    constructor(physics: EnemyPhysics, config: JumperConfig, executor: ActionExecutor) {
        this.physics = physics;
        this.config = config;
        this.executor = executor;
    }

    public updateConfig(config: JumperConfig) {
        this.config = config;
    }

    public get isActive(): boolean {
        return this.state !== 'NONE';
    }

    public stop() {
        this.state = 'NONE';
        this.finishTimer = 0;
        this.steeringFramesRemaining = 0;
    }

    public start(meta: any) {
        this.state = 'APPROACH';
        this.timeout = 5.0;
        this.targetY = meta.targetY;
        this.finishTimer = 0;

        // ✅ Utiliser le VRAI wallX depuis le meta
        this.wallX = meta.wallX;

        // ✅ Calculer la direction depuis la position actuelle de l'ennemi
        const state = this.physics.state;
        const centerX = state.x + state.w / 2;
        this.direction = this.wallX > centerX ? 1 : -1;

        // 🆕 Solution B : Calculer la distance initiale et la durée de steering
        this.initialDistToWall = Math.abs(centerX - this.wallX);

        // Calculer combien de frames il faut pour atteindre le mur
        // On utilise la vitesse moyenne des paliers
        const avgSpeed = (this.SPEED_PRECISE + this.SPEED_SLOW + this.SPEED_NORMAL) / 3; // ≈ 1.83
        this.steeringFramesRemaining = Math.ceil(this.initialDistToWall / avgSpeed) + 15; // +15 frames de marge de sécurité

        // console.log('🧗 [ClimbHandler] Started with:', {
        //     targetY: this.targetY,
        //     wallX: this.wallX,
        //     direction: this.direction,
        //     side: meta.side,
        //     enemyX: centerX.toFixed(0),
        //     initialDist: this.initialDistToWall.toFixed(1),
        //     steeringFrames: this.steeringFramesRemaining,
        //     avgSpeed: avgSpeed.toFixed(2)
        // });
    }

    public update(dt: number): boolean {
        if (this.state === 'NONE') return false;

        const state = this.physics.state;
        this.timeout -= dt;

        switch (this.state) {
            case 'APPROACH':
                this.updateApproach();
                break;
            case 'CLIMBING':
                this.updateClimbing();
                break;
            case 'FINISHING':
                this.updateFinishing(dt);
                break;
        }

        // Global timeout
        if (this.timeout <= 0) {
            // console.error('❌ [ClimbHandler] Global timeout. Aborting.');
            this.stop();
        }

        return true;
    }

    private updateApproach() {
        const state = this.physics.state;
        const centerX = state.x + state.w / 2;
        const distToWall = Math.abs(centerX - this.wallX);

        // console.log('🔍 [ClimbHandler] APPROACH state:', {
        //     onWall: state.onWall,
        //     stateX: centerX.toFixed(1),
        //     wallX: this.wallX.toFixed(1),
        //     distToWall: distToWall.toFixed(1),
        //     vy: state.vy.toFixed(2),
        //     vx: state.vx.toFixed(2),
        //     steeringFrames: this.steeringFramesRemaining,
        //     timeout: this.timeout.toFixed(2)
        // });

        // 🆕 Solution B : Vérifier si on dépasse le mur (sécurité anti-overshoot)
        if (distToWall > this.initialDistToWall + 20) {
            // console.error('🚨 [ClimbHandler] MOVING AWAY from wall! Aborting.');
            // console.error('  Initial dist:', this.initialDistToWall.toFixed(1));
            // console.error('  Current dist:', distToWall.toFixed(1));
            // console.error('  Overshoot:', (distToWall - this.initialDistToWall).toFixed(1), 'px');
            this.stop();
            return;
        }

        // Détection du mur via EnemyPhysics
        if (state.onWall) {
            // console.log('✅ [ClimbHandler] Wall contact detected! → CLIMBING');
            this.state = 'CLIMBING';
            state.vx = 0;
            this.steeringFramesRemaining = 0;
            return;
        }

        // 🆕 Solution B : Arrêter le steering si trop proche OU si plus de frames
        if (distToWall < 3 || this.steeringFramesRemaining <= 0) {
            state.vx = 0;

            const stopReason = distToWall < 3 ? 'TOO_CLOSE' : 'FRAMES_EXPIRED';
            // console.log('🛑 [ClimbHandler] Steering STOPPED:', {
            //     reason: stopReason,
            //     distToWall: distToWall.toFixed(1),
            //     framesLeft: this.steeringFramesRemaining
            // });

            // Si on est proche et dans la bonne zone verticale, forcer le passage en CLIMBING
            if (distToWall < 8 && this.checkGrabConditions()) {
                // console.log('🔧 [ClimbHandler] Forcing CLIMBING mode (close enough + in grab zone)');
                this.state = 'CLIMBING';
                return;
            }

            // Sinon, rester en attente (l'ennemi va peut-être toucher le mur en tombant)
            return;
        }

        // 🆕 Solution D : Vitesse adaptative selon la distance au mur
        const targetVx = this.calculateAdaptiveSpeed(distToWall);
        state.vx = this.direction * targetVx;
        this.steeringFramesRemaining--;

        // Log détaillé du mode de vitesse
        const speedMode = this.getSpeedMode(distToWall);
        // console.log('🎯 [ClimbHandler] Steering active:', {
        //     vx: targetVx.toFixed(2),
        //     distToWall: distToWall.toFixed(1),
        //     framesLeft: this.steeringFramesRemaining,
        //     speedMode: speedMode
        // });
    }

    // 🆕 Solution D : Calcul de la vitesse adaptative
    private calculateAdaptiveSpeed(distToWall: number): number {
        if (distToWall < 10) {
            // Zone PRECISE : très proche, vitesse minimale pour précision maximale
            return this.SPEED_PRECISE;
        } else if (distToWall < 30) {
            // Zone SLOW : approche prudente
            return this.SPEED_SLOW;
        } else if (distToWall < 60) {
            // Zone NORMAL : vitesse standard
            return this.SPEED_NORMAL;
        } else {
            // Zone FAR : vitesse max pour rattraper rapidement
            return this.config.maxSpeed;
        }
    }

    // 🆕 Solution D : Helper pour identifier le mode de vitesse (logging)
    private getSpeedMode(distToWall: number): string {
        if (distToWall < 10) return 'PRECISE (0.5x)';
        if (distToWall < 30) return 'SLOW (1.5x)';
        if (distToWall < 60) return 'NORMAL (3.5x)';
        return `FAR (${this.config.maxSpeed.toFixed(1)}x)`;
    }

    // 🆕 Solution B : Méthode helper pour vérifier les conditions de grab
    private checkGrabConditions(): boolean {
        const state = this.physics.state;
        const feetY = state.y + state.h;

        // Vérifier qu'on est dans une zone verticale raisonnable pour grab
        // (±60px autour de la targetY pour être généreux)
        const verticalTolerance = 60;
        const isInGrabZone = Math.abs(feetY - this.targetY) < verticalTolerance;

        if (isInGrabZone) {
            // console.log('✅ [checkGrabConditions] In grab zone:', {
            //     feetY: feetY.toFixed(1),
            //     targetY: this.targetY.toFixed(1),
            //     diff: Math.abs(feetY - this.targetY).toFixed(1),
            //     tolerance: verticalTolerance
            // });
        }

        return isInGrabZone;
    }

    private updateClimbing() {
        const state = this.physics.state;

        // console.log('🧗 [ClimbHandler] CLIMBING state:', {
        //     isGrounded: state.isGrounded,
        //     onWall: state.onWall,
        //     stateY: state.y.toFixed(1),
        //     feetY: (state.y + state.h).toFixed(1),
        //     targetY: this.targetY.toFixed(1),
        //     diffToTarget: (state.y + state.h - this.targetY).toFixed(1),
        //     vy: state.vy.toFixed(2),
        //     vx: state.vx.toFixed(2)
        // });

        // Condition de succès : atterrissage sur n'importe quelle plateforme
        if (state.isGrounded) {
            // console.log('✅ [ClimbHandler] Climb complete - landed on platform.');
            this.justFinished = true;
            this.stop();
            this.executor.currentJumpVelocityX = null;
            return;
        }

        const feetY = state.y + state.h;
        const shouldFinalPush = feetY <= this.targetY + 15;

        // FINAL PUSH : quand on est proche de la hauteur cible
        if (shouldFinalPush && state.vy > -5) {
            // console.log('🚀 [ClimbHandler] Final push TRIGGERED!', {
            //     feetY: feetY.toFixed(1),
            //     targetY: this.targetY.toFixed(1),
            //     onWall: state.onWall,
            //     currentVy: state.vy.toFixed(2)
            // });

            this.state = 'FINISHING';
            this.finishTimer = 0;
            state.vy = -12; // Kick final vers le haut
            state.vx = this.direction * 3.5; // Kick final horizontal
            state.onWall = false;

            // console.log('🎯 [ClimbHandler] Final push applied:', {
            //     newVx: state.vx.toFixed(2),
            //     newVy: state.vy.toFixed(2),
            //     direction: this.direction,
            //     newState: this.state
            // });

            return;
        }

        // Regular climb logic : kick-off depuis le mur
        if (state.onWall) {
            // console.log('⚡ [ClimbHandler] Regular kick-off from wall');
            const jumpAwayX = -this.direction * this.config.wallClimbKickOffX;
            const jumpUpY = this.config.wallClimbKickOffY;

            state.vx = jumpAwayX;
            state.vy = jumpUpY;
            state.onWall = false;
            this.executor.isSquashing = true;
        } else {
            // En l'air : steering vers le mur pour ré-engagement
            const targetVx = this.direction * this.config.maxSpeed;
            let airAccel = this.config.wallClimbAirAccel;

            // Réduire l'accélération si on monte encore (pour éviter de se recoller trop tôt)
            if (state.vy < this.config.wallClimbReengageY) {
                airAccel = 0.01;
            }

            state.vx += (targetVx - state.vx) * airAccel;
        }
    }

    private updateFinishing(dt: number) {
        const state = this.physics.state;
        this.finishTimer += dt;

        // console.log('🔄 [ClimbHandler] FINISHING state:', {
        //     isGrounded: state.isGrounded,
        //     feetY: (state.y + state.h).toFixed(1),
        //     targetY: this.targetY.toFixed(1),
        //     vy: state.vy.toFixed(2),
        //     vx: state.vx.toFixed(2),
        //     onWall: state.onWall,
        //     finishTimer: this.finishTimer.toFixed(2)
        // });

        // Condition de succès : atterrissage
        if (state.isGrounded) {
            // console.log('✅ [ClimbHandler] Landed after final push.');
            this.justFinished = true;
            this.stop();
            this.executor.currentJumpVelocityX = null;
            return;
        }

        // 🆕 TIMEOUT DE SÉCURITÉ : si trop long en FINISHING, quelque chose a mal tourné
        if (this.finishTimer > 2.0) {
            // console.error('❌ [ClimbHandler] FINISHING timeout! Forcing stop.');
            // console.error('  Final position:', {
            //     x: state.x.toFixed(1),
            //     y: state.y.toFixed(1),
            //     vy: state.vy.toFixed(2)
            // });
            this.justFinished = false;
            this.stop();
            return;
        }

        // Maintenir le momentum horizontal vers la plateforme cible
        state.vx = this.direction * 2.0;
    }
}