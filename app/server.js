let express = require("express");
let http = require('http');
let socketIO = require('socket.io');

let app = express();
let port = 3000;
let hostname = "localhost";

app.use(express.static("public"));

var server = http.createServer(app);
var io = socketIO(server);

io.on('connection', function (socket) {
  let playerId = socket.id;
  console.log(`Player ${playerId} connected`);

  socket.on('disconnect', () => {
    console.log(`Player ${playerId} disconnected`);
  });
});

app.listen(port, hostname, () => {
  console.log(`http://${hostname}:${port}`);
});