
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

import { Level, Camera, Player, Platform, RenderGhost } from '../../types';
import { GameWorld } from '../../engine/core/GameWorld';
import { GRID_VERTEX_SHADER, GRID_FRAGMENT_SHADER } from './shaders/gridShader';
import { CRT_VERTEX_SHADER, CRT_FRAGMENT_SHADER } from './shaders/crtShader';
import { PORTAL_VERTEX_SHADER, PORTAL_FRAGMENT_SHADER } from './shaders/portalShader';

import { SCENE_Config } from '../../config/constants';
import { GridConfig, PostProcessConfig, LightConfig } from './EnvironmentSettings';
import { ThemeConfig as VisualConfig } from '../../config/theme';

import { VanishingConfig } from '../../game/components/VanishingPlatform';

export class Renderer {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public orthoCamera: THREE.OrthographicCamera; // Editor Camera
    public renderer: THREE.WebGLRenderer;
    public composer: EffectComposer;

    // Internal Camera Object for Logic System to read/write
    public cameraInfo: Camera = { x: 0, y: 0, w: 800, h: 600, z: 940 };

    // Meshes
    public gridMesh: THREE.Mesh;
    public goalMesh: THREE.Mesh;
    private ghostMesh: THREE.InstancedMesh;

    // Groups for Level Geometry
    private levelGroup: THREE.Group;

    // Shaders / Materials
    private gridMaterial: THREE.ShaderMaterial;
    private portalMaterial: THREE.ShaderMaterial;
    private bloomPass: UnrealBloomPass;
    private crtPass: ShaderPass;
    private renderPass: RenderPass;

    // Persistent Materials
    public materials: {
        platform: THREE.MeshStandardMaterial;
        wall: THREE.MeshStandardMaterial;
        floor: THREE.MeshStandardMaterial;
        cube: THREE.MeshStandardMaterial;
        moving: THREE.MeshStandardMaterial;

        bouncy: THREE.MeshStandardMaterial;
        edges: LineMaterial;
    };

    // Lights
    private ambientLight: THREE.AmbientLight;
    private dirLight: THREE.DirectionalLight;
    private dirLightHelper: THREE.DirectionalLightHelper;

    // --- OPTIMIZATION CACHE ---
    private dummy = new THREE.Object3D();
    private _gradColors = [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()];

    constructor(canvas: HTMLCanvasElement, world: GameWorld) {
        this.scene = world.scene;

        // Setup WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Setup Main Camera (Perspective)
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 10, 10000);
        this.scene.add(this.camera);

        // Setup Editor Camera (Orthographic)
        this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10000);
        this.scene.add(this.orthoCamera);

        // --- LIGHTING ---
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        this.dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.dirLight.position.set(500, 1000, 500);
        this.dirLight.castShadow = true;

        this.dirLight.shadow.mapSize.width = 2048;
        this.dirLight.shadow.mapSize.height = 2048;
        this.dirLight.shadow.camera.left = -4000;
        this.dirLight.shadow.camera.right = 4000;
        this.dirLight.shadow.camera.top = 4000;
        this.dirLight.shadow.camera.bottom = -4000;
        this.dirLight.shadow.camera.near = 0.5;
        this.dirLight.shadow.camera.far = 5000;
        this.dirLight.shadow.bias = -0.0005;

        this.scene.add(this.dirLight);

        this.dirLightHelper = new THREE.DirectionalLightHelper(this.dirLight, 100);
        this.scene.add(this.dirLightHelper);

        // --- POST PROCESSING ---
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(this.renderPass);

        const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
        this.bloomPass = new UnrealBloomPass(resolution, 1.5, 0.4, 0.85);
        this.bloomPass.strength = 0;
        this.bloomPass.radius = 0;
        this.bloomPass.threshold = 0;
        this.composer.addPass(this.bloomPass);

        this.crtPass = new ShaderPass({
            uniforms: {
                tDiffuse: { value: null },
                uTime: { value: 0 },
                uGrainStrength: { value: 0.0 },
                uExitFogCenter: { value: new THREE.Vector2(0.5, 0.5) },
                uExitFogRadius: { value: 0.0 },
                uExitFogStrength: { value: 0.0 },
                uAspect: { value: 1.0 }
            },
            vertexShader: CRT_VERTEX_SHADER,
            fragmentShader: CRT_FRAGMENT_SHADER
        });
        this.composer.addPass(this.crtPass);

        // Initialize with 5 colors
        const initialColors = Array(5).fill(null).map(() => new THREE.Color(0x000000));

        // --- GRID ---
        this.gridMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uBreathMag: { value: 1.0 },
                uGradientColors: { value: initialColors },
                uGradientCount: { value: 1 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uLineColor: { value: new THREE.Color(1, 1, 1) },
                uGridSize: { value: 100 },
                uThickness: { value: 2.0 },
                uGoalConfig: { value: new THREE.Vector3(0, 0, 0) },
                uGridFreq: { value: 0.01 },
                uGridAmp: { value: 1.0 },
                uGridSpeed: { value: 1.0 },
                uGridOffset: { value: 0.0 },
                uGridRigid: { value: 1.0 },
                uTransparent: { value: 0.0 },
                uFadeY: { value: -10000 },
                uExitFogCenter: { value: new THREE.Vector2(0, 0) },
                uExitFogRadius: { value: 0 },
                uExitFogStrength: { value: 0 }
            },
            vertexShader: GRID_VERTEX_SHADER,
            fragmentShader: GRID_FRAGMENT_SHADER,
            transparent: true,
            depthWrite: false
        });

        const planeGeo = new THREE.PlaneGeometry(10000, 10000, 100, 100);
        this.gridMesh = new THREE.Mesh(planeGeo, this.gridMaterial);
        this.scene.add(this.gridMesh);

        // --- GOAL PORTAL ---
        this.portalMaterial = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
            },
            vertexShader: PORTAL_VERTEX_SHADER,
            fragmentShader: PORTAL_FRAGMENT_SHADER,
            transparent: true,
            side: THREE.DoubleSide
        });
        const goalGeo = new THREE.BoxGeometry(60, 60, SCENE_Config.GOAL_DEPTH);
        this.goalMesh = new THREE.Mesh(goalGeo, this.portalMaterial);
        this.scene.add(this.goalMesh);

        // --- MATERIALS ---
        this.materials = {
            platform: new THREE.MeshStandardMaterial({ color: 0x444444 }),
            wall: new THREE.MeshStandardMaterial({ color: 0x666666 }),
            floor: new THREE.MeshStandardMaterial({ color: 0x333333 }),
            cube: new THREE.MeshStandardMaterial({ color: 0x555555 }),
            moving: new THREE.MeshStandardMaterial({ color: 0x9333ea }),

            bouncy: new THREE.MeshStandardMaterial({ color: 0xff00ff }),
            edges: new LineMaterial({ color: 0xFFFFFF, linewidth: 2, resolution: new THREE.Vector2(window.innerWidth, window.innerHeight) })
        };

        // --- GHOSTS ---
        const ghostGeo = new THREE.BoxGeometry(1, 1, 1);
        const ghostMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.3 });
        this.ghostMesh = new THREE.InstancedMesh(ghostGeo, ghostMat, 50);
        this.ghostMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(this.ghostMesh);

        // --- GROUPS ---
        this.levelGroup = new THREE.Group();
        this.scene.add(this.levelGroup);
    }

    public init() { }

    public resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
        this.bloomPass.setSize(w, h);

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.gridMaterial.uniforms.uResolution.value.set(w, h);
        this.crtPass.uniforms.uAspect.value = w / h;
        this.materials.edges.resolution.set(w, h);
    }

    public getDimensions() {
        return { w: window.innerWidth, h: window.innerHeight };
    }

    public setLevel(level: Level) {
        this.levelGroup.clear();
        this.goalMesh.scale.set(level.goal.w / 60, level.goal.h / 60, 1);
        this.goalMesh.position.set(level.goal.x + level.goal.w / 2, -(level.goal.y + level.goal.h / 2), 0);
    }

    public render(
        dt: number,
        camera: Camera,
        level: Level,
        player: Player,
        ghosts: RenderGhost[],
        config: {
            grid: GridConfig,
            visual: VisualConfig,
            post: PostProcessConfig,
            light: LightConfig,
            vanishing: VanishingConfig,
            showBounds: boolean
        },
        isEditor: boolean = false,
        alpha: number = 1.0 // Interpolation Factor (default 1.0 for backwards compat)
    ) {
        let activeCamera: THREE.Camera = this.camera;

        // --- INTERPOLATION HELPER ---
        const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

        // Interpolate Camera
        const camX = lerp(camera.prevX ?? camera.x, camera.x, alpha);
        const camY = lerp(camera.prevY ?? camera.y, camera.y, alpha);

        if (isEditor) {
            activeCamera = this.orthoCamera;
            const halfW = camera.w / 2;
            const halfH = camera.h / 2;

            this.orthoCamera.left = -halfW;
            this.orthoCamera.right = halfW;
            this.orthoCamera.top = halfH;
            this.orthoCamera.bottom = -halfH;
            this.orthoCamera.updateProjectionMatrix();

            // Editor snaps to final position (no lerp preferred for precision)
            this.orthoCamera.position.set(camera.x + halfW, -(camera.y + halfH), 1000);
            this.orthoCamera.lookAt(camera.x + halfW, -(camera.y + halfH), 0);
            this.orthoCamera.rotation.z = 0;

        } else {
            // Apply Interpolated Position
            this.camera.position.set(camX + camera.w / 2, -(camY + camera.h / 2), camera.z);
            this.camera.lookAt(camX + camera.w / 2, -(camY + camera.h / 2), 0);
        }

        // --- PLAYER INTERPOLATION ---
        // We need to fetch the Player GameObject to update its specific mesh position cleanly
        // Alternatively, the GameEngine passes us the 'player' state which has prevX/prevY.
        // We can manually update the mesh here, or rely on PlayerVisuals.
        // BUT PlayerVisuals.update() runs in fixedUpdate (Logic) usually.
        // To get smooth movement, we should override the transform position here just for rendering.
        // HOWEVER, PlayerVisuals component updates the TransformComponent.
        // We can't easily reach into components here without traversing.
        // HACK: We assume the Player GO is updated by GameEngine via Components, but those are fixed step.
        // Ideally, MeshRenderer should interpolate.

        // For this specific architecture where visual logic sits in Components:
        // We will perform a "Late Update" on the player visual transform here if possible.
        // Since we don't have reference to the GameObject here directly (only state), 
        // we rely on the fact that GameEngine.renderVisuals() calls this.

        // Actually, the cleanest way is for PlayerVisuals to accept alpha, but that requires changing component signature.
        // INSTEAD: We will manually update the player mesh group IF we can find it.
        // But `this.scene` has everything.

        // Let's find the Player Mesh in the scene graph.
        // This is a bit dirty but effective for this scale.
        // We assume Player is named "Player" (set in Game.tsx)
        const playerObj = this.scene.getObjectByName("Player");
        if (playerObj) {
            const px = lerp(player.prevX, player.x, alpha) + player.w / 2;
            const py = -(lerp(player.prevY, player.y, alpha) + player.h / 2);
            playerObj.position.set(px, py, player.z);
        }

        this.renderPass.camera = activeCamera;

        this.ambientLight.intensity = config.light.ambientIntensity;
        this.ambientLight.color.set(config.light.ambientColor);

        this.dirLight.intensity = config.light.dirIntensity;
        this.dirLight.color.set(config.light.dirColor);
        this.dirLight.position.set(config.light.dirX, config.light.dirY, config.light.dirZ);

        this.dirLightHelper.visible = config.light.showHelper && !isEditor;
        if (this.dirLightHelper.visible) {
            this.dirLightHelper.update();
        }

        const vc = config.visual;
        this.materials.platform.color.set(vc.platform.fillColor);
        this.materials.platform.opacity = vc.platform.opacity ?? 1.0;
        this.materials.platform.transparent = this.materials.platform.opacity < 1.0;

        this.materials.wall.color.set(vc.wall.fillColor);
        this.materials.wall.opacity = vc.wall.opacity ?? 1.0;
        this.materials.wall.transparent = this.materials.wall.opacity < 1.0;

        this.materials.floor.color.set(vc.floor.fillColor);
        this.materials.floor.opacity = vc.floor.opacity ?? 1.0;
        this.materials.floor.transparent = this.materials.floor.opacity < 1.0;

        this.materials.cube.color.set(vc.cube.fillColor);
        this.materials.cube.opacity = vc.cube.opacity ?? 1.0;
        this.materials.cube.transparent = this.materials.cube.opacity < 1.0;

        this.materials.moving.color.set(vc.moving.fillColor);

        this.materials.bouncy.color.set(vc.bouncy.fillColor);

        this.materials.edges.color.set(vc.platform.edgeColor);
        this.materials.edges.linewidth = vc.edgeThickness;

        const pp = config.post;
        this.bloomPass.strength = pp.bloomStrength;
        this.bloomPass.radius = pp.bloomRadius;
        this.bloomPass.threshold = pp.bloomThreshold;

        const gridConfig = config.grid;
        const mat = this.gridMaterial;

        mat.uniforms.uGridSize.value = gridConfig.size;
        mat.uniforms.uThickness.value = gridConfig.lineWidth;
        mat.uniforms.uGridFreq.value = gridConfig.frequency;
        mat.uniforms.uGridAmp.value = gridConfig.amplitude;
        mat.uniforms.uGridSpeed.value = gridConfig.speed;
        mat.uniforms.uGridOffset.value = gridConfig.offset;
        mat.uniforms.uGridRigid.value = gridConfig.rigid ? 1.0 : 0.0;
        mat.uniforms.uTransparent.value = gridConfig.transparent ? 1.0 : 0.0;
        mat.uniforms.uBreathMag.value = gridConfig.zBreathing ? 1.0 : 0.0;
        mat.uniforms.uLineColor.value.setStyle(gridConfig.lineColor);

        // --- AUTO-FADE GRID LOGIC ---
        // Find the lowest platform Y-coordinate in World Space.
        // We use this to set uFadeY so grid lines disappear exactly at or below this level.
        // Since Y is inverted in ThreeJS view (Platform.y=0 is top, y=1000 is bottom), 
        // we must be careful.
        // Platform Y increases downwards. In ThreeJS, Y decreases downwards.
        // World Pos Y = -Platform.y
        // We want lowest visual point (highest Platform Y value).
        // Let's find max(p.y + p.h). The world Y for this is -(max(p.y+p.h)).
        // We set uFadeY to this world Y value.

        let maxPlatformY = -Infinity;
        // Optimization: Only scan if level changed? Or just do it, array is small < 100 items usually.
        // We do it every frame to support moving platforms / editor live updates.
        for (let i = 0; i < level.platforms.length; i++) {
            const p = level.platforms[i];
            const bottom = p.y + p.h;
            if (bottom > maxPlatformY) maxPlatformY = bottom;
        }

        // If no platforms, default to something low
        if (maxPlatformY === -Infinity) maxPlatformY = 1000;

        // Convert to ThreeJS World Y (Inverted)
        // Platform Y=1000 -> World Y=-1000
        // The shader expects a World Y coordinate below which grid lines fade out.
        // We want lines to start fading OUT as we approach this bottom limit.
        // Actually, lines should be invisible BELOW this limit.
        // uFadeY should be the World Y of the bottom-most block.
        const lowestWorldY = -maxPlatformY;
        mat.uniforms.uFadeY.value = lowestWorldY;

        const srcColors = gridConfig.baseGradient || ['#000000'];
        for (let i = 0; i < 5; i++) {
            if (i < srcColors.length) {
                this._gradColors[i].set(srcColors[i]);
            } else {
                this._gradColors[i].set(0x000000);
            }
        }
        mat.uniforms.uGradientColors.value = this._gradColors;
        mat.uniforms.uGradientCount.value = srcColors.length;

        const snapCamX = Math.floor(camera.x / gridConfig.size) * gridConfig.size;
        const snapCamY = Math.floor(-camera.y / gridConfig.size) * gridConfig.size;

        this.gridMesh.position.x = snapCamX;
        this.gridMesh.position.y = snapCamY;
        this.gridMesh.position.z = gridConfig.z;
        this.gridMesh.visible = gridConfig.visible;

        const goal = level.goal;
        this.goalMesh.position.set(goal.x + goal.w / 2, -(goal.y + goal.h / 2), 0);
        this.portalMaterial.uniforms.uTime.value += dt;

        this.crtPass.uniforms.uTime.value += dt;
        this.crtPass.uniforms.uGrainStrength.value = config.post.grainStrength;

        let gIdx = 0;
        ghosts.forEach(g => {
            if (gIdx < 50) {
                this.dummy.position.set(g.x + g.w / 2, -(g.y + g.h / 2), 0.0);
                this.dummy.scale.set(g.w, g.h, SCENE_Config.PLAYER_DEPTH);
                this.dummy.rotation.set(0, 0, 0);
                this.dummy.updateMatrix();
                this.ghostMesh.setMatrixAt(gIdx, this.dummy.matrix);
                gIdx++;
            }
        });
        this.ghostMesh.count = gIdx;
        this.ghostMesh.instanceMatrix.needsUpdate = true;

        this.composer.render();
    }

    public dispose() {
        this.renderer.dispose();
    }
}