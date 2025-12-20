// Firebase Config
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
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const playersDiv = document.getElementById("players");
const myCardsDiv = document.getElementById("myCards");
const roomTitle = document.getElementById("roomTitle");
const startBtn = document.getElementById("startBtn");

let playerName = "";
let roomCode = "";

// Create Room
function createRoom() {
  playerName = name.value.trim();
  if (!playerName) return alert("Name likho bro");

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    players: {},
    started: false
  });

  joinRoom();
}

// Join Room
function joinRoom() {
  playerName = name.value.trim();
  roomCode = room.value.trim() || roomCode;

  if (!playerName || !roomCode)
    return alert("Name & Room Code required");

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);

  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  const roomRef = db.ref(`rooms/${roomCode}`);

  roomRef.child("players").on("value", snap => {
    playersDiv.innerHTML = "";
    const players = Object.keys(snap.val() || {});
    players.forEach(p => playersDiv.innerHTML += `<div>${p}</div>`);

    if (players.length === 4) {
      startBtn.style.display = "block";
    }
  });

  roomRef.child("hands/" + playerName).on("value", snap => {
    if (snap.exists()) showCards(snap.val());
  });
}

// Start Game
function startGame() {
  db.ref(`rooms/${roomCode}`).once("value", snap => {
    const players = Object.keys(snap.val().players || {});
    if (players.length !== 4) {
      alert("4 players chahiye bro");
      return;
    }

    let deck = createDeck().sort(() => Math.random() - 0.5);
    let hands = {};

    players.forEach(p => hands[p] = deck.splice(0, 8));

    db.ref(`rooms/${roomCode}/hands`).set(hands);
    db.ref(`rooms/${roomCode}/started`).set(true);
  });
}

// Cards
const suits = ["S", "H", "D", "C"];
const values = ["7", "8", "9", "10", "J", "Q", "K", "A"];

function createDeck() {
  let d = [];
  suits.forEach(s => values.forEach(v => d.push(v + s)));
  return d;
}

function showCards(cards) {
  myCardsDiv.innerHTML = "";
  cards.forEach(c => {
    const img = document.createElement("img");
    img.src = "cards/" + c + ".png";
    img.style.width = "60px";
    img.style.margin = "5px";
    myCardsDiv.appendChild(img);
  });
}
