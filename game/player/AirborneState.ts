
import { IPlayerState } from './IPlayerState';
import { PlayerController } from '../components/PlayerController';
import { InputState, Platform } from '../../types';
import { GroundedState } from './GroundedState';
import { CeilingState } from './CeilingState';

export class AirborneState implements IPlayerState {
    public name = 'AirborneState';

    enter(controller: PlayerController, config?: any): void {
        const player = controller.state;
        player.isGrounded = false;
    }

    update(controller: PlayerController, dt: number, input: InputState, config: any): IPlayerState | null {
        const player = controller.state;
        const physConfig = config.physicsConfig;
        const deformationConfig = config.deformationConfig;
        const platforms = config.platforms || [];

        // 1. Landing Check
        if (player.isGrounded) {
            return new GroundedState();
        }

        // 2. Ceiling Hang Check
        if (player.justHitCeiling) {
            if (input.jumpHeld && player.ceilingContactId !== null) {
                const ceilingPlat = platforms.find((p: Platform) => p.id === player.ceilingContactId);

                if (ceilingPlat && ceilingPlat.type !== 'bouncy') {
                    return new CeilingState();
                }
            }
        }

        // 3. Timers
        if (player.coyoteTimer > 0) player.coyoteTimer--;
        if (player.wallCoyoteTimer > 0) player.wallCoyoteTimer--;

        // 3.1 Clear platformId if coyote time expires
        if (player.coyoteTimer <= 0 && player.platformId !== null) {
            player.platformId = null;
        }

        // 4. Gravity & Spin Effects
        let gravity = physConfig.GRAVITY;
        
        // --- GRAVITY SCALING (Ascent/Descent) ---
        if (player.vy < 0) {
            // Ascending (Moving Up)
            gravity *= (physConfig.GRAVITY_ASCENT_MULTIPLIER ?? 1.0);
        } else if (player.vy > 0) {
            // Descending (Moving Down)
            gravity *= (physConfig.GRAVITY_DESCENT_MULTIPLIER ?? 1.0);
        }

        const spinSpeed = Math.abs(player.angularVelocity);
        const spinRatio = Math.min(1.0, spinSpeed / (physConfig.SPIN_MAX_SPEED || 1.0));

        const spinMode = physConfig.SPIN_EFFECT_MODE || 0;
        const baseStrength = physConfig.SPIN_EFFECT_STRENGTH || 0.5;
        const decayRate = physConfig.SPIN_EFFECT_DECAY ?? 0;

        if (spinMode > 0 && spinRatio > 0.1) {
            player.spinEffectTime += dt;
            const multiplier = Math.max(0, 1.0 - (player.spinEffectTime * decayRate));
            const activeStrength = baseStrength * multiplier;

            if (activeStrength > 0) {
                if (spinMode === 1) {
                    gravity *= (1 - (spinRatio * activeStrength));
                }
                else if (spinMode === 2) {
                    player.vy -= (spinRatio * activeStrength);
                }
                else if (spinMode === 3) {
                    if (Math.abs(player.vy) < 5.0) {
                        gravity *= (1 - (spinRatio * activeStrength));
                    }
                }
            }
        }

        player.vy += gravity;

        if (input.down) {
            player.vy += physConfig.DIVING_FORCE;
            player.isDiving = true;
        } else {
            player.isDiving = false;
        }

        // Terminal Velocity
        if (player.vy > physConfig.MAX_FALL_VELOCITY) player.vy = physConfig.MAX_FALL_VELOCITY;

        // 5. Horizontal Movement
        const baseAccel = physConfig.ACCEL_AIR;
        const maxSpinAccel = physConfig.SPIN_AIR_ACCEL ?? 0.75;
        const activeAccel = baseAccel + (maxSpinAccel - baseAccel) * spinRatio;

        if (input.left) {
            player.vx -= activeAccel;
            player.facingRight = false;
        }
        if (input.right) {
            player.vx += activeAccel;
            player.facingRight = true;
        }

        // 6. Air Friction (Conditional)
        if (input.left || input.right) {
            // Active Friction (Usually lighter or 1.0)
            player.vx *= (physConfig.AIR_FRICTION_ACTIVE ?? 1.0);
        } else {
            // Passive Friction (Stopping power)
            player.vx *= physConfig.AIR_FRICTION;
        }

        const absCap = physConfig.MAX_SPEED || 10;
        if (player.vx > absCap) player.vx = absCap;
        if (player.vx < -absCap) player.vx = -absCap;

        if (Math.abs(player.vx) < 0.1) player.vx = 0;

        // 7. Wall Detection
        this.handleWallDetection(controller, platforms);

        // 8. Wall Slide
        const pushingWall = (player.wallNormal.x > 0.1 && input.left) || (player.wallNormal.x < -0.1 && input.right);
        const isSteep = Math.abs(player.wallNormal.y) < 0.7;

        player.isWallSliding = player.onWall && player.vy > 5.0 && pushingWall && isSteep;

        if (player.isWallSliding) {
            const currentSpeed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
            if (currentSpeed > physConfig.WALL_SLIDE_SPEED) {
                const scale = physConfig.WALL_SLIDE_SPEED / currentSpeed;
                player.vx *= scale;
                player.vy *= scale;
            }
            const interval = Math.PI / 2;
            player.visualRotation = Math.round(player.visualRotation / interval) * interval;
            player.angularVelocity = 0;
        }

        // 9. Wall Timers & Jump Refresh
        if (player.onWall) {
            player.wallCoyoteTimer = physConfig.COYOTE_TIME;
            player.lastWallNormalX = player.wallNormal.x;
            player.spinDir = 0;
            player.spinDelayTimer = 0;
            player.spinEffectTime = 0;

            if (player.wallNormal.x > 0) player.wallDir = -1;
            else if (player.wallNormal.x < 0) player.wallDir = 1;

            if (!player.wallJumpRefillLocked) {
                player.jumpCount = player.maxJumps;
                player.wallJumpRefillLocked = true;
            }
        } else {
            player.wallJumpRefillLocked = false;
        }

        if (player.jumpCount > player.maxJumps) player.jumpCount = player.maxJumps;

        // 10. Jump Logic
        this.handleJump(controller, input, physConfig, deformationConfig, platforms);

        // 11. Rotation Logic
        this.handleRotation(controller, input, physConfig, deformationConfig);

        // 12. Apply Movement
        player.x += player.vx;
        player.y += player.vy;

        // 13. Visuals
        controller.updatePlayerDeformation(player, physConfig, deformationConfig);

        return null;
    }

    exit(controller: PlayerController): void {
        const player = controller.state;
        player.isWallSliding = false;
        player.isDiving = false;
    }

    private handleWallDetection(controller: PlayerController, platforms: Platform[]) {
        const player = controller.state;
        if (!player.onWall && platforms.length > 0) {
            const wallCheckDist = 3.0;
            const checkY = player.y + 2;
            const checkH = player.h - 4;
            const leftBox = { x: player.x - wallCheckDist, y: checkY, w: player.w, h: checkH };
            const rightBox = { x: player.x + wallCheckDist, y: checkY, w: player.w, h: checkH };

            for (const p of platforms) {
                if ((p as any).isVanished) continue;

                const checkAABB = (rectA: any, rectB: any) => (
                    rectA.x < rectB.x + rectB.w &&
                    rectA.x + rectA.w > rectB.x &&
                    rectA.y < rectB.y + rectB.h &&
                    rectA.y + rectA.h > rectB.y
                );

                if (checkAABB(leftBox, p)) {
                    player.onWall = true;
                    player.wallNormal = { x: 1, y: 0 };
                    player.wallDir = -1;
                    break;
                }
                if (checkAABB(rightBox, p)) {
                    player.onWall = true;
                    player.wallNormal = { x: -1, y: 0 };
                    player.wallDir = 1;
                    break;
                }
            }
        }
    }

    private handleRotation(controller: PlayerController, input: InputState, physConfig: any, deformationConfig: any) {
        const player = controller.state;
        if (player.spinDelayTimer > 0) return;

        const isInputSpinning = input.jumpHeld;

        if (physConfig.SPIN_ACCELERATION_ENABLED) {
            const spinAccel = physConfig.SPIN_ACCELERATION_RATE || 0.005;
            const spinDecel = physConfig.SPIN_DECELERATION_RATE ?? 0.005;
            const max = physConfig.SPIN_MAX_SPEED || 0.5;

            if (player.spinDir !== 0 && isInputSpinning) {
                player.angularVelocity += player.spinDir * spinAccel;
                if (Math.abs(player.angularVelocity) > max) {
                    player.angularVelocity = Math.sign(player.angularVelocity) * max;
                }
            } else {
                if (player.angularVelocity !== 0) {
                    const currentDir = Math.sign(player.angularVelocity);
                    player.angularVelocity -= currentDir * spinDecel;
                    if (Math.sign(player.angularVelocity) !== currentDir) {
                        player.angularVelocity = 0;
                    }
                }
            }
        }

        const spinThreshold = 0.15;
        if (!isInputSpinning && Math.abs(player.angularVelocity) < spinThreshold) {
            const snapCondition = deformationConfig?.rotationSnapCondition || 0;
            const currentDir = Math.sign(player.angularVelocity);
            const isAllowed = snapCondition === 0 || currentDir === snapCondition || player.angularVelocity === 0;

            if (isAllowed) {
                const intervalDeg = deformationConfig?.rotationSnapIntervalDeg ?? 90;
                const intervalRad = intervalDeg * (Math.PI / 180);
                let targetRot = player.visualRotation;

                if (Math.abs(intervalDeg - 90) < 1.0) {
                    const currentRot = player.visualRotation;
                    const period = Math.PI / 2;
                    const k = Math.floor(currentRot / period);
                    const baseRot = k * period;
                    const localRot = currentRot - baseRot;
                    const isBaseHoriz = (Math.abs(k) % 2) === 0;
                    const sx = player.scale.x || 0.1;
                    const sy = player.scale.y || 0.1;
                    let threshold = Math.PI / 4;
                    if (isBaseHoriz) threshold = Math.atan2(sx, sy);
                    else threshold = Math.atan2(sy, sx);

                    if (localRot < threshold) targetRot = baseRot;
                    else targetRot = baseRot + period;
                } else {
                    const currentRot = player.visualRotation;
                    targetRot = Math.round(currentRot / intervalRad) * intervalRad;
                }

                const snapSpeed = deformationConfig?.rotationSnapSpeed || 0.2;
                player.visualRotation += (targetRot - player.visualRotation) * snapSpeed;
                player.angularVelocity *= 0.8;
            }
        }
        player.visualRotation += player.angularVelocity;
    }

    private handleJump(controller: PlayerController, input: InputState, physConfig: any, deformationConfig: any, platforms: any[]) {
        const player = controller.state;

        if (input.jumpPressed) {
            player.jumpBufferTimer = physConfig.JUMP_BUFFER;
        }

        if (player.jumpBufferTimer > 0) {
            let jumped = false;
            const canWallJump = (player.onWall || player.wallCoyoteTimer > 0) && (input.left || input.right);

            if (canWallJump) {
                const normalX = player.onWall ? player.wallNormal.x : player.lastWallNormalX;
                const dirX = Math.sign(normalX);
                player.vx = dirX * physConfig.WALL_JUMP_X;
                player.vy = physConfig.WALL_JUMP_Y;
                player.jumpCount--;
                player.facingRight = (player.vx > 0);
                jumped = true;
                player.justJumped = true;
                player.wallJumpGraceTimer = physConfig.WALL_JUMP_INPUT_INFLUENCE ? 0 : 1;
                player.x += player.vx;
                player.y += player.vy;
                player.isJumping = true;

                if (deformationConfig) {
                    player.scale.x = deformationConfig.wallJumpSquashX;
                    player.scale.y = deformationConfig.wallJumpSquashY;
                    player.scale.z = deformationConfig.wallJumpSquashY;
                }
            }

            if (!jumped) {
                if (player.coyoteTimer > 0) {
                    player.vy = physConfig.JUMP_FORCE;
                    if (player.platformId !== null) {
                        const p = platforms.find((pl: Platform) => pl.id === player.platformId);
                        if (p && p.currentVx !== undefined && p.currentVy !== undefined) {
                            player.vx += p.currentVx;
                            player.vy += p.currentVy;
                        }
                    }
                    player.jumpCount--;
                    jumped = true;
                    player.justJumped = true;
                    player.wallJumpGraceTimer = 0;
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
                else if (player.jumpCount > 0) {
                    player.vy = physConfig.DOUBLE_JUMP_FORCE;
                    player.jumpCount--;
                    jumped = true;
                    player.justDoubleJumped = true;
                    player.wallJumpGraceTimer = 1;
                    player.isJumping = true;

                    if (deformationConfig) {
                        player.scaleVel.y += deformationConfig.doubleJumpVelY;
                        player.scaleVel.x += deformationConfig.doubleJumpVelXZ;
                        player.scaleVel.z += deformationConfig.doubleJumpVelXZ;
                    }

                    const spinDir = player.facingRight ? -1 : 1;
                    player.spinDir = spinDir;
                    player.spinDelayTimer = physConfig.SPIN_START_DELAY || 0;
                    player.angularVelocity = 0;
                    if (!physConfig.SPIN_ACCELERATION_ENABLED) {
                        player.angularVelocity = spinDir * 0.25;
                    }
                }
            }

            if (jumped) {
                player.coyoteTimer = 0;
                player.jumpBufferTimer = 0;
                player.wallCoyoteTimer = 0;
                player.platformId = null;
            }
        }

        if (!input.jumpHeld && player.vy < -2 && player.wallJumpGraceTimer === 0 && player.isJumping) {
            player.vy *= 0.5;
        }
    }
}
