// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyCLsfetGGbvG5aeVHQSzVMXyzt395Buucg",
  authDomain: "cards29-game.firebaseapp.com",
  databaseURL: "https://cards29-game-default-rtdb.firebaseio.com",
  projectId: "cards29-game",
  storageBucket: "cards29-game.firebasestorage.app",
  messagingSenderId: "989522634372",
  appId: "1:989522634372:web:7c9e6059119ccbd71e84d1"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ================= GLOBAL =================
let playerName = "", roomCode = "";
const rank = ["7","8","Q","K","10","A","9","J"];
const points = {J:3,"9":2,A:1,"10":1};

// ================= JOIN =================
function joinRoom(){
  playerName = nameInput.value;
  roomCode = roomInput.value || Math.floor(1000+Math.random()*9000);
  if(!playerName) return alert("Name likho bro");

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  roomText.innerText = "Room: "+roomCode;
  listenPlayers();
}

function listenPlayers(){
  db.ref(`rooms/${roomCode}/players`).on("value", snap=>{
    players.innerHTML="";
    if(!snap.exists()) return;
    Object.keys(snap.val()).forEach(p=>{
      let li=document.createElement("li");
      li.innerText=p;
      players.appendChild(li);
    });
    startBtn.style.display =
      Object.keys(snap.val()).length===4 ? "inline" : "none";
  });
}

// ================= START GAME =================
function startGame(){
  db.ref(`rooms/${roomCode}/players`).once("value", snap=>{
    let playersArr = Object.keys(snap.val());
    if(playersArr.length!==4) return alert("4 players needed");

    let deck = shuffle(createDeck());
    let hands = {};
    playersArr.forEach(p=>hands[p]=deck.splice(0,4)); // ONLY 4

    db.ref(`rooms/${roomCode}`).set({
      players: snap.val(),
      hands,
      deck,
      phase:"bidding",
      bid:16,
      bidder:null,
      passed:[],
      turn:playersArr[0],
      trump:null,
      trumpHidden:true,
      multiplier:1,
      trick:{},
      scores:{team1:0,team2:0}
    });

    showMyCards(hands[playerName]);
  });
}

// ================= BIDDING =================
function bid(value){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(d.turn!==playerName) return alert("Wait turn");

    if(value==="pass"){
      if(!d.passed.includes(playerName))
        d.passed.push(playerName);
    }else{
      if(value<=d.bid||value>28) return alert("Invalid bid");
      d.bid=value;
      d.bidder=playerName;
    }

    let P=Object.keys(d.players);
    d.turn=P[(P.indexOf(playerName)+1)%4];

    if(d.passed.length===3){
      d.phase="trump";
      d.turn=d.bidder;
    }

    db.ref(`rooms/${roomCode}`).update(d);
  });
}

function doubleBid(){ db.ref(`rooms/${roomCode}/multiplier`).set(2); }
function redoubleBid(){ db.ref(`rooms/${roomCode}/multiplier`).set(4); }

// ================= HIDDEN TRUMP =================
function setHiddenTrump(suit){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(playerName!==d.bidder) return;

    // second 4 cards
    Object.keys(d.hands).forEach(p=>{
      d.hands[p]=d.hands[p].concat(d.deck.splice(0,4));
    });

    db.ref(`rooms/${roomCode}`).update({
      trump:suit,
      trumpHidden:true,
      hands:d.hands,
      deck:d.deck,
      phase:"play",
      turn:d.bidder
    });

    showMyCards(d.hands[playerName]);
    alert("Hidden Trump set");
  });
}

// ================= PLAY CARD =================
function playCard(card){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(d.turn!==playerName) return;

    db.ref(`rooms/${roomCode}/trick/${playerName}`).set(card);
    removeCard(card);

    let P=Object.keys(d.players);
    db.ref(`rooms/${roomCode}/turn`)
      .set(P[(P.indexOf(playerName)+1)%4]);

    checkTrick();
  });
}

function removeCard(card){
  db.ref(`rooms/${roomCode}/hands/${playerName}`).once("value",s=>{
    let h=s.val().filter(c=>c!==card);
    db.ref(`rooms/${roomCode}/hands/${playerName}`).set(h);
  });
}

// ================= TRICK =================
function checkTrick(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(Object.keys(d.trick).length<4) return;

    let winner=findWinner(d.trick,d.trump);
    let pts=calcPoints(d.trick);
    let team=getTeam(winner);
    d.scores[team]+=pts;

    db.ref(`rooms/${roomCode}`).update({
      trick:{},
      turn:winner,
      scores:d.scores
    });

    checkWin(d);
  });
}

// ================= WIN / LOSE =================
function checkWin(d){
  let target=d.bid*d.multiplier;
  let bt=getTeam(d.bidder);
  let ot=bt==="team1"?"team2":"team1";

  if(d.scores[bt]>=target){
    alert("🎉 BIDDER TEAM WON");
    endGame();
  }
  if(d.scores[ot]>(28-target)){
    alert("❌ BIDDER TEAM LOST");
    endGame();
  }
}
function endGame(){
  db.ref(`rooms/${roomCode}/phase`).set("ended");
}

// ================= MARRIAGE =================
function declareMarriage(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val(), h=d.hands[playerName];
    ["S","H","D","C"].forEach(s=>{
      if(h.includes("K"+s)&&h.includes("Q"+s)){
        let pts=d.trump===s?4:2;
        let t=getTeam(playerName);
        d.scores[t]+=pts;
        db.ref(`rooms/${roomCode}`).update(d);
        alert("Marriage +"+pts);
      }
    });
  });
}

// ================= LOGIC =================
function findWinner(trick,trump){
  let lead=Object.values(trick)[0].slice(-1);
  let best=null,rb=-1,th=false;
  for(let p in trick){
    let c=trick[p],s=c.slice(-1),v=c.slice(0,-1),r=rank.indexOf(v);
    if(s===trump){
      if(!th||r>rb){best=p;rb=r;th=true;}
    }else if(!th&&s===lead&&r>rb){
      best=p;rb=r;
    }
  }
  return best;
}
function calcPoints(trick){
  let t=0;
  Object.values(trick).forEach(c=>t+=points[c.slice(0,-1)]||0);
  return t;
}
function getTeam(p){ return Object.keys(p)[0]%2===0?"team1":"team2"; }

// ================= UI =================
function showMyCards(cards){
  cardsDiv.innerHTML="";
  cards.forEach(c=>{
    let img=document.createElement("img");
    img.src=`cards/${c}.png`;
    img.onclick=()=>playCard(c);
    cardsDiv.appendChild(img);
  });
}

// ================= UTILS =================
function createDeck(){
  let s=["S","H","D","C"],v=["7","8","9","10","J","Q","K","A"],d=[];
  s.forEach(S=>v.forEach(V=>d.push(V+S)));
  return d;
}
function shuffle(a){return a.sort(()=>Math.random()-0.5);}
