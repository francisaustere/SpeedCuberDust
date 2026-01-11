
import { FEATURES } from '../config/features';
import { GAME_Config, SCENE_Config } from '../config/constants';
import * as DebugConfigModule from './DebugConfig';
import * as DebugUIModule from './DebugUI';
import * as DebugControlsModule from './DebugControls';

// Import Defaults
import { DEFAULT_THEME } from '../config/theme';
import { DEFAULT_PHYSICS_CONFIG } from '../config/physics';
import { DEFAULT_GRID, DEFAULT_RAINBOW, DEFAULT_POST_PROCESS, DEFAULT_LIGHT } from '../engine/rendering/EnvironmentSettings';
import { EnemyConfiguration } from '../game/components/EnemyConfiguration';

import { VanishingPlatform } from '../game/components/VanishingPlatform';
import { PlayerVisuals } from '../game/components/PlayerVisuals';
import { DEFAULT_CAMERA_SETTINGS } from '../config/defaults';

export type { GridConfig, LightConfig, EnemyConfig, VisualConfig, PostProcessConfig, VanishingConfig } from './DebugConfig';
export type { DebugControls as DebugControlsType } from './DebugControls';

const configStub = () => {
  return {
    isDevMode: false,
    setIsDevMode: () => { },
    showDevUI: false,
    setShowDevUI: () => { },
    activeDebugSection: null,
    setActiveDebugSection: () => { },
    physicsProfiles: { 'Default': { ...DEFAULT_PHYSICS_CONFIG } },
    activeProfile: 'Default',
    setActiveProfile: () => { },
    createProfile: () => { },
    physicsConfig: { ...DEFAULT_PHYSICS_CONFIG },
    gridConfig: { ...DEFAULT_GRID },
    rainbowConfig: { ...DEFAULT_RAINBOW },
    visualConfig: { ...DEFAULT_THEME },

    postProcessConfig: { ...DEFAULT_POST_PROCESS },
    lightConfig: { ...DEFAULT_LIGHT },
    exitConfig: {
      runDepth: 700,
      fogStartRadius: 2500,
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
    },
    enemyConfig: {
      ...EnemyConfiguration.DEFAULTS
    },
    vanishingConfig: { ...VanishingPlatform.DEFAULTS },
    cameraConfig: {
      z: 640, fov: 77, offsetX: 0, offsetY: 150, rotX: 0, lerpFactor: 0.1,
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
      tabletOffsetY: DEFAULT_CAMERA_SETTINGS.TABLET_LANDSCAPE.OFFSET_Y
    },
    playerVisuals: {
      rotX: 0,
      size: GAME_Config.PLAYER_SIZE
    },
    tunnelConfig: {
      gridZ: -60,
      depth: 500,
      scale: 1,
      showTunnel: true,
      showEdges: true,
      showMask: true,
      extrusionDepth: 0,
      platformZScale: 1.0
    },
    audioConfig: {
      kick: { volume: 0.3, muted: false },
      bass: { volume: 1.0, muted: false },
      clap: { volume: 0.5, muted: false },
      hihat: { volume: 0.1, muted: false },
      melody: { volume: 1.0, muted: false },
      synth: { volume: 1.0, muted: false },
      ethereal: { volume: 0.1, muted: false },
      victory: { volume: 0.2, muted: false }
    },
    deformationConfig: { ...PlayerVisuals.DEFAULT_DEFORMATION },
    deformationProfiles: { 'Profile 1': { ...PlayerVisuals.DEFAULT_DEFORMATION } },
    activeDeformationProfile: 'Profile 1',
    setActiveDeformationProfile: () => { },
    createDeformationProfile: () => { },
    drawConfig: { showHitboxes: false, showDroneViewCones: false, showWalkerViewCones: false, showWalkerColliders: false, showWalkerHearingRange: false, showWalkerSocialRange: false, showEnemyLogic: false, showPathfindingNodes: false, showPlatformIds: false },
    updateDrawConfig: () => { },
    pathfindingConfig: { defaultCost: 1, blockedCost: 1000, nodeClearance: 35 },
    updatePathfinding: () => { },
    bpm: 128,
    setBpm: () => { },
    timeScale: 0.1, // Sync with actual default
    setTimeScale: () => { },
    updatePhysics: () => { },
    updateGrid: () => { },
    updateRainbow: () => { },
    updateVisual: () => { },

    updatePostProcess: () => { },
    updateLight: () => { },
    updateExit: () => { },
    updateEnemy: () => { },
    updateVanishing: () => { },
    updateCamera: () => { },
    updatePlayer: () => { },
    updateTunnel: () => { },
    updateAudio: () => { },
    updateDeformation: () => { },
    resetConfig: () => { }
  };
};

export const useDebugConfig = FEATURES.DEBUG_MODE
  ? DebugConfigModule.useDebugConfig
  : configStub;

export const DebugUI = FEATURES.SHOW_DEBUG_UI
  ? DebugUIModule.DebugUI
  : () => null;

export const DebugControls = FEATURES.DEV_CONTROLS
  ? DebugControlsModule.DebugControls
  : null;
