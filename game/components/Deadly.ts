
import { Component } from '../../engine/core/Component';

/**
 * A marker component. 
 * Any GameObject with this component will kill the player upon collision.
 */
export class Deadly extends Component {
    // Logic is handled in the Interaction System (GameEngine collision check)
}
