
import { IPlayerState } from './IPlayerState';
import { PlayerController } from '../components/PlayerController';
import { InputState } from '../../types';

export class DefaultState implements IPlayerState {
    public name = 'DefaultState [Deprecated]';

    enter(controller: PlayerController, config?: any): void {}

    update(controller: PlayerController, dt: number, input: InputState, config: any): IPlayerState | null {
        return null;
    }

    exit(controller: PlayerController): void {}
}
