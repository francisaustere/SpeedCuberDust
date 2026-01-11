
import { Component } from '../../engine/core/Component';
import { GameObject } from '../../engine/core/GameObject';
import { Platform, EnemyData } from '../../types';

// Pure Data Configuration
export interface EnemyConfig {
    simpleFireRate: number;
    simpleSpeed: number;
    simpleSize: number;
    simpleBurstEnabled: boolean;
    simpleBurstCount: number;
    simpleBurstInterval: number;
    simpleBurstDelay: number;

    aimFireRate: number;
    aimSpeed: number;
    aimSize: number;
    aimFirstShotDelay: number;
    aimBackInSightDelay: number;
    aimRestrictY?: boolean;

    // Drone Config
    droneChaseMode?: number;
    dronePatrolSpeed: number;
    droneChaseSpeed: number;
    droneViewDist: number;
    droneViewAngle: number;
    droneChaseViewDist: number;
    droneChaseViewAngle: number;
    droneAccel: number;
    droneDrag: number;
    droneLostThreshold: number;
    droneWaypointThreshold: number;
    droneSurpriseTime: number;
    droneScanDuration: number;
    droneScanRadius: number;

    droneImpactExplodeSpeed: number;
    droneDeathDuration: number;
    droneCollisionPush: number;

    droneCheatLKPDistance: number;

    droneRideInstabilityTime?: number;
    droneRideInputForce?: number;
    droneRideNoiseLevel?: number;

    // Walker Config
    walkerSpeed: number;
    walkerChaseSpeed: number;
    walkerViewDist: number;
    walkerViewHeight: number;
    walkerImpactThreshold: number;
    walkerCollisionPush: number;
    walkerLaunchForce: number;
    walkerLaunchY: number;

    walkerFireRate: number;
    walkerBulletSpeed: number;
    walkerBulletSize: number;
    walkerFirstShotDelay: number;
    walkerBackInSightDelay: number;
    walkerSurpriseTime: number;
    walkerTelegraphTime: number;
    walkerUsePathfinding: boolean;
    walkerPredictiveLead: number;
    walkerHearingRadius: number;
    walkerSocialRange: number;

    // Jumper Config
    jumperMaxSpeed: number;
    jumperJumpForce: number;
    jumperGravity: number;
    
    // Jump Prediction Tuning
    jumperPredictionDrag: number;
    jumperPredictionBuffer: number;

    jumperWallClimbKickOffX: number;
    jumperWallClimbKickOffY: number;
    jumperWallClimbAirAccel: number;
    jumperWallClimbReengageY: number;
}

export class EnemyConfiguration extends Component {

    // Keeping DEFAULTS for initialization reference in Factories/DebugUI
    static readonly DEFAULTS: EnemyConfig = {
        simpleFireRate: 3,
        simpleSpeed: 20,
        simpleSize: 15,
        simpleBurstEnabled: false,
        simpleBurstCount: 3,
        simpleBurstInterval: 0.1,
        simpleBurstDelay: 2,

        aimFireRate: 0.2,
        aimSpeed: 8.5,
        aimSize: 10,
        aimFirstShotDelay: 0.2,
        aimBackInSightDelay: 0.4,
        aimRestrictY: false,

        // Drone
        droneChaseMode: 1,
        dronePatrolSpeed: 53,
        droneChaseSpeed: 199,
        droneViewDist: 3,
        droneViewAngle: 60,
        droneChaseViewDist: 6,
        droneChaseViewAngle: 60,
        droneAccel: 1.0,
        droneDrag: 0.9,
        droneLostThreshold: 4,
        droneWaypointThreshold: 40,
        droneSurpriseTime: 0.8,
        droneScanDuration: 2.5,
        droneScanRadius: 300,

        droneImpactExplodeSpeed: 6,
        droneDeathDuration: 3.0,
        droneCollisionPush: 5.0,

        droneCheatLKPDistance: 200,

        droneRideInstabilityTime: 3.5,
        droneRideInputForce: 200,
        droneRideNoiseLevel: 300,

        // Walker
        walkerSpeed: 2.6,
        walkerChaseSpeed: 7.5,
        walkerViewDist: 350,
        walkerViewHeight: 100,
        walkerImpactThreshold: 5,
        walkerCollisionPush: 20.0,
        walkerLaunchForce: 20.0,
        walkerLaunchY: 10.0,

        walkerFireRate: 1.5,
        walkerBulletSpeed: 6.0,
        walkerBulletSize: 10,
        walkerFirstShotDelay: 0.5,
        walkerBackInSightDelay: 0.5,
        walkerSurpriseTime: 0.5,
        walkerTelegraphTime: 0.5,
        walkerUsePathfinding: true,
        walkerPredictiveLead: 1.0,
        walkerHearingRadius: 100,
        walkerSocialRange: 400,

        // Jumper
        jumperMaxSpeed: 3.5,
        jumperJumpForce: -14.0,
        jumperGravity: 0.8,
        
        // Tuned for active velocity control
        jumperPredictionDrag: 0, // Disabled by default
        jumperPredictionBuffer: 0, // Disabled by default
        
        jumperWallClimbKickOffX: 6.0,
        jumperWallClimbKickOffY: -14.0,
        jumperWallClimbAirAccel: 0.2,
        jumperWallClimbReengageY: -11.5
    };

    public config: EnemyConfig;
    public data: Platform | EnemyData;

    constructor(gameObject: GameObject, data: Platform | EnemyData, config: EnemyConfig) {
        super(gameObject);
        this.data = data;
        this.config = config;
    }

    public update(dt: number, input?: any, config?: any): void {
        // Sync Live Config from Debug UI if available
        if (config && config.enemyConfig) {
            this.config = config.enemyConfig;
        }
    }
}
