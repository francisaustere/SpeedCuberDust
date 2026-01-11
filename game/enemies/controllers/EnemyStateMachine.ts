import { IEnemyController } from '../../../types/EnemyTypes';

export interface IState {
    name: string;
    enter(agent: IEnemyController): void;
    update(agent: IEnemyController, dt: number): IState | null;
    exit(agent: IEnemyController): void;
}

export class EnemyStateMachine {
    private agent: IEnemyController;
    private currentState: IState | null = null;

    constructor(agent: IEnemyController) {
        this.agent = agent;
    }

    public start(initialState?: IState) {
        if (initialState) {
            this.changeState(initialState);
        }
    }

    public update(dt: number) {
        if (this.currentState) {
            const nextState = this.currentState.update(this.agent, dt);
            if (nextState) {
                this.changeState(nextState);
            }
        }
    }

    public changeState(newState: IState) {
        if (this.currentState) {
            this.currentState.exit(this.agent);
        }
        this.currentState = newState;
        console.log(`Enemy ${this.agent.id} entering state: ${newState.name}`);
        this.currentState.enter(this.agent);
    }

    public getCurrentStateName(): string {
        return this.currentState ? this.currentState.name : 'None';
    }
}
