
import React, { useState, useCallback, useEffect } from 'react';
import { Level } from '../../types';
import { LEVELS, HOME_LEVEL } from '../../data/LevelData';
import { StorageManager } from '../../utils/StorageManager';

// Helper for cleaning level data before export/save
export function cleanLevel(level: Level): Level {
    return {
        ...level,
        platforms: level.platforms.map(p => {
            const {
                currentVx, currentVy,
                velocityX, velocityY, movingTimer, // Runtime props
                isVanishing, isVanished, vanishTimer, restoreTimer, // Runtime props
                ...cleanP
            } = p as any;
            return cleanP;
        })
    };
}

export function useLevelManager() {
    const [currentLevelIdx, setCurrentLevelIdx] = useState<number>(0);
    const [activeLevels, setActiveLevels] = useState<Level[]>(LEVELS);
    const [currentLevel, setCurrentLevel] = useState<Level>(HOME_LEVEL);
    const [bestTimes, setBestTimes] = useState<Record<string, number>>({});

    // Load Best Times on mount
    useEffect(() => {
        const savedTimes = StorageManager.getItem('speedcuber_best_times_v1');
        if (savedTimes) {
            try {
                setBestTimes(JSON.parse(savedTimes));
            } catch (e) {
                console.warn("Failed to parse best times", e);
            }
        }
    }, []);

    const selectLevel = useCallback((idx: number) => {
        const lvl = activeLevels[idx];
        if (lvl) {
            setCurrentLevelIdx(idx);
            // Deep copy to ensure fresh state
            setCurrentLevel(JSON.parse(JSON.stringify(lvl)));
        }
    }, [activeLevels]);

    const nextLevel = useCallback(() => {
        if (currentLevelIdx < activeLevels.length - 1) {
            selectLevel(currentLevelIdx + 1);
            return true;
        }
        return false;
    }, [currentLevelIdx, activeLevels.length, selectLevel]);

    const restartLevel = useCallback(() => {
        selectLevel(currentLevelIdx);
    }, [currentLevelIdx, selectLevel]);

    const saveTime = useCallback((time: number) => {
        const levelKey = `${currentLevel.type}_${currentLevel.id}`;
        const oldTime = bestTimes[levelKey] || Infinity;
        
        if (time < oldTime) {
            const newBest = { ...bestTimes, [levelKey]: time };
            setBestTimes(newBest);
            StorageManager.setItem('speedcuber_best_times_v1', JSON.stringify(newBest));
            return true; // New Record
        }
        return false;
    }, [currentLevel, bestTimes]);

    // Wrapper for Editor updates to ensure list consistency
    const updateCurrentLevel = useCallback((action: React.SetStateAction<Level>) => {
        setCurrentLevel(prev => {
            const next = typeof action === 'function' ? (action as (prev: Level) => Level)(prev) : action;
            
            // If strictly editing a known level ID, update the list too
            if (next.id !== -999) {
                setActiveLevels(list => list.map(l => (l.id === next.id && l.type === next.type) ? next : l));
            }
            return next;
        });
    }, []);

    // Helper for Editor "Save All"
    const getCleanLevelsData = useCallback(() => {
        const mergedLevels = activeLevels.map(l => (l.id === currentLevel.id && l.type === currentLevel.type) ? currentLevel : l);
        const cleanLevels = mergedLevels.map(cleanLevel);
        const cleanHome = cleanLevel(currentLevel.id === -999 ? currentLevel : HOME_LEVEL);
        
        return `import { Level } from '../types';\nexport const HOME_LEVEL: Level = ${JSON.stringify(cleanHome, null, 2)};\nexport const LEVELS: Level[] = ${JSON.stringify(cleanLevels, null, 2)};`;
    }, [activeLevels, currentLevel]);

    return {
        currentLevel,
        currentLevelIdx,
        activeLevels,
        bestTimes,
        selectLevel,
        nextLevel,
        restartLevel,
        saveTime,
        updateCurrentLevel,
        setActiveLevels, // Exposed for copy/paste features in editor
        getCleanLevelsData
    };
}
