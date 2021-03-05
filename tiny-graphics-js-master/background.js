import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene, Texture
} = tiny;

class Grid extends Shape {
	constructor(rows, cols) {
		super("position", "normal", "texture_coord");
		for(let i=0; i < rows; i++)
		{
				for(let j=i%2; j < cols; j+=2)
				{
					defs.Square.insert_transformed_copy_into(this, [], Mat4.translation(2*i-rows,0,2*j).times(Mat4.rotation(Math.PI/2.,1,0,0)));
				}
		}
	}
}


class FullGrid {
	constructor(n_rows, n_cols, color1 = color(1,1,1,1), color2 = color(0,0,0,1)) {
		// constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
		this.grid = new Grid(n_rows, n_cols);
		// this.n_rows = n_rows;
		this.n_cols = n_cols;
		this.materials = {
			phong1: new Material(new defs.Phong_Shader(),
			{color: color1,  ambient:1}),
			phong2: new Material(new defs.Phong_Shader(),
			{color: color2,  ambient:1}),
		};
	}
	draw(context, program_state, model_transform, material1 = this.materials.phong1, material2 = this.materials.phong2)
	{
		this.grid.draw(context, program_state, model_transform, material1);
		this.grid.draw(context, program_state, model_transform.times(Mat4.rotation(Math.PI,0,1,0)).times(Mat4.translation(+2,0,2*(-this.n_cols + 1))), material2);
	}

}


class Square_Outline extends Shape {
	constructor(rows, cols, x_scale, z_scale) {
			super("position", "color");
			this.arrays.position = Vector3.cast(
					// [1, 1, 0],
					// [-1, 1, 0],
					// [1, -1, 0],
					// [-1, -1, 0]
					[1, 1, 0], [-1, 1, 0],
					[1, 1, 0], [1, -1, 0],
					[-1, -1, 0], [-1, 1, 0],
					[-1, -1, 0], [1, -1, 0]
			);
			const white_color = color(1,1,1,1);
			this.arrays.color = [
			white_color, white_color,
			white_color, white_color
			];
			this.indices.push(0,1,2,3,4,5,6,7);
			// this.indices.push(0, 1, 0, 2, 1, 3, 2, 3);
	}
}
class Grid_Outline extends Shape {
	constructor(rows, cols, x_scale = 1, z_scale = 1) {
		super("position", "normal", "texture_coord");
		for(let i=0; i < rows; i++)
		{
				for(let j=0; j < cols; j++)
				{
					Square_Outline.insert_transformed_copy_into(this, [], Mat4.translation(2*i-rows,0,2*j).times(Mat4.rotation(Math.PI/2.,1,0,0)).times(Mat4.scale(x_scale,1,z_scale)));
				}
		}
	}
}


export class GridDemo extends Scene {
	/**
	 *  **Base_scene** is a Scene that can be added to any display canvas.
	 *  Setup the shapes, materials, camera, and lighting here.
	 */
	constructor() {
			// constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
			super();

			this.shapes = {
					grid: new Grid(25,30),
					square: new defs.Square(),
					sphere: new defs.Subdivision_Sphere(5),
					full: new FullGrid(25, 40, color(1,1,1,1), color(0,0,0,1))
					// outline: new Grid_Outline(25,30)
			}

			this.materials = {
					phong: new Material(new defs.Phong_Shader(),
					{color: color(1, 1, 1, 1),  ambient:1}),
					texture: new Material(new defs.Textured_Phong(),
					{color: color(0, 0, 0, 1),  ambient:1, texture: new Texture("./assets/stars.jpg")}),
					white: new Material(new defs.Basic_Shader())
			}
			this.shapes.sphere.arrays.texture_coord.forEach(p => p.scale_by(50));

//			this.initial_camera_location = Mat4.look_at(vec3(0, 15, -5), vec3(0, 5, 10), vec3(0, 1, 0));
			// this.initial_camera_location = Mat4.look_at(vec3(0, 0, 5), vec3(0, 0, 0), vec3(0, 1, 0));

	}

	make_control_panel() {
			// TODO:  Implement requirement #5 using a key_triggered_button that responds to the 'c' key.
			this.key_triggered_button("Stop/Start Rotation", ["c"], () => {
			});
	}

	display(context, program_state) {
			if (!context.scratchpad.controls) {
					this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
					// Define the global camera and projection matrices, which are stored in program_state.
					//perspective
					program_state.set_camera(Mat4.look_at(vec3(0, 10, -5), vec3(0, 0, 25), vec3(0, 1, 0)));

			}

			program_state.projection_transform = Mat4.perspective(
					Math.PI / 4, context.width / context.height, 1, 400);

			const light_position = vec4(10, 10, 10, 1);
			program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

			let t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

			let model_transform = Mat4.identity();





			this.shapes.full.draw(context, program_state, Mat4.translation(0,-2.5,0).times(Mat4.scale(2.5,1,2.5)));
			// this.shapes.grid.draw(context, program_state, model_transform, this.materials.phong);
			// this.shapes.grid.draw(context, program_state, Mat4.rotation(Math.PI,0,1,0).times(Mat4.translation(+2,0,-58)), this.materials.phong.override({color : color(1,0,0,1)}));
			// this.shapes.outline.draw(context, program_state, model_transform, this.materials.white); //TODO??
			this.shapes.sphere.draw(context, program_state, Mat4.scale(200,200,200), this.materials.texture);
	}
}
