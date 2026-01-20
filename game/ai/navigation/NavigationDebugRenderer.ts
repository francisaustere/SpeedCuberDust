import * as THREE from 'three';
import { SurfaceSystem } from './SurfaceSystem';
import { PathNavigator } from '../../enemies/movement/PathNavigator';
import { Surface, Edge, Point } from '../../../types';
import { PhysicsSimulator } from './generation/PhysicsSimulator';

/**
 * NavigationDebugRenderer
 * 
 * Système de visualisation debug SÉPARÉ pour le pathfinding.
 * Responsabilité unique : Lire PathNavigator/SurfaceSystem et dessiner.
 * 
 * Pattern : Pure Renderer (pas de logique métier)
 * Lifecycle : init() -> render() -> destroy()
 */
export class NavigationDebugRenderer {
    private debugGroup: THREE.Group;
    private scene: THREE.Scene;

    // Lecture seule des données sources
    private pathNavigator: PathNavigator | null = null;
    private surfaceSystem: SurfaceSystem | null = null;

    // Config
    private enabled: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.debugGroup = new THREE.Group();
        this.debugGroup.name = 'NavigationDebug';
        this.scene.add(this.debugGroup);
    }

    /**
     * Attache les sources de données à surveiller
     */
    public setDataSources(pathNavigator: PathNavigator, surfaceSystem: SurfaceSystem) {
        this.pathNavigator = pathNavigator;
        this.surfaceSystem = surfaceSystem;
    }

    public hasDataSource(): boolean {
        return this.pathNavigator !== null && this.surfaceSystem !== null;
    }

    /**
     * Active/désactive le debug
     */
    public setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (!enabled) {
            this.clear();
        }
    }

    /**
     * Méthode principale à appeler dans la boucle de rendu
     */
    public render() {
        if (!this.enabled || !this.pathNavigator || !this.surfaceSystem) {
            return;
        }

        this.clear();
        this.drawGraph();
        this.drawPath();
    }

    /**
     * Dessine le graphe de navigation complet (surfaces + edges)
     * 
     * 🔧 CORRECTION DU BUG FALL : Calcule la position d'atterrissage réelle
     * en simulant la trajectoire de chute au lieu d'utiliser targetSurf.midPoint.x
     */
    private drawGraph() {
        if (!this.surfaceSystem) return;

        this.surfaceSystem.surfaces.forEach(source => {
            source.neighbors.forEach(edge => {
                const color = this.getEdgeColor(edge.type);
                const material = new THREE.LineBasicMaterial({ color: color });
                const points: THREE.Vector3[] = [];

                // Point de départ
                const startX = edge.startX ?? source.midPoint.x;
                points.push(new THREE.Vector3(startX, -source.y, 5));

                const targetSurf = this.surfaceSystem!.surfaces.find(ts => ts.id === edge.targetSurfaceId);
                if (!targetSurf) return;

                // Gestion spécifique par type d'edge
                if (edge.type === 'JUMP' || edge.type === 'DOUBLE_JUMP') {
                    this.addJumpArc(points, startX, source.y, targetSurf, edge);
                } else if (edge.type === 'WALL_CLIMB') {
                    this.addWallClimbPath(points, edge, source.y, targetSurf);
                } else if (edge.type === 'FALL') {
                    // 🔧 CORRECTION : Calcule la position d'atterrissage réelle
                    this.addFallTrajectory(points, startX, source.y, edge, targetSurf);
                } else {
                    // WALK, RIDE : ligne droite
                    points.push(new THREE.Vector3(targetSurf.midPoint.x, -targetSurf.y, 5));
                }

                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material);
                this.debugGroup.add(line);
            });
        });
    }

    /**
     * 🆕 CORRECTION DU BUG FALL
     * 
     * Calcule la position d'atterrissage réelle en simulant la physique de chute.
     * Au lieu d'utiliser targetSurf.midPoint.x, on simule :
     * - Vitesse initiale horizontale (dropSpeed)
     * - Gravité
     * - Temps de chute estimé
     */
    private addFallTrajectory(
        points: THREE.Vector3[],
        startX: number,
        startY: number,
        edge: Edge,
        targetSurf: Surface
    ) {
        // Paramètres de chute (cohérents avec FallGenerator)
        const dropSpeed = edge.velocity?.x ?? 3.0; // Vitesse horizontale de marche en chute
        const gravity = 0.8; // Valeur par défaut (devrait venir de config)

        const heightDiff = targetSurf.y - startY;

        // Temps de chute estimé (en secondes, puis converti en frames @60fps)
        const fallTimeSeconds = Math.sqrt(2 * heightDiff / gravity);
        const fallTimeFrames = fallTimeSeconds * 60;

        // Distance horizontale parcourue pendant la chute
        const horizontalDistance = (dropSpeed * fallTimeFrames) / 60;

        // Position d'atterrissage réelle
        const landingX = startX + (Math.sign(dropSpeed) * horizontalDistance);

        // Ajout d'une courbe parabolique simple (3 points pour l'arc)
        const midY = (startY + targetSurf.y) / 2;
        const midX = (startX + landingX) / 2;

        points.push(new THREE.Vector3(midX, -midY, 5));
        points.push(new THREE.Vector3(landingX, -targetSurf.y, 5));

        //console.log(`[NavigationDebugRenderer] FALL trajectory: start=${startX.toFixed(0)}, landing=${landingX.toFixed(0)}, distance=${horizontalDistance.toFixed(0)}`);
    }

    /**
     * Ajoute un arc de saut (parabole simplifiée)
     */
    private addJumpArc(
        points: THREE.Vector3[],
        startX: number,
        startY: number,
        targetSurf: Surface,
        edge: Edge
    ) {
        const targetX = edge.destX ?? targetSurf.midPoint.x;
        const midX = (startX + targetX) / 2;
        const midY = Math.min(-startY, -targetSurf.y) + 50; // Arc au-dessus

        points.push(new THREE.Vector3(midX, midY, 5));
        points.push(new THREE.Vector3(targetX, -targetSurf.y, 5));
    }

    /**
     * Ajoute un chemin d'escalade en zigzag
     */
    private addWallClimbPath(
        points: THREE.Vector3[],
        edge: Edge,
        startY: number,
        targetSurf: Surface
    ) {
        if (!edge.climbWallX) return;

        const steps = 3;
        const dy = (startY - targetSurf.y) / steps;
        let cy = startY;

        for (let i = 0; i < steps; i++) {
            cy -= dy;
            points.push(new THREE.Vector3(edge.climbWallX, -cy, 5));
            points.push(new THREE.Vector3(
                edge.climbWallX + (edge.wallNormalX || 0) * 30,
                -cy + dy / 2,
                5
            ));
        }

        points.push(new THREE.Vector3(targetSurf.midPoint.x, -targetSurf.y, 5));
    }

    /**
     * Dessine le chemin actif de l'IA (path actuellement suivi)
     */
    private drawPath() {
        if (!this.pathNavigator || this.pathNavigator.path.length === 0) return;

        const points: THREE.Vector3[] = [];
        const material = new THREE.LineBasicMaterial({
            color: 0xFFFFFF,
            linewidth: 3,
            opacity: 0.9,
            transparent: true
        });

        this.pathNavigator.path.forEach((p: Point) => {
            points.push(new THREE.Vector3(p.x, -p.y, 10)); // z=10 pour être au-dessus du graphe
        });

        if (points.length < 2) return;

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        line.name = 'ActivePath';
        this.debugGroup.add(line);

        // Ajoute des sphères aux waypoints pour meilleure visibilité
        points.forEach((point, index) => {
            const sphereGeometry = new THREE.SphereGeometry(5, 8, 8);
            const sphereMaterial = new THREE.MeshBasicMaterial({
                color: index === 0 ? 0x00FF00 : 0xFFFFFF // Vert pour le premier waypoint
            });
            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
            sphere.position.copy(point);
            this.debugGroup.add(sphere);
        });
    }

    /**
     * Retourne la couleur selon le type d'edge
     */
    private getEdgeColor(type: Edge['type']): number {
        switch (type) {
            case 'WALK': return 0x00FF00;        // Vert
            case 'JUMP': return 0xFFFF00;        // Jaune
            case 'DOUBLE_JUMP': return 0xFFA500; // Orange
            case 'WALL_CLIMB': return 0xFF4500;  // Rouge-orange
            case 'FALL': return 0x39fc03;        // Rouge
            case 'RIDE': return 0x00FFFF;        // Cyan
            default: return 0xFFFFFF;            // Blanc
        }
    }

    /**
     * Nettoie tous les objets de debug
     */
    public clear() {
        // Dispose des géométries et matériaux pour éviter les fuites GPU
        this.debugGroup.children.forEach(child => {
            if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });

        this.debugGroup.clear();
    }

    /**
     * Nettoyage final (destruction du renderer)
     */
    public destroy() {
        this.clear();
        this.scene.remove(this.debugGroup);
        this.pathNavigator = null;
        this.surfaceSystem = null;
    }
}