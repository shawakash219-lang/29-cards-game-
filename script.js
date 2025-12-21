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

// -------- CREATE ROOM (FIXED) --------
function createRoom(){
  playerName = nameInput.value.trim();
  if(!playerName){ alert("Enter name"); return; }

  roomCode = Math.floor(1000 + Math.random() * 9000).toString();

  db.ref("rooms/" + roomCode).set({
    players: {},
    started: false
  }).then(()=>{
    roomInput.value = roomCode;
    joinRoom();
  });
}

// -------- JOIN ROOM --------
function joinRoom(){
  playerName = nameInput.value.trim();
  roomCode = roomInput.value.trim();
  if(!playerName || !roomCode){
    alert("Name & Room code required");
    return;
  }

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  enterGame();
}

// -------- ENTER GAME --------
function enterGame(){
  menu.style.display = "none";
  game.style.display = "block";
  roomTitle.innerText = "Room: " + roomCode;

  const roomRef = db.ref(`rooms/${roomCode}`);

  roomRef.child("players").on("value", snap=>{
    playersDiv.innerHTML = "";
    const players=[];
    snap.forEach(p=>{
      players.push(p.key);
      playersDiv.innerHTML += `<div>${p.key}</div>`;
    });

    if(players.length === 4){
      startBtn.style.display = "inline-block";
    }
  });

  roomRef.child("hands/"+playerName).on("value", snap=>{
    if(snap.exists()){
      showMyCards(snap.val());
    }
  });
}

// -------- START GAME --------
function startGame(){
  const roomRef = db.ref(`rooms/${roomCode}/players`);
  roomRef.once("value", snap=>{
    const players = Object.keys(snap.val()||{});
    if(players.length !== 4){
      alert("4 players required");
      return;
    }

    let deck = shuffle(createDeck());
    let hands = {};
    players.forEach(p=>{
      hands[p] = deck.splice(0,8);
    });

    db.ref(`rooms/${roomCode}/hands`).set(hands);
    db.ref(`rooms/${roomCode}/started`).set(true);
  });
}

// -------- CARDS --------
const suits=["S","H","D","C"];
const values=["A","K","Q","J","10","9","8","7"];

function createDeck(){
  let d=[];
  suits.forEach(s=>{
    values.forEach(v=>{
      d.push(v+s);
    });
  });
  return d;
}
function shuffle(a){
  return a.sort(()=>Math.random()-0.5);
}

function showMyCards(cards){
  myCardsDiv.innerHTML="";
  cards.forEach(c=>{
    const img=document.createElement("img");
    img.src="cards/"+c+".png";
    myCardsDiv.appendChild(img);
  });
}
