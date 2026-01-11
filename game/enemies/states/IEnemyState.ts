
import { EnemyWalker } from '../../components/EnemyWalker';

export interface IEnemyState {
    name: string;
    enter(enemy: EnemyWalker): void;
    update(enemy: EnemyWalker, dt: number, config?: any, input?: any): IEnemyState | null;
    exit(enemy: EnemyWalker): void;
}
