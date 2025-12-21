alert("JS working");

// -------- GLOBAL DATA --------
let roomCode="";
let playerName="";
let players=[];
let hands={};

// -------- JOIN / CREATE ROOM --------
function joinRoom(){
  playerName=document.getElementById("nameInput").value.trim();
  if(!playerName){ alert("Enter name"); return; }

  roomCode=document.getElementById("roomInput").value.trim();
  if(!roomCode){
    roomCode=Math.floor(1000+Math.random()*9000).toString();
  }

  if(!localStorage[roomCode]){
    localStorage[roomCode]=JSON.stringify([]);
  }

  players=JSON.parse(localStorage[roomCode]);
  if(!players.includes(playerName)){
    players.push(playerName);
  }

  localStorage[roomCode]=JSON.stringify(players);

  document.getElementById("lobby").style.display="none";
  document.getElementById("game").style.display="block";
  document.getElementById("roomText").innerText="Room: "+roomCode;

  updatePlayers();
}

// -------- UPDATE PLAYERS --------
function updatePlayers(){
  const div=document.getElementById("players");
  div.innerHTML="";
  players.forEach(p=>{
    const d=document.createElement("div");
    d.innerText=p;
    div.appendChild(d);
  });

  if(players.length===4){
    document.getElementById("startBtn").style.display="inline-block";
  }
}

// -------- START GAME --------
function startGame(){
  if(players.length!==4){
    alert("4 players required");
    return;
  }

  let deck=createDeck();
  shuffle(deck);

  players.forEach(p=>{
    hands[p]=deck.splice(0,8);
  });

  showMyCards();
  startBidding();
}

// -------- SHOW CARDS --------
function showMyCards(){
  const div=document.getElementById("myCards");
  div.innerHTML="";
  hands[playerName].forEach(c=>{
    const img=document.createElement("img");
    img.src="cards/"+c+".png";
    div.appendChild(img);
  });
}

// -------- DECK --------
function createDeck(){
  const suits=["S","H","D","C"];
  const ranks=["A","K","Q","J","10","9","8","7"];
  let deck=[];
  suits.forEach(s=>{
    ranks.forEach(r=>{
      deck.push(r+s);
    });
  });
  return deck;
}

function shuffle(a){
  for(let i=a.length-1;i>0;i--){
    let j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

// -------- BIDDING --------
let bidIndex=0;
let highestBid=0;
let highestBidder="";
let passCount=0;

function startBidding(){
  document.getElementById("biddingBox").style.display="block";
  bidIndex=0;
  highestBid=0;
  highestBidder="";
  passCount=0;
  updateBidTurn();
}

function updateBidTurn(){
  document.getElementById("bidTurn").innerText=
    "Turn: "+players[bidIndex%4];
}

function placeBid(){
  const bid=parseInt(document.getElementById("bidValue").value);
  if(!bid || bid<16 || bid<=highestBid){
    alert("Invalid bid");
    return;
  }
  highestBid=bid;
  highestBidder=players[bidIndex%4];
  passCount=0;
  document.getElementById("bidStatus").innerText=
    highestBidder+" bid "+bid;
  nextBid();
}

function passBid(){
  passCount++;
  document.getElementById("bidStatus").innerText=
    players[bidIndex%4]+" passed";
  if(passCount===3){
    endBidding();
    return;
  }
  nextBid();
}

function nextBid(){
  bidIndex++;
  updateBidTurn();
}

function endBidding(){
  document.getElementById("biddingBox").style.display="none";
  alert("Bid Winner: "+highestBidder+" ("+highestBid+")");
}
