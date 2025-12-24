// 🔥 FIREBASE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ========== GLOBAL ==========
let playerName="", roomCode="";
const rank=["7","8","Q","K","10","A","9","J"];
const points={J:3,"9":2,A:1,"10":1};

// ========== JOIN ==========
function joinRoom(){
  playerName=nameInput.value;
  roomCode=roomInput.value||Math.floor(1000+Math.random()*9000);
  if(!playerName) return alert("Name likho bro");

  db.ref(`rooms/${roomCode}/players/${playerName}`).set(true);
  roomText.innerText="Room: "+roomCode;
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
    if(Object.keys(s.val()).length===4){
      startBtn.style.display="inline";
    }
  });
}

// ========== START ==========
function startGame(){
  db.ref(`rooms/${roomCode}/players`).once("value",s=>{
    let P=Object.keys(s.val());
    let deck=shuffle(createDeck());
    let hands={};

    P.forEach((p,i)=>hands[p]=deck.slice(i*8,i*8+8));

    db.ref(`rooms/${roomCode}`).set({
      players:s.val(),
      hands:hands,
      phase:"bidding",
      bid:16,
      bidder:null,
      multiplier:1,
      trump:null,
      trick:{},
      scores:{team1:0,team2:0},
      marriages:{},
      playTurn:P[0]
    });
  });
}

// ========== BIDDING ==========
function placeBid(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    let b=parseInt(prompt("Bid (16–28)"));
    if(b<=d.bid||b>28) return alert("Invalid bid");

    d.bid=b;
    d.bidder=playerName;
    db.ref(`rooms/${roomCode}`).update(d);
  });
}

function doubleBid(){
  db.ref(`rooms/${roomCode}/multiplier`).set(2);
  alert("DOUBLE!");
}
function redoubleBid(){
  db.ref(`rooms/${roomCode}/multiplier`).set(4);
  alert("REDOUBLE!");
}

// ========== TRUMP ==========
function setTrump(suit){
  db.ref(`rooms/${roomCode}`).update({
    trump:suit,
    phase:"play"
  });
  alert("Trump set: "+suit);
}

// ========== PLAY CARD ==========
function playCard(card){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    if(d.playTurn!==playerName) return alert("Wait your turn");

    db.ref(`rooms/${roomCode}/trick/${playerName}`).set(card);
    removeCard(card);

    let P=Object.keys(d.players);
    let next=P[(P.indexOf(playerName)+1)%4];
    db.ref(`rooms/${roomCode}/playTurn`).set(next);

    checkTrick();
  });
}

function removeCard(card){
  db.ref(`rooms/${roomCode}/hands/${playerName}`).once("value",s=>{
    let h=s.val().filter(c=>c!==card);
    db.ref(`rooms/${roomCode}/hands/${playerName}`).set(h);
  });
}

// ========== TRICK ==========
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
      playTurn:winner,
      scores:d.scores
    });

    checkWin(d);
  });
}

// ========== WIN / LOSE ==========
function checkWin(d){
  let target=d.bid*d.multiplier;
  let bidderTeam=getTeam(d.bidder);
  let oppTeam=bidderTeam==="team1"?"team2":"team1";

  if(d.scores[bidderTeam]>=target){
    alert("🎉 BIDDER TEAM WON!");
    endGame();
  }
  if(d.scores[oppTeam]>(28-target)){
    alert("❌ BIDDER TEAM LOST!");
    endGame();
  }
}

function endGame(){
  db.ref(`rooms/${roomCode}/phase`).set("ended");
}

// ========== MARRIAGE ==========
function declareMarriage(){
  db.ref(`rooms/${roomCode}`).once("value",s=>{
    let d=s.val();
    let hand=d.hands[playerName];
    ["S","H","D","C"].forEach(suit=>{
      if(hand.includes("K"+suit)&&hand.includes("Q"+suit)&&!d.marriages[suit]){
        let pts=d.trump===suit?4:2;
        let team=getTeam(playerName);
        d.scores[team]+=pts;
        d.marriages[suit]=playerName;
        db.ref(`rooms/${roomCode}`).update(d);
        alert("Marriage! +"+pts);
      }
    });
  });
}

// ========== LOGIC ==========
function findWinner(trick,trump){
  let lead=Object.values(trick)[0].slice(-1);
  let best=null,rankBest=-1,trumpHit=false;

  for(let p in trick){
    let c=trick[p],s=c.slice(-1),v=c.slice(0,-1),r=rank.indexOf(v);
    if(s===trump){
      if(!trumpHit||r>rankBest){best=p;rankBest=r;trumpHit=true;}
    }else if(!trumpHit&&s===lead&&r>rankBest){
      best=p;rankBest=r;
    }
  }
  return best;
}

function calcPoints(trick){
  let t=0;
  Object.values(trick).forEach(c=>t+=points[c.slice(0,-1)]||0);
  return t;
}

function getTeam(p){
  return Object.keys(p)[0]%2===0?"team1":"team2";
}

// ========== UI ==========
db.ref().on("value",()=>{
  if(!roomCode||!playerName) return;

  db.ref(`rooms/${roomCode}/hands/${playerName}`)
    .once("value",s=>s.exists()&&showCards(s.val()));

  db.ref(`rooms/${roomCode}/trick`).on("value",s=>{
    table.innerHTML="";
    if(!s.exists()) return;
    Object.values(s.val()).forEach(c=>{
      let img=document.createElement("img");
      img.src=`cards/${c}.png`;
      table.appendChild(img);
    });
  });
});

function showCards(cards){
  cardsDiv.innerHTML="";
  cards.forEach(c=>{
    let img=document.createElement("img");
    img.src=`cards/${c}.png`;
    img.onclick=()=>playCard(c);
    cardsDiv.appendChild(img);
  });
}

// ========== UTILS ==========
function createDeck(){
  let s=["S","H","D","C"],v=["7","8","9","10","J","Q","K","A"],d=[];
  s.forEach(S=>v.forEach(V=>d.push(V+S)));
  return d;
}
function shuffle(a){return a.sort(()=>Math.random()-0.5);}
