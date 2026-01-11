
import * as THREE from 'three';
import { GameWorld } from '../core/GameWorld';
import { Renderer } from '../../engine/rendering/Renderer';
import { Level, Platform, CollisionLayer, Rect } from '../../types';
import { SpatialHashGrid } from '../../game/utils/SpatialHashGrid';
import { calculateBounds } from '../../utils/bounds';
import { GameObject } from './../core/GameObject';
import { BlockFactory } from '../../game/BlockFactory';
import { EnemyFactory } from '../../game/EnemyFactory';
import { MovingPlatform } from '../../game/components/MovingPlatform';
import { VanishingPlatform } from '../../game/components/VanishingPlatform';
import { SCENE_Config } from '../../config/constants';

export interface SceneLoadResult {
    spatialHash: SpatialHashGrid;
    dynamicPlatforms: Platform[];
    bounds: { life: Rect, level: Rect };
}

export class SceneBuilder {
    private world: GameWorld;
    private renderer: Renderer;

    constructor(world: GameWorld, renderer: Renderer) {
        this.world = world;
        this.renderer = renderer;
    }

    /**
     * Loads a level into the GameWorld.
     * Handles Diffing (Creating new, Updating existing, Deleting removed).
     * Builds and returns the physics indexes (SpatialHash).
     */
    public load(level: Level, configs: any): SceneLoadResult {
        let geometryChanged = false;
        const dynamicPlatforms: Platform[] = [];

        // 1. Calculate Bounds
        const bounds = calculateBounds(level);
        const spatialHash = new SpatialHashGrid(bounds.level, 200);

        // 2. Identify Existing Level Objects
        const existingPlatforms = new Map<number, GameObject>();
        this.world.gameObjects.forEach(go => {
            if (go.tag === 'LevelObject') {
                // Parse ID from name "Block_{id}_{type}"
                const parts = go.name.split('_');
                if (parts.length >= 2) {
                    const id = parseFloat(parts[1]);
                    if (!isNaN(id)) existingPlatforms.set(id, go);
                }
            }
        });

        const newPlatformIds = new Set(level.platforms.map(p => p.id));

        // 3. DELETE: Remove objects not in the new level
        existingPlatforms.forEach((go, id) => {
            if (!newPlatformIds.has(id)) {
                this.world.removeGameObject(go);
                geometryChanged = true;
            }
        });

        // 4. CREATE / UPDATE
        level.platforms.forEach(p => {
            // Ensure layer is set
            if (p.layer === undefined) {
                p.layer = CollisionLayer.SOLID;
            }

            // Indexing: Separate Moving vs Static
            if (p.type === 'moving' || p.moving) {
                dynamicPlatforms.push(p);
            } else {
                spatialHash.insert(p);
            }

            const existingGO = existingPlatforms.get(p.id);

            if (existingGO) {
                // --- UPDATE EXISTING ---
                const cx = p.x + p.w / 2;
                const cy = p.y + p.h / 2;
                const targetZ = p.type === 'wall' ? SCENE_Config.WALL_DEPTH : 
                                p.type === 'cube' ? SCENE_Config.CUBE_DEPTH : SCENE_Config.PLATFORM_DEPTH;

                // Only update transform if changed (Optimization)
                if (Math.abs(existingGO.transform.position.x - cx) > 0.1 ||
                    Math.abs(existingGO.transform.position.y - (-cy)) > 0.1 ||
                    Math.abs(existingGO.transform.scale.x - p.w) > 0.1 ||
                    Math.abs(existingGO.transform.scale.y - p.h) > 0.1 ||
                    Math.abs(existingGO.transform.rotation.z - (p.rotation ? -p.rotation : 0)) > 0.01) {
                    
                    existingGO.transform.setPosition(cx, -cy, 0);
                    existingGO.transform.scale.set(p.w, p.h, targetZ);
                    existingGO.transform.rotation.z = p.rotation ? -p.rotation : 0;
                    geometryChanged = true;
                }

                // Update Component Data References
                const mp = existingGO.getComponent(MovingPlatform);
                if (mp) mp.platformData = p;

                const vp = existingGO.getComponent(VanishingPlatform);
                if (vp) vp.platformData = p;

            } else {
                // --- CREATE NEW ---
                BlockFactory.create(p, this.world, this.renderer, level.platforms, configs);
                geometryChanged = true;
            }
        });

        // 5. ENEMIES
        // Current Strategy: Full Rebuild (Safer for complex state machines)
        this.world.destroyObjectsByTag('Enemy');
        if (level.enemies) {
            level.enemies.forEach(e => {
                EnemyFactory.create(e, this.world, level);
            });
        }

        // 6. Signal Changes
        if (geometryChanged) {
            this.world.incrementGeometryVersion();
        }

        return {
            spatialHash,
            dynamicPlatforms,
            bounds
        };
    }
}
