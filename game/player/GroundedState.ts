import { IPlayerState } from './IPlayerState';
import { PlayerController } from '../components/PlayerController';
import { InputState, Platform } from '../../types';
import { AirborneState } from './AirborneState';
import { SquashedState } from './SquashedState';

export class GroundedState implements IPlayerState {
    public name = 'GroundedState';

    enter(controller: PlayerController, config?: any): void {
        const player = controller.state;
        
        player.isGrounded = true;
        player.jumpCount = player.maxJumps;
        player.isDiving = false;
        player.isJumping = false; 
        
        // Reset rotational mechanics
        player.angularVelocity = 0;
        player.spinDir = 0;
        player.spinDelayTimer = 0;
        player.spinEffectTime = 0; 

        // --- LANDING LOGIC ---
        // Only trigger visuals if we were actually airborne previously
        if (!controller.lastGrounded) {
            // Normalize Rotation
            player.visualRotation = player.visualRotation % (Math.PI * 2);
            if (player.visualRotation > Math.PI) player.visualRotation -= Math.PI * 2;
            if (player.visualRotation < -Math.PI) player.visualRotation += Math.PI * 2;

            if (config) {
                // Landing Shake / Sound
                if (player.isDiving) { 
                    player.landingShake = true;
                    player.justLandedDive = true;
                }

                // Deformation
                const deformationConfig = config.deformationConfig;
                if (deformationConfig) {
                    const impact = Math.min(Math.abs(controller.lastAirVelocity), 40);
                    const uprightFactor = Math.abs(Math.cos(player.visualRotation));
                    const sidewaysFactor = 1.0 - uprightFactor;

                    const squashY = impact * (deformationConfig.landSquashY ?? 0.04); 
                    const squashX = impact * (deformationConfig.landSquashX ?? 0.02); 
                    
                    const deltaY = (-squashY * uprightFactor) + (squashX * sidewaysFactor);
                    const deltaX = (squashX * uprightFactor) + (-squashY * sidewaysFactor);

                    player.scaleVel.y += deltaY;
                    player.scaleVel.x += deltaX;
                    player.scaleVel.z += squashX; 
                }
            }
        }
    }

    update(controller: PlayerController, dt: number, input: InputState, config: any): IPlayerState | null {
        const player = controller.state;
        const physConfig = config.physicsConfig;
        const deformationConfig = config.deformationConfig;
        const platforms = config.platforms || [];

        // 0. Refresh Coyote Time constantly while grounded
        player.coyoteTimer = physConfig.COYOTE_TIME;
        
        // STRICT: Zero out angular velocity every frame to ensure no momentum leaks into air state
        player.angularVelocity = 0;

        // 1. Jump Check
        // Set buffer if pressed this frame
        if (input.jumpPressed) {
            player.jumpBufferTimer = physConfig.JUMP_BUFFER;
        }

        // Execute Jump if buffer is active
        if (player.jumpBufferTimer > 0) {
            this.performJump(player, physConfig, deformationConfig, platforms);
            return new AirborneState();
        }
        
        // 2. Crouch / Squash Check
        if (input.down && player.crouchLockoutTimer <= 0) {
            return new SquashedState();
        }

        // 3. Fall Check (Walked off ledge)
        if (!player.isGrounded) {
            return new AirborneState();
        }

        // 4. Gravity (Keep grounded)
        player.vy += physConfig.GRAVITY;

        // 5. INSTANT MOVEMENT (No Acceleration, No Friction Loop)
        const targetSpeed = physConfig.MAX_SPEED;
        
        if (input.left) {
            player.vx = -targetSpeed;
            player.facingRight = false;
        } 
        else if (input.right) {
            player.vx = targetSpeed;
            player.facingRight = true;
        } 
        else {
            player.vx = 0;
        }

        // 6. Platform Carry
        if (player.platformId !== null) {
            const p = platforms.find((pl: Platform) => pl.id === player.platformId);
            if (p) {
                if (p.currentVx) player.x += p.currentVx;
                if (p.currentVy) player.y += p.currentVy;
            }
        }

        // 7. Visual Rotation Snap (Instant Ground Stability)
        const interval = Math.PI / 2;
        const targetRot = Math.round(player.visualRotation / interval) * interval;
        const smoothing = 0.4; 
        player.visualRotation += (targetRot - player.visualRotation) * smoothing;
        if (Math.abs(player.visualRotation - targetRot) < 0.005) {
            player.visualRotation = targetRot;
        }

        // 8. Apply Movement
        player.x += player.vx;
        player.y += player.vy;

        // 9. Update Visuals
        controller.updatePlayerDeformation(player, physConfig, deformationConfig);

        return null;
    }

    exit(controller: PlayerController): void {}

    private performJump(player: any, physConfig: any, deformationConfig: any, platforms: any[]) {
        let platVx = 0;
        let platVy = 0;
        
        if (player.platformId !== null) {
            const p = platforms.find((pl: Platform) => pl.id === player.platformId);
            if (p && p.currentVx !== undefined && p.currentVy !== undefined) {
                platVx = p.currentVx;
                platVy = p.currentVy;
            }
        }
        
        player.vy = physConfig.JUMP_FORCE;
        player.vx += platVx;
        player.vy += platVy; 
        
        player.jumpCount--; 
        player.justJumped = true; 
        player.isGrounded = false;
        player.platformId = null;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0; 
        player.isJumping = true; 

        if (deformationConfig) {
            const jumpStretch = deformationConfig.jumpSquashY; 
            const jumpSquash = deformationConfig.jumpSquashX;
            const uprightFactor = Math.abs(Math.cos(player.visualRotation));
            const sidewaysFactor = 1.0 - uprightFactor;
            
            player.scale.y = (jumpStretch * uprightFactor) + (jumpSquash * sidewaysFactor);
            player.scale.x = (jumpSquash * uprightFactor) + (jumpStretch * sidewaysFactor);
            player.scale.z = jumpSquash;
            player.scaleVel.y = 0; 
            player.scaleVel.x = 0;
        }
    }
}