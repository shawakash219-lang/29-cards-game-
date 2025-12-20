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

const biddingDiv = document.getElementById("bidding");
const bidValue = document.getElementById("bidValue");
const bidTurn = document.getElementById("bidTurn");
const bidStatus = document.getElementById("bidStatus");

let playerName = "";
let roomCode = "";
let playersOrder = [];

// 🟢 CREATE ROOM
function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) return alert("Username likho bro");

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    players: {},
    gameStarted: false
  });

  joinRoom();
}

// 🟢 JOIN ROOM
function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim() || roomCode;

  if (!playerName || !roomCode)
    return alert("Name aur Room Code likho");

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  enterGame();
}

// 🟢 ENTER GAME
function enterGame() {
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  const roomRef = db.ref(`rooms/${roomCode}`);

  // Players list
  roomRef.child("players").on("value", snap => {
    playersDiv.innerHTML = "";
    const players = [];

    snap.forEach(p => {
      players.push(p.key);
      playersDiv.innerHTML += `<div>${p.key}</div>`;
    });

    playersOrder = players;

    if (players.length === 4) {
      roomRef.child("gameStarted").once("value", gs => {
        if (!gs.val()) startGame(players);
      });
    }
  });

  // My cards
  roomRef.child("hands/" + playerName).on("value", snap => {
    if (snap.exists()) showMyCards(snap.val());
  });

  // Bidding listener
  roomRef.child("bidding").on("value", snap => {
    if (!snap.exists()) return;
    biddingDiv.style.display = "block";

    const b = snap.val();
    bidTurn.innerText = "Turn: " + playersOrder[b.turnIndex];
    bidStatus.innerText =
      "Highest Bid: " + b.currentBid + " by " + (b.highestBidder || "None");
  });
}

// 🟢 START GAME
function startGame(players) {
  const deck = shuffle(createDeck());
  let hands = {};

  players.forEach(p => {
    hands[p] = deck.splice(0, 8);
  });

  db.ref(`rooms/${roomCode}/hands`).set(hands);
  db.ref(`rooms/${roomCode}/gameStarted`).set(true);

  db.ref(`rooms/${roomCode}/bidding`).set({
    currentBid: 15,
    highestBidder: "",
    turnIndex: 0
  });

  bidValue.innerHTML = "";
  for (let i = 16; i <= 29; i++) {
    bidValue.innerHTML += `<option value="${i}">${i}</option>`;
  }
}

// 🟢 BIDDING
function placeBid() {
  const bid = parseInt(bidValue.value);

  db.ref(`rooms/${roomCode}/bidding`).transaction(b => {
    if (!b || bid <= b.currentBid) return b;
    b.currentBid = bid;
    b.highestBidder = playerName;
    b.turnIndex = (b.turnIndex + 1) % playersOrder.length;
    return b;
  });
}

function passBid() {
  db.ref(`rooms/${roomCode}/bidding`).transaction(b => {
    if (!b) return b;
    b.turnIndex = (b.turnIndex + 1) % playersOrder.length;
    return b;
  });
}

// 🟢 CARDS LOGIC
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
  cards.forEach(c => {
    const img = document.createElement("img");
    img.src = "cards/" + c + ".png";
    myCardsDiv.appendChild(img);
  });
}
