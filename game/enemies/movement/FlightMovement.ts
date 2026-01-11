import { IMovement } from '../../../types/EnemyTypes';
import { PhysicsEntity, Platform, Point } from '../../../types';
import { GameObject } from '../../../engine/GameObject';

export class FlightMovement implements IMovement {
    // Interface
    public isMoving: boolean = false;
    public velocity: Point = { x: 0, y: 0 };
    public position: Point = { x: 0, y: 0 };
    public isGrounded: boolean = false;

    // Config
    public acceleration: number = 0.5;
    public drag: number = 0.95;
    public maxSpeed: number = 4.0;

    // Internal
    private gameObject: GameObject;
    private state: PhysicsEntity;
    private platforms: Platform[];

    private target: Point | null = null;

    constructor(gameObject: GameObject, state: PhysicsEntity, platforms: Platform[]) {
        this.gameObject = gameObject;
        this.state = state;
        this.platforms = platforms;
        this.position = { x: state.x, y: state.y };

        // Flight defaults
        state.isGrounded = false;
    }

    public update(dt: number): void {
        // 1. Steering
        if (this.target) {
            const dx = this.target.x - this.state.x;
            const dy = this.target.y - this.state.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                this.stop();
            } else {
                const ax = (dx / dist) * this.acceleration;
                const ay = (dy / dist) * this.acceleration;

                this.state.vx += ax;
                this.state.vy += ay;
                this.isMoving = true;
            }
        } else {
            this.isMoving = false;
        }

        // 2. Physics (Drag)
        this.state.vx *= this.drag;
        this.state.vy *= this.drag;

        // Speed Limit
        const speedSq = this.state.vx * this.state.vx + this.state.vy * this.state.vy;
        if (speedSq > this.maxSpeed * this.maxSpeed) {
            const scale = this.maxSpeed / Math.sqrt(speedSq);
            this.state.vx *= scale;
            this.state.vy *= scale;
        }

        // 3. Integration
        this.state.x += this.state.vx;
        this.state.y += this.state.vy;

        // Sync
        this.velocity.x = this.state.vx;
        this.velocity.y = this.state.vy;
        this.position.x = this.state.x;
        this.position.y = this.state.y;

        // Visual Rotation (Bank into turn)
        const targetRot = -this.state.vx * 0.1;
        this.gameObject.transform.rotation.z += (targetRot - this.gameObject.transform.rotation.z) * 0.1;

        this.gameObject.transform.setPosition(this.state.x + this.state.w / 2, -(this.state.y + this.state.h / 2), 0);
    }

    public moveTo(x: number, y: number): void {
        this.target = { x, y };
    }

    public stop(): void {
        this.target = null;
        // Keep momentum, let drag slow us down
    }

    public lookAt(x: number, y: number): void {
        // Drones usually look with their movement, or we can rotate the mesh independent of physics
    }

    public getRoamTarget(): Point {
        // For drones, pick a random point near current position but within bounds
        // Ideally we'd have level bounds. For now, random offset.
        const range = 200;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * range;
        return {
            x: this.state.x + Math.cos(angle) * dist,
            y: this.state.y + Math.sin(angle) * dist
        };
    }
}
