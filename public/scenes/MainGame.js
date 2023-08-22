import Phaser from "phaser";
import config from "./config/config.js";

var gridSize = 40;
var gridWidth = config.width / gridSize; 
var gridHeight = config.height / gridSize; 

var cursors;

var game = new Phaser.Game(config);

export default class MainGame extends Phaser.Scene {
    constructor() {
      super("MainGame");
      this.state = {};
    }

    preload ()
    {
    this.load.image('grass', 'assets/grass.png');
    this.load.image('food', 'assets/apple.png');
    this.load.image('snake', 'assets/head_up.png');
    }

    create () {
    this.add.grid(config.width / 2, config.height / 2, config.width, config.height, gridSize, gridSize, 0xacd05e).setAltFillStyle(0xb3d665).setOutlineStyle();
    
    //CREATE SOCKET
    this.socket = io();

    //LAUNCH WAITING ROOM
    scene.scene.launch("WaitingRoom", { socket: scene.socket });

    // CREATE OTHER PLAYERS GROUP
    this.otherPlayers = this.physics.add.group();

    // JOINED ROOM - SET STATE
    this.socket.on("setState", function (state) {
      const { roomKey, players, numPlayers } = state;
      scene.physics.resume();

      // STATE
      scene.state.roomKey = roomKey;
      scene.state.players = players;
      scene.state.numPlayers = numPlayers;
    });

    // PLAYERS
    this.socket.on("currentPlayers", function (arg) {
      const { players, numPlayers } = arg;
      scene.state.numPlayers = numPlayers;
      Object.keys(players).forEach(function (id) {
        if (players[id].playerId === scene.socket.id) {
          scene.addPlayer(scene, players[id]);
        } else {
          scene.addOtherPlayers(scene, players[id]);
        }
      });
    });

    this.socket.on("newPlayer", function (arg) {
      const { playerInfo, numPlayers } = arg;
      scene.addOtherPlayers(scene, playerInfo);
      scene.state.numPlayers = numPlayers;
    });

    this.socket.on("playerMoved", function (playerInfo) {
      scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          const oldX = otherPlayer.x;
          const oldY = otherPlayer.y;
          otherPlayer.setPosition(playerInfo.x, playerInfo.y);
        }
      });
    });

    this.socket.on("otherPlayerStopped", function (playerInfo) {
      scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerInfo.playerId === otherPlayer.playerId) {
          otherPlayer.anims.stop(null, true);
        }
      });
    });
    this.cursors = this.input.keyboard.createCursorKeys();

    // DISCONNECT
    this.socket.on("disconnected", function (arg) {
      const { playerId, numPlayers } = arg;
      scene.state.numPlayers = numPlayers;
      scene.otherPlayers.getChildren().forEach(function (otherPlayer) {
        if (playerId === otherPlayer.playerId) {
          otherPlayer.destroy();
        }
      });
    });
  }
  update() {
    const scene = this;
    //MOVEMENT
    if (this.snake) {
      const speed = 225;
      const prevVelocity = this.snake.body.velocity.clone();
      // Stop any previous movement from the last frame
      this.snake.body.setVelocity(0);
      // Horizontal movement
      if (this.cursors.left.isDown) {
        this.snake.body.setVelocityX(-speed);
      } else if (this.cursors.right.isDown) {
        this.snake.body.setVelocityX(speed);
      }
      // Vertical movement
      if (this.cursors.up.isDown) {
        this.snake.body.setVelocityY(-speed);
      } else if (this.cursors.down.isDown) {
        this.snake.body.setVelocityY(speed);
      }
      // Normalize and scale the velocity so that snake can't move faster along a diagonal
      this.snake.body.velocity.normalize().scale(speed);

      // emit player movement
      var x = this.snake.x;
      var y = this.snake.y;
      if (
        this.snake.oldPosition &&
        (x !== this.snake.oldPosition.x ||
          y !== this.snake.oldPosition.y)
      ) {
        this.moving = true;
        this.socket.emit("playerMovement", {
          x: this.snake.x,
          y: this.snake.y,
          roomKey: scene.state.roomKey,
        });
      }
      // save old position data
      this.snake.oldPosition = {
        x: this.snake.x,
        y: this.snake.y,
        rotation: this.snake.rotation,
      };
    }
  }

  addPlayer(scene, playerInfo) {
    scene.joined = true;
    scene.snake = scene.physics.add
      .sprite(playerInfo.x, playerInfo.y, "snake")
      .setOrigin(0.5, 0.5)
      .setSize(30, 40)
      .setOffset(0, 24);
  }
  addOtherPlayers(scene, playerInfo) {
    const otherPlayer = scene.add.sprite(
      playerInfo.x + 40,
      playerInfo.y + 40,
      "snake"
    );
    otherPlayer.playerId = playerInfo.playerId;
    scene.otherPlayers.add(otherPlayer);
  }


}
