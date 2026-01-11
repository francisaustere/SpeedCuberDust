
import * as THREE from 'three';
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { GameWorld } from '../../engine/core/GameWorld';
import { PlayerController } from './PlayerController';
import { Projectile, ProjectileConfig } from './Projectile';
import { ProjectileType, Point } from '../../types';
import { WEAPON_CONFIG } from '../../config/constants';
import { ParticleFactory } from '../ParticleFactory';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { UpdateContext } from '../../engine/core/UpdateContext';

export class WeaponController extends Component {
    private player: PlayerController | null = null;
    private world: GameWorld;
    private particleFactory: ParticleFactory;

    // State
    private isCharging: boolean = false;
    private chargeTimer: number = 0;
    private mouseWorld: Point = { x: 0, y: 0 };

    // Visuals
    private trajectoryLine: THREE.Line | null = null;
    private bowPivot: THREE.Group;

    constructor(gameObject: GameObject, world: GameWorld) {
        super(gameObject);
        this.world = world;
        this.particleFactory = new ParticleFactory(world);
        this.bowPivot = new THREE.Group();
        this.gameObject.object3D.add(this.bowPivot);
    }

    public init(): void {
        this.player = this.gameObject.getComponent(PlayerController) || null;

        // Trajectory Line Setup
        const geo = new THREE.BufferGeometry();
        const mat = new THREE.LineDashedMaterial({
            color: 0x00FFFF,
            dashSize: 10,
            gapSize: 5,
            transparent: true,
            opacity: 0.6
        });
        this.trajectoryLine = new THREE.Line(geo, mat);
        this.trajectoryLine.frustumCulled = false;
        this.world.scene.add(this.trajectoryLine);

        // Simple Visual Bow Indicator
        const bowMesh = new THREE.Mesh(
            new THREE.BoxGeometry(30, 6, 6),
            new THREE.MeshStandardMaterial({ color: 0x00FFFF, emissive: 0x00FFFF })
        );
        bowMesh.position.x = 25;
        this.bowPivot.add(bowMesh);

        // Listen for mouse
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
    }

    private handleMouseDown = (e: MouseEvent) => {
        const isPaused = (window as any).engine?.debugConfig?.current?.isDevMode;
        if (isPaused) return;

        if (e.button === 0 && this.player && this.player.state.ammo > 0) this.isCharging = true;
    };

    private handleMouseUp = (e: MouseEvent) => {
        const isPaused = (window as any).engine?.debugConfig?.current?.isDevMode;
        if (isPaused) return;

        if (e.button === 0 && this.isCharging) {
            this.fire();
            this.isCharging = false;
            this.chargeTimer = 0;
        }
    };

    public update(dt: number, context: UpdateContext): void {
        if (!this.player || context.isPaused) return;

        // 1. Update Mouse World Position (In Physics Space: Y is Down)
        // Accessing inputSystem via window.engine is ugly but consistent with legacy structure
        // Better would be if context.input provided mouse position directly
        const mouse = (window as any).engine?.inputSystem.getMousePosition() || { x: 0, y: 0 };
        const cam = context.activeCamera || { x: 0, y: 0, w: 800, h: 600 };

        const screenW = window.innerWidth;
        const screenH = window.innerHeight;

        this.mouseWorld = {
            x: cam.x + (mouse.x / screenW) * cam.w,
            y: cam.y + (mouse.y / screenH) * cam.h
        };

        const p = this.player.state;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;

        // 2. Bow Direction
        // atan2(dy, dx) in physics space.
        const dx = this.mouseWorld.x - cx;
        const dy = this.mouseWorld.y - cy;
        const angle = Math.atan2(dy, dx);

        // Bow Pivot needs Three.js rotation (negate dy for visual up)
        this.bowPivot.rotation.z = Math.atan2(-dy, dx);

        // 3. Charge Logic
        if (this.isCharging) {
            if (this.player && this.player.state.ammo <= 0) {
                this.isCharging = false;
                this.chargeTimer = 0;
                return;
            }
            this.chargeTimer = Math.min(this.chargeTimer + dt, WEAPON_CONFIG.CHARGE_TIME);
            this.updateTrajectory(cx, cy, angle);
            this.trajectoryLine!.visible = true;
        } else {
            this.trajectoryLine!.visible = false;
        }
    }

    private updateTrajectory(startX: number, startY: number, angle: number) {
        if (!this.trajectoryLine) return;

        const powerRatio = this.chargeTimer / WEAPON_CONFIG.CHARGE_TIME;
        const power = WEAPON_CONFIG.MIN_POWER + (WEAPON_CONFIG.MAX_POWER - WEAPON_CONFIG.MIN_POWER) * powerRatio;

        const vx = Math.cos(angle) * power;
        const vy = Math.sin(angle) * power;

        const points: THREE.Vector3[] = [];
        let curX = startX;
        let curY = startY;
        let curVy = vy;

        const gravity = WEAPON_CONFIG.PROJECTILE_GRAVITY;
        const steps = WEAPON_CONFIG.TRAJECTORY_POINTS;
        const frameStep = WEAPON_CONFIG.TRAJECTORY_STEP;

        for (let i = 0; i < steps; i++) {
            // Push points in Visual Space (Negated Y)
            points.push(new THREE.Vector3(curX, -curY, 20));

            for (let j = 0; j < frameStep; j++) {
                curVy += gravity;
                curX += vx;
                curY += curVy;
            }
        }

        this.trajectoryLine.geometry.setFromPoints(points);
        this.trajectoryLine.computeLineDistances();
    }

    private fire() {
        if (!this.player || this.player.state.ammo <= 0) return;

        this.player.state.ammo--;
        const p = this.player.state;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;

        const dx = this.mouseWorld.x - cx;
        const dy = this.mouseWorld.y - cy;
        const angle = Math.atan2(dy, dx);

        const powerRatio = this.chargeTimer / WEAPON_CONFIG.CHARGE_TIME;
        const power = WEAPON_CONFIG.MIN_POWER + (WEAPON_CONFIG.MAX_POWER - WEAPON_CONFIG.MIN_POWER) * powerRatio;

        const bulletGO = new GameObject(new THREE.Group(), 'PlayerArrow', 'Bullet');
        bulletGO.transform.setPosition(cx, -cy, 0);

        const bulletGeo = new THREE.BoxGeometry(40, 3, 3);
        const bulletMat = new THREE.MeshStandardMaterial({ color: 0x00FFFF, emissive: 0x00FFFF });
        bulletGO.addComponent(MeshRenderer, bulletGeo, bulletMat);

        const config: ProjectileConfig = {
            vx: Math.cos(angle) * power,
            vy: Math.sin(angle) * power,
            speed: power,
            life: 5.0,
            size: 10,
            type: ProjectileType.LINEAR,
            damage: 1,
            color: 0x00FFFF,
            gravity: WEAPON_CONFIG.PROJECTILE_GRAVITY,
            isPlayerOwned: true
        };

        bulletGO.addComponent(Projectile, config, (window as any).engine.currentLevel.platforms, this.world, this.particleFactory);
        this.world.addGameObject(bulletGO);
    }

    public destroy(): void {
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        if (this.trajectoryLine) this.world.scene.remove(this.trajectoryLine);
    }
}
