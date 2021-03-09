import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

class Grid extends Shape {
	//This is a shape object. It takes in the number of rows and number of columns and produces a single set of the diagonals of a grid
	constructor(rows, cols) {
		super("position", "normal", "texture_coord");
		for(let i=0; i < cols; i++)
		{
				for(let j=i%2; j < rows; j+=2)
				{
					defs.Square.insert_transformed_copy_into(this, [], Mat4.translation(2*i-cols,0,2*j).times(Mat4.rotation(Math.PI/2.,1,0,0)));
				}
		}
	}
}

class Arrow extends Shape {
	constructor()
	{
		super("position", "normal", "texture_coord");
		defs.Closed_Cone     .insert_transformed_copy_into( this, [ 4, 10, [[ .67, 1  ], [ 0,1 ]] ], Mat4.translation(   0,   0,  2 ).times( Mat4.scale( .25, .25, .25 ) ) );
		defs.Cylindrical_Tube.insert_transformed_copy_into( this, [ 7, 7,  [[ .67, 1  ], [ 0,1 ]] ], Mat4.translation(   0,   0,  1 ).times( Mat4.scale(  .1,  .1,  2  ) ) );
	}
}


//Use this not Grid!!!
//Basically makes two seperate grids and allows the user to treat them as a single object (Note: This is not a real shape!!!)
class FullGrid {
	//produces the full n_rows x n_cols grid
	constructor(n_rows, n_cols, color1 = color(1,1,1,1), color2 = color(0,0,0,1)) {
		// constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
		this.grid = new Grid(n_rows, n_cols);
		// this.n_rows = n_rows;
		this.rows = n_rows;
		this.materials = {
			phong1: new Material(new defs.Phong_Shader(),
			{color: color1,  ambient: 0.3, diffusivity: 0.5, specularity: 1.0}),
			phong2: new Material(new defs.Phong_Shader(),
			{color: color2,  ambient: 0.3, diffusivity: 0.0, specularity: 1.0}),
		};
	}

	//the draw function: similar to the draw function for shapes except that it has two optional materials
	draw(context, program_state, model_transform, material1 = this.materials.phong1, material2 = this.materials.phong2)
	{
		this.grid.draw(context, program_state, model_transform, material1);
		this.grid.draw(context, program_state, model_transform.times(Mat4.rotation(Math.PI,0,1,0)).times(Mat4.translation(+2,0,2*(-this.rows + 1))), material2);
	}

}


export class Background extends Scene {

	constructor() {
			// constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
			super();

			this.shapes = {
					//declares a Grid of 25 rows and 30 columns (note: default square size is 2x2)
					square: new defs.Square(),
					sphere: new defs.Subdivision_Sphere(5),

					//NOTE: we are assuming that there are an ODD number of columns
					full: new FullGrid(50, 81, color(1,1,1,1), color(0,0,0,1)),
					arrow: new Arrow(),
					circle: new defs.Regular_2D_Polygon(25,25),
					// axis: new defs.Axis_Arrows()
			}

			this.materials = {
					phong: new Material(new defs.Phong_Shader(),
					{color: color(1, 1, 1, 1),  ambient:1, diffusivity: 0, specularity: 1.0,}),

					texture: new Material(new defs.Textured_Phong(),
					{color: color(0, 0, 0, 1),  ambient:1, texture: new Texture("./assets/stars.jpg")}),

					// star_texture: new Material(new Star_Texture(),
					// {color: color(0, 0, 0, 1),  ambient:1, texture: new Texture("./assets/stars.jpg")}),

					ring: new Material(new Ring_Shader()),

			}
			//REMEMBER so that the sphere is moderately oriented
			this.shapes.sphere.arrays.texture_coord.forEach(p => p.scale_by(25));


	}

	make_control_panel() {
	}

	display(context, program_state) {
			if (!context.scratchpad.controls) {
					this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
					// Define the global camera and projection matrices, which are stored in program_state.
					//perspective
					program_state.set_camera(Mat4.look_at(vec3(0, 22, -20), vec3(0, 0, 30), vec3(0, 1, 0)));

			}
			////////////////////////////////////
			//TODO: Parameters
			////////////////////////////////////
			let scale = 2.5;
			//in units of the squares on the grid (a square is 2*scale x 2*scale)
			//Note coordinates of target at (target_x, target_z) are x:[2*scale * target_x - scale, 2*scale * target_x + scale], z:[target_z*(2*scale), target_z*(2*scale)+(2*scale)]
			let target_x = 1; // + left, - right, 0 center: pick a value in sight please positive or negative: 0 is in center
			let target_z = 7; // >= 0
			//real coordinates of the ball
			let x = 0;
			let y = 0;
			let z = 0;
			//arrow coordinates (where the head is)
			let arrow_xz_angle = -Math.PI/4;
			let arrow_y_angle = Math.PI/4;
			let arrow_mag = 8; //magnitude
			/////////////////////////////////////


			program_state.projection_transform = Mat4.perspective(
					Math.PI / 4, context.width / context.height, 1, 400);


			let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

			let model_transform = Mat4.identity();

			//Note that each square is 2(scale) X 2(scale)
			let target_color = color(0,0,1,1);

			let base_target_transformation = Mat4.translation(0,0.01,scale).times(Mat4.scale(scale,1,scale).times(Mat4.rotation(Math.PI/2, 1,0,0)));
			//move the target to the correct position
			let target_transformation = Mat4.translation(2*scale * target_x, 0, 2*scale * target_z).times(base_target_transformation);


			//make light over the target
			const light_position = vec4(2*scale * target_x, 5, target_z*(2*scale) + scale, 1);
			const light_position1 = vec4(2*scale * target_x + scale*Math.cos(t%(2*Math.PI)), 10, target_z*(2*scale) + scale + scale*Math.sin(t%(2*Math.PI)), 1);
			const light_position2 = vec4(2*scale * target_x - scale*Math.cos(t%(2*Math.PI)), 2.5, target_z*(2*scale) + scale - scale*Math.sin(t%(2*Math.PI)), 1);
			program_state.lights = [new Light(light_position, target_color, 10**10),
				new Light(light_position1, target_color, 10**10),
				new Light(light_position2, target_color, 10**10)];

			//draw ball
			this.shapes.sphere.draw(context, program_state, Mat4.translation(x, y, z), this.materials.phong);
			//The grid is on the x/z plane (y=0) with the central square at (x,z) coordinates x: [-scale, scale] X z: [0, 2*scale]
			this.shapes.full.draw(context, program_state, Mat4.translation(scale,0,scale).times(Mat4.scale(scale,1,scale)));

			//draw target
			this.shapes.square.draw(context, program_state, target_transformation, this.materials.phong.override({color: color(0,0,1,1)}));
			this.shapes.circle.draw(context, program_state, Mat4.scale(1,2.0,1).times(target_transformation.times(Mat4.scale(1,1,1))), this.materials.ring);


			// Draw the stary sky
			this.shapes.sphere.draw(context, program_state, Mat4.scale(200,200,200).times(Mat4.rotation((t/25)%(2*Math.PI), 0,1,0.25)), this.materials.texture.override({ambient : 1-0.5*(Math.sin(t%(2*Math.PI))**4)}));

			//draw the arrow
			let arrow_transformation = Mat4.identity();
			arrow_transformation = arrow_transformation.times(Mat4.rotation(arrow_xz_angle,0,1,0));
			arrow_transformation = arrow_transformation.times(Mat4.rotation(-arrow_y_angle,1,0,0));
			arrow_transformation = arrow_transformation.times(Mat4.scale(1,1,arrow_mag/2));

			this.shapes.arrow.draw(context, program_state, arrow_transformation, this.materials.phong.override({color: color(1,0,0,1)}));
	}
	//TODO state if won/loss
	show_explanation( document_element )
	{ document_element.innerHTML += `<p> This is a space cornhole game. Try to toss the ball onto the target </p>`;
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



// class Star_Texture extends defs.Textured_Phong {
// 	fragment_glsl_code() {
// 			return this.shared_glsl_code() + `
// 					varying vec2 f_tex_coord;
// 					uniform sampler2D texture;
// 					uniform float animation_time;

// 					void main(){

// 							float mod_animation_time = 0.25*animation_time - float(int(0.25*animation_time)/16 * 16); //should get animation_time % 16

// 							vec2 new_coord = vec2(f_tex_coord.x + 2.0*mod_animation_time, f_tex_coord.y);
// 							// Sample the texture image in the correct place:
// 							vec4 tex_color = texture2D( texture, new_coord);
// 							if( tex_color.w < .01 ) discard;

// 							float angle_time = mod_animation_time / 8.0 * 3.14159265359;
// 							float new_ambient = ambient * (1.0-0.5*(sin(angle_time)*sin(angle_time)*sin(angle_time)*sin(angle_time)));
// 							// Compute an initial (ambient) color:
// 							gl_FragColor = vec4( ( tex_color.xyz ) * new_ambient, shape_color.w * tex_color.w );
// 																																			 // Compute the final color with contributions from lights:
// 							gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
// 			} `;
// 	}
// }

