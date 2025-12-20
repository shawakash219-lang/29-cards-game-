alert("JS working");

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

// ✅ Initialize Firebase (ONLY ONCE)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 🔹 HTML Elements
const nameInput = document.getElementById("name");
const roomInput = document.getElementById("room");
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const roomTitle = document.getElementById("roomTitle");
const playersDiv = document.getElementById("players");
const myCardsDiv = document.getElementById("myCards");

let playerName = "";
let roomCode = "";

// ================= CREATE ROOM =================
function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) {
    alert("Username likho bro");
    return;
  }

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    players: {},
    gameStarted: false
  });

  joinRoom(); // creator bhi normal player jaisa join karega
}

// ================= JOIN ROOM =================
function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim() || roomCode;

  if (!playerName || !roomCode) {
    alert("Name aur Room Code dono chahiye");
    return;
  }

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  enterGame();
}

// ================= ENTER GAME =================
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  const roomRef = db.ref(`rooms/${roomCode}`);

  // 🔹 Listen players & auto start game
  roomRef.child("players").on("value", snap => {
    playersDiv.innerHTML = "";
    const players = [];

    snap.forEach(p => {
      players.push(p.key);
      playersDiv.innerHTML += `<div>${p.key}</div>`;
    });

    // ✅ AUTO START WHEN EXACTLY 4 PLAYERS
    roomRef.child("gameStarted").once("value", gs => {
      if (players.length === 4 && !gs.val()) {
        startGame(players);
      }
    });
  });

  // 🔹 Listen for my cards
  roomRef.child("hands/" + playerName).on("value", snap => {
    if (snap.exists()) {
      showMyCards(snap.val());
    }
  });
}

// ================= START GAME =================
function startGame(players) {
  const deck = shuffle(createDeck());
  let hands = {};

  players.forEach(p => {
    hands[p] = deck.splice(0, 8);
  });

  db.ref(`rooms/${roomCode}/hands`).set(hands);
  db.ref(`rooms/${roomCode}/gameStarted`).set(true);
}

// ================= CARD LOGIC =================
const suits = ["S", "H", "D", "C"];
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

// ================= SHOW MY CARDS =================
function showMyCards(cards) {
  myCardsDiv.innerHTML = "";
  cards.forEach(card => {
    const img = document.createElement("img");
    img.src = "cards/" + card + ".png"; // eg: cards/AS.png
    img.alt = card;
    myCardsDiv.appendChild(img);
  });
}
