
import * as THREE from 'three';
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { GameWorld } from '../../engine/core/GameWorld';
import { Platform, AimMode, ProjectileType } from '../../types';
import { PlayerController } from './PlayerController';
import { Projectile, ProjectileConfig } from './Projectile';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { ParticleFactory } from '../ParticleFactory';
import { UpdateContext } from '../../engine/core/UpdateContext';

export interface ShooterConfig {
    aimMode: AimMode;
    fireRate: number;
    bulletSpeed: number;
    bulletSize: number;
    burstEnabled: boolean;
    burstCount: number;
    burstInterval: number;
    burstDelay: number;
    initialDelay: number;
    telegraphTime: number;
    projectileType: ProjectileType;
    restrictY?: boolean; // For Walker aim
    predictive?: boolean;
    predictionLead?: number;
}

export class Shooter extends Component {
    private config: ShooterConfig;
    private world: GameWorld;
    private platforms: Platform[];
    private particleFactory: ParticleFactory;

    // State
    private lastFireTime: number = 0;
    private burstShotsLeft: number = 0;
    private nextBurstShotTime: number = 0;
    private telegraphTimer: number = 0;

    // Logic
    public isCharging: boolean = false; // Exposed for visual feedback
    private hasFired: boolean = false;
    private lastTargetAngle: number = 0;

    // Parent Reference
    private parentTransform: THREE.Object3D;

    constructor(
        gameObject: GameObject,
        config: ShooterConfig,
        world: GameWorld,
        platforms: Platform[]
    ) {
        super(gameObject);
        this.config = config;
        this.world = world;
        this.platforms = platforms;
        this.particleFactory = new ParticleFactory(world);
        this.parentTransform = gameObject.object3D;

        // Apply Initial Delay: first shot happens after 'initialDelay' has passed
        // We start lastFireTime at (fireRate - initialDelay) so it reaches fireRate exactly after initialDelay seconds.
        this.lastFireTime = this.config.fireRate - config.initialDelay;
    }

    public updateConfig(newConfig: Partial<ShooterConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    public reset(): void {
        this.lastFireTime = this.config.fireRate - this.config.initialDelay;
        this.isCharging = false;
        this.burstShotsLeft = 0;
    }

    public update(dt: number, context: UpdateContext): void {
        if (!this.enabled || context.isPaused) {
            this.isCharging = false;
            return;
        }

        // Update Config Live (if provided via EnemyConfig)
        if (context.config && context.config.enemyConfig) {
            // Mapping logic could go here if we wanted fully dynamic updates
            // keeping it simple for now using initialized config
        }

        this.lastFireTime += dt;

        // 1. Aim Calculation
        let aimAngle = this.lastTargetAngle;
        let canSeePlayer = false;

        if (this.config.aimMode === AimMode.FIXED) {
            aimAngle = this.transform.rotation.z - Math.PI / 2;
            canSeePlayer = true; // Always fire
        }
        else if (this.config.aimMode === AimMode.PLAYER) {
            const playerGO = this.world.findObjectByName('Player');
            if (playerGO) {
                const pc = playerGO.getComponent(PlayerController);
                if (pc && !pc.state.isDead) {
                    const p = pc.state;
                    const myPos = this.transform.position;
                    const cx = myPos.x;
                    const cy = -myPos.y; // Physics Y

                    const px = p.x + p.w / 2;
                    const py = p.y + p.h / 2;

                    let targetX = px;
                    let targetY = this.config.restrictY ? cy : py;

                    // Support Predictive Shooting
                    if (this.config.predictive && this.config.bulletSpeed > 0) {
                        const dist = Math.sqrt((px - cx) ** 2 + (targetY - cy) ** 2);
                        const timeToImpact = dist / this.config.bulletSpeed;
                        const lead = this.config.predictionLead ?? 1.0;

                        targetX += p.vx * timeToImpact * lead;
                        if (!this.config.restrictY) {
                            targetY += p.vy * timeToImpact * lead;
                        }
                    }

                    aimAngle = Math.atan2(targetY - cy, targetX - cx);
                    this.lastTargetAngle = aimAngle;
                    canSeePlayer = true;
                }
            }
        }

        if (!canSeePlayer) {
            this.isCharging = false;
            return;
        }

        // 2. Firing Logic
        const fireRate = this.config.fireRate;
        const telegraph = this.config.telegraphTime;

        // BURST LOGIC
        if (this.config.burstEnabled) {
            // Burst Active
            if (this.burstShotsLeft > 0) {
                this.nextBurstShotTime -= dt;
                if (this.nextBurstShotTime <= 0) {
                    this.fire(aimAngle);
                    this.burstShotsLeft--;
                    this.nextBurstShotTime = this.config.burstInterval;
                }
            }
            // Burst Cooldown / Ready
            else {
                const timeUntilFire = this.config.burstDelay - this.lastFireTime;

                // Telegraphing
                if (timeUntilFire <= telegraph && timeUntilFire > 0) {
                    this.isCharging = true;
                } else {
                    this.isCharging = false;
                }

                if (this.lastFireTime >= this.config.burstDelay) {
                    this.burstShotsLeft = this.config.burstCount;
                    this.lastFireTime = 0;
                    this.fire(aimAngle);
                    this.burstShotsLeft--;
                    this.nextBurstShotTime = this.config.burstInterval;
                    this.isCharging = false;
                }
            }
        }
        // SINGLE SHOT LOGIC
        else {
            const timeUntilFire = fireRate - this.lastFireTime;

            if (timeUntilFire <= telegraph && timeUntilFire > 0) {
                this.isCharging = true;
            } else {
                this.isCharging = false;
            }

            if (this.lastFireTime >= fireRate) {
                this.fire(aimAngle);
                this.lastFireTime = 0;
                this.isCharging = false;
            }
        }
    }

    private fire(angle: number) {
        const offset = 40;
        const pos = this.transform.position;
        const cx = pos.x;
        const cy = -pos.y; // Physics Y

        const spawnX = cx + Math.cos(angle) * offset;
        const spawnY = cy + Math.sin(angle) * offset;

        const speed = this.config.bulletSpeed;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        const size = this.config.bulletSize;

        const bulletGO = new GameObject(new THREE.Group(), 'Bullet', 'Bullet');
        // Visual Position (ThreeJS Y is Up)
        bulletGO.transform.setPosition(spawnX - size / 2, -(spawnY - size / 2), 0);

        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
        bulletGO.addComponent(MeshRenderer, geo, mat);

        const projConfig: ProjectileConfig = {
            vx: vx,
            vy: vy, // Both are now in Physics Space (Down is positive)
            speed: speed,
            life: 5.0,
            size: size,
            type: this.config.projectileType,
            damage: 1,
            color: 0xFFFFFF
        };

        bulletGO.addComponent(Projectile, projConfig, this.platforms, this.world, this.particleFactory);
        this.world.addGameObject(bulletGO);
    }
}
