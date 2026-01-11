
import { IDroneState } from './IDroneState';
import { EnemyDrone } from '../../components/EnemyDrone';
import { DroneChaseState } from './DroneChaseState';

export class DroneSurpriseState implements IDroneState {
    name = 'Surprise';
    private timer: number = 0;

    enter(drone: EnemyDrone, config?: any): void {
        const surpriseTime = config?.enemyConfig?.droneSurpriseTime ?? 0.5;
        this.timer = surpriseTime;
        drone.setSpotlightColor(0xFFA500); // Orange
        
        // Visual Pop
        drone.particleFactory.spawnEmote(drone.state.x + drone.state.w/2, drone.state.y - 20, '?');
        
        // Halt Movement
        drone.state.vx *= 0.1;
        drone.state.vy *= 0.1;
    }

    update(drone: EnemyDrone, dt: number, config?: any): IDroneState | null {
        this.timer -= dt;
        
        // Drifting stop
        drone.state.vx *= 0.9;
        drone.state.vy *= 0.9;
        drone.applyPhysics();

        if (this.timer <= 0) {
            return new DroneChaseState();
        }
        return null;
    }

    exit(drone: EnemyDrone): void {
        // Nothing
    }
}
