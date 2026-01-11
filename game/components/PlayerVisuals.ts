
import * as THREE from 'three';
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { MeshRenderer } from '../../engine/components/MeshRenderer';
import { PlayerController } from './PlayerController';
import { VISUAL_CONSTANTS } from '../../config/defaults';
import { SCENE_Config } from '../../config/constants';
import { Platform } from '../../types';
import { UpdateContext } from '../../engine/core/UpdateContext';

export interface PlayerDeformationConfig {
    stiffness: number;
    damping: number;
    maxScale: number;
    minScale: number;
    
    // States
    runStretchAmount: number;
    fallStretchAmount: number;
    spinFallStretchAmount: number;
    maxFallStretch?: number; // Caps the visual stretch to prevent violent snap-back
    shapeMorphSpeed?: number; // Lerp factor (0-1) for transitioning between shapes
    
    // Rotation Logic
    rotationSnapSpeed: number; 
    rotationSnapIntervalDeg: number; // Interval in degrees (e.g. 90, 180)
    rotationSnapCondition: number; // 0: Always, 1: CW Only, -1: CCW Only
    rotationGroundLerp?: number; // How fast we smooth to 0 on ground (0.0 - 1.0)

    // Impulses
    jumpSquashX: number;
    jumpSquashY: number;
    wallJumpSquashX: number;
    wallJumpSquashY: number;
    
    // Landing - Separated Axes
    landSquashX: number; // Horizontal expansion multiplier on impact
    landSquashY: number; // Vertical compression multiplier on impact
    
    doubleJumpVelY: number;
    doubleJumpVelXZ: number;
}

export class PlayerVisuals extends Component {
    static readonly DEFAULT_DEFORMATION: PlayerDeformationConfig = {
        stiffness: 0.15,
        damping: 0.7,
        maxScale: 2.0,
        minScale: 0.1,
        runStretchAmount: 0.2,
        fallStretchAmount: 1.05,
        spinFallStretchAmount: 0.1,
        maxFallStretch: 1.0,
        shapeMorphSpeed: 0.53,
        rotationSnapSpeed: 0.2,
        rotationSnapIntervalDeg: 90,
        rotationSnapCondition: 0,
        rotationGroundLerp: 0.2,
        jumpSquashX: 0.8,
        jumpSquashY: 2.0,
        wallJumpSquashX: 0.6,
        wallJumpSquashY: 1.3,
        landSquashX: 0.02,
        landSquashY: 0.04,
        doubleJumpVelY: 0.3,
        doubleJumpVelXZ: -0.15
    };

    private meshRenderer: MeshRenderer | null = null;
    private playerController: PlayerController | null = null;
    
    // Config values
    private thickness = VISUAL_CONSTANTS.THICKNESS;
    private baseDepth = SCENE_Config.PLAYER_DEPTH;

    // Animation State
    private isExiting: boolean = false;
    private visualTime: number = 0;

    constructor(gameObject: GameObject) {
        super(gameObject);
    }

    public init(): void {
        this.meshRenderer = this.gameObject.getComponent(MeshRenderer) || null;
        this.playerController = this.gameObject.getComponent(PlayerController) || null;
        
        if (this.meshRenderer) {
            this.meshRenderer.mesh.castShadow = true;
            this.meshRenderer.mesh.receiveShadow = true;
            this.meshRenderer.mesh.renderOrder = 12; 
            
            if (!(this.meshRenderer.mesh.material instanceof THREE.MeshStandardMaterial)) {
                this.meshRenderer.setMaterial(new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.3, metalness: 0.1 }));
            }
        }

        if (!this.playerController) {
            console.error("PlayerVisuals requires a sibling PlayerController component!");
        }
    }

    public setExiting(exiting: boolean) {
        this.isExiting = exiting;
    }

    public update(dt: number, context: UpdateContext): void {
        if (!this.playerController) return;
        const player = this.playerController.state;

        this.visualTime += dt;

        const px = player.x + player.w / 2;
        const py = -(player.y + player.h / 2);
        const pZ = player.z; 

        this.transform.setPosition(px, py, pZ);
        this.transform.rotation.set(0, 0, 0);

        const tilt = -(player.vx * 0.02);
        const visualRotZ = tilt + player.visualRotation;

        let animRotZ = 0;
        let animPosY = 0;
        
        if (this.isExiting) {
            const runFreq = 30.0;
            const waddleAmp = 0.5; 
            const bobAmp = 4.0;
            
            animRotZ = Math.sin(this.visualTime * runFreq) * waddleAmp;
            animPosY = Math.abs(Math.sin(this.visualTime * runFreq)) * bobAmp;
        }

        if (this.meshRenderer) {
            const mesh = this.meshRenderer.mesh;
            mesh.rotation.set(0, 0, visualRotZ + animRotZ);

            const baseW = Math.max(0.1, player.w - this.thickness * 2);
            const baseH = Math.max(0.1, player.h - this.thickness * 2);
            const baseD = Math.max(0.1, this.baseDepth - this.thickness * 2);

            const currentW = baseW * player.scale.x;
            const currentH = baseH * player.scale.y;
            const currentD = baseD * player.scale.z;

            mesh.scale.set(currentW, currentH, currentD);

            const diffH = currentH - baseH; 
            const diffW = currentW - baseW; 
            
            const absCos = Math.abs(Math.cos(visualRotZ));
            const absSin = Math.abs(Math.sin(visualRotZ));
            
            const verticalGrowth = (diffH * absCos) + (diffW * absSin);
            const anchor = player.scaleAnchor !== undefined ? player.scaleAnchor : -1;
            
            mesh.position.y = ((verticalGrowth / 2) * -anchor) + animPosY;
            
            const zDir = Math.cos(visualRotZ) >= 0 ? 1 : -1;
            mesh.position.z = 0.1 * zDir;

            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                let targetColor = 0x000000;
                
                if (player.isCrouching && player.platformId !== null && context.visualConfig) {
                    const platforms = context.platforms as Platform[];
                    const platform = platforms.find(p => p.id === player.platformId);
                    
                    if (platform) {
                        const type = platform.type || 'platform';
                        let colorHex = context.visualConfig.platform.fillColor; 
                        
                        if (type in context.visualConfig) {
                            colorHex = context.visualConfig[type as keyof typeof context.visualConfig].fillColor;
                        }
                        
                        targetColor = parseInt(colorHex.replace('#', '0x'), 16);
                    }
                }

                mesh.material.color.setHex(targetColor);
                
                if (player.invulnerabilityTimer > 0) {
                    const blink = Math.floor(player.invulnerabilityTimer / 4) % 2 === 0;
                    mesh.visible = blink;
                } else {
                    mesh.visible = true;
                }
                
                if (player.jumpCount === 0 && !player.isGrounded && !player.onWall) {
                    mesh.material.opacity = 0.8;
                } else {
                    mesh.material.opacity = 1.0;
                }
                mesh.material.transparent = true;
            }
        }
    }
}
