
import { EnemyDrone } from '../../components/EnemyDrone';

export interface IDroneState {
    name: string;
    enter(drone: EnemyDrone, config?: any): void;
    update(drone: EnemyDrone, dt: number, config?: any, input?: any): IDroneState | null;
    exit(drone: EnemyDrone): void;
}
