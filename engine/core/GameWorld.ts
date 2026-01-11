
import * as THREE from 'three';
import { GameObject } from './GameObject';
import { Component } from './Component';
import { Rect } from '../../types';
import { UpdateContext } from './UpdateContext';

export class GameWorld {
  public scene: THREE.Scene;
  public bounds: Rect = { x: 0, y: 0, w: 0, h: 0 };
  public geometryVersion: number = 0; // Tracks structural changes to the level

  public gameObjects: GameObject[] = []; // Changed to public for Engine access
  private gameObjectsToAdd: GameObject[] = [];
  private isUpdating: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addGameObject(gameObject: GameObject): void {
    if (this.isUpdating) {
      this.gameObjectsToAdd.push(gameObject);
    } else {
      this._add(gameObject);
    }
  }

  private _add(gameObject: GameObject): void {
    this.gameObjects.push(gameObject);
    this.scene.add(gameObject.object3D);
  }

  public removeGameObject(gameObject: GameObject): void {
    const index = this.gameObjects.indexOf(gameObject);
    if (index > -1) {
      this.gameObjects.splice(index, 1);
      gameObject.destroy(); // Removes from scene
    }
  }

  public findObjectByName(name: string): GameObject | undefined {
    return this.gameObjects.find(go => go.name === name);
  }

  public destroyObjectsByTag(tag: string): void {
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      if (this.gameObjects[i].tag === tag) {
        this.gameObjects[i].destroy();
        this.gameObjects.splice(i, 1);
      }
    }
  }

  public incrementGeometryVersion() {
    this.geometryVersion++;
  }

  // ECS Query Helper
  public getComponents<T extends Component>(ComponentClass: new (...args: any[]) => T): T[] {
    const results: T[] = [];
    for (const go of this.gameObjects) {
      if (go.destroyed) continue;
      const comp = go.getComponent(ComponentClass);
      if (comp) results.push(comp);
    }
    return results;
  }

  public update(dt: number, context: UpdateContext): void {
    this.isUpdating = true;

    // Update all objects
    for (let i = this.gameObjects.length - 1; i >= 0; i--) {
      const obj = this.gameObjects[i];
      if (obj.destroyed) {
        this.gameObjects.splice(i, 1);
        continue;
      }
      obj.update(dt, context);
    }

    this.isUpdating = false;

    // Process queue
    if (this.gameObjectsToAdd.length > 0) {
      for (const obj of this.gameObjectsToAdd) {
        this._add(obj);
      }
      this.gameObjectsToAdd = [];
    }
  }

  public resetLevelObjects(): void {
    for (const obj of this.gameObjects) {
      if (obj.destroyed) continue;
      for (const component of obj.components.values()) {
        component.reset();
      }
    }
  }

  public clear(): void {
    // Destroy all game objects
    for (const obj of this.gameObjects) {
      obj.destroy();
    }
    this.gameObjects = [];
    this.gameObjectsToAdd = [];
  }
}
