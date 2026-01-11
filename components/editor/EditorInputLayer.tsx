
import React from 'react';
import { GameEngine } from '../../engine/GameEngine';
import { Level, Camera } from '../../types';

interface EditorInputLayerProps {
    engine: GameEngine;
    cameraRef: React.MutableRefObject<Camera>;
    currentLevel: Level;
    updateCurrentLevel: (action: any) => void;
    editor: any; // Return type from useEditor
}

export const EditorInputLayer: React.FC<EditorInputLayerProps> = ({
    engine,
    cameraRef,
    currentLevel,
    updateCurrentLevel,
    editor
}) => {

    const handleMouseDown = (e: React.MouseEvent) => {
        engine.editorSystem.handleMouseDown(
            e.clientX, 
            e.clientY, 
            currentLevel, 
            cameraRef.current, 
            window.innerWidth, 
            window.innerHeight, 
            10, 
            e.shiftKey
        );
        
        editor.setSelection((prev: any) => ({ 
            ...prev, 
            selectedIds: new Set(engine.editorSystem.selectedIds), 
            hoverType: engine.editorSystem.interactionType 
        }));
    };

    const handleMouseUp = () => {
        const changes = (engine.editorSystem as any).applyTransformations(false);
        
        if (changes.platforms.size > 0 || changes.enemies.size > 0 || changes.start || changes.goal) {
            updateCurrentLevel((prev: Level) => {
                const next = { ...prev };
                if (changes.start) next.start = changes.start;
                if (changes.goal) next.goal = changes.goal;
                
                if (changes.platforms.size > 0) {
                    next.platforms = next.platforms.map((p: any) => {
                        const change = changes.platforms.get(p.id);
                        return change ? { ...p, ...change } : p;
                    });
                }
                
                if (changes.enemies.size > 0 && next.enemies) {
                    next.enemies = next.enemies.map((e: any) => {
                        const change = changes.enemies.get(e.id);
                        return change ? { ...e, ...change } : e;
                    });
                }
                return next;
            });
        }
        engine.editorSystem.handleMouseUp([]);
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        engine.editorSystem.handleMouseDown(
            e.clientX, 
            e.clientY, 
            currentLevel, 
            cameraRef.current, 
            window.innerWidth, 
            window.innerHeight, 
            10, 
            false
        );
        
        editor.setSelection((prev: any) => ({ 
            ...prev, 
            selectedIds: new Set(engine.editorSystem.selectedIds), 
            hoverType: engine.editorSystem.interactionType 
        }));
        
        if (engine.editorSystem.selectedIds.size > 0) { 
            editor.handleDuplicate(); 
        }
    };

    return (
        <div 
            className="absolute inset-0 z-40 outline-none"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            // Prevent context menu on right click to allow for custom tools later
            onContextMenu={(e) => e.preventDefault()} 
        />
    );
};
