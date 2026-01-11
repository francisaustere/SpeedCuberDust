
import * as THREE from 'three';
import { GameWorld } from '../../engine/core/GameWorld';
import { GameObject } from '../../engine/core/GameObject';
import { EnemyData, Platform, PhysicsEntity, CollisionLayer } from '../../types';
import { EnemyController } from '../enemies/controllers/EnemyController';
import { GroundMovement } from '../enemies/movement/GroundMovement';
import { PlatformerMovement } from '../enemies/movement/PlatformerMovement';
import { VisionSensor } from '../enemies/sensors/VisionSensor';
import { SimpleCombat } from '../enemies/components/SimpleCombat';
import { Shooter, ShooterConfig } from '../components/Shooter';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { AimMode, ProjectileType } from '../../types';
import { PatrolState } from '../enemies/states/PatrolState';
import { GenericPatrolState } from './states/GenericPatrolState';
import { JumperChaseState } from './states/JumperChaseState';

export class ModularEnemyFactory {
    private world: GameWorld;
    private platforms: Platform[];

    constructor(world: GameWorld, platforms: Platform[]) {
        this.world = world;
        this.platforms = platforms;
    }

    public createNewWalker(data: EnemyData): GameObject {
        const go = new GameObject(new THREE.Group(), 'NewWalker', 'Enemy');

        // 1. Visuals
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            roughness: 0.2,
            metalness: 0.1
        });
        const meshRenderer = go.addComponent(MeshRenderer, geo, mat);
        meshRenderer.mesh.castShadow = true;

        go.transform.setScale(data.w, data.h, data.w);

        // 2. Physics & State
        const physicsState: PhysicsEntity = {
            x: data.x, y: data.y, w: data.w, h: data.h,
            vx: 0, vy: 0,
            isGrounded: false, onWall: false, wallDir: 0,
            wallNormal: { x: 0, y: 0 },
            layer: CollisionLayer.ENEMY,
            mask: CollisionLayer.SOLID | CollisionLayer.PLAYER | CollisionLayer.PLAYER_PROJECTILE
        };

        // 3. Components
        const movement = new GroundMovement(go, physicsState, this.platforms);
        const sensors = new VisionSensor(this.world, this.platforms, physicsState, go);

        // Shooter Setup (Combat)
        const shooterConfig: ShooterConfig = {
            aimMode: AimMode.PLAYER,
            fireRate: 2.0,
            bulletSpeed: 10,
            bulletSize: 10,
            burstEnabled: false,
            burstCount: 0,
            burstInterval: 0,
            burstDelay: 0,
            initialDelay: 1.0,
            telegraphTime: 0.5,
            projectileType: ProjectileType.LINEAR
        };
        const shooter = go.addComponent(Shooter, shooterConfig, this.world, this.platforms);
        const combat = new SimpleCombat(shooter);

        // 4. Controller (Brain)
        const controller = go.addComponent(EnemyController, this.world, movement, sensors, combat, this.platforms);

        // Initialize State Machine
        controller.init(new GenericPatrolState());

        this.world.addGameObject(go);
        go.transform.setPosition(data.x + data.w / 2, -(data.y + data.h / 2), 0);

        return go;
    }

    public createJumper(data: EnemyData): GameObject {
        const go = new GameObject(new THREE.Group(), 'Jumper', 'Enemy');

        // 1. Visuals - Purple to distinguish from Walker
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x9900FF,
            roughness: 0.2,
            metalness: 0.3
        });
        const meshRenderer = go.addComponent(MeshRenderer, geo, mat);
        meshRenderer.mesh.castShadow = true;

        go.transform.setScale(data.w, data.h, data.w);

        // 2. Physics & State
        const physicsState: PhysicsEntity = {
            x: data.x, y: data.y, w: data.w, h: data.h,
            vx: 0, vy: 0,
            isGrounded: false, onWall: false, wallDir: 0,
            wallNormal: { x: 0, y: 0 },
            layer: CollisionLayer.ENEMY,
            mask: CollisionLayer.SOLID | CollisionLayer.PLAYER | CollisionLayer.PLAYER_PROJECTILE
        };

        // 3. Components
        // Register movement as a Component so `destroy()` is called by Engine
        const movement = go.addComponent(PlatformerMovement, physicsState, this.platforms);
        // Important: Enable it so syncPhysicsAndRebuild can work correctly, but we might control updates manually via Controller
        // Actually, if we disable it here, the Engine loop won't call update(), but EnemyController calls update() manually.
        // So enabled=false is correct for manual ticking.
        movement.enabled = false;

        // SYNC PHYSICS immediately to ensure graph is valid for this entity's capability
        // This prevents the "Graph built for 6.0 speed, Unit moves at 3.5 speed" issue
        movement.syncPhysicsAndRebuild(movement.gravity, movement.jumpForce, movement.maxSpeed);

        const sensors = new VisionSensor(this.world, this.platforms, physicsState, go);

        // --- DEBUG / CHEAT CONFIG ---
        // Force omniscient tracking for Jumper to test navigation
        sensors.cheatMode = true;
        sensors.viewRange = 5000; // Effectively infinite for graph search range

        // Dummy Combat (No Shooter)
        const combat = {
            isAttacking: false,
            onCooldown: false,
            range: 50, // Melee range basically
            update: () => { },
            attack: () => { },
            cancelAttack: () => { }
        };

        // 4. Controller (Brain)
        const controller = go.addComponent(EnemyController, this.world, movement, sensors, combat, this.platforms);

        // Initialize State Machine DIRECTLY TO CHASE
        controller.init(new JumperChaseState());

        this.world.addGameObject(go);
        go.transform.setPosition(data.x + data.w / 2, -(data.y + data.h / 2), 0);

        return go;
    }
}