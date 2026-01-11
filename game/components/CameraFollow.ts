
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { Camera, Rect } from '../../types';
import { PlayerController } from './PlayerController';
import { GameWorld } from '../../engine/core/GameWorld';
import { UpdateContext } from '../../engine/core/UpdateContext';

export class CameraFollow extends Component {
    public cameraInfo: Camera; // Changed to public so GameEngine can snapshot prevX/Y
    private target: PlayerController | null = null;
    private world: GameWorld;

    // Configuration Inputs (Synced via Context)
    public bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
    public screenSize: { w: number, h: number } = { w: 800, h: 600 };
    public z: number = 940;
    public fov: number = 70;
    
    public lerpFactor: number = 0.1; 
    public landingShakeIntensity: number = 5.0;
    
    public offsetX: number = 0;
    public offsetY: number = 0;

    // Internal State
    private currentLookAheadX: number = 0;
    private currentLookAheadY: number = 0;
    
    // Shake State
    private shakeTimer: number = 0;
    private shakeIntensity: number = 0;
    private shakeDuration: number = 0;

    // Calculated Viewport Height
    public viewportHeight: number = 600;

    constructor(gameObject: GameObject, cameraInfo: Camera, world: GameWorld) {
        super(gameObject);
        this.cameraInfo = cameraInfo;
        this.world = world;
        
        // Initialize history
        this.cameraInfo.prevX = this.cameraInfo.x;
        this.cameraInfo.prevY = this.cameraInfo.y;
    }

    public init(): void {
        const playerGO = this.world.findObjectByName('Player');
        if (playerGO) {
            this.target = playerGO.getComponent(PlayerController) || null;
        }
    }

    public triggerShake(intensity: number, duration: number) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    public reset() {
        this.currentLookAheadX = 0;
        this.currentLookAheadY = 0;
        this.shakeTimer = 0;
        this.init(); 
    }

    public update(dt: number, context: UpdateContext): void {
        if (!this.target) {
            this.init();
            if (!this.target) return;
        }

        // Snapshot for interpolation
        this.cameraInfo.prevX = this.cameraInfo.x;
        this.cameraInfo.prevY = this.cameraInfo.y;

        const player = this.target.state;
        const config = context.config?.cameraConfig;
        
        if (config) {
            this.updateConfigFromContext(context, config);
        }
        
        // --- 0. CHECK EVENTS ---
        if (player.landingShake) {
            this.triggerShake(this.landingShakeIntensity, 0.2); 
            player.landingShake = false; 
        }

        const aspectRatio = this.screenSize.w / this.screenSize.h;

        // 1. Calculate Horizontal Velocity for Dynamic Lerp
        const dynamicSpeedRatio = Math.min(1.0, Math.abs(player.vx) / 25.0);

        // Update Camera Z and Dimensions
        this.cameraInfo.z = this.z;
        this.viewportHeight = 2 * Math.abs(this.z) * Math.tan((this.fov * Math.PI / 180) / 2);
        const viewportWidth = this.viewportHeight * aspectRatio;

        this.cameraInfo.w = viewportWidth;
        this.cameraInfo.h = this.viewportHeight;

        // 2. Look-Ahead Calculation
        const isPortrait = aspectRatio < 1.0;
        const xBaseRatio = isPortrait ? 0.22 : 0.12; 
        const yBaseRatio = !isPortrait ? 0.22 : 0.12;

        // X Axis
        const baseRangeX = viewportWidth * xBaseRatio;
        const speedBonusX = viewportWidth * 0.1 * dynamicSpeedRatio;
        const totalRangeX = baseRangeX + speedBonusX;
        const targetLookX = player.facingRight ? totalRangeX : -totalRangeX;
        
        // Y Axis (Velocity Threshold)
        const lookAheadRangeY = this.viewportHeight * yBaseRatio; 
        let targetLookY = 0;
        const vThreshold = 5.0; 
        
        if (player.vy > vThreshold) targetLookY = lookAheadRangeY; // Falling -> Look Down (+Y)
        else if (player.vy < -vThreshold) targetLookY = -lookAheadRangeY; // Jumping -> Look Up (-Y)

        // Dynamic Smoothing Calculation
        const baseLerp = 0.006;
        const fastLerp = 0.07;
        const dynamicLerp = baseLerp + (fastLerp - baseLerp) * dynamicSpeedRatio;

        // Apply Smoothing to LookAhead
        this.currentLookAheadX += (targetLookX - this.currentLookAheadX) * dynamicLerp;
        this.currentLookAheadY += (targetLookY - this.currentLookAheadY) * dynamicLerp;

        // 3. FIT VS FOLLOW LOGIC (Horizontal)
        let finalTargetX = this.cameraInfo.x;

        if (this.bounds.w <= viewportWidth) {
            // FIT MODE
            finalTargetX = this.bounds.x + (this.bounds.w - viewportWidth) / 2;
            this.currentLookAheadX = 0; 
        } else {
            // FOLLOW MODE
            const targetX = player.x + player.w / 2 - viewportWidth / 2 + this.offsetX + this.currentLookAheadX;
            const minX = this.bounds.x;
            const maxX = this.bounds.x + this.bounds.w - viewportWidth;
            finalTargetX = Math.max(minX, Math.min(targetX, maxX));
        }

        // 4. FIT VS FOLLOW LOGIC (Vertical)
        let finalTargetY = this.cameraInfo.y;

        if (this.bounds.h <= this.viewportHeight) {
            // FIT MODE
            finalTargetY = this.bounds.y + (this.bounds.h - this.viewportHeight) / 2;
            this.currentLookAheadY = 0;
        } else {
            // FOLLOW MODE
            const targetY = player.y + player.h / 2 - this.viewportHeight / 2 - this.offsetY + this.currentLookAheadY;
            
            const minY = this.bounds.y;
            const maxY = this.bounds.y + this.bounds.h - this.viewportHeight;
            
            finalTargetY = Math.max(minY, Math.min(targetY, maxY));
        }

        // 5. Final Movement (Dynamic Lerp)
        this.cameraInfo.x += (finalTargetX - this.cameraInfo.x) * dynamicLerp;
        this.cameraInfo.y += (finalTargetY - this.cameraInfo.y) * dynamicLerp;

        // 6. Shake Effect (Impulse)
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            const progress = this.shakeTimer / this.shakeDuration;
            const mag = this.shakeIntensity * progress;
            
            this.cameraInfo.x += (Math.random() - 0.5) * mag;
            this.cameraInfo.y += (Math.random() - 0.5) * mag;
            
            if (this.shakeTimer <= 0) {
                this.shakeTimer = 0;
                this.shakeIntensity = 0;
            }
        }
    }

    private updateConfigFromContext(context: UpdateContext, config: any) {
        this.bounds = context.levelBounds.level;
        
        // Sync Render Dimensions
        const dim = context.renderer.getDimensions();
        this.screenSize = dim;
        
        if (!context.config.isDevMode) {
            const aspect = dim.w / dim.h;
            const isPortrait = aspect < 1.0;
            if (isPortrait) {
                this.z = config.mobilePortraitZ;
                this.fov = config.mobilePortraitFOV;
                this.offsetX = config.mobilePortraitOffsetX;
                this.offsetY = config.mobilePortraitOffsetY;
            } else {
                if (dim.w < 1000) {
                    this.z = config.mobileLandscapeZ;
                    this.fov = config.mobileLandscapeFOV;
                    this.offsetX = config.mobileLandscapeOffsetX;
                    this.offsetY = config.mobileLandscapeOffsetY;
                } else if (dim.w < 1300) {
                    this.z = config.tabletLandscapeZ;
                    this.fov = config.tabletFOV;
                    this.offsetX = config.tabletOffsetX;
                    this.offsetY = config.tabletOffsetY;
                } else {
                    this.z = config.desktopZ;
                    this.fov = config.desktopFOV;
                    this.offsetX = config.desktopOffsetX;
                    this.offsetY = config.desktopOffsetY;
                }
            }
            this.lerpFactor = config.lerpFactor;
            this.landingShakeIntensity = config.landingShakeIntensity ?? 5.0;
        }
    }
}
