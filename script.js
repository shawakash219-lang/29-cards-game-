alert("JS working");
const firebaseConfig = {
  apiKey: "AIzaSyCLsfetGGbvG5aeVHQSzVMXyzt395Buucg",
  authDomain: "cards29-game.firebaseapp.com",
  projectId: "cards29-game",
  storageBucket: "cards29-game.firebasestorage.app",
  messagingSenderId: "989522634372",
  appId: "1:989522634372:web:7c9e6059119ccbd71e84d1"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// HTML elements
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("room");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const roomTitle = document.getElementById("roomTitle");
const playersDiv = document.getElementById("players");

let playerName = "";
let roomCode = "";

// Create Room
function createRoom() {
  playerName = nameInput.value.trim();
  if (playerName === "") {
    alert("Username likho bro");
    return;
  }

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    players: {
      [playerName]: true
    }
  });

  enterGame();
}

// Join Room
function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim();

  if (playerName === "" || roomCode === "") {
    alert("Username aur Room Code dono likho");
    return;
  }

  db.ref("rooms/" + roomCode + "/players/" + playerName).set(true);
  enterGame();
}

// Enter Game
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  db.ref("rooms/" + roomCode + "/players").on("value", snap => {
    playersDiv.innerHTML = "";
    snap.forEach(p => {
      playersDiv.innerHTML += `<div>${p.key}</div>`;
    });
  });
}
