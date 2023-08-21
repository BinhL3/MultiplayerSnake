let express = require("express");
let http = require('http');
let socketIO = require('socket.io');

let app = express();
let port = 3000;
let hostname = "localhost";

app.use(express.static("public"));

let server = http.createServer(app);
let io = socketIO(server);

let players = {};

function getRandomPosition() {
  let maxX = 800;
  let maxY = 600;
  return {
    x: Math.floor(Math.random() * maxX),
    y: Math.floor(Math.random() * maxY)
  };
}

function checkCollision(position) {
  for (let playerId in players) {
    let player = players[playerId];
    if (player.x === position.x && player.y === position.y) {
      return true;
    }
  }
  return false;
}

io.on('connection', function (socket) {
    let playerId = socket.id;
    console.log(`Player ${playerId} connected`);

    let spawnPosition;
    do {
      spawnPosition = getRandomPosition();
    } while (checkCollision(spawnPosition));

    players[playerId] = {
      x: spawnPosition.x,
      y: spawnPosition.y,
      movements: [],
      playerId: playerId
    }
    socket.emit('playerId', playerId);

    socket.on('movementUpdate', (data) => {
      players[playerId].x = data.x;
      players[playerId].y = data.y;
      players[playerId].movements.push({ x: data.x, y: data.y });
  
      socket.broadcast.emit('playerPositionUpdate', {
        playerId,
        x: data.x,
        y: data.y,
        movements: players[playerId].movements
      });
    });

    socket.on('disconnect', () => {
      delete players[playerId];
      console.log(`Player ${playerId} disconnected`);
    });
});

server.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});