import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { GAME_Config, SCENE_Config } from '../config/constants';
import { StorageManager } from '../utils/StorageManager';

// Import New Configuration Sources
import { ThemeConfig, ItemVisual, DEFAULT_THEME } from '../../config/theme';
import { PhysicsConfig, DEFAULT_PHYSICS_CONFIG } from '../config/physics';
import { GridConfig, PostProcessConfig, LightConfig, RainbowConfig, DEFAULT_GRID, DEFAULT_LIGHT, DEFAULT_POST_PROCESS, DEFAULT_RAINBOW } from '../engine/rendering/EnvironmentSettings';
import { EnemyConfig, EnemyConfiguration } from '../game/components/EnemyConfiguration';
import { VanishingConfig, VanishingPlatform } from '../game/components/VanishingPlatform';
import { PlayerDeformationConfig, PlayerVisuals } from '../game/components/PlayerVisuals';
import { DEFAULT_CAMERA_SETTINGS } from '../config/defaults';

// Re-export interfaces for consumers
export type { ThemeConfig, ItemVisual, PhysicsConfig, GridConfig, PostProcessConfig, LightConfig, RainbowConfig, EnemyConfig, VanishingConfig, PlayerDeformationConfig };
export type VisualConfig = ThemeConfig;

export interface AudioLayerConfig {
    volume: number;
    muted: boolean;
}

export interface AudioConfig {
    kick: AudioLayerConfig;
    bass: AudioLayerConfig;
    clap: AudioLayerConfig;
    hihat: AudioLayerConfig;
    melody: AudioLayerConfig;
    synth: AudioLayerConfig;
    ethereal: AudioLayerConfig;
    victory: AudioLayerConfig;
}

export interface DrawConfig {
    showHitboxes: boolean;
    showDroneViewCones: boolean;
    showWalkerViewCones: boolean;
    showWalkerColliders: boolean;
    showWalkerHearingRange: boolean;
    showWalkerSocialRange: boolean;
    showEnemyLogic: boolean;
    showPathfindingNodes: boolean;
    showPlatformIds: boolean;
}

export interface PathfindingConfig {
    defaultCost: number;
    blockedCost: number;
    nodeClearance: number;
}

export const CONFIG_STORAGE_KEY = 'speedcuber_config_v15'; // Bumping version again

export const useDebugConfig = () => {
    const [isDevMode, setIsDevMode] = useState(false);
    const [showDevUI, setShowDevUI] = useState(true);
    const [activeDebugSection, setActiveDebugSection] = useState<string | null>(null);

    const [timeScale, setTimeScale] = useState(1);
    const isResettingRef = useRef(false);

    const getSaved = () => {
        try {
            const s = StorageManager.getItem(CONFIG_STORAGE_KEY);
            return s ? JSON.parse(s) : {};
        } catch (e) {
            console.warn("Failed to load config, resetting", e);
            return {};
        }
    };
    const [saved] = useState(getSaved);

    const PROFILE_2_VALUES = {
        ...DEFAULT_PHYSICS_CONFIG,
        GRAVITY: 0.75,
        GRAVITY_ASCENT_MULTIPLIER: 0.85,
        GRAVITY_DESCENT_MULTIPLIER: 1.4,
        JUMP_FORCE: -11,
        DOUBLE_JUMP_FORCE: -11,
        MAX_SPEED: 7,
        ACCEL_GROUND: 6.8,
        ACCEL_AIR: 0.85,
        SPIN_AIR_ACCEL: 0.85,
        ACCEL_GROUND_EXPONENT: 0.2,
        FRICTION: 0.65,
        AIR_FRICTION: 0.94,
        AIR_FRICTION_ACTIVE: 1.0,
        MAX_FALL_VELOCITY: 25,
        WALL_SLIDE_SPEED: 1.5,
        WALL_JUMP_X: 5.0,
        WALL_JUMP_Y: -10,
        WALL_JUMP_INPUT_INFLUENCE: false,
        WALL_JUMP_GRACE_PERIOD: 12,
        COYOTE_TIME: 8,
        JUMP_BUFFER: 5,
        SPIN_ACCELERATION_ENABLED: true,
        SPIN_ACCELERATION_RATE: 0.025,
        SPIN_DECELERATION_RATE: 0.023,
        SPIN_MAX_SPEED: 0.4,
        SPIN_START_DELAY: 0.1,
        SPIN_EFFECT_MODE: 3,
        SPIN_EFFECT_STRENGTH: 0.9,
        SPIN_EFFECT_DECAY: 1.2,
        CEILING_SPEED: 4.5,
        CEILING_ACCEL: 8,
        DIVING_FORCE: 1,
        BOUNCY_BLOCK_RESTITUTION_X: 1,
        BOUNCY_BLOCK_RESTITUTION_Y: 1,
        BOUNCY_MIN_SPEED: 10,
        PROJECTILE_DEFLECTION_FORCE: 1.8
    };

    const [physicsProfiles, setPhysicsProfiles] = useState<Record<string, PhysicsConfig>>(saved.physicsProfiles || {
        'Profile 1': { ...DEFAULT_PHYSICS_CONFIG },
        'Profile 2': PROFILE_2_VALUES
    });

    const [activeProfile, setActiveProfileState] = useState<string>(saved.activeProfile || 'Profile 2');
    const [physicsConfig, setPhysicsConfig] = useState(saved.physicsConfig || { ...PROFILE_2_VALUES });

    const [gridConfig, setGridConfig] = useState<GridConfig>(saved.gridConfig || DEFAULT_GRID);
    const [rainbowConfig, setRainbowConfig] = useState<RainbowConfig>(saved.rainbowConfig || DEFAULT_RAINBOW);
    const [visualConfig, setVisualConfig] = useState<ThemeConfig>(saved.visualConfig || DEFAULT_THEME);

    const [postProcessConfig, setPostProcessConfig] = useState<PostProcessConfig>(saved.postProcessConfig || DEFAULT_POST_PROCESS);
    const [lightConfig, setLightConfig] = useState<LightConfig>(saved.lightConfig || DEFAULT_LIGHT);

    const initialEnemyConfig = { ...EnemyConfiguration.DEFAULTS, ...(saved.enemyConfig || {}) };

    const [enemyConfig, setEnemyConfig] = useState<EnemyConfig>(initialEnemyConfig);
    const [vanishingConfig, setVanishingConfig] = useState<VanishingConfig>(saved.vanishingConfig || VanishingPlatform.DEFAULTS);

    const [drawConfig, setDrawConfig] = useState<DrawConfig>(saved.drawConfig || {
        showHitboxes: false,
        showDroneViewCones: false,
        showWalkerViewCones: false,
        showWalkerColliders: false,
        showWalkerHearingRange: false,
        showWalkerSocialRange: false,
        showEnemyLogic: true, 
        showPathfindingNodes: false,
        showPlatformIds: false
    });

    const [pathfindingConfig, setPathfindingConfig] = useState<PathfindingConfig>(saved.pathfindingConfig || {
        defaultCost: 1,
        blockedCost: 1000,
        nodeClearance: 35
    });

    const defaultCameraConfig = {
        z: 640,
        fov: 77,
        offsetX: 0,
        offsetY: 150,
        rotX: 0,
        lerpFactor: 0.1,
        fallSpeed: 4500,
        introDuration: 2.0,
        desktopZ: DEFAULT_CAMERA_SETTINGS.DESKTOP.Z,
        desktopFOV: DEFAULT_CAMERA_SETTINGS.DESKTOP.FOV,
        desktopOffsetX: DEFAULT_CAMERA_SETTINGS.DESKTOP.OFFSET_X,
        desktopOffsetY: DEFAULT_CAMERA_SETTINGS.DESKTOP.OFFSET_Y,
        mobilePortraitZ: DEFAULT_CAMERA_SETTINGS.MOBILE_PORTRAIT.Z,
        mobilePortraitFOV: DEFAULT_CAMERA_SETTINGS.MOBILE_PORTRAIT.FOV,
        mobilePortraitOffsetX: DEFAULT_CAMERA_SETTINGS.MOBILE_PORTRAIT.OFFSET_X,
        mobilePortraitOffsetY: DEFAULT_CAMERA_SETTINGS.MOBILE_PORTRAIT.OFFSET_Y,
        mobileLandscapeZ: DEFAULT_CAMERA_SETTINGS.MOBILE_LANDSCAPE.Z,
        mobileLandscapeFOV: DEFAULT_CAMERA_SETTINGS.MOBILE_LANDSCAPE.FOV,
        mobileLandscapeOffsetX: DEFAULT_CAMERA_SETTINGS.MOBILE_LANDSCAPE.OFFSET_X,
        mobileLandscapeOffsetY: DEFAULT_CAMERA_SETTINGS.MOBILE_LANDSCAPE.OFFSET_Y,
        tabletLandscapeZ: DEFAULT_CAMERA_SETTINGS.TABLET_LANDSCAPE.Z,
        tabletFOV: DEFAULT_CAMERA_SETTINGS.TABLET_LANDSCAPE.FOV,
        tabletOffsetX: DEFAULT_CAMERA_SETTINGS.TABLET_LANDSCAPE.OFFSET_X,
        tabletOffsetY: DEFAULT_CAMERA_SETTINGS.TABLET_LANDSCAPE.OFFSET_Y,
        landingShakeIntensity: 5.0
    };

    const mergedCameraConfig = {
        ...defaultCameraConfig,
        ...(saved.cameraConfig || {}),
    };

    const [cameraConfig, setCameraConfig] = useState(mergedCameraConfig);

    const [playerVisuals, setPlayerVisuals] = useState(saved.playerVisuals || {
        rotX: 0,
        size: GAME_Config.PLAYER_SIZE
    });

    const [tunnelConfig, setTunnelConfig] = useState(saved.tunnelConfig || {
        gridZ: -60,
        depth: 500,
        scale: 1,
        showTunnel: true,
        showEdges: true,
        showMask: true,
        extrusionDepth: 0,
        platformZScale: 1.0
    });

    const [exitConfig, setExitConfig] = useState(saved.exitConfig || {
        runDepth: 600,
        fogStartRadius: 500,
        fogEndRadius: 0,
        duration: 1.5,
        camLookAtSpeed: 0.003,
        exitLerp: 0.005,
        exitLerpX: 0.005,
        exitLerpY: 0.005,
        jumpDuration: 1.0,
        jumpHeight: 35,
        jumpExponent: 2.0,
        enableExitLookAt: true
    });

    const [audioConfig, setAudioConfig] = useState<AudioConfig>(saved.audioConfig || {
        kick: { volume: 0.3, muted: false },
        bass: { volume: 1.0, muted: false },
        clap: { volume: 0.5, muted: false },
        hihat: { volume: 0.1, muted: false },
        melody: { volume: 1.0, muted: false },
        synth: { volume: 1.0, muted: false },
        ethereal: { volume: 0.1, muted: false },
        victory: { volume: 0.2, muted: false }
    });

    const PROFILE_2_DEFORMATION: PlayerDeformationConfig = {
        stiffness: 0.15,
        damping: 0.7,
        maxScale: 2.0,
        minScale: 0.1,
        runStretchAmount: 0.2,
        fallStretchAmount: 1.05,
        spinFallStretchAmount: 0.1,
        maxFallStretch: 1.0,
        shapeMorphSpeed: 0.53,
        rotationSnapSpeed: 0.2,
        rotationSnapIntervalDeg: 90,
        rotationSnapCondition: 0,
        rotationGroundLerp: 0.2,
        jumpSquashX: 0.8,
        jumpSquashY: 2.0,
        wallJumpSquashX: 0.6,
        wallJumpSquashY: 1.3,
        landSquashX: 0.02,
        landSquashY: 0.04,
        doubleJumpVelY: 0.3,
        doubleJumpVelXZ: -0.15
    };

    const [deformationProfiles, setDeformationProfiles] = useState<Record<string, PlayerDeformationConfig>>(saved.deformationProfiles || {
        'Profile 1': { ...PlayerVisuals.DEFAULT_DEFORMATION },
        'Profile 2': { ...PROFILE_2_DEFORMATION }
    });

    const [activeDeformationProfile, setActiveDeformationProfileState] = useState<string>(saved.activeDeformationProfile || 'Profile 2');
    const [deformationConfig, setDeformationConfig] = useState<PlayerDeformationConfig>(saved.deformationConfig || { ...PROFILE_2_DEFORMATION });

    const [bpm, setBpm] = useState(128);

    useEffect(() => {
        if (isResettingRef.current) return;

        const configToSave = {
            physicsConfig,
            gridConfig,
            visualConfig,
            rainbowConfig,
            postProcessConfig,
            lightConfig,
            enemyConfig,
            vanishingConfig,
            cameraConfig,
            playerVisuals,
            tunnelConfig,
            exitConfig,
            audioConfig,
            deformationConfig,
            physicsProfiles,
            deformationProfiles,
            activeProfile,
            activeDeformationProfile,
            drawConfig,
            pathfindingConfig
        };
        StorageManager.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
    }, [
        physicsConfig, gridConfig, visualConfig, rainbowConfig,
        postProcessConfig, lightConfig, enemyConfig, vanishingConfig, cameraConfig,
        playerVisuals, tunnelConfig, exitConfig, audioConfig, deformationConfig,
        deformationProfiles, activeDeformationProfile, drawConfig, pathfindingConfig, bpm, timeScale
    ]);

    const updatePhysics = useCallback((key: keyof PhysicsConfig, value: number | boolean) => {
        setPhysicsConfig(prev => {
            const newVal = { ...prev, [key]: value };
            setPhysicsProfiles(currentProfiles => ({
                ...currentProfiles,
                [activeProfile]: newVal
            }));
            return newVal;
        });
    }, [activeProfile]);

    const setActiveProfile = useCallback((name: string) => {
        if (physicsProfiles[name]) {
            setActiveProfileState(name);
            setPhysicsConfig({ ...physicsProfiles[name] });
        }
    }, [physicsProfiles]);

    const createProfile = useCallback(() => {
        const name = `Custom ${Object.keys(physicsProfiles).length + 1}`;
        setPhysicsProfiles(prev => ({
            ...prev,
            [name]: { ...physicsConfig }
        }));
        setActiveProfileState(name);
    }, [physicsConfig, physicsProfiles]);

    const updateGrid = useCallback((key: keyof GridConfig, value: any) => {
        setGridConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateRainbow = useCallback((key: keyof RainbowConfig, value: number) => {
        setRainbowConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateVisual = useCallback((category: keyof ThemeConfig, keyOrValue: string | number | null, value?: any) => {
        setVisualConfig(prev => {
            if (typeof prev[category] === 'object' && keyOrValue !== null && typeof keyOrValue === 'string') {
                return {
                    ...prev,
                    [category]: {
                        ...(prev[category] as any),
                        [keyOrValue]: value
                    }
                };
            } else {
                return { ...prev, [category]: keyOrValue };
            }
        });
    }, []);



    const updatePostProcess = useCallback((key: keyof PostProcessConfig, value: number) => {
        setPostProcessConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateLight = useCallback((key: keyof LightConfig, value: any) => {
        setLightConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateEnemy = useCallback((key: keyof EnemyConfig, value: any) => {
        setEnemyConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateVanishing = useCallback((key: keyof VanishingConfig, value: number) => {
        setVanishingConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateCamera = useCallback((key: keyof typeof cameraConfig, value: number) => {
        setCameraConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updatePlayer = useCallback((key: keyof typeof playerVisuals, value: any) => {
        setPlayerVisuals(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateTunnel = useCallback(() => { }, []);

    const updateExit = useCallback((key: string, value: any) => {
        setExitConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updateAudio = useCallback((instrument: keyof AudioConfig, key: keyof AudioLayerConfig, value: number | boolean) => {
        setAudioConfig(prev => ({
            ...prev,
            [instrument]: {
                ...prev[instrument],
                [key]: value
            }
        }));
    }, []);

    const updateDeformation = useCallback((key: keyof PlayerDeformationConfig, value: number) => {
        setDeformationConfig(prev => {
            const newVal = { ...prev, [key]: value };
            setDeformationProfiles(currentProfiles => ({
                ...currentProfiles,
                [activeDeformationProfile]: newVal
            }));
            return newVal;
        });
    }, [activeDeformationProfile]);

    const setActiveDeformationProfile = useCallback((name: string) => {
        if (deformationProfiles[name]) {
            setActiveDeformationProfileState(name);
            setDeformationConfig({ ...deformationProfiles[name] });
        }
    }, [deformationProfiles]);

    const createDeformationProfile = useCallback(() => {
        const name = `Profile ${Object.keys(deformationProfiles).length + 1}`;
        setDeformationProfiles(prev => ({
            ...prev,
            [name]: { ...deformationConfig }
        }));
        setActiveDeformationProfileState(name);
    }, [deformationConfig, deformationProfiles]);

    const updateDrawConfig = useCallback((key: keyof DrawConfig, value: boolean) => {
        setDrawConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const updatePathfinding = useCallback((key: keyof PathfindingConfig, value: number) => {
        setPathfindingConfig(prev => ({ ...prev, [key]: value }));
    }, []);

    const resetConfig = useCallback(() => {
        isResettingRef.current = true;
        StorageManager.removeItem(CONFIG_STORAGE_KEY);
        window.location.reload();
    }, []);

    return {
        isDevMode, setIsDevMode,
        showDevUI, setShowDevUI,
        activeDebugSection, setActiveDebugSection,
        physicsProfiles, activeProfile, setActiveProfile, createProfile,
        physicsConfig, updatePhysics,
        gridConfig, updateGrid,
        rainbowConfig, updateRainbow,
        visualConfig, updateVisual,

        postProcessConfig, updatePostProcess,
        lightConfig, updateLight,
        enemyConfig, updateEnemy,
        vanishingConfig, updateVanishing,
        cameraConfig, updateCamera,
        playerVisuals, updatePlayer,
        tunnelConfig, updateTunnel,
        exitConfig, updateExit,
        audioConfig, updateAudio,
        deformationConfig, updateDeformation,
        deformationProfiles, activeDeformationProfile, setActiveDeformationProfile, createDeformationProfile,
        drawConfig, updateDrawConfig,
        pathfindingConfig, updatePathfinding,
        bpm, setBpm,
        timeScale, setTimeScale,
        resetConfig
    };
};