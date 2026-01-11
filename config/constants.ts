
export const PHYSICS = {
  GRAVITY: 0.8,
  JUMP_FORCE: -15,
  DOUBLE_JUMP_FORCE: -13,

  // Speed & Accel
  MAX_SPEED: 10,
  ACCEL_GROUND: 6.8,
  ACCEL_AIR: 0.85,

  ACCEL_GROUND_EXPONENT: 0.2,

  FRICTION: 0.65,
  AIR_FRICTION: 0.94,
  MAX_FALL_VELOCITY: 25,

  // Wall Interaction
  WALL_SLIDE_SPEED: 1.5,
  WALL_JUMP_X: 7,
  WALL_JUMP_Y: -12,
  WALL_JUMP_INPUT_INFLUENCE: false,
  WALL_JUMP_GRACE_PERIOD: 12,

  // Timers (frames)
  COYOTE_TIME: 8,
  JUMP_BUFFER: 5,

  // Rotation
  SPIN_ACCELERATION_ENABLED: true,
  SPIN_ACCELERATION_RATE: 0.025,
  SPIN_DECELERATION_RATE: 0.023,
  SPIN_MAX_SPEED: 0.4,
  SPIN_START_DELAY: 0.1,

  // Diving (Fast Fall)
  DIVING_FORCE: 1,

  BOUNCY_BLOCK_RESTITUTION_X: 1.0,
  BOUNCY_BLOCK_RESTITUTION_Y: 1.3,
  BOUNCY_MIN_SPEED: 20.0,
  PROJECTILE_DEFLECTION_FORCE: 1.8
};

export const WEAPON_CONFIG = {
  CHARGE_TIME: 0.8, // Seconds to full power
  MAX_POWER: 25,
  MIN_POWER: 8,
  PROJECTILE_GRAVITY: 0.45,
  TRAJECTORY_POINTS: 30,
  TRAJECTORY_STEP: 2, // Frames per point
  MAX_AMMO: 5,
  STARTING_AMMO: 0
};

export const COLORS = {
  bg: '#000000',
  player: '#000000',
  platform: '#444444',
  platformBorder: '#00FFFF',
  goal: '#00FF00',
  uiText: '#FFFFFF',
  uiAccent: '#00FFFF',
};

export const GAME_Config = {
  FPS: 60,
  TIMESTEP: 1000 / 60,
  PLAYER_SIZE: 40,
  DEFAULT_MOVING_DURATION: 2.0
};

// 3D Specific Constants
export const SCENE_Config = {
  PLAYER_DEPTH: 40,
  PLATFORM_DEPTH: 90,
  WALL_DEPTH: 89,
  CUBE_DEPTH: 87,
  GOAL_DEPTH: 30,
};

// Safe access to environment variables
const meta = import.meta as any;
const env = meta.env;
const isDev = !env || env.DEV;

export const EDITOR_CONFIG = {
  ENABLED: isDev,
  SNAP_TO_GRID: true,
  GRID_SIZE: 10,
  HANDLE_SIZE: 12,
  MIN_PLATFORM_SIZE: 20
} as const;
