# Cornhole in Space

## Members:
<pre>
1. Branda, Daniel          UID: 005108972
2. Chidambaram, Bhairav    UID: 805526084
3. Kaneshige, Thomas       UID: 305110285
4. Prateeq, Kaustuv        UID: 305171127
</pre>

## Introduction and Overview
---
Cornhole in Space is an interactive game similar to a phyiscal game of cornhole.
Just as in the physical version, the player is given a ball that starts from a set position and a target to aim at.
However, instead of a set target (as in the real-life version), the player is given randomly generated target that is 
    marked on a checkerboard.
To better aim the ball, the player may manipulate gravity, the camera position, the size of the spaces, or the size of the world.
If the aforementioned is not sufficient, the player may move the target to a better position or generate a new target.
If the player manages to hit the target, the space will turn green, and a new target will be generated.
If the player misses the target, the space that was incorrectly hit will turn red, and the player will be given another ball.
Finally, the player may choose to reset the game back to the default state at any time.

</br>

## Implementation
---
This game is implemented in a style similar to a finite-state machine. The states are as follows:
1. Idle State
   * The Idle State is the default state of the game. In this state, the player has not yet interacted with the ball.
   * If the player resets the game, the game resets to this state.
   * When player clicks on the ball, the game moves into the User-Input State.
2. User-Input State
   * In this state, the player has clicked on the ball but has not released it yet.
   * This is the state where the player is aiming the ball at the target.
   * When the player releases the ball, the game moves into the Ball-Release State.
3. Ball Release State
   * In this state, the player has released the ball, and the ball is now traveling in the air.
   * When the ball collides with the board or the boundary, the game moves into the Complete State.
4. Complete State
   * In this state, the game calculates the final position of the ball.
   * If the ball collided with the target, a new target is randomly generated.
   * After all calculations are complete, the game resets back to the Idle State.

</br>

The graphics of this game are implemented using a few tricks. 
1. The grid is actually two grids, with each grid comprising half of the full grid.
2. The background is a sphere centered at the origin with a texture applied to it. The game takes place inside it.
3. The target is a square with a circle on top of it, and the circle has a ring shader to yield the movement effect.

</br>

## Advanced Features
---
Here is a brief list of the advanced features implemented in this project.

</br>

### *Collision Detection*
Collision detection is fundamental to this game. 
When the ball is put into play, it will collide with one of two things:
1. The Board
   * The program tracks the distance between the ball's y-coordinate and the board's y-coordinate.
   * If the distance is less than the ball's radius, then the ball has collided with the board.
2. The Boundary
   * The program tracks the distance between the ball and the boundary.
   * If the distance is less than the ball's radius, then the ball has collided with the boundary.

</br>

### *Physics Based Simulation*
The physics of this game is what makes it fun.
When the ball is launched from the starting point, the program uses simple kinematics to determine where the ball lands.
The program uses mouse input to generate some initial velocity vectors which are used to determine the ball's path.
The program assumes there is no air-resistance (since the game takes place in space), so only gravity has any effect on 
    the ball's position after the ball is released.

</br>

## Other Features
---
These are features that are present in the code, but were implemented on a smaller scale.

</br>

### *Mouse Picking*
In order to launch the ball, the program must receive some user input to generate some initial velocity vectors.
The program uses the coordinates of the mouse on screen and converts them into vectors that are used in launching the ball.

</br>

### *Shadowing*
When the ball is launched, a shadow follows it's position on the board.
The program simply projects the ball's position onto the board, which is the plane y=0.

</br>

## References

* For Audio Files</br>
https://www.freesoundslibrary.com/

---
