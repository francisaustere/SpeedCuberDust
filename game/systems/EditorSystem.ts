
import { Level, Platform, Rect, Camera, Point, EnemyData } from '../../types';
import { EDITOR_CONFIG } from '../../config/constants';

export type InteractionType = 'NONE' | 'DRAG' | 'RESIZE_TL' | 'RESIZE_TR' | 'RESIZE_BL' | 'RESIZE_BR' | 'RESIZE_L' | 'RESIZE_R' | 'RESIZE_T' | 'RESIZE_B' | 'ROTATE' | 'PAN' | 'SELECT_BOX' | 'MOVE_START' | 'MOVE_END';

interface EditorRect extends Rect {
    rotation?: number;
    id?: number;
    type?: string;
    moving?: { start: Point; end: Point; duration: number };
}

export class EditorSystem {
    public selectedIds: Set<number> = new Set();
    public interactionType: InteractionType = 'NONE';
    
    private startMouse: Point = { x: 0, y: 0 };
    private startCamera: Point = { x: 0, y: 0 };
    private startWorld: Point = { x: 0, y: 0 };
    
    private initialStates: Map<number, EditorRect> = new Map();
    private pendingTransforms: Map<number, EditorRect> = new Map();
    
    private selectionBoxStart: Point | null = null;
    private currentMouse: Point = { x: 0, y: 0 };
    
    private activeHandleId: number | null = null;
    
    // Virtual IDs for special level points
    private readonly GOAL_ID = -999;
    private readonly START_ID = -1000;

    constructor() {}

    public handleMouseDown(
        screenX: number, 
        screenY: number, 
        level: Level, 
        camera: Camera, 
        screenW: number, 
        screenH: number, 
        snapSize: number, 
        isShift: boolean
    ) {
        const worldPos = this.screenToWorld(screenX, screenY, camera, screenW, screenH);
        this.startMouse = { x: screenX, y: screenY };
        this.currentMouse = { x: screenX, y: screenY };
        this.startCamera = { x: camera.x, y: camera.y };
        this.startWorld = worldPos;

        // 1. Check Handles of Selected Items (Only if 1 selected)
        if (this.selectedIds.size === 1) {
            const id = Array.from(this.selectedIds)[0];
            const item = this.getItem(id, level);
            
            // Check if it's an enemy, goal, or start - Disable resize handles for them
            const isEnemy = level.enemies?.find(e => e.id === id);
            const isSpecial = id === this.GOAL_ID || id === this.START_ID;
            
            if (item && !isEnemy && !isSpecial) {
                // Check Moving Platform Handles first
                if ((item as Platform).moving) {
                    const movingHandles = this.checkMovingHandles(worldPos, item as Platform, camera, screenW);
                    if (movingHandles) {
                        this.interactionType = movingHandles;
                        this.activeHandleId = id;
                        this.captureInitialStates(level);
                        return;
                    }
                }

                const handle = this.checkHandles(worldPos, item, camera, screenW);
                if (handle) {
                    this.interactionType = handle;
                    this.activeHandleId = id;
                    this.captureInitialStates(level);
                    return;
                }
            }
        }

        // 2. Picking
        const clickedItem = this.pickItem(worldPos, level);
        
        if (clickedItem) {
            const itemId = clickedItem.id !== undefined ? clickedItem.id : (clickedItem.type === 'goal' ? this.GOAL_ID : this.START_ID);
            
            if (isShift) {
                if (this.selectedIds.has(itemId)) {
                    this.selectedIds.delete(itemId);
                } else {
                    this.selectedIds.add(itemId);
                }
            } else {
                if (!this.selectedIds.has(itemId)) {
                    this.selectedIds.clear();
                    this.selectedIds.add(itemId);
                }
            }
            
            this.interactionType = 'DRAG';
            this.captureInitialStates(level);
        } else {
            // Background Click
            if (isShift) {
                this.interactionType = 'SELECT_BOX';
                this.selectionBoxStart = worldPos;
            } else {
                this.selectedIds.clear();
                this.interactionType = 'PAN';
            }
        }
    }

    public handleMouseMove(
        screenX: number, 
        screenY: number, 
        camera: Camera, 
        isShift: boolean, 
        isAlt: boolean, 
        screenW: number, 
        screenH: number, 
        level: Level
    ): { cameraChange?: Point } {
        this.currentMouse = { x: screenX, y: screenY };
        const worldPos = this.screenToWorld(screenX, screenY, camera, screenW, screenH);
        const result: { cameraChange?: Point } = {};

        // Pan Logic
        if (this.interactionType === 'PAN' || (isAlt && this.interactionType === 'NONE')) {
            this.interactionType = 'PAN';
            const dx = (screenX - this.startMouse.x) * (camera.w / screenW);
            const dy = (screenY - this.startMouse.y) * (camera.h / screenH);
            result.cameraChange = {
                x: this.startCamera.x - dx,
                y: this.startCamera.y - dy
            };
            return result;
        }

        if (this.interactionType === 'DRAG') {
            const dx = worldPos.x - this.startWorld.x;
            const dy = worldPos.y - this.startWorld.y;
            const snap = !isShift ? EDITOR_CONFIG.GRID_SIZE : 1;

            this.selectedIds.forEach(id => {
                const init = this.initialStates.get(id);
                if (init) {
                    let nx = init.x + dx;
                    let ny = init.y + dy;
                    
                    if (!isShift) {
                        nx = Math.round(nx / snap) * snap;
                        ny = Math.round(ny / snap) * snap;
                    }
                    
                    const newRect: EditorRect = { ...init, x: nx, y: ny };

                    // Move Path along with object
                    if (init.moving) {
                        const effectiveDx = nx - init.x;
                        const effectiveDy = ny - init.y;
                        
                        newRect.moving = {
                            ...init.moving,
                            start: { x: init.moving.start.x + effectiveDx, y: init.moving.start.y + effectiveDy },
                            end: { x: init.moving.end.x + effectiveDx, y: init.moving.end.y + effectiveDy }
                        };
                    }
                    
                    this.pendingTransforms.set(id, newRect);
                }
            });
        } 
        else if ((this.interactionType === 'MOVE_START' || this.interactionType === 'MOVE_END') && this.activeHandleId) {
            const init = this.initialStates.get(this.activeHandleId);
            if (init && init.moving) {
                const dx = worldPos.x - this.startWorld.x;
                const dy = worldPos.y - this.startWorld.y;
                const snap = !isShift ? EDITOR_CONFIG.GRID_SIZE : 1;
                
                const moving = { ...init.moving };
                let nx = init.x;
                let ny = init.y;

                if (this.interactionType === 'MOVE_START') {
                    let targetX = init.moving.start.x + dx;
                    let targetY = init.moving.start.y + dy;
                    if (!isShift) {
                        targetX = Math.round(targetX / snap) * snap;
                        targetY = Math.round(targetY / snap) * snap;
                    }
                    moving.start = { x: targetX, y: targetY };
                    nx = targetX;
                    ny = targetY;
                } else {
                    let targetX = init.moving.end.x + dx;
                    let targetY = init.moving.end.y + dy;
                    if (!isShift) {
                        targetX = Math.round(targetX / snap) * snap;
                        targetY = Math.round(targetY / snap) * snap;
                    }
                    moving.end = { x: targetX, y: targetY };
                }
                
                this.pendingTransforms.set(this.activeHandleId, { ...init, x: nx, y: ny, moving });
            }
        }
        else if (this.interactionType === 'ROTATE' && this.activeHandleId) {
            const init = this.initialStates.get(this.activeHandleId);
            if (init) {
                const cx = init.x + init.w/2;
                const cy = init.y + init.h/2;
                const angle = Math.atan2(worldPos.y - cy, worldPos.x - cx);
                let newRot = angle + Math.PI/2;
                if (isShift) {
                    const snap = 15 * (Math.PI/180);
                    newRot = Math.round(newRot / snap) * snap;
                }
                this.pendingTransforms.set(this.activeHandleId, { ...init, rotation: newRot });
            }
        } else if (this.interactionType.startsWith('RESIZE') && this.activeHandleId) {
            const init = this.initialStates.get(this.activeHandleId);
            if (init) {
                const rot = init.rotation || 0;
                const dxWorld = worldPos.x - this.startWorld.x;
                const dyWorld = worldPos.y - this.startWorld.y;
                const c = Math.cos(-rot);
                const s = Math.sin(-rot);
                const dx = dxWorld * c - dyWorld * s;
                const dy = dxWorld * s + dyWorld * c;
                const snap = !isShift ? EDITOR_CONFIG.GRID_SIZE : 1;
                
                let nx = init.x;
                let ny = init.y;
                let nw = init.w;
                let nh = init.h;

                if (this.interactionType.includes('R')) nw = init.w + dx;
                if (this.interactionType.includes('L')) {
                    nx = init.x + dx; 
                    nw = init.w - dx;
                }
                if (this.interactionType.includes('B')) nh = init.h + dy;
                if (this.interactionType.includes('T')) {
                    ny = init.y + dy;
                    nh = init.h - dy;
                }

                if (!isShift) {
                    const snw = Math.max(snap, Math.round(nw / snap) * snap);
                    const snh = Math.max(snap, Math.round(nh / snap) * snap);
                    if (this.interactionType.includes('L')) nx = (init.x + init.w) - snw; 
                    if (this.interactionType.includes('T')) ny = (init.y + init.h) - snh; 
                    nw = snw;
                    nh = snh;
                }

                nw = Math.max(EDITOR_CONFIG.MIN_PLATFORM_SIZE, nw);
                nh = Math.max(EDITOR_CONFIG.MIN_PLATFORM_SIZE, nh);

                let moving = init.moving;
                if (init.moving) {
                    const diffX = nx - init.x;
                    const diffY = ny - init.y;
                    if (diffX !== 0 || diffY !== 0) {
                        moving = {
                            ...init.moving,
                            start: { x: init.moving.start.x + diffX, y: init.moving.start.y + diffY },
                            end: { x: init.moving.end.x + diffX, y: init.moving.end.y + diffY }
                        };
                    }
                }
                this.pendingTransforms.set(this.activeHandleId, { ...init, x: nx, y: ny, w: nw, h: nh, moving });
            }
        }

        return result;
    }

    public handleMouseUp(platforms: Platform[]) {
        this.interactionType = 'NONE';
        this.activeHandleId = null;
        this.initialStates.clear();
        this.pendingTransforms.clear();
        this.selectionBoxStart = null;
    }

    public render(canvas: HTMLCanvasElement, level: Level, camera: Camera, showPlatformIds: boolean = false) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scale = canvas.width / camera.w;
        const toScreen = (x: number, y: number) => ({
            x: (x - camera.x) * scale,
            y: (y - camera.y) * scale
        });

        // 1. Draw Moving Platform Paths
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        level.platforms.forEach(p => {
            const t = this.pendingTransforms.get(p.id) || (p as EditorRect);
            if (t.moving) {
                const cx = t.w / 2;
                const cy = t.h / 2;
                const start = toScreen(t.moving.start.x + cx, t.moving.start.y + cy);
                const end = toScreen(t.moving.end.x + cx, t.moving.end.y + cy);
                const isSelected = this.selectedIds.has(p.id);
                ctx.strokeStyle = isSelected ? '#FFFF00' : '#FFFFFF44';
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();
                if (!isSelected) {
                    ctx.fillStyle = '#00FF0044';
                    ctx.fillRect(start.x - 2, start.y - 2, 4, 4);
                    ctx.fillStyle = '#FF000044';
                    ctx.fillRect(end.x - 2, end.y - 2, 4, 4);
                }
            }
        });
        ctx.setLineDash([]);

        // 2. Draw Selection Box
        if (this.interactionType === 'SELECT_BOX' && this.selectionBoxStart) {
            const endPos = this.screenToWorld(this.currentMouse.x, this.currentMouse.y, camera, canvas.width, canvas.height);
            const x = Math.min(this.selectionBoxStart.x, endPos.x);
            const y = Math.min(this.selectionBoxStart.y, endPos.y);
            const w = Math.abs(endPos.x - this.selectionBoxStart.x);
            const h = Math.abs(endPos.y - this.selectionBoxStart.y);
            const sPos = toScreen(x, y);
            ctx.strokeStyle = '#00FFFF';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(sPos.x, sPos.y, w * scale, h * scale);
            ctx.setLineDash([]);
            
            this.selectedIds.clear();
            const box = { x, y, w, h };
            [...level.platforms, ...(level.enemies || [])].forEach(item => {
                if (this.rectIntersect(item, box)) this.selectedIds.add(item.id);
            });
            if (this.rectIntersect(level.goal, box)) this.selectedIds.add(this.GOAL_ID);
            const startBox = { x: level.start.x, y: level.start.y, w: 40, h: 40 };
            if (this.rectIntersect(startBox, box)) this.selectedIds.add(this.START_ID);
        }

        // 3. Draw Highlights & Static Elements (Start & Goal)
        const drawItem = (item: EditorRect, id: number, label?: string, color: string = '#00FFFF') => {
            const t = this.pendingTransforms.get(id) || item;
            const rot = t.rotation || 0;
            const cx = t.x + t.w/2;
            const cy = t.y + t.h/2;
            const sC = toScreen(cx, cy);
            const sW = t.w * scale;
            const sH = t.h * scale;
            
            if (this.selectedIds.size === 1 && this.selectedIds.has(id) && t.moving) {
                const offX = t.w / 2;
                const offY = t.h / 2;
                const sStart = toScreen(t.moving.start.x + offX, t.moving.start.y + offY);
                const sEnd = toScreen(t.moving.end.x + offX, t.moving.end.y + offY);
                const hSize = 8;
                ctx.fillStyle = '#00FF00';
                ctx.fillRect(sStart.x - hSize/2, sStart.y - hSize/2, hSize, hSize);
                ctx.fillStyle = '#FFFFFF';
                ctx.font = 'bold 10px sans-serif';
                ctx.fillText('S', sStart.x + 6, sStart.y - 6);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(sEnd.x - hSize/2, sEnd.y - hSize/2, hSize, hSize);
                ctx.fillText('E', sEnd.x + 6, sEnd.y - 6);
            }

            ctx.save();
            ctx.translate(sC.x, sC.y);
            ctx.rotate(rot);
            ctx.strokeStyle = color;
            ctx.lineWidth = this.selectedIds.has(id) ? 3 : 1;
            ctx.strokeRect(-sW/2, -sH/2, sW, sH);
            
            if (label) {
                ctx.fillStyle = color;
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(label, 0, -sH/2 - 5);
            }

            if (this.selectedIds.size === 1 && this.selectedIds.has(id)) {
                ctx.fillStyle = '#FFFFFF';
                const hSize = 6;
                const drawH = (x: number, y: number) => ctx.fillRect(x - hSize/2, y - hSize/2, hSize, hSize);
                const isEnemy = level.enemies?.some(e => e.id === id);
                const isSpecial = id === this.GOAL_ID || id === this.START_ID;

                if (!isEnemy && !isSpecial) {
                    drawH(-sW/2, -sH/2); drawH(sW/2, -sH/2); drawH(-sW/2, sH/2); drawH(sW/2, sH/2);
                    drawH(0, -sH/2); drawH(0, sH/2); drawH(-sW/2, 0); drawH(sW/2, 0);
                    const rotDist = 30; 
                    ctx.beginPath(); ctx.moveTo(0, -sH/2); ctx.lineTo(0, -sH/2 - rotDist);
                    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 1; ctx.stroke();
                    ctx.beginPath(); ctx.arc(0, -sH/2 - rotDist, 4, 0, Math.PI*2);
                    ctx.fillStyle = '#00FFFF'; ctx.fill();
                }
            }
            ctx.restore();
        };

        // Draw Player Start Point
        const startRect = { x: level.start.x, y: level.start.y, w: 40, h: 40, type: 'start' };
        drawItem(startRect as EditorRect, this.START_ID, 'START', '#00FF00');

        // Draw Goal Portal
        const goalRect = { ...level.goal, type: 'goal' };
        drawItem(goalRect as EditorRect, this.GOAL_ID, 'GOAL', '#FFFF00');

        // Draw Platforms
        level.platforms.forEach(p => {
            if (this.selectedIds.has(p.id)) drawItem(p, p.id);
        });

        // Draw Enemies
        if (level.enemies) {
            level.enemies.forEach(e => {
                const label = e.type.toUpperCase();
                drawItem(e, e.id, label, '#FF0000');
            });
        }

        // 4. Draw Platform IDs
if (showPlatformIds) {
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    level.platforms.forEach(p => {
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        const sPos = toScreen(cx, cy);
        
        // Don't draw if out of bounds (optimization)
        if (sPos.x < -50 || sPos.x > canvas.width + 50 || sPos.y < -50 || sPos.y > canvas.height + 50) return;

        // 🆕 Prépare les 3 lignes de texte
        const idText = p.id.toString().slice(-4);
        const xText = `x:${Math.round(p.x)}-${Math.round(p.x + p.w)}`;
        const yText = `y:${Math.round(p.y)}-${Math.round(p.y + p.h)}`;

        
        // 🆕 Calcule la largeur max pour le fond
        const metrics1 = ctx.measureText(idText);
        const metrics2 = ctx.measureText(xText);
        const metrics3 = ctx.measureText(yText);
        const maxWidth = Math.max(metrics1.width, metrics2.width, metrics3.width);
        
        const bgW = maxWidth + 6;
        const lineHeight = 12;
        const bgH = lineHeight * 3 + 4;
        
        // 🆕 Dessine le fond noir semi-transparent
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(sPos.x - bgW/2, sPos.y - bgH/2 - 25, bgW, bgH);
        
        // 🆕 Dessine les 3 lignes de texte
        ctx.fillStyle = '#00FFFF';
        ctx.fillText(idText, sPos.x, sPos.y - 25);      // Ligne 1: ID
        ctx.fillStyle = '#FFFF00';
        ctx.fillText(xText, sPos.x, sPos.y - 25 + lineHeight);  // Ligne 2: X
        ctx.fillStyle = '#FF00FF';
        ctx.fillText(yText, sPos.x, sPos.y - 25 + lineHeight * 2); // Ligne 3: Y
    });
}
    }

    public applyTransformations(commit: boolean): { 
        platforms: Map<number, Platform>, 
        enemies: Map<number, EnemyData>,
        start?: Point,
        goal?: Rect
    } {
        const changes = {
            platforms: new Map<number, Platform>(),
            enemies: new Map<number, EnemyData>(),
            start: undefined as Point | undefined,
            goal: undefined as Rect | undefined
        };

        this.pendingTransforms.forEach((rect, id) => {
            if (id === this.GOAL_ID) {
                changes.goal = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
            } else if (id === this.START_ID) {
                changes.start = { x: rect.x, y: rect.y };
            } else {
                changes.platforms.set(id, { id, ...rect } as Platform);
                changes.enemies.set(id, { id, ...rect } as EnemyData);
            }
        });

        return changes;
    }

    private screenToWorld(sx: number, sy: number, cam: Camera, sw: number, sh: number): Point {
        const scale = cam.w / sw;
        return {
            x: cam.x + sx * scale,
            y: cam.y + sy * scale
        };
    }

    private captureInitialStates(level: Level) {
        this.initialStates.clear();
        this.selectedIds.forEach(id => {
            const item = this.getItem(id, level);
            if (item) {
                const moving = (item as Platform).moving 
                    ? { start: { ...(item as Platform).moving!.start }, end: { ...(item as Platform).moving!.end }, duration: (item as Platform).moving!.duration }
                    : undefined;
                    
                this.initialStates.set(id, { 
                    x: item.x, 
                    y: item.y, 
                    w: item.w, 
                    h: item.h, 
                    rotation: item.rotation || 0,
                    moving
                });
            }
        });
    }

    private getItem(id: number, level: Level): EditorRect | null {
        if (id === this.GOAL_ID) return { ...level.goal, id: this.GOAL_ID, type: 'goal' };
        if (id === this.START_ID) return { x: level.start.x, y: level.start.y, w: 40, h: 40, id: this.START_ID, type: 'start' };
        
        const p = level.platforms.find(p => p.id === id);
        if (p) return p;
        const e = level.enemies?.find(e => e.id === id);
        if (e) return e;
        return null;
    }

    private pickItem(pos: Point, level: Level): (EditorRect) | null {
        // Order: Start/Goal > Enemies > Platforms
        const startBox = { x: level.start.x, y: level.start.y, w: 40, h: 40 };
        if (this.pointInRect(pos, startBox)) return { ...startBox, id: this.START_ID, type: 'start' };
        
        if (this.pointInRect(pos, level.goal)) return { ...level.goal, id: this.GOAL_ID, type: 'goal' };

        if (level.enemies) {
            for (let i = level.enemies.length - 1; i >= 0; i--) {
                const e = level.enemies[i];
                if (this.pointInRect(pos, e)) return e;
            }
        }
        for (let i = level.platforms.length - 1; i >= 0; i--) {
            const p = level.platforms[i];
            if (this.pointInRect(pos, p)) return p;
        }
        
        return null;
    }

    private checkMovingHandles(pos: Point, p: Platform, cam: Camera, screenW: number): InteractionType | null {
        if (!p.moving) return null;
        const scale = cam.w / screenW;
        const handleSizeWorld = 10 * scale; 
        const cx = p.w / 2;
        const cy = p.h / 2;
        
        const check = (targetTopLeft: Point) => 
            Math.abs(pos.x - (targetTopLeft.x + cx)) <= handleSizeWorld && 
            Math.abs(pos.y - (targetTopLeft.y + cy)) <= handleSizeWorld;
            
        if (check(p.moving.start)) return 'MOVE_START';
        if (check(p.moving.end)) return 'MOVE_END';
        
        return null;
    }

    private checkHandles(pos: Point, rect: EditorRect, cam: Camera, screenW: number): InteractionType | null {
        const scale = cam.w / screenW;
        const handleSizeWorld = 10 * scale;
        const rot = rect.rotation || 0;
        const cx = rect.x + rect.w/2;
        const cy = rect.y + rect.h/2;
        const local = this.rotatePoint(pos, {x: cx, y: cy}, -rot);
        const lx = local.x - cx;
        const ly = local.y - cy;
        const hw = rect.w/2;
        const hh = rect.h/2;
        const h = handleSizeWorld; 
        const check = (x: number, y: number) => Math.abs(lx - x) <= h && Math.abs(ly - y) <= h;
        const rotHandleDistWorld = 30 * scale;
        
        if (check(0, -hh - rotHandleDistWorld)) return 'ROTATE';
        if (check(-hw, -hh)) return 'RESIZE_TL';
        if (check(hw, -hh)) return 'RESIZE_TR';
        if (check(-hw, hh)) return 'RESIZE_BL';
        if (check(hw, hh)) return 'RESIZE_BR';
        if (check(0, -hh)) return 'RESIZE_T';
        if (check(0, hh)) return 'RESIZE_B';
        if (check(-hw, 0)) return 'RESIZE_L';
        if (check(hw, 0)) return 'RESIZE_R';
        
        return null;
    }

    private rotatePoint(p: Point, center: Point, angle: number): Point {
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return {
            x: (p.x - center.x) * c - (p.y - center.y) * s + center.x,
            y: (p.x - center.x) * s + (p.y - center.y) * c + center.y
        };
    }

    private pointInRect(p: Point, r: Rect): boolean {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }

    private rectIntersect(r1: Rect, r2: Rect): boolean {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    }
}
