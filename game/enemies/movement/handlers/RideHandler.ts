import { Platform } from '../../../../types';
import { EnemyPhysics } from '../../physics/EnemyPhysics';
import { PathNavigator } from '../PathNavigator';
import { JumperConfig } from '../PlatformerMovement';
import { ActionExecutor } from './ActionExecutor';

export class RideHandler {
    private physics: EnemyPhysics;
    private navigator: PathNavigator;
    private config: JumperConfig;
    private executor: ActionExecutor;
    private onAbortCallback?: () => void; // 🆕 Callback

    public state: 'NONE' | 'WAITING' | 'BOARDING' | 'RIDING' = 'NONE';
    public platformId: number | null = null;
    private boardingTimer: number = 0;

    // Cache pour smart logging
    private lastLoggedState: string = '';
    private lastLoggedPlatformId: number | null = null;

    private globalTimer: number = 0;              // 🆕
    private readonly MAX_WAIT_TIME: number = 5.0; // 🆕 5 secondes max

    constructor(
        physics: EnemyPhysics,
        navigator: PathNavigator,
        config: JumperConfig,
        executor: ActionExecutor,
        onAbort?: () => void // 🆕 Paramètre optionnel
    ) {
        this.physics = physics;
        this.navigator = navigator;
        this.config = config;
        this.executor = executor;
        this.onAbortCallback = onAbort; // 🆕
    }

    public updateConfig(config: JumperConfig) {
        this.config = config;
    }

    public get isActive(): boolean {
        return this.state !== 'NONE';
    }

    public stop() {
        this.state = 'NONE';
        this.platformId = null;

        // 🆕 Appelle le callback si défini
        if (this.onAbortCallback) {
            this.onAbortCallback();
        }
    }

    public start(platformId: number) {
        // 🆕 CHECK: Vérifier si la plateforme existe et si on est proche verticalement
        const targetPlatform = this.physics.platforms.find(p => p.id === platformId);
        if (targetPlatform) {
            const state = this.physics.state;
            const distY = Math.abs(targetPlatform.y - (state.y + state.h));
            if (distY > 150) {
                console.log('❌ [RideHandler] Start aborted: too far vertically', {
                    distY: distY.toFixed(1),
                    myY: (state.y + state.h).toFixed(1),
                    targetY: targetPlatform.y.toFixed(1)
                });
                return; // ← Ne démarre PAS le handler !
            }
        }

        this.state = 'WAITING';
        this.platformId = platformId;
        this.physics.state.vx = 0;
        this.globalTimer = 0; // 🆕 Reset timer
    }

    public tryShortcut(targetPlatformId: number): boolean {
        const state = this.physics.state;
        const plat = this.physics.platforms.find(p => p.id === targetPlatformId);

        if (!plat) {
            console.log('[RideHandler] Platform not found:', targetPlatformId);
            return false;
        }

        const feetY = state.y + state.h;
        const cx = state.x + state.w / 2;

        // 🆕 VÉRIFIE QUE L'ENNEMI N'EST PAS CONTRE UN MUR
        if (state.onWall) {
            console.log('⚠️ [RideHandler] Shortcut DENIED: enemy is against a wall!');
            return false;
        }

        // Conditions élargies
        const onPlatformX = cx >= plat.x - 10 && cx <= plat.x + plat.w + 10;
        const onPlatformY = Math.abs(feetY - plat.y) < 20;
        const physicallyOn = onPlatformX && onPlatformY;

        // 🆕 Si on utilise currentPlatformId, VÉRIFIE l'alignement vertical
        if (state.isGrounded && this.physics.currentPlatformId === targetPlatformId) {
            const enemyBottom = state.y + state.h;
            const platformTop = plat.y;
            const verticalDist = Math.abs(enemyBottom - platformTop);

            if (verticalDist > 10) {
                console.log('⚠️ [RideHandler] Shortcut DENIED: not vertically aligned!', {
                    enemyBottom: enemyBottom.toFixed(1),
                    platformTop: platformTop.toFixed(1),
                    verticalDist: verticalDist.toFixed(1)
                });
                return false;
            }
        }

        if (physicallyOn || (state.isGrounded && this.physics.currentPlatformId === targetPlatformId)) {
            console.log('✅ [RideHandler] Shortcut success!');
            this.state = 'RIDING';
            this.platformId = targetPlatformId;
            state.vx = 0;
            this.physics.currentPlatformId = targetPlatformId;
            return true;
        }

        return false;
    }

    public update(dt: number): boolean {
        if (this.state === 'NONE') return false;

        // 🆕 Timeout global
        this.globalTimer += dt;
        if (this.globalTimer > this.MAX_WAIT_TIME) {
            console.log('⏰ [RideHandler] Global timeout! Requesting repath.');
            this.stop();
            return true;
        }

        const platform = this.physics.platforms.find(p => p.id === this.platformId);
        if (!platform) {
            console.warn('❌ [RideHandler] Platform not found!', this.platformId);
            this.stop();
            return true;
        }

        // Log seulement sur changement d'état
        const currentLog = `${this.state}|${this.physics.currentPlatformId}`;
        if (currentLog !== this.lastLoggedState) {
            console.log(`🔄 [RideHandler] State: ${this.state} | grounded: ${this.physics.state.isGrounded} | currentPlatform: ${this.physics.currentPlatformId} | targetPlatform: ${this.platformId}`);
            this.lastLoggedState = currentLog;
        }

        switch (this.state) {
            case 'WAITING':
                this.updateWaiting(dt, platform);
                break;
            case 'BOARDING':
                this.updateBoarding(dt, platform);
                break;
            case 'RIDING':
                this.updateRiding(dt, platform);
                break;
        }

        return true;
    }

    private updateWaiting(dt: number, platform: Platform) {
        const state = this.physics.state;

        // Safety: check station bounds
        if (this.navigator.pathIndex > 0) {
            const startStation = this.navigator.path[this.navigator.pathIndex - 1];
            const myY = state.y + state.h;

            if (!this.physics.currentPlatformId && !state.isGrounded &&
                Math.abs(myY - startStation.y) > 100) {
                console.log('[RideHandler] Fell off station. Aborting.');
                this.stop();
                return;
            }
        }

        // Instant boarding si déjà sur la plateforme
        if (state.isGrounded && this.physics.currentPlatformId === this.platformId) {
            console.log('🟢 [RideHandler] Already on target platform → BOARDING');
            this.state = 'BOARDING';
            this.boardingTimer = 0;
            return;
        }

        // Se déplacer vers la plateforme en attendant
        const myCx = state.x + state.w / 2;
        const pCx = platform.x + platform.w / 2;
        const dx = pCx - myCx;

        // 🆕 Détection de blocage : plateforme trop loin + stuck depuis trop longtemps
        if (Math.abs(dx) > 200 && this.globalTimer > 2.0) {
            console.log('⚠️ [RideHandler] Platform unreachable! Aborting.');
            this.stop();
            return;
        }

        // LOG DÉTAILLÉ DU TIMING
        const myFeetYPos = state.y + state.h;
        const pTopY = platform.y;
        const pVx = platform.currentVx || 0;
        const velocityXPerSec = platform.velocityX || 0;

        console.log('⏱️ [RideHandler] WAITING state:', {
            myCx: myCx.toFixed(1),
            platformCx: pCx.toFixed(1),
            dx: dx.toFixed(1),
            platformVx: pVx.toFixed(4),
            platformVelocityX: velocityXPerSec.toFixed(2),
            isGrounded: state.isGrounded,
            onWall: state.onWall,
            dy: Math.abs(myFeetYPos - pTopY).toFixed(1)
        });

        // Si grounded et loin de la plateforme, marche vers elle
        if (state.isGrounded && Math.abs(dx) > 20) {
            // 🆕 CHECK: Ne pas tomber du bord de la plateforme actuelle
            const currentPlatform = this.physics.platforms.find(p => p.id === this.physics.currentPlatformId);

            if (currentPlatform) {
                const enemyCx = state.x + state.w / 2;
                const platformLeft = currentPlatform.x;
                const platformRight = currentPlatform.x + currentPlatform.w;
                const margin = 50; // Marge de sécurité

                // Si on marche vers la gauche et qu'on est proche du bord gauche
                if (dx < 0 && enemyCx < platformLeft + margin) {
                    console.log('⚠️ [RideHandler] Too close to left edge! Stopping.');
                    state.vx = 0;
                }
                // Si on marche vers la droite et qu'on est proche du bord droit
                else if (dx > 0 && enemyCx > platformRight - margin) {
                    console.log('⚠️ [RideHandler] Too close to right edge! Stopping.');
                    state.vx = 0;
                }
                // Sinon, marche normalement
                else {
                    state.vx = Math.sign(dx) * this.config.maxSpeed;
                }
            } else {
                // Pas de plateforme actuelle, marche quand même
                state.vx = Math.sign(dx) * this.config.maxSpeed;
            }
        } else {
            state.vx = 0;
        }

        const myFeetY = state.y + state.h;
        const pVxForCalc = platform.currentVx || 0;

        const distToPlat = Math.abs(dx);
        const framesToReach = (distToPlat / this.config.maxSpeed) + 15;
        const lookaheadFrames = Math.max(30, Math.min(180, framesToReach));

        let predictedPCx = pCx + (pVxForCalc * lookaheadFrames);

        // Smoothstep simulation
        if (platform.moving && platform.movingTimer !== undefined) {
            const { start, end, duration } = platform.moving;
            const tFuture = platform.movingTimer + (lookaheadFrames / 60);
            const cycleTime = 2 * duration;
            const t = tFuture % cycleTime;
            let alpha = t / duration;
            if (alpha > 1.0) alpha = 2.0 - alpha;
            const ease = alpha * alpha * (3 - 2 * alpha);

            const newX = start.x + (end.x - start.x) * ease;
            predictedPCx = newX + platform.w / 2;
        }

        const dxPredicted = Math.abs(predictedPCx - myCx);
        const dxActual = Math.abs(dx);
        const dy = Math.abs(myFeetY - pTopY);

        // 🆕 CONDITIONS STRICTES POUR BOARDING
        const horizontallyAligned = (dxPredicted < 150 || dxActual < 150);
        const verticallyClose = dy < 25;
        const isGrounded = state.isGrounded;
        const notAgainstWall = !state.onWall;

        if (horizontallyAligned && verticallyClose && isGrounded && notAgainstWall) {
            console.log('🟡 [RideHandler] Platform in range → BOARDING', {
                dxPredicted: dxPredicted.toFixed(1),
                dxActual: dxActual.toFixed(1),
                dy: dy.toFixed(1),
                isGrounded,
                onWall: state.onWall
            });
            this.state = 'BOARDING';
            this.boardingTimer = 0;
        }
    }

    private updateBoarding(dt: number, platform: Platform) {
        const state = this.physics.state;
        this.boardingTimer += dt;

        if (this.boardingTimer > 4.0) {
            console.log('⏱️ [RideHandler] Boarding timeout.');
            this.stop();
            return;
        }

        const pCx = platform.x + platform.w / 2;
        const myCx = state.x + state.w / 2;
        const dx = pCx - myCx;

        if (Math.abs(dx) > 10) {
            state.vx = Math.sign(dx) * this.config.maxSpeed;
        } else {
            state.vx = 0;
        }

        // Log seulement quand grounded change
        if (state.isGrounded && this.lastLoggedPlatformId !== this.physics.currentPlatformId) {
            console.log('🟢 [RideHandler] Grounded! currentPlatform:', this.physics.currentPlatformId, 'target:', this.platformId, 'match:', this.physics.currentPlatformId === this.platformId);
            this.lastLoggedPlatformId = this.physics.currentPlatformId;
        }

        // Success condition
        if (state.isGrounded) {
            if (this.physics.currentPlatformId === this.platformId) {
                console.log('✅ [RideHandler] BOARDING → RIDING');
                this.state = 'RIDING';
                state.vx = 0;
            } else if (this.boardingTimer > 1.0) {
                console.log('❌ [RideHandler] Wrong platform. Need repath.');
                this.stop();
            }
        }
    }

    private updateRiding(dt: number, platform: Platform) {
        const state = this.physics.state;

        // Se recentrer automatiquement sur la plateforme
        const myCx = state.x + state.w / 2;
        const platformCx = platform.x + platform.w / 2;
        const offsetX = platformCx - myCx;

        // Si trop décalé, marche vers le centre
        if (Math.abs(offsetX) > 10) {
            state.vx = Math.sign(offsetX) * (this.config.maxSpeed * 0.5);
        } else {
            state.vx = 0;
        }

        // Safety: bounds check
        const platTop = platform.y;
        const platBot = platform.y + platform.h;
        const platLeft = platform.x;
        const platRight = platform.x + platform.w;

        const myFeet = state.y + state.h;
        const myX = state.x + state.w / 2;

        const inBox = (myX >= platLeft - 20 && myX <= platRight + 20 &&
            myFeet >= platTop - 10 && myFeet <= platBot + 50);

        if (!inBox && !state.isGrounded) {
            console.log('[RideHandler] Out of bounds. Aborting.');
            this.stop();
            return;
        }

        const path = this.navigator.path;
        const currentIndex = this.navigator.pathIndex;

        // Si on est au dernier nœud
        if (currentIndex >= path.length - 1) {
            console.log('[RideHandler] End of path reached.');
            this.stop();
            return;
        }

        const nextNode = path[currentIndex + 1];

        if (!nextNode) {
            console.log('[RideHandler] No next node.');
            this.stop();
            return;
        }

        const myFeetY = state.y + state.h;

        const dx = nextNode.x - myCx;
        const dy = nextNode.y - myFeetY;

        console.log('🔍 [RIDING] Next waypoint check:', {
            pathIndex: currentIndex,
            pathLength: path.length,
            myCx: myCx.toFixed(1),
            myFeetY: myFeetY.toFixed(1),
            nextX: nextNode.x.toFixed(1),
            nextY: nextNode.y.toFixed(1),
            nextMeta: (nextNode as any).meta?.type || 'WALK',
            dx: dx.toFixed(1),
            dy: dy.toFixed(1),
            absDx: Math.abs(dx).toFixed(1),
            absDy: Math.abs(dy).toFixed(1),
            tolerance: 120,
            willReachDestination: (Math.abs(dx) < 120 && Math.abs(dy) < 120)
        });

        // Check si on est proche du bord de la plateforme
        const nextMeta = (nextNode as any).meta;
        if (nextMeta && nextMeta.type === 'JUMP') {
            const platformLeft = platform.x;
            const distToLeftEdge = myCx - platformLeft;

            console.log('🎯 [RIDING] Jump edge check:', {
                myCx: myCx.toFixed(1),
                platformLeft: platformLeft.toFixed(1),
                distToLeftEdge: distToLeftEdge.toFixed(1),
                shouldJump: distToLeftEdge < 60
            });

            // Si on est proche du bord gauche (< 60px), stop le RIDE pour trigger le JUMP
            if (distToLeftEdge < 60) {
                console.log('🎯 [RideHandler] Near platform edge, stopping RIDE for JUMP.');
                this.stop();
                return;
            }
        }

        // Tolérance BEAUCOUP plus grande pour moving platforms
        const isMoving = platform.moving || platform.type === 'moving';
        const tolerance = isMoving ? 250 : 120;

        if (Math.abs(dx) < tolerance && Math.abs(dy) < tolerance) {
            console.log('🎯 [RideHandler] Near next waypoint, advancing path.');
            this.stop();
            this.navigator.advance();
        }
    }
}