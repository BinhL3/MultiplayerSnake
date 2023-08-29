var config = {
  type: Phaser.AUTO,
  parent: 'mygame',
  width: 800,
  height: 600,
  backgroundColor: '#ffffff',
  autoCenter: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: { y: 0 }
    }
  },
  scene: { preload, create, update }
}

var snakeAlive = true; 
var gridSize = 40;
var gridWidth = config.width / gridSize; 
var gridHeight = config.height / gridSize; 

var game = new Phaser.Game(config)

function preload() {
  this.load.image('snake', 'static/assets/head_up.png');
  this.load.image('apple', 'static/assets/apple.png');
  this.load.image('headUp', 'static/assets/head_up.png');
  this.load.image('body_vertical', 'static/assets/body_vertical.png');
  this.load.image('body_vertical_alt', 'static/assets/body_vertical_alt.png');
  this.load.image('headDown', 'static/assets/head_down.png');
  this.load.image('headLeft', 'static/assets/head_left.png');
  this.load.image('headRight', 'static/assets/head_right.png');
}

function create() {

  this.directions = {
      UP: new Phaser.Math.Vector2(0, -1),
      DOWN: new Phaser.Math.Vector2(0, 1),
      LEFT: new Phaser.Math.Vector2(-1, 0),
      RIGHT: new Phaser.Math.Vector2(1, 0)
  };

  this.apple = this.physics.add.image(300, 300, 'apple').setDisplaySize(40, 40).setDepth(1);

  const self = this
  this.socket = io()
  this.otherPlayers = this.physics.add.group()

  this.add.grid(config.width / 2, config.height / 2, config.width, config.height, gridSize, gridSize, 0xacd05e).setAltFillStyle(0xb3d665).setOutlineStyle();

  this.socket.on('currentPlayers', function (players) {
    Object.keys(players).forEach(function (id) {
      if (players[id].playerId === self.socket.id) {
        addPlayer(self, players[id])
      } else {
        addOtherPlayers(self, players[id])
      }
    })
  })

  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo)
  })

  this.socket.on('playerDisconnected', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy()
      }
    })
  })

  this.socket.on('applePosition', function(appleData) {
    self.apple.setPosition(appleData.x, appleData.y);
    self.appleEatenFlag = false;
});

  this.cursors = this.input.keyboard.createCursorKeys()

this.socket.on('playerMoved', function (playerInfo) {
  self.otherPlayers.getChildren().forEach(function (otherPlayer) {
    if (playerInfo.playerId === otherPlayer.playerId) {
      otherPlayer.setPosition(playerInfo.x, playerInfo.y);
      const imageKey = getImageForDirection(playerInfo.direction);
      otherPlayer.setTexture(imageKey);
      
      updateOtherPlayerSegments.call(self, otherPlayer, playerInfo.segments);
    }
  });
});

  this.time.addEvent({
      delay: 200,
      callback: moveSnake,
      callbackScope: this,
      loop: true
  });

}

function addPlayer(self, playerInfo) {
  self.snake = self.physics.add.image(playerInfo.x, playerInfo.y, 'headRight').setOrigin(8, 8).setDisplaySize(40, 40);
  self.snake.setCollideWorldBounds(true);
  self.snake.setTint(playerInfo.color);
  self.snake.setDrag(1000);
  self.snake.currentDirection = self.directions.RIGHT;
  self.snake.segments = [];
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add.image(playerInfo.x, playerInfo.y, 'snake').setOrigin(8, 8).setDisplaySize(40, 40);
  otherPlayer.playerId = playerInfo.playerId;
  otherPlayer.setTint(playerInfo.color);
  otherPlayer.segments = [];
  self.otherPlayers.add(otherPlayer)
}

function update() {
  if (this.snake) {
      if (this.cursors.up.isDown && this.snake.currentDirection.y === 0) {
        this.snake.setTexture("headUp");
        this.snake.currentDirection = this.directions.UP;
      } else if (this.cursors.down.isDown && this.snake.currentDirection.y === 0) {
        this.snake.setTexture("headDown");
          this.snake.currentDirection = this.directions.DOWN;
      } else if (this.cursors.left.isDown && this.snake.currentDirection.x === 0) {
        this.snake.setTexture("headLeft");
          this.snake.currentDirection = this.directions.LEFT;
      } else if (this.cursors.right.isDown && this.snake.currentDirection.x === 0) {
        this.snake.setTexture("headRight");
          this.snake.currentDirection = this.directions.RIGHT;
      }
    
      handleSelfCollision.call(this);
      //handleWallCollision.call(this);
      
      this.physics.add.collider(this.snake, this.apple, handleAppleCollision, null, this);

      let dirKey = Object.keys(this.directions).find(key => this.directions[key].equals(this.snake.currentDirection));

      const currPosition = {
          x: this.snake.x,
          y: this.snake.y,
          direction: dirKey,
          segments: this.snake.segments.map(seg => ({ x: seg.x, y: seg.y })),
        };

      if (this.snake.oldPosition && (
          currPosition.x !== this.snake.oldPosition.x ||
          currPosition.y !== this.snake.oldPosition.y)) {
          this.socket.emit('playerMovement', currPosition);
      }

      this.snake.oldPosition = currPosition;
  }
}
function handleWallCollision() {
  const headX = this.snake.x;
  const headY = this.snake.y;

  // Check if the head has hit any of the game boundaries

  if (
    headX < 0 || headX >= config.width ||
    headY < 0 || headY >= config.height
  ) {
    gameOver();
  }
}
function handleSelfCollision() {
  const headX = this.snake.x;
  const headY = this.snake.y;
  // Check if the head collides with any of the body segments
  for (const segment of this.snake.segments) {
    if (segment.x === headX && segment.y === headY) {
        gameOver();
      return true; 
    }
  }
  return false; 
}

function gameOver() {
  snakeAlive = false;

  // Stop snake and segment movement here
  if (this.snake) {
    this.snake.setVelocity(0, 0);

    if (this.snake.segments) {
      this.snake.segments.forEach(segment => {
        segment.setVelocity(0, 0);
      });
    }
  }
}

function moveSnake() {
  if (!snakeAlive) {
    return;
  }

  const oldHeadX = this.snake.x;
  const oldHeadY = this.snake.y;

  this.snake.x += this.snake.currentDirection.x * gridSize;
  this.snake.y += this.snake.currentDirection.y * gridSize;

  let prevX = oldHeadX;
  let prevY = oldHeadY;

  this.snake.segments.forEach(segment => {
    const tempX = segment.x;
    const tempY = segment.y;

    segment.x = prevX;
    segment.y = prevY;

    prevX = tempX;
    prevY = tempY;
  });


  // If the snake's length exceeds its segments, remove the last segment
  if (this.snake.segments.length > this.snake.body.length) {
    const removedSegment = this.snake.segments.pop();
    removedSegment.destroy();
  }

}

function handleAppleCollision(snake, apple) {
  if (this.appleEatenFlag) {
      return;
  }

  this.appleEatenFlag = true;

  if (this.snake.segments.length % 2 ==0){
    const newSegment = this.physics.add
    .image(1, 1, 'body_vertical')
    .setOrigin(8, 8)
    .setDisplaySize(40, 40);
    snake.segments.push(newSegment);
  }else{
    const newSegment = this.physics.add
    .image(1, 1, 'body_vertical_alt')
    .setOrigin(8, 8)
    .setDisplaySize(40, 40);
    snake.segments.push(newSegment);
  }

  this.socket.emit('appleEaten');
}

function getImageForDirection(direction) {
  switch(direction) {
      case 'UP': return 'headUp';
      case 'DOWN': return 'headDown';
      case 'LEFT': return 'headLeft';
      case 'RIGHT': return 'headRight';
  }
}

function updateOtherPlayerSegments(otherPlayer, segments) {
  if (otherPlayer.segments.length < segments.length) {
    for (let i = otherPlayer.segments.length; i < segments.length; i++) {
      const segmentData = segments[i];
      const imageKey = i % 2 === 0 ? 'body_vertical' : 'body_vertical_alt';
      const segment = this.physics.add
        .image(segmentData.x, segmentData.y, imageKey)
        .setOrigin(8, 8)
        .setDisplaySize(40, 40);
      otherPlayer.segments.push(segment);
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const segmentData = segments[i];
    const segment = otherPlayer.segments[i];
    segment.x = segmentData.x;
    segment.y = segmentData.y;
  }

  while (otherPlayer.segments.length > segments.length) {
    const lastSegment = otherPlayer.segments.pop();
    lastSegment.destroy();
  }
}
