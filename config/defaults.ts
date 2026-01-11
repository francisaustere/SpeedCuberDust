
import { SCENE_Config } from './constants';

export const VISUAL_CONSTANTS = {
  PLAYER_BORDER_THICKNESS: 4.0,
  PLATFORM_OVERLAP: 0.5,
  BOUNDS_PADDING: 400,
  HULL_PADDING: 2.0,
  HULL_SCALE_Z: SCENE_Config.PLAYER_DEPTH,
  THICKNESS: 4.0
};

export const DEFAULT_CAMERA_SETTINGS = {
  DESKTOP: {
    Z: 740,
    FOV: 70,
    OFFSET_X: 0,
    OFFSET_Y: 50,
    ROT_X: 0
  },
  MOBILE_PORTRAIT: {
    Z: 2000, 
    FOV: 50,
    OFFSET_X: -40,
    // Negative offset moves camera down, pushing player UP visually (away from bottom controls)
    OFFSET_Y: -150, 
    ROT_X: 0
  },
  MOBILE_LANDSCAPE: {
    Z: 900, 
    FOV: 50,
    OFFSET_X: 0,
    OFFSET_Y: 0, 
    ROT_X: 0
  },
  TABLET_LANDSCAPE: {
    Z: 570,
    FOV: 50,
    OFFSET_X: 0,
    OFFSET_Y: -80,
    ROT_X: 0
  }
};
