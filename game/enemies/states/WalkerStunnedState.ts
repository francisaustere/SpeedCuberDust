
import { IEnemyState } from './IEnemyState';
import { EnemyWalker } from '../../components/EnemyWalker';
import { PatrolState } from './PatrolState';
import { Shooter } from '../../components/Shooter';

export class WalkerStunnedState implements IEnemyState {
    name = 'Stunned';
    private timer: number = 0;
    private readonly DURATION = 1.0; 

    enter(enemy: EnemyWalker): void {
        console.log("im stunned");
        this.timer = this.DURATION;
        
        const shooter = enemy.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = false;
    }

    update(enemy: EnemyWalker, dt: number): IEnemyState | null {
        const state = enemy.state;
        this.timer -= dt;

        // 1. Physics (Gravity + Friction)
        state.vy += enemy.GRAVITY;
        if (state.vy > enemy.MAX_FALL) state.vy = enemy.MAX_FALL;
        
        if (state.isGrounded) {
            state.vx *= 0.9;
        }

        // 2. Movement & Collision
        const maxStep = 10;
        const absVx = Math.abs(state.vx);
        
        if (absVx > maxStep) {
            const steps = Math.ceil(absVx / maxStep);
            const stepVx = state.vx / steps;
            
            for(let i = 0; i < steps; i++) {
                state.x += stepVx;
                enemy.resolveCollisions(true);
                if (state.vx === 0) break;
            }
        } else {
            state.x += state.vx;
            enemy.resolveCollisions(true);
        }
        
        state.y += state.vy;
        enemy.resolveCollisions(false);

        // 3. Exit Condition
        if (this.timer <= 0 && state.isGrounded && Math.abs(state.vx) < 0.5) {
            return new PatrolState();
        }

        return null;
    }

    exit(enemy: EnemyWalker): void {
        const shooter = enemy.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = true;
    }
}
