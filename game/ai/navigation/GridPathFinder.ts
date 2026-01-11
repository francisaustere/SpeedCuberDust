
import { Platform, Point, Rect, CollisionLayer } from '../../../types';
import { SpatialHashGrid } from '../../utils/SpatialHashGrid';

interface Node {
    x: number;
    y: number;
    jumpValue: number; // 0=Grounded, 1=JumpStart, Even=Ascent(Lat), Odd=Ascent(Vert), >=6=Fall
    g: number; // Cost from start
    h: number; // Heuristic to end
    f: number; // Total cost
    parent: Node | null;
}

export class GridPathFinder {
    public static readonly GRID_SIZE = 20; // 20px Grid Cells

    static findPath(
        start: Point,
        end: Point,
        platforms: Platform[],
        bounds: Rect,
        clearance: number = 40,
        allowDirect: boolean = true,
        costs: { default: number, blocked: number } = { default: 1, blocked: Infinity },
        spatialHash?: SpatialHashGrid
    ): Point[] {
        // 1. Setup Grid Bounds
        const minX = Math.floor(bounds.x / this.GRID_SIZE);
        const maxX = Math.ceil((bounds.x + bounds.w) / this.GRID_SIZE);
        const minY = Math.floor(bounds.y / this.GRID_SIZE);
        const maxY = Math.ceil((bounds.y + bounds.h) / this.GRID_SIZE);

        const startNode = this.pointToNode(start);
        let endNode = this.pointToNode(end);

        // Clamp to bounds
        startNode.x = Math.max(minX, Math.min(maxX, startNode.x));
        startNode.y = Math.max(minY, Math.min(maxY, startNode.y));
        endNode.x = Math.max(minX, Math.min(maxX, endNode.x));
        endNode.y = Math.max(minY, Math.min(maxY, endNode.y));

        // --- SNAP TARGET IF BLOCKED ---
        const endWx = endNode.x * this.GRID_SIZE;
        const endWy = endNode.y * this.GRID_SIZE;
        if (this.isPositionBlocked(endWx, endWy, platforms, clearance, spatialHash)) {
            const snapped = this.findClosestFreeNode(endNode, platforms, bounds, clearance, spatialHash);
            if (snapped) endNode = snapped;
        }

        // 2. Direct Line Check (Optimization)
        const effectiveEnd = { x: endNode.x * this.GRID_SIZE, y: endNode.y * this.GRID_SIZE };
        if (allowDirect && !this.isLineBlocked(start, effectiveEnd, platforms, clearance, spatialHash)) {
            return [effectiveEnd];
        }

        // 3. Initialize A*
        const openSet: Node[] = [];
        // ClosedSet stores the lowest jumpValue we've seen for a coordinate.
        // We can revisit a node if we arrive with a *better* (lower) jumpValue, or specific state changes.
        // For simplicity and performance in JS, we'll key by `x,y,jumpValue`.
        const closedSet = new Set<string>();

        // Assume start is grounded (jumpValue 0) unless in air
        // Check if actually grounded
        const startGrounded = this.isGrounded(startNode.x, startNode.y, platforms, clearance, spatialHash);
        const initialJumpVal = startGrounded ? 0 : 6; // 0 if grounded, 6 if falling

        const root: Node = {
            x: startNode.x,
            y: startNode.y,
            jumpValue: initialJumpVal,
            g: 0,
            h: this.heuristic(startNode, endNode),
            f: 0,
            parent: null
        };
        root.f = root.g + root.h;
        openSet.push(root);

        const MAX_NODES = 2000;
        let iterations = 0;

        while (openSet.length > 0) {
            iterations++;
            if (iterations > MAX_NODES) break;

            // Pop lowest F
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift()!;

            const stateKey = `${current.x},${current.y},${current.jumpValue}`;
            if (closedSet.has(stateKey)) continue;
            closedSet.add(stateKey);

            // Goal Check (Relaxed radius)
            if (Math.abs(current.x - endNode.x) <= 1 && Math.abs(current.y - endNode.y) <= 1) {
                return this.reconstructPath(current, effectiveEnd);
            }

            // Generate Neighbors (8 Directions)
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = current.x + dx;
                    const ny = current.y + dy;

                    // Bounds Check
                    if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;

                    // Obstacle Check (Is the target cell inside a wall?)
                    const nWx = nx * this.GRID_SIZE;
                    const nWy = ny * this.GRID_SIZE;
                    if (this.isPositionBlocked(nWx, nWy, platforms, clearance, spatialHash)) continue;

                    // --- JUMP MECHANICS & STATE TRANSITION ---

                    // 1. Validate Move based on current Jump Value
                    const jV = current.jumpValue;

                    // Rule: Odd jumpValue (1, 3, 5) forces vertical movement. No lateral allowed.
                    const isOdd = jV % 2 !== 0 && jV < 6; // 6+ is falling, usually flexible
                    if (isOdd && dx !== 0) continue; // REJECT horizontal moves during forced ascent

                    // Rule: Max Jump Height Cap
                    // If we have been rising for a while (jV >= 6), we cannot go UP anymore.
                    if (jV >= 6 && dy < 0) continue; // Cannot jump higher

                    // 2. Calculate New Jump Value
                    let newJV = jV;
                    const isNextGrounded = this.isGrounded(nx, ny, platforms, clearance, spatialHash);
                    const isCeilingAbove = this.isCeiling(nx, ny, platforms, clearance, spatialHash);

                    if (isCeilingAbove && dy < 0) {
                        // Hit Head -> Fall
                        newJV = Math.max(6, jV + 2);
                    }
                    else if (dy > 0 && isNextGrounded) {
                        // Landing (Moving down onto ground)
                        newJV = 0;
                    }
                    else if (dy < 0) {
                        // Moving UP
                        if (jV < 2) newJV = 3; // Initial burst (0->3 or 1->3)
                        else if (jV % 2 === 0) newJV = jV + 2; // Even -> Even + 2 (Rising lateral allowed)
                        else newJV = jV + 1; // Odd -> Even (Finish forced vertical step)
                    }
                    else if (dy > 0) {
                        // Moving DOWN (Falling)
                        // If we were grounded (0) and walk off (dy>0), we become falling (6)
                        if (jV === 0) newJV = 6;
                        else if (jV % 2 === 0) newJV = Math.max(6, jV + 2);
                        else newJV = Math.max(6, jV + 1);
                    }
                    else {
                        // Horizontal (dy == 0)
                        if (jV === 0) {
                            // Walking on ground. If next is NOT grounded, we fall.
                            if (!isNextGrounded) newJV = 6;
                            else newJV = 0;
                        } else {
                            // Air strafe
                            newJV = jV + 1;
                        }
                    }

                    // 3. Cost Calculation
                    // Prefer ground (0) paths. Penalize air time.
                    const moveCost = Math.sqrt(dx * dx + dy * dy) * costs.default;
                    const airPenalty = (newJV / 4); // Small penalty for high jump values/falling
                    const gScore = current.g + moveCost + airPenalty;

                    // 4. Add to Open Set
                    // Check if closed
                    if (closedSet.has(`${nx},${ny},${newJV}`)) continue;

                    // Simple heuristic
                    const hScore = this.heuristic({ x: nx, y: ny }, endNode);

                    // Check existing open set for better path
                    const existing = openSet.find(n => n.x === nx && n.y === ny && n.jumpValue === newJV);
                    if (existing) {
                        if (gScore < existing.g) {
                            existing.g = gScore;
                            existing.f = gScore + existing.h;
                            existing.parent = current;
                        }
                    } else {
                        openSet.push({
                            x: nx,
                            y: ny,
                            jumpValue: newJV,
                            g: gScore,
                            h: hScore,
                            f: gScore + hScore,
                            parent: current
                        });
                    }
                }
            }
        }

        return [];
    }

    // --- HELPERS ---

    public static snapToValidLocation(
        target: Point,
        platforms: Platform[],
        bounds: Rect,
        clearance: number,
        spatialHash?: SpatialHashGrid
    ): Point | null {
        if (!this.isPositionBlocked(target.x, target.y, platforms, clearance, spatialHash)) {
            return target;
        }
        const targetNode = this.pointToNode(target);
        const validNode = this.findClosestFreeNode(targetNode, platforms, bounds, clearance, spatialHash);
        if (validNode) {
            return {
                x: validNode.x * this.GRID_SIZE,
                y: validNode.y * this.GRID_SIZE
            };
        }
        return null;
    }

    private static findClosestFreeNode(
        startNode: { x: number, y: number },
        platforms: Platform[],
        bounds: Rect,
        clearance: number,
        spatialHash?: SpatialHashGrid
    ): { x: number, y: number } | null {
        const queue = [startNode];
        const visited = new Set<string>();
        visited.add(`${startNode.x},${startNode.y}`);

        const minX = Math.floor(bounds.x / this.GRID_SIZE);
        const maxX = Math.ceil((bounds.x + bounds.w) / this.GRID_SIZE);
        const minY = Math.floor(bounds.y / this.GRID_SIZE);
        const maxY = Math.ceil((bounds.y + bounds.h) / this.GRID_SIZE);

        let iterations = 0;
        while (queue.length > 0) {
            if (iterations++ > 100) return null;
            const current = queue.shift()!;

            const wx = current.x * this.GRID_SIZE;
            const wy = current.y * this.GRID_SIZE;

            if (!this.isPositionBlocked(wx, wy, platforms, clearance, spatialHash)) {
                return current;
            }

            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 }
            ];

            for (const n of neighbors) {
                if (n.x < minX || n.x > maxX || n.y < minY || n.y > maxY) continue;
                const key = `${n.x},${n.y}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push(n);
                }
            }
        }
        return null;
    }

    static isPositionBlocked(x: number, y: number, platforms: Platform[], clearance: number, spatialHash?: SpatialHashGrid): boolean {
        // Check Box overlap at center (x,y) with size clearance
        const r = clearance / 2;
        const candidates = spatialHash ? spatialHash.query({ x: x - r, y: y - r, w: clearance, h: clearance }) : platforms;

        for (const p of candidates) {
            if (p.type === 'vanishing' && (p as any).isVanished) continue;

            // NEW: Ignore Non-Solid layers
            const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
            if (!(layer & CollisionLayer.SOLID)) continue;

            // AABB Overlap
            if (x + r > p.x && x - r < p.x + p.w &&
                y + r > p.y && y - r < p.y + p.h) {
                return true;
            }
        }
        return false;
    }

    // Check if there is solid ground 1 cell BELOW the given node
    private static isGrounded(gx: number, gy: number, platforms: Platform[], clearance: number, spatialHash?: SpatialHashGrid): boolean {
        // Check grid point (gx, gy+1)
        const wx = gx * this.GRID_SIZE;
        const wy = (gy + 1) * this.GRID_SIZE;
        // Reduce clearance slightly for ground check to avoid wall sticking
        return this.isPositionBlocked(wx, wy, platforms, clearance, spatialHash);
    }

    // Check if there is a ceiling 1 cell ABOVE the given node
    private static isCeiling(gx: number, gy: number, platforms: Platform[], clearance: number, spatialHash?: SpatialHashGrid): boolean {
        const wx = gx * this.GRID_SIZE;
        const wy = (gy - 1) * this.GRID_SIZE;
        return this.isPositionBlocked(wx, wy, platforms, clearance, spatialHash);
    }

    static isLineBlocked(start: Point, end: Point, platforms: Platform[], clearance: number, spatialHash?: SpatialHashGrid): boolean {
        const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / (this.GRID_SIZE / 2));
        const dx = (end.x - start.x) / steps;
        const dy = (end.y - start.y) / steps;

        for (let i = 1; i < steps; i++) {
            const cx = start.x + dx * i;
            const cy = start.y + dy * i;
            if (this.isPositionBlocked(cx, cy, platforms, clearance, spatialHash)) return true;
        }
        return false;
    }

    private static heuristic(a: { x: number, y: number }, b: { x: number, y: number }): number {
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
    }

    private static pointToNode(p: Point): { x: number, y: number } {
        return {
            x: Math.round(p.x / this.GRID_SIZE),
            y: Math.round(p.y / this.GRID_SIZE)
        };
    }

    private static reconstructPath(node: Node, endTarget: Point): Point[] {
        const path: Point[] = [];

        let curr: Node | null = node;
        while (curr) {
            path.push({
                x: curr.x * this.GRID_SIZE,
                y: curr.y * this.GRID_SIZE
            });
            curr = curr.parent;
        }

        return path.reverse();
    }
}
