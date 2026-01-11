
import { IEnemyState } from './IEnemyState';
import { EnemyWalker } from '../../components/EnemyWalker';
import { Rect } from '../../../types';
import { PatrolState } from './PatrolState';

export class WalkerChaseState implements IEnemyState {
    name = 'Chase';
    
    // Give up if player lost for too long
    private lostTimer: number = 0;
    private readonly LOST_THRESHOLD = 2.0; // Updated to 2.0s
    
    // Last Known Position X logic
    private lastKnownX: number | null = null;

    enter(enemy: EnemyWalker): void {
        this.lostTimer = 0;
        this.lastKnownX = null;
        
        const player = enemy.getPlayer();
        if (player) {
            this.lastKnownX = player.x;
        }
    }

    update(enemy: EnemyWalker, dt: number): IEnemyState | null {
        const player = enemy.getPlayer();
        
        // 1. Target Lost Check
        if (!player || player.isDead) {
            return new PatrolState();
        }
        
        // Check Line of Sight + Distance using detectPlayer logic
        // This handles "above" check too
        // Pass false to enforce direction check (Vision cone only in front)
        const canSee = enemy.detectPlayer(false);
        
        if (canSee) {
            this.lostTimer = 0;
            this.lastKnownX = player.x; // Update LKP
        } else {
            this.lostTimer += dt;
            if (this.lostTimer > this.LOST_THRESHOLD) {
                return new PatrolState();
            }
        }

        // 2. Chase Movement
        // Determine Direction towards Target (Player if visible, else LKP)
        let targetX = player.x;
        if (!canSee && this.lastKnownX !== null) {
            targetX = this.lastKnownX;
        }
        
        const dx = (targetX + player.w/2) - (enemy.state.x + enemy.state.w/2);
        
        enemy.direction = Math.sign(dx);
        if (enemy.direction === 0) enemy.direction = 1;
        
        let shouldMove = true;
        
        // Stop moving if close to target AND can't see player (Idle at LKP)
        if (!canSee && Math.abs(dx) < 20) {
            shouldMove = false;
        }
        
        // CLIFF DETECTION (Stop at edge but keep facing player)
        if (enemy.state.isGrounded && shouldMove) {
            const cliffLookAhead = 5;
            const checkX = enemy.direction > 0 
                ? enemy.state.x + enemy.state.w + cliffLookAhead 
                : enemy.state.x - cliffLookAhead;
            const checkY = enemy.state.y + enemy.state.h + 2;
            
            let groundFound = false;
            for (const p of enemy.platforms) {
                if (!enemy.isSolid(p)) continue;
                if (checkX >= p.x && checkX <= p.x + p.w &&
                    checkY >= p.y && checkY <= p.y + p.h) {
                    groundFound = true;
                    break;
                }
            }
            if (!groundFound) shouldMove = false;
        }
        
        // WALL DETECTION
        if (shouldMove) {
            const lookAheadMargin = 2.0;
            const testBox: Rect = {
                x: enemy.direction > 0 ? enemy.state.x + enemy.state.w : enemy.state.x - lookAheadMargin,
                y: enemy.state.y + 4, 
                w: lookAheadMargin,
                h: enemy.state.h - 8
            };
            for (const p of enemy.platforms) {
                if (enemy.isSolid(p) && enemy.rectIntersect(testBox, p)) {
                    shouldMove = false;
                    break;
                }
            }
        }

        // Apply Speed
        if (shouldMove) {
            enemy.state.vx = enemy.CHASE_SPEED * enemy.direction;
        } else {
            enemy.state.vx = 0;
        }

        // 3. Physics
        enemy.state.vy += enemy.GRAVITY;
        if (enemy.state.vy > enemy.MAX_FALL) enemy.state.vy = enemy.MAX_FALL;
        
        enemy.state.x += enemy.state.vx;
        enemy.resolveCollisions(true);
        
        enemy.state.y += enemy.state.vy;
        enemy.resolveCollisions(false);

        return null; 
    }

    exit(enemy: EnemyWalker): void {
        // Cleanup
    }
}
