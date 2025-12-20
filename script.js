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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// HTML elements
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("room");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const roomTitle = document.getElementById("roomTitle");
const playersDiv = document.getElementById("players");
const myCardsDiv = document.getElementById("myCards");
const startBtn = document.getElementById("startBtn");

let playerName = "";
let roomCode = "";

// Create Room
function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) return alert("Enter your name");

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    players: {},
    gameStarted: false
  });

  joinRoom(true);
}

// Join Room
function joinRoom(isCreator = false) {
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim() || roomCode;
  if (!playerName || !roomCode) return alert("Name & Room Code required");

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  enterGame();

  if (isCreator) {
    waitForPlayers();
  }
}

// Enter Game
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  const roomRef = db.ref(`rooms/${roomCode}`);

  // Show players
  roomRef.child("players").on("value", snap => {
    playersDiv.innerHTML = "";
    snap.forEach(p => {
      playersDiv.innerHTML += `<div>${p.key}</div>`;
    });
  });

  // Show cards for this player
  roomRef.child("hands/" + playerName).on("value", snap => {
    if (snap.exists()) showMyCards(snap.val());
  });
}

// Wait for 4 players
function waitForPlayers() {
  db.ref(`rooms/${roomCode}/players`).on("value", snap => {
    if (snap.numChildren() === 4) {
      alert("4 players joined. Press START GAME!");
    }
  });
}

// Manual Start Game Button
function manualStart() {
  const roomRef = db.ref(`rooms/${roomCode}`);
  roomRef.child("players").once("value", snap => {
    const players = Object.keys(snap.val());
    if (players.length !== 4) return alert("4 players required to start");

    roomRef.child("gameStarted").set(true);
    startGame(players);
  });
}

// Start Game
function startGame(players) {
  const deck = shuffle(createDeck());
  let hands = {};
  players.forEach(p => {
    hands[p] = deck.splice(0, 8);
  });
  db.ref(`rooms/${roomCode}/hands`).set(hands);
}

// Deck
const suits = ["S","H","D","C"];
const values = ["7","8","9","10","J","Q","K","A"];
function createDeck() {
  let deck = [];
  for (let s of suits) for (let v of values) deck.push(v+s);
  return deck;
}
function shuffle(deck) {
  return deck.sort(() => Math.random() - 0.5);
}

// Show Cards
function showMyCards(cards) {
  myCardsDiv.innerHTML = "";
  cards.forEach(card => {
    const img = document.createElement("img");
    img.src = "cards/" + card + ".png";
    img.style.width = "60px";
    img.style.margin = "5px";
    myCardsDiv.appendChild(img);
  });
}
