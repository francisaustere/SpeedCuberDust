import { InputState } from '../types';

export class InputSystem {
  private keys: Set<string> = new Set();
  
  // Reusable state object to prevent GC pressure
  private _reusableState: InputState = {
    left: false,
    right: false,
    up: false,
    down: false,
    jumpPressed: false,
    jumpHeld: false
  };

  // Virtual Controls State
  private virtualJoystickX: number = 0; // -1 to 1
  private virtualJumpPressed: boolean = false;
  private virtualJumpHeld: boolean = false;
  
  private jumpConsumeFrame: boolean = false;
  
  // Mouse/Pointer State
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor() {
    // Listeners are now handled in init()
  }

  public init() {
    this.cleanup();
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const alreadyPressed = this.keys.has(e.code);
    this.keys.add(e.code);

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyC') {
      if (!alreadyPressed) {
        this._reusableState.jumpPressed = true;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  
  private handleMouseMove = (e: MouseEvent) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
  };
  
  private handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
          this.mouseX = e.touches[0].clientX;
          this.mouseY = e.touches[0].clientY;
      }
  };

  public setVirtualJoystick(x: number) {
    this.virtualJoystickX = Math.max(-1, Math.min(1, x));
  }

  public setVirtualJump(pressed: boolean) {
    if (pressed && !this.virtualJumpHeld) {
        this.virtualJumpPressed = true;
    }
    this.virtualJumpHeld = pressed;
  }

  public reset() {
    this.keys.clear();
    this.virtualJoystickX = 0;
    this.virtualJumpPressed = false;
    this.virtualJumpHeld = false;
    this.jumpConsumeFrame = false;
    
    // Reset state buffer
    this._reusableState.left = false;
    this._reusableState.right = false;
    this._reusableState.up = false;
    this._reusableState.down = false;
    this._reusableState.jumpPressed = false;
    this._reusableState.jumpHeld = false;
  }
  
  public getMousePosition() {
      return { x: this.mouseX, y: this.mouseY };
  }

  public getState(): InputState {
    const leftKey = this.keys.has('ArrowLeft') || this.keys.has('KeyA');
    const rightKey = this.keys.has('ArrowRight') || this.keys.has('KeyD');
    const upKey = this.keys.has('ArrowUp') || this.keys.has('KeyW');
    const downKey = this.keys.has('ArrowDown') || this.keys.has('KeyS');
    const jumpKey = this.keys.has('Space') || upKey || this.keys.has('KeyC');
    
    this._reusableState.left = leftKey || this.virtualJoystickX < -0.3;
    this._reusableState.right = rightKey || this.virtualJoystickX > 0.3;
    this._reusableState.up = upKey;
    this._reusableState.down = downKey;
    
    if (this.virtualJumpPressed && !this.jumpConsumeFrame) {
        this._reusableState.jumpPressed = true;
    }
    
    this._reusableState.jumpHeld = jumpKey || this.virtualJumpHeld;
    
    return this._reusableState;
  }

  public update() {
    this._reusableState.jumpPressed = false;
    this.virtualJumpPressed = false;
    this.jumpConsumeFrame = false;
  }
  
  public cleanup() {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
      window.removeEventListener('mousemove', this.handleMouseMove);
      window.removeEventListener('touchmove', this.handleTouchMove);
  }
}