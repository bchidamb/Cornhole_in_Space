import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

class Grid extends Shape {
	// Takes in the number of rows and number of columns and produces a single set of the diagonals of a grid
    constructor(rows, cols) {
        super("position", "normal", "texture_coord");
        for(let i=0; i < cols; i++)
            for(let j=i%2; j < rows; j+=2)
                defs.Square.insert_transformed_copy_into(this, [], Mat4.translation(2*i-cols,0,2*j).times(Mat4.rotation(Math.PI/2.,1,0,0)));
    }
}

class Arrow extends Shape {
    constructor() {
        super("position", "normal", "texture_coord");
        defs.Closed_Cone     .insert_transformed_copy_into( this, [ 4, 10, [[ .67, 1  ], [ 0,1 ]] ], Mat4.translation(   0,   0,  2 ).times( Mat4.scale( .25, .25, .25 ) ) );
        defs.Cylindrical_Tube.insert_transformed_copy_into( this, [ 7, 7,  [[ .67, 1  ], [ 0,1 ]] ], Mat4.translation(   0,   0,  1 ).times( Mat4.scale(  .1,  .1,  2  ) ) );
    }
}

// Makes two seperate grids and allows the user to treat them as a single object
// (Note: This is not a real shape!)
class FullGrid {
    // Produces the full n_rows x n_cols grid
    constructor(n_rows, n_cols, color1 = color(1,1,1,1), color2 = color(0,0,0,1)) {
        this.grid = new Grid(n_rows, n_cols);
        this.rows = n_rows;
        this.materials = {
            phong1: new Material(new defs.Phong_Shader(),
            {color: color1,  ambient: 0.3, diffusivity: 0.5, specularity: 1.0}),
            phong2: new Material(new defs.Phong_Shader(),
            {color: color2,  ambient: 0.3, diffusivity: 0.0, specularity: 1.0}),
        };
    }

    // Draw function: Similar to the draw function for shapes except that it has two optional materials
    draw(context, program_state, model_transform, material1 = this.materials.phong1, material2 = this.materials.phong2) {
        this.grid.draw(context, program_state, model_transform, material1);
        this.grid.draw(context, program_state, model_transform.times(Mat4.rotation(Math.PI,0,1,0)).times(Mat4.translation(+2,0,2*(-this.rows + 1))), material2);
    }
}

export class Background extends Scene {
    constructor() {
        super();

        this.nrows = 50;
        this.ncols = 81; // This value should be odd

        this.shapes = {
            // Declares a Grid of 25 rows and 30 columns (note: default square size is 2x2)
            square: new defs.Square(),
            sphere: new defs.Subdivision_Sphere(5),

            // NOTE: we are assuming that there are an ODD number of columns
            full: new FullGrid(this.nrows, this.ncols, color(1,1,1,1), color(0,0,0,1)),
            arrow: new Arrow(),
            circle: new defs.Regular_2D_Polygon(25,25),
        }

        this.materials = {
            phong: new Material(new defs.Phong_Shader(),
                {color: color(1, 1, 1, 1),  ambient:1, diffusivity: 0, specularity: 1.0,}),
            texture: new Material(new defs.Textured_Phong(),
                {color: color(0, 0, 0, 1),  ambient:1, texture: new Texture("./assets/stars.jpg")}),
            ring: new Material(new Ring_Shader()),
        }

        // REMEMBER so that the sphere is moderately oriented
        this.shapes.sphere.arrays.texture_coord.forEach(p => p.scale_by(25));
        this.controls_setup = false;
        this.reset();

        // Audio files
        this.winAudio = new Audio("./assets/game-victory-sound-effect.mp3");
        this.failAudio = new Audio("./assets/Game-fail-sound-effect.mp3");
        this.launchAudio = new Audio("./assets/Impact-sound-effect.mp3");
    }

    // Reset game state to default state
    reset() {
        this.randomize = true;
        this.mouse = { "from_center": vec( 0,0 ), "released": false, "anchor": undefined, "dx": 0, "dy": 0 };
        this.t_released = 0;
        this.state_id = 0;
        this.target = [1,4];
        this.scale = 4;
        this.gravity = 5;
        this.camera_setting = 0;
        this.camera_movement = 0;
        this.time_scale = 10;
        this.world_size = 250;
        this.hits = 0;
        this.misses = 0;
        this.win_condition = undefined;
        if(this.controls_setup)
            this.update_explanation();
    }

    // Generate a random target position
    rand_target() {
        let visible = false;
        do {
            visible = true;

            let max_dist = (this.world_size / 2) / (2*this.scale) - 1; // make sure that it is not too far
            let x_max = Math.min(max_dist, this.ncols/2);
            this.target[0] = Math.floor(x_max*Math.random());
            if(Math.random() > 0.5)
                this.target[0] = -this.target[0];
            let z_max = Math.min(max_dist, this.nrows);
            let z_min = Math.abs(Math.ceil(this.target[0]*4.0/3.0));

            // For a rough visibility make the z value be greater than |x| value
            this.target[1] = z_min + Math.floor((z_max-z_min)*Math.random());
            let new_x = 2*this.scale * this.target[0];
            let new_z = 2*this.scale * this.target[1] + this.scale;

            // Check if beyond the stars
            if(new_x**2 + new_z**2 >= this.world_size**2) {
                visible = false;
            }
        } while (!visible);
    }

    make_control_panel() {
        this.live_string( box => box.textContent = "Total Hits: " + (this.hits) + ", Total Misses: "+(this.misses)
            + ((this.misses + this.hits !== 0) ? ", Accuracy: " + (this.hits*100.0/(this.misses + this.hits)).toFixed(2) + "%": ""));
        this.new_line();
        this.live_string( box => box.textContent = "Target Coordinates: (" + (-this.target[0]) + ", " + (this.target[1]) + ")");
        this.new_line();
        this.live_string( box => box.textContent = "Tile Size: " + this.scale);
        this.new_line();
        this.live_string( box => box.textContent = "World Size: " + (this.world_size));
        this.new_line();
        this.live_string( box => box.textContent = "Gravity: " + this.gravity);
        this.new_line();
        this.live_string( box => box.textContent = "Speed: " + (this.time_scale/10.).toFixed(2) + "x");
        this.new_line();
        this.live_string( box => {
            box.textContent = "Camera Mode: ";
            if(this.camera_movement === 0) {
                box.textContent += "Static ";
            }
            else if (this.camera_movement === 1) {
                box.textContent += "Watch ";
            }
            else if (this.camera_movement === 2) {
                box.textContent += "Follow ";
            }

            if (this.camera_setting === 0)
                box.textContent += "Standard";
            else if (this.camera_setting === 1)
                box.textContent += "Low";
            else if (this.camera_setting === 2)
                box.textContent += "High";
            else if (this.camera_setting === 3)
                box.textContent += "Left";
            else if (this.camera_setting === 4)
                box.textContent += "Right";
        });
        this.new_line();

        this.key_triggered_button("Reset", ["r"], this.reset);
        this.key_triggered_button("Randomize Target", ["e"], this.rand_target);
        this.key_triggered_button("Automatic Randomization", ["q"], () => {
            this.randomize = !this.randomize;
        });
        this.live_string( box => box.textContent = (this.randomize ? "On": "Off"));
        this.new_line();
        this.key_triggered_button("Target Left", ["a"], () => {
            if(this.state_id !== 2 && this.target[0] < this.ncols/2 - 1)
                this.target[0]++;
        });
        this.key_triggered_button("Target Right", ["d"], () => {
            if(this.state_id !== 2 && this.target[0] > -this.ncols/2 + 1)
                this.target[0]--;
        });
        this.key_triggered_button("Target Forwards", ["w"], () => {
            if(this.state_id !== 2 && this.target[1] < this.nrows - 1)
                this.target[1]++;
        });
        this.key_triggered_button("Target Backwards", ["s"], () => {
            if(this.state_id !== 2 && this.target[1] > 0)
                this.target[1]--;
        });
        this.new_line();
        this.key_triggered_button("Increase Tile Size", [" "], () => {
            if(this.state_id !== 2 && this.scale < 20)
            {
                this.scale++;
                let target_coordinates = vec3(2*this.scale * this.target[0], 2*this.scale * this.target[1] + this.scale);
                if(target_coordinates[0] ** 2 + target_coordinates[1] ** 2 > this.world_size ** 2)
                {
                    this.rand_target();
                }
            }
        });
        this.key_triggered_button("Decrease Tile Size", ["Shift", " "], () => {
            if(this.state_id !== 2 && this.scale > 1)
                this.scale--;
        });
        this.key_triggered_button("Increase World", [","], () => {
            if(this.state_id !== 2 && this.world_size < 750)
                this.world_size+=50;
        });
        this.key_triggered_button("Decrease World", ["."], () => {
            if(this.state_id !== 2 && this.world_size > 100)
            {
                this.world_size-=50;
                let target_coordinates = vec3(2*this.scale * this.target[0], 2*this.scale * this.target[1] + this.scale);
                if(target_coordinates[0] ** 2 + target_coordinates[1] ** 2 > this.world_size ** 2)
                {
                    this.rand_target();
                }
            }
        });

        this.new_line();
        this.key_triggered_button("Increase Gravity", ["g"], () => {
            if(this.state_id !== 2 && this.gravity < 30)
                this.gravity++;
        }, "black");
        this.key_triggered_button("Decrease Gravity", ["h"], () => {
            if(this.state_id !== 2 && this.gravity > 1)
                this.gravity--;
        }, "grey");
        this.new_line();
        this.key_triggered_button("Speed up", ["t"], () => {
            if(this.time_scale < 50)
                this.time_scale++;
        }, "green");
        this.key_triggered_button("Slow Down", ["y"], () => {
            if(this.time_scale > 0)
                this.time_scale--;
        }, "red");
        this.new_line();
        this.key_triggered_button("Camera: Standard", ["0"], () => {
            this.camera_setting = 0;
        });
        this.key_triggered_button("Camera: Low", ["1"], () => {
            this.camera_setting = 1;
        });
        this.key_triggered_button("Camera: High", ["2"], () => {
            this.camera_setting = 2;
        });
        this.key_triggered_button("Camera: Left", ["3"], () => {
            this.camera_setting = 3;
        });
        this.key_triggered_button("Camera: Right", ["4"], () => {
            this.camera_setting = 4;
        });
        this.new_line();
        this.key_triggered_button("Static Camera", ["5"], () => {
            this.camera_movement = 0;
        });
        this.key_triggered_button("Watch Ball", ["6"], () => {
            this.camera_movement = 1;
        });
        this.key_triggered_button("Follow Ball", ["7"], () => {
            this.camera_movement = 2;
        });

    }

	// Attach HTML mouse events to the drawing canvas.
    add_mouse_controls(canvas) {
        // First, measure mouse steering, for rotating the flyaround camera:
        this.mouse = { "from_center": vec( 0,0 ), "released": false, "anchor": undefined };
        const mouse_position = ( e, rect = canvas.getBoundingClientRect() ) =>
                                     vec( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );
        // Set up mouse response. The last one stops us from reacting if the mouse leaves the canvas:
        document.addEventListener( "mouseup",   e => {
            if(this.mouse.anchor !== undefined)
            {
                this.mouse.dx = this.mouse.from_center[0] - this.mouse.anchor[0];
                this.mouse.dy = this.mouse.from_center[1] - this.mouse.anchor[1];
                this.mouse.anchor = undefined;
                this.mouse.from_center.scale_by(0);
                this.t_released = 0;
                this.mouse.released = true;
                this.launchAudio.play();
            }
        });
        canvas.addEventListener( "mousedown", e => { if(this.state_id !== 2) { e.preventDefault(); this.mouse.anchor = mouse_position(e);           this.mouse.released = false; }} );
        canvas.addEventListener( "mousemove", e => { if( this.mouse.anchor ) { this.mouse.from_center = mouse_position(e); }} );
        canvas.addEventListener( "mouseout",  e => { if( !this.mouse.anchor ) this.mouse.from_center.scale_by(0) } );
    }

    display(context, program_state) {
        if (!this.controls_setup) {
            this.add_mouse_controls(context.canvas);
            this.controls_setup = true;
        }

        ////////////////////////////////////
        // Parameters
        ////////////////////////////////////
        let scale = this.scale;

        // In units of the squares on the grid (a square is 2*scale x 2*scale)
        // Note coordinates of target at (target_x, target_z) are x:[2*scale * target_x - scale, 2*scale * target_x + scale], z:[target_z*(2*scale), target_z*(2*scale)+(2*scale)]
        let target_x = this.target[0]; // + left, - right, 0 center: pick a value in sight please positive or negative: 0 is in center
        let target_z = this.target[1]; // >= 0

        // Starting coordinates of the ball
        let x = 0;
        let y = 4;
        let z = 10;

        // Arrow coordinates (where the head is)
        let arrow_xz_angle = -Math.PI/4;
        let arrow_y_angle = Math.PI/4;
        let arrow_mag = 0; 		// Magnitude
        let sh_arrow_mag = 0;
        let pixel_scale = 100; 	// Approximate width of foreground square in pixels

        // Mouse to arrow length scaling
        let arrow_scale = 5;

        // Mouse movement on the screen
        let dx = 0;
        let dy = 0;
        let dz = 0;

        // Mouse to velocity scaling
        let k = 10;

        // Gravity
        let gravity = this.gravity;
        /////////////////////////////////////

        program_state.projection_transform = Mat4.perspective(
                Math.PI / 4, context.width / context.height, 1, 2*this.world_size);

        let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000 * this.time_scale / 10;

        // Note that each square is 2(scale) X 2(scale)
        let target_color = color(0,0,1,1);

        // Move the target to the correct position
        let base_target_transformation = Mat4.translation(0,0.02,scale).times(Mat4.scale(scale,1,scale).times(Mat4.rotation(Math.PI/2, 1,0,0)));
        let target_transformation = Mat4.translation(2*scale * target_x, 0, 2*scale * target_z).times(base_target_transformation);

        // Get target coordinates in 3D
        let target_center = vec3(2*scale * target_x, 0, 2*scale * target_z + scale);

        // Make light over the target
        const light_position = vec4(2*scale * target_x, 5, target_z*(2*scale) + scale, 1);
        program_state.lights = [
            new Light(light_position, target_color, 10**10),
            new Light(vec4(0,-1,0,0), color(0.2,0.2,0.2,0.2), 10**3)
        ];

        // Calculate arrow vector
        if (this.mouse.anchor) 
        {
            this.state_id = 1;
            this.update_explanation();
            let mouse_x = (this.mouse.from_center[0] - this.mouse.anchor[0]) / pixel_scale;
            let mouse_y = (this.mouse.from_center[1] - this.mouse.anchor[1]) / pixel_scale;
            arrow_mag = arrow_scale * Math.sqrt(mouse_x * mouse_x + mouse_y * mouse_y);
            let temp_z = Math.cos(arrow_y_angle) * mouse_y;
            sh_arrow_mag = arrow_scale * Math.sqrt(mouse_x * mouse_x + temp_z * temp_z);
            if(temp_z == 0)
            {
                if(mouse_x > 0)
                    arrow_xz_angle = Math.PI/2;
                else
                    arrow_xz_angle = -Math.PI/2;
            }
            else
                arrow_xz_angle = Math.atan(mouse_x/temp_z);

        }

        let ball_transform = Mat4.translation(x, y, z);
        let shadow_transform = Mat4.translation(x, 0.1, z);

        let ball_x = x;
        let ball_y = y;
        let ball_z = z;

        // Calculate ball velocity from mouse coords
        if (this.mouse.released) 
        {
            this.state_id = 2;
            this.update_explanation();
            let mouse_x = (this.mouse.dx) / pixel_scale;
            let mouse_y = (this.mouse.dy) / pixel_scale;
            dx = mouse_x;
            dy = Math.sin(arrow_y_angle) * mouse_y;
            dz = Math.cos(arrow_y_angle) * mouse_y;
            this.t_released += dt;

            // Calculate the ball's new position
            ball_x = x + k*dx*this.t_released;
            ball_y = y + k*dy*this.t_released - 1/2*gravity*this.t_released*this.t_released;
            ball_z = z + k*dz*this.t_released;

            ball_transform = Mat4.translation(ball_x, ball_y , ball_z);
            shadow_transform = Mat4.translation(ball_x, 0.1, ball_z);
        }

        // Draw ball (if on the grid)
        this.shapes.sphere.draw(context, program_state, ball_transform, this.materials.phong);
        if( ball_z >= 0 && ball_z <= this.nrows * scale * 2
            && ball_x >= -this.ncols*scale && ball_x <= this.ncols*scale)
        {
            this.shapes.circle.draw(context, program_state, shadow_transform.times(Mat4.rotation(Math.PI/2,1,0,0)), this.materials.phong.override({color: color(0,0,0,0.75)}));
        }


        // Check if the ball landed (on the grid)
        if ( ball_y < (target_center[1] + 1) // Assume ball's radius is 1
            && ball_z >= 0 && ball_z <= this.nrows * scale * 2
            && ball_x >= -this.ncols*scale && ball_x <= this.ncols*scale )
        {

            this.last_x = Math.round( ball_x / (2*scale));
            this.last_z = Math.floor( ball_z / (2*scale));

            // Check if the ball hit target
            if ((ball_z) < (target_center[2] + scale) &&
                (ball_z) > (target_center[2] - scale) &&
                (ball_x) < (target_center[0] + scale) &&
                (ball_x) > (target_center[0] - scale))
            {
                this.win_condition = true;
                if(this.randomize)
                    this.rand_target();
                this.winAudio.play();
                this.hits++;
            }
            else 
            {
                this.win_condition = false;
                this.failAudio.play();
                this.misses++;
            }

            this.state_id = 3;
            this.t_released = 0;
            this.mouse.released = false;

            this.update_explanation();
        }
        // Collision with background
        else if ((ball_z)**2 +(ball_y)**2 + (ball_x)**2 >= (this.world_size-1)**2)
        {
            this.win_condition = false;
            this.last_x = undefined; //Math.round( (ball_x) / (2*scale));
            this.last_z = undefined; //Math.floor( (ball_z) / (2*scale));
            this.state_id = 3;
            this.t_released = 0;
            this.mouse.released = false;
            this.update_explanation();
            this.failAudio.play();
            this.misses++;
        }

        // Color where the ball last hit
        if(this.win_condition !== undefined && this.last_x !== undefined && this.last_z !== undefined && (this.last_x != target_x || this.last_z != target_z) && this.last_z >= 0 && this.last_z < this.nrows && this.last_x >= -this.ncols/2 && this.last_x <= this.ncols/2)
        {
            let hit_color = color(0.67,0,0,1);
            if(this.win_condition === true)
            {
                hit_color = color(0,0.67,0,1);
            }

            let base_hit_transformation = Mat4.translation(0,0.01,scale).times(Mat4.scale(scale,1,scale).times(Mat4.rotation(Math.PI/2, 1,0,0)));
            let hit_transformation = Mat4.translation(2*scale * this.last_x, 0, 2*scale * this.last_z).times(base_hit_transformation);
            this.shapes.square.draw(context, program_state, hit_transformation, this.materials.phong.override({color: hit_color}));
        }

        // The grid is on the x/z plane (y=0) with the central square at (x,z) coordinates x: [-scale, scale] X z: [0, 2*scale]
        this.shapes.full.draw(context, program_state, Mat4.translation(scale,0,scale).times(Mat4.scale(scale,1,scale)));

        // Draw target
        this.shapes.square.draw(context, program_state, target_transformation, this.materials.phong.override({color: color(0,0,1,1)}));
        this.shapes.circle.draw(context, program_state, Mat4.scale(1,2.0,1).times(target_transformation.times(Mat4.scale(1,1,1))), this.materials.ring);

        // Draw the stary sky
        this.shapes.sphere.draw(context, program_state, Mat4.scale(this.world_size,this.world_size,this.world_size).times(Mat4.rotation((t/25)%(2*Math.PI), 0,1,0.25)), this.materials.texture.override({ambient : 1-0.5*(Math.sin(t%(2*Math.PI))**4)}));

        // Draw the arrow
        // Correction if arrow points backwards
        let sign = +1;
        if(this.mouse.from_center && this.mouse.anchor && (this.mouse.from_center[1] - this.mouse.anchor[1]) / pixel_scale * Math.sin(arrow_y_angle) < 0)
            sign = -1;
        let arrow_transformation = Mat4.identity();
        arrow_transformation = arrow_transformation.times(Mat4.translation(x, y, z));
        arrow_transformation = arrow_transformation.times(Mat4.rotation(-arrow_y_angle,1,0,0));
        arrow_transformation = arrow_transformation.times(Mat4.rotation(arrow_xz_angle,0,1,0));
        arrow_transformation = arrow_transformation.times(Mat4.scale(1,1,sign*arrow_mag/2));

        let arrow_shadow_transformation = Mat4.identity();
        arrow_shadow_transformation = arrow_shadow_transformation.times(Mat4.translation(x, 0.01, z));
        arrow_shadow_transformation = arrow_shadow_transformation.times(Mat4.rotation(arrow_xz_angle,0,1,0));
        arrow_shadow_transformation = arrow_shadow_transformation.times(Mat4.scale(1,0.05,sign*sh_arrow_mag/2));
        if (this.state_id == 1) 
        {
            this.shapes.arrow.draw(context, program_state, arrow_transformation, this.materials.phong.override({color: color(1.0,0.0,0.0,1)}));
            this.shapes.arrow.draw(context, program_state, arrow_shadow_transformation, this.materials.phong.override({color: color(0,0,0,0.75), specularity : 0.0, diffusivity: 0.0}));
        }

        // Camera Setting and Movement
        // Watch the ball (if the ball is flying)
        if(this.camera_movement === 1 && this.state_id === 2) 
        {
            program_state.set_camera(Mat4.look_at(vec3(ball_x, ball_y + 2.5, ball_z - 20), vec3(ball_x, ball_y , ball_z), vec3(0, 1, 0)));
        }
        // Follow the Ball (if the ball is flying)
        else if(this.camera_movement === 2 && this.state_id === 2)
        {
            const merge_time = 0.75
            let ct = this.t_released - merge_time;
            if(ct > 0)
                program_state.set_camera(Mat4.look_at(vec3(x + k*dx*ct+0.01, y + k*dy*ct - 1/2*gravity*ct**2+0.01, z + k*dz*ct+0.01), vec3(ball_x, ball_y , ball_z), vec3(0, 1, 0)));
            else
                program_state.set_camera(Mat4.look_at(vec3(x/merge_time*this.t_released, y/merge_time*this.t_released, z/merge_time*this.t_released), vec3(ball_x, ball_y , ball_z), vec3(0, 1, 0)));
        }
        // Low view
        else if (this.camera_setting === 1)
        {
            program_state.set_camera(Mat4.look_at(vec3(0, 15, -20), vec3(0, 0, 50), vec3(0, 1, 0)));
        }
        // High view
        else if (this.camera_setting === 2)
        {
            program_state.set_camera(Mat4.look_at(vec3(0, 50, -30), vec3(0, 0, 50), vec3(0, 1, 0)));
        }
        // Left view
        else if (this.camera_setting === 3)
        {
            program_state.set_camera(Mat4.look_at(vec3(+10, 25, -15), vec3(+20, 3, 30), vec3(0, 1, 0)));
        }
        // Right view
        else if (this.camera_setting === 4)
        {
            program_state.set_camera(Mat4.look_at(vec3(-10, 25, -15), vec3(-20, 3, 30), vec3(0, 1, 0)));
        }
        // Else place the camera in the default camera position (Standard view)
        else
        {
            program_state.set_camera(Mat4.look_at(vec3(0, 25, -20), vec3(0, 3, 30), vec3(0, 1, 0)));
        }
    }

    show_explanation(document_element) {
        this.explanation_element = document_element;
        this.explanation_element.innerHTML += `<p> This is a space cornhole game. Click and drag the ball to launch it toward the target </p>`;
    }

    // State if won/loss
    update_explanation() {
        if (this.state_id == 0) 
        {
            this.explanation_element.innerHTML = `<p> This is a space cornhole game. Click and drag the ball to launch it toward the target </p>`;
        }
        else if (this.state_id == 3) 
        {
            if (this.win_condition) 
            {
                this.explanation_element.innerHTML = `<p> Target hit! </p>`;
            }
            else 
            {
                this.explanation_element.innerHTML = `<p> Target missed. Try again </p>`;
            }
        }
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        context.uniform1f(gpu_addresses.animation_time, graphics_state.animation_time / 1000);
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
                PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
                Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        uniform float animation_time;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main(){
            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            point_position = vec4( position, 1.0 );
            center = vec4( 0.0, 0.0, 0.0, 1.0 );
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        return this.shared_glsl_code() + `
        void main(){
            float mod_animation_time = animation_time - float(int(animation_time)/4 * 4); //should get animation_time % 4
            float distance = distance(point_position, center);
            float val1 = sin(6.28318530718 * 1.25 * (distance+mod_animation_time/2.0));
            float val  = 1.0 - val1*val1;
            gl_FragColor = vec4(0.0, val, val, val);
        }`;
    }
}