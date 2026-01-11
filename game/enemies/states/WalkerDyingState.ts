
import { IEnemyState } from './IEnemyState';
import { EnemyWalker } from '../../components/EnemyWalker';
import { Shooter } from '../../components/Shooter';

export class WalkerDyingState implements IEnemyState {
    name = 'Dying';
    private timeInState: number = 0;
    private readonly DURATION = 3.0;

    enter(enemy: EnemyWalker): void {
        const shooter = enemy.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = false;

        // Pop up and tumble
        enemy.state.vy = -8.0;
        enemy.state.vx = (Math.random() - 0.5) * 10.0;
        
        // Disable wall/ground flags to allow tumbling
        enemy.state.isGrounded = false;
        enemy.state.onWall = false;
    }

    update(enemy: EnemyWalker, dt: number): IEnemyState | null {
        this.timeInState += dt;

        // Physics (Gravity + Drag)
        enemy.state.vy += enemy.GRAVITY;
        enemy.state.vx *= 0.98;
        
        enemy.state.x += enemy.state.vx;
        enemy.state.y += enemy.state.vy;

        // Visual Tumble (Manual transform update)
        // Note: Y is inverted for visuals
        enemy.transform.rotation.z += 10 * dt;
        enemy.transform.rotation.x += 5 * dt;
        enemy.transform.setPosition(enemy.state.x + enemy.state.w/2, -(enemy.state.y + enemy.state.h/2), 0);

        // Smoke Trail
        if (Math.random() < 0.2) {
             enemy.particleFactory.spawnSmokeTrail(
                 enemy.state.x + enemy.state.w/2, 
                 enemy.state.y + enemy.state.h/2
             );
        }

        // Simple Bounce on Floor/Walls
        const cx = enemy.state.x + enemy.state.w/2;
        const cy = enemy.state.y + enemy.state.h/2;
        
        for(const p of enemy.platforms) {
            if(!enemy.isSolid(p)) continue;
            
            // AABB Check against platform
            if (enemy.state.x < p.x + p.w && enemy.state.x + enemy.state.w > p.x &&
                enemy.state.y < p.y + p.h && enemy.state.y + enemy.state.h > p.y) {
                
                // Simple separation and bounce
                // Prioritize vertical bounce if moving down
                if (enemy.state.vy > 0) {
                    enemy.state.vy *= -0.5;
                    enemy.state.y = p.y - enemy.state.h;
                    enemy.state.vx *= 0.5; // Friction on bounce
                }
            }
        }

        if (this.timeInState >= this.DURATION) {
            enemy.explode();
            return null;
        }

        return null;
    }

    exit(enemy: EnemyWalker): void {}
}
