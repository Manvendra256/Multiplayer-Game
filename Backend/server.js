/* CONSTANTS AND VARIABLES */
const maxRooms = 100;
let playersInRoom = [];
let playerRoom = {};

/* Initialising the array with zeroes */
for (let i = 0; i < maxRooms; i++) {
  playersInRoom[i] = 0;
}

/* SOCKET IO */

/* cors: origin was used to allow server.js (backend) to take requests from app.js (frontend). Before this there was cors policy error while loading the app.js because server was not allowing to connect. */
const io = require("socket.io")({
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("joinGame", joinGame);
  socket.on("startNewGame", startNewGame);
  socket.on("placedDomino", function (data) {
    socket.to(playerRoom[socket.id]).emit("placeDomino", data);
  });
  socket.on("iWon", function () {
    socket.to(playerRoom[socket.id]).emit("youLost");
  });
  socket.on("disconnect", function () {
    const roomId = playerRoom[socket.id];
    delete playerRoom[socket.id];
    if (roomId == undefined) return;
    playersInRoom[roomId]--;
    socket.to(roomId).emit("otherPlayerDisconnected");
  });

  function joinGame(roomId) {
    if (roomId < 0 || roomId >= maxRooms) {
      socket.emit("invalidRoomId");
    } else if (playersInRoom[roomId] > 1) {
      socket.emit("roomIsFull");
    } else if (playersInRoom[roomId] == 1) {
      socket.emit("youCanJoin");
      socket.join(roomId);
      socket.to(roomId).emit("otherPlayerJoined");
      playerRoom[socket.id] = roomId;
      playersInRoom[roomId] = 2;
    } else {
      socket.emit("roomIsEmpty");
    }
  }
  function startNewGame() {
    for (let i = 0; i < maxRooms; i++) {
      if (playersInRoom[i] === 0) {
        playersInRoom[i] = 1;
        playerRoom[socket.id] = i;
        playersInRoom[i] = 1;
        socket.join(i); /* Joining room i */
        socket.emit("newGameStarts", i);
        break;
      } else if (i === maxRooms - 1) {
        socket.emit("allRoomsFull");
      }
    }
  }
});

/* If using express replace io with server */
io.listen(process.env.PORT || 3000);
