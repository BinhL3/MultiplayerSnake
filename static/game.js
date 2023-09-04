var config = {
  type: Phaser.AUTO,
  parent: 'mygame',
  width: 1600,
  height: 1200,
  backgroundColor: '#00000',
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
var score = 0;
var gridWidth = config.width / gridSize; 
var gridHeight = config.height / gridSize; 

var game = new Phaser.Game(config)

var playersData;

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

  this.apples = this.physics.add.group();

  const self = this
  this.socket = io()
  this.otherPlayers = this.physics.add.group()


  this.add.grid(config.width / 2,
                config.height / 2,
                config.width,
                config.height,
                gridSize,
                gridSize,
                0xacd05e
              ).setAltFillStyle(0xb3d665).setOutlineStyle();

  this.add.rectangle(0, 0, config.width, gridSize, 0xFFFFFF).setOrigin(0, 0); 
  this.add.rectangle(0, config.height - gridSize, config.width, gridSize, 0xFFFFFF).setOrigin(0, 0);
  this.add.rectangle(0, 0, gridSize, config.height, 0xFFFFFF).setOrigin(0, 0); 
  this.add.rectangle(config.width - gridSize, 0, gridSize, config.height, 0xFFFFFF).setOrigin(0, 0); 

  manageApples(this, 1);

  this.socket.on('currentPlayers', function (players) {
    playersData = players;
    Object.keys(players).forEach(function (id) {

      if (players[id].playerId === self.socket.id) {
    

        addPlayer(self, players[id])
      
      } else {
        addOtherPlayers(self, players[id])
      }
    });
  });


  this.socket.on('newPlayer', function (playerInfo) {
    addOtherPlayers(self, playerInfo)

    manageApples(self, Object.keys(playersData).length)
    console.log(`Player joined. Total players: ${Object.keys(playersData).length}`)
  });

  this.socket.on('playerDisconnected', function (playerId) {
    self.otherPlayers.getChildren().forEach(function (otherPlayer) {
      if (playerId === otherPlayer.playerId) {
        otherPlayer.destroy()
      }
    });
    manageApples(self, Object.keys(playersData).length);
    console.log(`Player left. Total players: ${Object.keys(playersData).length}`)
  });

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
  
this.socket.on('snakeDead', function (snakeId) {
    if (snakeId === self.socket.id) {
      gameOver(self);
    } else {
      self.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (snakeId === otherPlayer.playerId) {
          if (otherPlayer.segments) {
            otherPlayer.segments.forEach(segment => {
              segment.destroy();
            });
            otherPlayer.segments = [];
          }
          
          otherPlayer.destroy();
        }
      });
    }
  });
  
}

function addPlayer(self, playerInfo) {
  initialSnakeAssetDir = null;
  initialSnakeMovementDir = null;
  if (playerInfo.direction == "UP"){
    initialSnakeAssetDir = "headUp";
    initialSnakeMovementDir = self.directions.UP;
  }else if (playerInfo.direction == "RIGHT"){
    initialSnakeAssetDir = "headRight";
    initialSnakeMovementDir= self.directions.RIGHT;
  }else if (playerInfo.direction == "LEFT"){
    initialSnakeAssetDir = "headLeft";
    initialSnakeMovementDir = self.directions.LEFT;
  }else{
    initialSnakeAssetDir = "headDown";
    initialSnakeMovementDir = self.directions.DOWN;
  }
  self.snake = self.physics.add.image(playerInfo.x, playerInfo.y, initialSnakeAssetDir).setOrigin(0, 0).setDisplaySize(40, 40);
  self.snake.setCollideWorldBounds(true);
  self.snake.setTint(playerInfo.color);
  self.snake.setDrag(1000);
  self.snake.currentDirection = initialSnakeMovementDir;
  self.snake.segments = [];

  self.cameras.main.startFollow(self.snake);
  
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add.image(playerInfo.x, playerInfo.y, 'snake').setOrigin(0, 0).setDisplaySize(40, 40);
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

      if (checkCollisionWithOtherPlayers(this.snake)) {
        gameOver(this);
        return;
      }
    
      handleSelfCollision.call(this);
      handleWallCollision.call(this);
      
      this.physics.add.collider(this.snake, this.apples, handleAppleCollision, null, this);

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

function checkCollisionWithOtherPlayers(player) {
  let headX = player.x;
  let headY = player.y;

  for (const playerId in playersData) {
    const otherPlayer = playersData[playerId];

    if (otherPlayer !== player) {
      for (const segment of otherPlayer.segments) {
        if (segment.x === headX && segment.y === headY) {
          return true;
        }
      }
    }
  }

  return false;
}

function handleWallCollision() {
  const headX = this.snake.x;
  const headY = this.snake.y;

  // Adjusted boundaries considering the gridSize and the snake's origin.
  if (
    headX  < 40  || headX >= config.width - 40 ||
    headY < 40  || headY >= config.height  - 40
  ) {
    gameOver(this);
  }
}
function handleSelfCollision() {
  const headX = this.snake.x;
  const headY = this.snake.y;
  for (const segment of this.snake.segments) {
    if (segment.x === headX && segment.y === headY) {
        gameOver(this);
      return true; 
    }
  }
  return false; 
}

function gameOver(scene) {
 

  if (scene.snake) {
    scene.snake.setVelocity(0, 0);

    if (scene.snake.segments) {
      scene.snake.segments.forEach(segment => {
        segment.setVelocity(0, 0);
      });
    }
  }
  if (snakeAlive){
    const gameOverText = scene.add.text(scene.snake.x, scene.snake.y, 'Game Over', {
      fontSize: '64px',
      fill: '#ff0000'
    });
  
    gameOverText.setOrigin(0.5, 0.5);
    
    const scoreText = scene.add.text(scene.snake.x, scene.snake.y + 70, `Score: ${score}`, {
      fontSize: '32px',
      fill: '#ffffff'
    });
    
    scoreText.setOrigin(0.5, 0.5);
  
  
    scene.time.delayedCall(1000, () => {
  
      gameOverText.destroy();
  
      if (scene.snake && scene.snake.segments) {
        scene.snake.segments.forEach(segment => {
          segment.destroy();
        });
        scene.snake.segments = [];
      }
  
      if (scene.snake) {
        scene.snake.destroy(); 
        scene.snake = null; 
      }
  
    }, [], scene);
  
  
    scene.socket.emit('snakeDead', scene.socket.id);
  }

  snakeAlive = false;
}



function moveSnake() {
  if (!snakeAlive) {
    return;
  }

  const oldHeadX = this.snake.x;
  const oldHeadY = this.snake.y;

  this.snake.x = this.snake.x + this.snake.currentDirection.x * gridSize;
  this.snake.y = this.snake.y+ this.snake.currentDirection.y * gridSize;
 
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

  if (this.snake.segments.length > this.snake.body.length) {
    const removedSegment = this.snake.segments.pop();
    removedSegment.destroy();
  }

}

function handleAppleCollision(snake, apple) {
  if (apple.active) {
    apple.setActive(false).setVisible(false);
    score += 1;
    addApple(this);

    if (this.snake.segments.length % 2 === 0) {
      // Even segment count, use 'body_vertical'
      const newSegment = this.physics.add
        .image(
          this.snake.x - this.snake.currentDirection.x * gridSize,
          this.snake.y - this.snake.currentDirection.y * gridSize,
          'body_vertical'
        )
        .setOrigin(0, 0)
        .setDisplaySize(40, 40)
        .setTint(this.snake.tintTopLeft);
      this.snake.segments.push(newSegment);
    } else {
      // Odd segment count, use 'body_vertical_alt'
      const newSegment = this.physics.add
        .image(
          this.snake.x - this.snake.currentDirection.x * gridSize,
          this.snake.y - this.snake.currentDirection.y * gridSize,
          'body_vertical_alt'
        )
        .setOrigin(0, 0)
        .setDisplaySize(40, 40)
        .setTint(this.snake.tintTopLeft);
      this.snake.segments.push(newSegment);
    }

    this.socket.emit('appleEaten');
  }
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
        .setOrigin(0, 0)
        .setDisplaySize(40, 40)
        .setTint(otherPlayer.tintTopLeft);
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
  if (!segments.length) {
    otherPlayer.segments.forEach(segment => segment.destroy());
    otherPlayer.segments = [];
  }
}

function addApple(scene) {
  let appleX, appleY;
  let isValidLocation = false;

  while (!isValidLocation) {
    appleX = Phaser.Math.Between(1, gridWidth - 2) * gridSize + gridSize / 2;
    appleY = Phaser.Math.Between(1, gridHeight - 2) * gridSize + gridSize / 2;

    isValidLocation = !scene.snake || (
      !scene.snake.segments.some(segment => segment.x === appleX && segment.y === appleY) &&
      !scene.otherPlayers.getChildren().some(player => player.segments.some(segment => segment.x === appleX && segment.y === appleY))
    );
  }

  const apple = scene.physics.add.image(appleX, appleY, 'apple').setDisplaySize(40, 40).setDepth(1);
  scene.apples.add(apple);
}

function removeApple(scene) {
  let appleToRemove = scene.apples.getFirstAlive();
  if (appleToRemove) {
    appleToRemove.destroy();
  }
}

function manageApples(scene, playerCount) {
  let currentAppleCount = scene.apples.countActive(true);
  let applesNeeded = playerCount - currentAppleCount;

  if (applesNeeded > 0) {
    for (let i = 0; i < applesNeeded; i++) {
      addApple(scene);
    }
  } else if (applesNeeded < 0) {
    for (let i = 0; i < Math.abs(applesNeeded); i++) {
      removeApple(scene);
    }
  }
}