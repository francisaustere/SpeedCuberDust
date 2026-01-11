
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { Platform } from '../../types';
import { UpdateContext } from '../../engine/core/UpdateContext';

export class MovingPlatform extends Component {
    public platformData: Platform;
    public totalTime: number = 0;
    
    private debugLogged: boolean = false;

    constructor(gameObject: GameObject, platformData: Platform) {
        super(gameObject);
        this.platformData = platformData;
    }
    
    public update(dt: number, context: UpdateContext): void {
        if (context.isPaused) return;

        const p = this.platformData;
        if (!p.moving) return;

        const { start, end, duration } = p.moving;
        if (duration <= 0.01) return;

        this.totalTime += dt;
        
        // SYNC TIMER for AI
        p.movingTimer = this.totalTime;

        const cycleTime = 2 * duration;
        const t = this.totalTime % cycleTime;
        
        let alpha = t / duration;
        if (alpha > 1.0) alpha = 2.0 - alpha;
        alpha = Math.max(0, Math.min(1, alpha));

        // Ease: Smooth Step
        const ease = alpha * alpha * (3 - 2 * alpha);
        
        const newX = start.x + (end.x - start.x) * ease;
        const newY = start.y + (end.y - start.y) * ease;
        
        const dx = newX - p.x;
        const dy = newY - p.y;
        
        // Sync Data
        p.x = newX;
        p.y = newY;
        
        // ⬇️ currentVx/Vy = déplacement en px (pour Platform Carry)
        p.currentVx = dx;
        p.currentVy = dy;
        
        /* Updated velocityX and velocityY to use the now-defined properties on the Platform interface, removing the need for type casting. */
        // ⬇️ NOUVEAU : Stocke la vitesse réelle pour tolérance
        p.velocityX = dt > 0 ? Math.abs(dx / dt) : 0;
        p.velocityY = dt > 0 ? Math.abs(dy / dt) : 0;

        // DEBUG : Log velocity UNE SEULE FOIS
        if (!this.debugLogged) {
            const avgVx = Math.abs(end.x - start.x) / duration;
            const avgVy = Math.abs(end.y - start.y) / duration;
            
            console.log(`🔧 [MovingPlatform] Platform ID: ${p.id}`);
            console.log(`   Avg Vx: ${avgVx.toFixed(2)} unités/sec`);
            console.log(`   Avg Vy: ${avgVy.toFixed(2)} unités/sec`);
            console.log(`   currentVx (px/frame): ${p.currentVx?.toFixed(3)}`);
            /* Removed type casting for velocityX logging. */
            console.log(`   velocityX (unités/sec): ${p.velocityX?.toFixed(2)}`);
            console.log(`   ---`);
            
            this.debugLogged = true;
        }

        // Sync Visual Transform
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        this.transform.setPosition(cx, -cy, 0);
    }

    public reset(): void {
        this.totalTime = 0;
        this.debugLogged = false;
        
        // Snap to start immediately
        const p = this.platformData;
        if (p.moving) {
            p.x = p.moving.start.x;
            p.y = p.moving.start.y;
            p.currentVx = 0;
            p.currentVy = 0;
            /* Reset velocityX and velocityY properties directly on the platform data. */
            p.velocityX = 0;
            p.velocityY = 0;
            p.movingTimer = 0;
            
            const cx = p.x + p.w / 2;
            const cy = p.y + p.h / 2;
            this.transform.setPosition(cx, -cy, 0);
        }
    }
}
