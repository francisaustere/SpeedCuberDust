
import { Player, GhostData, GhostFrame, RenderGhost } from '../../types';
import { WORLD_RECORDS } from '../../data/WorldRecordData';
import { StorageManager } from '../../utils/StorageManager';

interface PlaybackState {
    index: number;
    accumulator: number;
    finished: boolean;
}

export class GhostSystem {
    private ghosts: GhostData[] = [];
    private playbackStates: PlaybackState[] = [];
    
    private currentRecording: GhostFrame[] = [];
    private recordingTime: number = 0;
    private currentLevelId: string = ""; // Changed to string to support composite keys (TYPE_ID)
    private isRecording: boolean = false;
    
    private frameAccumulator: number = 0;
    private readonly RECORD_INTERVAL = 2; // Record every X frames
    private readonly STORAGE_KEY = 'minimal_platformer_ghosts_v2'; // Bump version for new ID format
    private readonly MAX_GHOSTS = 20;

    public startLevel(levelId: string, isLevelCompleted: boolean) {
        this.currentLevelId = levelId;
        this.loadGhosts(isLevelCompleted); // Load from storage into active ghosts for this run
        this.startRecording();
    }

    public getGhostCount(): number {
        return this.ghosts.length;
    }

    public update(dt: number, player: Player, isRecordingAllowed: boolean, shouldPlay: boolean) {
        if (!this.currentLevelId) return;

        // 1. Playback
        if (shouldPlay) {
            this.playbackStates.forEach((state, i) => {
                const ghost = this.ghosts[i];
                if (!ghost || ghost.frames.length < 2) return;

                // Stop if we reached the end
                if (state.finished) return;

                // Advance interpolation accumulator
                state.accumulator++;
                
                // If we exceeded the interval, move to next frame index
                if (state.accumulator >= this.RECORD_INTERVAL) {
                    state.accumulator -= this.RECORD_INTERVAL;
                    state.index++;
                    
                    // Stop at last frame (No Looping)
                    if (state.index >= ghost.frames.length - 1) {
                        state.index = ghost.frames.length - 1;
                        state.finished = true;
                    }
                }
            });
        }

        // 2. Recording
        // Only record if the game logic says we are recording AND the player has started moving (timer started)
        if (this.isRecording && isRecordingAllowed && shouldPlay) {
            this.recordingTime += dt;
            this.frameAccumulator++;
            
            if (this.frameAccumulator >= this.RECORD_INTERVAL) {
                this.frameAccumulator = 0;
                this.currentRecording.push({
                    x: player.x,
                    y: player.y
                });
            }
        }
    }

    public stopRecording(completed: boolean) {
        if (!this.isRecording) return;
        this.isRecording = false;

        // Only save if we have data
        if (this.currentRecording.length > 5) { // Minimum frames to be worth saving
            
            // Round coordinates to 1 decimal place to save space
            const optimizedFrames = this.currentRecording.map(f => ({
                x: Math.round(f.x * 10) / 10,
                y: Math.round(f.y * 10) / 10
            }));

            const newGhost: GhostData = {
                id: Math.random().toString(36).substring(2, 11),
                levelId: this.currentLevelId,
                frames: optimizedFrames,
                totalTime: Math.round(this.recordingTime * 100) / 100, // Round to 2 decimals
                completed: completed,
                timestamp: Date.now()
            };
            
            this.saveGhost(newGhost);
        }
        
        this.currentRecording = [];
        this.recordingTime = 0;
    }

    // Called when Level Complete screen is shown
    public pruneNonBestGhosts() {
        if (!this.currentLevelId) return;

        try {
            const raw = StorageManager.getItem(this.STORAGE_KEY);
            if (!raw) return;
            
            let allGhosts: Record<string, GhostData[]> = JSON.parse(raw);
            const levelGhosts = allGhosts[this.currentLevelId] || [];
            
            const best = this.findBestGhostInArray(levelGhosts);
            
            if (best) {
                // Keep only the best ghost
                allGhosts[this.currentLevelId] = [best];
            } else {
                // No completed runs? Maybe keep nothing or keep all.
                // Request says: "Delete all data about ghost (a part from the best ghost which is saved)"
                // If there is no best ghost (completed run), we delete everything.
                allGhosts[this.currentLevelId] = [];
            }
            
            StorageManager.setItem(this.STORAGE_KEY, JSON.stringify(allGhosts));
            
            // Update current memory state to match
            this.loadGhosts(true); // Level is completed if we are pruning
            
        } catch (e) {
            console.warn("Failed to prune ghosts", e);
        }
    }

    public getRenderGhosts(playerW: number, playerH: number): RenderGhost[] {
        const bestId = this.getBestGhostId();
        
        return this.ghosts.map((g, i) => {
            const state = this.playbackStates[i];
            
            if (state.finished) return null; // Hide ghost when finished
            if (g.frames.length === 0) return null;
            if (g.frames.length === 1) {
                return { x: g.frames[0].x, y: g.frames[0].y, w: playerW, h: playerH, isBest: g.id === bestId };
            }

            // Interpolation Logic
            const currentIndex = state.index;
            // Clamp next index to avoid overflow
            const nextIndex = Math.min(currentIndex + 1, g.frames.length - 1);
            
            const currentFrame = g.frames[currentIndex];
            const nextFrame = g.frames[nextIndex];
            
            // Calculate interpolation factor (0.0 to 1.0)
            const alpha = state.accumulator / this.RECORD_INTERVAL;
            
            const x = currentFrame.x + (nextFrame.x - currentFrame.x) * alpha;
            const y = currentFrame.y + (nextFrame.y - currentFrame.y) * alpha;

            return {
                x: x,
                y: y,
                w: playerW,
                h: playerH,
                isBest: g.id === bestId
            };
        }).filter(g => g !== null) as RenderGhost[];
    }
    
    private startRecording() {
        this.currentRecording = [];
        this.recordingTime = 0;
        this.frameAccumulator = 0;
        this.isRecording = true;
    }

    private loadGhosts(isLevelCompleted: boolean) {
        this.ghosts = [];
        
        // 1. Load Local
        try {
            const raw = StorageManager.getItem(this.STORAGE_KEY);
            if (raw) {
                const allGhosts: Record<string, GhostData[]> = JSON.parse(raw);
                if (allGhosts[this.currentLevelId]) {
                    this.ghosts.push(...allGhosts[this.currentLevelId]);
                }
            }
        } catch (e) {
            console.warn("Failed to load ghosts", e);
        }

        // 2. Load World Records (Developer Ghosts)
        // Only if level is completed
        if (isLevelCompleted) {
            const wrGhosts = WORLD_RECORDS[this.currentLevelId];
            if (wrGhosts && Array.isArray(wrGhosts)) {
                const existingIds = new Set(this.ghosts.map(g => g.id));
                wrGhosts.forEach(wr => {
                    if (!existingIds.has(wr.id)) {
                        this.ghosts.push(wr);
                    }
                });
            }
        }

        this.resetPlaybackStates();
    }
    
    private resetPlaybackStates() {
        this.playbackStates = this.ghosts.map(() => ({
            index: 0,
            accumulator: 0,
            finished: false
        }));
    }

    private saveGhost(newGhost: GhostData) {
        try {
            let allGhosts: Record<string, GhostData[]> = {};
            const raw = StorageManager.getItem(this.STORAGE_KEY);
            if (raw) {
                allGhosts = JSON.parse(raw);
            }
            
            if (!allGhosts[this.currentLevelId]) {
                allGhosts[this.currentLevelId] = [];
            }
            
            const currentLevelGhosts = allGhosts[this.currentLevelId];
            currentLevelGhosts.push(newGhost);
            
            // LIMIT LOGIC
            if (currentLevelGhosts.length > this.MAX_GHOSTS) {
                const best = this.findBestGhostInArray(currentLevelGhosts);
                
                // Candidates to remove (excluding the absolute best)
                let candidates = currentLevelGhosts;
                if (best) {
                    candidates = currentLevelGhosts.filter(g => g.id !== best.id);
                }

                // If we have candidates to remove
                if (candidates.length > 0) {
                    // Separate into Incomplete and Complete
                    const incomplete = candidates.filter(g => !g.completed);
                    const complete = candidates.filter(g => g.completed);
                    
                    let idToRemove: string | null = null;
                    
                    if (incomplete.length > 0) {
                        // Sort by totalTime ASC (Shortest life = First to die)
                        incomplete.sort((a, b) => a.totalTime - b.totalTime);
                        // Remove the shortest life
                        idToRemove = incomplete[0].id;
                    } else if (complete.length > 0) {
                        // Sort by totalTime DESC (Longest time = Slowest run)
                        complete.sort((a, b) => b.totalTime - a.totalTime);
                        // Remove the slowest
                        idToRemove = complete[0].id;
                    }
                    
                    if (idToRemove) {
                        allGhosts[this.currentLevelId] = currentLevelGhosts.filter(g => g.id !== idToRemove);
                    } else {
                        // Fallback: Just remove oldest by timestamp if logic fails
                        currentLevelGhosts.sort((a, b) => a.timestamp - b.timestamp);
                        allGhosts[this.currentLevelId] = currentLevelGhosts.slice(1);
                    }
                } else {
                     allGhosts[this.currentLevelId] = currentLevelGhosts.slice(currentLevelGhosts.length - this.MAX_GHOSTS);
                }
            }

            StorageManager.setItem(this.STORAGE_KEY, JSON.stringify(allGhosts));
        } catch (e) {
            console.warn("Failed to save ghost", e);
        }
    }

    private getBestGhostId(): string | null {
        const best = this.findBestGhostInArray(this.ghosts);
        return best ? best.id : null;
    }

    private findBestGhostInArray(list: GhostData[]): GhostData | null {
        // Only consider completed runs for "Best Ghost"
        const completed = list.filter(g => g.completed);
        if (completed.length === 0) return null;
        
        // Sort by time ascending
        completed.sort((a, b) => a.totalTime - b.totalTime);
        return completed[0];
    }
}
