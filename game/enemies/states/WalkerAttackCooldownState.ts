
import { IEnemyState } from './IEnemyState';
import { EnemyWalker } from '../../components/EnemyWalker';
import { WalkerChaseState } from './WalkerChaseState';
import { PatrolState } from './PatrolState';
import { Shooter } from '../../components/Shooter';

export class WalkerAttackCooldownState implements IEnemyState {
    name = 'AttackCooldown';
    private timer: number = 1.0;

    enter(enemy: EnemyWalker): void {
        this.timer = 1.0;
        enemy.state.vx = 0; // Stop moving
        
        // Still allow shooting while cooling down from a melee hit if target visible
        // (Default Shooter logic handles LOS)
    }

    update(enemy: EnemyWalker, dt: number): IEnemyState | null {
        this.timer -= dt;

        // Apply Gravity
        enemy.state.vy += enemy.GRAVITY;
        if (enemy.state.vy > enemy.MAX_FALL) enemy.state.vy = enemy.MAX_FALL;
        
        enemy.state.y += enemy.state.vy;
        enemy.resolveCollisions(false);

        if (this.timer <= 0) {
            if (enemy.detectPlayer()) {
                return new WalkerChaseState();
            } else {
                return new PatrolState();
            }
        }

        return null;
    }

    exit(enemy: EnemyWalker): void {
        // Cleanup
    }
}
