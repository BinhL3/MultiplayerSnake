let express = require("express");
 let http = require('http');
 let socketIO = require('socket.io');

 let app = express();
 let port = 3000;
 let hostname = "localhost";

 app.use(express.static("public"));

 var server = http.createServer(app);
 var io = socketIO(server);

 var players = {};

 io.on('connection', function (socket) {
    let playerId = socket.id;
    console.log(`Player ${playerId} connected`);
    players[playerId] = {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600),
      playerId: playerId
    }
    socket.emit('currentPlayers', players);
    socket.on('disconnect', () => {
      delete players[playerId];
      console.log(`Player ${playerId} disconnected`);
    });
 });

 server.listen(port, hostname, () => {
   console.log(`http://${hostname}:${port}`);
 });