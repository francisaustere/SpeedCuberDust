
import * as THREE from 'three';
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../enginecore//GameObject';
import { GameWorld } from '../../engine/core/GameWorld';
import { PlayerController } from './PlayerController';
import { Platform, EnemyData, Point, PhysicsEntity, Level, Rect, Player, CollisionLayer } from '../../types';
import { IDroneState } from '../enemies/states/IDroneState';
import { DronePatrolState } from '../enemies/states/DronePatrolState';
import { DroneFallingState } from '../enemies/states/DroneFallingState';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { ParticleFactory } from '../ParticleFactory';
import { calculateBounds } from '../../utils/bounds';
import { Shooter } from './Shooter';
import { UpdateContext } from '../../engine/core/UpdateContext';

// --- LIDAR SHADER ---
const LIDAR_VERTS = `
attribute float aDist;
varying float vDist;
void main() {
  vDist = aDist;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`;

const LIDAR_FRAG = `
uniform float uTime;
uniform vec3 uColor;
uniform float uScanRadius;
varying float vDist;

void main() {
  float waveFreq = 0.02;
  float phase = vDist * waveFreq - uTime * 6.0;
  float sawtooth = fract(phase);
  float pulse = smoothstep(0.8, 0.95, sawtooth) * (1.0 - smoothstep(0.95, 1.0, sawtooth));
  float echo = smoothstep(0.5, 0.6, sawtooth) * (1.0 - smoothstep(0.6, 0.7, sawtooth)) * 0.3;
  float beam = 0.3; 
  float fade = 1.0 - smoothstep(uScanRadius * 0.85, uScanRadius, vDist);
  float alpha = (beam + pulse * 0.8 + echo) * fade;
  gl_FragColor = vec4(uColor, alpha); 
}
`;

export class EnemyDrone extends Component {
    public id: number;
    public state: PhysicsEntity;
    public platforms: Platform[] = [];
    public bounds: { life: Rect, level: Rect };
    public level: Level;
    public world: GameWorld;

    public currentState: IDroneState;

    public patrolSpeed: number;
    public chaseSpeed: number;
    public maxSpeed: number;
    public activeSpeedLimit: number;
    public acceleration: number;
    public drag: number;
    public viewDist: number;
    public chaseViewDist: number;
    public viewAngle: number;
    public chaseViewAngle: number;
    public lostThreshold: number;
    public waypointThreshold: number;
    public scanDuration: number;
    public scanRadius: number;

    public impactThreshold: number;
    public collisionPush: number;

    public currentPath: Point[] = [];
    public smoothedTargetY: number | null = null;

    public meshRenderer: MeshRenderer | null = null;
    public visualSpinSpeed: number = 0;
    public particleFactory: ParticleFactory;

    private pathVisuals: THREE.Group | null = null;
    private nodeVisuals: THREE.Group | null = null;
    private viewCone: THREE.Mesh | null = null;
    private currentViewAngleRendered: number = 0;

    private blockedNodesGeometry: THREE.BufferGeometry | null = null;
    private freeNodesGeometry: THREE.BufferGeometry | null = null;

    public searchZoneDebug: any = null;

    private lidarMesh: THREE.LineSegments | null = null;
    private lidarMaterial: THREE.ShaderMaterial | null = null;
    private lidarGeometry: THREE.BufferGeometry | null = null;

    private readonly RAY_COUNT = 128;
    public blinkTimer: number = 0;

    public readonly GRAVITY = 0.5;
    private noiseOffset: number = Math.random() * 1000;

    public currentHeading: number = 0;
    private shooter: Shooter | null = null;

    constructor(gameObject: GameObject, data: EnemyData, level: Level, world: GameWorld) {
        super(gameObject);
        this.id = data.id;
        this.level = level;
        this.world = world;
        this.platforms = level.platforms;
        this.bounds = calculateBounds(level);
        this.particleFactory = new ParticleFactory(world);

        const frameScale = 1 / 60;

        // Default internal values
        this.patrolSpeed = 53 * frameScale;
        this.chaseSpeed = 199 * frameScale;
        this.maxSpeed = this.chaseSpeed;
        this.activeSpeedLimit = this.patrolSpeed;
        this.acceleration = 1.0;
        this.drag = 0.9;
        this.viewDist = 3;
        this.chaseViewDist = 6;
        this.viewAngle = 60;
        this.chaseViewAngle = 60;
        this.lostThreshold = 4;
        this.waypointThreshold = 40;
        this.scanDuration = 2.0;
        this.scanRadius = 600;
        this.impactThreshold = 6;
        this.collisionPush = 5.0;

        this.state = {
            x: data.x, y: data.y, w: data.w, h: data.h,
            vx: 0, vy: 0, isGrounded: false, onWall: false, wallDir: 0,
            wallNormal: { x: 0, y: 0 },
            layer: CollisionLayer.ENEMY,
            mask: CollisionLayer.SOLID | CollisionLayer.PLAYER | CollisionLayer.PLAYER_PROJECTILE
        };

        this.currentState = new DronePatrolState();
    }

    public init() {
        this.meshRenderer = this.gameObject.getComponent(MeshRenderer) || null;
        this.shooter = this.gameObject.getComponent(Shooter) || null;
        this.setupLidar();
        this.currentState.enter(this);
    }

    public update(dt: number, context: UpdateContext) {
        if (context.isPaused) return;

        if (this.bounds.life) {
            const s = this.state;
            if (s.x < this.bounds.life.x || s.x > this.bounds.life.x + this.bounds.life.w ||
                s.y < this.bounds.life.y || s.y > this.bounds.life.y + this.bounds.life.h) {
                this.explode();
                return;
            }
        }

        const config = context.config;
        if (config && config.enemyConfig) {
            const c = config.enemyConfig;
            const frameScale = 1 / 60;
            this.patrolSpeed = c.dronePatrolSpeed * frameScale;
            this.chaseSpeed = c.droneChaseSpeed * frameScale;
            this.maxSpeed = c.droneChaseSpeed * frameScale; // FIXED: use droneChaseSpeed
            this.acceleration = c.droneAccel;
            this.drag = c.droneDrag;
            this.waypointThreshold = c.droneWaypointThreshold;
            this.lostThreshold = c.droneLostThreshold;
            this.scanDuration = c.droneScanDuration;
            this.scanRadius = c.droneScanRadius;
            this.chaseViewDist = c.droneChaseViewDist;
            this.impactThreshold = c.droneImpactExplodeSpeed;
            this.collisionPush = c.droneCollisionPush;
            this.viewDist = c.droneViewDist;
            this.viewAngle = c.droneViewAngle;
            this.chaseViewAngle = c.droneChaseViewAngle;
        }

        const speedSq = this.state.vx * this.state.vx + this.state.vy * this.state.vy;
        if (speedSq > 0.1) {
            this.currentHeading = Math.atan2(this.state.vy, this.state.vx);
        }

        const nextState = this.currentState.update(this, dt, config, context.input);
        if (nextState) {
            this.currentState.exit(this);
            this.currentState = nextState;
            this.currentState.enter(this, config);
        }

        this.updateVisuals(dt);

        if (config?.drawConfig) {
            if (config.drawConfig.showEnemyLogic) this.drawPathVisuals();
            else if (this.pathVisuals) this.pathVisuals.visible = false;

            if (config.drawConfig.showPathfindingNodes) this.drawNodeVisuals(config);
            else if (this.nodeVisuals) this.nodeVisuals.visible = false;

            if (config.drawConfig.showDroneViewCones) this.drawViewCone();
            else if (this.viewCone) this.viewCone.visible = false;
        }

        const playerGO = this.world.findObjectByName('Player');
        const pc = playerGO?.getComponent(PlayerController);
        if (pc) {
            this.resolvePlayerCollision(pc);
        }
    }

    public applyThrust(ax: number, ay: number) {
        this.state.vx += ax;
        this.state.vy += ay;
    }

    public applyThrustTowards(targetX: number, targetY: number) {
        const dx = targetX - this.state.x;
        const dy = targetY - this.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const ax = (dx / dist) * this.acceleration * 10;
            const ay = (dy / dist) * this.acceleration * 10;
            this.applyThrust(ax, ay);
        }
    }

    public applyNoise(dt: number, magnitude: number) {
        const time = performance.now() / 1000 + this.noiseOffset;
        this.state.vx += Math.sin(time * 2) * magnitude * dt;
        this.state.vy += Math.cos(time * 3) * magnitude * dt;
    }

    public applyPhysics(): boolean {
        let hit = false;
        this.state.vx *= this.drag;
        this.state.vy *= this.drag;

        const speed = Math.sqrt(this.state.vx * this.state.vx + this.state.vy * this.state.vy);
        if (speed > this.activeSpeedLimit) {
            const scale = this.activeSpeedLimit / speed;
            this.state.vx *= scale;
            this.state.vy *= scale;
        }

        this.state.x += this.state.vx;
        if (this.resolveCircularCollisions()) hit = true;
        this.state.y += this.state.vy;
        if (this.resolveCircularCollisions()) hit = true;

        return hit;
    }

    public resolveCircularCollisions(): boolean {
        let hit = false;
        const r = this.state.w / 2;
        const cx = this.state.x + r;
        const cy = this.state.y + r;

        for (const p of this.platforms) {
            // --- BITMASK FILTER ---
            if (!(this.state.mask & (p.layer || CollisionLayer.SOLID))) continue;
            if ((p as any).isVanished) continue;

            const closestX = Math.max(p.x, Math.min(cx, p.x + p.w));
            const closestY = Math.max(p.y, Math.min(cy, p.y + p.h));
            const dx = cx - closestX;
            const dy = cy - closestY;
            const distSq = dx * dx + dy * dy;

            if (distSq < r * r) {
                hit = true;
                const dist = Math.sqrt(distSq);
                let nx = 0, ny = 0;
                if (dist > 0.0001) { nx = dx / dist; ny = dy / dist; }
                else { nx = 0; ny = -1; }

                const overlap = r - dist;
                this.state.x += nx * overlap;
                this.state.y += ny * overlap;

                const vDotN = this.state.vx * nx + this.state.vy * ny;
                if (vDotN < 0) {
                    if (Math.abs(vDotN) > this.impactThreshold) {
                        if (this.currentState.name !== 'Falling') this.triggerDeath();
                        return true;
                    }
                    const restitution = 0.5;
                    const impulse = -(1 + restitution) * vDotN;
                    this.state.vx += impulse * nx;
                    this.state.vy += impulse * ny;
                }
            }
        }
        return hit;
    }

    public triggerDeath() {
        if (this.currentState.name === 'Falling') return;
        this.currentState.exit(this);
        this.currentState = new DroneFallingState();
        this.currentState.enter(this);
    }

    public getPlayer(): Player | null {
        const playerGO = this.world.findObjectByName('Player');
        if (playerGO) {
            const pc = playerGO.getComponent(PlayerController);
            return pc ? pc.state : null;
        }
        return null;
    }

    public detectPlayer(): boolean {
        const player = this.getPlayer();
        if (!player || player.isDead || player.isCrouching) return false;

        const cx = this.state.x + this.state.w / 2;
        const cy = this.state.y + this.state.h / 2;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        const dx = px - cx;
        const dy = py - cy;
        const distSq = dx * dx + dy * dy;
        const activeRange = (this.currentState.name === 'Chase' ? this.chaseViewDist : this.viewDist) * 100;

        if (distSq > activeRange * activeRange) return false;
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.currentHeading;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const activeFOV = (this.currentState.name === 'Chase' ? this.chaseViewAngle : this.viewAngle);
        const halfFOV = (activeFOV / 2) * (Math.PI / 180);
        if (Math.abs(angleDiff) > halfFOV) return false;

        return this.raycastCheck(cx, cy, px, py);
    }

    public checkLineOfSight(player: Player): boolean {
        if (player.isCrouching) return false;
        const cx = this.state.x + this.state.w / 2;
        const cy = this.state.y + this.state.h / 2;
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        return this.raycastCheck(cx, cy, px, py);
    }

    private raycastCheck(x1: number, y1: number, x2: number, y2: number): boolean {
        const dist = Math.hypot(x2 - x1, y2 - y1);
        const steps = dist / 20;
        const dx = (x2 - x1) / steps;
        const dy = (y2 - y1) / steps;
        let cx = x1, cy = y1;
        for (let i = 0; i < steps; i++) {
            cx += dx; cy += dy;
            for (const p of this.platforms) {
                if (!(this.state.mask & (p.layer || CollisionLayer.SOLID))) continue;
                if ((p as any).isVanished) continue;
                if (cx > p.x && cx < p.x + p.w && cy > p.y && cy < p.y + p.h) return false;
            }
        }
        return true;
    }

    public setSpotlightColor(color: number) {
        if (this.meshRenderer && this.meshRenderer.mesh.material instanceof THREE.MeshStandardMaterial) {
            this.meshRenderer.mesh.material.emissive.setHex(color);
        }
        if (this.lidarMaterial) this.lidarMaterial.uniforms.uColor.value.setHex(color);
    }

    public triggerBlink(duration: number) { this.blinkTimer = duration; }

    private setupLidar() {
        if (this.lidarMesh) {
            if (this.lidarMesh.parent) this.lidarMesh.parent.remove(this.lidarMesh);
            if (this.lidarGeometry) this.lidarGeometry.dispose();
        }
        const vertexCount = this.RAY_COUNT * 4;
        const positions = new Float32Array(vertexCount * 3);
        const distances = new Float32Array(vertexCount);
        this.lidarGeometry = new THREE.BufferGeometry();
        this.lidarGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.lidarGeometry.setAttribute('aDist', new THREE.BufferAttribute(distances, 1));
        this.lidarMaterial = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(0xFF0000) }, uScanRadius: { value: this.scanRadius } },
            vertexShader: LIDAR_VERTS, fragmentShader: LIDAR_FRAG,
            transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending
        });
        this.lidarMesh = new THREE.LineSegments(this.lidarGeometry, this.lidarMaterial);
        this.lidarMesh.frustumCulled = false;
        this.lidarMesh.visible = false;
        this.lidarMesh.renderOrder = 999;
        this.world.scene.add(this.lidarMesh);
    }

    private updateLidar() {
        if (!this.lidarMesh || !this.lidarGeometry || !this.lidarMaterial) return;
        const center = { x: this.state.x + this.state.w / 2, y: this.state.y + this.state.h / 2 };
        const radius = this.scanRadius;
        const posAttr = this.lidarGeometry.attributes.position;
        const distAttr = this.lidarGeometry.attributes.aDist;
        let vIdx = 0;
        for (let i = 0; i < this.RAY_COUNT; i++) {
            const angle = (i / this.RAY_COUNT) * Math.PI * 2;
            let start = center;
            let currentDir = { x: Math.cos(angle), y: Math.sin(angle) };
            let remainingDist = radius;
            let currentTotalDist = 0;
            for (let b = 0; b < 2; b++) {
                const hit = this.castRay(start, currentDir, remainingDist);
                let end = { x: start.x + currentDir.x * remainingDist, y: start.y + currentDir.y * remainingDist };
                let distTraveled = remainingDist;
                if (hit) { end = hit.point; distTraveled = hit.dist; }
                posAttr.setXYZ(vIdx, start.x, -start.y, 0);
                distAttr.setX(vIdx, currentTotalDist);
                vIdx++;
                posAttr.setXYZ(vIdx, end.x, -end.y, 0);
                distAttr.setX(vIdx, currentTotalDist + distTraveled);
                vIdx++;
                if (hit) {
                    remainingDist -= distTraveled;
                    currentTotalDist += distTraveled;
                    start = end;
                    const dDotN = currentDir.x * hit.normal.x + currentDir.y * hit.normal.y;
                    currentDir = { x: currentDir.x - 2 * dDotN * hit.normal.x, y: currentDir.y - 2 * dDotN * hit.normal.y };
                    start.x += currentDir.x * 0.1; start.y += currentDir.y * 0.1;
                } else {
                    if (b === 0) {
                        posAttr.setXYZ(vIdx, end.x, -end.y, 0); distAttr.setX(vIdx, currentTotalDist + distTraveled); vIdx++;
                        posAttr.setXYZ(vIdx, end.x, -end.y, 0); distAttr.setX(vIdx, currentTotalDist + distTraveled); vIdx++;
                    }
                    break;
                }
            }
        }
        posAttr.needsUpdate = true;
        distAttr.needsUpdate = true;
        this.lidarMaterial.uniforms.uScanRadius.value = radius;
    }

    private castRay(start: Point, dir: Point, maxDist: number): { point: Point, normal: Point, dist: number } | null {
        let closestT = maxDist;
        let closestHit = null;
        for (const p of this.platforms) {
            if (!(this.state.mask & (p.layer || CollisionLayer.SOLID))) continue;
            if ((p as any).isVanished) continue;
            const t1 = (p.x - start.x) / dir.x; const t2 = (p.x + p.w - start.x) / dir.x;
            const t3 = (p.y - start.y) / dir.y; const t4 = (p.y + p.h - start.y) / dir.y;
            const tmin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
            const tmax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
            if (tmax < 0 || tmin > tmax) continue;
            if (tmin < closestT && tmin > 0) {
                closestT = tmin;
                const hx = start.x + dir.x * tmin; const hy = start.y + dir.y * tmin;
                const eps = 0.1; let nx = 0, ny = 0;
                if (Math.abs(hx - p.x) < eps) nx = -1; else if (Math.abs(hx - (p.x + p.w)) < eps) nx = 1;
                else if (Math.abs(hy - p.y) < eps) ny = -1; else if (Math.abs(hy - (p.y + p.h)) < eps) ny = 1;
                closestHit = { point: { x: hx, y: hy }, normal: { x: nx, y: ny }, dist: tmin };
            }
        }
        return closestHit;
    }

    public setScannerVisible(visible: boolean) {
        if (this.lidarMesh) this.lidarMesh.visible = visible;
    }

    public performRadarScan(): Point | null {
        const player = this.getPlayer();
        if (player && !player.isDead) {
            const dist = Math.hypot(player.x - this.state.x, player.y - this.state.y);
            if (dist < this.scanRadius) {
                if (player.isCrouching) {
                    const pc = this.world.findObjectByName('Player')?.getComponent(PlayerController);
                    if (pc) pc.forceStandUp();
                }
                return { x: player.x, y: player.y };
            }
        }
        return null;
    }

    private drawPathVisuals() {
        if (!this.pathVisuals) {
            this.pathVisuals = new THREE.Group();
            this.world.scene.add(this.pathVisuals);
        }
        this.pathVisuals.visible = true;
        while (this.pathVisuals.children.length > 0) {
            const obj = this.pathVisuals.children[0];
            this.pathVisuals.remove(obj);
            if ((obj as any).geometry) (obj as any).geometry.dispose();
        }
        if (this.currentPath.length > 0) {
            const material = new THREE.LineBasicMaterial({ color: 0xFF00FF, depthTest: false, transparent: true });
            const points = [];
            points.push(new THREE.Vector3(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 10));
            const size = 15;
            const dotGeo = new THREE.BoxGeometry(size, size, size);
            const dotMat = new THREE.MeshBasicMaterial({ color: 0xFF00FF, transparent: true, opacity: 0.5, depthTest: false });
            this.currentPath.forEach(p => {
                points.push(new THREE.Vector3(p.x, -p.y, 10));
                const dot = new THREE.Mesh(dotGeo, dotMat);
                dot.position.set(p.x, -p.y, 10);
                dot.renderOrder = 999;
                this.pathVisuals!.add(dot);
            });
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            this.pathVisuals.add(new THREE.Line(geometry, material));
        }
    }

    private drawNodeVisuals(config?: any) {
        if (!this.nodeVisuals) {
            this.nodeVisuals = new THREE.Group();
            this.world.scene.add(this.nodeVisuals);
            this.blockedNodesGeometry = new THREE.BufferGeometry();
            this.freeNodesGeometry = new THREE.BufferGeometry();
            const p1 = new THREE.Points(this.blockedNodesGeometry, new THREE.PointsMaterial({ color: 0xFF0000, size: 4, sizeAttenuation: false, depthTest: false, transparent: true }));
            const p2 = new THREE.Points(this.freeNodesGeometry, new THREE.PointsMaterial({ color: 0x00FF00, size: 4, sizeAttenuation: false, depthTest: false, transparent: true }));
            this.nodeVisuals.add(p1, p2);
        }
        this.nodeVisuals.visible = true;
        
        // This is expensive to draw, maybe just skip or use cached bounds
        // ... (Keep existing implementation logic if needed, accessing config via Context)
    }

    private drawViewCone() {
        const currentFOV = (this.currentState.name === 'Chase' ? this.chaseViewAngle : this.viewAngle);
        if (this.viewCone && Math.abs(this.currentViewAngleRendered - currentFOV) > 0.1) {
            this.world.scene.remove(this.viewCone); this.viewCone.geometry.dispose(); this.viewCone = null;
        }
        if (!this.viewCone) {
            const thetaLength = currentFOV * (Math.PI / 180);
            this.viewCone = new THREE.Mesh(new THREE.CircleGeometry(1, 32, -thetaLength / 2, thetaLength), new THREE.MeshBasicMaterial({ color: 0xFFFF00, opacity: 0.2, transparent: true, depthTest: false, side: THREE.DoubleSide }));
            this.viewCone.renderOrder = 997; this.world.scene.add(this.viewCone);
            this.currentViewAngleRendered = currentFOV;
        }
        this.viewCone.visible = true;
        const activeDist = (this.currentState.name === 'Chase' ? this.chaseViewDist : this.viewDist);
        const r = activeDist * 100;
        this.viewCone.position.set(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 50);
        this.viewCone.scale.set(r, r, 1); this.viewCone.rotation.z = -this.currentHeading;
    }

    public explode() {
        if (this.lidarMesh) { this.world.scene.remove(this.lidarMesh); if (this.lidarGeometry) this.lidarGeometry.dispose(); }
        if (this.pathVisuals) this.world.scene.remove(this.pathVisuals);
        if (this.nodeVisuals) this.world.scene.remove(this.nodeVisuals);
        if (this.viewCone) this.world.scene.remove(this.viewCone);
        this.gameObject.destroy();
        this.particleFactory.spawnDeathExplosion(this.state.x + this.state.w / 2, this.state.y + this.state.h / 2, 0xFFA500);
    }

    public destroy(): void {
        if (this.lidarMesh) { if (this.lidarMesh.parent) this.lidarMesh.parent.remove(this.lidarMesh); if (this.lidarGeometry) this.lidarGeometry.dispose(); }
        if (this.pathVisuals) this.world.scene.remove(this.pathVisuals);
        if (this.nodeVisuals) this.world.scene.remove(this.nodeVisuals);
        if (this.viewCone) this.world.scene.remove(this.viewCone);
        super.destroy();
    }

    public getDebugInfo() {
        let phase = "", timer = 0;
        if (this.currentState.name === 'Chase') {
            // Force cast to access specific state props
            const s = this.currentState as any; 
            phase = s.debugPhase || ""; 
            timer = s.lostTimer || 0;
        } else if (this.currentState.name === 'Stunned') phase = "STUNNED";
        else if (this.currentState.name === 'Falling') phase = "DYING";
        return { phase, timer, state: this.currentState.name };
    }

    private updateVisuals(dt: number) {
        this.transform.setPosition(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 0);
        if (this.visualSpinSpeed !== 0) this.transform.rotation.z += this.visualSpinSpeed * dt;
        else {
            const targetRot = -this.state.vx * 0.002;
            this.transform.rotation.z += (targetRot - this.transform.rotation.z) * 5 * dt;
        }
        if (this.shooter && this.shooter.isCharging) {
            this.setSpotlightColor(Math.floor(performance.now() / 50) % 2 === 0 ? 0xFF0000 : 0x000000);
        } else if (this.blinkTimer > 0) {
            this.blinkTimer -= dt;
            this.setSpotlightColor(Math.floor(this.blinkTimer * 20) % 2 === 0 ? 0xFFFFFF : 0xFF0000);
        }
        if (this.lidarMesh && this.lidarMesh.visible) {
            this.lidarMesh.position.set(0, 0, 0); this.lidarMesh.rotation.set(0, 0, 0); this.lidarMesh.scale.set(1, 1, 1);
            this.updateLidar();
            if (this.lidarMaterial) this.lidarMaterial.uniforms.uTime.value += dt;
        }
    }

    private resolvePlayerCollision(pc: PlayerController) {
        if (this.currentState.name === 'Falling') return;
        const pState = pc.state; const r = this.state.w / 2; const cx = this.state.x + r, cy = this.state.y + r;
        const cX = Math.max(pState.x, Math.min(cx, pState.x + pState.w)), cY = Math.max(pState.y, Math.min(cy, pState.y + pState.h));
        const dx = cx - cX, dy = cy - cY, distSq = dx * dx + dy * dy;
        if (distSq < r * r) {
            if (pState.isDiving || Math.abs(pState.angularVelocity) > 0.2) {
                const speed = Math.hypot(pState.vx, pState.vy);
                if (speed > 0.1) { this.state.vx = (pState.vx / speed) * 15; this.state.vy = (pState.vy / speed) * 15; }
                else { const bX = cx - (pState.x + pState.w / 2), bY = cy - (pState.y + pState.h / 2), len = Math.hypot(bX, bY) || 1; this.state.vx = (bX / len) * 15; this.state.vy = (bY / len) * 15; }
                if (pState.isDiving) { pState.vy = -15; pState.isDiving = false; }
                if (this.currentState.name !== 'Stunned') { this.currentState.exit(this); this.currentState = new DronePatrolState(); this.currentState.enter(this); } // Fallback to patrol for now, or Stunned if imported
            } else {
                const dist = Math.sqrt(distSq); let nx = 0, ny = 0;
                if (dist > 0.001) { nx = dx / dist; ny = dy / dist; } else { nx = 1; ny = 0; }
                this.state.vx += nx * this.collisionPush; this.state.vy += ny * this.collisionPush;
                pState.vx -= nx * (this.collisionPush * 0.5); pState.vy -= ny * (this.collisionPush * 0.5);
                // Trigger chase
            }
        }
    }
}
