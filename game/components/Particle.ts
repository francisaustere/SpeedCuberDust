
import * as THREE from 'three';
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { MeshRenderer } from '../../engine/components/MeshRenderer';

export interface ParticleConfig {
    velocity: THREE.Vector3;
    life: number;     // seconds
    decay: number;    // units per second
    scaleDecay?: number; // scale reduction per second
    gravity?: number; // units per second squared
    onComplete?: (go: GameObject) => void; // Callback for pooling
}

export class Particle extends Component {
    private velocity: THREE.Vector3;
    private life: number;
    private maxLife: number;
    private decay: number;
    private scaleDecay: number;
    private gravity: number;
    private onComplete: ((go: GameObject) => void) | null = null;
    
    private meshRenderer: MeshRenderer | null = null;
    private initialScale: THREE.Vector3;

    constructor(gameObject: GameObject, config: ParticleConfig) {
        super(gameObject);
        this.velocity = config.velocity.clone();
        this.life = config.life;
        this.maxLife = config.life;
        this.decay = config.decay;
        this.scaleDecay = config.scaleDecay || 0;
        this.gravity = config.gravity || 0;
        this.initialScale = gameObject.transform.scale.clone();
        this.onComplete = config.onComplete || null;
    }

    // Reset method for pooling
    public respawn(config: ParticleConfig) {
        this.velocity.copy(config.velocity);
        this.life = config.life;
        this.maxLife = config.life;
        this.decay = config.decay;
        this.scaleDecay = config.scaleDecay || 0;
        this.gravity = config.gravity || 0;
        this.onComplete = config.onComplete || null;
        this.initialScale.copy(this.gameObject.transform.scale);
        this.enabled = true;
        this.gameObject.object3D.visible = true;
    }

    public init(): void {
        this.meshRenderer = this.gameObject.getComponent(MeshRenderer) || null;
    }

    public update(dt: number): void {
        if (this.life <= 0) return;

        this.life -= dt * this.decay;

        if (this.life <= 0) {
            if (this.onComplete) {
                this.onComplete(this.gameObject);
            } else {
                this.gameObject.destroy(); 
            }
            return;
        }

        // Physics
        this.velocity.y -= this.gravity * dt;
        
        const pos = this.gameObject.transform.position;
        pos.x += this.velocity.x * dt * 60; 
        pos.y += this.velocity.y * dt * 60;
        pos.z += this.velocity.z * dt * 60;

        // Visuals
        const alpha = Math.max(0, this.life / this.maxLife);
        
        if (this.meshRenderer) {
            this.meshRenderer.setOpacity(alpha);
        }

        if (this.scaleDecay > 0) {
            // Linear scale down
            const scaleFactor = Math.max(0, 1 - ((this.maxLife - this.life) * this.scaleDecay));
            this.gameObject.transform.scale.copy(this.initialScale).multiplyScalar(scaleFactor);
        }
    }
}