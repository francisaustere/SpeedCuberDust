
import { IEnemyState } from './IEnemyState';
import { EnemyWalker } from '../../components/EnemyWalker';
import { WalkerChaseState } from './WalkerChaseState';
import { ParticleFactory } from '../../ParticleFactory';

export class WalkerSurpriseState implements IEnemyState {
    name = 'Surprise';
    private timer: number = 0;
    private readonly DURATION = 0.6; // Slightly longer for ground units

    enter(enemy: EnemyWalker): void {
        this.timer = this.DURATION;
        
        // Spawn Emote
        // Use default ParticleFactory attached to world indirectly via Enemy logic or create new instance?
        // EnemyWalker has a particleFactory if we instantiate it, but current implementation doesn't have it on component.
        // We need to access world. 
        // Let's create a new instance of ParticleFactory since it's cheap (just helper methods)
        // or check if EnemyWalker has it.
        const pf = new ParticleFactory(enemy.world);
        pf.spawnEmote(enemy.state.x + enemy.state.w/2, enemy.state.y - 20, '?');
        
        // Stop Movement
        enemy.state.vx = 0;
    }

    update(enemy: EnemyWalker, dt: number): IEnemyState | null {
        this.timer -= dt;
        
        // Physics (Gravity only)
        enemy.state.vy += enemy.GRAVITY;
        if (enemy.state.vy > enemy.MAX_FALL) enemy.state.vy = enemy.MAX_FALL;
        
        // Apply Y Physics
        enemy.state.y += enemy.state.vy;
        enemy.resolveCollisions(false);

        if (this.timer <= 0) {
            return new WalkerChaseState();
        }
        return null;
    }

    exit(enemy: EnemyWalker): void {
        // Ready to chase
    }
}