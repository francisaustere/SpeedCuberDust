import * as THREE from 'three';
import { Component } from '../core/Component';
import { GameObject } from '../core/GameObject';

export class MeshRenderer extends Component {
  public mesh: THREE.Mesh;
  private ownsGeometry: boolean;
  private ownsMaterial: boolean;

  constructor(
    gameObject: GameObject, 
    geometry: THREE.BufferGeometry, 
    material: THREE.Material,
    ownsGeometry = false,
    ownsMaterial = false
  ) {
    super(gameObject);
    this.mesh = new THREE.Mesh(geometry, material);
    this.gameObject.object3D.add(this.mesh);
    this.ownsGeometry = ownsGeometry;
    this.ownsMaterial = ownsMaterial;
  }

  public setMaterial(material: THREE.Material) {
      this.mesh.material = material;
  }
  
  public setColor(color: THREE.ColorRepresentation) {
      if (this.mesh.material instanceof THREE.MeshBasicMaterial || 
          this.mesh.material instanceof THREE.MeshStandardMaterial) {
          this.mesh.material.color.set(color);
      }
  }

  public setOpacity(opacity: number) {
      if (this.mesh.material instanceof THREE.Material) {
          this.mesh.material.opacity = opacity;
          this.mesh.material.transparent = opacity < 1.0;
          this.mesh.material.needsUpdate = true;
      }
  }

  public destroy(): void {
      this.gameObject.object3D.remove(this.mesh);
      
      if (this.ownsGeometry && this.mesh.geometry) {
          this.mesh.geometry.dispose();
      }
      
      if (this.ownsMaterial && this.mesh.material) {
          if (Array.isArray(this.mesh.material)) {
              this.mesh.material.forEach(m => m.dispose());
          } else {
              this.mesh.material.dispose();
          }
      }
  }
}