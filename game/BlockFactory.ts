
import * as THREE from 'three';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { EdgesGeometry } from 'three';

import { GameObject } from '../engine/core/GameObject';
import { GameWorld } from '../engine/core/GameWorld';
import { Platform, AimMode, ProjectileType, CollisionLayer } from '../types';
import { Renderer } from '../engine/rendering/Renderer';
import { MeshRenderer } from '../engine/components/MeshRenderer';

import { MovingPlatform } from './components/MovingPlatform';
import { VanishingPlatform, VanishingConfig } from './components/VanishingPlatform';
import { EnemyConfiguration, EnemyConfig } from './components/EnemyConfiguration';
import { Shooter, ShooterConfig } from './components/Shooter';


import { SCENE_Config } from '../config/constants';
import { ThemeConfig as VisualConfig } from '../../config/theme';

export class BlockFactory {

    static create(
        p: Platform,
        world: GameWorld,
        renderer: Renderer,
        allPlatforms: Platform[],
        configs: {
            visual: VisualConfig,
            enemy: EnemyConfig,
            vanishing: VanishingConfig
        }
    ): GameObject {

        const goName = `Block_${p.id}_${p.type || 'std'}`;
        const go = new GameObject(new THREE.Group(), goName, 'LevelObject');

        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;

        go.transform.setPosition(cx, -cy, 0);

        if (p.rotation) {
            go.transform.rotation.z = -p.rotation;
        }

        // --- LAYER ASSIGNMENT ---
        if (p.layer === undefined) {
            p.layer = CollisionLayer.SOLID; // Default
        }

        let depth = SCENE_Config.PLATFORM_DEPTH;
        let material = renderer.materials.platform;
        const type = p.type || 'platform';
        let isVanishing = false;

        if (type === 'wall') {
            depth = SCENE_Config.WALL_DEPTH;
            material = renderer.materials.wall;
        } else if (type === 'floor') {
            depth = SCENE_Config.PLATFORM_DEPTH;
            material = renderer.materials.floor;
        } else if (type === 'cube') {
            depth = SCENE_Config.CUBE_DEPTH;
            material = renderer.materials.cube;
        } else if (type === 'bouncy') {
            depth = SCENE_Config.CUBE_DEPTH;
            material = renderer.materials.bouncy;
        } else if (p.moving) {
            material = renderer.materials.moving;
        } else if (type === 'vanishing') {
            isVanishing = true;
            material = material.clone();
        }

        if (p.isVanishing) {
            isVanishing = true;
            material = material.clone();
        }

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const meshRenderer = go.addComponent(MeshRenderer, geometry, material, true, isVanishing);
        meshRenderer.mesh.castShadow = true;
        meshRenderer.mesh.receiveShadow = true;

        const edgesGeo = new EdgesGeometry(geometry);
        const lineGeo = new LineSegmentsGeometry().fromEdgesGeometry(edgesGeo);
        const edges = new LineSegments2(lineGeo, renderer.materials.edges);
        go.object3D.add(edges);

        go.transform.scale.set(p.w, p.h, depth);

        if (p.moving) {
            go.addComponent(MovingPlatform, p);
        }

        if (isVanishing) {
            go.addComponent(VanishingPlatform, p, configs.vanishing);
        }

        world.addGameObject(go);
        return go;
    }
}
