import { Platform, Point, CollisionLayer, Surface } from '../../../../types';


export class SurfaceBuilder {
    private readonly CHAR_W = 40;
    private readonly CHAR_H = 40;

    public build(platforms: Platform[]): Surface[] {
        let virtualGeometry: any[] = [];

        // 1. Create virtual geometry
        platforms.forEach(p => {
            if (p.type === 'vanishing' || p.type === 'bouncy' || p.type === 'wall') return;
            const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
            if (!(layer & CollisionLayer.SOLID)) return;

            if (p.type === 'moving' && p.moving) {
                virtualGeometry.push({
                    y: p.moving.start.y,
                    left: p.moving.start.x,
                    right: p.moving.start.x + p.w,
                    originalId: p.id,
                    isStation: 'START',
                    movingData: p.moving
                });
                virtualGeometry.push({
                    y: p.moving.end.y,
                    left: p.moving.end.x,
                    right: p.moving.end.x + p.w,
                    originalId: p.id,
                    isStation: 'END',
                    movingData: p.moving
                });
            } else {
                virtualGeometry.push({
                    y: p.y,
                    left: p.x,
                    right: p.x + p.w,
                    originalId: p.id
                });
            }
        });

        // 2. Process occlusions
        let segments = virtualGeometry.map(g => ({
            y: g.y,
            left: g.left,
            right: g.right,
            data: g
        }));

        const solidObstacles = platforms.filter(p => {
            const layer = p.layer !== undefined ? p.layer : CollisionLayer.SOLID;
            if (!(layer & CollisionLayer.SOLID)) return false;
            return p.type !== 'vanishing' && p.type !== 'moving';
        });

        segments = this.processOcclusions(segments, solidObstacles);

        // 3. Group by height
        const byHeight: Record<number, any[]> = {};
        segments.forEach(seg => {
            const y = Math.round(seg.y * 10) / 10;
            if (!byHeight[y]) byHeight[y] = [];
            byHeight[y].push(seg);
        });

        // 4. Create surfaces
        const surfaces: Surface[] = [];
        let surfaceIdCounter = 0;

        Object.keys(byHeight).forEach(key => {
            const y = parseFloat(key);
            const segs = byHeight[y];
            segs.sort((a: any, b: any) => a.left - b.left);

            const merged = this.mergeSegments(segs);

            merged.forEach((seg: any) => {
                if (seg.right - seg.left >= 20) {
                    const data = seg.data || {};
                    surfaces.push({
                        id: surfaceIdCounter++,
                        y,
                        left: seg.left,
                        right: seg.right,
                        width: seg.right - seg.left,
                        midPoint: { x: (seg.left + seg.right) / 2, y },
                        neighbors: [],
                        originalPlatformId: data.originalId,
                        isMovingStation: data.isStation
                    });
                }
            });
        });

        return surfaces;
    }

    private processOcclusions(segments: any[], obstacles: Platform[]) {
        const result: any[] = [];

        for (const seg of segments) {
            let parts = [seg];

            for (const obs of obstacles) {
                const obsTop = obs.y;
                const obsBottom = obs.y + obs.h;

                if (obsTop >= seg.y - 0.1) continue;
                if (obsBottom <= seg.y - this.CHAR_H + 0.1) continue;

                const nextParts: any[] = [];
                for (const part of parts) {
                    const overlapStart = Math.max(part.left, obs.x);
                    const overlapEnd = Math.min(part.right, obs.x + obs.w);

                    if (overlapStart < overlapEnd) {
                        if (part.left < overlapStart) {
                            nextParts.push({ ...part, right: overlapStart });
                        }
                        if (part.right > overlapEnd) {
                            nextParts.push({ ...part, left: overlapEnd });
                        }
                    } else {
                        nextParts.push(part);
                    }
                }
                parts = nextParts;
            }
            result.push(...parts);
        }
        return result;
    }

    private mergeSegments(segments: any[]) {
        if (segments.length === 0) return [];
        const merged = [segments[0]];

        for (let i = 1; i < segments.length; i++) {
            const top = merged[merged.length - 1];
            const current = segments[i];

            const sameId = top.data?.originalId === current.data?.originalId;
            const sameStation = top.data?.isStation === current.data?.isStation;

            if (current.left <= top.right + 1 && sameId && sameStation) {
                top.right = Math.max(top.right, current.right);
            } else {
                merged.push(current);
            }
        }
        return merged;
    }
}