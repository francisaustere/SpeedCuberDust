
import { Level, Rect } from '../types';
import { VISUAL_CONSTANTS } from '../config/defaults';

export const calculateBounds = (level: Level): { life: Rect, level: Rect } => {
    let minX = level.start.x;
    let maxX = level.start.x;
    let minY = level.start.y;
    let maxY = level.start.y;

    // Include Goal
    minX = Math.min(minX, level.goal.x);
    maxX = Math.max(maxX, level.goal.x + level.goal.w);
    minY = Math.min(minY, level.goal.y);
    maxY = Math.max(maxY, level.goal.y + level.goal.h);

    // Include Platforms
    level.platforms.forEach(p => {
        // Always check the platform's current defined position (baseline)
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x + p.w);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y + p.h);

        // If Moving, check the full range of motion (Start and End points)
        if (p.type === 'moving' && p.moving) {
            // Start Waypoint
            minX = Math.min(minX, p.moving.start.x);
            maxX = Math.max(maxX, p.moving.start.x + p.w);
            minY = Math.min(minY, p.moving.start.y);
            maxY = Math.max(maxY, p.moving.start.y + p.h);

            // End Waypoint
            minX = Math.min(minX, p.moving.end.x);
            maxX = Math.max(maxX, p.moving.end.x + p.w);
            minY = Math.min(minY, p.moving.end.y);
            maxY = Math.max(maxY, p.moving.end.y + p.h);
        }
    });

    // Level Boundary (Tight, no padding)
    const levelRect = {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
    };

    // Life Boundary (Padded, defines death perimeter)
    const PADDING = VISUAL_CONSTANTS.BOUNDS_PADDING;
    const lifeRect = {
        x: minX - PADDING,
        y: minY - PADDING,
        w: levelRect.w + (PADDING * 2),
        h: levelRect.h + (PADDING * 2)
    };
    
    return { level: levelRect, life: lifeRect };
};
