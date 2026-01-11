import { IDroneState } from './IDroneState';
import { EnemyDrone } from '../../components/EnemyDrone';
import { DronePatrolState } from './DronePatrolState';
import { GridPathFinder } from '../../ai/navigation/GridPathFinder';
import { Point } from '../../../types';
import { Shooter } from '../../components/Shooter';

export class DroneChaseState implements IDroneState {
    name = 'Chase';

    public lostTimer: number = 0;
    public lastKnownPosition: Point | null = null;
    public debugPhase: string = "LOCKED";

    private pathIndex: number = 0;
    private repathTimer: number = 0;
    private stuckTimer: number = 0;
    private bounceTimer: number = 0;
    private scanTimer: number = 0;

    private hasReachedCurrentTarget: boolean = false;
    private cheatPhase: number = 0;

    private readonly MIN_RANGE = 120;
    private readonly SEEK_RANGE = 350;

    enter(drone: EnemyDrone, config?: any): void {
        this.bounceTimer = 0;
        this.stuckTimer = 0;
        this.repathTimer = 0;
        this.lostTimer = 0;
        this.scanTimer = 0;

        this.hasReachedCurrentTarget = false;
        this.cheatPhase = 0;

        const player = drone.getPlayer();
        if (player) {
            this.lastKnownPosition = { x: player.x, y: player.y };
        } else {
            this.lastKnownPosition = { x: drone.state.x, y: drone.state.y };
        }

        drone.setSpotlightColor(0xFF0000);
        drone.setScannerVisible(false);
        drone.searchZoneDebug = null;
        this.debugPhase = "LOCKED";

        this.updatePath(drone, config);

        if (drone.smoothedTargetY === null) {
            drone.smoothedTargetY = drone.state.y;
        }

        drone.activeSpeedLimit = drone.maxSpeed;

        // Ensure shooter is enabled
        const shooter = drone.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = true;
    }

    update(drone: EnemyDrone, dt: number, config?: any): IDroneState | null {
        drone.activeSpeedLimit = drone.maxSpeed;

        drone.viewDist = drone.chaseViewDist;

        const player = drone.getPlayer();

        if (!player || player.isDead) {
            return new DronePatrolState();
        }

        let isHovering = false;

        // 1. Movement & Steering Logic
        if (this.bounceTimer > 0) {
            this.bounceTimer -= dt;
        } else {
            const distSq = Math.pow(player.x - drone.state.x, 2) + Math.pow(player.y - drone.state.y, 2);
            const chaseDistSq = Math.pow(drone.chaseViewDist * 100, 2);

            const inRange = distSq < chaseDistSq;
            const hasLOS = inRange && drone.checkLineOfSight(player);

            // SHOOTER CONTROL: Only shoot if LOS
            const shooter = drone.gameObject.getComponent(Shooter);
            if (shooter) shooter.enabled = hasLOS;

            if (hasLOS) {
                this.debugPhase = "ENGAGING";
                this.hasReachedCurrentTarget = false;
                this.cheatPhase = 0;
                this.lastKnownPosition = { x: player.x, y: player.y };
                this.lostTimer = 0;
                drone.setScannerVisible(false);
                drone.setSpotlightColor(0xFF0000);

                drone.currentPath = [];

                const dx = (player.x + player.w / 2) - (drone.state.x + drone.state.w / 2);
                const dy = (player.y + player.h / 2) - (drone.state.y + drone.state.h / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < this.MIN_RANGE) {
                    drone.applyThrust(-dx / dist * drone.acceleration, -dy / dist * drone.acceleration);
                } else if (dist > this.SEEK_RANGE) {
                    drone.applyThrust(dx / dist * drone.acceleration, dy / dist * drone.acceleration);
                } else {
                    drone.applyNoise(dt, 10.0);
                    const time = performance.now() / 1000;
                    const strafe = Math.sin(time) * 5.0;
                    drone.applyThrust((-dy / dist) * strafe * dt, (dx / dist) * strafe * dt);

                    isHovering = true;
                }
            } else {
                if (this.hasReachedCurrentTarget) {
                    if (this.cheatPhase === 0) {
                        this.debugPhase = "CHEAT: ACQUIRING TARGET";
                        this.cheatPhase = 1;
                        this.hasReachedCurrentTarget = false;

                        // NEW: Fuzzy Logic for Intuition
                        const cheatDist = config?.enemyConfig?.droneCheatLKPDistance ?? 200;
                        let targetLKP: Point = { x: player.x, y: player.y };

                        if (cheatDist > 0) {
                            const angle = Math.random() * Math.PI * 2;
                            const dist = Math.random() * cheatDist;
                            targetLKP = {
                                x: player.x + Math.cos(angle) * dist,
                                y: player.y + Math.sin(angle) * dist
                            };
                        }

                        // VALIDATE LKP: Ensure it's not inside a wall (Red Node)
                        const life = drone.bounds.life;
                        const level = drone.bounds.level;
                        const bounds = {
                            x: life.x,
                            y: life.y,
                            w: life.w,
                            h: (level.y + level.h) - life.y
                        };
                        const clearance = config?.pathfindingConfig?.nodeClearance ?? 35;
                        const spatialHash = config?.spatialHash;

                        // Try to snap to valid location. If snap fails (null), fallback to exact player position.
                        const validLKP = GridPathFinder.snapToValidLocation(targetLKP, drone.platforms, bounds, clearance, spatialHash);
                        this.lastKnownPosition = validLKP || { x: player.x, y: player.y };

                        this.repathTimer = 0;
                    } else {
                        this.debugPhase = "SEARCHING";
                        this.lostTimer += dt;
                        drone.viewDist = drone.scanRadius / 100;
                        drone.state.vx *= 0.95;
                        drone.state.vy *= 0.95;
                        drone.transform.rotation.z += Math.sin(this.lostTimer * 3) * 0.05;

                        drone.setSpotlightColor(0x00FFFF);
                        drone.setScannerVisible(true);

                        if (this.scanTimer <= 0 && this.scanTimer > -0.1) {
                            this.scanTimer = drone.scanDuration;
                        }

                        this.scanTimer -= dt;

                        if (this.scanTimer <= 0) {
                            const detectedPos = drone.performRadarScan();
                            if (detectedPos) {
                                this.lastKnownPosition = { x: detectedPos.x, y: detectedPos.y };
                                this.hasReachedCurrentTarget = false;
                                drone.setScannerVisible(false);
                                drone.setSpotlightColor(0xFF0000);
                                this.lostTimer = 0;
                                this.scanTimer = 0;
                            } else {
                                this.scanTimer = drone.scanDuration;
                            }
                        }

                        if (this.lostTimer > drone.lostThreshold) {
                            return new DronePatrolState();
                        }

                        isHovering = true;
                    }
                } else {
                    this.debugPhase = this.cheatPhase === 0 ? "GOING TO LKP 1" : "GOING TO LKP 2";
                    drone.setScannerVisible(false);
                    drone.setSpotlightColor(0xFF0000);

                    if (this.lastKnownPosition) {
                        const dx = this.lastKnownPosition.x - drone.state.x;
                        const dy = this.lastKnownPosition.y - drone.state.y;
                        const distToLKP = Math.sqrt(dx * dx + dy * dy);
                        if (distToLKP < drone.waypointThreshold) {
                            this.hasReachedCurrentTarget = true;
                            this.scanTimer = 0;
                        }
                    }

                    this.repathTimer -= dt;
                    if (this.repathTimer <= 0) {
                        this.updatePath(drone, config);
                        this.repathTimer = 0.25;
                    }

                    if (drone.currentPath.length > 0) {
                        if (this.pathIndex < drone.currentPath.length) {
                            const target = drone.currentPath[this.pathIndex];
                            const dx = target.x - drone.state.x;
                            const dy = target.y - drone.state.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < drone.waypointThreshold) {
                                this.pathIndex++;
                            }

                            if (this.pathIndex < drone.currentPath.length) {
                                const pt = drone.currentPath[this.pathIndex];
                                drone.applyThrustTowards(pt.x, pt.y);
                            } else {
                                if (this.lastKnownPosition) {
                                    drone.applyThrustTowards(this.lastKnownPosition.x, this.lastKnownPosition.y);
                                }
                            }
                        } else {
                            if (this.lastKnownPosition) {
                                drone.applyThrustTowards(this.lastKnownPosition.x, this.lastKnownPosition.y);
                            }
                        }
                    } else {
                        if (this.lastKnownPosition) {
                            drone.applyThrustTowards(this.lastKnownPosition.x, this.lastKnownPosition.y);
                        }
                    }
                }
            }
        }

        if (this.bounceTimer <= 0 && !isHovering) {
            const speed = Math.sqrt(drone.state.vx * drone.state.vx + drone.state.vy * drone.state.vy);

            if (speed < 1.0) {
                this.stuckTimer += dt;
            } else {
                this.stuckTimer = 0;
            }

            if (this.stuckTimer > 1.0) {
                this.debugPhase = "UNSTICK";
                const angle = Math.random() * Math.PI * 2;
                const impulse = 15.0;
                drone.state.vx = Math.cos(angle) * impulse;
                drone.state.vy = Math.sin(angle) * impulse;

                this.bounceTimer = 0.4;
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }

        drone.applyPhysics();

        return null;
    }

    exit(drone: EnemyDrone): void {
        drone.currentPath = [];
        drone.transform.rotation.z = 0;
        drone.setScannerVisible(false);
    }

    private updatePath(drone: EnemyDrone, config?: any) {
        if (!this.lastKnownPosition) return;

        const start = { x: drone.state.x, y: drone.state.y };
        const target = this.lastKnownPosition;

        const costs = config?.pathfindingConfig
            ? { default: config.pathfindingConfig.defaultCost, blocked: config.pathfindingConfig.blockedCost }
            : { default: 1, blocked: 1000 };

        const clearance = config?.pathfindingConfig?.nodeClearance ?? 35;

        const life = drone.bounds.life;
        const level = drone.bounds.level;
        const bounds = {
            x: life.x,
            y: life.y,
            w: life.w,
            h: (level.y + level.h) - life.y
        };

        const spatialHash = config?.spatialHash;

        // Fix: Use 'GridPathFinder' instead of 'Pathfinder'
        drone.currentPath = GridPathFinder.findPath(
            start,
            target,
            drone.platforms,
            bounds,
            clearance,
            true,
            costs,
            spatialHash
        );
        this.pathIndex = 0;
    }
}