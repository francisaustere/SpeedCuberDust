
import { SCENE_Config } from './constants';

export interface ItemVisual {
    fillColor: string;
    edgeColor: string;
    opacity?: number;
}

export interface ThemeConfig {
    fillOpacity: number;
    vanishingOpacity: number;
    edgeThickness: number;

    // Z-Scale Controls
    platformDepth: number;
    wallDepth: number;
    cubeDepth: number;

    // Per-Type Configs
    platform: ItemVisual;
    wall: ItemVisual;
    floor: ItemVisual;
    cube: ItemVisual;
    moving: ItemVisual;


    vanishing: ItemVisual;
    tunnel: ItemVisual;
    extrusion: ItemVisual;
    bouncy: ItemVisual; // New
}

export const DEFAULT_THEME: ThemeConfig = {
    fillOpacity: 1,
    vanishingOpacity: 1,
    edgeThickness: 2.5, // Reduced from 4
    platformDepth: SCENE_Config.PLATFORM_DEPTH,
    wallDepth: SCENE_Config.WALL_DEPTH,
    cubeDepth: SCENE_Config.CUBE_DEPTH,
    platform: { fillColor: '#ffc7e8', edgeColor: '#ffffff', opacity: 1.0 },
    wall: { fillColor: '#ffc7e8', edgeColor: '#ffffff', opacity: 1.0 },
    floor: { fillColor: '#ffc7e8', edgeColor: '#ffffff', opacity: 1.0 },
    cube: { fillColor: '#ffc7e8', edgeColor: '#ffffff', opacity: 1.0 },
    moving: { fillColor: '#9333ea', edgeColor: '#ffffff', opacity: 1.0 },


    vanishing: { fillColor: '#dfbbfc', edgeColor: '#ffffff', opacity: 1.0 },
    tunnel: { fillColor: '#000000', edgeColor: '#00ffff', opacity: 1.0 },
    extrusion: { fillColor: '#d0c2ef', edgeColor: '#00ffff', opacity: 1.0 },
    bouncy: { fillColor: '#ff00ff', edgeColor: '#00ff00', opacity: 1.0 } // Neon Pink/Green for bounce
};
