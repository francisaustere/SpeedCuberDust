
import { IState } from '../EnemyStateMachine';
import { IEnemyController } from '../../../types/EnemyTypes';

export class JumperChaseState implements IState {
    public name = 'JumperChase';

    enter(agent: IEnemyController): void {
        // No-op
    }

    update(agent: IEnemyController, dt: number): IState | null {
        // With cheatMode enabled in sensors, this will always return the player position
        // regardless of distance or line of sight.
        const playerPos = agent.sensors.getPlayerPosition();
        
        if (playerPos) {
            // PlatformerMovement handles the pathfinding frequency (throttled to 1s)
            // It uses the Surface Graph to calculate jumps.
            agent.movement.moveTo(playerPos.x, playerPos.y);
            
            // Look at player
            agent.movement.lookAt(playerPos.x, playerPos.y);
        }
        
        return null; // Never switch state. Relentless.
    }

    exit(agent: IEnemyController): void {
        agent.movement.stop();
    }
}
