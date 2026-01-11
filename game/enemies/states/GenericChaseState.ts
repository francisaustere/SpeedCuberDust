
import { IState } from '../controllers/EnemyStateMachine';
import { EnemyController } from '../controllers/EnemyController';
import { GenericPatrolState } from './GenericPatrolState';
import { GenericAttackState } from './GenericAttackState';
import { Point } from '../../../types';
import { GridPathFinder } from '../../../game/ai/navigation/GridPathFinder';

export class GenericChaseState implements IState {
    public name = 'Chase';

    private lostTimer: number = 0;
    private readonly LOST_THRESHOLD = 3.0;
    private rePathTimer: number = 0;
    private path: Point[] = [];
    private currentPathIndex: number = 0;

    enter(agent: EnemyController): void {
        this.lostTimer = 0;
        // agent.combat.setAggressive(true);
    }

    update(agent: EnemyController, dt: number): IState | null {
        const canSee = agent.sensors.canSeePlayer();
        const playerPos = agent.sensors.getPlayerPosition();

        // 1. Transition: Lost Player
        if (!canSee) {
            this.lostTimer += dt;
            if (this.lostTimer > this.LOST_THRESHOLD) {
                return new GenericPatrolState();
            }
            // Continue moving to last known pos
        } else {
            this.lostTimer = 0;
        }

        // 2. Transition: Attack Range
        if (canSee && playerPos) {
            // Check distance
            const dx = playerPos.x - agent.movement.position.x;
            const dy = playerPos.y - agent.movement.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < agent.combat.range) {
                return new GenericAttackState();
            }
        }

        // 3. Movement Logic
        if (playerPos) {
            this.rePathTimer -= dt;
            const usePathfinding = (window as any).engine?.debugConfig?.current?.enemyConfig?.walkerUsePathfinding ?? true;

            if (usePathfinding) {
                if (this.rePathTimer <= 0 || this.path.length === 0) {
                    this.rePathTimer = 0.5; // Repath every 0.5s

                    const bounds = agent.world.bounds || { x: 0, y: 0, w: 5000, h: 2000 };
                    this.path = GridPathFinder.findPath(
                        agent.movement.position,
                        playerPos,
                        agent.platforms,
                        bounds,
                        40 // Clearance
                    );
                    this.currentPathIndex = 0;
                }

                if (this.path.length > 0) {
                    // Navigate to next node
                    const targetNode = this.path[this.currentPathIndex];
                    const distToNodeX = Math.abs(agent.movement.position.x - targetNode.x);

                    // If we are close to the node horizontally, move to next
                    if (distToNodeX < 30) {
                        if (this.currentPathIndex < this.path.length - 1) {
                            this.currentPathIndex++;
                        }
                    }

                    const movePoint = this.path[this.currentPathIndex];
                    agent.movement.moveTo(movePoint.x, movePoint.y);
                } else {
                    // Fallback
                    agent.movement.moveTo(playerPos.x, playerPos.y);
                }
            } else {
                // Naive Movement
                if (this.rePathTimer <= 0) {
                    agent.movement.moveTo(playerPos.x, playerPos.y);
                    this.rePathTimer = 0.5;
                }
            }

            // Always look at player when chasing
            agent.movement.lookAt(playerPos.x, playerPos.y);
        }

        return null;
    }

    exit(agent: EnemyController): void {
        agent.movement.stop();
    }
}
