import { IState } from '../controllers/EnemyStateMachine';
import { IEnemyController } from '../../../types/EnemyTypes';
import { GenericChaseState } from './GenericChaseState';

export class GenericAttackState implements IState {
    public name = 'Attack';

    // Config
    private readonly MIN_RANGE_BUFFER = 50; // Hysteresis

    enter(agent: IEnemyController): void {
        agent.movement.stop(); // Stop to shoot? Or Strafe? 
        // Simple version: Stop and Shoot
    }

    update(agent: IEnemyController, dt: number): IState | null {
        const playerPos = agent.sensors.getPlayerPosition();

        // 1. Lost Target
        if (!playerPos || !agent.sensors.canSeePlayer()) {
            return new GenericChaseState();
        }

        // 2. Range Check (Hysteresis)
        const dx = playerPos.x - agent.movement.position.x;
        const dy = playerPos.y - agent.movement.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > agent.combat.range + this.MIN_RANGE_BUFFER) {
            return new GenericChaseState();
        }

        // 3. Combat Logic
        agent.movement.lookAt(playerPos.x, playerPos.y);
        agent.combat.attack(playerPos.x, playerPos.y);

        return null;
    }

    exit(agent: IEnemyController): void {
        agent.combat.cancelAttack();
    }
}
