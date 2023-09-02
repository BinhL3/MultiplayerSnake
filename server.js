
const express = require('express')
const http = require('http')
const path = require('path')
const socketIO = require('socket.io')

const app = express()
var server = http.Server(app)
var io = socketIO(server, {
  pingTimeout: 60000,
})

app.set('port', 3000)
app.use('/static', express.static(__dirname + '/static'))

app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'main.html'))
})

app.get('/index.html', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'))
})

server.listen(3000, function () {
  console.log('http://localhost:3000')
})

const gridSize = 40;
const gridWidth = 1600 / gridSize;
const gridHeight = 1200 / gridSize;


function getRandomX() {
  return Math.floor(Math.random() * gridWidth) * gridSize + gridSize/2;
}

function getRandomY() {
  return Math.floor(Math.random() * gridHeight) * gridSize + gridSize/2;
}

let apple = {
  x: getRandomX(),
  y: getRandomY()
};

var players = {}

io.on('connection', function (socket) {

  players[socket.id] = {
    x: 40,
    y: 40,
    direction: "UP",
    playerId: socket.id,
    color: getRandomColor(),
    segments: []
  }

 

  socket.emit('currentPlayers', players)
  socket.broadcast.emit('newPlayer', players[socket.id])
  socket.emit('applePosition', apple);
  socket.on('disconnect', function () {
    console.log('player [' + socket.id + '] disconnected')
    delete players[socket.id]
    io.emit('playerDisconnected', socket.id)
  })

  socket.on('appleEaten', function() {
    apple.x = getRandomX();
    apple.y = getRandomY();
    io.emit('applePosition', apple);
  });

  socket.on('playerMovement', function (movementData) {

    players[socket.id].x = movementData.x
    players[socket.id].y = movementData.y
    players[socket.id].direction = movementData.direction
    players[socket.id].segments = movementData.segments;
    socket.broadcast.emit('playerMoved', players[socket.id])

  })

  socket.on('snakeDead', function (snakeId) {
    io.emit('snakeDead', snakeId);    
  });

  socket.on('setUsername', function (name) {
    players[socket.id].username = name;
  });

  socket.on('respawn', function (respawnData) {
    players[socket.id] = {
      x: respawnData.x,
      y: respawnData.y,
      direction: respawnData.direction,
      playerId: socket.id,
      color: getRandomColor(),
      segments: respawnData.segments
    };
  
    io.emit('currentPlayers', players);
  });
})

function getRandomColor() {
  return '0x' + Math.floor(Math.random() * 16777215).toString(16)
}
