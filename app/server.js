let axios = require("axios");
let express = require("express");
let app = express();
let port = 3000;
let hostname = "localhost";

app.use(express.static("public"));

var server = require('http').Server(app);
var io = require('socket.io')(server);
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
      console.log('user disconnected');
    });
  });
server.listen(8081, function () {
    console.log(`Listening on ${server.address().port}`);
  });