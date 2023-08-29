
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


var gridSize = 40;
var gridWidth = config.width / gridSize; 
var gridHeight = config.height / gridSize; 

var game = new Phaser.Game(config)

function preload() {
  this.load.image('snake', 'static/assets/head_up.png');
  this.load.image('apple', 'static/assets/apple.png');
  this.load.image('headUp', 'static/assets/head_up.png');
  this.load.image('body_vertical', 'static/assets/body_vertical.png');
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
        }
    })
})
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
}

function addOtherPlayers(self, playerInfo) {
  const otherPlayer = self.physics.add.image(playerInfo.x, playerInfo.y, 'snake').setOrigin(8, 8).setDisplaySize(40, 40);
  otherPlayer.playerId = playerInfo.playerId
  otherPlayer.setTint(playerInfo.color)
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
      this.physics.add.collider(this.snake, this.apple, handleAppleCollision, null, this);

      let dirKey = Object.keys(this.directions).find(key => this.directions[key].equals(this.snake.currentDirection));

      const currPosition = {
          x: this.snake.x,
          y: this.snake.y,
          direction: dirKey
      };

      if (this.snake.oldPosition && (
          currPosition.x !== this.snake.oldPosition.x ||
          currPosition.y !== this.snake.oldPosition.y)) {
          this.socket.emit('playerMovement', currPosition);
      }

      this.snake.oldPosition = currPosition;
  }
}

function moveSnake() {
  this.snake.x += this.snake.currentDirection.x * gridSize;
  this.snake.y += this.snake.currentDirection.y * gridSize;
}

function handleAppleCollision(snake, apple) {
if (this.appleEatenFlag) {
    return;
}

this.appleEatenFlag = true;
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