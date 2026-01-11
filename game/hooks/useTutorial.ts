
import { useState } from 'react';
import { InputState } from '../../types';

export type TutorialPhase = 'MOVE' | 'WAIT_FOR_JUMP' | 'JUMP' | 'DONE' | 'STANDBY';

export function useTutorial() {
    const [phase, setPhase] = useState<TutorialPhase>('STANDBY');

    const update = (input: InputState) => {
        if (phase === 'MOVE') {
            if (input.left || input.right) setPhase('WAIT_FOR_JUMP');
        } else if (phase === 'WAIT_FOR_JUMP') {
            // Logic handled by level specific triggers or timing usually, 
            // but for now we wait for jump in next phase
        } else if (phase === 'JUMP') {
            if (input.jumpPressed) setPhase('DONE');
        }
    };

    const reset = (isTutorialLevel: boolean) => {
        setPhase(isTutorialLevel ? 'MOVE' : 'DONE');
    };

    return { phase, setPhase, update, reset };
}
