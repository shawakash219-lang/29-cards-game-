// ================= FIREBASE CONFIG =================
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

// ================= GLOBAL VARIABLES & SOUNDS =================
let playerName, roomCode;
const suits = ["S", "H", "D", "C"];
const ranks = ["7", "8", "Q", "K", "10", "A", "9", "J"]; 
const points = { "J": 3, "9": 2, "A": 1, "10": 1, "K": 0, "Q": 0, "8": 0, "7": 0 };

// Sounds (Inhe sounds folder mein rakhein ya online link use karein)
const cardSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3');
const winSound = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');

// ================= JOIN & SYNC =================
function joinRoom() {
    playerName = document.getElementById("name-input").value.trim();
    roomCode = document.getElementById("room-input").value.trim() || "1001";
    if (!playerName) return alert("Enter name!");

    const ref = db.ref(`rooms/${roomCode}`);
    ref.once('value', s => {
        if (!s.exists()) {
            ref.set({ creator: playerName, phase: 'waiting', bid: 16, scores: {team1:0, team2:0} });
        }
        ref.child(`players/${playerName}`).set({ id: playerName });
        startSync();
    });
}

function startSync() {
    document.getElementById("join-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    db.ref(`rooms/${roomCode}`).on('value', s => {
        const data = s.val();
        if (data) updateUI(data);
    });
}

// ================= UI UPDATE =================
function updateUI(data) {
    document.getElementById("room-id-text").innerText = roomCode;
    const pList = Object.keys(data.players || {});
    const isMyTurn = data.turn === playerName;

    // 1. Live Scores & Bid
    const t1 = data.scores ? data.scores.team1 : 0;
    const t2 = data.scores ? data.scores.team2 : 0;
    document.getElementById("score-board").innerText = `Team A: ${t1} | Team B: ${t2}`;
    document.getElementById("bid-val").innerText = `${data.bid} (${data.bidder || 'None'})`;

    // 2. Status Bar
    let statusText = isMyTurn ? "YOUR TURN" : `${data.turn || 'Waiting'}'s Turn`;
    if (data.trumpRevealed) statusText += ` | Trump: ${data.trump}`;
    document.getElementById("status-bar").innerText = statusText;

    // 3. Last Trick Display
    if(data.lastTrick) {
        document.getElementById("last-cards").innerText = data.lastTrick;
    }

    // 4. Winner Animation Logic
    if (data.phase === 'ended') {
        showWinner(data);
    } else {
        toggleBtn("winner-overlay", false);
    }

    // 5. Chat Display
    updateChat(data.chats);

    // Modals & Buttons
    document.getElementById("start-btn").classList.toggle("hidden", data.creator !== playerName || pList.length < 4 || data.phase !== 'waiting');
    document.getElementById("bid-modal").classList.toggle("hidden", data.phase !== 'bidding' || !isMyTurn);
    document.getElementById("trump-modal").classList.toggle("hidden", data.phase !== 'trump_selection' || !isMyTurn);
    
    if (data.phase === 'bidding' && isMyTurn) createBidButtons(data.bid, data.bidder);
    
    // Special Buttons
    if (data.phase === 'play' && isMyTurn) {
        checkMarriageAvailability(data);
        if (data.leadSuit && !data.trumpRevealed) checkNeedTrump(data);
    } else {
        toggleBtn("marriage-btn", false);
        toggleBtn("request-trump-btn", false);
    }

    if (data.phase === 'ended') showPlayAgain(data.creator === playerName);

    if (data.hands && data.hands[playerName]) renderHand(data.hands[playerName], isMyTurn && data.phase === 'play');
    renderTable(data.trick || {});
}

// ================= GAME LOGIC =================
function startGame() {
    let deck = [];
    suits.forEach(s => ["7", "8", "9", "10", "J", "Q", "K", "A"].forEach(v => deck.push(v + s)));
    deck.sort(() => Math.random() - 0.5);

    db.ref(`rooms/${roomCode}`).once('value', s => {
        const data = s.val();
        const players = Object.keys(data.players);

        // Sirf unhi 4 logon ko cards milenge jo abhi room mein hain
        let hands = {};
        players.forEach((p, i) => hands[p] = deck.slice(i * 4, (i * 4) + 4));

        db.ref(`rooms/${roomCode}`).update({
            phase: 'bidding',
            hands: hands,
            deck: deck.slice(16),
            turn: players[0],
            scores: { team1: 0, team2: 0 },
            lastTrick: "None",
            trumpRevealed: false,
            passed: [], // Purane "Pass" kiye huye players ko reset karo
            chats: {}   // Purani chat delete karo
        });
    });
}
function playCard(card) {
    cardSound.play();
    db.ref(`rooms/${roomCode}`).transaction(g => {
        if (!g || g.phase !== 'play') return g;
        if (!g.trick) g.trick = {};
        g.trick[playerName] = card;
        g.hands[playerName] = g.hands[playerName].filter(c => c !== card);
        const pList = Object.keys(g.players);

        if (Object.keys(g.trick).length === 4) {
            let winner = determineWinner(g.trick, g.trump, g.leadSuit, g.trumpRevealed);
            g.lastTrick = Object.values(g.trick).join(", ");
            g.scores[getTeam(winner, pList)] += calculatePoints(g.trick);
            g.turn = winner; g.trick = null; g.leadSuit = null;
            if (g.hands[playerName].length === 0) g.phase = 'ended';
        } else {
            if (Object.keys(g.trick).length === 1) g.leadSuit = card.slice(-1);
            g.turn = pList[(pList.indexOf(playerName) + 1) % 4];
        }
        return g;
    });
}

// ================= HELPERS =================
function createBidButtons(min, bidder) {
    const d = document.getElementById("bid-options"); d.innerHTML = "";
    let startVal = (!bidder) ? 16 : min + 1; 
    for (let i = startVal; i <= 28; i++) {
        let b = document.createElement("button"); b.innerText = i; b.onclick = () => submitBid(i); d.appendChild(b);
    }
}

function submitBid(v) {
    db.ref(`rooms/${roomCode}`).transaction(g => {
        if (!g) return g;
        if (v === 'pass') { if (!g.passed) g.passed = []; g.passed.push(playerName); }
        else { g.bid = v; g.bidder = playerName; }
        const p = Object.keys(g.players); g.turn = p[(p.indexOf(playerName) + 1) % 4];
        if (g.passed && g.passed.length === 3) { g.phase = 'trump_selection'; g.turn = g.bidder; }
        return g;
    });
}

function setTrump(s) {
    db.ref(`rooms/${roomCode}`).once('value', snap => {
        const g = snap.val(); const pList = Object.keys(g.players);
        pList.forEach((p, i) => g.hands[p] = g.hands[p].concat(g.deck.slice(i * 4, (i * 4) + 4)));
        db.ref(`rooms/${roomCode}`).update({ trump: s, phase: 'play', hands: g.hands, turn: g.bidder });
    });
}

function determineWinner(trick, trump, lead, rev) {
    let bestP = null, maxP = -1;
    for (let p in trick) {
        let card = trick[p], val = card.slice(0,-1), suit = card.slice(-1), pwr = ranks.indexOf(val);
        if (rev && suit === trump) pwr += 100; else if (suit !== lead) pwr = -1;
        if (pwr > maxP) { maxP = pwr; bestP = p; }
    }
    return bestP;
}

function showWinner(data) {
    winSound.play();
    const bidderTeam = getTeam(data.bidder, Object.keys(data.players));
    const winText = (data.scores[bidderTeam] >= data.bid) ? `WINNER: ${bidderTeam.toUpperCase()}! 🏆` : `WINNER: ${(bidderTeam==='team1'?'team2':'team1').toUpperCase()}!`;
    let winDiv = document.getElementById("winner-overlay");
    if(!winDiv) {
        winDiv = document.createElement("div"); winDiv.id = "winner-overlay"; winDiv.className = "winner-message";
        document.body.appendChild(winDiv);
    }
    winDiv.innerText = winText; winDiv.classList.remove("hidden");
}

function sendChat(msg) { db.ref(`rooms/${roomCode}/chats`).push({ sender: playerName, text: msg }); }

function updateChat(chats) {
    const div = document.getElementById("chat-messages"); if(!div || !chats) return;
    div.innerHTML = Object.values(chats).slice(-5).map(m => `<div class="chat-msg"><b>${m.sender}:</b> ${m.text}</div>`).join("");
    div.scrollTop = div.scrollHeight;
}

// Baki Helper Functions (renderHand, renderTable, toggleBtn, showSpecialBtn, checkMarriageAvailability, checkNeedTrump, requestTrump, getTeam, calculatePoints, declareMarriage)
// (Yahan space ki wajah se short kar raha hoon, ye pehle wale hi rahenge)
function renderHand(cards, act) {
    const div = document.getElementById("my-hand"); div.innerHTML = "";
    cards.forEach(c => {
        const img = document.createElement("img"); img.src = `cards/${c}.png`; img.className = "card";
        img.onclick = () => { if (act) playCard(c); }; div.appendChild(img);
    });
}
function renderTable(trick) {
    const div = document.getElementById("play-area"); div.innerHTML = "";
    if (trick) Object.values(trick).forEach(c => {
        const img = document.createElement("img"); img.src = `cards/${c}.png`; img.className = "table-card"; div.appendChild(img);
    });
}
function toggleBtn(id, show) { const btn = document.getElementById(id); if (btn) btn.classList.toggle("hidden", !show); }
function showSpecialBtn(id, text, fn) {
    let btn = document.getElementById(id);
    if (!btn) { btn = document.createElement("button"); btn.id = id; btn.className = "btn-special"; btn.onclick = fn; document.body.appendChild(btn); }
    btn.innerText = text; btn.classList.remove("hidden");
}
function checkNeedTrump(data) { if (!data.hands[playerName].some(c => c.endsWith(data.leadSuit))) showSpecialBtn("request-trump-btn", "Request Trump ❓", () => db.ref(`rooms/${roomCode}`).update({trumpRevealed:true})); }
function checkMarriageAvailability(data) {
    const hand = data.hands[playerName];
    const hasM = suits.some(s => hand.includes("K"+s) && hand.includes("Q"+s) && (!data.declaredMarriages || !data.declaredMarriages.includes(s)));
    if (hasM) showSpecialBtn("marriage-btn", "Declare Marriage 💍", declareMarriage);
}
function declareMarriage() {
    db.ref(`rooms/${roomCode}`).transaction(g => {
        if (!g) return g;
        suits.forEach(s => {
            if (g.hands[playerName].includes("K"+s) && g.hands[playerName].includes("Q"+s)) {
                if (!g.declaredMarriages) g.declaredMarriages = [];
                if (!g.declaredMarriages.includes(s)) { g.declaredMarriages.push(s); g.scores[getTeam(playerName, Object.keys(g.players))] += (s === g.trump ? 4 : 2); }
            }
        });
        return g;
    });
}
function getTeam(p, list) { let i = list.indexOf(p); return (i===0 || i===2) ? "team1" : "team2"; }
function calculatePoints(trick) { let t = 0; Object.values(trick).forEach(c => t += points[c.slice(0,-1)] || 0); return t; }
function showPlayAgain(isCreator) {
    if (isCreator) {
        showSpecialBtn("play-again-btn", "New Game (Reset) 🔄", () => {
            // Room ko poora clear karke naya banao
            db.ref(`rooms/${roomCode}`).set({
                creator: playerName,
                phase: 'waiting',
                players: { [playerName]: { id: playerName } }, // Sirf creator bachega
                bid: 16,
                scores: { team1: 0, team2: 0 }
            });
        });
    }
}

