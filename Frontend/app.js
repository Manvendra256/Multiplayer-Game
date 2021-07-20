/* CONSTANTS AND VARIABLES */
const board = document.querySelector(".board");
const startBtn = document.querySelector(".start");
const joinBtn = document.querySelector("#submitBtn");
const roomIdInput = document.querySelector("#roomId");
const homepage = document.querySelector("#homepage");
const gameScreen = document.querySelector("#gameScreen");
const waitScreen = document.querySelector("#waitScreen");
const countdownScreen = document.querySelector("#countdownScreen");
const reloadScreen = document.querySelector("#reloadScreen");
const message = reloadScreen.querySelector("#message");
const reloadBtn = reloadScreen.querySelector("button");
const whoseTurn = document.querySelector("#whoseTurn");
const noOfRows = 6;
const noOfColumns = 6; /* As of now, have only configured CSS to work when noOfRows = noOfColumns. If both are not equal then there would be a problem in display of the board.*/
let currScreen = homepage;
let draggedElement = -1;
let boardSquares = [];
let isAlreadyTaken = [];
let isYourTurn = false;
let opponentDisconnected = false;

/* sets the css squareSide variable so that squares may fit into the board */
document.body.style.setProperty("--squareSide", 50 / noOfRows);

/* SOCKET IO */

/* Establish the socket connection from the client to the server */
const socket = io("https://sheltered-atoll-77476.herokuapp.com/");

/* Socket Events */

/* The opponent placed a domino, so now you update the state of the game on your side */
socket.on("placeDomino", function (data) {
  /* data[0] and data[1] contains the numbers of the nodes and data[2] and data[3] are the names of the classes that you have to append to those nodes respectively*/
  changeColor(data[0], data[1], data[2], data[3]);
  isYourTurn = true;
  whoseTurn.innerText = "Your";
});

/* The roomId that you entered already has 2 players playing in that room */
socket.on("roomIsFull", function () {
  alert("The room is already Full");
});

/* The room is empty so you cannot join it. You must start a new game instead */
socket.on("roomIsEmpty", function () {
  alert("The room is empty");
});

/* You entered something invalid which is not in the range of [0, maxRooms). maxRooms is declared in server.js */
socket.on("invalidRoomId", function () {
  alert("Entered Room-Id is invalid");
});

/* All the rooms are full. So just wait and try again after some time. */
socket.on("allRoomsFull", function () {
  changeScreen(currScreen, reloadScreen);
  message.innerText = "All the rooms are Full. Try again later.";
});

/* The room which you wanted to join has one player waiting for you. Therefore you can join the room */
socket.on("youCanJoin", function () {
  isYourTurn = false;
  whoseTurn.innerText = "Opponent's";
  beginCountdown();
});

/* The other player has joined so begin the countdown for the game*/
socket.on("otherPlayerJoined", function () {
  beginCountdown();
});

/* Other player has disconnected, so you need to go back to the homepage */
socket.on("otherPlayerDisconnected", function () {
  if (currScreen === reloadScreen)
    return; /* The player has already lost the game or won the game */
  changeScreen(currScreen, reloadScreen);
  opponentDisconnected = true; /* This is used in case the opponent disconnects in between the countdown. In that case it will prevent the changeScreen function in countdown function from getting called. */
  message.innerText = "Your opponent has disconnected!";
});

/* Event triggered after the server cofirms that a room is available and sends the room id to the user who clicked on the start new game button */
socket.on("newGameStarts", function (roomId) {
  isYourTurn = true;
  whoseTurn.innerText = "Your";
  waitScreen.querySelector("span").innerText =
    roomId; /* Displaying the room id so that other person may join */
});

/* You have lost the game because you couldn't make any moves. So just go to homepage */
socket.on("youLost", function () {
  changeScreen(currScreen, reloadScreen);
  message.innerText = "You Lost!!!";
});

/* FUNCTIONS */

/* Function for stopping for some set duration in an async function */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* function for changing screens by adding and removing bootstrap classes */
function changeScreen(current, next) {
  current.classList.remove("d-flex");
  current.classList.add("d-none");
  next.classList.remove("d-none");
  next.classList.add("d-flex");
  currScreen = next;
}

/* Asynchronous function for the countdown */
async function beginCountdown() {
  changeScreen(currScreen, countdownScreen);
  const timeLeft = countdownScreen.querySelector("span");
  for (let i = 9; i >= 0; i--) {
    await sleep(1000);
    timeLeft.innerText = i;
  }
  /* Make sure that the opponent did not disconnect while the countdown was going on. */
  if (!opponentDisconnected) changeScreen(currScreen, gameScreen);
}

/* Adding the classes to both the nodes on board when the user drops the domino on valid nodes */
function changeColor(node1, node2, classNode1, classNode2) {
  isAlreadyTaken[node1] = true;
  isAlreadyTaken[node2] = true;
  boardSquares[node1].classList.add(classNode1);
  boardSquares[node2].classList.add(classNode2);
}

/* For finding out which of the squares of the dominoes the user clicked on while selecting the domino. left or right in case of horizontal domino and up or down in case of vertical domino */
function onMouseDown(event) {
  if (!isYourTurn) return;
  draggedElement = event.target.id;
}

/* Function to check whether you can place any domino on any of the unused cells on the grid. */
function canGameContinue() {
  for (let i = 0, currNode = 0; i < noOfRows; i++) {
    for (let j = 0; j < noOfColumns; j++, currNode++) {
      if (i !== noOfRows - 1) {
        if (
          !isAlreadyTaken[currNode] &&
          !isAlreadyTaken[currNode + noOfColumns]
        )
          return true;
      }
      if (j !== noOfColumns - 1) {
        if (!isAlreadyTaken[currNode] && !isAlreadyTaken[currNode + 1])
          return true;
      }
    }
  }
  return false;
}

/* EVENT HANDLERS */

document
  .querySelector(".horizontalDomino")
  .addEventListener("mousedown", onMouseDown);

document
  .querySelector(".verticalDomino")
  .addEventListener("mousedown", onMouseDown);

board.addEventListener("dragover", function (event) {
  event.preventDefault();
});

board.addEventListener("dragenter", function (event) {
  event.preventDefault();
});

/* Emitting the joinGame event to the server to check if anybody is already present in the room given by roomId by the user */
joinBtn.addEventListener("click", function (event) {
  event.preventDefault();
  const roomId = parseInt(roomIdInput.value);
  socket.emit("joinGame", roomId);
});

/* Emitting the startNewGame to the server to get the roomId of the room which the user has to join in case all the rooms are not already full */
startBtn.addEventListener("click", function (event) {
  socket.emit("startNewGame");
  changeScreen(currScreen, waitScreen);
});

/* Reloads the screen */
reloadBtn.addEventListener("click", function () {
  location.reload();
});

/* Handling the dropping of the dominoes. Used some maths to check whether the div on which the div is dropped belongs to the first row, last row, first column or the last column. If placement of the domino possible then emitting the placedDomino event to the server so that the server can emit the event placeDomino to opponent to notify him to place the domino */
board.addEventListener("drop", function (event) {
  event.preventDefault();
  if (draggedElement === -1 || !isYourTurn) return;
  const currSquareId = parseInt(event.target.id);
  if (draggedElement === "horizontalLeft") {
    if (
      currSquareId % noOfColumns === noOfColumns - 1 ||
      isAlreadyTaken[currSquareId] ||
      isAlreadyTaken[currSquareId + 1]
    ) {
      draggedElement = -1;
      return;
    }
    changeColor(currSquareId, currSquareId + 1, "curveLeft", "curveRight");
    socket.emit("placedDomino", [
      currSquareId,
      currSquareId + 1,
      "curveLeft",
      "curveRight",
    ]);
  } else if (draggedElement === "horizontalRight") {
    if (
      currSquareId % noOfColumns === 0 ||
      isAlreadyTaken[currSquareId] ||
      isAlreadyTaken[currSquareId - 1]
    ) {
      draggedElement = -1;
      return;
    }
    changeColor(currSquareId, currSquareId - 1, "curveRight", "curveLeft");
    socket.emit("placedDomino", [
      currSquareId,
      currSquareId - 1,
      "curveRight",
      "curveLeft",
    ]);
  } else if (draggedElement === "verticalUp") {
    if (
      Math.floor(currSquareId / noOfColumns) === noOfRows - 1 ||
      isAlreadyTaken[currSquareId] ||
      isAlreadyTaken[currSquareId + noOfColumns]
    ) {
      draggedElement = -1;
      return;
    }
    changeColor(
      currSquareId,
      currSquareId + noOfColumns,
      "curveTop",
      "curveBottom"
    );
    socket.emit("placedDomino", [
      currSquareId,
      currSquareId + noOfColumns,
      "curveTop",
      "curveBottom",
    ]);
  } else if (draggedElement === "verticalDown") {
    if (
      Math.floor(currSquareId / noOfColumns) === 0 ||
      isAlreadyTaken[currSquareId] ||
      isAlreadyTaken[currSquareId - noOfColumns]
    ) {
      draggedElement = -1;
      return;
    }
    changeColor(
      currSquareId,
      currSquareId - noOfColumns,
      "curveBottom",
      "curveTop"
    );
    socket.emit("placedDomino", [
      currSquareId,
      currSquareId - noOfColumns,
      "curveBottom",
      "curveTop",
    ]);
  }
  isYourTurn = false;
  whoseTurn.innerText = "Opponent's";
  draggedElement = -1;
  if (!canGameContinue()) {
    socket.emit("iWon");
    changeScreen(currScreen, reloadScreen);
    message.innerText = "You Won!!!";
  }
});

/* Adding the divs to the board */
for (let i = 0, l = noOfRows * noOfColumns; i < l; i++) {
  let square = document.createElement(`div`);
  square.setAttribute(`class`, `square`);
  square.setAttribute(`id`, i);
  boardSquares.push(square);
  board.appendChild(square);
}
