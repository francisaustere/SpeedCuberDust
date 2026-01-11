
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { Platform } from '../../types';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { UpdateContext } from '../../engine/core/UpdateContext';
import * as THREE from 'three';

export interface VanishingConfig {
    duration: number;
    restoreTime: number;
    blinkSpeed: number;
    noiseScale: number;
    edgeWidth: number;
    noiseType: number; 
    projectionType: number; 
}

export class VanishingPlatform extends Component {
    static readonly DEFAULTS: VanishingConfig = {
        duration: 1.5,
        restoreTime: 3.0,
        blinkSpeed: 1.0,
        noiseScale: 10.0,
        edgeWidth: 0.1,
        noiseType: 3, 
        projectionType: 0
    };

    public platformData: Platform;
    public config: VanishingConfig;

    constructor(gameObject: GameObject, platformData: Platform, config: VanishingConfig) {
        super(gameObject);
        this.platformData = platformData;
        this.config = config;
    }
    
    public init(): void {
        if (this.platformData.isVanishing === undefined) this.platformData.isVanishing = false;
        if (this.platformData.isVanished === undefined) this.platformData.isVanished = false;
        if (this.platformData.vanishTimer === undefined) this.platformData.vanishTimer = 0;
        if (this.platformData.restoreTimer === undefined) this.platformData.restoreTimer = 0;
        
        // Force initial color to Orange (Active state) so it looks correct in Editor
        const meshRenderer = this.gameObject.getComponent(MeshRenderer);
        if (meshRenderer) {
            const mesh = meshRenderer.mesh;
            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                mesh.material.color.setHex(0xFFA500);
            }
        }
    }

    public update(dt: number, context: UpdateContext): void {
        if (context.isPaused) return;

        const p = this.platformData; 

        if (p.isVanishing) {
            p.vanishTimer = (p.vanishTimer || 0) - dt;
            if (p.vanishTimer <= 0) {
                p.isVanishing = false;
                p.isVanished = true;
                p.restoreTimer = this.config.restoreTime;
            }
        } else if (p.isVanished) {
            p.restoreTimer = (p.restoreTimer || 0) - dt;
            if (p.restoreTimer <= 0) {
                p.isVanished = false;
                p.isVanishing = false;
                p.vanishTimer = 0;
            }
        }

        const meshRenderer = this.gameObject.getComponent(MeshRenderer);
        if (meshRenderer) {
            const mesh = meshRenderer.mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;

            if (p.isVanished) {
                mesh.visible = false;
            } else {
                mesh.visible = true;
                if (p.isVanishing) {
                    const remaining = p.vanishTimer || 0;
                    const blinkSpeed = 10 + (2.0 / (remaining + 0.1)) * 5; 
                    const alpha = 0.5 + 0.5 * Math.sin(remaining * blinkSpeed);
                    
                    mat.opacity = alpha;
                    mat.transparent = true;
                    mat.color.setHex(0xFF0000); 
                } else {
                    mat.opacity = 1.0;
                    mat.transparent = false;
                    mat.color.setHex(0xFFA500); 
                }
            }
        }
    }

    public reset(): void {
        const p = this.platformData;
        p.isVanishing = false;
        p.isVanished = false;
        p.vanishTimer = 0;
        p.restoreTimer = 0;
        
        // Restore Visuals
        const meshRenderer = this.gameObject.getComponent(MeshRenderer);
        if (meshRenderer) {
            const mesh = meshRenderer.mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            mesh.visible = true;
            mat.opacity = 1.0;
            mat.transparent = false;
            mat.color.setHex(0xFFA500); 
        }
    }
}
