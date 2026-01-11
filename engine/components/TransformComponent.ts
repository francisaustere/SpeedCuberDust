
import * as THREE from 'three';
import { Component } from '../core/Component';

export class TransformComponent extends Component {
  // Wrappers to avoid direct dependency on Three.js types in logic if needed,
  // but mostly to provide convenient accessors.

  // DIRECT READS (No duplication)
  get position(): THREE.Vector3 { return this.object3D.position; }
  get rotation(): THREE.Euler { return this.object3D.rotation; }
  get scale(): THREE.Vector3 { return this.object3D.scale; }
  get quaternion(): THREE.Quaternion { return this.object3D.quaternion; }

  // HELPERS
  public setPosition(x: number, y: number, z: number): void {
    this.object3D.position.set(x, y, z);
  }

  public translate(x: number, y: number, z: number): void {
    this.object3D.position.x += x;
    this.object3D.position.y += y;
    this.object3D.position.z += z;
  }

  public setRotation(x: number, y: number, z: number): void {
    this.object3D.rotation.set(x, y, z);
  }

  public lookAt(target: THREE.Vector3): void {
    this.object3D.lookAt(target);
  }

  public setScale(x: number, y: number, z: number): void {
    this.object3D.scale.set(x, y, z);
  }

  public getWorldPosition(target: THREE.Vector3): THREE.Vector3 {
    return this.object3D.getWorldPosition(target);
  }
}
