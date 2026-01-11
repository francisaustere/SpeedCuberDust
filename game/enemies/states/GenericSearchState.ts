
import { IState } from '../controllers/EnemyStateMachine';
import { EnemyController } from '../controllers/EnemyController';
import { GenericPatrolState } from './GenericPatrolState';
import { GridPathFinder } from '../../ai/navigation/GridPathFinder';
import { Point } from '../../../types';
import { GenericSurprisedState } from './GenericSurprisedState';

export class GenericSearchState implements IState {
    public name = 'Searching';

    private targetPos: Point;
    private timer: number = 0;
    private arrived: boolean = false;
    private scanStage: number = 0; // 0: Move, 1: Look L, 2: Look R
    private scanTimer: number = 0;

    private path: Point[] = [];
    private currentPathIndex: number = 0;
    private rePathTimer: number = 0;

    constructor(targetPos: Point) {
        this.targetPos = targetPos;
    }

    enter(agent: EnemyController): void {
        this.timer = 0;
        this.arrived = false;
        this.scanStage = 0;
        this.rePathTimer = 0;
    }

    update(agent: EnemyController, dt: number): IState | null {
        // 1. Perception Check: If player seen, priority transition
        if (agent.sensors.canSeePlayer()) {
            const surpriseTime = (window as any).engine?.debugConfig?.current?.enemyConfig?.walkerSurpriseTime ?? 0.5;
            return new GenericSurprisedState(surpriseTime);
        }

        // 2. Logic based on stage
        if (!this.arrived) {
            this.updateMovement(agent, dt);

            const dist = Math.abs(agent.movement.position.x - this.targetPos.x);
            if (dist < 20) {
                this.arrived = true;
                this.scanStage = 1; // Start scanning
                agent.movement.stop();
            }
        } else {
            // Scanning behavior
            this.scanTimer += dt;
            if (this.scanStage === 1) { // Look Left
                agent.movement.lookAt(agent.movement.position.x - 100, agent.movement.position.y);
                if (this.scanTimer > 1.0) {
                    this.scanStage = 2;
                    this.scanTimer = 0;
                }
            } else if (this.scanStage === 2) { // Look Right
                agent.movement.lookAt(agent.movement.position.x + 100, agent.movement.position.y);
                if (this.scanTimer > 1.0) {
                    return new GenericPatrolState();
                }
            }
        }

        return null;
    }

    private updateMovement(agent: EnemyController, dt: number) {
        this.rePathTimer -= dt;
        if (this.rePathTimer <= 0 || this.path.length === 0) {
            this.rePathTimer = 1.0;
            const bounds = agent.world.bounds || { x: 0, y: 0, w: 5000, h: 2000 };
            this.path = GridPathFinder.findPath(
                agent.movement.position,
                this.targetPos,
                agent.platforms,
                bounds,
                40
            );
            this.currentPathIndex = 0;
        }

        if (this.path.length > 0) {
            const nextNode = this.path[this.currentPathIndex];
            const dist = Math.abs(agent.movement.position.x - nextNode.x);
            if (dist < 30 && this.currentPathIndex < this.path.length - 1) {
                this.currentPathIndex++;
            }
            const moveTarget = this.path[this.currentPathIndex];
            agent.movement.moveTo(moveTarget.x, moveTarget.y);
            agent.movement.lookAt(moveTarget.x, moveTarget.y);
        } else {
            agent.movement.moveTo(this.targetPos.x, this.targetPos.y);
            agent.movement.lookAt(this.targetPos.x, this.targetPos.y);
        }
    }

    exit(agent: EnemyController): void {
        agent.movement.stop();
    }
}
