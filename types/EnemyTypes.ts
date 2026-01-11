import { Point, Rect, Platform } from './index';
import { GameWorld } from '../engine/core/GameWorld';

export interface IMovement {
    update(dt: number): void;

    // Commands
    moveTo(x: number, y: number): void;
    stop(): void;
    lookAt(x: number, y: number): void;

    // Status
    isMoving: boolean;
    velocity: Point;
    position: Point;
    isGrounded: boolean;

    // Navigation
    getRoamTarget(): Point;
}

export interface ISensors {
    update(dt: number): void;

    // Queries
    canSeePlayer(): boolean;
    getPlayerPosition(): Point | null;
    getLastKnownPlayerPosition(): Point | null;

    // Config
    viewRange: number;
    viewAngle: number;
}

export interface ICombat {
    update(dt: number): void;

    // Commands
    attack(targetX: number, targetY: number): void;
    cancelAttack(): void;

    // Status
    isAttacking: boolean;
    onCooldown: boolean;
    range: number;
}

export interface IEnemyController {
    // Identity
    id: number;
    world: GameWorld;
    platforms: Platform[];

    // Components
    movement: IMovement;
    sensors: ISensors;
    combat: ICombat;

    notifySignal(pos: Point, type: string): void;
    // State
    health: number;
    maxHealth: number;
    isDead: boolean;

    // Methods
    takeDamage(amount: number): void;
}
