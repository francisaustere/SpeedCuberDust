
import { IPlayerState } from './IPlayerState';
import { PlayerController } from '../components/PlayerController';
import { InputState } from '../../types';
import { GroundedState } from './GroundedState';
import { AirborneState } from './AirborneState';

export class SquashedState implements IPlayerState {
    public name = 'SquashedState';

    enter(controller: PlayerController, config?: any): void {
        const player = controller.state;
        
        player.isCrouching = true;
        player.isGrounded = true;
        
        // Kill momentum
        player.vx = 0;
        player.angularVelocity = 0;
        player.visualRotation = 0; // Flat
        
        // Immediate visual feedback
        player.targetScale = { x: 1.4, y: 0.4, z: 1.4 }; // Pancake
        player.scaleVel = { x: 0, y: 0, z: 0 };
    }

    update(controller: PlayerController, dt: number, input: InputState, config: any): IPlayerState | null {
        const player = controller.state;
        const physConfig = config.physicsConfig;
        
        // NEW: Force Stand Trigger (from Scanning Drone)
        if (player.forceStand) {
            player.forceStand = false;
            player.crouchLockoutTimer = 30; // 0.5s lockout
            return new GroundedState();
        }
        
        // Exit Condition: Release Down
        if (!input.down) {
            return new GroundedState();
        }
        
        // Fall Check (Walked off ledge / Platform moved)
        if (!player.isGrounded) {
            return new AirborneState();
        }

        // Apply Gravity (Safety, ensures we stay grounded)
        player.vy += physConfig.GRAVITY;
        
        // Apply Friction (Ensure full stop)
        player.vx = 0;
        
        // Platform Carry
        if (player.platformId !== null) {
            const p = config.platforms.find((pl: any) => pl.id === player.platformId);
            if (p) {
                if (p.currentVx) player.x += p.currentVx;
                if (p.currentVy) player.y += p.currentVy;
            }
        }

        // Apply Movement (Vertical only from platforms)
        player.y += player.vy;
        
        // Maintain Squashed Visuals
        player.targetScale.x = 1.4;
        player.targetScale.y = 0.4;
        player.targetScale.z = 1.4;
        
        // We manually update deformation logic since this state overrides standard behavior
        const stiffness = 0.2;
        const damping = 0.5;
        
        ['x', 'y', 'z'].forEach((axis: any) => {
            const displacement = player.targetScale[axis] - player.scale[axis];
            const force = displacement * stiffness;
            player.scaleVel[axis] += force;
            player.scaleVel[axis] *= damping;
            player.scale[axis] += player.scaleVel[axis];
        });

        return null;
    }

    exit(controller: PlayerController): void {
        const player = controller.state;
        player.isCrouching = false;
        // Spring back to normal
        player.targetScale = { x: 1, y: 1, z: 1 };
    }
}
