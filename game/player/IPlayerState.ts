
import { InputState } from '../../types';
import { PlayerController } from '../components/PlayerController';

export interface IPlayerState {
    name: string;
    enter(controller: PlayerController, config?: any): void;
    update(controller: PlayerController, dt: number, input: InputState, config: any): IPlayerState | null;
    exit(controller: PlayerController): void;
}
