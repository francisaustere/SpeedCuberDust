
import { InputState, Level, Platform, Rect, Camera } from '../types';
import { CollisionResolver } from '../systems/CollisionResolver';
import { SpatialHashGrid } from '../game/utils/SpatialHashGrid';
import { GameWorld } from './GameWorld';
import { Renderer } from '../engine/rendering/Renderer';

export interface UpdateContext {
    dt: number;
    input: InputState;
    collisionResolver: CollisionResolver;
    spatialHash: SpatialHashGrid;
    dynamicPlatforms: Platform[];
    platforms: Platform[]; // All platforms (static + dynamic)
    levelBounds: { level: Rect, life: Rect };
    world: GameWorld;
    renderer: Renderer;
    
    // Configs (from Debug/Global state)
    physicsConfig: any;
    deformationConfig: any;
    vanishingConfig: any;
    enemyConfig: any;
    pathfindingConfig: any;
    drawConfig: any;
    visualConfig: any;
    isPaused: boolean;

    // Full config object and camera state
    config: any;
    activeCamera?: Camera;
}
