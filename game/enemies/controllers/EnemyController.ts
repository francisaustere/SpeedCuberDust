
import * as THREE from 'three';
import { Component } from '../../../engine/core/Component';
import { GameObject } from '../../../engine/core/GameObject';
import { IEnemyController, IMovement, ISensors, ICombat } from '../../../types/EnemyTypes';
import { EnemyStateMachine } from './EnemyStateMachine';
import { GameWorld } from '../../../engine/core/GameWorld';
import { Rect, Platform, Point } from '../../../types';
import { GroundMovement } from '../movement/GroundMovement';
import { FlightMovement } from '../movement/FlightMovement';
import { PlatformerMovement } from '../movement/PlatformerMovement';
import { VisionSensor } from '../sensors/VisionSensor';
import { GenericSurprisedState } from '../states/GenericSurprisedState';
import { MeshRenderer } from '../../../engine/components/MeshRenderer';
import { UpdateContext } from '../../../engine/core/UpdateContext';

export class EnemyController extends Component implements IEnemyController {
    // Components (Injected or Retrieved)
    public movement: IMovement;
    public sensors: ISensors;
    public combat: ICombat;

    public get id(): number { return this.gameObject.id; }

    // State
    public health: number = 3;
    public maxHealth: number = 3;
    public isDead: boolean = false;
    private flashTimer: number = 0;
    private originalColor: number = 0xFF0000;

    // Logic
    private stateMachine: EnemyStateMachine;
    public world: GameWorld;
    public platforms: Platform[];
    private investigatePos: Point | null = null;

    public changeState(state: any): void {
        this.stateMachine.changeState(state);
    }

    // Debug & Feedback Visuals
    private debugMesh: THREE.Mesh | null = null;
    private debugColliders: THREE.Group | null = null;
    private surpriseIcon: THREE.Mesh | null = null;
    private searchIcon: THREE.Mesh | null = null;
    private debugHearing: THREE.LineLoop | null = null;
    private debugSocial: THREE.LineLoop | null = null;
    private debugPredictionMesh: THREE.Mesh | null = null;
    private debugWaypointsGroup: THREE.Group | null = null;

    constructor(
        gameObject: GameObject,
        world: GameWorld,
        movement: IMovement,
        sensors: ISensors,
        combat: ICombat,
        platforms: Platform[]
    ) {
        super(gameObject);
        this.world = world;
        this.platforms = platforms;
        this.movement = movement;
        this.sensors = sensors;
        this.combat = combat;

        this.stateMachine = new EnemyStateMachine(this);
    }

    public init(initialState?: any): void {
        this.stateMachine.start(initialState);
    }

    public update(dt: number, context: UpdateContext): void {
        if (this.isDead || context.isPaused) {
            if (this.surpriseIcon) this.surpriseIcon.visible = false;
            if (this.searchIcon) this.searchIcon.visible = false;
            return;
        }

        const config = context.config;

        // 1. Update Sub-Components
        this.movement.update(dt);
        this.sensors.update(dt);
        this.combat.update(dt);

        // 2. Update Brain
        this.stateMachine.update(dt);

        // 3. Sync Live Config (Ported from legacy Walker)
        if (config && config.enemyConfig) {
            this.syncLiveConfig(config.enemyConfig);
        }

        // Handle Hurt Flash
        if (this.flashTimer > 0) {
            this.flashTimer -= dt;
            this.setMeshColor(0xffffff); // Flash White
            if (this.flashTimer <= 0) {
                this.setMeshColor(this.originalColor);
            }
        }

        // 4. Update Feedback & Debug
        this.updateFeedback();
        if (config?.drawConfig) {
            this.updateDebugViews(config.drawConfig);
        }
    }

    private syncLiveConfig(c: any): void {
        // Sync Movement
        if (this.movement instanceof GroundMovement) {
            // Speed depends on state
            const state = this.stateMachine.getCurrentStateName();
            this.movement.maxSpeed = (state === 'Chase' || state === 'Attack') ? c.walkerChaseSpeed : c.walkerSpeed;
        }

        // Sync Jumper Movement
        if (this.movement instanceof PlatformerMovement) {
            // Updated to sync new Jump Prediction parameters
            this.movement.jumpPredictionDrag = c.jumperPredictionDrag ?? 1.25;
            this.movement.jumpPredictionBuffer = c.jumperPredictionBuffer ?? 15;

            // Sync Wall Climb settings
            this.movement.wallClimbKickOffX = c.jumperWallClimbKickOffX ?? 6.0;
            this.movement.wallClimbKickOffY = c.jumperWallClimbKickOffY ?? -14.0;
            this.movement.wallClimbAirAccel = c.jumperWallClimbAirAccel ?? 0.2;
            this.movement.wallClimbReengageY = c.jumperWallClimbReengageY ?? -2.0;

            // IMPORTANT: Sync Physics for Graph Validity
            const grav = c.jumperGravity ?? 0.8;
            const jump = c.jumperJumpForce ?? -14.0;
            const speed = c.jumperMaxSpeed ?? 3.5;

            // Rebuild graph if physics changed
            this.movement.syncPhysicsAndRebuild(grav, jump, speed);
        }

        // Sync Sensors
        if (this.sensors instanceof VisionSensor) {
            this.sensors.viewRange = c.walkerViewDist;
            this.sensors.viewHeight = c.walkerViewHeight;
            this.sensors.hearingRadius = c.walkerHearingRadius ?? 100;
            const state = this.stateMachine.getCurrentStateName();
            this.sensors.isCombatMode = (state === 'Chase' || state === 'Attack');
        }

        // Sync Combat (Shooter config)
        if (this.combat && (this.combat as any).shooter) {
            const s = (this.combat as any).shooter;
            s.updateConfig({
                fireRate: c.walkerFireRate,
                bulletSpeed: c.walkerBulletSpeed,
                bulletSize: c.walkerBulletSize,
                initialDelay: c.walkerFirstShotDelay,
                telegraphTime: c.walkerTelegraphTime,
                predictive: true, // Always enable logic, we control via lead
                predictionLead: c.walkerPredictiveLead
            });
        }
    }

    public notifySignal(pos: Point, type: string): void {
        const state = this.stateMachine.getCurrentStateName();
        if (state === 'Patrol' || (state === 'Searching' && type === 'ALLY_DEATH')) {
            this.investigatePos = { ...pos };
            const surpriseTime = (window as any).engine?.debugConfig?.current?.enemyConfig?.walkerSurpriseTime ?? 0.5;

            // Reusing Surprised as the "!" beat
            this.changeState(new GenericSurprisedState(surpriseTime, this.investigatePos));
        }
    }

    private updateFeedback(): void {
        const state = this.stateMachine.getCurrentStateName();

        const isSurprised = state === 'Surprised';
        const isSearching = state === 'Searching';
        const isCombat = state === 'Chase' || state === 'Attack';

        const showQuestion = isSurprised;
        const showExclamation = isSearching || isCombat;

        const scene = this.world.scene; // Use world scene directly
        if (!scene) return;

        const worldPos = new THREE.Vector3();
        this.gameObject.object3D.getWorldPosition(worldPos);
        const parentScale = this.gameObject.transform.scale;

        // Update Question Mark (?)
        if (showQuestion) {
            if (!this.searchIcon) {
                this.searchIcon = this.createEmoteIcon('?');
                scene.add(this.searchIcon);
            }
            this.searchIcon.visible = true;
            this.searchIcon.scale.set(64, 64, 1);
            // World position: Head top + offset. Z=100 for overlay.
            this.searchIcon.position.set(worldPos.x, worldPos.y + parentScale.y / 2 + 40, 100);
        } else if (this.searchIcon) {
            this.searchIcon.visible = false;
        }

        // Update Exclamation Mark (!)
        if (showExclamation) {
            if (!this.surpriseIcon) {
                this.surpriseIcon = this.createEmoteIcon('!');
                scene.add(this.surpriseIcon);
            }
            this.surpriseIcon.visible = true;
            this.surpriseIcon.scale.set(64, 64, 1);
            this.surpriseIcon.position.set(worldPos.x, worldPos.y + parentScale.y / 2 + 40, 100);
        } else if (this.surpriseIcon) {
            this.surpriseIcon.visible = false;
        }
    }

    private createEmoteIcon(text: string): THREE.Mesh {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            // Background Circle
            ctx.beginPath();
            ctx.arc(64, 64, 60, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 6;
            ctx.stroke();

            // Text
            ctx.fillStyle = text === '!' ? '#FF3300' : '#FFCC00'; // Red for !, Yellow for ?
            ctx.font = 'bold 96px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 64, 64);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const geo = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geo, material);
        mesh.renderOrder = 2000; // Force to very top overlay
        return mesh;
    }

    private updateDebugViews(drawConfig: any): void {
        // 1. Cones
        if (drawConfig.showWalkerViewCones) {
            this.drawViewRange();
        } else if (this.debugMesh) {
            this.debugMesh.visible = false;
        }

        // 2. Colliders
        if (drawConfig.showWalkerColliders) {
            this.drawDebugColliders();
        } else if (this.debugColliders) {
            this.debugColliders.visible = false;
        }

        // 3. Hearing Range
        if (drawConfig.showWalkerHearingRange) {
            this.drawHearingRange();
        } else if (this.debugHearing) {
            this.debugHearing.visible = false;
        }

        // 4. Social Range
        if (drawConfig.showWalkerSocialRange) {
            this.drawSocialRange();
        } else if (this.debugSocial) {
            this.debugSocial.visible = false;
        }

        // 5. Enemy Logic (Jumper)
        if (drawConfig.showEnemyLogic && this.movement instanceof PlatformerMovement) {
            this.updateJumperDebug(this.movement);
        } else {
            if (this.debugPredictionMesh) this.debugPredictionMesh.visible = false;
            if (this.debugWaypointsGroup) this.debugWaypointsGroup.visible = false;
        }
    }

    private updateJumperDebug(movement: PlatformerMovement) {
        // Ghost Platform
        const pred = movement.executor.debugPrediction;
        if (pred) {
            if (!this.debugPredictionMesh) {
                const geo = new THREE.BoxGeometry(1, 1, 1);
                // Cyan transparent box with faint opacity
                // Ensure depthTest: false to render on top of platform
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x00FFFF,
                    transparent: true,
                    opacity: 0.5,
                    wireframe: false,
                    depthTest: false,
                    depthWrite: false
                });
                this.debugPredictionMesh = new THREE.Mesh(geo, mat);
                this.debugPredictionMesh.renderOrder = 999;
                this.world.scene.add(this.debugPredictionMesh);
            }
            this.debugPredictionMesh.visible = true;
            // Set Z to 60 to pop out in front of platforms (approx depth 45)
            this.debugPredictionMesh.position.set(pred.x + pred.w / 2, -(pred.y + pred.h / 2), 60);
            this.debugPredictionMesh.scale.set(pred.w, pred.h, 1);
        } else {
            if (this.debugPredictionMesh) this.debugPredictionMesh.visible = false;
        }

        // Waypoints
        if (!this.debugWaypointsGroup) {
            this.debugWaypointsGroup = new THREE.Group();
            this.debugWaypointsGroup.renderOrder = 999;
            this.world.scene.add(this.debugWaypointsGroup);
        }
        this.debugWaypointsGroup.visible = true;

        // Rebuild markers - Clear children first
        while (this.debugWaypointsGroup.children.length > 0) {
            const c = this.debugWaypointsGroup.children[0];
            this.debugWaypointsGroup.remove(c);
            if ((c as any).geometry) (c as any).geometry.dispose();
            if ((c as any).material) (c as any).material.dispose();
        }

        const path = movement.navigator.path;
        if (path) {
            path.forEach(node => {
                const meta = (node as any).meta;
                if (meta && meta.type === 'RIDE') {
                    const geo = new THREE.BoxGeometry(30, 30, 30); // Blue Cube, larger to see
                    const mat = new THREE.MeshBasicMaterial({
                        color: 0x0000FF,
                        depthTest: false,
                        depthWrite: false,
                        transparent: true,
                        opacity: 0.8
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    mesh.position.set(node.x, -node.y, 60); // Z pop
                    mesh.renderOrder = 999;
                    this.debugWaypointsGroup!.add(mesh);
                }
            });
        }
    }

    private drawViewRange() {
        if (!this.debugMesh) {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({
                color: 0x00FFFF,
                opacity: 0.15,
                transparent: true,
                depthTest: false,
                side: THREE.DoubleSide
            });
            this.debugMesh = new THREE.Mesh(geo, mat);
            this.debugMesh.renderOrder = 997;
            this.world.scene.add(this.debugMesh);
        }
        this.debugMesh.visible = true;

        const pos = this.gameObject.transform.position;
        const scale = this.gameObject.transform.scale;

        // Get range from sensors
        const range = (this.sensors as any).viewRange || 350;
        const height = ((this.sensors as any).viewHeight || 100) * 2;

        this.debugMesh.scale.set(range, height, 1);

        // Direction based on rotation
        const forwardX = Math.cos(this.gameObject.transform.rotation.y);
        const offsetX = (forwardX * range) / 2;

        this.debugMesh.position.set(pos.x + offsetX, pos.y, 50);
    }

    private drawDebugColliders() {
        if (!this.debugColliders) {
            this.debugColliders = new THREE.Group();
            const deadlyGeo = new THREE.BoxGeometry(1, 1, 1);
            const deadlyMat = new THREE.MeshBasicMaterial({ color: 0xFF0000, opacity: 0.3, transparent: true, depthTest: false });
            const deadlyMesh = new THREE.Mesh(deadlyGeo, deadlyMat);
            deadlyMesh.name = 'Body';
            this.debugColliders.add(deadlyMesh);
            this.world.scene.add(this.debugColliders);
        }
        this.debugColliders.visible = true;

        const pos = this.gameObject.transform.position;
        const scale = this.gameObject.transform.scale;

        const deadly = this.debugColliders.getObjectByName('Body');
        if (deadly) {
            deadly.scale.set(scale.x, scale.y, 20);
            deadly.position.set(pos.x, pos.y, 10);
        }
    }

    private drawHearingRange() {
        const radius = (this.sensors as any).hearingRadius || 100;
        if (!this.debugHearing) {
            const points = [];
            for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0x00FF00, transparent: true, opacity: 0.5, depthTest: false });
            this.debugHearing = new THREE.LineLoop(geo, mat);
            this.world.scene.add(this.debugHearing);
        }
        this.debugHearing.visible = true;
        this.debugHearing.scale.set(radius, radius, 1);
        this.debugHearing.position.set(this.gameObject.transform.position.x, this.gameObject.transform.position.y, 10);
    }

    private drawSocialRange() {
        const radius = (window as any).engine?.debugConfig?.current?.enemyConfig?.walkerSocialRange || 400;
        if (!this.debugSocial) {
            const points = [];
            for (let i = 0; i <= 64; i++) {
                const a = (i / 64) * Math.PI * 2;
                points.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
            }
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({ color: 0x00AAFF, transparent: true, opacity: 0.3, depthTest: false });
            this.debugSocial = new THREE.LineLoop(geo, mat);
            this.world.scene.add(this.debugSocial);
        }
        this.debugSocial.visible = true;
        this.debugSocial.scale.set(radius, radius, 1);
        this.debugSocial.position.set(this.gameObject.transform.position.x, this.gameObject.transform.position.y, 10);
    }

    public getDebugInfo() {
        const state = this.stateMachine.getCurrentStateName();
        let phase = "";
        let timer = 0;

        if (state === 'Surprised') {
            phase = "ALERTED";
        } else if (state === 'Searching') {
            phase = "INVESTIGATING";
        } else if (state === 'Chase') {
            phase = "COMBAT";
        } else if (state === 'Attack') {
            phase = "FIRING";
        } else if (state === 'JumperChase') {
            phase = "HUNTING";
        }

        return { phase, timer, state };
    }


    public takeDamage(amount: number): void {
        if (this.isDead) return;

        this.health -= amount;
        this.flashTimer = 0.15; // 150ms flash

        if (amount > 0) {
            // Alert the enemy to the attacker's location
            const playerPos = this.sensors.getPlayerPosition() || this.world.findObjectByName('Player')?.transform.position;
            if (playerPos) {
                this.notifySignal({ x: playerPos.x, y: -playerPos.y }, 'HURT');
            }
        }

        if (this.health <= 0) {
            this.health = 0;
            this.die();
        }
    }

    private setMeshColor(color: number): void {
        const renderer = this.gameObject.getComponent(MeshRenderer);
        if (renderer && renderer.mesh && (renderer.mesh.material as any).color) {
            (renderer.mesh.material as any).color.setHex(color);
        }
    }

    private die(): void {
        this.isDead = true;
        this.movement.stop();

        // Broadcast signal to nearby friends
        const socialRange = (window as any).engine?.debugConfig?.current?.enemyConfig?.walkerSocialRange ?? 400;
        const enemies = this.world.getComponents(EnemyController);
        const myPos = { x: this.gameObject.transform.position.x, y: -this.gameObject.transform.position.y };

        for (const e of enemies) {
            if (e === this || e.isDead) continue;
            const otherPos = e.gameObject.transform.position;
            const dist = Math.sqrt((myPos.x - otherPos.x) ** 2 + (myPos.y - otherPos.y) ** 2);
            if (dist < socialRange) {
                e.notifySignal(myPos, 'ALLY_DEATH');
            }
        }

        console.log(`Enemy ${this.gameObject.id} died.`);
        this.gameObject.destroy();
    }

    public destroy(): void {
        if (this.debugMesh) this.world.scene.remove(this.debugMesh);
        if (this.debugColliders) this.world.scene.remove(this.debugColliders);
        if (this.debugHearing) this.world.scene.remove(this.debugHearing);
        if (this.debugSocial) this.world.scene.remove(this.debugSocial);
        if (this.debugPredictionMesh) {
            this.world.scene.remove(this.debugPredictionMesh);
            this.debugPredictionMesh.geometry.dispose();
            (this.debugPredictionMesh.material as THREE.Material).dispose();
        }
        if (this.debugWaypointsGroup) {
            this.world.scene.remove(this.debugWaypointsGroup);
            // We assume children are simple meshes created here
            this.debugWaypointsGroup.children.forEach(c => {
                if ((c as any).geometry) (c as any).geometry.dispose();
                if ((c as any).material) (c as any).material.dispose();
            });
        }

        if (this.surpriseIcon) {
            this.surpriseIcon.parent?.remove(this.surpriseIcon);
            if (Array.isArray(this.surpriseIcon.material)) {
                this.surpriseIcon.material.forEach(m => m.dispose());
            } else {
                this.surpriseIcon.material.dispose();
                (this.surpriseIcon.material as any).map?.dispose();
            }
        }
        if (this.searchIcon) {
            this.searchIcon.parent?.remove(this.searchIcon);
            if (Array.isArray(this.searchIcon.material)) {
                this.searchIcon.material.forEach(m => m.dispose());
            } else {
                this.searchIcon.material.dispose();
                (this.searchIcon.material as any).map?.dispose();
            }
        }
        super.destroy();
    }
}
