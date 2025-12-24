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
const startBtn = document.getElementById("startBtn");

let playerName = "";
let roomCode = "";
let isCreator = false;

// Create Room
function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) return alert("Name likho bro");

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  isCreator = true;

  db.ref("rooms/" + roomCode).set({
    creator: playerName,
    players: {}
  });

  joinRoom();
}

// Join Room
function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim() || roomCode;

  if (!playerName || !roomCode)
    return alert("Name & Room Code required");

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  enterGame();
}

// Enter Game
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  const roomRef = db.ref("rooms/" + roomCode);

  roomRef.child("players").on("value", snap => {
    playersDiv.innerHTML = "";
    const players = [];

    snap.forEach(p => {
      players.push(p.key);
      playersDiv.innerHTML += `<div>${p.key}</div>`;
    });

    // Show start button only to creator & 4 players
    roomRef.child("creator").once("value", c => {
      if (c.val() === playerName && players.length === 4) {
        startBtn.style.display = "inline-block";
      }
    });
  });

  roomRef.child("hands/" + playerName).on("value", snap => {
    if (snap.exists()) showMyCards(snap.val());
  });
}

// Start Game (manual)
function startGame() {
  const roomRef = db.ref("rooms/" + roomCode);

  roomRef.child("players").once("value", snap => {
    const players = Object.keys(snap.val());
    if (players.length !== 4) {
      alert("4 players required");
      return;
    }

    const deck = shuffle(createDeck());
    let hands = {};

    players.forEach(p => {
      hands[p] = deck.splice(0, 8);
    });

    roomRef.child("hands").set(hands);
  });
}

// Cards logic
const suits = ["S", "H", "D", "C"];
const values = ["7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck() {
  let deck = [];
  for (let s of suits)
    for (let v of values)
      deck.push(v + s);
  return deck;
}

function shuffle(deck) {
  return deck.sort(() => Math.random() - 0.5);
}

function showMyCards(cards) {
  myCardsDiv.innerHTML = "";
  cards.forEach(card => {
    const img = document.createElement("img");
    img.src = "cards/" + card + ".png";
    myCardsDiv.appendChild(img);
  });
}
