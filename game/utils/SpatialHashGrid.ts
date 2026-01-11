
import { Rect, Platform } from '../../types';

export class SpatialHashGrid {
    private cellSize: number;
    private cells: Map<string, Platform[]>;
    private bounds: Rect;

    constructor(bounds: Rect, cellSize: number = 200) {
        this.bounds = bounds;
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    public clear() {
        this.cells.clear();
    }

    public insert(platform: Platform) {
        const startX = Math.floor(platform.x / this.cellSize);
        const endX = Math.floor((platform.x + platform.w) / this.cellSize);
        const startY = Math.floor(platform.y / this.cellSize);
        const endY = Math.floor((platform.y + platform.h) / this.cellSize);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                if (!this.cells.has(key)) {
                    this.cells.set(key, []);
                }
                this.cells.get(key)!.push(platform);
            }
        }
    }

    public query(rect: Rect): Platform[] {
        const startX = Math.floor(rect.x / this.cellSize);
        const endX = Math.floor((rect.x + rect.w) / this.cellSize);
        const startY = Math.floor(rect.y / this.cellSize);
        const endY = Math.floor((rect.y + rect.h) / this.cellSize);

        const results = new Set<Platform>();

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                const key = `${x},${y}`;
                const cell = this.cells.get(key);
                if (cell) {
                    for (let i = 0; i < cell.length; i++) {
                        results.add(cell[i]);
                    }
                }
            }
        }

        return Array.from(results);
    }
}
