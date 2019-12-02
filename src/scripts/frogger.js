// Define a namespace to contain the code for our game within a single global variable
var Frogger = (function() {

  // Locate the main <canvas> element on the page
  var canvas = document.getElementById("canvas"),

      // Get a reference to the <canvas> element's 2-D drawing surface context
      drawingSurface = canvas.getContext("2d"),

      // Locate the background <canvas> element on the page
      backgroundCanvas = document.getElementById("background-canvas"),

      // Get a reference to the background <canvas> element's 2-D drawing surface context
      backgroundDrawingSurface = backgroundCanvas.getContext("2d"),

      // Get a reference to the <canvas> element's width and height, in pixels
      drawingSurfaceWidth = canvas.width,
      drawingSurfaceHeight = canvas.height;

  return {

      // Expose the <canvas> element, its 2-D drawing surface context, its width and
      // its height for use in other code modules
      canvas: canvas,
      drawingSurface: drawingSurface,
      drawingSurfaceWidth: drawingSurfaceWidth,
      drawingSurfaceHeight: drawingSurfaceHeight,

      // Expose the background <canvas> element's 2-D drawing surface context
      backgroundDrawingSurface: backgroundDrawingSurface,

      // Define an object containing references to directions the characters in our game can
      // move in. We define it here globally for use across our whole code base
      direction: {
          UP: "up",
          DOWN: "down",
          LEFT: "left",
          RIGHT: "right"
      },

      // Define the observer design pattern methods subscribe() and publish() to allow
      // application-wide communication without the need for tightly-coupled modules. See
      // Chapter 5 for more information on this design pattern.
      observer: (function() {
          var events = {};

          return {
              subscribe: function(eventName, callback) {

                  if (!events.hasOwnProperty(eventName)) {
                      events[eventName] = [];
                  }

                  events[eventName].push(callback);
              },

              publish: function(eventName) {
                  var data = Array.prototype.slice.call(arguments, 1),
                      index = 0,
                      length = 0;
                  
                  if (events.hasOwnProperty(eventName)) {
                      length = events[eventName].length;

                      for (; index < length; index++) {
                          events[eventName][index].apply(this, data);
                      }
                  }
              }
          };
      }()),

      // Define a method to determine whether two obstacles on the game board intersect
      // each other on the horizontal axis. By passing in two objects, each with a 'left'
      // and 'right' property indicating the left-most and right-most position of each
      // obstacle in pixels on the game board, we establish whether the two intersect
      // each other - if they do, and they are both on the same row as each other on the
      // game board, this can be considered a collision between these two obstacles
      intersects: function(position1, position2) {
          var doesIntersect = false;

          if ((position1.left > position2.left && position1.left < position2.right) ||
              (position1.right > position2.left && position1.left < position2.right)) {
              doesIntersect = true;
          }

          return doesIntersect;
      }
  };
}());


// Create a simple cross-browser polyfill for modern browsers' requestAnimationFrame()
// method to enable smooth, dan animasi efisien dari komputasi. Sumber dari Paul Irish via http://bit.ly/req_anim_frame
window.requestAnimationFrame = (function(){
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback){
        window.setTimeout(callback, 1000 / 60);
    };
})();

(function(Frogger) {

    // Define a variable to hold the current player's score
    var _score = 0,

        // Define and initialize a variable to hold the high score achieved in the game
        _highScore = 1000,

        // Define the number of lives the player has remaining before the game is over
        _lives = 5,

        // Define the number of milliseconds the player has to get their character to
        // the goal (60 seconds). If they take too long, they will lose a life
        _timeTotal = 60000,

        // Define a variable to store the current time remaining for the player to reach
        // the goal
        _timeRemaining = _timeTotal,

        // Define the refresh rate of the graphics on the <canvas> element (one draw every
        // 33⅓ milliseconds = 30 frames per second). Attempting to redraw too frequently
        // can cause the browser to slow down so choose this value carefully to maintain a
        // good balance between fluid animation and smooth playability
        _refreshRate = 33.333,

        // Define a variable to store the number of times the player's character has
        // reached the goal
        _timesAtGoal = 0,

        // Define a variable to indicate the number of times the player's character needs
        // to reach the goal for the game to be won
        _maxTimesAtGoal = 5,

        // Define a Boolean variable to indicate whether the player's movement is currently
        // frozen in place
        _isPlayerFrozen = false,

        // Define a variable to store the last time the game loop ran - this helps keep
        // the animation running smoothly at the defined refresh rate
        _lastTimeGameLoopRan = (new Date()).getTime();

    // Define a function to be called to count down the time remaining for the player to
    // reach the goal without forfeiting a life
    function countDown() {
        if (_timeRemaining > 0) {

            // This function will be called as frequently as the _refreshRate variable
            // dictates so we reduce the number of milliseconds remaining by the
            // _refreshRate value for accurate timing
            _timeRemaining -= _refreshRate;

            // Publish the fact that the remaining time has changed, passing along the
            // new time remaining as a percentage - which will help when we come to display
            // the remaining time on the game board itself
            Frogger.observer.publish("time-remaining-change", _timeRemaining / _timeTotal);
        } else {

            // If the remaining time reaches zero, we take one of the player's remaining
            // lives
            loseLife();
        }
    }

    // Define a function to be called when all the player's lives have gone and the game
    // is declared over
    function gameOver() {

        // Pause the player's movements as they are no longer in the game
        freezePlayer();

        // Inform other code modules in this application that the game is over
        Frogger.observer.publish("game-over");
    }

    // Define a function to be called when the player has reached the goal
    function gameWon() {

        // Inform other code modules that the game has been won
        Frogger.observer.publish("game-won");
    }

    // Define a function to be called when the player loses a life
    function loseLife() {

        // Decrease the number of lives the player has remaining
        _lives--;

        // Pause the player's movements
        freezePlayer();

        // Inform other code modules that the player has lost a life
        Frogger.observer.publish("player-lost-life");

        if (_lives === 0) {

            // Declare the game to be over if the player has no lives remaining
            gameOver();
        } else {

            // If there are lives remaining, wait 2000 milliseconds (2 seconds) before
            // resetting the player's character and other obstacles to their initial
            // positions on the game board
            setTimeout(reset, 2000);
        }
    }

    // Define a function to be called when the player's character is required to be frozen
    // in place, such as when the game is over or when the player has lost a life
    function freezePlayer() {

        // Set the local variable to indicate the frozen state
        _isPlayerFrozen = true;

        // Inform other code modules - including that which controls the player's
        // character - that the player is now be frozen
        Frogger.observer.publish("player-freeze");
    }

    // Define a function to be called when the player's character is free to move after
    // being previously frozen in place
    function unfreezePlayer() {

        // Set the local variable to indicate the new state
        _isPlayerFrozen = false;

        // Inform other code modules that the player's character is now free to move around
        // the game board
        Frogger.observer.publish("player-unfreeze");
    }

    // Define a function to increase the player's score by a specific amount and update
    // the high score accordingly
    function increaseScore(increaseBy) {

        // Increase the score by the supplied amount (or by 0 if no value is provided)
        _score += increaseBy || 0;

        // Inform other code modules that the player's score has changed, passing along
        // the new score
        Frogger.observer.publish("score-change", _score);

        // If the player's new score beats the current high score then update the high
        // score to reflect the player's new score and inform other code modules of a
        // change to the high score, passing along the new high score value
        if (_score > _highScore) {
            _highScore = _score;
            Frogger.observer.publish("high-score-change", _highScore);
        }
    }

    // Define a function to execute once the player reaches the designated goal
    function playerAtGoal() {

        // When the player reaches the goal, increase their score by 1000 points
        increaseScore(1000);

        // Increment the value indicating the total number of times the player's character
        // has reached the goal
        _timesAtGoal++;

        // Freeze the player's character movement temporarily to acknowledge they have
        // reached the goal
        freezePlayer();

        if (_timesAtGoal < _maxTimesAtGoal) {

            // The player must enter the goal a total of 5 times, as indicated by the
            // _maxTimesAtGoal value. If the player has not reached the goal this many
            // times yet, then reset the player's character position and obstacles on the
            // game board after a delay of 2000 milliseconds (2 seconds)
            setTimeout(reset, 2000);
        } else {

            // If the player has reached the goal 5 times, the game has been won!
            gameWon();
        }
    }

    // Define a function to execute when the player moves their character on the game
    // board, increasing their score by 20 points when they do
    function playerMoved() {
        increaseScore(20);
    }

    // Define a function to be called when the game board needs to be reset, such as when
    // the player loses a life
    function reset() {

        // Reset the variable storing the current time remaining to its initial value
        _timeRemaining = _timeTotal;

        // Release the player's character if it has been frozen in place
        unfreezePlayer();

        // Inform other code modules to reset themselves to their initial conditions
        Frogger.observer.publish("reset");
    }

    // The game loop executes on an interval at a rate dictated by value of the
    // _refreshRate variable (once every 50 milliseconds), in which the game board is
    // redrawn with the character and obstacles drawn at their relevant positions on
    // the board and any collisions between the player's character and any obstacles
    // are detected
    function gameLoop() {

        // Calculate how many milliseconds have passed since the last time the game loop
        // was called
        var currentTime = (new Date()).getTime(),
            timeDifference = currentTime - _lastTimeGameLoopRan;

        // Execute this function again when the next animation frame is ready for use by
        // the browser - keeps the game loop looping
        window.requestAnimationFrame(gameLoop);

        // If the number of milliseconds passed exceeds the defined refresh rate, draw
        // the obstacles in the updated position on the game board and check for collisions
        if (timeDifference >= _refreshRate) {

            // Clear the <canvas> element's drawing surface - erases everything on the
            // game board so we can redraw the player's character and obstacles in their
            // new positions
            Frogger.drawingSurface.clearRect(0, 0, Frogger.drawingSurfaceWidth, Frogger.drawingSurfaceHeight);

            if (!_isPlayerFrozen) {

                // As long as the player's character is not frozen in place, ensure the
                // timer is counting down, putting pressure on the player to reach the
                // goal in time
                countDown();

                // Inform other code modules to check the player has not collided with an
                // obstacle on the game board
                Frogger.observer.publish("check-collisions");
            }

            // Now on our empty canvas we draw our game board and the obstacles upon it in
            // their respective positions
            Frogger.observer.publish("render-base-layer");

            // After the game board and obstacles, we draw the player's character so that
            // it is always on top of anything else on the <canvas> drawing surface
            Frogger.observer.publish("render-character");

            // Store the current time for later comparisons to keep the frame rate smooth
            _lastTimeGameLoopRan = currentTime;
        }
    }

    // Define a function to kick-start the application and run the game loop, which renders
    // each frame of the game graphics and checks for collisions between the player's
    // character and any obstacles on the game board
    function start() {

        // Inform other code modules of the initial state of the game's high score
        Frogger.observer.publish("high-score-change", _highScore);

        // Start the game loop running
        gameLoop();
    }

    // Execute the start() function to kick off the game loop once the "game-load" event
    // is fired. We'll trigger this event after we've configured the rest of our code
    // modules for the game
    Frogger.observer.subscribe("game-load", start);

    // Execute the playerAtGoal() function when another code module informs us that the
    // player has reached the goal
    Frogger.observer.subscribe("player-at-goal", playerAtGoal);

    // Execute the playerMoved() function when we have been informed that the player has
    // moved their character
    Frogger.observer.subscribe("player-moved", playerMoved);

    // Execute the loseLife() function when we are informed by another code base that the
    // player's character has collided with an obstacle on the game board
    Frogger.observer.subscribe("collision", loseLife);

// Pass the global Frogger variable into the module so it can be accessed locally,
// improving performance and making its dependency clear
}(Frogger));