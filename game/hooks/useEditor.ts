
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Platform, Level, Rect, Camera, EnemyData } from '../../types';
import { GameWorld } from '../../engine/core/GameWorld';
import { Renderer } from '../../engine/rendering/Renderer';
import { EditorSystem } from '../../game/systems/EditorSystem';
import { BlockFactory } from '../BlockFactory';
import { EnemyFactory } from '../EnemyFactory';
import { ThemeConfig as VisualConfig } from '../../../config/theme';

import { EnemyConfig } from '../components/EnemyConfiguration';
import { VanishingConfig } from '../components/VanishingPlatform';

interface EditorHookProps {
    isDevMode: boolean;
    currentLevel: Level;
    setCurrentLevel: React.Dispatch<React.SetStateAction<Level>>;
    gameWorldRef: React.MutableRefObject<GameWorld | null>;
    rendererRef: React.MutableRefObject<Renderer | null>;
    editorSystemRef: React.MutableRefObject<EditorSystem | null>; // Changed to Ref
    configs: {
        visual: VisualConfig;

        enemy: EnemyConfig;
        vanishing: VanishingConfig;
    };
}

export function useEditor({
    isDevMode, currentLevel, setCurrentLevel, gameWorldRef, rendererRef, editorSystemRef, configs
}: EditorHookProps) {

    // --- STATE ---
    const [selection, setSelection] = useState<{
        selectedIds: Set<number>,
        selectionBox: Rect | null,
        hoverType: any,
        hoverId: number | null
    }>({ selectedIds: new Set(), selectionBox: null, hoverType: 'NONE', hoverId: null });

    const [editingTextId, setEditingTextId] = useState<number | null>(null);

    // --- REFS ---
    const modifiers = useRef({ shift: false, alt: false, ctrl: false });
    const clipboard = useRef<{ platforms: Platform[], enemies: EnemyData[] }>({ platforms: [], enemies: [] });

    // --- HELPERS ---

    const spawnVisuals = useCallback((p: Platform | EnemyData) => {
        if (!gameWorldRef.current || !rendererRef.current) return;

        if ((p as any).type === 'walker' || (p as any).type === 'new_walker' || (p as any).type === 'drone' || (p as any).type === 'jumper') {
            EnemyFactory.create(p as EnemyData, gameWorldRef.current, currentLevel);
        } else {
            BlockFactory.create(p as Platform, gameWorldRef.current, rendererRef.current, currentLevel.platforms, configs);
        }
    }, [currentLevel, configs]);

    // --- ACTIONS ---

    const handleAddPlatform = useCallback((w: number, h: number, type: any, extra: any, camera: Camera) => {
        const cx = camera.x + camera.w / 2 - w / 2;
        const cy = camera.y + camera.h / 2 - h / 2;
        const newId = Date.now() + Math.random();

        if (type === 'walker' || type === 'new_walker' || type === 'drone' || type === 'jumper') {
            const newEnemy: EnemyData = {
                id: newId,
                x: cx,
                y: cy,
                w, h,
                type: type, // 'walker' or 'drone' or 'jumper'
                ...extra // SPREAD EXTRA CONFIG (Shooters, etc)
            };

            setCurrentLevel(prev => ({
                ...prev,
                enemies: [...(prev.enemies || []), newEnemy]
            }));

            spawnVisuals(newEnemy);
        } else {
            const newP: Platform = {
                id: newId,
                x: cx,
                y: cy,
                w, h,
                type: type || 'platform',
                rotation: 0,
                ...extra
            };

            // Initialize moving waypoints relative to spawn
            if (newP.type === 'moving' && newP.moving) {
                newP.moving.start = { x: cx, y: cy };
                newP.moving.end = { x: cx + 150, y: cy };
            }

            setCurrentLevel(prev => ({
                ...prev,
                platforms: [...prev.platforms, newP]
            }));

            spawnVisuals(newP);
        }

        // Auto-select
        if (editorSystemRef.current) {
            editorSystemRef.current.selectedIds.clear();
            editorSystemRef.current.selectedIds.add(newId);
        }
        setSelection({
            selectedIds: new Set([newId]),
            selectionBox: null,
            hoverType: 'NONE',
            hoverId: null
        });
    }, [setCurrentLevel, spawnVisuals, editorSystemRef]);

    const handleDelete = useCallback(() => {
        if (!editorSystemRef.current) return;
        const sel = editorSystemRef.current.selectedIds;
        if (sel.size === 0) return;

        // Create a snapshot copy of the IDs.
        // This is crucial because 'sel' is a reference to the mutable Set in EditorSystem.
        // If we clear it below before React runs the state update, the filter function would see an empty set.
        const idsToDelete = new Set(sel);

        console.log('[useEditor] Deleting items:', Array.from(idsToDelete));

        // We do NOT manually remove visuals here. 
        // Changing state triggers a full level reload in Game.tsx which handles cleanup.
        // This prevents race conditions and stale reference bugs.

        setCurrentLevel(prev => ({
            ...prev,
            platforms: prev.platforms.filter(p => !idsToDelete.has(p.id)),
            enemies: prev.enemies ? prev.enemies.filter(e => !idsToDelete.has(e.id)) : []
        }));

        editorSystemRef.current.selectedIds.clear();
        setSelection(prev => ({ ...prev, selectedIds: new Set() }));
    }, [editorSystemRef, setCurrentLevel]); // REMOVED currentLevel to prevent listener thrashing

    const handleCopy = useCallback(() => {
        if (!editorSystemRef.current) return;
        const sel = editorSystemRef.current.selectedIds;
        if (sel.size === 0) return;

        // Deep copy selected items
        const platformsToCopy = currentLevel.platforms.filter(p => sel.has(p.id));
        const enemiesToCopy = (currentLevel.enemies || []).filter(e => sel.has(e.id));

        clipboard.current = {
            platforms: platformsToCopy.map(p => JSON.parse(JSON.stringify(p))),
            enemies: enemiesToCopy.map(e => JSON.parse(JSON.stringify(e)))
        };
    }, [editorSystemRef, currentLevel]);

    const handlePaste = useCallback(() => {
        if (clipboard.current.platforms.length === 0 && clipboard.current.enemies.length === 0) return;
        if (!editorSystemRef.current) return;

        const offset = 20;
        const newPlatforms: Platform[] = [];
        const newEnemies: EnemyData[] = [];
        const newIds = new Set<number>();

        clipboard.current.platforms.forEach(item => {
            const newItem = {
                ...item,
                id: Date.now() + Math.random(),
                x: item.x + offset,
                y: item.y + offset
            };
            newPlatforms.push(newItem);
            newIds.add(newItem.id);
            spawnVisuals(newItem);
        });

        clipboard.current.enemies.forEach(item => {
            const newItem = {
                ...item,
                id: Date.now() + Math.random(),
                x: item.x + offset,
                y: item.y + offset
            };
            newEnemies.push(newItem);
            newIds.add(newItem.id);
            spawnVisuals(newItem);
        });

        setCurrentLevel(prev => ({
            ...prev,
            platforms: [...prev.platforms, ...newPlatforms],
            enemies: [...(prev.enemies || []), ...newEnemies]
        }));

        editorSystemRef.current.selectedIds = newIds;
        setSelection(prev => ({ ...prev, selectedIds: newIds }));
    }, [setCurrentLevel, spawnVisuals, editorSystemRef]);

    const handleDuplicate = useCallback(() => {
        handleCopy();
        handlePaste();
    }, [handleCopy, handlePaste]);

    // --- KEY LISTENERS ---

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            modifiers.current = { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };

            if (!isDevMode) return;

            const isCtrl = e.ctrlKey || e.metaKey;

            if (e.key === 'Delete' || e.key === 'Backspace' || e.code === 'KeyD') {
                if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return; // Ignore if typing
                if (e.code === 'KeyD' && isCtrl) return; // Let duplicate handle Ctrl+D
                handleDelete();
            }

            if (isCtrl && e.code === 'KeyC') handleCopy();
            if (isCtrl && e.code === 'KeyV') handlePaste();
            if (isCtrl && e.code === 'KeyD') {
                e.preventDefault();
                handleDuplicate();
            }
        };

        const onKeyUp = (e: KeyboardEvent) => {
            modifiers.current = { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey };
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
        };
    }, [isDevMode, handleDelete, handleCopy, handlePaste, handleDuplicate]);

    return {
        selection,
        setSelection,
        modifiers,
        editingTextId,
        setEditingTextId,
        handleAddPlatform,
        handleDelete,
        handleCopy,
        handlePaste,
        handleDuplicate
    };
}
