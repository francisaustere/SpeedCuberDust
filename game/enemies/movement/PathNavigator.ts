
import * as THREE from 'three';
import { SurfaceSystem } from '../../ai/navigation/SurfaceSystem';
import { Point, Platform } from '../../../types';
import { GameWorld } from '../../../engine/GameWorld';

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
    private debugGroup: THREE.Group;

    constructor(gravity: number, jumpForce: number, maxSpeed: number, world: GameWorld | null) {
        this.gravity = gravity;
        this.jumpForce = jumpForce;
        this.maxSpeed = maxSpeed;
        this.world = world;

        this.surfaceSystem = new SurfaceSystem(gravity, jumpForce, maxSpeed);

        this.debugGroup = new THREE.Group();
        if (this.world) {
            this.world.scene.add(this.debugGroup);
        }
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
        // 🆕 LOG LE PATH COMPLET
        console.log('🗺️ [PathNavigator] Path generated:', {
            length: this.path.length,
            waypoints: this.path.map((p, i) => ({
                index: i,
                x: p.x.toFixed(1),
                y: p.y.toFixed(1),
                meta: (p as any).meta?.type || 'WALK'
            }))
        });
        this.drawGraph();
    }

    public findPath(start: Point, end: Point, currentPlatformId?: number | null) {
        // 1. Try standard pathfinding
        let newPath = this.surfaceSystem.findPath(start, end);

        // 2. Recovery: If no path found and we are on a platform
        if (newPath.length === 0 && currentPlatformId) {
            console.log('[AI] Pathfinding failed. Attempting recovery from platform:', currentPlatformId);
            newPath = this.surfaceSystem.findPathFromPlatform(currentPlatformId, end);
        }

        this.path = newPath;
        this.pathIndex = 0;
        // 🆕 LOG LE PATH COMPLET
        console.log('🗺️ [PathNavigator] Path generated:', {
            length: this.path.length,
            waypoints: this.path.map((p, i) => ({
                index: i,
                x: p.x.toFixed(1),
                y: p.y.toFixed(1),
                meta: (p as any).meta?.type || 'WALK'
            }))
        });
        this.drawPath();
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
        this.drawPath();
    }

    // --- DEBUG VISUALS ---

    private drawGraph() {
        if (!this.world) return;
        this.debugGroup.clear();

        this.surfaceSystem.surfaces.forEach(s => {
            s.neighbors.forEach(n => {
                let color = 0x00FF00;
                if (n.type === 'JUMP') color = 0xFFFF00;
                if (n.type === 'DOUBLE_JUMP') color = 0xFFA500;
                if (n.type === 'WALL_CLIMB') color = 0xFF4500;
                if (n.type === 'FALL') color = 0x44ff00;
                if (n.type === 'RIDE') color = 0x00FFFF;

                const material = new THREE.LineBasicMaterial({ color: color });
                const points = [];
                points.push(new THREE.Vector3(n.startX, -s.y, 5));

                if (n.type === 'JUMP' || n.type === 'DOUBLE_JUMP' || n.type === 'WALL_CLIMB') {
                    const targetSurf = this.surfaceSystem.surfaces.find(ts => ts.id === n.targetSurfaceId);
                    if (targetSurf) {
                        if (n.type === 'WALL_CLIMB' && n.climbWallX) {
                            const steps = 3;
                            const dy = (s.y - targetSurf.y) / steps;
                            let cy = s.y;
                            for (let i = 0; i < steps; i++) {
                                cy -= dy;
                                points.push(new THREE.Vector3(n.climbWallX, -cy, 5));
                                points.push(new THREE.Vector3(n.climbWallX + (n.wallNormalX || 0) * 30, -cy + dy / 2, 5));
                            }
                        } else {
                            const midX = (n.startX + targetSurf.midPoint.x) / 2;
                            const midY = Math.min(-s.y, -targetSurf.y) + 50;
                            points.push(new THREE.Vector3(midX, midY, 5));
                        }
                        points.push(new THREE.Vector3(targetSurf.midPoint.x, -targetSurf.y, 5));
                    }
                } else {
                    const targetSurf = this.surfaceSystem.surfaces.find(ts => ts.id === n.targetSurfaceId);
                    if (targetSurf) {
                        points.push(new THREE.Vector3(targetSurf.midPoint.x, -targetSurf.y, 5));
                    }
                }

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material);
                this.debugGroup.add(line);
            });
        });
    }

    private drawPath() {
        if (!this.world) return;
        const old = this.debugGroup.getObjectByName('PathVisual');
        if (old) this.debugGroup.remove(old);

        if (this.path.length === 0) return;

        const points: THREE.Vector3[] = [];
        const material = new THREE.LineBasicMaterial({ color: 0xFFFFFF, linewidth: 2 });

        this.path.forEach(p => {
            points.push(new THREE.Vector3(p.x, -p.y, 10));
        });

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.name = 'PathVisual';
        this.debugGroup.add(line);
    }

    public destroy() {
        if (this.world) {
            this.world.scene.remove(this.debugGroup);
        }
    }
}
