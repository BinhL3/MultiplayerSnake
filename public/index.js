// Bring in all the scenes
import Phaser from "phaser";
import config from "./config/config.js";
import WaitingRoom from "./scenes/WaitingRoom.js";
import MainGame from "./scenes/MainGame.js"; 

class Game extends Phaser.Game {
  constructor() {
    // Add the config file to the game
    super(config);
    // Add all the scenes
    // << ADD ALL SCENES HERE >>
    this.scene.add("MainGame", MainGame);
    this.scene.add("WaitingRoom", WaitingRoom);
    // Start the game with the mainscene
    // << START GAME WITH MAIN SCENE HERE >>
    this.scene.start("MainGame");
  }
}
// Create new instance of game
window.onload = function () {
  window.game = new Game();
};