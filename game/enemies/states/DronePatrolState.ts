import { IDroneState } from './IDroneState';
import { EnemyDrone } from '../../components/EnemyDrone';
import { DroneSurpriseState } from './DroneSurpriseState';
import { GridPathFinder } from '../../ai/navigation/GridPathFinder';
import { Point } from '../../../types';
import { Shooter } from '../../components/Shooter';

export class DronePatrolState implements IDroneState {
    name = 'Patrol';
    private wanderTimer: number = 0;
    private pathIndex: number = 0;

    // Stuck Logic
    private stuckTimer: number = 0;

    enter(drone: EnemyDrone, config?: any): void {
        drone.setSpotlightColor(0xFFFF00); // Yellow
        drone.blinkTimer = 0; // Fix: Reset blink timer on entry to clear previous states
        drone.searchZoneDebug = null; // Clear chase debug if any

        // Stabilize velocity when entering patrol to avoid momentum crashes
        drone.state.vx *= 0.1;
        drone.state.vy *= 0.1;

        // Use default weights initially
        this.setNewGlobalTarget(drone, { default: 1, blocked: 1000 }, config);

        // Enforce Patrol Speed Limit
        drone.activeSpeedLimit = drone.patrolSpeed;

        // Disable Shooter (Stop firing/tracking while patrolling)
        const shooter = drone.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = false;
    }

    update(drone: EnemyDrone, dt: number, config?: any): IDroneState | null {
        // Update active limit (live tweaking support)
        drone.activeSpeedLimit = drone.patrolSpeed;

        // Retrieve Pathfinding Config
        const costs = config?.pathfindingConfig
            ? { default: config.pathfindingConfig.defaultCost, blocked: config.pathfindingConfig.blockedCost }
            : { default: 1, blocked: 1000 };

        // 1. Check for Player
        if (drone.detectPlayer()) {
            return new DroneSurpriseState();
        }

        // 2. Navigation
        if (drone.currentPath.length > 0 && this.pathIndex < drone.currentPath.length) {
            const target = drone.currentPath[this.pathIndex];
            const dx = target.x - drone.state.x;
            const dy = target.y - drone.state.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Use Configurable Threshold
            if (dist < drone.waypointThreshold) {
                this.pathIndex++;
                this.stuckTimer = 0; // Progress resets stuck timer
            } else {
                // Fly towards waypoint with NORMALIZED acceleration
                drone.applyThrustTowards(target.x, target.y);

                // STUCK CHECK: If we are applying thrust but moving very slowly
                const speed = Math.sqrt(drone.state.vx * drone.state.vx + drone.state.vy * drone.state.vy);
                if (speed < 0.2) {
                    this.stuckTimer += dt;
                    if (this.stuckTimer > 1.0) {
                        // Stuck for 1s? Force repath
                        this.setNewGlobalTarget(drone, costs, config);
                    }
                } else {
                    this.stuckTimer = 0;
                }
            }
        } else {
            // Path complete or invalid, drift and wait
            this.wanderTimer -= dt;
            if (this.wanderTimer <= 0) {
                this.setNewGlobalTarget(drone, costs, config);
            }
        }

        // 3. Physics
        drone.applyNoise(dt, 0.3); // Subtle noise
        drone.applyPhysics();

        return null;
    }

    exit(drone: EnemyDrone): void {
        drone.currentPath = [];
    }

    private setNewGlobalTarget(drone: EnemyDrone, costs: { default: number, blocked: number }, config: any) {
        // HYBRID BOUNDS: Use Life bounds for Left/Top/Right, but Level Bounds for Bottom
        // This keeps drones from flying infinitely down, but allows high/wide flanking
        const life = drone.bounds.life;
        const level = drone.bounds.level;

        const bounds = {
            x: life.x,
            y: life.y,
            w: life.w,
            h: (level.y + level.h) - life.y
        };

        // Fix: Use 'GridPathFinder' instead of 'Pathfinder'
        const gridSize = GridPathFinder.GRID_SIZE;
        const spatialHash = config?.spatialHash; // Extract Spatial Hash from config

        // Pad slightly inward to avoid picking nodes in walls/edges
        const padding = 2; // grid cells
        const minGridX = Math.ceil(bounds.x / gridSize) + padding;
        const maxGridX = Math.floor((bounds.x + bounds.w) / gridSize) - padding;
        const minGridY = Math.ceil(bounds.y / gridSize) + padding;
        const maxGridY = Math.floor((bounds.y + bounds.h) / gridSize) - padding;

        // Use configured clearance
        const clearance = config?.pathfindingConfig?.nodeClearance ?? 35;

        for (let i = 0; i < 15; i++) { // Try up to 15 times
            // Pick a Random GRID NODE, not a random point
            const gx = minGridX + Math.floor(Math.random() * (maxGridX - minGridX));
            const gy = minGridY + Math.floor(Math.random() * (maxGridY - minGridY));

            const tx = gx * gridSize; // SNAPPED TO GRID (Confirmed: Selecting Node)
            const ty = gy * gridSize; // SNAPPED TO GRID

            // Fix: Use 'GridPathFinder' instead of 'Pathfinder'
            // Check if point is inside a wall (using GridPathFinder utility with spatial hash)
            const isBlocked = GridPathFinder.isPositionBlocked(tx, ty, drone.platforms, clearance, spatialHash);

            if (!isBlocked) {
                // Found valid node, generate path
                const start = { x: drone.state.x, y: drone.state.y };
                const end = { x: tx, y: ty };

                // Fix: Use 'GridPathFinder' instead of 'Pathfinder'
                // Pass dynamic costs and spatialHash to GridPathFinder
                drone.currentPath = GridPathFinder.findPath(
                    start, end, drone.platforms, bounds, clearance, true, costs, spatialHash
                );
                this.pathIndex = 0;
                this.stuckTimer = 0;
                this.wanderTimer = 1.0;
                return;
            }
        }

        // Fallback: Just wait
        this.wanderTimer = 1.0;
        drone.currentPath = [];
    }
}