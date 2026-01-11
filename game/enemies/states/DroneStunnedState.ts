
import { IDroneState } from './IDroneState';
import { EnemyDrone } from '../../components/EnemyDrone';
import { DronePatrolState } from './DronePatrolState';
import { DroneChaseState } from './DroneChaseState';
import { Shooter } from '../../components/Shooter';

export class DroneStunnedState implements IDroneState {
    name = 'Stunned';
    private timer: number = 0;
    private readonly STUN_DURATION = 2.0;

    enter(drone: EnemyDrone, config?: any): void {
        this.timer = this.STUN_DURATION;
        drone.setSpotlightColor(0x555555); // Dim/Off
        drone.visualSpinSpeed = (Math.random() > 0.5 ? 1 : -1) * 15.0;
        
        // Disable Shooter
        const shooter = drone.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = false;
    }

    update(drone: EnemyDrone, dt: number, config?: any): IDroneState | null {
        this.timer -= dt;

        // 1. Gravity
        drone.state.vy += drone.GRAVITY * 1.5; 
        
        // 2. Predict Collision
        drone.state.x += drone.state.vx;
        drone.state.y += drone.state.vy;
        
        drone.state.vx *= 0.99; // Low drag
        drone.state.vy *= 0.99;

        const hit = drone.resolveCircularCollisions();
        
        if (hit) {
            const speedSq = drone.state.vx*drone.state.vx + drone.state.vy*drone.state.vy;
            const threshold = drone.impactThreshold;
            const thresholdSq = threshold * threshold;
            
            if (speedSq > 25) { 
                 const cx = drone.state.x + drone.state.w/2;
                 const cy = drone.state.y + drone.state.h/2;
                 drone.particleFactory.spawnSmokeTrail(cx, cy);
            }
            
            if (speedSq > thresholdSq) {
                drone.triggerDeath();
                return null;
            } else {
                drone.triggerBlink(0.5);
                drone.visualSpinSpeed *= 0.5;
            }
        }

        // 3. Recovery
        if (this.timer <= 0) {
            drone.state.vx *= 0.2;
            drone.state.vy *= 0.2;
            drone.visualSpinSpeed = 0;
            drone.transform.rotation.z = 0;
            return new DroneChaseState();
        }

        return null;
    }

    exit(drone: EnemyDrone): void {
        drone.visualSpinSpeed = 0;
        drone.transform.rotation.z = 0;
        
        // Re-enable Shooter
        const shooter = drone.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = true;
    }
}
