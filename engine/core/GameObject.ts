
import * as THREE from 'three';
import { Component } from './Component';
import { TransformComponent } from '../components/TransformComponent';
import { UpdateContext } from './UpdateContext';

export class GameObject {
  public object3D: THREE.Object3D;
  public components: Map<any, Component> = new Map();
  public name: string;
  public tag: string; // New: Tag for grouping (e.g., 'Enemy', 'Bullet')
  public destroyed: boolean = false;

  private static nextId: number = 0;
  public readonly id: number;

  // Cached reference to TransformComponent
  public transform!: TransformComponent;

  constructor(object3D: THREE.Object3D = new THREE.Group(), name: string = 'GameObject', tag: string = 'Untagged') {
    this.object3D = object3D;
    this.name = name;
    this.tag = tag;
    this.object3D.userData.gameObject = this; // Link back for raycasting/picking

    // Always add TransformComponent
    this.addComponent(TransformComponent);
    this.id = GameObject.nextId++;
  }

  public addComponent<T extends Component>(ComponentClass: new (go: GameObject, ...args: any[]) => T, ...args: any[]): T {
    const component = new ComponentClass(this, ...args);
    this.components.set(ComponentClass, component);

    // Cache transform for quick access
    if (component instanceof TransformComponent) {
      this.transform = component;
    }

    component.init();
    return component;
  }

  public getComponent<T extends Component>(ComponentClass: new (...args: any[]) => T): T | undefined {
    return this.components.get(ComponentClass) as T;
  }

  public removeComponent(ComponentClass: new (...args: any[]) => Component): void {
    const component = this.components.get(ComponentClass);
    if (component) {
      component.destroy();
      this.components.delete(ComponentClass);
    }
  }

  public update(dt: number, context: UpdateContext): void {
    if (!this.object3D.visible) return; // Optimization: Don't update hidden objects? Optional.

    for (const component of this.components.values()) {
      if (component.enabled) {
        component.update(dt, context);
      }
    }
  }

  public destroy(): void {
    this.destroyed = true;
    for (const component of this.components.values()) {
      component.destroy();
    }
    this.components.clear();

    // Remove from parent scene graph
    if (this.object3D.parent) {
      this.object3D.parent.remove(this.object3D);
    }
  }
}
