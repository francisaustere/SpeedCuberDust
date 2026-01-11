
import { Point, Surface, Edge, PhysicsConfig } from '../../../types';

export class GraphPathFinder {
    constructor(
        private surfaces: Surface[],
        private config: PhysicsConfig
    ) { }

    public findPath(start: Point, end: Point): Point[] {
        const startSurf = this.getClosestSurface(start);
        const endSurf = this.getClosestSurface(end);

        if (!startSurf || !endSurf) return [];

        const margin = 10;
        const clampedEnd = { ...end };

        if (endSurf.width < margin * 2) {
            clampedEnd.x = endSurf.midPoint.x;
        } else {
            const safeLeft = endSurf.left + margin;
            const safeRight = endSurf.right - margin;
            clampedEnd.x = Math.max(safeLeft, Math.min(safeRight, end.x));
        }
        clampedEnd.y = endSurf.y;

        if (startSurf.id === endSurf.id) return [clampedEnd];

        const openSet: { surf: Surface; parent: any; g: number; f: number; edge: Edge | null }[] = [];
        const closedSet = new Set<number>();

        openSet.push({
            surf: startSurf,
            parent: null,
            g: 0,
            f: this.heuristic(startSurf, endSurf),
            edge: null
        });

        let iterations = 0;

        while (openSet.length > 0) {
            if (iterations++ > 500) break;

            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;

            if (current.surf.id === endSurf.id) {
                return this.reconstructPath(current, clampedEnd);
            }

            closedSet.add(current.surf.id);

            for (const edge of current.surf.neighbors) {
                const neighbor = this.surfaces.find(s => s.id === edge.targetSurfaceId);
                if (!neighbor || closedSet.has(neighbor.id)) continue;

                const distCost = this.heuristic(current.surf, neighbor);
                let typeCost = this.getEdgeCost(edge, current.surf, neighbor);

                // 🆕 CORRECTION : Utiliser la position de l'ennemi pour la surface de départ
                let referenceX: number;
                if (current.surf.id === startSurf.id) {
                    // Pour la première surface, utiliser la position réelle de l'ennemi
                    referenceX = start.x;
                } else {
                    // Pour les autres surfaces, utiliser le centre
                    referenceX = current.surf.midPoint.x;
                }

                let horizontalDist;
                if (edge.meta?.approachStartX !== undefined) {
                    horizontalDist = Math.abs(edge.meta.approachStartX - referenceX);
                } else {
                    horizontalDist = Math.abs(edge.startX - referenceX);
                }

                const gScore = current.g + distCost + typeCost + horizontalDist * 0.5;

                const existing = openSet.find(x => x.surf.id === neighbor.id);
                if (!existing || gScore < existing.g) {
                    const h = this.heuristic(neighbor, endSurf);
                    const newNode = {
                        surf: neighbor,
                        parent: current,
                        g: gScore,
                        f: gScore + h,
                        edge: edge
                    };

                    if (existing) {
                        existing.parent = current;
                        existing.g = gScore;
                        existing.f = gScore + h;
                        existing.edge = edge;
                    } else {
                        openSet.push(newNode);
                    }
                }
            }
        }

        return [];
    }

    private getEdgeCost(edge: Edge, source: Surface, target: Surface): number {
        if (edge.type === 'JUMP') {
            const dy = target.y - source.y;
            const dx = Math.abs(edge.startX - target.midPoint.x);
            const maxJumpHeight = (this.config.jumpForce * this.config.jumpForce) / (2 * this.config.gravity);
            const timeToApex = -this.config.jumpForce / this.config.gravity;
            const maxAirTime = timeToApex * 2.2;
            const maxJumpDist = this.config.maxSpeed * maxAirTime;
            const verticalRatio = Math.abs(dy) / maxJumpHeight;
            const horizontalRatio = dx / maxJumpDist;
            const isRiskyJump = verticalRatio > 0.75 || horizontalRatio > 0.75;
            return isRiskyJump ? 200 : 5;
        } else if (edge.type === 'DOUBLE_JUMP') return 30;
        else if (edge.type === 'WALL_CLIMB') return 100;
        else if (edge.type === 'RIDE') return (edge.rideDuration || 2) * 30;
        return 1;
    }

    private heuristic(a: Surface, b: Surface): number {
        return Math.sqrt(Math.pow(a.midPoint.x - b.midPoint.x, 2) + Math.pow(a.y - b.y, 2));
    }

    private getClosestSurface(p: Point): Surface | null {
        let best: Surface | null = null;
        let minRate = Infinity;

        for (const s of this.surfaces) {
            if (p.x >= s.left - 50 && p.x <= s.right + 50) {
                const dy = s.y - p.y;
                if (dy >= -10 && dy < 300) {
                    const dist = Math.abs(dy);
                    if (dist < minRate) {
                        minRate = dist;
                        best = s;
                    }
                }
            }
        }

        if (best) return best;

        let bestDistSq = Infinity;
        for (const s of this.surfaces) {
            const distSq = this.distToSegmentSq(p, s.left, s.y, s.right, s.y);
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                best = s;
            }
        }

        return best;
    }

    private distToSegmentSq(p: Point, x1: number, y1: number, x2: number, y2: number): number {
        const C = p.x;
        const D = p.y;
        const dx = x2 - x1;
        const dy = y2 - y1;

        if (dx !== 0 || dy !== 0) {
            const t = ((C - x1) * dx + (D - y1) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x1 = x2;
                y1 = y2;
            } else if (t > 0) {
                x1 += dx * t;
                y1 += dy * t;
            }
        }

        const dx2 = C - x1;
        const dy2 = D - y1;
        return dx2 * dx2 + dy2 * dy2;
    }

    private reconstructPath(node: any, finalDest: Point): Point[] {
        const path: Point[] = [];
        path.push(finalDest);

        let curr = node;
        while (curr.parent) {
            const edge: Edge = curr.edge;
            if (edge) {
                let waypointX = edge.startX;
                let waypointY = curr.parent.surf.y;

                if (edge.type === 'RIDE') {
                    waypointY = curr.surf.y;
                }

                // ✅ CORRIGÉ : Si c'est un edge d'accès au WALL_CLIMB (avec wallClimbAccess)
                if (edge.meta?.wallClimbAccess) {
                    // 1. Créer le waypoint WALL_CLIMB (montée finale)
                    path.push({
                        x: edge.meta.wallX || edge.destX,
                        y: curr.surf.y,
                        // @ts-ignore
                        meta: {
                            type: 'WALL_CLIMB',
                            side: edge.meta.side,
                            grabY: edge.meta.grabY,
                            wallX: edge.meta.wallX,
                            targetSurfaceId: curr.surf.id,
                            targetY: edge.meta.targetY || curr.surf.y
                        }
                    });

                    // 2. Créer le waypoint DOUBLE_JUMP (accès au mur)
                    path.push({
                        x: waypointX,
                        y: waypointY,
                        // @ts-ignore
                        meta: {
                            type: edge.type,
                            velocity: edge.velocity,
                            secondVelocity: edge.secondVelocity,
                            delay: edge.delay,
                            secondJumpDelay: edge.secondJumpDelay,
                            targetSurfaceId: curr.surf.id,
                            targetY: edge.meta.grabY,
                            destX: edge.destX,
                            wallClimbAccess: true
                        }
                    });
                } else {
                    // Comportement normal pour les autres edges
                    path.push({
                        x: waypointX,
                        y: waypointY,
                        // @ts-ignore
                        meta: {
                            type: edge.type,
                            velocity: edge.velocity,
                            secondVelocity: edge.secondVelocity,
                            delay: edge.delay,
                            wallPoint: edge.wallPoint,
                            climbWallX: edge.climbWallX,
                            wallNormalX: edge.wallNormalX,
                            jumpType: edge.jumpType,
                            wallEntryY: edge.wallEntryY,
                            ridePlatformId: edge.ridePlatformId,
                            targetSurfaceId: curr.surf.id,
                            targetY: curr.surf.y,
                            destX: edge.destX
                        }
                    });
                }
            }

            curr = curr.parent;
        }

        return path.reverse();
    }
}
