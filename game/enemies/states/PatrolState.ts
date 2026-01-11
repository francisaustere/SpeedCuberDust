
import { IEnemyState } from './IEnemyState';
import { EnemyWalker } from '../../components/EnemyWalker';
import { WalkerSurpriseState } from './WalkerSurpriseState';
import { Platform } from '../../../types';
import { Shooter } from '../../components/Shooter';

export class PatrolState implements IEnemyState {
    name = 'Patrol';
    
    private targetX: number | null = null;
    private idleTimer: number = 0;
    
    private readonly IDLE_DURATION = 1.5; 
    private readonly MARGIN = 10; 

    enter(enemy: EnemyWalker): void {
        this.targetX = null;
        this.idleTimer = 0;
        enemy.state.vx = 0; 
        
        // Disable shooting while patrolling to avoid aggression before detection
        const shooter = enemy.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = false;
    }

    update(enemy: EnemyWalker, dt: number): IEnemyState | null {
        const state = enemy.state;

        // 0. Detect Player
        if (enemy.detectPlayer()) {
            return new WalkerSurpriseState();
        }
        
        // 1. Logic
        if (state.isGrounded) {
            if (this.idleTimer > 0) {
                this.idleTimer -= dt;
                state.vx = 0;
            } 
            else if (this.targetX === null) {
                const platform = this.findCurrentPlatform(enemy);
                if (platform) {
                    const minX = platform.x + this.MARGIN;
                    const maxX = platform.x + platform.w - this.MARGIN;
                    
                    this.targetX = minX + Math.random() * (maxX - minX);
                    
                    const dx = this.targetX - state.x;
                    enemy.direction = Math.sign(dx);
                    if (enemy.direction === 0) enemy.direction = 1;
                } else {
                    this.idleTimer = 0.5;
                }
            }
            else {
                const dx = this.targetX - state.x;
                
                if (Math.abs(dx) < 5) {
                    this.targetX = null;
                    this.idleTimer = this.IDLE_DURATION;
                    state.vx = 0;
                } else {
                    enemy.direction = Math.sign(dx);
                    state.vx = enemy.SPEED * enemy.direction;
                }
            }
        } 
        
        // 2. Physics
        state.vy += enemy.GRAVITY;
        if (state.vy > enemy.MAX_FALL) state.vy = enemy.MAX_FALL;
        
        // 3. Collision
        state.x += state.vx;
        enemy.resolveCollisions(true);
        
        if (state.onWall && this.targetX !== null) {
            this.targetX = null;
            this.idleTimer = this.IDLE_DURATION;
            state.vx = 0;
        }
        
        state.y += state.vy;
        enemy.resolveCollisions(false);

        return null;
    }

    exit(enemy: EnemyWalker): void {
        // Enable Shooter for subsequent states
        const shooter = enemy.gameObject.getComponent(Shooter);
        if (shooter) shooter.enabled = true;
    }
    
    private findCurrentPlatform(enemy: EnemyWalker): Platform | null {
        const cx = enemy.state.x + enemy.state.w/2;
        const bottomY = enemy.state.y + enemy.state.h;
        
        for (const p of enemy.platforms) {
            if (!enemy.isSolid(p)) continue;
            
            if (cx >= p.x && cx <= p.x + p.w &&
                bottomY >= p.y - 1 && bottomY <= p.y + 5) { 
                return p;
            }
        }
        return null;
    }
}
