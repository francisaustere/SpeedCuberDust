
import { GameObject } from './GameObject';
import { UpdateContext } from './UpdateContext';

export class Component {
  public gameObject: GameObject;
  public enabled: boolean = true;

  constructor(gameObject: GameObject) {
    this.gameObject = gameObject;
  }

  // Quick access to the underlying Three.js object
  get object3D() {
    return this.gameObject.object3D;
  }

  // Quick access to transform component (since it's so common)
  get transform() {
    return this.gameObject.transform;
  }

  public init(): void {}
  
  // Updated signature to use Context
  public update(dt: number, context: UpdateContext): void {}
  
  public destroy(): void {}
  
  // New method for resetting state on player respawn
  public reset(): void {}
}
