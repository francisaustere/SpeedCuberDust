import { IState } from '../controllers/EnemyStateMachine';
import { IEnemyController } from '../../../types/EnemyTypes';
import { GenericChaseState } from './GenericChaseState';
import { GenericPatrolState } from './GenericPatrolState';
import { GenericSearchState } from './GenericSearchState';
import { Point } from '../../../types';

export class GenericSurprisedState implements IState {
    public name = 'Surprised';
    private timer: number = 0;
    private duration: number;
    private investigatePos: Point | null = null;

    constructor(duration: number = 0.5, investigatePos: Point | null = null) {
        this.duration = duration;
        this.investigatePos = investigatePos;
    }

    enter(agent: IEnemyController): void {
        this.timer = 0;
        agent.movement.stop();

        const playerPos = agent.sensors.getPlayerPosition();
        if (playerPos) {
            agent.movement.lookAt(playerPos.x, playerPos.y);
        } else if (this.investigatePos) {
            agent.movement.lookAt(this.investigatePos.x, this.investigatePos.y);
        }
    }

    update(agent: IEnemyController, dt: number): IState | null {
        this.timer += dt;

        // 1. Check for immediate player detection
        if (agent.sensors.canSeePlayer()) {
            if (this.timer >= this.duration) {
                return new GenericChaseState();
            }
            return null;
        }

        // 2. If we finish surprise and player is NOT seen
        if (this.timer >= this.duration) {
            if (this.investigatePos) {
                return new GenericSearchState(this.investigatePos);
            }
            return new GenericPatrolState();
        }

        return null;
    }

    exit(agent: IEnemyController): void {
    }
}
