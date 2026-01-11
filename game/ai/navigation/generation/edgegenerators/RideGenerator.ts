import { Platform, Surface } from '../../../../../types';

export class RideGenerator {
    public generateRideEdges(surfaces: Surface[], allPlatforms: Platform[]) {
        const movers = allPlatforms.filter(p => p.type === 'moving' && p.moving);

        movers.forEach(mover => {
            const startSurfs = surfaces.filter(s => s.originalPlatformId === mover.id && s.isMovingStation === 'START');
            const endSurfs = surfaces.filter(s => s.originalPlatformId === mover.id && s.isMovingStation === 'END');

            // Start -> End
            startSurfs.forEach(s => {
                endSurfs.forEach(e => {
                    s.neighbors.push({
                        targetSurfaceId: e.id,
                        type: 'RIDE',
                        velocity: { x: 0, y: 0 },
                        startX: s.midPoint.x,
                        ridePlatformId: mover.id,
                        rideDuration: mover.moving!.duration
                    });
                });
            });

            // End -> Start
            endSurfs.forEach(e => {
                startSurfs.forEach(s => {
                    e.neighbors.push({
                        targetSurfaceId: s.id,
                        type: 'RIDE',
                        velocity: { x: 0, y: 0 },
                        startX: e.midPoint.x,
                        ridePlatformId: mover.id,
                        rideDuration: mover.moving!.duration
                    });
                });
            });
        });
    }
}