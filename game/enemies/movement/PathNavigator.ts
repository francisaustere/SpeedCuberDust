import { SurfaceSystem } from '../../ai/navigation/SurfaceSystem';
import { Point, Platform } from '../../../types';
import { GameWorld } from '../../../engine/core/GameWorld';

/**
 * PathNavigator
 * 
 * Responsabilité : Navigation pure (calcul de chemins, gestion du graphe).
 * SUPPRESSION : Tout le code de debug visuel a été extrait vers NavigationDebugRenderer.
 */
export class PathNavigator {
    public surfaceSystem: SurfaceSystem;
    public path: Point[] = [];
    public pathIndex: number = 0;

    // Config Cache
    private gravity: number;
    private jumpForce: number;
    private maxSpeed: number;

    private lastGeometryVersion: number = -1;
    private world: GameWorld | null = null;

    constructor(gravity: number, jumpForce: number, maxSpeed: number, world: GameWorld | null) {
        this.gravity = gravity;
        this.jumpForce = jumpForce;
        this.maxSpeed = maxSpeed;
        this.world = world;

        this.surfaceSystem = new SurfaceSystem(gravity, jumpForce, maxSpeed);
    }

    public syncPhysics(gravity: number, jumpForce: number, maxSpeed: number, platforms: Platform[]) {
        if (Math.abs(this.gravity - gravity) > 0.01 ||
            Math.abs(this.jumpForce - jumpForce) > 0.01 ||
            Math.abs(this.maxSpeed - maxSpeed) > 0.01) {

            this.gravity = gravity;
            this.jumpForce = jumpForce;
            this.maxSpeed = maxSpeed;

            // Re-init system with correct values
            this.surfaceSystem = new SurfaceSystem(this.gravity, this.jumpForce, this.maxSpeed);
            this.rebuildGraph(platforms);
        }
    }

    public update(platforms: Platform[]) {
        // Check for geometry changes
        if (this.world && this.world.geometryVersion > this.lastGeometryVersion) {
            this.rebuildGraph(platforms);
        }
        // Initial build check
        if (this.surfaceSystem.surfaces.length === 0 && platforms.length > 0) {
            this.rebuildGraph(platforms);
        }
    }

    public rebuildGraph(platforms: Platform[]) {
        console.log(`[AI] Rebuilding Graph (Speed: ${this.maxSpeed}, Jump: ${this.jumpForce})`);
        this.surfaceSystem.build(platforms);

        if (this.world) {
            this.lastGeometryVersion = this.world.geometryVersion;
        }

        this.path = [];
        this.pathIndex = 0;

        // console.log('🗺️ [PathNavigator] Graph rebuilt:', {
        //     surfaceCount: this.surfaceSystem.surfaces.length,
        //     totalEdges: this.surfaceSystem.surfaces.reduce((sum, s) => sum + s.neighbors.length, 0)
        // });
    }

    public findPath(start: Point, end: Point, currentPlatformId?: number | null) {
        // 1. Try standard pathfinding
        let newPath = this.surfaceSystem.findPath(start, end);

        // 2. Recovery: If no path found and we are on a platform
        if (newPath.length === 0 && currentPlatformId) {
            // console.log('[AI] Pathfinding failed. Attempting recovery from platform:', currentPlatformId);
            newPath = this.surfaceSystem.findPathFromPlatform(currentPlatformId, end);
        }

        this.path = newPath;
        this.pathIndex = 0;

        // console.log('🗺️ [PathNavigator] Path generated:', {
        //     length: this.path.length,
        //     waypoints: this.path.map((p, i) => ({
        //         index: i,
        //         x: p.x.toFixed(1),
        //         y: p.y.toFixed(1),
        //         meta: (p as any).meta?.type || 'WALK'
        //     }))
        // });
    }

    public getCurrentTarget(): Point | null {
        if (this.pathIndex >= this.path.length) return null;
        return this.path[this.pathIndex];
    }

    public advance() {
        this.pathIndex++;
    }

    public clearPath() {
        this.path = [];
        this.pathIndex = 0;
    }

    public destroy() {
        // Plus besoin de nettoyer debugGroup, c'est géré par NavigationDebugRenderer
        this.path = [];
    }
}