import * as THREE from 'three';
import { GameWorld } from '../engine/core/GameWorld';
import { GameObject } from '../engine/core/GameObject';
import { MeshRenderer } from '../engine/components/MeshRenderer';
import { Particle, ParticleConfig } from './components/Particle';

export class ParticleFactory {
    private world: GameWorld;
    
    // Shared Geometries/Materials
    private wallGeo: THREE.PlaneGeometry;
    private wallMat: THREE.MeshBasicMaterial;

    // Object Pool
    private pool: GameObject[] = [];
    private readonly MAX_POOL_SIZE = 200;

    constructor(world: GameWorld) {
        this.world = world;
        this.wallGeo = new THREE.PlaneGeometry(1, 1);
        this.wallMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    }

    private getFromPool(): GameObject | null {
        if (this.pool.length > 0) {
            const go = this.pool.pop()!;
            go.object3D.visible = true; 
            return go;
        }
        return null;
    }

    private returnToPool(go: GameObject) {
        if (this.pool.length < this.MAX_POOL_SIZE) {
            go.object3D.visible = false;
            const p = go.getComponent(Particle);
            if (p) p.enabled = false;
            this.pool.push(go);
        } else {
            go.destroy();
        }
    }

    private spawn(
        name: string,
        position: THREE.Vector3,
        scale: THREE.Vector3,
        geometry: THREE.BufferGeometry,
        material: THREE.Material,
        config: Omit<ParticleConfig, 'onComplete'>
    ) {
        let go = this.getFromPool();
        if (!go) {
            go = new GameObject(new THREE.Group(), name, 'Particle');
            go.addComponent(MeshRenderer, geometry, material, false, false);
            go.addComponent(Particle, { ...config, onComplete: (g) => this.returnToPool(g) });
            this.world.addGameObject(go);
        } else {
            go.name = name;
            go.transform.position.copy(position);
            go.transform.scale.copy(scale);
            go.transform.rotation.set(0, 0, 0);
            const mr = go.getComponent(MeshRenderer);
            if (mr) mr.setMaterial(material);
            const p = go.getComponent(Particle);
            if (p) {
                p.respawn({ ...config, onComplete: (g) => this.returnToPool(g) });
            }
        }
        go.transform.position.copy(position);
        go.transform.scale.copy(scale);
    }

    public spawnWallSlideParticle(position: THREE.Vector3, velocity: THREE.Vector3, scale: THREE.Vector3) {
        const mat = this.wallMat.clone();
        this.spawn('WallParticle', position, scale, this.wallGeo, mat, {
            velocity: velocity,
            life: 1.0,
            decay: 4.0,
            scaleDecay: 0.5,
            gravity: 0.5 
        });
    }

    public spawnImpact(x: number, y: number, colorHex: number = 0xFFFFFF) {
        const count = 6;
        const mat = this.wallMat.clone();
        mat.color.setHex(colorHex);
        mat.opacity = 0.8;
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 8 + 2;
            const pos = new THREE.Vector3(x, -y, 10);
            const scale = new THREE.Vector3(2, 2, 1);
            this.spawn('ImpactParticle', pos, scale, this.wallGeo, mat, {
                velocity: new THREE.Vector3(Math.cos(angle) * speed * 0.016, Math.sin(angle) * speed * 0.016, 0),
                life: 0.3,
                decay: 5.0,
                scaleDecay: 2.0,
                gravity: 0
            });
        }
    }

    public spawnSmokeTrail(x: number, y: number) {
        const mat = this.wallMat.clone();
        mat.color.setHex(0xDDDDDD); 
        mat.opacity = 0.6;
        const pos = new THREE.Vector3(x, -y, 15);
        const scale = new THREE.Vector3(15, 15, 1);
        this.spawn('SmokeParticle', pos, scale, this.wallGeo, mat, {
            velocity: new THREE.Vector3((Math.random() - 0.5) * 1.5, 3.0, 0),
            life: 1.2,
            decay: 1.0,
            scaleDecay: -0.8, 
            gravity: 0 
        });
    }

    public spawnDeathExplosion(x: number, y: number, colorHex: number = 0xFFFFFF) {
        const count = 30;
        const mat = this.wallMat.clone();
        mat.color.setHex(colorHex);
        for(let i=0; i<count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 20 + 5;
            const pos = new THREE.Vector3(x, -y, 5);
            const scale = new THREE.Vector3(3, 3, 1);
            this.spawn('DeathParticle', pos, scale, this.wallGeo, mat, {
                velocity: new THREE.Vector3(Math.cos(angle) * speed * 0.016, Math.sin(angle) * speed * 0.016, (Math.random() - 0.5) * 10 * 0.016),
                life: 1.0,
                decay: 3.5,
                scaleDecay: 0.8,
                gravity: 0
            });
        }
    }

    public spawnEmote(x: number, y: number, text: string) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.font = 'bold 48px monospace';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 4;
            ctx.strokeText(text, 32, 32);
            ctx.fillText(text, 32, 32);
        }
        const tex = new THREE.CanvasTexture(canvas);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const geo = new THREE.PlaneGeometry(1, 1);
        const go = new GameObject(new THREE.Group(), 'Emote', 'Particle');
        go.transform.position.set(x, -y, 20); 
        go.transform.scale.set(40, 40, 1);
        go.addComponent(MeshRenderer, geo, mat);
        go.addComponent(Particle, {
            velocity: new THREE.Vector3(0, 1.0, 0), 
            life: 0.8,
            decay: 1.0,
            scaleDecay: 0,
            gravity: 0
        });
        this.world.addGameObject(go);
    }
}