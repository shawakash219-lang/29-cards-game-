
alert("JS working");

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCLsfetGGbvG5aeVHQSzVMXyzt395Buucg",
  authDomain: "cards29-game.firebaseapp.com",
  databaseURL: "https://cards29-game-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cards29-game",
  storageBucket: "cards29-game.appspot.com",
  messagingSenderId: "989522634372",
  appId: "1:989522634372:web:7c9e6059119ccbd71e84d1"
};

// Initialize Firebase
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
let gameStarted = false;

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

// Enter Game (MAIN LOGIC)
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  db.ref("rooms/" + roomCode + "/players").on("value", snap => {
    playersDiv.innerHTML = "";
    let playerList = [];

    snap.forEach(p => {
      playersDiv.innerHTML += `<div>${p.key}</div>`;
      playerList.push(p.key);
    });

    // 4 players hone par cards baantna
    if (playerList.length === 4 && !gameStarted) {
      gameStarted = true;
      distributeCards(playerList);
    }
  });
}

// ---------------- CARD LOGIC ----------------

// 29 game cards
const suits = ["♠", "♥", "♦", "♣"];
const values = ["7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck() {
  let deck = [];
  for (let s of suits) {
    for (let v of values) {
      deck.push(v + s);
    }
  }
  return deck;
}

function shuffle(deck) {
  return deck.sort(() => Math.random() - 0.5);
}

function distributeCards(players) {
  let deck = shuffle(createDeck());
  let hands = {};

  players.forEach(p => {
    hands[p] = deck.splice(0, 8);
  });

  db.ref("rooms/" + roomCode + "/hands").set(hands);
}
