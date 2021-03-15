import {defs, tiny} from '../examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

const gamestate = {};

export {gamestate};

const GameState = gamestate.GameState =
class GameState {

    constructor(scene, physicsEngine, target_coords) {
        /* Arguments:
         *     scene -- scene class which extends Scene
         *     physicsEngine -- class which handles ball trajectory
         *     target_coords -- target, specified as [x1, z1, x2, z2] with (x1 < x2), (z1 < z2)
         *
         * Creates a game state class for handling Cornhole in Space with the
         * following states.
         *     0 -- idle
         *     1 -- taking input
         *     2 -- running
         *     3 -- complete
         */

        this.state_id = 0;
        this.scene = scene;
        this.physicsEngine = physicsEngine;
        this.display_message = "This is a space cornhole game. Try to toss the ball onto the target";
        this.controls_setup = false;
        this.x1 = target_coords[0];
        this.z1 = target_coords[1];
        this.x2 = target_coords[2];
        this.z2 = target_coords[3];
    }

    add_mouse_controls( canvas )
    {                                       // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
                                            // First, measure mouse steering, for rotating the flyaround camera:
        this.mouse = { "from_center": vec( 0,0 ) };
        const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) =>
                                     vec( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
                                  // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
        document.addEventListener( "mouseup",   e => { this.mouse.anchor = undefined; } );
        canvas  .addEventListener( "mousedown", e => { e.preventDefault(); this.mouse.anchor      = mouse_position(e); } );
        canvas  .addEventListener( "mousemove", e => { e.preventDefault(); this.mouse.from_center = mouse_position(e); } );
        canvas  .addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale_by(0) } );
    }

    update(context, program_state) {
        // scene should call this once per frame
        if (!this.controls_setup) {
            this.controls_setup = true;
            this.add_mouse_controls(context.canvas);
        }

        if ((this.state_id == 0) && this.get_mouse_click()) {
            this.state_id = 1;
        }
        else if ((this.state_id == 1) && (!this.get_mouse_click())) {
            this.set_mouse_coords();
            this.state_id = 2;
        }
        else if (this.state_id == 2) {
            ball_coords = this.physicsEngine.get_ball_coords();
            ball_radius = this.physicsEngine.get_ball_radius();
            if ((ball_coords[1] - ball_radius) < 0) {
                this.state_id = 3;
                if ((ball_coords[0] >= this.x1) && (ball_coords[0] < this.x2) && (ball_coords[2] >= this.z1) && (ball_coords[2] < this.z2)) {
                    this.display_message = "Target Hit!";
                    this.win_condition = true;
                }
                else {
                    this.display_message = "Target Missed";
                    this.win_condition = false;
                }
            }
        }
    }

    reset() {
        // Resets the game state to idle
        // scene should have a key triggered button which calls this function

        this.state_id = 0;
        this.display_message = "This is a space cornhole game. Try to toss the ball onto the target";
        this.mouse.from_center = vec(0, 0);
    }

    get_mouse_click() {
        return (this.mouse.anchor == undefined);
    }

    set_mouse_coords() {
        this.mouse_coords = vec(this.mouse.from_center[0], this.mouse.from_center[1]);
    }

    get_mouse_coords() {
        // Returns the mouse coordinates as an array
        // physics engine should call this to calculate initial ball velocity

        return this.mouse_coords;
    }

    get_display_message() {
        // Returns the display message as a string once the ball has landed
        // scene should call this every frame

        return this.display_message;
    }

    get_win_condition() {
        // Returns 1 if the target was hit, 0 if missed, -1 if game state is not complete
        // scene should call this every frame

        if (!(this.state_id == 3)) {
            return -1;
        }
        else if (this.win_condition) {
            return 1;
        }
        else {
            return 0;
        }
    }

}
