
export interface GridConfig {
    size: number;
    frequency: number;
    amplitude: number;
    speed: number;
    offset: number;
    rigid: boolean;
    visible: boolean;
    zBreathing: boolean;
    transparent: boolean; 
    lineWidth: number;
    platformLineWidth: number; 
    z: number;
    baseGradient: string[];
    lineColor: string;
}

export interface RainbowConfig {
    speed: number;
    spatialX: number;
    spatialY: number;
    chaosAmp: number;
    chaosFreq: number;
    saturation: number;
    lightness: number;
}

export interface PostProcessConfig {
    bloomStrength: number;
    bloomRadius: number;
    bloomThreshold: number;
    grainStrength: number;
}

export interface LightConfig {
    ambientIntensity: number;
    ambientColor: string;
    dirIntensity: number;
    dirColor: string;
    dirX: number;
    dirY: number;
    dirZ: number;
    showHelper: boolean;
}

export const DEFAULT_GRID: GridConfig = {
    size: 120,
    frequency: 0.044,
    amplitude: 2.0,
    speed: 1.5,
    offset: 0.009,
    rigid: true,
    visible: true,
    zBreathing: true,
    transparent: false,
    lineWidth: 2.5,
    platformLineWidth: 2.0,
    z: -60,
    baseGradient: ['#c7f6ff', '#ffc7e5'],
    lineColor: '#ffffff'
};

export const DEFAULT_RAINBOW: RainbowConfig = {
    speed: 0.4,
    spatialX: 0.007,
    spatialY: 0.0057,
    chaosAmp: 0,
    chaosFreq: 2.5,
    saturation: 1.0,
    lightness: 0.6
};

export const DEFAULT_POST_PROCESS: PostProcessConfig = {
    bloomStrength: 0.2,
    bloomRadius: 0.99,
    bloomThreshold: 0.7,
    grainStrength: 0.18
};

export const DEFAULT_LIGHT: LightConfig = {
    ambientIntensity: 2.6,
    ambientColor: "#ffffff",
    dirIntensity: 1.9,
    dirColor: "#ffffff",
    dirX: 670,
    dirY: 890,
    dirZ: 200,
    showHelper: false
};
