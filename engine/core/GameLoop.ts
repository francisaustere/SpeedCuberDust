
export type UpdateCallback = (dt: number) => void;
export type RenderCallback = (dt: number, alpha: number) => void;

export class GameLoop {
    private lastTime: number = 0;
    private accumulator: number = 0;
    private frameId: number | null = null;
    private isRunning: boolean = false;

    // Configuration
    public timeScale: number = 1.0;
    public readonly FIXED_STEP: number = 1 / 60; // 60 updates per second
    private readonly MAX_DELTA: number = 0.2; // Prevents spiral of death on lag

    // Callbacks
    private onFixedUpdate: UpdateCallback;
    private onRender: RenderCallback;

    constructor(onFixedUpdate: UpdateCallback, onRender: RenderCallback) {
        this.onFixedUpdate = onFixedUpdate;
        this.onRender = onRender;
    }

    public start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.loop(this.lastTime);
    }

    public stop() {
        this.isRunning = false;
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    public pause() {
        // Pausing is essentially stopping the loop, but we might want to keep rendering?
        // For this engine, "Stop" freezes everything. 
        // "Pause" logic (logic frozen, render active) is handled inside FixedUpdate by the GameEngine state.
        this.stop();
    }

    private loop = (now: number) => {
        if (!this.isRunning) return;

        // 1. Calculate elapsed time
        let dt = (now - this.lastTime) / 1000;
        this.lastTime = now;

        // 2. Cap delta time to avoid huge jumps if tab was inactive
        if (dt > this.MAX_DELTA) dt = this.MAX_DELTA;

        // 3. Apply Time Scale (Slow Motion / Fast Forward)
        // Only apply scaling to the accumulator input, so physics slows down.
        // Render dt is passed as is for UI animations, OR scaled? 
        // Usually, we scale the dt that feeds the accumulator.
        const scaledDt = dt * this.timeScale;

        this.accumulator += scaledDt;

        // 4. Fixed Update Loop (Physics)
        // Consume accumulator in fixed chunks
        while (this.accumulator >= this.FIXED_STEP) {
            this.onFixedUpdate(this.FIXED_STEP);
            this.accumulator -= this.FIXED_STEP;
        }

        // 5. Render (Interpolation)
        // alpha represents how far we are between two fixed updates (0.0 to 1.0)
        const alpha = this.accumulator / this.FIXED_STEP;
        this.onRender(scaledDt, alpha);

        // 6. Request Next Frame
        this.frameId = requestAnimationFrame(this.loop);
    };
}
