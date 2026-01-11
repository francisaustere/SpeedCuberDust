
export interface Point {
    x: number;
    y: number;
}

export interface Rect extends Point {
    w: number;
    h: number;
}

// Bitmasking Layers
export enum CollisionLayer {
    NONE = 0,
    PLAYER = 1 << 0,             // 1
    SOLID = 1 << 1,              // 2 (Walls, Floors, Cubes)
    ENEMY = 1 << 2,              // 4 (Walkers, Drones, Shooters)
    PLAYER_PROJECTILE = 1 << 3,  // 8
    ENEMY_PROJECTILE = 1 << 4,   // 16
    GOAL = 1 << 6                // 64
}

// A shared interface for anything that moves and hits walls
export interface PhysicsEntity extends Rect {
    vx: number;
    vy: number;
    isGrounded: boolean;
    onWall: boolean;
    wallDir: number;
    wallNormal: { x: number, y: number }; // Added wallNormal
    layer: CollisionLayer;
    mask: number; // Sum of layers to collide with
}

export interface Player extends PhysicsEntity {
    z: number; // For 3D depth positioning

    // Health System
    health: number;
    maxHealth: number;
    ammo: number; // NEW: Ammo count
    invulnerabilityTimer: number; // Frames

    // History for Physics
    prevX: number;
    prevY: number;

    isWallSliding: boolean;

    jumpCount: number;
    maxJumps: number;
    isJumping: boolean; // New: Tracks if current upward momentum is from a voluntary jump

    facingRight: boolean;

    // Wall Interaction
    // wallNormal is now inherited from PhysicsEntity

    // Timers (Frames)
    coyoteTimer: number;
    wallCoyoteTimer: number;
    jumpBufferTimer: number;
    crouchLockoutTimer: number; // NEW: Prevents re-crouching immediately after being forced up

    isDead: boolean;

    // Platform Reference
    platformId: number | null; // ID of the platform currently standing on
    ceilingContactId: number | null; // ID of the platform currently touched by head

    // Jump Config Flags
    wallJumpGraceTimer: number; // If > 0, variable jump height is disabled (fixed arc)

    // Wall Jump Context
    wallJumpNormalX: number; // Snapshot of normal when wall jump started
    lastWallNormalX: number; // For Coyote Wall Jump direction

    // Refill Logic
    wallJumpRefillLocked?: boolean; // Prevents infinite climbing

    // --- VISUAL DEFORMATION STATE ---
    scale: { x: number, y: number, z: number };
    targetScale: { x: number, y: number, z: number }; // Smoothed target for morphing
    scaleVel: { x: number, y: number, z: number };
    scaleAnchor: number; // 1 = Top, -1 = Bottom, 0 = Center
    prevVy: number; // To calculate landing impact

    // --- VISUAL ROTATION STATE ---
    visualRotation: number;
    angularVelocity: number;
    spinDir: number; // -1 (Clockwise), 1 (Counter), 0 (None). Tracks intended spin direction.
    spinDelayTimer: number; // Time before spin starts (in seconds)

    // NEW: Track how long the spin effect has been active in the air (for decay)
    spinEffectTime: number;

    // Events
    landingShake?: boolean; // Trigger for camera shake on landing
    isDiving: boolean; // True when player is holding down in air
    isCrouching: boolean; // True when holding down on ground
    isRiding?: boolean; // Track if player is riding a drone
    isHanging: boolean; // Track if player is hanging from ceiling
    justHitCeiling?: boolean; // Trigger for ceiling impact squash
    justBounced?: boolean; // Trigger for bouncy block impact
    forceStand?: boolean; // Trigger to force player out of crouch

    // Sound Events
    justJumped?: boolean;
    justDoubleJumped?: boolean;
    justLandedDive?: boolean;
}

export interface ShooterConfig {
    type: 'simple' | 'aim';
    fireRate: number;
    bulletSpeed: number;
    bulletSize: number;
    burstEnabled: boolean;
    burstCount: number;
    burstInterval: number;
    burstDelay: number;
}

export interface Platform extends Rect {
    id: number;
    type?: 'platform' | 'wall' | 'checkpoint' | 'floor' | 'cube' | 'moving' | 'vanishing' | 'bouncy';
    rotation?: number; // Radians

    // Runtime layer - changed to optional to support static LevelData initialization
    layer?: CollisionLayer;

    pivot?: Point; // Rotation Pivot Offset (Local)

    moving?: {
        start: Point;
        end: Point;
        duration: number;
    };

    // Runtime State for Moving Platforms
    currentVx?: number;
    currentVy?: number;
    /* Added velocityX and velocityY to store absolute speeds for movement tolerance and AI prediction */
    velocityX?: number;
    velocityY?: number;
    movingTimer?: number; // NEW: Tracks exact cycle time for deterministic AI prediction

    // Optional shooter for static platforms
    shooter?: ShooterConfig;

    // Vanishing Platform Runtime & Config
    isVanishing?: boolean;
    isVanished?: boolean;
    vanishTimer?: number;
    restoreTimer?: number;

    // Support for text platforms
    text?: string;
}

export interface EnemyData extends Rect {
    id: number;
    type: 'walker' | 'drone' | 'new_walker' | 'jumper';
    range?: number;
    rotation?: number; // Visual Rotation
    shooter?: ShooterConfig; // Enabled shooting for enemies
}

export interface GhostFrame {
    x: number;
    y: number;
}

export interface GhostData {
    id: string;
    levelId: string;
    frames: GhostFrame[];
    totalTime: number;
    completed: boolean;
    timestamp: number;
}

export interface RenderGhost extends Rect {
    isBest: boolean;
}

export interface Level {
    id: number;
    type: 'DEV' | 'PROD';
    region?: string;
    name: string;
    width: number;
    height: number;
    start: Point;
    goal: Rect;
    platforms: Platform[];
    enemies?: EnemyData[];
    targetTime?: number;
}

export interface Camera extends Rect {
    z: number;
    prevX?: number; // Added for Interpolation
    prevY?: number; // Added for Interpolation
}

export interface InputState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jumpPressed: boolean;
    jumpHeld: boolean;
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

export enum ProjectileType {
    LINEAR = 0,
    LOBBED = 1,
    HOMING = 2
}

export enum AimMode {
    FIXED = 0,
    PLAYER = 1,
    AXIS_ALIGNED = 2
}

export type GameStatus = 'INTRO' | 'PLAYING' | 'LEVEL_SELECTION' | 'LEVEL_COMPLETE' | 'LEVEL_TRANSITION';

// ✅ Définit les types spécifiques à SurfaceSystem
export interface Surface {
    id: number;
    y: number;
    left: number;
    right: number;
    width: number;
    midPoint: Point;  // ← Point vient de l'import
    neighbors: Edge[];
    originalPlatformId?: number;
    isMovingStation?: 'START' | 'END';
}

export interface Edge {
    targetSurfaceId: number;
    type: 'WALK' | 'JUMP' | 'DOUBLE_JUMP' | 'WALL_CLIMB' | 'FALL' | 'RIDE';
    velocity?: { x: number; y: number };
    secondVelocity?: { x: number; y: number };
    delay?: number;
    startX?: number;
    destX?: number;
    ridePlatformId?: number;
    secondJumpDelay?: number;
    wallPoint?: { x: number; y: number };
    climbWallX?: number;
    wallNormalX?: number;
    jumpType?: 'SINGLE_JUMP' | 'DOUBLE_JUMP' | 'IMPOSSIBLE';  // ✅ AJOUTE CETTE LIGNE SI ELLE N'EST PAS LÀ
    wallEntryY?: number;
    rideDuration?: number;
    meta?: {
        wallClimbAccess?: boolean;
        side?: 'left' | 'right';
        grabY?: number;
        climbHeight?: number;
        [key: string]: any;
    };
}

export interface PhysicsConfig {
    gravity: number;
    jumpForce: number;
    maxSpeed: number;
    charW: number;
    charH: number;
}
