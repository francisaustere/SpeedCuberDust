import { IPlayerState } from './IPlayerState';
import { PlayerController } from '../components/PlayerController';
import { InputState, Platform, Rect } from '../../types';
import { AirborneState } from './AirborneState';

export class CeilingState implements IPlayerState {
    public name = 'CeilingState';

    enter(controller: PlayerController, config?: any): void {
        console.log('[CeilingState] ENTER');
        const player = controller.state;
        
        // Halt vertical momentum
        player.vy = 0;
        player.isHanging = true;
        player.isJumping = false; // Prevent variable jump dampening
        
        // Reset rotation for a cleaner "hanging" look
        player.visualRotation = 0;
        player.angularVelocity = 0;
        
        // Refresh mechanics
        // Fix: Removed 'player.hasDash = true;'
        player.jumpCount = player.maxJumps; // Refill jumps on ceiling grab
        
        // Snap player slightly to ensure head contact logic remains valid visually
        // The PhysicsSystem already aligned us to bottom of platform (y = p.y + p.h)
    }

    update(controller: PlayerController, dt: number, input: InputState, config: any): IPlayerState | null {
        const player = controller.state;
        const physConfig = config.physicsConfig;
        const deformationConfig = config.deformationConfig;
        const platforms: Platform[] = config.platforms || [];

        // 0. Force Physics Override
        player.vy = 0; // Fight any gravity that might have leaked
        player.visualRotation = 0; // Fight spin
        player.angularVelocity = 0;

        // 1. Exit Conditions
        // Release Jump OR Press Down
        if (!input.jumpHeld || input.down) {
            console.log('[CeilingState] EXIT: Input released or Down pressed', { jumpHeld: input.jumpHeld, down: input.down });
            return new AirborneState();
        }

        // 2. Validate Ceiling Existence
        // We must ensure there is still a platform above us.
        if (player.ceilingContactId === null) {
             console.log('[CeilingState] EXIT: No Contact ID');
             return new AirborneState();
        }
        
        const ceilingPlat = platforms.find((p: Platform) => p.id === player.ceilingContactId);
        
        // If platform vanished or moved away
        if (!ceilingPlat) {
            console.log('[CeilingState] EXIT: Platform not found in level');
            return new AirborneState();
        }
        
        // Check Horizontal Overlap
        // We check if the player's center X is within the platform's width range
        const pCx = player.x + player.w / 2;
        if (pCx < ceilingPlat.x || pCx > ceilingPlat.x + ceilingPlat.w) {
            // Walked off the edge of the ceiling
            console.log('[CeilingState] EXIT: Walked off edge', { pCx, platX: ceilingPlat.x, platW: ceilingPlat.w });
            return new AirborneState();
        }
        
        // 3. Movement (Lateral Crawl)
        // Use Specific Ceiling Acceleration and Speed
        const activeMaxSpeed = physConfig.CEILING_SPEED ?? physConfig.MAX_SPEED; 
        const activeAccel = physConfig.CEILING_ACCEL ?? physConfig.ACCEL_GROUND;
        
        if (input.left) {
            let a = activeAccel;
            if (physConfig.ACCEL_GROUND_EXPONENT > 0 && player.vx < 0) {
                const ratio = Math.abs(player.vx) / activeMaxSpeed;
                a *= Math.pow(Math.max(0, 1 - ratio), physConfig.ACCEL_GROUND_EXPONENT);
            }
            player.vx -= a;
            player.facingRight = false;
        }
        if (input.right) {
            let a = activeAccel;
            if (physConfig.ACCEL_GROUND_EXPONENT > 0 && player.vx > 0) {
                const ratio = Math.abs(player.vx) / activeMaxSpeed;
                a *= Math.pow(Math.max(0, 1 - ratio), physConfig.ACCEL_GROUND_EXPONENT);
            }
            player.vx += a;
            player.facingRight = true;
        }

        // Friction
        player.vx *= physConfig.FRICTION;
        
        // Clamp
        if (player.vx > activeMaxSpeed) player.vx = activeMaxSpeed;
        if (player.vx < -activeMaxSpeed) player.vx = -activeMaxSpeed;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;

        // 4. Apply Position (X only, Y is locked to ceiling)
        player.x += player.vx;
        
        // Sync Y to platform bottom just in case moving platforms drift
        player.y = ceilingPlat.y + ceilingPlat.h;
        
        // If the platform is moving, add its velocity to X
        if (ceilingPlat.currentVx) {
            player.x += ceilingPlat.currentVx;
        }
        if (ceilingPlat.currentVy) {
            // If vertical moving platform, keep sync
            // The strict assignment above handles static/simple moving. 
            // If platform moves UP, player.y moves up naturally.
        }

        // 5. Update Visuals
        // Fix: Removed 'false' argument
        controller.updatePlayerDeformation(player, physConfig, deformationConfig);

        return null;
    }

    exit(controller: PlayerController): void {
        console.log('[CeilingState] EXITING STATE');
        const player = controller.state;
        player.isHanging = false;
        player.ceilingContactId = null;
        
        // Reset scale anchor to normal
        player.scaleAnchor = -1;
    }
}