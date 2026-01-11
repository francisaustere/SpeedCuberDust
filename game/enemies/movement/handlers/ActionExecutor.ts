
import { Point, Platform, Rect } from '../../../../types';
import { EnemyPhysics } from '../../physics/EnemyPhysics';
import { PathNavigator } from '../PathNavigator';
import { JumperConfig } from '../PlatformerMovement';
import { JumpHandler } from './JumpHandler';
import { RideHandler } from './RideHandler';
import { ClimbHandler } from './ClimbHandler';
import { BallisticSolver } from '../BallisticSolver';

export class ActionExecutor {
    private physics: EnemyPhysics;
    private navigator: PathNavigator;
    private config: JumperConfig;

    // Handlers (délégués)
    private jumpHandler: JumpHandler;
    private rideHandler: RideHandler;
    private climbHandler: ClimbHandler;
    private ballisticSolver: BallisticSolver;

    private needsWallClimbActivation: boolean = false;  // ✅ NOUVEAU
    private wallClimbMeta: any = null;                  // ✅ NOUVEAU

    // State partagé
    public isSquashing: boolean = false;
    public debugPrediction: Rect | null = null;
    public currentJumpVelocityX: number | null = null;

    constructor(physics: EnemyPhysics, navigator: PathNavigator, config: JumperConfig) {
        this.physics = physics;
        this.navigator = navigator;
        this.config = config;

        // Instancier les handlers
        this.jumpHandler = new JumpHandler(physics, config, this);
        this.rideHandler = new RideHandler(physics, navigator, config, this, () => this.onRideAborted());
        this.climbHandler = new ClimbHandler(physics, config, this);
        this.ballisticSolver = new BallisticSolver(physics, navigator, config);
    }

    public updateConfig(config: JumperConfig) {
        this.config = config;
        this.jumpHandler.updateConfig(config);
        this.rideHandler.updateConfig(config);
        this.climbHandler.updateConfig(config);
        this.ballisticSolver.updateConfig(config);
    }

    public get isBusy(): boolean {
        return this.rideHandler.isActive ||
            this.climbHandler.isActive ||
            this.jumpHandler.isActive ||
            this.currentJumpVelocityX !== null;
    }

    public stop() {
        this.jumpHandler.stop();
        this.rideHandler.stop();
        this.climbHandler.stop();
        this.currentJumpVelocityX = null;
    }

    public update(dt: number) {
        console.log('🎮 [ActionExecutor] Update:', {
            isBusy: this.isBusy,
            rideHandlerActive: this.rideHandler.isActive,
            rideHandlerState: (this.rideHandler as any).state,
            climbActive: this.climbHandler.isActive,
            climbJustFinished: this.climbHandler.justFinished,
            jumpHandlerActive: this.jumpHandler.isActive,  // ✅ NOUVEAU
            needsWallClimbActivation: this.needsWallClimbActivation,  // ✅ NOUVEAU
            currentTarget: this.navigator.getCurrentTarget() ? 'exists' : 'null',
            pathIndex: this.navigator.pathIndex,
            pathLength: this.navigator.path.length
        });

        this.isSquashing = false;

        // Priority: Ride > Climb > Jump > Path Following
        if (this.rideHandler.update(dt)) return;
        if (this.climbHandler.update(dt)) return;

        // ✅ MODIFIÉ : Check si le double jump est terminé et si on doit activer le climb
        if (this.jumpHandler.update(dt)) {
            // Si le double jump est terminé ET qu'on attend le wall climb
            if (this.needsWallClimbActivation && !this.jumpHandler.isActive) {
                console.log('🔵 [ActionExecutor] Double jump finished, activating ClimbHandler');
                this.climbHandler.start(this.wallClimbMeta);
                this.needsWallClimbActivation = false;
                this.wallClimbMeta = null;
            }
            return;
        }

        // Check si le climb vient de se terminer
        if (this.climbHandler.justFinished) {
            console.log('✅ [ActionExecutor] Climb finished! Force-advancing path.');
            this.climbHandler.justFinished = false;
            this.navigator.advance();
            this.physics.state.vx = 0;

            const nextTarget = this.navigator.getCurrentTarget();
            const nextMeta = (nextTarget as any)?.meta;
            console.log('🔍 [ActionExecutor] Next waypoint after climb:', {
                exists: !!nextTarget,
                x: nextTarget?.x.toFixed(1),
                y: nextTarget?.y.toFixed(1),
                type: nextMeta?.type || 'none',
                currentX: (this.physics.state.x + this.physics.state.w / 2).toFixed(1),
                currentY: (this.physics.state.y + this.physics.state.h).toFixed(1)
            });
        }

        // Path Following Logic
        this.handlePathFollowing(dt);
    }

    private handlePathFollowing(dt: number) {
        const state = this.physics.state;

        // 🆕 RÉINITIALISER currentJumpVelocityX DÈS QU'ON ATTERRIT
        if (state.isGrounded && !this.jumpHandler.isActive && !this.climbHandler.isActive) {
            if (this.currentJumpVelocityX !== null) {
                console.log('🔓 [ActionExecutor] Releasing jump lock (grounded)');
                this.currentJumpVelocityX = null;
            }
        }

        const target = this.navigator.getCurrentTarget();

        if (!target) {
            if (state.isGrounded) state.vx = 0;
            console.log(`❌ [ActionExecutor] NO TARGET, stopping.`);
            return;
        }

        const meta = (target as any).meta;

        // Smart Ride Shortcut
        if (meta && meta.type === 'RIDE') {
            // 🆕 FIX: Attendre d'être au sol avant d'activer le RIDE
            if (!state.isGrounded) {
                console.log('⏸️ [ActionExecutor] RIDE delayed: still airborne');
                return; // ← On attend le prochain frame
            }

            // 🆕 FIX: Refuser le RIDE si l'ennemi est contre un mur
            if (state.onWall) {
                console.log('⚠️ [ActionExecutor] RIDE blocked: enemy is against a wall!');
                return;
            }

            console.log('🚨 [ActionExecutor] RIDE action triggered!', {
                ridePlatformId: meta.ridePlatformId,
                rideHandlerState: this.rideHandler.state
            });

            if (this.rideHandler.tryShortcut(meta.ridePlatformId)) {
                console.log('✅ [ActionExecutor] Shortcut succeeded.');
                return;
            }

            // 🆕 FIX: Si le shortcut échoue, efface currentPlatformId pour éviter le BOARDING prématuré
            if (this.physics.currentPlatformId === meta.ridePlatformId) {
                console.log('🔄 [ActionExecutor] Shortcut failed, clearing currentPlatformId to avoid false BOARDING.');
                this.physics.currentPlatformId = null;
            }

            // Si le shortcut échoue, démarre le RideHandler en WAITING
            if (this.rideHandler.state === 'NONE') {
                console.log('🟡 [ActionExecutor] Shortcut failed, starting WAITING mode.');
                this.rideHandler.start(meta.ridePlatformId);
                this.navigator.advance();
            }
        }

        // Vertical Fall Check
        if (!this.isOnMovingPlatform() && state.isGrounded &&
            Math.abs(target.y - (state.y + state.h)) > 150) {
            console.log('[AI] Vertical mismatch. Clearing path.');
            this.navigator.clearPath();
            return;
        }

        const dx = target.x - (state.x + state.w / 2);

        // Mid-air tracking
        if (this.currentJumpVelocityX !== null && !state.isGrounded) {
            state.vx = this.currentJumpVelocityX;
            if (Math.abs(dx) < 20 && Math.abs(target.y - (state.y + state.h)) < 40) {
                this.debugPrediction = null;
            }
            return;
        }

        const dist = Math.abs(dx);
        const isLocalMove = !meta;
        const isRide = meta && meta.type === 'RIDE';
        // 🆕 Loose tolerance pour TOUS les waypoints sur moving platform
        const useLooseTolerance = this.isOnMovingPlatform();
        const arrivalTolerance = useLooseTolerance ? 40.0 : 5.0;

        const pushingIntoWall = state.onWall &&
            (Math.sign(dx) !== Math.sign(state.wallNormal.x)) &&
            Math.abs(state.wallNormal.x) > 0.1;
        const blocked = pushingIntoWall && dist < 20;

        let reached = dist <= arrivalTolerance || blocked;

        if (reached && meta && meta.type === 'RIDE' && !state.isGrounded) {
            reached = false;
        }

        console.log(`🎯 [ActionExecutor] Target check:`, {
            dist: dist.toFixed(1),
            tolerance: arrivalTolerance.toFixed(1),
            reached,
            hasMeta: !!meta,
            metaType: meta?.type || 'none',
            isGrounded: state.isGrounded
        });

        if (!reached) {
            // WALK safety checks
            if (meta && meta.type === 'WALK') {
                if (!this.ballisticSolver.isTargetPlatformReady(meta.targetSurfaceId, meta, target.x)) {
                    state.vx = 0;
                    console.log(`⚠️ [ActionExecutor] Target platform NOT READY (WALK)`);
                    return;
                }

                if (this.isOnMovingPlatform() && !this.isSafeToWalkAhead(dx)) {
                    state.vx = 0;
                    console.log(`⚠️ [ActionExecutor] NOT SAFE to walk ahead (moving platform)`);
                    return;
                }
            }

            state.vx = Math.sign(dx) * this.config.maxSpeed;
            console.log(`🚶 [ActionExecutor] Walking towards target, vx=${state.vx.toFixed(2)}`);
            this.debugPrediction = null;
        } else {
            console.log(`✅ [ActionExecutor] Target REACHED, triggering action or advancing`);
            // Action Trigger
            if (meta) {
                this.triggerAction(meta, target);
            } else {
                this.navigator.advance();
            }
        }

        // Release jump lock when grounded
        if (state.isGrounded && !this.jumpHandler.isActive && !this.climbHandler.isActive) {
            this.currentJumpVelocityX = null;
        }
    }

    private triggerAction(meta: any, target: any) {
        const state = this.physics.state;

        // 🆕 LOGIQUE UNIFIÉE
        let landingX: number;

        if (meta.destX !== undefined) {
            // Cas 1: destX est défini (overlap, precision jump)
            landingX = meta.destX;
        } else {
            // Cas 2: destX n'est pas défini → utilise nextNode
            const nextNode = this.navigator.path[this.navigator.pathIndex + 1];
            landingX = nextNode ? nextNode.x : target.x;
        }

        console.log('🎯 [triggerAction] Landing X calculation:', {
            metaType: meta.type,
            hasDestX: meta.destX !== undefined,
            destX: meta.destX?.toFixed(1) || 'none',
            nextNodeExists: !!this.navigator.path[this.navigator.pathIndex + 1],
            finalLandingX: landingX.toFixed(1)
        });

        // Platform Ready Check
        if (['JUMP', 'DOUBLE_JUMP', 'FALL', 'WALL_CLIMB', 'WALK'].includes(meta.type)) {
            if (!this.ballisticSolver.isTargetPlatformReady(meta.targetSurfaceId, meta, landingX)) {
                state.vx = 0;
                console.log('⏸️ [triggerAction] Platform NOT READY, waiting...');
                return;
            }
        }

        // Snap to edge for precision
        const dx = target.x - (state.x + state.w / 2);
        if (Math.abs(dx) < 10 && ['JUMP', 'DOUBLE_JUMP', 'FALL', 'WALL_CLIMB'].includes(meta.type)) {
            state.x = target.x - state.w / 2;
            state.vx = 0;
        }

        const distY = Math.abs((state.y + state.h) - target.y);
        const toleranceY = this.isOnMovingPlatform() ? 40.0 : 5.0;
        const isReady = state.isGrounded || distY < toleranceY;

        if (!state.isGrounded && this.currentJumpVelocityX !== null && ['JUMP', 'DOUBLE_JUMP'].includes(meta.type)) {
            console.log(`⚠️ [ActionExecutor] Jump already in progress, skipping retrigger`);
            return;
        }

        // Dispatch to handlers
        switch (meta.type) {
            case 'JUMP':
                console.log('🔵 [ActionExecutor] JUMP triggered', {
                    isReady,
                    isGrounded: state.isGrounded,
                    distY: distY.toFixed(1),
                    toleranceY,
                    landingX: landingX.toFixed(1),
                    landingY: meta.targetY.toFixed(1),
                    currentX: (state.x + state.w / 2).toFixed(1),
                    currentY: (state.y + state.h).toFixed(1),
                    targetSurfaceId: meta.targetSurfaceId,
                    ridePlatformId: meta.ridePlatformId,
                    ridePlatformIdType: typeof meta.ridePlatformId,
                    metaKeys: Object.keys(meta)
                });

                if (isReady) {
                    console.log('🎯 [ActionExecutor] Calling recalculateJump with:', {
                        ridePlatformId: meta.ridePlatformId,
                        ridePlatformIdExists: meta.ridePlatformId !== undefined
                    });
                    const jumpVel = this.ballisticSolver.recalculateJump(
                        { x: state.x + state.w / 2, y: state.y + state.h },
                        { x: landingX, y: meta.targetY },
                        meta.ridePlatformId
                    ) || meta.velocity;

                    console.log('  ➡️ Jump velocity:', {
                        vx: jumpVel.x.toFixed(2),
                        vy: jumpVel.y.toFixed(2)
                    });

                    this.jumpHandler.performJump(jumpVel);
                    this.navigator.advance();
                }
                break;

            case 'DOUBLE_JUMP':
                console.log('🔵 [ActionExecutor] DOUBLE_JUMP triggered', {
                    hasWallClimbAccess: !!meta.wallClimbAccess
                });

                if (isReady) {
                    this.jumpHandler.performDoubleJump(meta);

                    // ✅ Si c'est un accès au wall climb, active le flag
                    if (meta.wallClimbAccess) {
                        console.log('🧗 [ActionExecutor] DOUBLE_JUMP is wall climb access, setting flag');
                        this.needsWallClimbActivation = true;

                        // Récupérer le prochain waypoint (WALL_CLIMB)
                        const nextWaypoint = this.navigator.path[this.navigator.pathIndex + 1];
                        if (nextWaypoint && (nextWaypoint as any).meta) {
                            this.wallClimbMeta = (nextWaypoint as any).meta;
                            console.log('  📝 Stored wallClimbMeta:', this.wallClimbMeta);
                        }
                    }

                    this.navigator.advance();
                }
                break;

            case 'WALL_CLIMB':
                console.log('🧗 [ActionExecutor] WALL_CLIMB triggered', {
                    jumpType: meta.jumpType,
                    wallEntryY: meta.wallEntryY?.toFixed(1),
                    isReady,
                    isGrounded: state.isGrounded
                });

                if (isReady) {
                    if (meta.jumpType === 'DOUBLE_JUMP') {
                        console.log('🔵 [ActionExecutor] WALL_CLIMB with DOUBLE_JUMP mode activated');

                        const doubleJumpMeta = {
                            velocity: meta.velocity,
                            secondVelocity: {
                                x: meta.velocity.x,
                                y: this.config.jumpForce
                            },
                            delay: 0.25
                        };

                        // ✅ Lance le double jump
                        this.jumpHandler.performDoubleJump(doubleJumpMeta);

                        // ✅ NE PAS activer le ClimbHandler tout de suite !
                        // On l'active seulement APRÈS le 2e saut, via un flag
                        this.needsWallClimbActivation = true;
                        this.wallClimbMeta = meta;

                    } else {
                        console.log('🔵 [ActionExecutor] WALL_CLIMB with SINGLE_JUMP');
                        this.climbHandler.start(meta);
                    }

                    this.navigator.advance();
                }
                break;

            case 'RIDE':
                this.rideHandler.start(meta.ridePlatformId);
                break;

            case 'FALL':
                state.vx = meta.velocity.x;
                state.isGrounded = false;
                this.navigator.advance();
                break;

            default:
                this.navigator.advance();
        }
    }

    private onRideAborted() {
        console.log('⚠️ [ActionExecutor] RIDE ABORTED! Clearing path to force repath.');

        // 🆕 Vide le path pour forcer un recalcul
        this.navigator.clearPath();
    }

    private isSafeToWalkAhead(dx: number): boolean {
        const state = this.physics.state;
        const dir = Math.sign(dx);
        const aheadX = state.x + (state.w / 2) + (dir * (state.w / 2 + 20));
        const aheadY = state.y + state.h + 5;

        for (const p of this.physics.platforms) {
            if (aheadX >= p.x && aheadX <= p.x + p.w &&
                aheadY >= p.y && aheadY <= p.y + p.h + 10) {
                return true;
            }
        }
        return false;
    }

    private isOnMovingPlatform(): boolean {
        if (this.physics.currentPlatformId === null) return false;
        const p = this.physics.platforms.find(plat => plat.id === this.physics.currentPlatformId);
        return !!(p && (p.moving || p.type === 'moving'));
    }

    // Public API for handlers
    public performJump(vel: Point) {
        const state = this.physics.state;
        state.vx = vel.x;
        state.vy = vel.y;
        this.currentJumpVelocityX = vel.x;

        state.y -= 4.0;
        state.isGrounded = false;

        this.physics.ignorePlatformId = this.physics.findCurrentPlatformId();
        this.physics.ignoreTimer = 0.5;

        this.isSquashing = true;
        this.debugPrediction = null;
    }
}
