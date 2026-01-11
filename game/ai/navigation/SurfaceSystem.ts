import { Platform, Point, Surface, PhysicsConfig } from '../../../types';
import { SurfaceBuilder } from './generation/SurfaceBuilder';
import { PhysicsSimulator } from './generation/PhysicsSimulator';
import { WalkGenerator } from './generation/edgegenerators/WalkGenerator';
import { FallGenerator } from './generation/edgegenerators/FallGenerator';
import { JumpGenerator } from './generation/edgegenerators/JumpGenerator';
import { WallClimbGenerator } from './generation/edgegenerators/WallClimbGenerator';
import { RideGenerator } from './generation/edgegenerators/RideGenerator';
import { GraphPathFinder } from './GraphPathFinder';

export class SurfaceSystem {
    public surfaces: Surface[] = [];
    private allPlatforms: Platform[] = [];
    private config: PhysicsConfig;

    private builder: SurfaceBuilder;
    private simulator: PhysicsSimulator;
    private walkGen: WalkGenerator;
    private fallGen: FallGenerator;
    private jumpGen: JumpGenerator;
    private wallClimbGen: WallClimbGenerator;
    private rideGen: RideGenerator;
    private pathFinder: GraphPathFinder;

    constructor(gravity: number = 0.8, jumpForce: number = -14, maxSpeed: number = 6) {
        this.config = {
            gravity,
            jumpForce,
            maxSpeed,
            charW: 40,
            charH: 40
        };

        this.builder = new SurfaceBuilder();
    }

    public build(platforms: Platform[]) {
        this.allPlatforms = platforms;

        // 1. Build surfaces
        this.surfaces = this.builder.build(platforms);

        // 2. Initialize generators
        this.simulator = new PhysicsSimulator(this.config, platforms);
        this.walkGen = new WalkGenerator(this.config);
        this.fallGen = new FallGenerator(this.config, this.simulator);
        this.jumpGen = new JumpGenerator(this.config, this.simulator, platforms);
        this.wallClimbGen = new WallClimbGenerator(this.config, this.simulator, platforms, this.surfaces);
        this.rideGen = new RideGenerator();
        this.pathFinder = new GraphPathFinder(this.surfaces, this.config);

        // 3. Generate edges
        this.generateConnections();

        // 4. Generate RIDE edges
        this.rideGen.generateRideEdges(this.surfaces, platforms);
    }

    private generateConnections() {
        console.log('🏗️ [generateConnections] Starting...');

        for (const source of this.surfaces) {
            for (const target of this.surfaces) {
                if (source.id === target.id) continue;

                // Skip moving platform internal connections
                if (
                    source.originalPlatformId &&
                    source.originalPlatformId === target.originalPlatformId &&
                    source.isMovingStation !== target.isMovingStation
                ) {
                    continue;
                }

                // WALK
                this.walkGen.generateWalkEdges(source, target);

                // FALL
                this.fallGen.generateFallEdges(source, target);

                // JUMP & DOUBLE_JUMP
                this.jumpGen.generateJumpEdges(source, target);

                // WALL_CLIMB
                if (target.y < source.y) {
                    this.wallClimbGen.generateWallClimbEdges(source, target);
                }
            }
        }

        console.log('✅ [generateConnections] Complete!');
    }

    public findPath(start: Point, end: Point): Point[] {
        return this.pathFinder.findPath(start, end);
    }

    public findPathFromPlatform(platformId: number, end: Point): Point[] {
        const stations = this.surfaces.filter(s => s.originalPlatformId === platformId);

        if (stations.length === 0) return [];

        let bestPath: Point[] = [];
        let minCost = Infinity;

        stations.forEach(station => {
            const path = this.findPath(station.midPoint, end);

            if (path.length > 0) {
                const cost = path.length;

                if (cost < minCost) {
                    minCost = cost;

                    const rideNode = {
                        x: station.midPoint.x,
                        y: station.y,
                        meta: {
                            type: 'RIDE',
                            ridePlatformId: platformId,
                            targetSurfaceId: station.id,
                            targetY: station.y
                        }
                    };

                    if (path.length === 1) {
                        bestPath = [rideNode];
                    } else {
                        const newPath = [...path];
                        newPath[0] = rideNode;
                        bestPath = newPath;
                    }
                }
            }
        });

        return bestPath;
    }
}
