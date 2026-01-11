
import { IDroneState } from './IDroneState';
import { EnemyDrone } from '../../components/EnemyDrone';
import { Shooter } from '../../components/Shooter';

export class DroneFallingState implements IDroneState {
    name = 'Falling';
    private timeInState: number = 0;

    // Fallback if config unavailable
    private readonly DEFAULT_DYING_DURATION = 3.0;

    enter(drone: EnemyDrone, config?: any): void {
        // Power Down Visuals - Turn light off
        drone.setSpotlightColor(0x000000);

        // Death Spin / Tumble
        drone.visualSpinSpeed = (Math.random() > 0.5 ? 1 : -1) * 40.0;

        // Initial Bounce / Chaos Impulse
        // If we crashed down, pop up slightly to ensure we see the fall
        if (drone.state.vy > 0) {
            drone.state.vy *= -0.5;
        }
        drone.state.vy -= 8.0; // Extra pop
        drone.state.vx += (Math.random() - 0.5) * 15.0; // Random sideways tumble

        // Disable Shooter
        const shooter = drone.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = false;

        this.timeInState = 0;
    }

    update(drone: EnemyDrone, dt: number, config?: any): IDroneState | null {
        this.timeInState += dt;

        // 1. Physics (Gravity + Drag)
        // Fall fast (Heavy)
        drone.state.vy += drone.GRAVITY * 1.5;
        drone.state.vx *= 0.98; // Air drag
        drone.state.vy *= 0.98;

        // Move
        drone.state.x += drone.state.vx;
        drone.state.y += drone.state.vy;

        // 2. Visual Effects (Smoke Trail)
        // Use frequent emission of visible smoke
        if (Math.random() < 0.8) {
            drone.particleFactory.spawnSmokeTrail(
                drone.state.x + drone.state.w / 2 + (Math.random() - 0.5) * 10,
                drone.state.y + drone.state.h / 2 + (Math.random() - 0.5) * 10
            );
        }

        // 3. Collision Logic (Bounce on Ground and Walls)
        const r = drone.state.w / 2;
        const cx = drone.state.x + r;
        const cy = drone.state.y + r;

        for (const p of drone.platforms) {
            if (p.type === 'vanishing' && p.isVanished) continue;

            // Simple AABB closest point for Circle collision
            const closestX = Math.max(p.x, Math.min(cx, p.x + p.w));
            const closestY = Math.max(p.y, Math.min(cy, p.y + p.h));

            const dx = cx - closestX;
            const dy = cy - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < r * r) {
                const dist = Math.sqrt(distSq);
                let nx = 0, ny = 0;

                if (dist > 0.0001) {
                    nx = dx / dist;
                    ny = dy / dist;
                } else {
                    // Center inside platform, assume pushed up
                    ny = -1;
                }

                // BOUNCE / SLIDE Logic
                const overlap = r - dist;
                drone.state.x += nx * overlap;
                drone.state.y += ny * overlap;

                const vDotN = drone.state.vx * nx + drone.state.vy * ny;
                if (vDotN < 0) {
                    const restitution = 0.6; // Bouncy metallic feel
                    const j = -(1 + restitution) * vDotN;
                    drone.state.vx += j * nx;
                    drone.state.vy += j * ny;

                    // Add/Reverse spin on bounce
                    drone.visualSpinSpeed *= -0.8;

                    // Spawn spark on hard bounce
                    if (Math.abs(vDotN) > 5) {
                        drone.particleFactory.spawnImpact(closestX, closestY, 0xFFA500);
                    }
                }
            }
        }

        // 4. Final Death Check
        const limit = config?.enemyConfig?.droneDeathDuration ?? this.DEFAULT_DYING_DURATION;
        if (this.timeInState >= limit) {
            drone.explode(); // Final Cleanup
            return null;
        }

        return null;
    }

    exit(drone: EnemyDrone): void {
        // Nothing to cleanup, object usually destroyed
    }
}
