
import { Platform, Surface, Edge, PhysicsConfig } from '../../../../../types';
import { PhysicsSimulator } from '../PhysicsSimulator';

/**
 * JumpGenerator
 * 
 * Génère les edges de type JUMP et DOUBLE_JUMP pour les sauts
 * entre surfaces.
 * 
 * Note : WALL_CLIMB a été déplacé dans WallClimbGenerator.ts
 */
export class JumpGenerator {
    constructor(
        private config: PhysicsConfig,
        private simulator: PhysicsSimulator,
        private allPlatforms: Platform[]
    ) { }

    public generateJumpEdges(source: Surface, target: Surface, jumpMargin: number = 22) {
        const dy = target.y - source.y;
        const maxJumpHeight = (this.config.jumpForce * this.config.jumpForce) / (2 * this.config.gravity);
        const timeToApex = -this.config.jumpForce / this.config.gravity;

        // ✅ Calcul du temps de vol réel selon la direction
        let maxAirTime: number;

        if (dy >= 0) {
            // ✅ Saut vers le BAS ou horizontal
            const t_up = timeToApex;
            const apexHeight = maxJumpHeight;
            const fallDistance = apexHeight + dy;
            const t_down = Math.sqrt(2 * fallDistance / this.config.gravity);
            const totalAirTime = t_up + t_down;

            // Bonus de steering (on peut ajuster pendant 50% du temps)
            const steeringBonus = totalAirTime * 0.5;
            maxAirTime = totalAirTime + steeringBonus;

            // console.log(`  📉 [JumpGenerator] Falling jump:`, {
            //     dy: dy.toFixed(0),
            //     t_up: t_up.toFixed(2),
            //     t_down: t_down.toFixed(2),
            //     totalAirTime: totalAirTime.toFixed(2),
            //     steeringBonus: steeringBonus.toFixed(2),
            //     maxAirTime: maxAirTime.toFixed(2)
            // });

        } else {
            // ✅ Saut vers le HAUT
            maxAirTime = timeToApex * 3.5;
        }

        const maxJumpDist = this.config.maxSpeed * maxAirTime;

        console.log(`\n🔵 [JumpGenerator] Checking source ${source.id} -> target ${target.id}`, {
            sourceY: source.y,
            targetY: target.y,
            dy: dy.toFixed(0),
            maxJumpHeight: maxJumpHeight.toFixed(0),
            maxAirTime: maxAirTime.toFixed(2),
            maxJumpDist: maxJumpDist.toFixed(0)
        });

        const attempts = this.calculateJumpAttempts(source, target, jumpMargin);
        // console.log(`  📍 [JumpGenerator] ${attempts.length} attempts generated:`, attempts);

        let simpleJumpFound = false;

        for (const attempt of attempts) {
            if (attempt.start < source.left || attempt.start > source.right) {
                // console.log(`  ❌ [JumpGenerator] Attempt ${attempt.label} REJECTED (startX out of bounds)`);
                continue;
            }

            const startX = attempt.start;
            const destX = attempt.end;
            const dx = destX - startX;
            const distH = Math.abs(dx);

            // console.log(`  🎯 [JumpGenerator] Trying attempt ${attempt.label}:`, {
            //     startX: startX.toFixed(0),
            //     destX: destX.toFixed(0),
            //     dx: dx.toFixed(0),
            //     distH: distH.toFixed(0)
            // });

            const verticalRatio = Math.abs(dy) / maxJumpHeight;
            const horizontalRatio = distH / maxJumpDist;

            // ✅ Calcul adaptatif selon la direction
            let isRiskyJump = false;

            if (dy < 0) {
                // ✅ Saut vers le HAUT : strict
                isRiskyJump = verticalRatio > 0.75 || horizontalRatio > 0.75;
                // console.log(`  📊 [JumpGenerator] Upward jump risk:`, {
                //     verticalRatio: verticalRatio.toFixed(2),
                //     horizontalRatio: horizontalRatio.toFixed(2),
                //     isRisky: isRiskyJump
                // });

            } else if (dy > maxJumpHeight * 0.5) {
                // ✅ Saut vers le BAS significatif : très permissif
                isRiskyJump = horizontalRatio > 0.95;
                // console.log(`  📊 [JumpGenerator] Falling jump risk:`, {
                //     dy: dy.toFixed(0),
                //     horizontalRatio: horizontalRatio.toFixed(2),
                //     isRisky: isRiskyJump
                // });

            } else {
                // ✅ Saut horizontal ou légère descente : modéré
                isRiskyJump = horizontalRatio > 0.85;
                // console.log(`  📊 [JumpGenerator] Horizontal jump risk:`, {
                //     horizontalRatio: horizontalRatio.toFixed(2),
                //     isRisky: isRiskyJump
                // });
            }

            const isMovingTarget = target.originalPlatformId !== undefined;
            let targetSpeed = 0;
            if (isMovingTarget) {
                const movingPlat = this.allPlatforms.find(p => p.id === target.originalPlatformId);
                if (movingPlat && movingPlat.velocityX) {
                    targetSpeed = Math.abs(movingPlat.velocityX);
                }
            }
            const isHighSpeedTarget = targetSpeed > 50;

            if (dy > -maxJumpHeight && distH < maxJumpDist) {
                // console.log(`  ✅ [JumpGenerator] Conditions met! Trying calculateJumpVelocity...`);

                let jumpConfig: { x: number; y: number } | null = null;

                // ✅ Pour les sauts vers le BAS, on bypass calculateJumpVelocity
                if (dy >= 0) {
                    const sign = dx >= 0 ? 1 : -1;
                    jumpConfig = {
                        x: sign * this.config.maxSpeed,
                        y: this.config.jumpForce
                    };

                    console.log(`  ✅ [JumpGenerator] Falling jump velocity (no calc needed): vx=${jumpConfig.x.toFixed(2)}, vy=${jumpConfig.y.toFixed(2)}`);

                } else {
                    jumpConfig = this.simulator.calculateJumpVelocity(dx, dy, startX, source.y, target);

                    if (jumpConfig) {
                        // console.log(`  ✅ [JumpGenerator] JUMP velocity found! vx=${jumpConfig.x.toFixed(2)}, vy=${jumpConfig.y.toFixed(2)}`);
                    } else {
                        // console.log(`  ❌ [JumpGenerator] calculateJumpVelocity FAILED`);
                    }
                }

                if (jumpConfig) {
                    const edge: Edge = {
                        targetSurfaceId: target.id,
                        type: 'JUMP',
                        velocity: jumpConfig,
                        startX: startX,
                        destX: destX
                    };

                    if (target.originalPlatformId !== undefined) {
                        const movingPlat = this.allPlatforms.find(p => p.id === target.originalPlatformId);
                        if (movingPlat && movingPlat.type === 'moving') {
                            edge.ridePlatformId = target.originalPlatformId;
                        }
                    }

                    source.neighbors.push(edge);
                    simpleJumpFound = true;

                    if (isRiskyJump || isHighSpeedTarget) {
                        // console.log(`⚠️ Risky JUMP, generating DOUBLE_JUMP fallback`);
                        this.tryAddDoubleJump(source, target, startX, dx, dy);
                    }
                }
            } else {
                // console.log(`  ❌ [JumpGenerator] Conditions not met:`, {
                //     'dy > -maxJumpHeight': dy > -maxJumpHeight,
                //     'distH < maxJumpDist': distH < maxJumpDist
                // });
            }

            if (!simpleJumpFound || isRiskyJump || isHighSpeedTarget) {
                // console.log(`  🔵 [JumpGenerator] Trying DOUBLE_JUMP...`);
                this.tryAddDoubleJump(source, target, startX, dx, dy);
            }

            if (simpleJumpFound) break;
        }
    }

    private calculateJumpAttempts(source: Surface, target: Surface, jumpMargin: number) {
        const attempts: { start: number; end: number; label: string }[] = [];
        const isOverlapping = Math.max(source.left, target.left) < Math.min(source.right, target.right);

        if (!isOverlapping) {
            if (target.left >= source.right) {
                // Gap to the RIGHT
                const isWall = target.y < source.y && target.left - source.right < this.config.charW;
                const minBackoff = isWall ? this.config.charW + 20 : jumpMargin;
                attempts.push({ start: source.right - minBackoff, end: target.left + 10, label: 'GapRight' });

                // 🆕 Aggressive Toe-Off Attempt (closer to edge for max range)
                if (!isWall) {
                    // 10px margin = toes near edge
                    attempts.push({ start: source.right - 10, end: target.left + 10, label: 'GapRight_Toe' });
                }

            } else {
                // Gap to the LEFT
                const isWall = target.y < source.y && source.left - target.right < this.config.charW;
                const gapSize = source.left - target.right;
                const minBackoff = isWall ? this.config.charW + 20 :
                    (gapSize > 150 ? 10 : jumpMargin);

                attempts.push({
                    start: source.left + minBackoff,
                    end: target.right - 10,
                    label: 'GapLeft'
                });

                // 🆕 Aggressive Toe-Off Attempt
                if (!isWall) {
                    attempts.push({ start: source.left + 10, end: target.right - 10, label: 'GapLeft_Toe' });
                }
            }
        } else {
            const sourceCenterX = source.left + source.width / 2;
            const targetCenterX = target.left + target.width / 2;

            if (targetCenterX < sourceCenterX) {
                attempts.push({ start: source.left + jumpMargin, end: target.right - 10, label: 'OverlapLeft' });
            } else {
                attempts.push({ start: source.right - jumpMargin, end: target.left + 10, label: 'OverlapRight' });
            }

            if (target.left > source.left && target.left < source.right) {
                attempts.push({ start: target.left - 30, end: target.left + 5, label: 'LedgeL' });
            }
            if (target.right < source.right && target.right > source.left) {
                attempts.push({ start: target.right + 30, end: target.right - 5, label: 'LedgeR' });
            }

            if (target.y < source.y && Math.abs(target.y - source.y) < 150) {
                attempts.push({ start: source.midPoint.x, end: target.midPoint.x, label: 'ShortHop' });
            }
        }

        return attempts;
    }

    private tryAddDoubleJump(source: Surface, target: Surface, startX: number, dx: number, dy: number) {
        // 🆕 Try multiple delays to maximize coverage
        const delays = [15, 10, 20];

        for (const delayFrames of delays) {
            const airTimeFrames = this.simulator.solveDoubleJumpTime(dy, this.config.jumpForce, delayFrames, this.config.jumpForce);

            if (airTimeFrames && airTimeFrames > 0) {
                const reqVx = dx / airTimeFrames;
                let finalVx = reqVx;

                // 🆕 Tolerance Check with Strict Distance Validation
                if (Math.abs(reqVx) > this.config.maxSpeed) {
                    // 1. Broad Phase Check (15% Over-limit max)
                    if (Math.abs(reqVx) > this.config.maxSpeed * 1.15) {
                        // Way too far, abort immediately
                        continue;
                    }

                    // 2. Clamp Velocity
                    finalVx = Math.sign(reqVx) * this.config.maxSpeed;

                    // 3. Narrow Phase: Check if the CLAMPED speed actually reaches the platform edge
                    // We calculate the maximum distance we can physically travel in the available time
                    const maxPossibleDist = Math.abs(finalVx) * airTimeFrames;

                    // Calculate the absolute minimum distance needed to just touch the edge
                    let minRequiredDist = 0;
                    if (dx > 0) { // Moving Right
                        // Need to reach Target Left
                        minRequiredDist = target.left - startX;
                    } else { // Moving Left
                        // Need to reach Target Right
                        minRequiredDist = startX - target.right;
                    }

                    // Add a safety buffer (must penetrate at least 15px into the platform)
                    // Updated to 15px to allow aggressive jumps to still register if close enough
                    const safetyBuffer = 15;

                    if (maxPossibleDist < minRequiredDist + safetyBuffer) {
                        // console.log(`  ❌ [JumpGenerator] Clamped speed safe-check FAILED. Need: ${(minRequiredDist + safetyBuffer).toFixed(0)}, Max Possible: ${maxPossibleDist.toFixed(0)}`);
                        // This "fake" valid jump is rejected. Loop will try other delays or stop.
                        continue;
                    }

                    // console.log(`  ⚠️ [JumpGenerator] Clamping DoubleJump Vx ${reqVx.toFixed(2)} -> ${finalVx.toFixed(2)} (Safe clearance: +${(maxPossibleDist - minRequiredDist).toFixed(1)}px)`);
                }

                const vx1 = finalVx;
                const vx2 = finalVx;

                if (
                    this.simulator.simulateDoubleJump(
                        startX,
                        source.y,
                        vx1,
                        this.config.jumpForce,
                        delayFrames,
                        this.config.jumpForce,
                        vx2,
                        airTimeFrames,
                        target
                    )
                ) {
                    const edge: Edge = {
                        targetSurfaceId: target.id,
                        type: 'DOUBLE_JUMP',
                        velocity: { x: vx1, y: this.config.jumpForce },
                        secondVelocity: { x: vx2, y: this.config.jumpForce },
                        delay: delayFrames / 60,
                        startX: startX
                    };

                    if (target.originalPlatformId !== undefined) {
                        const movingPlat = this.allPlatforms.find(p => p.id === target.originalPlatformId);
                        if (movingPlat && movingPlat.type === 'moving') {
                            edge.ridePlatformId = target.originalPlatformId;
                        }
                    }

                    source.neighbors.push(edge);
                    // console.log(`✅ DOUBLE_JUMP added! (delay: ${delayFrames})`);
                    return; // Stop if we found a working solution
                }
            }
        }
    }
}
