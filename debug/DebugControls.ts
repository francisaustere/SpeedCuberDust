
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as THREE from 'three';

export class DebugControls {
  private controls: OrbitControls;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.controls = new OrbitControls(camera, canvas);
    this.controls.enabled = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Limits to prevent "black screen" (clipping)
    this.controls.minDistance = 100;
    this.controls.maxDistance = 3000;
    this.controls.zoomSpeed = 0.5;
  }

  public setEnabled(enabled: boolean) {
    this.controls.enabled = enabled;
    if (!enabled) {
      this.controls.reset();
      this.camera.rotation.set(0, 0, 0);
    }
  }

  public update() {
    if (this.controls.enabled) {
      this.controls.update();
    }
  }

  public dispose() {
    this.controls.dispose();
  }
}
