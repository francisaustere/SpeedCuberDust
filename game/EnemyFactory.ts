
import * as THREE from 'three';
import { GameObject } from '../engine/core/GameObject';
import { GameWorld } from '../engine/core/GameWorld';
import { EnemyData, Level, AimMode, ProjectileType, CollisionLayer } from '../types';
import { MeshRenderer } from '../engine/components/MeshRenderer';
import { EnemyWalker } from './components/EnemyWalker';
import { EnemyDrone } from './components/EnemyDrone';
import { Deadly } from './components/Deadly';
import { SCENE_Config } from '../config/constants';
import { EnemyConfiguration } from './components/EnemyConfiguration';
import { Shooter, ShooterConfig } from './components/Shooter';
import { calculateBounds } from '../utils/bounds';
import { ModularEnemyFactory } from './enemies/ModularEnemyFactory';

interface EnemyTypeConfig {
    geometry: THREE.BufferGeometry;
    material: THREE.Material | THREE.Material[];
    component: any;
    isDeadly: boolean;
    setup?: (go: GameObject, data: EnemyData, level: Level, world: GameWorld) => void;
}

export class EnemyFactory {
    private static cache: Record<string, EnemyTypeConfig> = {};
    private static isInitialized = false;

    private static init() {
        if (this.isInitialized) return;

        const droneGeo = new THREE.SphereGeometry(0.5, 16, 16);
        const droneMat = new THREE.MeshStandardMaterial({
            color: 0xFFBD00,
            roughness: 0.2,
            metalness: 0.5,
            emissive: 0x332200,
            flatShading: true
        });

        const walkerGeo = new THREE.BoxGeometry(1, 1, 1);
        const walkerMat = droneMat.clone();

        this.cache['drone'] = {
            geometry: droneGeo,
            material: droneMat,
            component: EnemyDrone,
            isDeadly: false,
            setup: (go, data, level, world) => {
                go.addComponent(EnemyDrone, data, level, world);
            }
        };

        this.cache['walker'] = {
            geometry: walkerGeo,
            material: walkerMat,
            component: EnemyWalker,
            isDeadly: false,
            setup: (go, data, level, world) => {
                const bounds = calculateBounds(level);
                const walker = go.addComponent(EnemyWalker, data, level.platforms, bounds.life);
                walker.setWorld(world);

                const padding = 8;
                const visualW = Math.max(1, data.w - padding);
                const visualH = Math.max(1, data.h - padding);
                go.transform.scale.set(visualW, visualH, SCENE_Config.PLAYER_DEPTH);
            }
        };

        this.isInitialized = true;
    }

    static create(
        data: EnemyData,
        world: GameWorld,
        level: Level
    ): GameObject {
        // --- NEW MODULAR ENEMY INTERCEPT ---
        if (data.type === 'new_walker' as any) {
            const modFactory = new ModularEnemyFactory(world, level.platforms);
            return modFactory.createNewWalker(data);
        }
        
        if (data.type === 'jumper' as any) {
            const modFactory = new ModularEnemyFactory(world, level.platforms);
            return modFactory.createJumper(data);
        }

        if (!this.isInitialized) this.init();

        const config = this.cache[data.type];
        if (!config) {
            console.warn(`Enemy type ${data.type} not found in factory.`);
            return new GameObject();
        }

        const go = new GameObject(new THREE.Group(), `Enemy_${data.id}`, 'Enemy');

        const meshRenderer = go.addComponent(MeshRenderer, config.geometry, config.material, false, false);
        meshRenderer.mesh.castShadow = true;

        go.transform.setPosition(data.x + data.w / 2, -(data.y + data.h / 2), 0);
        go.transform.scale.set(data.w, data.h, SCENE_Config.PLAYER_DEPTH);

        // --- ATTACH LAYER ---
        (data as any).layer = CollisionLayer.ENEMY;
        (data as any).mask = CollisionLayer.SOLID | CollisionLayer.PLAYER | CollisionLayer.PLAYER_PROJECTILE;

        if (data.shooter) {
            const defaults = EnemyConfiguration.DEFAULTS;
            const isWalker = data.type === 'walker';

            const shooterConfig: ShooterConfig = {
                aimMode: AimMode.PLAYER,
                fireRate: isWalker ? defaults.walkerFireRate : defaults.aimFireRate,
                bulletSpeed: isWalker ? defaults.walkerBulletSpeed : defaults.aimSpeed,
                bulletSize: isWalker ? defaults.walkerBulletSize : defaults.aimSize,
                burstEnabled: false,
                burstCount: 0,
                burstInterval: 0,
                burstDelay: 0,
                initialDelay: isWalker ? defaults.walkerFirstShotDelay : defaults.aimFirstShotDelay,
                telegraphTime: 0.5,
                projectileType: ProjectileType.LINEAR,
                restrictY: isWalker
            };

            go.addComponent(Shooter, shooterConfig, world, level.platforms);

            const enemyConfig = { ...EnemyConfiguration.DEFAULTS };
            if (isWalker) {
                enemyConfig.aimRestrictY = true;
            }
            go.addComponent(EnemyConfiguration, data, enemyConfig);
        }

        if (config.setup) {
            config.setup(go, data, level, world);
        }

        if (config.isDeadly) {
            go.addComponent(Deadly);
        }

        world.addGameObject(go);
        return go;
    }
}
