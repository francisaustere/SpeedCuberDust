import { IState } from '../controllers/EnemyStateMachine';
import { EnemyController } from '../controllers/EnemyController';
import { GenericSurprisedState } from './GenericSurprisedState';

export class GenericPatrolState implements IState {
    public name = 'Patrol';

    private idleTimer: number = 0;
    private readonly IDLE_DURATION = 2.0;
    private hasTarget: boolean = false;

    enter(agent: EnemyController): void {
        this.idleTimer = 0;
        this.hasTarget = false;
        agent.movement.stop();

        // Ensure weapons are stowed/safe
        // agent.combat.setAggressive(false);
    }

    update(agent: EnemyController, dt: number): IState | null {
        // 1. Perception Check
        if (agent.sensors.canSeePlayer()) {
            // Check for modern surprise config, fallback to 0.5s
            const surpriseTime = (window as any).engine?.debugConfig?.current?.enemyConfig?.walkerSurpriseTime ?? 0.5;
            console.log(`Enemy ${agent.id} spotted player! Entering Surprised for ${surpriseTime}s`);
            return new GenericSurprisedState(surpriseTime);
        }

        // 2. Logic
        if (!agent.movement.isMoving && !this.hasTarget) {
            // We are stationary and need a plan
            if (this.idleTimer <= 0) {
                // Pick new target
                const target = agent.movement.getRoamTarget();
                (this as any).lastTargetX = target.x;
                agent.movement.moveTo(target.x, target.y);
                this.hasTarget = true;
            } else {
                // Wait
                this.idleTimer -= dt;
            }
        }
        else if (this.hasTarget) {
            // Check if we arrived
            if (!agent.movement.isMoving) {
                // Movement component stopped us (arrived or stuck/hit wall)
                this.hasTarget = false;

                // If we didn't reach the target (likely hit a wall), wait less time before repath
                const dx = Math.abs(agent.movement.position.x - (this as any).lastTargetX);
                this.idleTimer = dx > 10 ? 0.5 : this.IDLE_DURATION;
            }
        }

        return null; // Stay in Patrol
    }

    exit(agent: EnemyController): void {
        agent.movement.stop();
    }
}
