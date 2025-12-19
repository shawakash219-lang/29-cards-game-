alert("JS Working");

// 🔥 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCLsfetGGbvG5aeVHQSzVMXyzt395Buucg",
  authDomain: "cards29-game.firebaseapp.com",
  databaseURL: "https://cards29-game-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cards29-game",
  storageBucket: "cards29-game.appspot.com",
  messagingSenderId: "989522634372",
  appId: "1:989522634372:web:7c9e6059119ccbd71e84d1"
};

// Init Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Elements
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("room");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const roomTitle = document.getElementById("roomTitle");
const playersDiv = document.getElementById("players");
const myCardsDiv = document.getElementById("myCards");

let playerName = "";
let roomCode = "";

// 🟢 CREATE ROOM
function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) {
    alert("Username likho bro");
    return;
  }

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    gameStarted: false,
    players: {
      [playerName]: true
    }
  });

  enterGame();
}

// 🟢 JOIN ROOM
function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim();

  if (!playerName || !roomCode) {
    alert("Username aur Room Code dono likho");
    return;
  }

  db.ref("rooms/" + roomCode + "/players/" + playerName).set(true);
  enterGame();
}

// 🔥 ENTER GAME (MAIN LOGIC)
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  db.ref("rooms/" + roomCode).on("value", snap => {
    const data = snap.val();
    if (!data || !data.players) return;

    const players = Object.keys(data.players);
    playersDiv.innerHTML = "";

    players.forEach(p => {
      playersDiv.innerHTML += `<div>${p}</div>`;
    });

    // 🎯 Auto start when 4 players
    if (players.length === 4 && data.gameStarted === false) {
      db.ref("rooms/" + roomCode + "/gameStarted").set(true);
      distributeCards(players);
    }

    // 🃏 Show my cards
    if (data.hands && data.hands[playerName]) {
      myCardsDiv.innerHTML = data.hands[playerName].join(" ");
    }
  });
}

// 🃏 CARD LOGIC
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
