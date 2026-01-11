import { Surface, PhysicsConfig } from '../../../../../types';

/**
 * WalkGenerator
 * 
 * Génère les edges de type WALK pour déplacements horizontaux
 * entre surfaces adjacentes de même hauteur.
 */
export class WalkGenerator {
    constructor(private config: PhysicsConfig) { }

    /**
     * Génère un edge WALK si source et target sont :
     * - À la même hauteur (différence < 2px)
     * - Adjacentes horizontalement (écart < 10px)
     */
    public generateWalkEdges(source: Surface, target: Surface, jumpMargin: number = 35) {
        // Vérifier que les surfaces sont à la même hauteur
        if (Math.abs(source.y - target.y) < 2.0) {
            const distL = Math.abs(source.left - target.right);
            const distR = Math.abs(source.right - target.left);

            // WALK vers la GAUCHE (source.left proche de target.right)
            if (distL < 10) {
                console.log(`✅ [WALK] ${source.id} -> ${target.id} LEFT`);
                source.neighbors.push({
                    targetSurfaceId: target.id,
                    type: 'WALK',
                    velocity: { x: -this.config.maxSpeed, y: 0 },
                    startX: source.left + jumpMargin
                });
            }
            // WALK vers la DROITE (source.right proche de target.left)
            else if (distR < 10) {
                console.log(`✅ [WALK] ${source.id} -> ${target.id} RIGHT`);
                source.neighbors.push({
                    targetSurfaceId: target.id,
                    type: 'WALK',
                    velocity: { x: this.config.maxSpeed, y: 0 },
                    startX: source.right - jumpMargin
                });
            }
        }
    }
}