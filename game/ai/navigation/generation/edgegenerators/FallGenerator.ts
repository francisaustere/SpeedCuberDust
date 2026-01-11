import { Surface, PhysicsConfig } from '../../../../../types';
import { PhysicsSimulator } from '../PhysicsSimulator';

/**
 * FallGenerator
 * 
 * Génère les edges de type FALL pour les chutes depuis une plateforme
 * vers une plateforme inférieure.
 */
export class FallGenerator {
    constructor(
        private config: PhysicsConfig,
        private simulator: PhysicsSimulator
    ) { }

    /**
     * Génère un edge FALL si target est en-dessous de source
     * et atteignable par une chute simple (pas de saut).
     */
    public generateFallEdges(source: Surface, target: Surface) {
        if (target.y > source.y) {
            const dropSpeed = 3.0;
            const ledgeOffset = this.config.charW / 2 + 2;
            const heightDiff = target.y - source.y;
            const fallTimeFrames = Math.sqrt(2 * heightDiff / this.config.gravity) * 60;
            const horizontalReach = (dropSpeed * fallTimeFrames) / 60 + 20;

            // Left fall (chute depuis le bord gauche)
            if (target.right >= source.left - horizontalReach && target.left <= source.left) {
                const startX = source.left - ledgeOffset;
                if (this.simulator.canReachTarget({ x: startX, y: source.y }, { x: -dropSpeed, y: 0 }, 0, target)) {
                    console.log(`✅ [FALL] ${source.id} -> ${target.id} LEFT`);
                    source.neighbors.push({
                        targetSurfaceId: target.id,
                        type: 'FALL',
                        velocity: { x: -dropSpeed, y: 0 },
                        startX: startX,
                        meta: {
                            approachStartX: source.left  // 🆕 Point de marche sur la surface
                        }
                    });
                }
            }

            // Right fall (chute depuis le bord droit)
            if (target.left <= source.right + horizontalReach && target.right >= source.right) {
                const startX = source.right + ledgeOffset;
                if (this.simulator.canReachTarget({ x: startX, y: source.y }, { x: dropSpeed, y: 0 }, 0, target)) {
                    console.log(`✅ [FALL] ${source.id} -> ${target.id} RIGHT`);
                    source.neighbors.push({
                        targetSurfaceId: target.id,
                        type: 'FALL',
                        velocity: { x: dropSpeed, y: 0 },
                        startX: startX,
                        meta: {
                            approachStartX: source.right  // 🆕 Point de marche sur la surface
                        }
                    });
                }
            }
        }
    }
}