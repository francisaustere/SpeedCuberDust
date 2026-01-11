
import { Surface, Edge, PhysicsConfig, Platform } from '../../../../../types';
import { PhysicsSimulator } from '../PhysicsSimulator';

/**
 * WallClimbGenerator
 * 
 * Génère les edges de type WALL_CLIMB pour l'escalade de murs verticaux.
 * Inclut :
 * - Détection des murs accessibles (imbrication ou côte à côte)
 * - Calcul du point d'accroche optimal sur le mur
 * - Génération des edges d'accès (JUMP/DOUBLE_JUMP vers le mur)
 * - Génération de l'edge WALL_CLIMB final
 */
export class WallClimbGenerator {
    constructor(
        private config: PhysicsConfig,
        private simulator: PhysicsSimulator,
        private allPlatforms: Platform[],
        private surfaces: Surface[]
    ) { }

    /**
     * Point d'entrée principal : génère tous les edges wall climb possibles
     * de source vers target.
     */
    public generateWallClimbEdges(source: Surface, target: Surface) {
        console.log(`\n🧗 [WallClimb] Checking source ${source.id} -> target ${target.id}`);

        const dy = target.y - source.y;
        if (dy >= 0) {
            console.log(`  ❌ Target not above source (dy=${dy})`);
            return;
        }

        const maxClimbHeight = 1500;
        const climbHeight = Math.abs(dy);
        if (climbHeight > maxClimbHeight) {
            console.log(`  ❌ Climb too high (${climbHeight} > ${maxClimbHeight})`);
            return;
        }

        // 🆕 DÉTECTION D'IMBRICATION
        const overlapLeft = Math.max(source.left, target.left);
        const overlapRight = Math.min(source.right, target.right);
        const hasOverlap = overlapLeft < overlapRight;

        const maxGapPositive = 200;
        const maxOverlap = 500;
        const minApproachDistance = 80;

        const edgesToCreate: Array<{
            side: 'left' | 'right',
            wallX: number,
            startX: number
        }> = [];

        if (hasOverlap) {
            // 🆕 CAS IMBRICATION : Les deux murs de la plateforme TARGET sont accessibles
            console.log(`  📐 OVERLAP DETECTED: [${overlapLeft}, ${overlapRight}]`);

            // LEFT WALL
            const wallXLeft = target.left;
            const idealStartXLeft = wallXLeft - minApproachDistance;
            const clampedStartXLeft = Math.max(
                source.left + 10,
                Math.min(idealStartXLeft, source.right - 10)
            );

            edgesToCreate.push({
                side: 'left',
                wallX: wallXLeft,
                startX: clampedStartXLeft
            });

            // RIGHT WALL
            const wallXRight = target.right;
            const idealStartXRight = wallXRight + minApproachDistance;
            const clampedStartXRight = Math.max(
                source.left + 10,
                Math.min(idealStartXRight, source.right - 10)
            );

            edgesToCreate.push({
                side: 'right',
                wallX: wallXRight,
                startX: clampedStartXRight
            });

            console.log(`  ✅ OVERLAP: Both walls accessible (LEFT at ${wallXLeft}, RIGHT at ${wallXRight})`);

        } else {
            // CAS NORMAL : Plateformes côte à côte
            const gapLeftRaw = source.left - target.right;
            const gapRightRaw = target.left - source.right;

            console.log(`  📏 Gaps (normal):`, {
                gapLeftRaw: gapLeftRaw.toFixed(0),
                gapRightRaw: gapRightRaw.toFixed(0),
                climbHeight: climbHeight.toFixed(0)
            });

            // LEFT WALL CANDIDATE
            if ((gapRightRaw >= 0 && gapRightRaw <= maxGapPositive) ||
                (gapRightRaw < 0 && Math.abs(gapRightRaw) <= maxOverlap)) {

                const wallX = target.left;
                const idealStartX = wallX - minApproachDistance;
                const clampedStartX = Math.max(
                    source.left + 10,
                    Math.min(idealStartX, source.right - 10)
                );

                const distanceFromIdeal = Math.abs(clampedStartX - idealStartX);
                const maxTolerance = 20;

                if (distanceFromIdeal < maxTolerance) {
                    edgesToCreate.push({
                        side: 'left',
                        wallX: wallX,
                        startX: clampedStartX
                    });
                    console.log(`  ✅ LEFT wall accessible`);
                } else {
                    console.log(`  ❌ LEFT wall inaccessible (deviation: ${distanceFromIdeal.toFixed(0)}px)`);
                }
            } else {
                console.log(`  ❌ LEFT wall out of range (gap=${gapRightRaw.toFixed(0)}px)`);
            }

            // RIGHT WALL CANDIDATE
            if ((gapLeftRaw >= 0 && gapLeftRaw <= maxGapPositive) ||
                (gapLeftRaw < 0 && Math.abs(gapLeftRaw) <= maxOverlap)) {

                const wallX = target.right;
                const idealStartX = wallX + minApproachDistance;
                const clampedStartX = Math.max(
                    source.left + 10,
                    Math.min(idealStartX, source.right - 10)
                );

                const distanceFromIdeal = Math.abs(clampedStartX - idealStartX);
                const maxTolerance = 20;

                if (distanceFromIdeal < maxTolerance) {
                    edgesToCreate.push({
                        side: 'right',
                        wallX: wallX,
                        startX: clampedStartX
                    });
                    console.log(`  ✅ RIGHT wall accessible`);
                } else {
                    console.log(`  ❌ RIGHT wall inaccessible (deviation: ${distanceFromIdeal.toFixed(0)}px)`);
                }
            } else {
                console.log(`  ❌ RIGHT wall out of range (gap=${gapLeftRaw.toFixed(0)}px)`);
            }
        }

        if (edgesToCreate.length === 0) {
            console.log(`  ❌ No accessible wall for climb`);
            return;
        }

        console.log(`  ✅ ${edgesToCreate.length} wall(s) accessible, creating edges...`);

        // CRÉER UN EDGE POUR CHAQUE MUR ACCESSIBLE
        for (const wallData of edgesToCreate) {
            const { side: wallSide, wallX, startX } = wallData;

            console.log(`\n  🔧 [${wallSide.toUpperCase()} wall] Creating edge...`);

            const grabPoint = this.calculateOptimalWallGrabPoint(source, target, wallSide, startX);

            if (!grabPoint) {
                console.log(`  ❌ No optimal grab point found for ${wallSide} wall`);
                continue;
            }

            const accessCreated = this.generateWallClimbAccessEdges(
                source,
                { x: grabPoint.x, y: grabPoint.y, side: wallSide },
                target,
                startX
            );

            if (accessCreated) {
                const climbEdge: Edge = {
                    targetSurfaceId: target.id,
                    type: 'WALL_CLIMB',
                    startX: grabPoint.x,
                    destX: (target.left + target.right) / 2,
                    velocity: { x: 0, y: 0 },
                    meta: {
                        side: wallSide,
                        climbHeight: Math.abs(target.y - grabPoint.y),
                        grabY: grabPoint.y,
                        wallX: grabPoint.x,
                        targetY: target.y,
                        approachStartX: startX
                    }
                };

                source.neighbors.push(climbEdge);

                console.log(`  ✅ ${wallSide.toUpperCase()} WALL CLIMB edge created!`);
            } else {
                console.log(`  ❌ Failed to create access edge for ${wallSide} wall`);
            }
        }
    }

    /**
     * Calcule le point d'accroche optimal sur un mur depuis une source
     */
    private calculateOptimalWallGrabPoint(
        source: Surface,
        target: Surface,
        wallSide: 'left' | 'right',
        startX: number
    ): { x: number, y: number } | null {
        const maxJumpHeight = (this.config.jumpForce * this.config.jumpForce) / (2 * this.config.gravity);
        const timeToApex = -this.config.jumpForce / this.config.gravity;
        const maxAirTime = timeToApex * 3.5;
        const maxJumpDist = this.config.maxSpeed * maxAirTime;

        const wallX = wallSide === 'left' ? target.left : target.right;
        const dx = wallX - startX;
        const distH = Math.abs(dx);

        const maxReachableY_DoubleJump = source.y - (maxJumpHeight * 1.8);

        const wallTop = target.y;

        // Find platform height from original platform ID to calculate bottom
        let platformHeight = 500; // Default/Safe height if not found
        if (target.originalPlatformId !== undefined) {
            const p = this.allPlatforms.find(plat => plat.id === target.originalPlatformId);
            if (p) {
                platformHeight = p.h;
            }
        }
        const wallBottom = target.y + platformHeight;

        console.log(`\n🧗 [OptimalGrabPoint] Calculating for wall ${wallSide}:`, {
            sourceY: source.y,
            targetY: target.y,
            targetBottom: wallBottom.toFixed(0),
            maxReachableY_DoubleJump: maxReachableY_DoubleJump.toFixed(0),
            startX: startX.toFixed(0),
            wallX: wallX.toFixed(0),
            distH: distH.toFixed(0),
            maxJumpDist: maxJumpDist.toFixed(0)
        });

        let optimalY = Math.max(
            wallTop + 20,
            maxReachableY_DoubleJump
        );

        if (optimalY > wallBottom - 20) {
            console.log(`  ❌ Grab point would be below wall bottom (${optimalY.toFixed(0)} > ${(wallBottom - 20).toFixed(0)})`);
            return null;
        }

        if (optimalY >= source.y - 30) {
            console.log(`  ❌ Grab point not below source (${optimalY.toFixed(0)} >= ${(source.y - 30).toFixed(0)})`);
            return null;
        }

        if (distH > maxJumpDist) {
            console.log(`  ❌ Wall too far horizontally (${distH.toFixed(0)} > ${maxJumpDist.toFixed(0)})`);
            return null;
        }

        console.log(`  ✅ Optimal grab point found: Y=${optimalY.toFixed(0)} (on wall from ${wallTop} to ${wallBottom})`);

        return {
            x: wallX,
            y: optimalY
        };
    }

    /**
     * Génère les edges d'accès (JUMP ou DOUBLE_JUMP) pour atteindre le point d'accroche
     */
    private generateWallClimbAccessEdges(
        source: Surface,
        wallGrabPoint: { x: number, y: number, side: 'left' | 'right' },
        target: Surface,
        startX: number
    ): boolean {
        const dy = wallGrabPoint.y - source.y;
        const dx = wallGrabPoint.x - startX;
        const distH = Math.abs(dx);

        const maxJumpHeight = (this.config.jumpForce * this.config.jumpForce) / (2 * this.config.gravity);

        console.log(`\n🧗 [WallClimbAccess] Checking access to wall grab point:`, {
            sourceY: source.y,
            grabPointY: wallGrabPoint.y,
            dy: dy.toFixed(0),
            dx: dx.toFixed(0),
            side: wallGrabPoint.side,
            startX: startX.toFixed(0),
            destX: wallGrabPoint.x.toFixed(0)
        });

        // Essayer SIMPLE JUMP
        if (dy > -maxJumpHeight) {
            const jumpConfig = this.simulator.calculateJumpVelocity(dx, dy, startX, source.y, target);

            if (jumpConfig) {
                console.log(`  ✅ SIMPLE JUMP to wall grab point created!`);

                const edge: Edge = {
                    targetSurfaceId: target.id,
                    type: 'JUMP',
                    velocity: jumpConfig,
                    startX: startX,
                    destX: wallGrabPoint.x,
                    meta: {
                        wallClimbAccess: true,
                        side: wallGrabPoint.side,
                        grabY: wallGrabPoint.y,
                        approachStartX: startX
                    }
                };

                source.neighbors.push(edge);
                return true;
            }
        }

        // Essayer DOUBLE_JUMP
        console.log(`  🔵 Trying DOUBLE_JUMP to wall grab point...`);
        const delayFrames = 15;
        const airTimeFrames = this.simulator.solveDoubleJumpTime(dy, this.config.jumpForce, delayFrames, this.config.jumpForce);

        if (airTimeFrames > 0) {
            const reqVx = dx / airTimeFrames;

            if (Math.abs(reqVx) <= this.config.maxSpeed * 4) {
                console.log(`  ✅ DOUBLE_JUMP to wall grab point created!`);

                const edge: Edge = {
                    targetSurfaceId: target.id,
                    type: 'DOUBLE_JUMP',
                    velocity: { x: reqVx, y: this.config.jumpForce },
                    startX: startX,
                    destX: wallGrabPoint.x,
                    secondJumpDelay: delayFrames,
                    meta: {
                        wallClimbAccess: true,
                        side: wallGrabPoint.side,
                        grabY: wallGrabPoint.y,
                        wallX: wallGrabPoint.x,
                        targetY: target.y,
                        approachStartX: startX
                    }
                };

                source.neighbors.push(edge);
                return true;
            }
        }

        console.log(`  ❌ No jump can reach wall grab point`);
        return false;
    }
}
