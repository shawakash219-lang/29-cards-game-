// ================= FIREBASE =================
firebase.initializeApp({
  apiKey: "AIzaSyCLsfetGGbvG5aeVHQSzVMXyzt395Buucg",
  authDomain: "cards29-game.firebaseapp.com",
  databaseURL: "https://cards29-game-default-rtdb.firebaseio.com",
  projectId: "cards29-game",
  storageBucket: "cards29-game.firebasestorage.app",
  messagingSenderId: "989522634372",
  appId: "1:989522634372:web:7c9e6059119ccbd71e84d1"
});
const db = firebase.database();

// ================= GLOBAL =================
let playerName="", roomCode="";
const rank=["7","8","Q","K","10","A","9","J"];
const points={J:3,"9":2,A:1,"10":1};

const suits=["S","H","D","C"];
const values=["7","8","9","10","J","Q","K","A"];

// ================= JOIN =================
function joinRoom(){
  playerName=nameInput.value.trim();
  roomCode=roomInput.value.trim() || Math.floor(1000+Math.random()*9000);

  if(!playerName) return alert("Name likho bro");

  const roomRef=db.ref(`rooms/${roomCode}`);

  roomRef.once("value",s=>{
    if(!s.exists()){
      roomRef.set({
        creator:playerName,
        players:{[playerName]:true},
        phase:"waiting"
      });
    }else{
      roomRef.child(`players/${playerName}`).set(true);
    }
  });

  listenPlayers();
}

function listenPlayers(){
  db.ref(`rooms/${roomCode}/players`).on("value",s=>{
    players.innerHTML="";
    if(!s.exists()) return;
    Object.keys(s.val()).forEach(p=>{
      let li=document.createElement("li");
      li.innerText=p;
      players.appendChild(li);
    });
  });

  db.ref(`rooms/${roomCode}`).on("value",s=>{
    if(!s.exists()) return;
    startBtn.style.display =
      s.val().creator===playerName?"inline":"none";
  });
}

// ================= START GAME =================
function startGame(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(d.creator!==playerName) return alert("Only creator can start");
    if(Object.keys(d.players).length!==4)
      return alert("4 players required");

    let deck=createDeck();
    shuffle(deck);

    let hands={};
    Object.keys(d.players).forEach(p=>{
      hands[p]=deck.splice(0,4);
    });

    db.ref(`rooms/${roomCode}`).update({
      deck,
      hands,
      phase:"bidding",
      bid:16,
      bidder:null,
      passed:[],
      turn:Object.keys(d.players)[0],
      trump:null,
      trumpHidden:true,
      multiplier:1,
      trick:{},
      marriages:{},
      scores:{team1:0,team2:0}
    });

    showMyCards(hands[playerName]);
    alert("Game started – first 4 cards dealt");
  });
}

// ================= BIDDING =================
function bid(value){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(d.turn!==playerName) return alert("Wait your turn");

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

function doubleBid(){db.ref(`rooms/${roomCode}/multiplier`).set(2);}
function redoubleBid(){db.ref(`rooms/${roomCode}/multiplier`).set(4);}

// ================= HIDDEN TRUMP =================
function setHiddenTrump(suit){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(playerName!==d.bidder) return;

    Object.keys(d.hands).forEach(p=>{
      d.hands[p]=d.hands[p].concat(d.deck.splice(0,4));
    });

    db.ref(`rooms/${roomCode}`).update({
      trump:suit,
      hands:d.hands,
      deck:d.deck,
      phase:"play",
      turn:d.bidder
    });

    showMyCards(d.hands[playerName]);
    alert("Hidden trump set");
  });
}

// ================= PLAY =================
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
    db.ref(`rooms/${roomCode}/hands/${playerName}`)
      .set(s.val().filter(c=>c!==card));
  });
}

// ================= TRICK =================
function checkTrick(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(Object.keys(d.trick).length<4) return;

    let winner=findWinner(d.trick,d.trump);
    let pts=calcPoints(d.trick);
    let team=getTeam(winner,d.players);

    d.scores[team]+=pts;

    db.ref(`rooms/${roomCode}`).update({
      trick:{},
      turn:winner,
      scores:d.scores
    });

    checkWin(d);
  });
}

// ================= WIN =================
function checkWin(d){
  let target=d.bid*d.multiplier;
  let bt=getTeam(d.bidder,d.players);
  let ot=bt==="team1"?"team2":"team1";

  if(d.scores[bt]>=target){alert("🎉 BID WON");endGame();}
  if(d.scores[ot]>(28-target)){alert("❌ BID LOST");endGame();}
}

function endGame(){
  db.ref(`rooms/${roomCode}/phase`).set("ended");
}

// ================= MARRIAGE =================
function declareMarriage(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val(),h=d.hands[playerName];
    suits.forEach(s=>{
      if(h.includes("K"+s)&&h.includes("Q"+s)&&!d.marriages[s]){
        let pts=d.trump===s?4:2;
        d.scores[getTeam(playerName,d.players)]+=pts;
        d.marriages[s]=playerName;
        db.ref(`rooms/${roomCode}`).update(d);
        alert("Marriage +"+pts);
      }
    });
  });
}

// ================= HELPERS =================
function getTeam(p,players){
  return Object.keys(players).indexOf(p)%2===0?"team1":"team2";
}
function findWinner(trick,trump){
  let lead=Object.values(trick)[0].slice(-1);
  let best=null,rb=-1,th=false;
  for(let p in trick){
    let c=trick[p],s=c.slice(-1),v=c.slice(0,-1),r=rank.indexOf(v);
    if(s===trump){
      if(!th||r>rb){best=p;rb=r;th=true;}
    }else if(!th&&s===lead&&r>rb){best=p;rb=r;}
  }
  return best;
}
function calcPoints(trick){
  let t=0;
  Object.values(trick).forEach(c=>t+=points[c.slice(0,-1)]||0);
  return t;
}
function createDeck(){
  let d=[]; suits.forEach(S=>values.forEach(V=>d.push(V+S))); return d;
}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}}

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
