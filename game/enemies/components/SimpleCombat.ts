import { ICombat } from '../../../types/EnemyTypes';
import { Shooter } from '../../components/Shooter';

export class SimpleCombat implements ICombat {
    public isAttacking: boolean = false;
    public onCooldown: boolean = false;
    public range: number = 200;

    private shooter: Shooter;

    constructor(shooter: Shooter) {
        this.shooter = shooter;
    }

    public update(dt: number): void {
        // The shooter component manages its own cooldowns in its update loop
        // Here we just sync state if needed
        this.range = 300; // Hardcoded default for now
    }

    public attack(targetX: number, targetY: number): void {
        this.isAttacking = true;
        // The existing Shooter component automatically fires if aimMode is PLAYER
        // If aimMode is FIXED, it fires automatically.
        // If we want manual control, we'd need to modify Shooter to accept a "Fire Now" command
        // or set its target manually.

        // For now, let's assume this enables the shooter
        if (!this.shooter.enabled) {
            this.shooter.reset();
            this.shooter.enabled = true;
        }
    }

    public cancelAttack(): void {
        this.isAttacking = false;
        this.shooter.enabled = false;
    }
}
